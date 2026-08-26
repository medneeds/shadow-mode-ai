import { cn } from "@/lib/utils";
import type { VoiceState } from "./VoicePresence";

/**
 * Indicador explícito do ciclo de interação: ouvindo → pensando → respondendo.
 * Cada fase tem cor espectral, ritmo e texto próprios — a diferenciação nunca
 * depende apenas do movimento da esfera.
 */
const STATUS: Record<
  VoiceState,
  { label: string; hint: string; color: string; pulse: "fast" | "slow" | "none" }
> = {
  idle: {
    label: "Pronto",
    hint: "Ative o microfone ou escreva para começar",
    color: "var(--voice-cyan)",
    pulse: "none",
  },
  listening: {
    label: "Ouvindo você",
    hint: "Fale sua conduta — o Sombra está captando",
    color: "var(--voice-cyan)",
    pulse: "slow",
  },
  processing: {
    label: "Pensando",
    hint: "Interpretando o que você disse",
    color: "var(--voice-violet)",
    pulse: "fast",
  },
  speaking: {
    label: "Respondendo",
    hint: "O Sombra está falando",
    color: "var(--voice-blue)",
    pulse: "slow",
  },
  paused: { label: "Pausado", hint: "Estação em pausa", color: "var(--voice-indigo)", pulse: "none" },
  finished: {
    label: "Encerrada",
    hint: "Seguindo para a devolutiva",
    color: "var(--voice-indigo)",
    pulse: "none",
  },
};

export function PresenceStatus({ state, className }: { state: VoiceState; className?: string }) {
  const status = STATUS[state];

  return (
    <div className={cn("flex flex-col items-center gap-1", className)} aria-live="polite">
      <div
        className="flex items-center gap-2 rounded-full border px-3 py-1"
        style={{
          borderColor: `color-mix(in oklab, ${status.color} 40%, transparent)`,
          backgroundColor: `color-mix(in oklab, ${status.color} 10%, transparent)`,
        }}
      >
        {state === "processing" ? (
          <span className="flex items-center gap-[3px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-bounce rounded-full"
                style={{ backgroundColor: status.color, animationDelay: `${i * 140}ms` }}
              />
            ))}
          </span>
        ) : (
          <span
            className={cn(
              "size-2 rounded-full",
              status.pulse === "slow" && "animate-pulse",
              status.pulse === "fast" && "animate-ping",
            )}
            style={{ backgroundColor: status.color }}
          />
        )}
        <span
          className="text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ color: status.color }}
        >
          {status.label}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground/70">{status.hint}</p>
    </div>
  );
}
