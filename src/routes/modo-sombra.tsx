import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, MicOff, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";

import { VoicePresence } from "@/components/shadow/VoicePresence";
import { PresenceStatus } from "@/components/shadow/PresenceStatus";
import { PresenceControl } from "@/components/shadow/PresenceControl";

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
import { metaCommandLabels, type MetaCommandType } from "@/lib/interpreter/meta-command";
import { recentContext } from "@/lib/shadow/conversation";
import { narrateClinicalEvents, runClinicalTurn } from "@/lib/shadow/shadow.functions";
import { useVoiceCapture } from "@/lib/voice/use-voice-capture";
import { useShadowSpeech } from "@/lib/voice/use-shadow-speech";
import { fetchVoiceAvailability, transcribeUtterance } from "@/lib/voice/voice-transport";
import { voiceMessages, type VoiceAvailability } from "@/lib/voice/voice-types";
import type { TraineeInputSource } from "@/lib/trainee-input";
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
    config,
    setConfig,
    pauseSession,
    resumeSession,
    finishSession,
    setVoiceState,
    submitTraineeInput,
    recordInterpretation,
    roomMessages,
    addRoomMessage,
    runtime,
    setRuntime,
    pendingFacts,
    consumePendingFacts,
  } = useTrainingSession();

  const runTurn = useServerFn(runClinicalTurn);
  const narrate = useServerFn(narrateClinicalEvents);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [availability, setAvailability] = useState<VoiceAvailability | null>(null);
  const openingRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const turnRef = useRef(0);

  const status = session?.status;
  const voiceStateFromSession = session?.voiceState ?? "idle";
  const clinicalTime = session ? session.durationSeconds - session.remainingSeconds : 0;

  const canType = session ? traineeCanType(session.config.traineeInputMode) : false;
  const wantsVoiceInput = session ? traineeCanSpeak(session.config.traineeInputMode) : false;
  const wantsVoiceOutput = config.shadowOutputMode === "voice_text";
  const shadowVoiceOn = wantsVoiceOutput && !audioMuted;


  const speech = useShadowSpeech();

  /* --- disponibilidade: nada de voz é inicializado no modo texto puro --- */
  useEffect(() => {
    if (!wantsVoiceInput && !wantsVoiceOutput) return;
    const controller = new AbortController();
    void fetchVoiceAvailability(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setAvailability(result);
      if (!result.speechToText && wantsVoiceInput) setVoiceNotice(voiceMessages.notConfigured);
    });
    return () => controller.abort();
  }, [wantsVoiceInput, wantsVoiceOutput]);

  /** Fala o texto CANÔNICO já exibido — nunca um segundo texto para o TTS. */
  const speakShadow = useCallback(
    async (turnId: number, text: string) => {
      if (!wantsVoiceOutput || audioMuted || !availability?.textToSpeech) return;
      if (turnRef.current !== turnId) return;
      setVoiceState("speaking");
      const ok = await speech.speak({
        turnId: String(turnId),
        text,
        voicePreference: config.voicePreference,
        speechRate: config.speechRate,
      });
      if (!ok && turnRef.current === turnId) setVoiceNotice(voiceMessages.ttsFailed);
      if (turnRef.current === turnId) setVoiceState("listening");
    },
    [
      wantsVoiceOutput,
      audioMuted,
      availability?.textToSpeech,
      speech,
      config.voicePreference,
      config.speechRate,
      setVoiceState,
    ],
  );

  const applyMetaCommands = useCallback(
    (commands: { type: string; value: string | null }[]) => {
      for (const command of commands) {
        switch (command.type) {
          case "pause_session":
            pauseSession();
            break;
          case "resume_session":
            resumeSession();
            break;
          case "finish_session":
            finishSession();
            break;
          case "change_voice":
            if (command.value === "female" || command.value === "male") {
              setConfig({ voicePreference: command.value });
            }
            break;
          case "change_trainer_profile":
            if (
              command.value === "gentle" ||
              command.value === "assertive" ||
              command.value === "fast_paced" ||
              command.value === "permissive"
            ) {
              setConfig({ trainerProfile: command.value });
            }
            break;
          case "change_shadow_output_mode":
            if (command.value === "text" || command.value === "voice_text") {
              setConfig({ shadowOutputMode: command.value });
            }
            break;
          case "change_input_mode":
            if (
              command.value === "voice" ||
              command.value === "text" ||
              command.value === "hybrid"
            ) {
              setConfig({ traineeInputMode: command.value });
            }
            break;
          default:
            break;
        }
        const label = metaCommandLabels[command.type as MetaCommandType];
        if (label) setNotice(label);
      }
    },
    [pauseSession, resumeSession, finishSession, setConfig],
  );

  /**
   * Pipeline ÚNICO: voz e texto convergem no mesmo TraineeInput.
   * Protegido contra turnos simultâneos e respostas obsoletas.
   */
  const processTurn = useCallback(
    async (source: TraineeInputSource, content: string) => {
      const text = content.trim();
      if (!text || busyRef.current) return;
      const current = session;
      if (!current || current.status !== "active" || !runtime) return;

      const input = submitTraineeInput(source, text);
      if (!input) return;

      const turnId = turnRef.current + 1;
      turnRef.current = turnId;
      speech.stop();

      busyRef.current = true;
      setBusy(true);
      setNotice(null);
      addRoomMessage("trainee", text, clinicalTime);
      setVoiceState("processing");

      try {
        const result = await runTurn({
          data: {
            rawContent: text,
            source,
            config,
            context: recentContext(roomMessages),
            clinicalTime,
            runtime,
          },
        });

        if (turnRef.current !== turnId) return;

        setRuntime(result.runtime);
        // Transparência de interpretação: o que o Sombra entendeu desta entrada.
        recordInterpretation(
          input.id,
          result.actions.map((a) => ({ actionId: a.actionId, sourceExcerpt: text })),
        );
        if (result.metaCommands.length > 0) applyMetaCommands(result.metaCommands);
        if (result.shadowText) {
          addRoomMessage("shadow", result.shadowText, clinicalTime);
          await speakShadow(turnId, result.shadowText);
        }
      } catch {
        if (turnRef.current === turnId) {
          addRoomMessage("shadow", "Não consegui processar agora. Pode repetir?", clinicalTime);
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
        if (turnRef.current === turnId) setVoiceState("listening");
      }
    },
    [
      session,
      runtime,
      submitTraineeInput,
      recordInterpretation,
      speech,
      addRoomMessage,
      clinicalTime,
      setVoiceState,
      runTurn,
      config,
      roomMessages,
      setRuntime,
      applyMetaCommands,
      speakShadow,
    ],
  );

  /* --- voz: apenas enunciados FINALIZADOS entram no pipeline --- */
  const handleUtterance = useCallback(
    async (audio: Blob) => {
      if (busyRef.current) return;
      setVoiceState("processing");
      const result = await transcribeUtterance(audio).catch(() => ({ error: "stt_failed" }));
      if ("error" in result) {
        setVoiceNotice(
          result.error === "voice_not_configured" ? voiceMessages.notConfigured : voiceMessages.sttFailed,
        );
        setVoiceState("listening");
        return;
      }
      if (!result.text.trim()) {
        setVoiceState("listening");
        return;
      }
      setVoiceNotice(null);
      await processTurn("voice", result.text);
    },
    [processTurn, setVoiceState],
  );

  /** Barge-in: a fala do trainee interrompe o áudio do Sombra imediatamente. */
  const handleSpeechStart = useCallback(() => {
    if (speech.speaking) {
      speech.stop();
      setVoiceState("listening");
    }
  }, [speech, setVoiceState]);

  const capture = useVoiceCapture({
    onUtterance: (audio) => void handleUtterance(audio),
    onSpeechStart: handleSpeechStart,
    suspended: busy || status !== "active",
  });

  // Abertura: o Sombra apresenta o cenário e passa a ouvir.
  useEffect(() => {
    if (!session || openingRef.current === session.id) return;
    openingRef.current = session.id;
    addRoomMessage("shadow", mockCase.opening, 0);
    const turnId = turnRef.current + 1;
    turnRef.current = turnId;
    void speakShadow(turnId, mockCase.opening);
    const t = window.setTimeout(() => setVoiceState("listening"), 3200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // Conclusão (manual ou automática) leva à devolutiva. Nenhum áudio permanece.
  useEffect(() => {
    if (status !== "finished") return;
    speech.stop();
    capture.stop();
    void navigate({ to: "/resultado" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Pausa da estação também silencia captura e áudio (pausa ≠ barge-in).
  useEffect(() => {
    if (status === "paused") {
      speech.stop();
      capture.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Fatos gerados pelo tempo (deterioração, resultados) ganham o tom do perfil.
  useEffect(() => {
    if (pendingFacts.length === 0 || status !== "active" || busyRef.current) return;
    const facts = consumePendingFacts();
    if (facts.length === 0) return;
    const turnId = turnRef.current + 1;
    turnRef.current = turnId;
    void narrate({
      data: { facts, trainerProfile: config.trainerProfile, context: recentContext(roomMessages) },
    })
      .then((result) => {
        if (turnRef.current !== turnId) return;
        addRoomMessage("shadow", result.shadowText, clinicalTime);
        return speakShadow(turnId, result.shadowText);
      })
      .catch(() => {
        if (turnRef.current !== turnId) return;
        const fallback = facts.join(" ");
        addRoomMessage("shadow", fallback, clinicalTime);
        return speakShadow(turnId, fallback);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFacts, status]);

  const sendDraft = () => {
    const content = draft;
    if (!content.trim()) return;
    setDraft("");
    void processTurn("text", content);
  };

  const handleFinish = () => {
    setConfirmOpen(false);
    speech.stop();
    capture.stop();
    finishSession();
  };

  const toggleMic = () => {
    setVoiceNotice(null);
    if (capture.active || capture.status === "starting") {
      capture.stop();
      return;
    }
    void capture.start();
  };

  /** Liga/desliga a voz do Sombra de forma explícita (inclusive vindo do modo texto). */
  const toggleAudio = () => {
    if (shadowVoiceOn) {
      speech.stop();
      setAudioMuted(true);
      return;
    }
    setAudioMuted(false);
    if (config.shadowOutputMode !== "voice_text") setConfig({ shadowOutputMode: "voice_text" });
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
  const lastShadow = [...roomMessages].reverse().find((m) => m.role === "shadow");
  const lastTrainee = [...roomMessages].reverse().find((m) => m.role === "trainee");

  const micFailed =
    capture.status === "denied" || capture.status === "error" || capture.status === "unsupported";
  const voiceInputBroken = micFailed || availability?.speechToText === false;
  // Voz falhando nunca destrói a estação: o texto sempre volta a estar disponível.
  const showComposer = canType || voiceInputBroken;

  const voiceState = speech.speaking
    ? "speaking"
    : busy
      ? "processing"
      : paused
        ? "paused"
        : capture.active
          ? "listening"
          : voiceStateFromSession;

  // Amplitude REAL, lida por quadro dentro da presença (sem render por amostra).
  const getAmplitude = () =>
    speech.speaking ? speech.getAmplitude() : capture.active ? capture.getAmplitude() : 0;

  const errorNotice = voiceNotice ?? (micFailed ? capture.message : null);

  return (
    <div className="room-backdrop flex min-h-dvh flex-col">
      <header className="flex items-center justify-center px-5 pt-5">
        <p className="eyebrow opacity-60">Modo Sombra</p>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-1 px-5 text-center">
        {lastTrainee && (
          <p className="line-clamp-1 max-w-md text-xs text-muted-foreground/40">
            {lastTrainee.text}
          </p>
        )}

        <p
          aria-live="polite"
          className="max-w-lg font-display text-lg leading-relaxed text-foreground sm:text-xl"
        >
          {paused ? "Estação pausada" : (lastShadow?.text ?? "")}
        </p>

        <PresenceControl
          onTap={() => speech.stop()}
          onDoubleTap={wantsVoiceInput && !voiceInputBroken ? toggleMic : undefined}
          onHoldStart={
            wantsVoiceInput && !voiceInputBroken ? () => void capture.holdStart() : undefined
          }
          onHoldEnd={
            wantsVoiceInput && !voiceInputBroken
              ? (canceled) => capture.holdEnd(canceled)
              : undefined
          }
          onSilentHold={() => (paused ? resumeSession() : pauseSession())}
          getAmplitude={getAmplitude}
          disabled={status === "finished"}
          hint={
            paused
              ? "Segure para retomar"
              : capture.active
                ? "Toque duplo desliga o microfone"
                : "Toque duplo liga o microfone · segure para falar"
          }
        >
          <VoicePresence
            state={voiceState}
            getAmplitude={getAmplitude}
            pace={profilePace[config.trainerProfile] ?? 1}
            className="-my-4"
          />
        </PresenceControl>

        <PresenceStatus state={voiceState} className="mt-1" />






        <p
          className="font-display text-xl tabular-nums text-muted-foreground/70"
          aria-label={`Tempo restante: ${formatClock(session.remainingSeconds)}`}
        >
          {formatClock(session.remainingSeconds)}
        </p>
      </main>

      <footer className="safe-bottom px-5 pt-2 sm:px-8">
        {showComposer && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendDraft();
            }}
            className="mx-auto mb-3 flex max-w-md items-end gap-2 border-b border-hairline pb-1 focus-within:border-moss/50"
          >
            <label className="sr-only" htmlFor="conduta">
              Sua conduta
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
              disabled={status !== "active" || busy}
              placeholder="Sua conduta…"
              className="max-h-24 flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Enviar conduta"
              disabled={status !== "active" || busy || !draft.trim()}
              className={cn(
                "mb-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-all duration-200 active:scale-95",
                draft.trim() && "text-foreground hover:bg-surface-raised/60",
              )}
            >
              <ArrowUp aria-hidden className="size-5" />
            </button>
          </form>
        )}

        <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2">
          {wantsVoiceInput && !voiceInputBroken && (
            <RoomButton
              label={capture.active ? "Microfone ligado — toque para pausar a escuta" : "Ligar microfone"}
              text={capture.active ? "Ouvindo" : "Ligar microfone"}
              onClick={toggleMic}
              active={capture.active}
              pressed={capture.active}
            >
              {capture.active ? (
                <Mic aria-hidden className="size-5" />
              ) : (
                <MicOff aria-hidden className="size-5" />
              )}
            </RoomButton>
          )}

          {availability?.textToSpeech && (
            <RoomButton
              label={shadowVoiceOn ? "Desligar a voz do Sombra" : "Ativar a voz do Sombra"}
              text={shadowVoiceOn ? "Voz ligada" : "Ativar voz"}
              onClick={toggleAudio}
              active={shadowVoiceOn}
              pressed={shadowVoiceOn}
            >
              {shadowVoiceOn ? (
                <Volume2 aria-hidden className="size-5" />
              ) : (
                <VolumeX aria-hidden className="size-5" />
              )}
            </RoomButton>
          )}


          <RoomButton label={paused ? "Retomar" : "Pausar"} onClick={() => (paused ? resumeSession() : pauseSession())}>
            {paused ? (
              <Play aria-hidden className="size-5" />
            ) : (
              <Pause aria-hidden className="size-5" />
            )}
          </RoomButton>

          <RoomButton label="Encerrar" onClick={() => setConfirmOpen(true)}>
            <Square aria-hidden className="size-5" />
          </RoomButton>
        </div>

        {/* Erros são contextuais e discretos: nunca tomam a tela. */}
        {(errorNotice ?? notice) && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground/70" aria-live="polite">
            {errorNotice ?? notice}
          </p>
        )}
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
  text,
  onClick,
  active,
  pressed,
  children,
}: {
  label: string;
  /** Rótulo visível — usado nos controles essenciais (microfone e voz). */
  text?: string;
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
        "flex h-12 items-center justify-center gap-2 rounded-full text-muted-foreground/70 transition-all duration-200",
        text ? "border border-hairline px-4" : "w-12",
        "hover:scale-[1.03] hover:bg-surface-raised/50 hover:text-foreground active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        active && "border-foreground/25 bg-surface-raised/60 text-foreground",
      )}
    >
      {children}
      {text && <span className="text-xs font-medium">{text}</span>}

    </button>
  );
}

/** Ritmo visual por perfil — sutil, nunca um tema diferente por perfil. */
const profilePace: Record<string, number> = {
  gentle: 0.85,
  assertive: 1.12,
  fast_paced: 1.25,
  permissive: 0.92,
};
