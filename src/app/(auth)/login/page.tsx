import { AuthCard } from "@/components/auth/auth-card";

export default function LoginPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-16">
      <AuthCard
        title="Sign in"
        subtitle="Access your marketplace dashboard"
        actionLabel="Continue"
      />
    </main>
  );
}
