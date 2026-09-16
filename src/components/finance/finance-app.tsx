"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FinanceProvider } from "./finance-context";
import { FinanceShell } from "./finance-shell";

const THEME_KEY = "mini-saas.finance.theme";

export function FinanceApp({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    setDark(stored === "dark");
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) {
      return;
    }
    window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark, themeReady]);

  return (
    <div className={cn(dark && "dark")}>
      <FinanceProvider>
        <FinanceShell dark={dark} onToggleDark={() => setDark((value) => !value)}>
          {children}
        </FinanceShell>
      </FinanceProvider>
    </div>
  );
}
