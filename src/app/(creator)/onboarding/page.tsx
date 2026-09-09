import { OnboardingForm } from "@/components/forms/onboarding-form";
import { ensureCreatorForUser, getAuthUser, getCreatorForUser, refreshCreatorStripeStatus } from "@/lib/data/creators";

export const dynamic = "force-dynamic";

export default async function CreatorOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  const params = await searchParams;
  const user = await getAuthUser();
  const loaded = user ? ((await getCreatorForUser(user.id)) ?? (await ensureCreatorForUser(user))) : null;
  const creator = loaded ? await refreshCreatorStripeStatus(loaded) : null;
  const stripeReturn = params.stripe === "return" || params.stripe === "refresh" ? params.stripe : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">Creator onboarding</p>
        <h1 className="text-4xl font-semibold text-slate-900">Tell us about your studio</h1>
        <p className="text-sm text-slate-600">We’ll unlock Stripe Connect after you complete these steps.</p>
      </header>
      <OnboardingForm creator={creator} stripeReturn={stripeReturn} />
    </main>
  );
}
