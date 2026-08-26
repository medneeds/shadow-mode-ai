import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Pause, Play, Square } from "lucide-react";

import { VoicePresence, voiceStateLabels } from "@/components/shadow/VoicePresence";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { PageSection, SectionHeading } from "@/components/ui/section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTrainingSession } from "@/lib/session-store";
import { formatClock, mockCase } from "@/lib/training-session";
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

function ShadowRoom() {
  const navigate = useNavigate();
  const { session, pauseSession, resumeSession, finishSession, setVoiceState } =
    useTrainingSession();
  const [muted, setMuted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cycleTimers = useRef<number[]>([]);

  const status = session?.status;
  const voiceState = session?.voiceState ?? "idle";

  // Sombra abre a estação falando, depois passa a ouvir.
  useEffect(() => {
    if (!session || session.status !== "active" || session.voiceState !== "speaking") return;
    const t = window.setTimeout(() => setVoiceState("listening"), 3800);
    return () => window.clearTimeout(t);
  }, [session?.id, session?.status, session?.voiceState, setVoiceState]);

  // Conclusão (manual ou automática) leva à devolutiva.
  useEffect(() => {
    if (status === "finished") {
      void navigate({ to: "/resultado" });
    }
  }, [status, navigate]);

  useEffect(
    () => () => {
      cycleTimers.current.forEach((t) => window.clearTimeout(t));
      cycleTimers.current = [];
    },
    [],
  );

  const simulateInteraction = () => {
    if (status !== "active" || muted) return;
    setVoiceState("processing");
    cycleTimers.current.push(
      window.setTimeout(() => setVoiceState("speaking"), 1400),
      window.setTimeout(() => setVoiceState("listening"), 5200),
    );
  };

  const handleFinish = () => {
    setConfirmOpen(false);
    finishSession();
  };

  if (!session) {
    return (
      <AppShell>
        <PageSection>
          <SectionHeading
            eyebrow="Modo Sombra"
            title="Nenhuma estação configurada"
            description="Configure seu treino antes de entrar no Modo Sombra."
          />
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/treinar">Configurar estação</Link>
            </Button>
          </div>
        </PageSection>
      </AppShell>
    );
  }

  const paused = status === "paused";

  return (
    <div className="room-backdrop flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <p className="eyebrow">Modo Sombra</p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Encerrar estação
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-6 text-center">
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">{mockCase.opening}</p>

        <div className="mt-6 sm:mt-8">
          <VoicePresence state={voiceState} />
        </div>

        <p aria-live="polite" className="mt-5 font-display text-lg">
          {paused ? "Estação pausada" : voiceStateLabels[voiceState]}
        </p>

        <div className="mt-6 h-px w-40 bg-hairline" aria-hidden />

        <p
          className="mt-5 font-display text-2xl tabular-nums text-muted-foreground"
          aria-live="off"
          aria-label={`Tempo restante: ${formatClock(session.remainingSeconds)}`}
        >
          {formatClock(session.remainingSeconds)} <span className="text-sm">restantes</span>
        </p>
      </main>

      <footer className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="mx-auto flex max-w-md items-center justify-center gap-3">
          <RoomButton
            label={muted ? "Microfone desativado, ativar microfone" : "Microfone ativo, desativar"}
            onClick={() => setMuted((m) => !m)}
            active={!muted}
            pressed={muted}
          >
            {muted ? (
              <MicOff aria-hidden className="size-5" />
            ) : (
              <Mic aria-hidden className="size-5" />
            )}
          </RoomButton>

          <RoomButton
            label={paused ? "Retomar estação" : "Pausar estação"}
            onClick={() => (paused ? resumeSession() : pauseSession())}
          >
            {paused ? <Play aria-hidden className="size-5" /> : <Pause aria-hidden className="size-5" />}
          </RoomButton>

          <RoomButton label="Encerrar estação" onClick={() => setConfirmOpen(true)}>
            <Square aria-hidden className="size-5" />
          </RoomButton>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground" aria-live="polite">
          {muted ? "Microfone desativado" : "Microfone ativo"}
        </p>

        <div className="mt-3 flex flex-col items-center gap-2">
          {paused ? (
            <Button variant="ghost" size="sm" onClick={resumeSession}>
              Retomar estação
            </Button>
          ) : (
            <button
              type="button"
              onClick={simulateInteraction}
              disabled={status !== "active" || muted}
              className="rounded-md px-2 py-1 text-[11px] text-muted-foreground/70 underline-offset-4 transition-colors hover:text-muted-foreground hover:underline disabled:opacity-40"
            >
              Simular resposta da Sombra (prévia)
            </button>
          )}
        </div>
      </footer>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar estação?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua simulação será finalizada e você seguirá para a devolutiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar estação</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinish}>Encerrar e ver resultado</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoomButton({
  label,
  onClick,
  active,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        "flex size-14 items-center justify-center rounded-full border border-hairline bg-surface/70 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        active && "border-moss/50 text-foreground",
      )}
    >
      {children}
    </button>
  );
}
