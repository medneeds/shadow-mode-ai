import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, MicOff, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";

import { VoicePresence } from "@/components/shadow/VoicePresence";
import { PresenceStatus } from "@/components/shadow/PresenceStatus";
import { PresenceControl } from "@/components/shadow/PresenceControl";
import { ComposerMic } from "@/components/shadow/ComposerMic";
import { AmbientTranscript } from "@/components/shadow/AmbientTranscript";
import { GuidanceActions } from "@/components/shadow/GuidanceActions";

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
import { assertSessionIntegrity, formatClock, type TrainingConfig } from "@/lib/training-session";
import { traineeCanSpeak, traineeCanType } from "@/lib/shadow-trainer";
import { metaCommandLabels, type MetaCommandType } from "@/lib/interpreter/meta-command";
import { recentContext } from "@/lib/shadow/conversation";
import { narrateClinicalEvents, runClinicalTurn } from "@/lib/shadow/shadow.functions";
import { toSpeechText } from "@/lib/shadow/speech-text";
import { markTurn, reportTurn } from "@/lib/shadow/turn-latency";
import { useVoiceCapture } from "@/lib/voice/use-voice-capture";
import { useShadowSpeech } from "@/lib/voice/use-shadow-speech";
import { fetchVoiceAvailability, transcribeUtterance } from "@/lib/voice/voice-transport";
import { voiceMessages, type VoiceAvailability } from "@/lib/voice/voice-types";
import type { AssistanceProvenance, TraineeInputSource } from "@/lib/trainee-input";
import { autonomyForLevel, resolveActiveGuidance } from "@/lib/clinical/guidance";
import type { ActiveGuidance, GuidanceOption } from "@/lib/clinical/guidance-types";
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
    caseDefinition,
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
  const [failedTurn, setFailedTurn] = useState<{
    source: TraineeInputSource;
    content: string;
    inputId: string;
    provenance?: AssistanceProvenance;
  } | null>(null);
  const openingRef = useRef<string | null>(null);
  const openingSpeechRef = useRef<string | null>(null);
  const guidanceRef = useRef<ActiveGuidance | null>(null);
  const busyRef = useRef(false);
  const turnRef = useRef(0);
  const transcriptionRef = useRef<AbortController | null>(null);

  const status = session?.status;
  const voiceStateFromSession = session?.voiceState ?? "idle";
  const clinicalTime = session ? session.durationSeconds - session.remainingSeconds : 0;
  const qaEnabled =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("qa");

  const sessionConfig = session?.config;
  /** Clínica usa exclusivamente `session.config`; preferências abaixo permanecem ao vivo. */
  const experienceConfig: TrainingConfig | null = sessionConfig
    ? {
        ...sessionConfig,
        shadowOutputMode: config.shadowOutputMode,
        traineeInputMode: config.traineeInputMode,
        voicePreference: config.voicePreference,
        speechRate: config.speechRate,
        trainerProfile: config.trainerProfile,
      }
    : null;
  const canType = experienceConfig ? traineeCanType(experienceConfig.traineeInputMode) : false;
  const wantsVoiceInput = experienceConfig
    ? traineeCanSpeak(experienceConfig.traineeInputMode)
    : false;
  const wantsVoiceOutput = experienceConfig?.shadowOutputMode === "voice_text";
  const shadowVoiceOn = wantsVoiceOutput && !audioMuted;

  /**
   * Contexto de assistência de QUALQUER entrada: registra o andaime visível
   * mesmo quando o trainee ignora as opções e conduz livremente.
   */
  const currentProvenance = useCallback((): AssistanceProvenance => {
    const active = guidanceRef.current;
    return {
      autonomyMode: autonomyForLevel(
        caseDefinition?.level ?? sessionConfig?.levelId ?? "intermediario",
      ),
      ...(active ? { guidancePointId: active.pointId } : {}),
      visibleOptionCount: active?.visibleOptionCount ?? 0,
      usedGuidedOption: false,
    };
  }, [caseDefinition?.level, sessionConfig?.levelId]);

  const speech = useShadowSpeech();

  /* --- disponibilidade da voz: consultada sempre, para que ATIVAR VOZ exista
     mesmo quando a estação começou em modo texto. --- */
  useEffect(() => {
    const controller = new AbortController();
    void fetchVoiceAvailability(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setAvailability(result);
      if (!result.speechToText && wantsVoiceInput) setVoiceNotice(voiceMessages.notConfigured);
    });
    return () => controller.abort();
  }, [wantsVoiceInput]);

  /**
   * Fala o texto CANÔNICO já exibido. speechText é a MESMA resposta, apenas
   * reescrita para soar natural na voz (unidades, siglas) — nunca outro conteúdo.
   */
  const speakShadow = useCallback(
    async (turnId: number, text: string, speechText?: string | null) => {
      if (!wantsVoiceOutput || audioMuted || !availability?.textToSpeech) return;
      if (turnRef.current !== turnId) return;
      setVoiceState("speaking");
      const ok = await speech.speak({
        turnId: String(turnId),
        text: speechText || toSpeechText(text),
        voicePreference: experienceConfig?.voicePreference ?? "female",
        speechRate: experienceConfig?.speechRate ?? "normal",
      });
      if (!ok && turnRef.current === turnId) setVoiceNotice(voiceMessages.ttsFailed);
      if (turnRef.current === turnId) setVoiceState("listening");
    },
    [
      wantsVoiceOutput,
      audioMuted,
      availability?.textToSpeech,
      speech,
      experienceConfig?.voicePreference,
      experienceConfig?.speechRate,
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
    async (
      source: TraineeInputSource,
      content: string,
      assist?: {
        forcedActionIds?: string[];
        provenance?: AssistanceProvenance;
        existingInputId?: string;
      },
    ) => {
      const text = content.trim();
      if (!text || busyRef.current) return;
      const current = session;
      if (
        !current ||
        current.status !== "active" ||
        !runtime ||
        !caseDefinition ||
        caseDefinition.id !== current.caseId ||
        runtime.caseId !== current.caseId
      )
        return;
      if (import.meta.env.DEV) assertSessionIntegrity(current, caseDefinition, runtime);

      const input = assist?.existingInputId
        ? (current.traineeInputs.find((candidate) => candidate.id === assist.existingInputId) ??
          null)
        : submitTraineeInput(source, text, assist?.provenance);
      if (!input) return;

      const turnId = turnRef.current + 1;
      turnRef.current = turnId;
      speech.stop();

      busyRef.current = true;
      setBusy(true);
      setNotice(null);
      setFailedTurn(null);
      if (!assist?.existingInputId) addRoomMessage("trainee", text, clinicalTime);
      setVoiceState("processing");
      markTurn(String(turnId), "transcriptReady");

      try {
        const result = await runTurn({
          data: {
            rawContent: text,
            source,
            config: {
              ...current.config,
              trainerProfile: experienceConfig?.trainerProfile ?? current.config.trainerProfile,
            },
            context: recentContext(roomMessages),
            clinicalTime,
            runtime,
            ...(assist?.forcedActionIds?.length ? { forcedActionIds: assist.forcedActionIds } : {}),
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
          markTurn(String(turnId), "shadowResponseReady");
          addRoomMessage("shadow", result.shadowText, clinicalTime);
          await speakShadow(turnId, result.shadowText, result.speechText);
        }
      } catch {
        if (turnRef.current === turnId) {
          setFailedTurn({
            source,
            content: text,
            inputId: input.id,
            ...(assist?.provenance ? { provenance: assist.provenance } : {}),
          });
          setNotice("Não consegui processar agora.");
        }
      } finally {
        if (turnRef.current === turnId) {
          busyRef.current = false;
          setBusy(false);
        }
        reportTurn(String(turnId));
        if (turnRef.current === turnId) setVoiceState("listening");
      }
    },
    [
      session,
      runtime,
      caseDefinition,
      submitTraineeInput,
      recordInterpretation,
      speech,
      addRoomMessage,
      clinicalTime,
      setVoiceState,
      runTurn,
      experienceConfig?.trainerProfile,
      roomMessages,
      setRuntime,
      applyMetaCommands,
      speakShadow,
    ],
  );

  /* --- andaime autoral: 3 (básico), até 5 (intermediário), 0 (avançado) --- */
  const autonomyMode = autonomyForLevel(
    caseDefinition?.level ?? sessionConfig?.levelId ?? "intermediario",
  );
  const guidance = caseDefinition
    ? resolveActiveGuidance(caseDefinition, runtime, autonomyMode)
    : null;
  guidanceRef.current = guidance;

  /**
   * Toque numa opção é clinicamente IDÊNTICO a falar ou digitar a mesma conduta:
   * a ação segue para o mesmo motor determinístico e para a mesma pontuação.
   */
  const selectGuidanceOption = useCallback(
    (option: GuidanceOption) => {
      if (!guidance) return;
      void processTurn("guided_option", option.label, {
        forcedActionIds: [option.actionId],
        provenance: {
          autonomyMode: guidance.autonomyMode,
          guidancePointId: guidance.pointId,
          visibleOptionCount: guidance.visibleOptionCount,
          usedGuidedOption: true,
        },
      });
    },
    [guidance, processTurn],
  );

  /* --- voz: apenas enunciados FINALIZADOS entram no pipeline --- */
  const handleUtterance = useCallback(
    async (audio: Blob) => {
      if (busyRef.current) return;
      setVoiceState("processing");
      transcriptionRef.current?.abort();
      const controller = new AbortController();
      transcriptionRef.current = controller;
      markTurn(`stt-${turnRef.current + 1}`, "speechEnd");
      const result = await transcribeUtterance(audio, controller.signal).catch(() => ({
        error: "stt_failed",
      }));
      if (
        controller.signal.aborted ||
        transcriptionRef.current !== controller ||
        status !== "active"
      )
        return;
      if ("error" in result) {
        setVoiceNotice(
          result.error === "voice_not_configured"
            ? voiceMessages.notConfigured
            : voiceMessages.sttFailed,
        );
        setVoiceState("listening");
        return;
      }
      if (!result.text.trim()) {
        setVoiceNotice("Não consegui entender sua fala. Você pode tentar novamente ou digitar.");
        setVoiceState("listening");
        return;
      }
      setVoiceNotice(null);
      await processTurn("voice", result.text, { provenance: currentProvenance() });
    },
    [processTurn, setVoiceState, currentProvenance, status],
  );

  /** Barge-in: a fala do trainee interrompe o áudio do Sombra imediatamente. */
  const handleSpeechStart = useCallback(() => {
    if (!speech.active) return;
    turnRef.current += 1;
    speech.stop();
    setVoiceState("listening");
  }, [speech, setVoiceState]);

  const capture = useVoiceCapture({
    onUtterance: (audio) => void handleUtterance(audio),
    onSpeechStart: handleSpeechStart,
    suspended: busy || status !== "active",
  });

  // A abertura é adicionada uma vez e só é falada quando a voz estiver disponível.
  useEffect(() => {
    if (!session || !caseDefinition || session.caseId !== caseDefinition.id) return;
    if (openingRef.current !== session.id) {
      openingRef.current = session.id;
      addRoomMessage("shadow", caseDefinition.opening, 0);
    }
    if (
      openingSpeechRef.current !== session.id &&
      wantsVoiceOutput &&
      !audioMuted &&
      availability?.textToSpeech
    ) {
      openingSpeechRef.current = session.id;
      const turnId = turnRef.current + 1;
      turnRef.current = turnId;
      void speakShadow(turnId, caseDefinition.opening).finally(() => {
        if (turnRef.current === turnId) setVoiceState("listening");
      });
    } else if (!wantsVoiceOutput || audioMuted || availability?.textToSpeech === false) {
      setVoiceState("listening");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session?.id,
    session?.caseId,
    caseDefinition,
    availability?.textToSpeech,
    wantsVoiceOutput,
    audioMuted,
  ]);

  // Conclusão (manual ou automática) leva à devolutiva. Nenhum áudio permanece.
  useEffect(() => {
    if (status !== "finished") return;
    transcriptionRef.current?.abort();
    speech.stop();
    capture.stop();
    void navigate({ to: "/resultado" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Pausa da estação também silencia captura e áudio (pausa ≠ barge-in).
  useEffect(() => {
    if (status === "paused") {
      transcriptionRef.current?.abort();
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
      data: {
        facts,
        trainerProfile: experienceConfig?.trainerProfile ?? "assertive",
        context: recentContext(roomMessages),
      },
    })
      .then((result) => {
        if (turnRef.current !== turnId) return;
        addRoomMessage("shadow", result.shadowText, clinicalTime);
        return speakShadow(turnId, result.shadowText, result.speechText);
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
    void processTurn("text", content, { provenance: currentProvenance() });
  };

  const handleFinish = () => {
    setConfirmOpen(false);
    turnRef.current += 1;
    transcriptionRef.current?.abort();
    speech.stop();
    capture.stop();
    finishSession();
  };

  const toggleMic = () => {
    if (status !== "active") return;
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
    setVoiceNotice(availability?.textToSpeech === false ? voiceMessages.notConfigured : null);
  };

  if (
    !session ||
    !caseDefinition ||
    !runtime ||
    caseDefinition.id !== session.caseId ||
    runtime.caseId !== session.caseId
  ) {
    return (
      <AppShell>
        <PageSection>
          <SectionHeading
            eyebrow="Modo Sombra"
            title="Estação indisponível"
            description="Configure uma nova estação antes de entrar no Modo Sombra."
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
    <div className="room-backdrop relative flex min-h-dvh flex-col">
      {/* Chat discreto que se forma atrás da estação — memória, não interface. */}
      <AmbientTranscript messages={roomMessages} />

      <header className="relative z-10 flex items-center justify-center px-5 pt-5">
        <p className="eyebrow opacity-60">Modo Sombra</p>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-1 px-5 text-center">
        <p
          aria-live="polite"
          className="max-w-lg font-display text-lg leading-relaxed text-foreground sm:text-xl lg:max-w-2xl lg:text-2xl"
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
            className="-my-4 lg:scale-110 xl:scale-125"
          />
        </PresenceControl>

        <PresenceStatus state={voiceState} className="-mt-1" />

        <p
          className="mt-2 font-display text-xl tabular-nums text-muted-foreground/70"
          aria-label={`Tempo restante: ${formatClock(session.remainingSeconds)}`}
        >
          {formatClock(session.remainingSeconds)}
        </p>

        {/* Andaime contextual: aparece, resolve o momento e desaparece. */}
        {guidance && !paused && (
          <GuidanceActions
            className="mt-5"
            options={guidance.options}
            onSelect={selectGuidanceOption}
            disabled={status !== "active" || busy}
          />
        )}
      </main>

      <footer className="safe-bottom relative z-10 px-5 pt-2 sm:px-8">
        {showComposer && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendDraft();
            }}
            className="mx-auto mb-3 flex max-w-md items-end gap-2 border-b border-hairline pb-1 focus-within:border-moss/50 lg:max-w-xl"
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
            {wantsVoiceInput && !voiceInputBroken && (
              <ComposerMic
                active={capture.active}
                starting={capture.status === "starting"}
                onToggle={toggleMic}
                disabled={status !== "active"}
              />
            )}
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

        <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2 lg:max-w-2xl">
          {wantsVoiceInput && !voiceInputBroken && (
            <RoomButton
              label={
                capture.active ? "Microfone ligado — toque para pausar a escuta" : "Ligar microfone"
              }
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

          {/* A voz do Sombra é sempre oferecível — mesmo em estação de texto. */}
          {availability?.textToSpeech !== false && (
            <RoomButton
              label={shadowVoiceOn ? "Desligar a voz do Sombra" : "Ativar a voz do Sombra"}
              text={shadowVoiceOn ? "Voz ligada" : "Ativar voz do Sombra"}
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

          <RoomButton
            label={paused ? "Retomar" : "Pausar"}
            onClick={() => (paused ? resumeSession() : pauseSession())}
          >
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
        {failedTurn && status === "active" && !busy && (
          <button
            type="button"
            className="mx-auto mt-2 block text-xs text-foreground underline underline-offset-4"
            onClick={() =>
              void processTurn(failedTurn.source, failedTurn.content, {
                existingInputId: failedTurn.inputId,
                ...(failedTurn.provenance ? { provenance: failedTurn.provenance } : {}),
              })
            }
          >
            Tentar novamente
          </button>
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
      {qaEnabled && (
        <aside className="fixed bottom-2 left-2 z-50 max-w-[calc(100vw-1rem)] rounded bg-black/80 p-2 font-mono text-[10px] text-white">
          caso {caseDefinition.id} · {caseDefinition.scoring.caseVersion} · nível{" "}
          {session.config.levelId}
          <br />
          duração {session.durationSeconds}s · restante {session.remainingSeconds}s · clínico{" "}
          {runtime.elapsedClinicalSeconds}s
          <br />
          guia {guidance?.pointId ?? "—"} ({guidance?.visibleOptionCount ?? 0}) · voz {voiceState}
          <br />
          STT {String(availability?.speechToText)} · TTS {String(availability?.textToSpeech)} ·
          ocupado {String(busy)} · turno {turnRef.current}
        </aside>
      )}
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
