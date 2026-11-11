"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/apps", label: "Apps" },
  { href: "/dashboard", label: "Dashboard" },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingHeader({ user }: { user: User | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const drawer = drawerRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusable()[0]?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const items = focusable();
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandMark />
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm sm:flex">
          {LINKS.map((link) => {
            const active = isCurrent(pathname, link.href);
            return (
              <Button
                key={link.href}
                variant="ghost"
                className={cn(active && "bg-accent text-accent-foreground")}
                asChild
              >
                <Link href={link.href} aria-current={active ? "page" : undefined}>
                  {link.label}
                </Link>
              </Button>
            );
          })}
          {user ? (
            <form action="/auth/sign-out" method="post">
              <Button variant="outline" type="submit">
                Log out
              </Button>
            </form>
          ) : (
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </nav>
        <Button
          variant="outline"
          size="icon"
          className="sm:hidden"
          aria-expanded={open}
          aria-controls="marketing-nav-drawer"
          onClick={() => setOpen(true)}
        >
          <Menu />
          <span className="sr-only">Open menu</span>
        </Button>
      </div>
    </header>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] sm:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        id="marketing-nav-drawer"
        ref={drawerRef}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-hidden={open ? undefined : true}
        aria-labelledby={titleId}
        inert={open ? undefined : true}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] translate-x-full flex-col border-l border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow-soft motion-safe:transition-transform motion-safe:duration-200 sm:hidden",
          open && "translate-x-0",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <p id={titleId} className="text-sm font-semibold text-slate-900">
            Menu
          </p>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close menu">
            <X />
          </Button>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {LINKS.map((link) => {
            const active = isCurrent(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-card hover:text-slate-900",
                  active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border pt-4">
          {user ? (
            <form action="/auth/sign-out" method="post">
              <Button variant="outline" type="submit" className="w-full bg-card">
                Log out
              </Button>
            </form>
          ) : (
            <Button asChild className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
