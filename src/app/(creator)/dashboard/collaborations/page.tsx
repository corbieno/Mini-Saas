import Link from "next/link";
import { CollaborationPanel } from "@/components/creator/collaboration-panel";
import { Button } from "@/components/ui/button";
import { loadCollaborationOverview } from "@/lib/data/collaborations";
import { ensureCreatorForUser, getAuthUser, getCreatorForUser } from "@/lib/data/creators";

export const dynamic = "force-dynamic";

export default async function CollaborationsPage() {
  const user = await getAuthUser();
  const creator = user ? ((await getCreatorForUser(user.id)) ?? (await ensureCreatorForUser(user))) : null;
  const result = creator ? await loadCollaborationOverview(creator.id) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Creator console</p>
          <h1 className="text-4xl font-semibold text-slate-900">Collaborations</h1>
          <p className="text-sm text-slate-600">
            Suggest a collaboration when your listing resembles another creator&apos;s. Both of you have to opt in, and
            nothing is shared until they accept.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </header>

      {!user || !creator ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Sign in to manage collaboration suggestions.
        </div>
      ) : result && !result.ok ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">{result.error}</div>
      ) : result?.ok ? (
        <CollaborationPanel overview={result.data} />
      ) : null}
    </main>
  );
}
