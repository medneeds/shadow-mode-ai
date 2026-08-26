import { Zap } from "lucide-react";

import type { TrainingConfig } from "@/lib/training-session";
import { cn } from "@/lib/utils";

/**
 * Estações rápidas: um toque define tema · nível · tempo e entra na estação.
 * Atalho de produto — não altera dificuldade real, caso nem avaliação.
 */
export type QuickStation = {
  id: string;
  label: string;
  detail: string;
  patch: Partial<TrainingConfig>;
};

export const quickStations: QuickStation[] = [
  {
    id: "emergencia-10",
    label: "Emergência agora",
    detail: "Emergência · 5 min",
    patch: { themeId: "emergencia", levelId: "intermediario", durationId: "5" },
  },
  {
    id: "raciocinio-rapido",
    label: "Raciocínio rápido",
    detail: "Clínica médica · 3 min",
    patch: { themeId: "clinica-medica", levelId: "intermediario", durationId: "3" },
  },
  {
    id: "caso-completo",
    label: "Caso completo",
    detail: "Emergência · 15 min",
    patch: { themeId: "emergencia", levelId: "avancado", durationId: "15" },
  },
];

export function QuickStations({
  onPick,
  disabled,
  className,
}: {
  onPick: (station: QuickStation) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-md", className)}>
      <p className="eyebrow mb-3 text-center opacity-50">Estações rápidas</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {quickStations.map((station) => (
          <button
            key={station.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(station)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border border-hairline px-3 py-3 text-left transition-all duration-200",
              "hover:border-foreground/25 hover:bg-surface-raised/50 active:scale-[0.98] disabled:opacity-50",
            )}
          >
            <Zap aria-hidden className="size-4 shrink-0 text-muted-foreground/70" />
            <span>
              <span className="block text-sm text-foreground">{station.label}</span>
              <span className="block text-[11px] text-muted-foreground/70">{station.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
