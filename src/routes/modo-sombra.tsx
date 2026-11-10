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
import { formatClock } from "@/lib/training-session";
import { traineeCanSpeak, traineeCanType } from "@/lib/shadow-trainer";
import { metaCommandLabels, type MetaCommandType } from "@/lib/interpreter/meta-command";
import { recentContext } from "@/lib/shadow/conversation";
import { runClinicalTurn } from "@/lib/shadow/shadow.functions";
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
import { presentClinicalFacts, speakerLabels, type SimulationSpeaker } from "@/lib/shadow/clinical-presentation";
import { waitForTurn } from "@/lib/shadow/turn-timeout";

export const Route = createFileRoute("/modo-sombra")({
  head: () => ({
    meta: [
      { title: pageTitle("Estação clínica") },
      {
        name: "description",
        content: "Ambiente imersivo de simulação clínica do Modo Sombra | By Medneeds.",
      },
      { property: "og:title", content: pageTitle("Estação clínica") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const transcribingRef = useRef(false);
  const sttAbortRef = useRef<AbortController | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [availability, setAvailability] = useState<VoiceAvailability | null>(null);
  const openingRef = useRef<string | null>(null);
  const guidanceRef = useRef<ActiveGuidance | null>(null);
  const busyRef = useRef(false);
  const turnRef = useRef(0);
  const statusRef = useRef(session?.status);
  statusRef.current = session?.status;

  const status = session?.status;
  const voiceStateFromSession = session?.voiceState ?? "idle";
  const clinicalTime = session ? session.durationSeconds - session.remainingSeconds : 0;

  const canType = session ? traineeCanType(session.config.traineeInputMode) : false;
  const wantsVoiceInput = session ? traineeCanSpeak(session.config.traineeInputMode) : false;
  const wantsVoiceOutput = config.shadowOutputMode === "voice_text";
  const shadowVoiceOn = wantsVoiceOutput && !audioMuted;


  /**
   * Contexto de assistência de QUALQUER entrada: registra o andaime visível
   * mesmo quando o trainee ignora as opções e conduz livremente.
   */
  const currentProvenance = useCallback((): AssistanceProvenance => {
    const active = guidanceRef.current;
    return {
      autonomyMode: autonomyForLevel(caseDefinition.level),
      ...(active ? { guidancePointId: active.pointId } : {}),
      visibleOptionCount: active?.visibleOptionCount ?? 0,
      usedGuidedOption: false,
    };
  }, [caseDefinition.level]);

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
    async (turnId: number, text: string, speechText?: string | null, speaker: SimulationSpeaker = "team", voice?: "male" | "female") => {
      if (!wantsVoiceOutput || audioMuted || !availability?.textToSpeech) return;
      if (turnRef.current !== turnId) return;
      setVoiceState("processing");
      const ok = await speech.speak({
        turnId: String(turnId),
        text: speechText || toSpeechText(text),
        voicePreference: speaker === "shadow" ? config.voicePreference : voice ?? (speaker === "patient" ? caseDefinition.patient.biologicalSex : "male"),
        speechRate: config.speechRate,
      });
      if (!ok && speech.failed && turnRef.current === turnId) setVoiceNotice(voiceMessages.ttsFailed);
      if (turnRef.current === turnId) setVoiceState("listening");
    },
    [
      wantsVoiceOutput,
      audioMuted,
      availability?.textToSpeech,
      speech,
      config.voicePreference,
      config.speechRate,
      caseDefinition.patient.biologicalSex,
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
      assist?: { forcedActionIds?: string[]; provenance?: AssistanceProvenance },
    ) => {
      const text = content.trim();
      if (!text || busyRef.current) return;
      const current = session;
      if (!current || current.status !== "active" || !runtime) return;

      const input = submitTraineeInput(source, text, assist?.provenance);
      if (!input) return;

      const turnId = turnRef.current + 1;
      turnRef.current = turnId;
      speech.stop();

      busyRef.current = true;
      setBusy(true);
      setNotice(null);
      addRoomMessage("trainee", text, clinicalTime);
      setVoiceState("processing");
      markTurn(String(turnId), "transcriptReady");

      try {
        const result = await waitForTurn(runTurn({
          data: {
            rawContent: text,
            source,
            config,
            context: recentContext(roomMessages),
            clinicalTime,
            runtime,
            ...(assist?.forcedActionIds?.length
              ? { forcedActionIds: assist.forcedActionIds }
              : {}),
          },
        }));

        if (turnRef.current !== turnId || statusRef.current !== "active") return;

        const applied = setRuntime(result.runtime);
        if (!applied) return;
        // Transparência de interpretação: o que o Sombra entendeu desta entrada.
        recordInterpretation(
          input.id,
          result.actions.map((a) => ({ actionId: a.actionId, sourceExcerpt: text })),
        );
        if (result.metaCommands.length > 0) applyMetaCommands(result.metaCommands);
        // Clinical speech is exclusively authored/engine-emitted, never LLM-expanded.
        const utterances = applied.facts.length
          ? presentClinicalFacts(caseDefinition, applied.runtime, applied.facts, applied.runtime.events)
          : result.actions.length === 0 && result.shadowText ? [{ speaker: "team" as const, text: result.shadowText, voicePreference: "male" as const }] : [];
        // The interpreter lock excludes playback so microphone barge-in remains available.
        busyRef.current = false;
        setBusy(false);
        for (const utterance of utterances) {
          if (turnRef.current !== turnId || statusRef.current !== "active") break;
          markTurn(String(turnId), "shadowResponseReady");
          addRoomMessage(utterance.speaker, utterance.text, clinicalTime);
          await speakShadow(turnId, utterance.text, null, utterance.speaker, utterance.voicePreference);
        }
      } catch {
        if (turnRef.current === turnId) {
          addRoomMessage("system", "Não consegui processar agora. Sua fala foi preservada; pode tentar novamente.", clinicalTime);
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
      caseDefinition,
    ],
  );

  /* --- andaime autoral: 3 (básico), até 5 (intermediário), 0 (avançado) --- */
  const autonomyMode = autonomyForLevel(caseDefinition.level);
  const guidance = resolveActiveGuidance(caseDefinition, runtime, autonomyMode);
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
      if (busyRef.current || transcribingRef.current || statusRef.current !== "active") return;
      transcribingRef.current = true;
      setTranscribing(true);
      const controller = new AbortController();
      sttAbortRef.current = controller;
      const nextTurn = String(turnRef.current + 1);
      markTurn(nextTurn, "speechEnd");
      setVoiceState("processing");
      const result = await transcribeUtterance(audio, controller.signal).catch(() => ({ error: "stt_failed" }));
      transcribingRef.current = false;
      setTranscribing(false);
      if (controller.signal.aborted || statusRef.current !== "active") return;
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
      await processTurn("voice", result.text, { provenance: currentProvenance() });
    },
    [processTurn, setVoiceState, currentProvenance],
  );

  /** Barge-in: a fala do trainee interrompe o áudio do Sombra imediatamente. */
  const handleSpeechStart = useCallback(() => {
    // Invalidates queued playback, including a still-downloading response.
    speech.stop();
    if (!busyRef.current) turnRef.current++;
    setVoiceState("listening");
  }, [speech, setVoiceState]);

  const capture = useVoiceCapture({
    onUtterance: (audio) => void handleUtterance(audio),
    onSpeechStart: handleSpeechStart,
    suspended: busy || transcribing || status !== "active",
  });

  // Abertura: o Sombra apresenta o cenário e passa a ouvir.
  useEffect(() => {
    if (!session || openingRef.current === session.id) return;
    openingRef.current = session.id;
    addRoomMessage("team", caseDefinition.opening, 0);
    const turnId = turnRef.current + 1;
    turnRef.current = turnId;
    void speakShadow(turnId, caseDefinition.opening).finally(() => {
      if (turnRef.current === turnId) setVoiceState("listening");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // Conclusão (manual ou automática) leva à devolutiva. Nenhum áudio permanece.
  useEffect(() => {
    if (status !== "finished") return;
    turnRef.current++;
    sttAbortRef.current?.abort();
    speech.stop();
    capture.stop();
    void navigate({ to: "/resultado" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Pausa da estação também silencia captura e áudio (pausa ≠ barge-in).
  useEffect(() => {
    if (status === "paused") {
      turnRef.current++;
      sttAbortRef.current?.abort();
      busyRef.current = false;
      setBusy(false);
      speech.stop();
      capture.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Fatos gerados pelo tempo (deterioração, resultados) ganham o tom do perfil.
  useEffect(() => {
    if (pendingFacts.length === 0 || status !== "active" || busyRef.current || transcribingRef.current) return;
    const facts = consumePendingFacts();
    if (facts.length === 0) return;
    const turnId = turnRef.current + 1;
    turnRef.current = turnId;
    if (!runtime) return;
    const utterances = presentClinicalFacts(caseDefinition, runtime, facts, runtime.events);
    void (async () => {
      for (const utterance of utterances) {
        if (turnRef.current !== turnId || statusRef.current !== "active") return;
        addRoomMessage(utterance.speaker, utterance.text, clinicalTime);
        await speakShadow(turnId, utterance.text, null, utterance.speaker, utterance.voicePreference);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFacts, status, busy, transcribing]);

  useEffect(() => () => {
    turnRef.current++;
    sttAbortRef.current?.abort();
  }, []);

  const sendDraft = () => {
    const content = draft;
    if (!content.trim()) return;
    setDraft("");
    void processTurn("text", content, { provenance: currentProvenance() });
  };

  const handleFinish = () => {
    setConfirmOpen(false);
    speech.stop();
    capture.stop();
    finishSession();
  };

  const toggleMic = () => {
    void speech.unlock().catch(() => undefined);
    setVoiceNotice(null);
    if (capture.active || capture.status === "starting") {
      capture.stop();
      return;
    }
    void capture.start();
  };

  /** Liga/desliga a voz do Sombra de forma explícita (inclusive vindo do modo texto). */
  const toggleAudio = () => {
    void speech.unlock().catch(() => undefined);
    if (shadowVoiceOn) {
      speech.stop();
      setAudioMuted(true);
      return;
    }
    setAudioMuted(false);
    if (config.shadowOutputMode !== "voice_text") setConfig({ shadowOutputMode: "voice_text" });
    setVoiceNotice(availability?.textToSpeech === false ? voiceMessages.notConfigured : null);
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
  const lastShadow = [...roomMessages].reverse().find((m) => m.role !== "trainee");
  

  const micFailed =
    capture.status === "denied" || capture.status === "error" || capture.status === "unsupported";
  const voiceInputBroken = micFailed || availability?.speechToText === false;
  // Voz falhando nunca destrói a estação: o texto sempre volta a estar disponível.
  const showComposer = canType || voiceInputBroken;

  const voiceState = speech.speaking
    ? "speaking"
    : busy || transcribing
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
      <div className="sr-only" role="log" aria-label="Conversa da estação" aria-live="off">
        {roomMessages.map(message => <p key={message.id}>{message.role in speakerLabels ? speakerLabels[message.role as SimulationSpeaker] : message.role === "trainee" ? "Médico" : "Sistema"}: {message.text}</p>)}
      </div>
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
          <span className="sr-only">{lastShadow && lastShadow.role in speakerLabels ? `${speakerLabels[lastShadow.role as SimulationSpeaker]}: ` : ""}</span>
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
            <Button
              variant="ghost"
              type="submit"
              aria-label="Enviar conduta"
              disabled={status !== "active" || busy || !draft.trim()}
              className={cn(
                "mb-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-all duration-200 active:scale-95",
                draft.trim() && "text-foreground hover:bg-surface-raised/60",
              )}
            >
              <ArrowUp aria-hidden className="size-5" />
            </Button>
          </form>
        )}

        <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2 lg:max-w-2xl">
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
    <Button
      variant="ghost"
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

    </Button>
  );
}

/** Ritmo visual por perfil — sutil, nunca um tema diferente por perfil. */
const profilePace: Record<string, number> = {
  gentle: 0.85,
  assertive: 1.12,
  fast_paced: 1.25,
  permissive: 0.92,
};
