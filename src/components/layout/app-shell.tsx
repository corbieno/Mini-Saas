"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LayoutDashboard, LayoutGrid, LogIn, LogOut, Menu, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { useCurrentUser } from "@/components/layout/use-current-user";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BARE_PREFIXES = ["/apps/corbin-email-guru"];
const COLLAPSE_KEY = "mini-saas.nav.collapsed";
const EXPANDED_WIDTH = "16.5rem";
const COLLAPSED_WIDTH = "4.75rem";

const NAV_ITEMS = [
  { href: "/apps", label: "Apps", icon: LayoutGrid },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

function isBarePath(pathname: string) {
  return BARE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function usesMarketingChrome(pathname: string) {
  return pathname === "/" || pathname === "/login";
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active = isCurrent(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-card hover:text-slate-900 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className={cn(collapsed && "sr-only")}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AccountControl({
  collapsed,
  email,
  onNavigate,
}: {
  collapsed: boolean;
  email?: string | null;
  onNavigate?: () => void;
}) {
  if (email) {
    return (
      <div className={cn("space-y-2 px-3", collapsed && "px-2")}>
        <p className={cn("truncate px-3 text-xs text-slate-500", collapsed && "sr-only")} title={email}>
          {email}
        </p>
        <form action="/auth/sign-out" method="post">
          <Button variant="outline" type="submit" className={cn("w-full bg-card", collapsed && "px-0")}>
            <LogOut aria-hidden />
            <span className={cn(collapsed && "sr-only")}>Log out</span>
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className={cn("px-3", collapsed && "px-2")}>
      <Button asChild className={cn("w-full", collapsed && "px-0")}>
        <Link href="/login" onClick={onNavigate}>
          {collapsed ? <LogIn aria-hidden /> : null}
          <span className={cn(collapsed && "sr-only")}>Sign in</span>
        </Link>
      </Button>
    </div>
  );
}

function SidebarBody({
  pathname,
  collapsed,
  email,
  onNavigate,
  onToggleCollapse,
}: {
  pathname: string;
  collapsed: boolean;
  email?: string | null;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      <div className={cn("flex items-center gap-2 px-3 py-4", collapsed ? "justify-center" : "justify-between")}>
        <p className={cn("px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", collapsed && "sr-only")}>
          Menu
        </p>
        {onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <PanelRightOpen /> : <PanelRightClose />}
          </Button>
        ) : null}
      </div>
      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
        <NavLinks pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>
      <div className="border-t border-sidebar-border pb-4 pt-3">
        <AccountControl collapsed={collapsed} email={email} onNavigate={onNavigate} />
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const hydrated = useRef(false);
  const drawerTitleId = useId();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (window.localStorage.getItem(COLLAPSE_KEY) === "1") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const drawer = drawerRef.current;
    const menuButton = menuButtonRef.current;
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
        setMobileOpen(false);
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
      (previouslyFocused ?? menuButton)?.focus();
    };
  }, [mobileOpen]);

  if (isBarePath(pathname)) {
    return children;
  }

  if (usesMarketingChrome(pathname)) {
    return (
      <div className="min-h-screen">
        <MarketingHeader user={user} />
        {children}
      </div>
    );
  }

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <div
      className="min-h-screen motion-safe:lg:transition-[padding-right] motion-safe:lg:duration-200"
      style={{ ["--app-nav-width" as string]: width }}
    >
      <div className="lg:pr-[var(--app-nav-width)]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <BrandMark />
            <Button
              ref={menuButtonRef}
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="app-nav-drawer"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </header>
        {children}
      </div>

      <aside
        className="fixed inset-y-0 right-0 z-30 hidden w-[var(--app-nav-width)] flex-col overflow-y-auto border-l border-sidebar-border bg-sidebar text-sidebar-foreground motion-safe:transition-[width] motion-safe:duration-200 lg:flex"
        style={{ width }}
      >
        <SidebarBody
          pathname={pathname}
          collapsed={collapsed}
          email={user?.email}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        id="app-nav-drawer"
        ref={drawerRef}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
        aria-hidden={mobileOpen ? undefined : true}
        aria-labelledby={drawerTitleId}
        inert={mobileOpen ? undefined : true}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] translate-x-full flex-col overflow-y-auto border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-soft motion-safe:transition-transform motion-safe:duration-200 lg:hidden",
          mobileOpen && "translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <p id={drawerTitleId} className="text-sm font-semibold text-slate-900">
            Menu
          </p>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X />
          </Button>
        </div>
        <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
          <NavLinks pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </nav>
        <div className="border-t border-sidebar-border pb-4 pt-3">
          <AccountControl collapsed={false} email={user?.email} onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>
    </div>
  );
}
