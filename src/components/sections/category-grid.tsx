import { Badge } from "@/components/ui/badge";

export interface CategoryItem {
  name: string;
  description: string;
  icon?: string;
  highlight?: string;
}

export interface CategoryGridProps {
  title: string;
  caption?: string;
  items: CategoryItem[];
}

export function CategoryGrid({ title, caption, items }: CategoryGridProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{caption}</p>
        <h2 className="text-3xl font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.name}
            className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:border-slate-900/20 hover:shadow-md"
          >
            <div className="text-3xl">{item.icon}</div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{item.name}</div>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
            {item.highlight ? (
              <Badge variant="secondary" className="w-fit bg-slate-900/5 text-xs font-medium text-slate-900">
                {item.highlight}
              </Badge>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
