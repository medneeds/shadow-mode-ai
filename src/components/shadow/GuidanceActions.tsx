import { cn } from "@/lib/utils";
import type { GuidanceOption } from "@/lib/clinical/guidance-types";

/**
 * Ações contextuais que emergem da simulação (andaime pedagógico).
 *
 * Não são respostas de prova: são possibilidades clínicas do momento. Ficam
 * discretas, abaixo da esfera, e desaparecem quando o momento se resolve.
 * A esfera continua sendo o centro visual da estação.
 */
export function GuidanceActions({
  options,
  onSelect,
  disabled,
  className,
}: {
  options: GuidanceOption[];
  onSelect: (option: GuidanceOption) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (options.length === 0) return null;

  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-wrap items-center justify-center gap-2 lg:max-w-2xl",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500",
        className,
      )}
      role="group"
      aria-label="Ações contextuais sugeridas"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option)}
          className={cn(
            "rounded-full border border-hairline px-4 py-2 text-xs font-medium",
            "text-muted-foreground/85 transition-all duration-200",
            "hover:border-foreground/25 hover:bg-surface-raised/60 hover:text-foreground",
            "active:scale-[0.98] disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
