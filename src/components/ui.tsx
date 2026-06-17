"use client";

import { cn } from "@/lib/cn";
import { usePortfolio } from "./PortfolioProvider";
import { formatIDR, formatUSD } from "@/lib/format";

/* ── Button ──────────────────────────────────────────────────────────── */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variant === "primary" &&
          "bg-gold text-[#1c1a18] hover:bg-gold-soft font-semibold",
        variant === "outline" &&
          "border border-border bg-surface hover:bg-surface-2 text-foreground",
        variant === "ghost" && "hover:bg-surface-2 text-muted hover:text-foreground",
        variant === "danger" &&
          "border border-loss/40 text-loss hover:bg-loss/10",
        className,
      )}
      {...props}
    />
  );
}

/* ── Card ────────────────────────────────────────────────────────────── */
export function Card({
  className,
  children,
  interactive,
  accent,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  interactive?: boolean;
  accent?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("card p-5", interactive && "card-hover", accent && "accent-top", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/* ── Section header (serif title + gold rule) ────────────────────────── */
export function SectionHeader({
  title,
  aside,
  className,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-serif text-lg leading-none text-foreground">{title}</h2>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      <div className="rule-gold mt-2.5 w-16" />
    </div>
  );
}

/* ── Skeleton (brand-tinted loading placeholder) ─────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/* ── Badge ───────────────────────────────────────────────────────────── */
export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        "bg-surface-2 text-muted border border-border",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Money (respects display currency) ───────────────────────────────── */
export function Money({
  usd,
  className,
  compact,
}: {
  usd: number | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  const { currency, toDisplay } = usePortfolio();
  const v = toDisplay(usd);
  const text =
    currency === "USD" ? formatUSD(v, { compact }) : formatIDR(v);
  return <span className={cn("tnum", className)}>{text}</span>;
}

/* ── Inputs ──────────────────────────────────────────────────────────── */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted/70">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-gold/60 transition-colors";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { onWheel, ...rest } = props;
  return (
    <input
      className={cn(inputBase, props.className)}
      // Number inputs otherwise capture the wheel and block modal scrolling.
      onWheel={(e) => {
        if (rest.type === "number") (e.target as HTMLInputElement).blur();
        onWheel?.(e);
      }}
      {...rest}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputBase, "cursor-pointer", props.className)} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-[72px] resize-y", props.className)} {...props} />;
}
