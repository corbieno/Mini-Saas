"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm({ nextPath = "/dashboard", initialError }: { nextPath?: string; initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState<"password" | "magic" | null>(null);

  const configured = useMemo(() => isSupabaseConfigured(), []);
  const title = mode === "signin" ? "Sign in" : "Create account";
  const subtitle =
    mode === "signin" ? "Access your marketplace dashboard" : "Start listing Mini SaaS apps and connect payouts";

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      : undefined;

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!configured) {
      setError("Supabase env vars are missing. Copy .env.example to .env.local.");
      return;
    }

    setPending("password");
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (signUpError) {
          throw signUpError;
        }
        if (data.session) {
          router.push(nextPath);
          router.refresh();
          return;
        }
        setMessage("Check your email to confirm your account, then sign in.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        throw signInError;
      }
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setPending(null);
    }
  }

  async function handleMagicLink() {
    setError(null);
    setMessage(null);

    if (!configured) {
      setError("Supabase env vars are missing. Copy .env.example to .env.local.");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email to receive a magic link.");
      return;
    }

    setPending("magic");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (otpError) {
        throw otpError;
      }
      setMessage("Magic link sent. Check your inbox to continue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send magic link");
    } finally {
      setPending(null);
    }
  }

  return (
    <AuthCard title={title} subtitle={subtitle}>
      <form className="space-y-4" onSubmit={handlePassword}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="you@studio.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            placeholder="At least 6 characters"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <Button className="w-full" type="submit" disabled={pending !== null}>
          {pending === "password" ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => void handleMagicLink()}
        >
          {pending === "magic" ? "Sending link…" : "Email me a magic link"}
        </Button>
      </form>
      <p className="text-center text-sm text-slate-600">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </AuthCard>
  );
}
