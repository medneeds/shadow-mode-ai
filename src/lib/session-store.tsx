import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { VoiceState } from "@/components/shadow/VoicePresence";
import {
  createSession,
  defaultConfig,
  type TrainingConfig,
  type TrainingSession,
} from "./training-session";
import {
  createTraineeInput,
  type TraineeAction,
  type AssistanceProvenance,
  type TraineeInput,
  type TraineeInputSource,
} from "./trainee-input";
import { advanceClinicalTime, initializeCase } from "./clinical/clinical-case-engine";
import type { ClinicalCaseDefinition, ClinicalCaseRuntime } from "./clinical/clinical-case-types";
import { referenceCase } from "./clinical/reference-cases";
import { selectCase } from "./clinical/selection-engine";
import { createMessage, type ShadowMessage, type ShadowMessageRole } from "./shadow/conversation";
import type { ConfigField } from "./shadow/setup-flow";
import { elapsedWholeSeconds, tickSession } from "./session-clock";
import { reconcileTurn } from "./clinical/reconcile-turn";

type SessionContextValue = {
  /** Configuração atual (persiste entre estações no ciclo de vida do app). */
  config: TrainingConfig;
  setConfig: (next: Partial<TrainingConfig>) => TrainingConfig;
  /** Campos que o usuário realmente informou — base da divulgação progressiva. */
  providedFields: ConfigField[];
  applyConfigPatch: (patch: Partial<TrainingConfig>) => TrainingConfig;
  session: TrainingSession | null;
  lastCompleted: TrainingSession | null;
  startSession: (patch?: Partial<TrainingConfig>) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  finishSession: () => TrainingSession | null;
  clearSession: () => void;
  setVoiceState: (state: VoiceState) => void;
  /**
   * Ponto de entrada ÚNICO para respostas do trainee: voz e texto convergem
   * para a mesma estrutura (TraineeInput) e para o mesmo pipeline.
   */
  submitTraineeInput: (
    source: TraineeInputSource,
    rawContent: string,
    provenance?: AssistanceProvenance,
  ) => TraineeInput | null;
  /** Registra o que o Sombra entendeu de uma entrada (transparência pós-estação). */
  recordInterpretation: (inputId: string, actions: TraineeAction[]) => void;

  /* --- conversa (uma resposta canônica do Sombra por turno) --- */
  setupMessages: ShadowMessage[];
  addSetupMessage: (role: ShadowMessageRole, text: string) => void;
  roomMessages: ShadowMessage[];
  addRoomMessage: (role: ShadowMessageRole, text: string, clinicalTime?: number) => void;

  /* --- verdade clínica determinística --- */
  runtime: ClinicalCaseRuntime | null;
  setRuntime: (next: ClinicalCaseRuntime) => void;
  /** Fatos emitidos pelo tempo, aguardando fraseado do treinador. */
  pendingFacts: string[];
  consumePendingFacts: () => string[];
  /** Runtime clínico da última estação concluída — base da avaliação. */
  lastRuntime: ClinicalCaseRuntime | null;
  /** Caso (com variante aplicada) da estação atual. */
  caseDefinition: ClinicalCaseDefinition;
  /** Caso da última estação concluída — base do resultado e do debriefing. */
  lastCaseDefinition: ClinicalCaseDefinition;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function TrainingSessionProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TrainingConfig>(defaultConfig);
  const configRef = useRef<TrainingConfig>(defaultConfig);
  const [providedFields, setProvidedFields] = useState<ConfigField[]>([]);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [lastCompleted, setLastCompleted] = useState<TrainingSession | null>(null);
  const [setupMessages, setSetupMessages] = useState<ShadowMessage[]>([]);
  const [roomMessages, setRoomMessages] = useState<ShadowMessage[]>([]);
  const [runtime, setRuntimeState] = useState<ClinicalCaseRuntime | null>(null);
  const [pendingFacts, setPendingFacts] = useState<string[]>([]);
  const [lastRuntime, setLastRuntime] = useState<ClinicalCaseRuntime | null>(null);
  const runtimeRef = useRef<ClinicalCaseRuntime | null>(null);
  const [caseDefinition, setCaseDefinition] = useState<ClinicalCaseDefinition>(referenceCase);
  const [lastCaseDefinition, setLastCaseDefinition] =
    useState<ClinicalCaseDefinition>(referenceCase);
  const caseRef = useRef<ClinicalCaseDefinition>(referenceCase);
  const recentCaseIdsRef = useRef<string[]>([]);

  const setConfig = useCallback((next: Partial<TrainingConfig>) => {
    configRef.current = { ...configRef.current, ...next };
    setConfigState(configRef.current);
    setProvidedFields((prev) => {
      const keys = Object.keys(next) as ConfigField[];
      return Array.from(new Set([...prev, ...keys]));
    });
    return configRef.current;
  }, []);

  const applyConfigPatch = setConfig;

  const addSetupMessage = useCallback((role: ShadowMessageRole, text: string) => {
    setSetupMessages((prev) => [...prev, createMessage(role, text)]);
  }, []);

  const addRoomMessage = useCallback(
    (role: ShadowMessageRole, text: string, clinicalTime?: number) => {
      setRoomMessages((prev) => [...prev, createMessage(role, text, clinicalTime)]);
    },
    [],
  );

  const setRuntime = useCallback((next: ClinicalCaseRuntime) => {
    const current = runtimeRef.current;
    if (!current || sessionRef.current?.status !== "active") return;
    const reconciled = reconcileTurn(current, next, caseRef.current);
    runtimeRef.current = reconciled;
    setRuntimeState(reconciled);
  }, []);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  const consumePendingFacts = useCallback(() => {
    const facts = pendingFacts;
    if (facts.length > 0) setPendingFacts([]);
    return facts;
  }, [pendingFacts]);

  const startSession = useCallback(
    (patch: Partial<TrainingConfig> = {}) => {
      const resolvedConfig =
        Object.keys(patch).length > 0 ? applyConfigPatch(patch) : configRef.current;
      const selection = selectCase({
        themeId: resolvedConfig.themeId,
        levelId: resolvedConfig.levelId,
        durationId: resolvedConfig.durationId,
        excludeCaseIds: recentCaseIdsRef.current,
      });
      const def = selection.definition;
      caseRef.current = def;
      setCaseDefinition(def);
      setLastCaseDefinition(def);
      recentCaseIdsRef.current = [def.id, ...recentCaseIdsRef.current].slice(0, 3);
      const initial = initializeCase(def);
      const created = createSession(resolvedConfig, def.id);
      sessionRef.current = created;
      setSession(created);
      runtimeRef.current = initial;
      setRuntimeState(initial);
      setRoomMessages([]);
      setPendingFacts([]);
    },
    [applyConfigPatch],
  );

  const pauseSession = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.status !== "active") return;
    const paused: TrainingSession = { ...current, status: "paused", voiceState: "paused" };
    sessionRef.current = paused;
    setSession(paused);
  }, []);

  const resumeSession = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.status !== "paused") return;
    const resumed: TrainingSession = { ...current, status: "active", voiceState: "listening" };
    sessionRef.current = resumed;
    setSession(resumed);
  }, []);

  // Fluxo único de conclusão (manual e automático usam esta função).
  const sessionRef = useRef<TrainingSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const finishSession = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return null;
    if (current.status === "finished") return current;
    const finished: TrainingSession = {
      ...current,
      status: "finished",
      voiceState: "finished",
      finishedAt: Date.now(),
      completed: true,
    };
    sessionRef.current = finished;
    setSession(finished);
    setLastCompleted(finished);
    if (runtimeRef.current) setLastRuntime(runtimeRef.current);
    return finished;
  }, []);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    runtimeRef.current = null;
    setSession(null);
    setRuntimeState(null);
    setRoomMessages([]);
    setPendingFacts([]);
  }, []);

  const setVoiceState = useCallback((voiceState: VoiceState) => {
    setSession((prev) => (prev && prev.status !== "finished" ? { ...prev, voiceState } : prev));
  }, []);

  const submitTraineeInput = useCallback(
    (source: TraineeInputSource, rawContent: string, provenance?: AssistanceProvenance) => {
      const current = sessionRef.current;
      if (!current || current.status !== "active") return null;
      if (!rawContent.trim()) return null;
      const input = createTraineeInput({
        sessionId: current.id,
        source,
        rawContent,
        clinicalTime: current.durationSeconds - current.remainingSeconds,
        ...(provenance ? { provenance } : {}),
      });
      setSession((prev) =>
        prev && prev.id === current.id
          ? { ...prev, traineeInputs: [...prev.traineeInputs, input] }
          : prev,
      );
      return input;
    },
    [],
  );

  const recordInterpretation = useCallback((inputId: string, actions: TraineeAction[]) => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            traineeInputs: prev.traineeInputs.map((input) =>
              input.id === inputId
                ? { ...input, interpretation: { status: "interpreted", actions } }
                : input,
            ),
          }
        : prev,
    );
  }, []);

  // Cronômetro + tempo clínico determinístico (o motor decide, nunca o modelo).
  useEffect(() => {
    if (!session || session.status !== "active") return;
    let baseline = performance.now();
    const interval = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current || current.status !== "active") return;
      const seconds = elapsedWholeSeconds(baseline, performance.now(), current.remainingSeconds);
      if (seconds === 0) return;
      baseline += seconds * 1000;
      const clinical = runtimeRef.current;
      if (clinical) {
        const result = advanceClinicalTime(clinical, seconds, caseRef.current);
        runtimeRef.current = result.runtime;
        setRuntimeState(result.runtime);
        if (result.newEvents.length > 0) {
          setPendingFacts((prev) => [...prev, ...result.newEvents.map((e) => e.fact)]);
        }
      }
      const next = tickSession(current, seconds);
      sessionRef.current = next;
      setSession(next);
      if (next.remainingSeconds === 0) finishSession();
    }, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.id]);

  const value = useMemo<SessionContextValue>(
    () => ({
      config,
      setConfig,
      providedFields,
      applyConfigPatch,
      session,
      lastCompleted,
      startSession,
      pauseSession,
      resumeSession,
      finishSession,
      clearSession,
      setVoiceState,
      submitTraineeInput,
      recordInterpretation,
      setupMessages,
      addSetupMessage,
      roomMessages,
      addRoomMessage,
      runtime,
      setRuntime,
      pendingFacts,
      consumePendingFacts,
      lastRuntime,
      caseDefinition,
      lastCaseDefinition,
    }),
    [
      config,
      setConfig,
      providedFields,
      applyConfigPatch,
      session,
      lastCompleted,
      startSession,
      pauseSession,
      resumeSession,
      finishSession,
      clearSession,
      setVoiceState,
      submitTraineeInput,
      recordInterpretation,
      setupMessages,
      addSetupMessage,
      roomMessages,
      addRoomMessage,
      runtime,
      setRuntime,
      pendingFacts,
      consumePendingFacts,
      lastRuntime,
      caseDefinition,
      lastCaseDefinition,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useTrainingSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useTrainingSession precisa estar dentro de TrainingSessionProvider");
  }
  return ctx;
}
