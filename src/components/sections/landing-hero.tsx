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
    <section className="relative mx-auto flex max-w-6xl flex-col gap-10 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-6 py-16 text-slate-50 shadow-2xl ring-1 ring-white/10 md:flex-row md:items-center md:gap-16 md:px-14">
      <div className="flex-1 space-y-6">
        <Badge variant="secondary" className="bg-white/10 text-xs font-medium uppercase tracking-wide text-white">
          {tagline}
        </Badge>
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl sm:leading-tight">
            {title}
          </h1>
          <p className="mt-4 text-base text-slate-200 sm:text-lg">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href={primaryCta.href}>{primaryCta.label}</Link>
          </Button>
          {secondaryCta ? (
            <Button size="lg" variant={secondaryCta.variant ?? "outline"} className="text-foreground" asChild>
              <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {stats.length > 0 ? (
        <div className="flex flex-1 flex-wrap justify-between gap-6 rounded-2xl border border-white/15 bg-white/10 p-6 text-left">
          {stats.map((stat) => (
            <div key={stat.label} className="flex-1 min-w-[120px]">
              <div className="text-3xl font-semibold text-white">{stat.value}</div>
              <div className="text-sm text-slate-200">{stat.label}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
