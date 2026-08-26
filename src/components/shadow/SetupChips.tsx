import { useMemo, useState } from "react";

import { durations, levels, themes, type LevelId } from "@/lib/shadow-content";
import type { TrainingConfig } from "@/lib/training-session";
import { durationLabel, levelLabel, themeLabel } from "@/lib/training-session";
import type { ConfigField } from "@/lib/shadow/setup-flow";
import { cn } from "@/lib/utils";

/**
 * Configuração visível em UMA linha: três chips (tema · nível · tempo).
 * O que ainda não foi dito aparece como pergunta; tocar num chip abre apenas
 * as sugestões daquele campo. Nunca um formulário — só atalhos para quem
 * prefere tocar a falar.
 */
type Field = Extract<ConfigField, "themeId" | "levelId" | "durationId">;

const FIELDS: { id: Field; ask: string }[] = [
  { id: "themeId", ask: "Tema" },
  { id: "levelId", ask: "Nível" },
  { id: "durationId", ask: "Tempo" },
];

/** Sugestões rápidas por campo — as mais usadas primeiro, no máximo quatro. */
const SUGGESTIONS: Record<Field, { value: string; label: string }[]> = {
  themeId: themes.slice(0, 4).map((t) => ({ value: t.id, label: t.label })),
  levelId: levels.map((l) => ({ value: l.id, label: l.label })),
  durationId: durations.map((d) => ({ value: d.id, label: d.label.replace(" minutos", " min") })),
};

export function SetupChips({
  config,
  provided,
  onPick,
  className,
}: {
  config: TrainingConfig;
  provided: ConfigField[];
  onPick: (patch: Partial<TrainingConfig>) => void;
  className?: string;
}) {
  const firstMissing = FIELDS.find((f) => !provided.includes(f.id))?.id ?? null;
  const [openField, setOpenField] = useState<Field | null>(null);
  const active = openField ?? firstMissing;

  const valueOf = useMemo(
    () => ({
      themeId: themeLabel(config.themeId),
      levelId: levelLabel(config.levelId as LevelId),
      durationId: durationLabel(config.durationId).replace(" minutos", " min"),
    }),
    [config.themeId, config.levelId, config.durationId],
  );

  return (
    <div className={cn("flex w-full max-w-md flex-col items-center gap-3", className)}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {FIELDS.map((field) => {
          const isProvided = provided.includes(field.id);
          const isActive = active === field.id;
          return (
            <button
              key={field.id}
              type="button"
              onClick={() => setOpenField(isActive ? null : field.id)}
              aria-expanded={isActive}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                isProvided
                  ? "border-foreground/20 text-foreground"
                  : "border-dashed border-hairline text-muted-foreground/60",
                isActive && "bg-surface-raised/60",
              )}
            >
              {isProvided ? valueOf[field.id] : field.ask}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS[active].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onPick({ [active]: option.value } as Partial<TrainingConfig>);
                setOpenField(null);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors",
                "hover:bg-surface-raised/70 hover:text-foreground",
                config[active] === option.value && "text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
