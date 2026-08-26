import { cn } from "@/lib/utils";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "paused" | "finished";

export const voiceStateLabels: Record<VoiceState, string> = {
  idle: "Pronto para começar",
  listening: "Ouvindo...",
  processing: "Processando...",
  speaking: "Shadow falando",
  paused: "Pausado",
  finished: "Estação encerrada",
};

/**
 * Presença de voz do Shadow — uma presença inteligente, não um personagem.
 * Estados são visuais nesta fase (sem provedor de voz).
 */
export function VoicePresence({
  state = "idle",
  className,
}: {
  state?: VoiceState;
  className?: string;
}) {
  const animated = state === "listening" || state === "speaking" || state === "idle";

  return (
    <div
      className={cn("relative flex size-56 items-center justify-center sm:size-72", className)}
      role="img"
      aria-label={`Presença do Shadow — ${voiceStateLabels[state]}`}
    >
      {animated && (
        <>
          <span
            aria-hidden
            className="absolute size-40 rounded-full border border-moss/30 animate-pulse-ring sm:size-52"
          />
          <span
            aria-hidden
            className="absolute size-40 rounded-full border border-moss/20 animate-pulse-ring sm:size-52"
            style={{ animationDelay: "1.6s" }}
          />
        </>
      )}

      <span
        aria-hidden
        className={cn(
          "absolute size-40 rounded-full bg-moss-soft blur-2xl sm:size-52",
          state === "speaking" && "bg-gold-soft",
          state === "finished" && "opacity-40",
        )}
      />

      <span
        aria-hidden
        className={cn(
          "relative flex size-32 items-center justify-center rounded-full border border-hairline bg-surface-raised/70 sm:size-40",
          animated && "animate-breathe",
        )}
      >
        {state === "processing" ? (
          <span className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-moss/80 animate-breathe"
                style={{ animationDelay: `${i * 0.35}s`, animationDuration: "1.6s" }}
              />
            ))}
          </span>
        ) : (
          <Waveform state={state} />
        )}
      </span>
    </div>
  );
}

function Waveform({ state }: { state: VoiceState }) {
  const heights =
    state === "speaking"
      ? [10, 26, 44, 20, 34, 14]
      : state === "listening"
        ? [8, 18, 30, 16, 22, 10]
        : [6, 8, 12, 8, 8, 6];

  return (
    <span className="flex items-end gap-1.5" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all duration-500",
            state === "speaking" ? "bg-gold/80" : "bg-moss",
            state === "paused" && "bg-muted-foreground/60",
            state === "finished" && "bg-muted-foreground/40",
          )}
          style={{ height: `${h}px` }}
        />
      ))}
    </span>
  );
}
