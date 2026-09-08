import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md border-slate-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-slate-900">{title}</CardTitle>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      <CardFooter>
        {footer ?? (
          <p className="text-xs text-slate-500">
            Need an account? Use the form above, then{" "}
            <Link href="/onboarding" className="underline">
              complete creator onboarding
            </Link>
            .
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
