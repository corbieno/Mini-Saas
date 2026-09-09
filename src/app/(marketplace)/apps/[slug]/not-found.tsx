import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm uppercase tracking-wide text-slate-500">Marketplace</p>
      <h1 className="text-3xl font-semibold text-slate-900">App not found</h1>
      <p className="text-sm text-slate-600">That listing is missing, unpublished, or the slug is wrong.</p>
      <Link href="/apps" className="text-sm font-medium underline">
        Back to apps
      </Link>
    </main>
  );
}
