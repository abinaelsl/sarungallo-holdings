"use client";

import { useEffect, useRef, useState } from "react";
import { formatPct2, formatRp } from "@/lib/format";
import { cn } from "@/lib/cn";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Count-up animation for KPI numbers. */
export function CountUp({
  value,
  duration = 900,
  format = "rp",
  className,
}: {
  value: number;
  duration?: number;
  format?: "rp" | "pct" | "number";
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (value - from) * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const text =
    format === "rp"
      ? formatRp(Math.round(display))
      : format === "pct"
        ? formatPct2(display)
        : Math.round(display).toLocaleString("id-ID");

  return <span className={cn("tnum", className)}>{text}</span>;
}

export function Rp({
  value,
  className,
  compact,
}: {
  value: number | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("tnum", className)}>
      {formatRp(value, { compact })}
    </span>
  );
}

export function StatusPill({
  status,
}: {
  status: "EXEMPT" | "WARNING" | "DANGER" | "NOTICE" | "spending" | "reinvesting";
}) {
  const styles: Record<string, string> = {
    EXEMPT: "border-gain/40 bg-gain/10 text-gain",
    WARNING: "border-gold/40 bg-gold-tint/40 text-gold-soft dark:text-gold",
    DANGER: "border-loss/40 bg-loss/10 text-loss",
    NOTICE: "border-burgundy/40 bg-burgundy/10 text-burgundy",
    spending: "border-gain/40 bg-gain/10 text-gain",
    reinvesting: "border-gold/40 bg-gold-tint/50 text-gold-soft dark:text-gold",
  };
  const labels: Record<string, string> = {
    EXEMPT: "EXEMPT",
    WARNING: "WARNING",
    DANGER: "AT RISK",
    NOTICE: "NOTICE",
    spending: "Spending dividends",
    reinvesting: "Reinvesting 100%",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
