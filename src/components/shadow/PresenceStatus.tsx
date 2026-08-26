import { cn } from "@/lib/utils";
import type { VoiceState } from "./VoicePresence";

/**
 * Estado da interação em sua forma mínima: um ponto e uma palavra, no mesmo
 * idioma visual da esfera. Sem caixa, sem borda, sem frase de apoio — o ciclo
 * (ouvindo → pensando → respondendo) é lido junto com a presença, não ao lado.
 */
const STATUS: Record<VoiceState, { label: string; color: string; motion: "pulse" | "think" | "none" }> = {
  idle: { label: "pronto", color: "var(--voice-cyan)", motion: "none" },
  listening: { label: "ouvindo", color: "var(--voice-cyan)", motion: "pulse" },
  processing: { label: "pensando", color: "var(--voice-violet)", motion: "think" },
  speaking: { label: "respondendo", color: "var(--voice-blue)", motion: "pulse" },
  paused: { label: "pausado", color: "var(--voice-indigo)", motion: "none" },
  finished: { label: "encerrada", color: "var(--voice-indigo)", motion: "none" },
};

export function PresenceStatus({ state, className }: { state: VoiceState; className?: string }) {
  const status = STATUS[state];

  return (
    <div
      className={cn("flex items-center justify-center gap-2 transition-opacity duration-500", className)}
      aria-live="polite"
    >
      {status.motion === "think" ? (
        <span className="flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1 animate-bounce rounded-full"
              style={{ backgroundColor: status.color, animationDelay: `${i * 140}ms` }}
            />
          ))}
        </span>
      ) : (
        <span
          className={cn("size-1.5 rounded-full", status.motion === "pulse" && "animate-pulse")}
          style={{ backgroundColor: status.color }}
        />
      )}
      <span
        className="text-[10px] font-medium lowercase tracking-[0.22em]"
        style={{ color: `color-mix(in oklab, ${status.color} 78%, transparent)` }}
      >
        {status.label}
      </span>
    </div>
  );
}
