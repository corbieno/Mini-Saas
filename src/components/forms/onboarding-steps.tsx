import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Step {
  title: string;
  description: string;
  placeholder: string;
}

const steps: Step[] = [
  { title: "Workspace", description: "What should buyers see as your brand?", placeholder: "Studio name" },
  { title: "Contact", description: "Where should we reach you for reviews?", placeholder: "you@email.com" },
  { title: "Payouts", description: "We’ll connect Stripe after the basics.", placeholder: "Business country" },
];

export function OnboardingSteps() {
  return (
    <div className="grid gap-4">
      {steps.map((step, idx) => (
        <Card key={step.title} className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {idx + 1}. {step.title}
            </CardTitle>
            <p className="text-sm text-slate-600">{step.description}</p>
          </CardHeader>
          <CardContent>
            <Input placeholder={step.placeholder} />
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm">
              Save draft
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
