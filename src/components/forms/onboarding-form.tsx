"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Creator } from "@/lib/types";

const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "IE", label: "Ireland" },
];

function statusCopy(creator: Creator | null) {
  if (!creator?.stripe_account_id) {
    return "Connect Stripe Express to receive payouts.";
  }
  if (creator.charges_enabled) {
    return "Stripe is connected and charges are enabled.";
  }
  if (creator.details_submitted) {
    return "Stripe is reviewing your account. This usually finishes within a few minutes.";
  }
  return "Finish Stripe onboarding to enable payouts.";
}

export function OnboardingForm({
  creator,
  stripeReturn,
}: {
  creator: Creator | null;
  stripeReturn?: "return" | "refresh" | null;
}) {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState(creator?.workspace_name ?? "");
  const [contactEmail, setContactEmail] = useState(creator?.contact_email ?? "");
  const [country, setCountry] = useState(creator?.country ?? "US");
  const [pending, setPending] = useState<"save" | "connect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(() => {
    if (stripeReturn === "return") {
      return "Returned from Stripe. We’ll refresh your Connect status.";
    }
    if (stripeReturn === "refresh") {
      return "The previous Stripe link expired. Start Connect again.";
    }
    return null;
  });

  const stripeReady = Boolean(creator?.charges_enabled);
  const banner = useMemo(() => statusCopy(creator), [creator]);

  async function submit(connect: boolean) {
    setError(null);
    setMessage(null);
    setPending(connect ? "connect" : "save");

    try {
      const response = await fetch("/api/creator/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_name: workspaceName,
          contact_email: contactEmail,
          country,
          connect,
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Onboarding request failed");
      }
      if (connect && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setMessage("Studio details saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">1. Workspace</CardTitle>
          <p className="text-sm text-slate-600">What should buyers see as your brand?</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="workspace">Studio name</Label>
          <Input
            id="workspace"
            placeholder="Studio name"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">2. Contact</CardTitle>
          <p className="text-sm text-slate-600">Where should we reach you for reviews?</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="contact">Email</Label>
          <Input
            id="contact"
            placeholder="you@email.com"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">3. Payouts</CardTitle>
          <p className="text-sm text-slate-600">Country is locked on the Stripe account once Connect starts.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="country">Business country</Label>
            <select
              id="country"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              disabled={Boolean(creator?.stripe_account_id)}
            >
              {COUNTRIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-slate-600">{banner}</p>
          {creator?.stripe_account_id ? (
            <p className="text-xs text-slate-500">
              Connected account: <code>{creator.stripe_account_id}</code>
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
          {error ? <p className="flex-1 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="flex-1 text-sm text-emerald-700">{message}</p> : null}
          <Button variant="ghost" disabled={pending !== null} onClick={() => void submit(false)}>
            {pending === "save" ? "Saving…" : "Save studio"}
          </Button>
          <Button disabled={pending !== null} onClick={() => void submit(true)}>
            {pending === "connect"
              ? "Redirecting…"
              : stripeReady
                ? "Open Stripe dashboard link"
                : creator?.stripe_account_id
                  ? "Continue Stripe onboarding"
                  : "Continue to payouts"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
