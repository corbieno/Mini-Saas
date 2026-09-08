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
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-3xl bg-slate-900 px-8 py-10 text-slate-50 shadow-2xl">
      <div>
        {eyebrow ? <p className="text-sm uppercase tracking-wide text-slate-300">{eyebrow}</p> : null}
        <h2 className="text-3xl font-semibold leading-tight">{title}</h2>
        <p className="mt-2 text-sm text-slate-200">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <Link href={primaryCta.href}>{primaryCta.label}</Link>
        </Button>
        {secondaryCta ? (
          <Button size="lg" variant="secondary" asChild>
            <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
