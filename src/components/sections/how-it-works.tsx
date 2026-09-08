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
    <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-8">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">How it works</p>
        <h2 className="text-3xl font-semibold text-slate-900">Creators ship. Buyers subscribe. You take a fee.</h2>
      </div>
      <ol className="grid gap-6 text-left md:grid-cols-3">
        {steps.map((step, idx) => (
          <li key={step.title} className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Step {idx + 1}</div>
            <div className="text-lg font-semibold text-slate-900">{step.title}</div>
            <p className="text-sm text-slate-600">{step.description}</p>
            {step.detail ? <p className="text-xs text-slate-500">{step.detail}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
