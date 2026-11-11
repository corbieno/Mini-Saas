import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export interface CategoryItem {
  name: string;
  description: string;
  icon?: string;
  highlight?: string;
  href?: string;
}

export interface CategoryGridProps {
  title: string;
  caption?: string;
  items: CategoryItem[];
}

export function CategoryGrid({ title, caption, items }: CategoryGridProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
      <div className="max-w-3xl space-y-2">
        {caption ? <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">{caption}</p> : null}
        <h2 className="text-3xl font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const cardClassName =
            "group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40";
          const body = (
            <>
              <div className="text-3xl" aria-hidden>
                {item.icon}
              </div>
              <div className="space-y-1.5">
                <div className="text-lg font-semibold text-slate-900">{item.name}</div>
                <p className="text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
              {item.highlight ? (
                <Badge variant="secondary" className="w-fit">
                  {item.highlight}
                </Badge>
              ) : null}
            </>
          );

          if (item.href) {
            return (
              <Link key={item.name} href={item.href} className={cardClassName}>
                {body}
              </Link>
            );
          }

          return (
            <div key={item.name} className={cardClassName}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
