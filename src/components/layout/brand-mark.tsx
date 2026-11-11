import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full text-[15px] font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
      >
        M
      </span>
      Mini SaaS
    </Link>
  );
}
