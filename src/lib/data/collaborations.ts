import {
  assessListingSimilarity,
  SIMILARITY_RULE_SUMMARY,
  type ListingForSimilarity,
} from "@/lib/collaboration/similarity";
import { listApps, listCreatorApps } from "@/lib/data/apps";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PUBLIC_APP_STATUSES,
  type ActiveCollaboration,
  type CollaborationAction,
  type CollaborationCredit,
  type CollaborationOverview,
  type CollaborationRequestView,
  type CollaborationSettings,
  type CollaborationStatus,
  type CollaborationSuggestion,
  type MarketplaceApp,
} from "@/lib/types";

const SUGGESTION_LIMIT = 12;
const PAST_LIMIT = 12;
const COLLABORATION_APP_STATUSES = new Set<string>(["draft", ...PUBLIC_APP_STATUSES]);

const REQUEST_COLUMNS = `
  id,
  status,
  message,
  created_at,
  responded_at,
  ended_at,
  requester_creator_id,
  recipient_creator_id,
  requester_app_id,
  recipient_app_id,
  requester_app_title,
  recipient_app_title,
  requester_name,
  recipient_name
`;

type RequestRow = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  ended_at: string | null;
  requester_creator_id: string;
  recipient_creator_id: string;
  requester_app_id: string;
  recipient_app_id: string;
  requester_app_title: string;
  recipient_app_title: string;
  requester_name: string;
  recipient_name: string;
};

type ContactRow = {
  collaboration_request_id: string;
  partner_name: string;
  partner_email: string | null;
};

type AppMatchRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  description: string | null;
  tags: string[] | null;
  creator_id: string | null;
  status: string;
};

export type CollaborationResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

function pairKey(left: string, right: string) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function toListing(app: Pick<MarketplaceApp, "id" | "creator_id" | "title" | "category" | "summary" | "description" | "tags">): ListingForSimilarity {
  return {
    id: app.id,
    creatorId: app.creator_id,
    title: app.title,
    category: app.category,
    summary: app.summary,
    description: app.description,
    tags: app.tags,
  };
}

function fromMatchRow(row: AppMatchRow): ListingForSimilarity {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    category: row.category,
    summary: row.summary,
    description: row.description,
    tags: row.tags ?? [],
  };
}

function isCollaborationStatus(value: string): value is CollaborationStatus {
  return value === "pending" || value === "accepted" || value === "declined" || value === "withdrawn" || value === "ended";
}

function friendlyLoadError(message: string) {
  if (/collaboration_|schema cache|does not exist|could not find the table/i.test(message)) {
    return "Collaboration storage is not available yet. Apply the latest Supabase migration and reload.";
  }
  return message;
}

export function collaborationDatabaseError(error: { code?: string; message?: string }): { error: string; status: number } {
  if (error.code === "23505") {
    return { error: "A collaboration request is already open for these listings.", status: 409 };
  }

  const safeCode = error.code === "42501" || error.code === "28000" || error.code === "22023" || error.code === "23514";
  if (safeCode && error.message) {
    const status = error.code === "42501" || error.code === "28000" ? 403 : 400;
    return { error: error.message, status };
  }

  console.warn("Collaboration write failed", error.message);
  return { error: "Could not update the collaboration.", status: 400 };
}

async function ensureCollaborationSettings(
  creatorId: string,
): Promise<CollaborationResult<CollaborationSettings>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured", status: 503 };
  }

  const { data, error } = await supabase
    .from("creator_collaboration_settings")
    .select("creator_id, suggestions_enabled")
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: friendlyLoadError(error.message), status: 500 };
  }

  if (data) {
    return { ok: true, data: data as CollaborationSettings };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("creator_collaboration_settings")
    .insert({ creator_id: creatorId })
    .select("creator_id, suggestions_enabled")
    .single();

  if (insertError) {
    const retry = await supabase
      .from("creator_collaboration_settings")
      .select("creator_id, suggestions_enabled")
      .eq("creator_id", creatorId)
      .maybeSingle();
    if (retry.data) {
      return { ok: true, data: retry.data as CollaborationSettings };
    }
    return { ok: false, error: friendlyLoadError(insertError.message), status: 500 };
  }

  return { ok: true, data: inserted as CollaborationSettings };
}

function viewRequest(row: RequestRow, slugs: Map<string, string>): CollaborationRequestView | null {
  if (!isCollaborationStatus(row.status)) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    message: row.message,
    created_at: row.created_at,
    responded_at: row.responded_at,
    ended_at: row.ended_at,
    requester_creator_id: row.requester_creator_id,
    recipient_creator_id: row.recipient_creator_id,
    requester_app_id: row.requester_app_id,
    recipient_app_id: row.recipient_app_id,
    requester_app_title: row.requester_app_title,
    recipient_app_title: row.recipient_app_title,
    requester_name: row.requester_name,
    recipient_name: row.recipient_name,
    requester_app_slug: slugs.get(row.requester_app_id) ?? null,
    recipient_app_slug: slugs.get(row.recipient_app_id) ?? null,
  };
}

export async function loadCollaborationOverview(creatorId: string): Promise<CollaborationResult<CollaborationOverview>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured", status: 503 };
  }

  const settingsResult = await ensureCollaborationSettings(creatorId);
  if (!settingsResult.ok) {
    return settingsResult;
  }

  const [myApps, publicApps, requestResponse, contactResponse, optedInResponse] = await Promise.all([
    listCreatorApps(creatorId),
    listApps(),
    supabase.from("collaboration_requests").select(REQUEST_COLUMNS).order("created_at", { ascending: false }),
    supabase
      .from("collaboration_contacts")
      .select("collaboration_request_id, partner_name, partner_email")
      .eq("owner_creator_id", creatorId),
    supabase.from("creator_collaboration_settings").select("creator_id").eq("suggestions_enabled", true),
  ]);

  if (requestResponse.error) {
    return { ok: false, error: friendlyLoadError(requestResponse.error.message), status: 500 };
  }
  if (contactResponse.error) {
    return { ok: false, error: friendlyLoadError(contactResponse.error.message), status: 500 };
  }
  if (optedInResponse.error) {
    return { ok: false, error: friendlyLoadError(optedInResponse.error.message), status: 500 };
  }

  const slugs = new Map<string, string>();
  for (const app of [...myApps, ...publicApps]) {
    slugs.set(app.id, app.slug);
  }

  const requests = ((requestResponse.data ?? []) as RequestRow[])
    .map((row) => viewRequest(row, slugs))
    .filter((row): row is CollaborationRequestView => row !== null);

  const contacts = new Map<string, ContactRow>();
  for (const contact of (contactResponse.data ?? []) as ContactRow[]) {
    contacts.set(contact.collaboration_request_id, contact);
  }

  const openPairs = new Set(
    requests
      .filter((request) => request.status === "pending" || request.status === "accepted")
      .map((request) => pairKey(request.requester_app_id, request.recipient_app_id)),
  );

  const optedIn = new Set(((optedInResponse.data ?? []) as { creator_id: string }[]).map((row) => row.creator_id));
  const suggestions: CollaborationSuggestion[] = [];

  for (const mine of myApps) {
    if (!mine.creator_id || !COLLABORATION_APP_STATUSES.has(mine.status)) {
      continue;
    }

    for (const theirs of publicApps) {
      if (!theirs.creator_id || theirs.creator_id === creatorId || !optedIn.has(theirs.creator_id)) {
        continue;
      }
      if (openPairs.has(pairKey(mine.id, theirs.id))) {
        continue;
      }

      const assessment = assessListingSimilarity(toListing(mine), toListing(theirs));
      if (!assessment.similar) {
        continue;
      }

      suggestions.push({
        requester_app_id: mine.id,
        requester_app_title: mine.title,
        requester_app_slug: mine.slug,
        recipient_app_id: theirs.id,
        recipient_app_title: theirs.title,
        recipient_app_slug: theirs.slug,
        recipient_creator_id: theirs.creator_id,
        recipient_name: theirs.creator_name?.trim() || "Creator",
        score: assessment.score,
        reasons: assessment.reasons,
      });
    }
  }

  suggestions.sort(
    (left, right) => right.score - left.score || left.recipient_app_title.localeCompare(right.recipient_app_title),
  );

  const incoming = requests.filter(
    (request) => request.status === "pending" && request.recipient_creator_id === creatorId,
  );
  const outgoing = requests.filter(
    (request) => request.status === "pending" && request.requester_creator_id === creatorId,
  );
  const active = requests
    .filter((request) => request.status === "accepted")
    .map((request) => toActiveCollaboration(request, creatorId, contacts.get(request.id)));
  const past = requests
    .filter((request) => request.status === "declined" || request.status === "withdrawn" || request.status === "ended")
    .slice(0, PAST_LIMIT);

  return {
    ok: true,
    data: {
      creator_id: creatorId,
      settings: settingsResult.data,
      suggestions: suggestions.slice(0, SUGGESTION_LIMIT),
      incoming,
      outgoing,
      active,
      past,
    },
  };
}

function toActiveCollaboration(
  request: CollaborationRequestView,
  creatorId: string,
  contact: ContactRow | undefined,
): ActiveCollaboration {
  const iAmRequester = request.requester_creator_id === creatorId;
  const partnerEmail = contact?.partner_email?.trim() ?? "";

  return {
    ...request,
    partner_name: contact?.partner_name || (iAmRequester ? request.recipient_name : request.requester_name),
    partner_email: partnerEmail || null,
    your_app_title: iAmRequester ? request.requester_app_title : request.recipient_app_title,
    their_app_title: iAmRequester ? request.recipient_app_title : request.requester_app_title,
    your_app_slug: iAmRequester ? request.requester_app_slug : request.recipient_app_slug,
    their_app_slug: iAmRequester ? request.recipient_app_slug : request.requester_app_slug,
  };
}

export async function updateCollaborationSettings(
  creatorId: string,
  suggestionsEnabled: boolean,
): Promise<CollaborationResult<CollaborationSettings>> {
  const existing = await ensureCollaborationSettings(creatorId);
  if (!existing.ok) {
    return existing;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured", status: 503 };
  }

  const { data, error } = await supabase
    .from("creator_collaboration_settings")
    .update({ suggestions_enabled: suggestionsEnabled })
    .eq("creator_id", creatorId)
    .select("creator_id, suggestions_enabled")
    .single();

  if (error) {
    const failure = collaborationDatabaseError(error);
    return { ok: false, ...failure };
  }

  return { ok: true, data: data as CollaborationSettings };
}

export async function createCollaborationRequest(
  creatorId: string,
  input: { requesterAppId: string; recipientAppId: string; message?: string | null },
): Promise<CollaborationResult<{ id: string }>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured", status: 503 };
  }

  const message = input.message?.trim() ?? "";
  if (message.length > 500) {
    return { ok: false, error: "Collaboration message must be 500 characters or fewer", status: 400 };
  }

  const { data: requesterApp, error: requesterError } = await supabase
    .from("apps")
    .select("id, title, slug, category, summary, description, tags, creator_id, status")
    .eq("id", input.requesterAppId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (requesterError) {
    return { ok: false, error: friendlyLoadError(requesterError.message), status: 500 };
  }
  if (!requesterApp) {
    return { ok: false, error: "That listing does not belong to you", status: 403 };
  }

  const { data: recipientApp, error: recipientError } = await supabase
    .from("apps")
    .select("id, title, slug, category, summary, description, tags, creator_id, status")
    .eq("id", input.recipientAppId)
    .maybeSingle();

  if (recipientError) {
    return { ok: false, error: friendlyLoadError(recipientError.message), status: 500 };
  }
  if (!recipientApp || !recipientApp.creator_id) {
    return { ok: false, error: "That listing is not available", status: 404 };
  }
  const recipientCreatorId = recipientApp.creator_id;
  if (recipientCreatorId === creatorId || recipientApp.id === requesterApp.id) {
    return { ok: false, error: "You cannot collaborate with yourself", status: 400 };
  }
  if (!PUBLIC_APP_STATUSES.includes(recipientApp.status as (typeof PUBLIC_APP_STATUSES)[number])) {
    return { ok: false, error: "You can only request collaboration on a published listing", status: 400 };
  }

  const requester = requesterApp as AppMatchRow;
  const recipient = recipientApp as AppMatchRow;
  const assessment = assessListingSimilarity(fromMatchRow(requester), fromMatchRow(recipient));
  if (!assessment.similar) {
    return {
      ok: false,
      error: `These listings are not similar enough to collaborate. ${SIMILARITY_RULE_SUMMARY}`,
      status: 400,
    };
  }

  const { data: preferences, error: preferenceError } = await supabase
    .from("creator_collaboration_settings")
    .select("creator_id, suggestions_enabled")
    .in("creator_id", [creatorId, recipientCreatorId]);

  if (preferenceError) {
    return { ok: false, error: friendlyLoadError(preferenceError.message), status: 500 };
  }

  const enabled = new Map(
    ((preferences ?? []) as CollaborationSettings[]).map((row) => [row.creator_id, row.suggestions_enabled]),
  );
  if (!enabled.get(creatorId)) {
    return { ok: false, error: "Opt in to collaboration suggestions before sending a request", status: 403 };
  }
  if (!enabled.get(recipientCreatorId)) {
    return { ok: false, error: "That creator is not accepting collaboration requests", status: 403 };
  }

  const { data, error } = await supabase
    .from("collaboration_requests")
    .insert({
      requester_creator_id: creatorId,
      recipient_creator_id: recipientCreatorId,
      requester_app_id: requester.id,
      recipient_app_id: recipient.id,
      requester_app_title: requester.title,
      recipient_app_title: recipient.title,
      requester_name: "Creator",
      recipient_name: "Creator",
      message: message || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    const failure = collaborationDatabaseError(error);
    return { ok: false, ...failure };
  }

  return { ok: true, data: { id: (data as { id: string }).id } };
}

const ACTION_STATUS: Record<CollaborationAction, CollaborationStatus> = {
  accept: "accepted",
  decline: "declined",
  withdraw: "withdrawn",
  end: "ended",
};

export async function transitionCollaboration(
  creatorId: string,
  requestId: string,
  action: CollaborationAction,
): Promise<CollaborationResult<{ id: string; status: CollaborationStatus }>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured", status: 503 };
  }

  const { data, error } = await supabase
    .from("collaboration_requests")
    .select("id, status, requester_creator_id, recipient_creator_id")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: friendlyLoadError(error.message), status: 500 };
  }
  if (!data) {
    return { ok: false, error: "Collaboration request not found", status: 404 };
  }

  const row = data as Pick<RequestRow, "id" | "status" | "requester_creator_id" | "recipient_creator_id">;
  const isRequester = row.requester_creator_id === creatorId;
  const isRecipient = row.recipient_creator_id === creatorId;

  if (action === "withdraw" && !isRequester) {
    return { ok: false, error: "You can only withdraw a request you sent", status: 403 };
  }
  if ((action === "accept" || action === "decline") && !isRecipient) {
    return { ok: false, error: "Only the other creator can respond to this request", status: 403 };
  }
  if (action === "end" && !isRequester && !isRecipient) {
    return { ok: false, error: "You are not part of this collaboration", status: 403 };
  }
  if ((action === "accept" || action === "decline" || action === "withdraw") && row.status !== "pending") {
    return { ok: false, error: "This request is no longer pending", status: 409 };
  }
  if (action === "end" && row.status !== "accepted") {
    return { ok: false, error: "This collaboration is not active", status: 409 };
  }

  if (action === "accept") {
    // TODO(revenue-sharing): accepting a collaboration must not create a Stripe
    // transfer, application fee, or destination charge. Payouts stay on each
    // listing's existing Connect account until both creators agree to a split.
    const { data: preferences, error: preferenceError } = await supabase
      .from("creator_collaboration_settings")
      .select("creator_id, suggestions_enabled")
      .in("creator_id", [row.requester_creator_id, row.recipient_creator_id]);

    if (preferenceError) {
      return { ok: false, error: friendlyLoadError(preferenceError.message), status: 500 };
    }

    const enabled = new Map(
      ((preferences ?? []) as CollaborationSettings[]).map((preference) => [
        preference.creator_id,
        preference.suggestions_enabled,
      ]),
    );
    if (!enabled.get(row.requester_creator_id) || !enabled.get(row.recipient_creator_id)) {
      return {
        ok: false,
        error: "Both creators must still be opted in to accept a collaboration",
        status: 403,
      };
    }
  }

  const status = ACTION_STATUS[action];
  const { error: updateError } = await supabase
    .from("collaboration_requests")
    .update({ status })
    .eq("id", requestId);

  if (updateError) {
    const failure = collaborationDatabaseError(updateError);
    return { ok: false, ...failure };
  }

  return { ok: true, data: { id: requestId, status } };
}

export async function listCollaborationCredits(appIds: string[]): Promise<CollaborationCredit[]> {
  if (appIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("collaboration_credits")
    .select("app_id, collaboration_request_id, partner_creator_id, partner_name")
    .in("app_id", appIds);

  if (error) {
    console.warn("Failed to load collaboration credits", error.message);
    return [];
  }

  return (data ?? []) as CollaborationCredit[];
}

export async function collaboratorNamesByApp(appIds: string[]) {
  const names = new Map<string, string[]>();
  const credits = await listCollaborationCredits(appIds);
  for (const credit of credits) {
    const current = names.get(credit.app_id) ?? [];
    current.push(credit.partner_name);
    names.set(credit.app_id, current);
  }
  return names;
}
