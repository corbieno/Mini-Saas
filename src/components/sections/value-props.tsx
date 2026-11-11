export interface ValuePropsSection {
  title: string;
  items: { title: string; description: string }[];
}

export interface ValuePropsProps {
  sections: ValuePropsSection[];
}

export function ValueProps({ sections }: ValuePropsProps) {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {section.items.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="text-base font-medium text-slate-900">{item.title}</div>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
