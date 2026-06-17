"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

// Hydration-safe "is on the client" check — false during SSR, true after.
const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return <div className="h-9 w-9" aria-hidden />;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface
                 text-muted transition-colors hover:bg-surface-2 hover:text-gold cursor-pointer"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
