export interface ValuePropsSection {
  title: string;
  items: { title: string; description: string }[];
}

export interface ValuePropsProps {
  sections: ValuePropsSection[];
}

export function ValueProps({ sections }: ValuePropsProps) {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 rounded-3xl bg-slate-50 p-8">
      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {section.items.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-base font-medium text-slate-900">{item.title}</div>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
