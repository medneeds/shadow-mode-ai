import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, MicOff, Pause, Play, Square } from "lucide-react";

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
import { traineeCanSpeak, traineeCanType } from "@/lib/shadow-trainer";
import { pageTitle } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/modo-sombra")({
  head: () => ({
    meta: [
      { title: pageTitle("Estação clínica") },
      {
        name: "description",
        content: "Ambiente imersivo de simulação clínica do Modo Sombra | By Medneeds.",
      },
      { property: "og:title", content: pageTitle("Estação clínica") },
      {
        property: "og:description",
        content: "Conduza o caso por voz ou por texto dentro do Modo Sombra.",
      },
    ],
  }),
  component: ShadowRoom,
});

function ShadowRoom() {
  const navigate = useNavigate();
  const {
    session,
    pauseSession,
    resumeSession,
    finishSession,
    setVoiceState,
    submitTraineeInput,
  } = useTrainingSession();
  const [muted, setMuted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [lastSent, setLastSent] = useState<string | null>(null);
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

  const simulateInteraction = ({ force = false }: { force?: boolean } = {}) => {
    if (status !== "active") return;
    if (!force && muted) return;
    setVoiceState("processing");
    cycleTimers.current.push(
      window.setTimeout(() => setVoiceState("speaking"), 1400),
      window.setTimeout(() => setVoiceState("listening"), 5200),
    );
  };

  const canType = session ? traineeCanType(session.config.traineeInputMode) : false;
  const canSpeak = session ? traineeCanSpeak(session.config.traineeInputMode) : false;

  // Voz e texto convergem para o mesmo TraineeInput e para o mesmo pipeline.
  const sendDraft = () => {
    const content = draft.trim();
    if (!content || status !== "active") return;
    const input = submitTraineeInput("text", content);
    if (!input) return;
    setDraft("");
    setLastSent(content);
    simulateInteraction({ force: true });
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

      <footer className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
        {canType && (
          <div className="mx-auto mb-5 max-w-md">
            {lastSent && (
              <p className="mb-2 truncate text-center text-[11px] text-muted-foreground/70">
                Registrado: {lastSent}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendDraft();
              }}
              className="flex items-end gap-2 rounded-2xl border border-hairline bg-surface/70 px-3 py-2 focus-within:border-moss/50"
            >
              <label className="sr-only" htmlFor="conduta">
                Digite sua conduta
              </label>
              <textarea
                id="conduta"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendDraft();
                  }
                }}
                rows={1}
                disabled={status !== "active"}
                placeholder="Digite sua conduta…"
                className="max-h-24 flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                aria-label="Enviar conduta"
                disabled={status !== "active" || !draft.trim()}
                className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-moss/50 text-foreground transition-colors hover:bg-surface-raised disabled:opacity-40"
              >
                <ArrowUp aria-hidden className="size-4" />
              </button>
            </form>
          </div>
        )}

        <div className="mx-auto flex max-w-md items-center justify-center gap-3">
          {canSpeak && (
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
          )}

          <RoomButton
            label={paused ? "Retomar estação" : "Pausar estação"}
            onClick={() => (paused ? resumeSession() : pauseSession())}
          >
            {paused ? (
              <Play aria-hidden className="size-5" />
            ) : (
              <Pause aria-hidden className="size-5" />
            )}
          </RoomButton>

          <RoomButton label="Encerrar estação" onClick={() => setConfirmOpen(true)}>
            <Square aria-hidden className="size-5" />
          </RoomButton>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground" aria-live="polite">
          {canSpeak
            ? muted
              ? "Microfone desativado"
              : "Microfone ativo"
            : "Responda pelo campo de texto"}
        </p>

        <div className="mt-3 flex flex-col items-center gap-2">
          {paused ? (
            <Button variant="ghost" size="sm" onClick={resumeSession}>
              Retomar estação
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => simulateInteraction()}
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
