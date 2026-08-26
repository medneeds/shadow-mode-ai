import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-3 text-2xl sm:text-3xl">{title}</h2>
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

export function OptionChip({
  label,
  hint,
  selected,
  onSelect,
  emphasis,
}: {
  label: string;
  hint?: string;
  selected?: boolean;
  onSelect?: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-w-0 flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
        "border-hairline bg-surface hover:bg-surface-raised",
        selected && "border-moss/60 bg-moss-soft",
        selected && emphasis && "border-gold/60 bg-gold-soft",
      )}
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

export function MeterRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-foreground">{label}</span>
        <span className="font-display text-sm text-muted-foreground tabular-nums">{value}</span>
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-raised"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full", value >= 75 ? "bg-moss" : "bg-gold/70")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
