import { formatCollaboratorNames } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CollaborationCredit({ names, className }: { names: string[]; className?: string }) {
  const label = formatCollaboratorNames(names);
  if (!label) {
    return null;
  }

  return <p className={cn("text-sm font-medium text-slate-700", className)}>Built in collaboration with {label}</p>;
}
