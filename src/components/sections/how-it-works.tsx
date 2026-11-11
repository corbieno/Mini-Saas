export interface HowItWorksStep {
  title: string;
  description: string;
  detail?: string;
}

export interface HowItWorksProps {
  steps: HowItWorksStep[];
}

export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section className="mx-auto w-full max-w-5xl rounded-3xl border border-border bg-card p-8 shadow-card sm:p-10">
      <div className="mb-8 max-w-2xl space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">How it works</p>
        <h2 className="text-3xl font-semibold text-slate-900">Creators ship. Buyers subscribe. You take a fee.</h2>
      </div>
      <ol className="grid gap-5 text-left md:grid-cols-3">
        {steps.map((step, idx) => (
          <li key={step.title} className="space-y-2 rounded-2xl border border-border bg-muted/70 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Step {idx + 1}</div>
            <div className="text-lg font-semibold text-slate-900">{step.title}</div>
            <p className="text-sm leading-6 text-slate-600">{step.description}</p>
            {step.detail ? <p className="text-xs text-slate-500">{step.detail}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
