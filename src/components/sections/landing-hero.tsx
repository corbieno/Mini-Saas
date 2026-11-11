import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type LandingHeroStat = {
  label: string;
  value: string;
};

export type LandingHeroCTA = {
  label: string;
  href: string;
  variant?: "default" | "outline";
};

export interface LandingHeroProps {
  tagline: string;
  title: string;
  description: string;
  primaryCta: LandingHeroCTA;
  secondaryCta?: LandingHeroCTA;
  stats?: LandingHeroStat[];
}

export function LandingHero({
  tagline,
  title,
  description,
  primaryCta,
  secondaryCta,
  stats = [],
}: LandingHeroProps) {
  return (
    <section className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 md:flex-row md:items-center md:gap-16 md:py-24">
      <div className="flex-1 space-y-7">
        <Badge className="bg-accent text-accent-foreground">{tagline}</Badge>
        <div>
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] text-slate-900 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href={primaryCta.href}>{primaryCta.label}</Link>
          </Button>
          {secondaryCta ? (
            <Button size="lg" variant={secondaryCta.variant ?? "outline"} asChild>
              <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {stats.length > 0 ? (
        <div className="grid flex-1 gap-6 rounded-2xl border border-border bg-card p-6 shadow-card sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <div className="text-3xl font-semibold text-slate-900">{stat.value}</div>
              <div className="mt-1 text-sm text-slate-600">{stat.label}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
