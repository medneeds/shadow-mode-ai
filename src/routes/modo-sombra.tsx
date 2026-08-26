import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, Mic, MicOff, Pause, Play, Square } from "lucide-react";

import { VoicePresence, voiceStateLabels, type VoiceState } from "@/components/shadow/VoicePresence";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/modo-sombra")({
  head: () => ({
    meta: [
      { title: "Modo Sombra — estação clínica por voz" },
      {
        name: "description",
        content: "Ambiente imersivo de simulação clínica por voz do Shadow Mode.",
      },
      { property: "og:title", content: "Modo Sombra — estação clínica por voz" },
      {
        property: "og:description",
        content: "Conduza o caso falando naturalmente dentro do Modo Sombra.",
      },
    ],
  }),
  component: ShadowRoom,
});

const cycle: VoiceState[] = ["idle", "listening", "processing", "speaking"];

function ShadowRoom() {
  const [state, setState] = useState<VoiceState>("listening");
  const [muted, setMuted] = useState(false);

  const advance = () => {
    const next = cycle[(cycle.indexOf(state) + 1) % cycle.length] ?? "idle";
    setState(next);
  };

  return (
    <div className="room-backdrop flex min-h-screen flex-col">
      {/* Chrome mínimo */}
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <p className="eyebrow">Modo Sombra</p>
        <Link
          to="/resultado"
          className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Encerrar estação e ver devolutiva"
        >
          Encerrar
          <X aria-hidden className="size-4" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-10 text-center">
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Paciente de 58 anos trazido ao pronto-socorro inconsciente por familiares. Você pode
          iniciar sua avaliação.
        </p>

        <div className="mt-8">
          <VoicePresence state={state} />
        </div>

        <p aria-live="polite" className="mt-6 font-display text-lg">
          {voiceStateLabels[state]}
        </p>

        <div className="mt-8 h-px w-40 bg-hairline" aria-hidden />

        <p className="mt-6 font-display text-2xl tabular-nums text-muted-foreground">
          04:18 <span className="text-sm">restantes</span>
        </p>
      </main>

      <footer className="px-5 pb-8 sm:px-8">
        <div className="mx-auto flex max-w-md items-center justify-center gap-3">
          <RoomButton
            label={muted ? "Ativar microfone" : "Silenciar microfone"}
            onClick={() => setMuted((m) => !m)}
            active={!muted}
          >
            {muted ? <MicOff aria-hidden className="size-5" /> : <Mic aria-hidden className="size-5" />}
          </RoomButton>

          <RoomButton
            label={state === "paused" ? "Retomar estação" : "Pausar estação"}
            onClick={() => setState(state === "paused" ? "listening" : "paused")}
          >
            {state === "paused" ? (
              <Play aria-hidden className="size-5" />
            ) : (
              <Pause aria-hidden className="size-5" />
            )}
          </RoomButton>

          <RoomButton label="Finalizar estação" onClick={() => setState("finished")}>
            <Square aria-hidden className="size-5" />
          </RoomButton>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button variant="ghost" size="sm" onClick={advance}>
            Demonstrar estados de voz
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Prévia visual. A interação por voz será ativada em uma próxima etapa.
          </p>
        </div>
      </footer>
    </div>
  );
}

function RoomButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-14 items-center justify-center rounded-full border border-hairline bg-surface/70 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground",
        active && "border-moss/50 text-foreground",
      )}
    >
      {children}
    </button>
  );
}
