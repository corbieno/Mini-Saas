"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { REVENUE_SHARING_NOTE, SIMILARITY_RULE_SUMMARY } from "@/lib/collaboration/similarity";
import type { ActiveCollaboration, CollaborationOverview, CollaborationRequestView } from "@/lib/types";

const SECTIONS = ["suggestions", "incoming", "outgoing", "active"] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  suggestions: "Suggestions",
  incoming: "Incoming",
  outgoing: "Outgoing",
  active: "Active",
};

export function CollaborationPanel({ overview }: { overview: CollaborationOverview }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("suggestions");
  const [enabled, setEnabled] = useState(overview.settings.suggestions_enabled);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts: Record<Section, number> = {
    suggestions: overview.suggestions.length,
    incoming: overview.incoming.length,
    outgoing: overview.outgoing.length,
    active: overview.active.length,
  };

  async function mutate(key: string, url: string, method: "POST" | "PATCH", body: unknown) {
    setError(null);
    setPendingKey(key);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not update collaboration");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update collaboration");
    } finally {
      setPendingKey(null);
    }
  }

  async function changeOptIn(next: boolean) {
    if (!next && enabled) {
      const confirmed = window.confirm(
        "Opting out declines incoming requests and withdraws requests you sent. Active collaborations stay until you end them. You will not receive new requests.",
      );
      if (!confirmed) {
        return;
      }
    }

    const previous = enabled;
    setEnabled(next);
    setError(null);
    setPendingKey("settings");
    try {
      const response = await fetch("/api/creator/collaborations/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions_enabled: next }),
      });
      const payload = (await response.json()) as { error?: string; data?: { suggestions_enabled: boolean } };
      if (!response.ok) {
        throw new Error(payload.error || "Could not save your preference");
      }
      setEnabled(payload.data?.suggestions_enabled ?? next);
      router.refresh();
    } catch (err) {
      setEnabled(previous);
      setError(err instanceof Error ? err.message : "Could not save your preference");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <Checkbox
            id="collaboration-opt-in"
            checked={enabled}
            disabled={pendingKey === "settings"}
            onCheckedChange={(checked) => {
              void changeOptIn(checked === true);
            }}
          />
          <div className="space-y-1">
            <label htmlFor="collaboration-opt-in" className="font-medium text-slate-900">
              Opt in to collaboration suggestions
            </label>
            <p className="text-sm text-slate-600">
              {enabled
                ? "Other opted-in creators can send you a request when a listing looks similar to yours. Nothing is linked until you accept."
                : "You are opted out. Suggestions stay private to you, and other creators cannot send you requests."}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">{SIMILARITY_RULE_SUMMARY}</p>
      </section>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((item) => (
          <Button
            key={item}
            type="button"
            variant={section === item ? "default" : "outline"}
            onClick={() => setSection(item)}
          >
            {SECTION_LABELS[item]}
            <span className="text-xs opacity-80">{counts[item]}</span>
          </Button>
        ))}
      </div>

      {section === "suggestions" ? (
        <SuggestionList
          overview={overview}
          enabled={enabled}
          messages={messages}
          pendingKey={pendingKey}
          onMessageChange={(key, value) => setMessages((current) => ({ ...current, [key]: value }))}
          onRequest={(suggestionKey, requesterAppId, recipientAppId) =>
            void mutate(`request:${suggestionKey}`, "/api/creator/collaborations", "POST", {
              requester_app_id: requesterAppId,
              recipient_app_id: recipientAppId,
              message: messages[suggestionKey] ?? "",
            })
          }
        />
      ) : null}

      {section === "incoming" ? (
        <RequestList
          empty="No incoming requests. Creators who opted out never receive them."
          requests={overview.incoming}
          pendingKey={pendingKey}
          render={(request) => (
            <RequestSummary
              eyebrow={`${request.requester_name} wants to collaborate`}
              yours={request.recipient_app_title}
              yoursSlug={request.recipient_app_slug}
              theirs={request.requester_app_title}
              theirsSlug={request.requester_app_slug}
              theirName={request.requester_name}
              message={request.message}
            />
          )}
          actions={(request) => (
            <>
              <Button
                type="button"
                disabled={pendingKey !== null}
                onClick={() => void mutate(request.id, `/api/creator/collaborations/${request.id}`, "POST", { action: "accept" })}
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pendingKey !== null}
                onClick={() => void mutate(request.id, `/api/creator/collaborations/${request.id}`, "POST", { action: "decline" })}
              >
                Decline
              </Button>
            </>
          )}
        />
      ) : null}

      {section === "outgoing" ? (
        <RequestList
          empty="You have not sent a collaboration request."
          requests={overview.outgoing}
          pendingKey={pendingKey}
          render={(request) => (
            <RequestSummary
              eyebrow={`Waiting on ${request.recipient_name}`}
              yours={request.requester_app_title}
              yoursSlug={request.requester_app_slug}
              theirs={request.recipient_app_title}
              theirsSlug={request.recipient_app_slug}
              theirName={request.recipient_name}
              message={request.message}
            />
          )}
          actions={(request) => (
            <Button
              type="button"
              variant="outline"
              disabled={pendingKey !== null}
              onClick={() => void mutate(request.id, `/api/creator/collaborations/${request.id}`, "POST", { action: "withdraw" })}
            >
              Withdraw
            </Button>
          )}
        />
      ) : null}

      {section === "active" ? (
        <ActiveList
          collaborations={overview.active}
          pendingKey={pendingKey}
          onEnd={(id) => void mutate(id, `/api/creator/collaborations/${id}`, "POST", { action: "end" })}
        />
      ) : null}

      {overview.past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Recent history</h2>
          {overview.past.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{statusLabel(request.status)}</span>
              {" · "}
              {request.requester_app_title} and {request.recipient_app_title}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function statusLabel(status: CollaborationRequestView["status"]) {
  if (status === "declined") return "Declined";
  if (status === "withdrawn") return "Withdrawn";
  if (status === "ended") return "Ended";
  return status;
}

function SuggestionList({
  overview,
  enabled,
  messages,
  pendingKey,
  onMessageChange,
  onRequest,
}: {
  overview: CollaborationOverview;
  enabled: boolean;
  messages: Record<string, string>;
  pendingKey: string | null;
  onMessageChange: (key: string, value: string) => void;
  onRequest: (key: string, requesterAppId: string, recipientAppId: string) => void;
}) {
  if (overview.suggestions.length === 0) {
    return (
      <EmptyState>
        No similar listings from creators who have opted in. List or publish an app, then check back. {SIMILARITY_RULE_SUMMARY}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      {overview.suggestions.map((suggestion) => {
        const key = `${suggestion.requester_app_id}:${suggestion.recipient_app_id}`;
        return (
          <article key={key} className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-900">
                {suggestion.requester_app_title}
                <span className="font-normal text-slate-500"> looks similar to </span>
                <Link href={`/apps/${suggestion.recipient_app_slug}`} className="underline">
                  {suggestion.recipient_app_title}
                </Link>
              </p>
              <p className="text-sm text-slate-600">by {suggestion.recipient_name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestion.reasons.map((reason) => (
                <Badge key={reason} variant="secondary">
                  {reason}
                </Badge>
              ))}
            </div>
            <Textarea
              value={messages[key] ?? ""}
              maxLength={500}
              placeholder="Optional note for the other creator"
              onChange={(event) => onMessageChange(key, event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={!enabled || pendingKey !== null}
                onClick={() => onRequest(key, suggestion.requester_app_id, suggestion.recipient_app_id)}
              >
                {pendingKey === `request:${key}` ? "Sending…" : "Request collaboration"}
              </Button>
              {!enabled ? <p className="text-xs text-slate-500">Opt in before you can send this request.</p> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function RequestList({
  requests,
  empty,
  pendingKey,
  render,
  actions,
}: {
  requests: CollaborationRequestView[];
  empty: string;
  pendingKey: string | null;
  render: (request: CollaborationRequestView) => ReactNode;
  actions: (request: CollaborationRequestView) => ReactNode;
}) {
  if (requests.length === 0) {
    return <EmptyState>{empty}</EmptyState>;
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <article key={request.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
          {render(request)}
          <div className="flex flex-wrap gap-2">{actions(request)}</div>
          {pendingKey === request.id ? <p className="text-xs text-slate-500">Saving…</p> : null}
        </article>
      ))}
    </div>
  );
}

function RequestSummary({
  eyebrow,
  yours,
  yoursSlug,
  theirs,
  theirsSlug,
  theirName,
  message,
}: {
  eyebrow: string;
  yours: string;
  yoursSlug: string | null;
  theirs: string;
  theirsSlug: string | null;
  theirName: string;
  message: string | null;
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium text-slate-900">{eyebrow}</p>
      <p className="text-sm text-slate-600">
        Your listing {yoursSlug ? <Link href={`/apps/${yoursSlug}`} className="underline">{yours}</Link> : yours}
        {" · "}
        {theirName}&apos;s listing {theirsSlug ? <Link href={`/apps/${theirsSlug}`} className="underline">{theirs}</Link> : theirs}
      </p>
      {message ? <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}

function ActiveList({
  collaborations,
  pendingKey,
  onEnd,
}: {
  collaborations: ActiveCollaboration[];
  pendingKey: string | null;
  onEnd: (id: string) => void;
}) {
  if (collaborations.length === 0) {
    return <EmptyState>No active collaborations. Accept a request to link your listings.</EmptyState>;
  }

  return (
    <div className="space-y-3">
      {collaborations.map((collaboration) => (
        <article key={collaboration.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div>
            <p className="font-medium text-slate-900">Built in collaboration with {collaboration.partner_name}</p>
            <p className="text-sm text-slate-600">
              {collaboration.your_app_title} and {collaboration.their_app_title} now show the collaboration credit.
            </p>
          </div>
          <p className="text-sm text-slate-700">
            Contact:{" "}
            {collaboration.partner_email ? (
              <a className="underline" href={`mailto:${collaboration.partner_email}`}>
                {collaboration.partner_email}
              </a>
            ) : (
              "No email on file"
            )}
          </p>
          <p className="text-xs text-slate-500">{REVENUE_SHARING_NOTE}</p>
          <Button
            type="button"
            variant="destructive"
            disabled={pendingKey !== null}
            onClick={() => onEnd(collaboration.id)}
          >
            End collaboration
          </Button>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">{children}</div>
  );
}
