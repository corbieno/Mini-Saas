import { OnboardingSteps } from "@/components/forms/onboarding-steps";
import { Button } from "@/components/ui/button";

export default function CreatorOnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-16">
    <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">Creator onboarding</p>
        <h1 className="text-4xl font-semibold text-slate-900">Tell us about your studio</h1>
        <p className="text-sm text-slate-600">We’ll unlock Stripe Connect after you complete these steps.</p>
      </header>
      <OnboardingSteps />
      <div className="flex justify-end">
        <Button size="lg">Continue to payouts</Button>
      </div>
    </main>
  );
}
