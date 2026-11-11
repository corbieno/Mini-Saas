import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface CtaPanelProps {
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export function CtaPanel({ eyebrow, title, description, primaryCta, secondaryCta }: CtaPanelProps) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-3xl border border-border bg-gradient-to-br from-accent via-card to-secondary px-8 py-12 shadow-card sm:px-12">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-sm font-medium uppercase tracking-[0.16em] text-accent-foreground">{eyebrow}</p> : null}
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <Link href={primaryCta.href}>{primaryCta.label}</Link>
        </Button>
        {secondaryCta ? (
          <Button size="lg" variant="outline" className="bg-card" asChild>
            <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
