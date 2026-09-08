import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AuthCardProps {
  title: string;
  subtitle: string;
  actionLabel: string;
}

export function AuthCard({ title, subtitle, actionLabel }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md border-slate-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-slate-900">{title}</CardTitle>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Email" type="email" />
        <Input placeholder="Password" type="password" />
        <Button className="w-full">{actionLabel}</Button>
        <Button variant="outline" className="w-full">
          Continue with Google
        </Button>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-slate-500">
          Need an account? <Link href="/onboarding" className="underline">Become a creator</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
