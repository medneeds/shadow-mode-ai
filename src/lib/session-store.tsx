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
import { createTraineeInput, type TraineeInput, type TraineeInputSource } from "./trainee-input";
import { advanceClinicalTime, initializeCase } from "./clinical/clinical-case-engine";
import type { ClinicalCaseRuntime } from "./clinical/clinical-case-types";
import { referenceCase } from "./clinical/reference-cases";
import { createMessage, type ShadowMessage, type ShadowMessageRole } from "./shadow/conversation";
import type { ConfigField } from "./shadow/setup-flow";

type SessionContextValue = {
  /** Configuração atual (persiste entre estações no ciclo de vida do app). */
  config: TrainingConfig;
  setConfig: (next: Partial<TrainingConfig>) => void;
  /** Campos que o usuário realmente informou — base da divulgação progressiva. */
  providedFields: ConfigField[];
  applyConfigPatch: (patch: Partial<TrainingConfig>) => void;
  session: TrainingSession | null;
  lastCompleted: TrainingSession | null;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  finishSession: () => TrainingSession | null;
  clearSession: () => void;
  setVoiceState: (state: VoiceState) => void;
  /**
   * Ponto de entrada ÚNICO para respostas do trainee: voz e texto convergem
   * para a mesma estrutura (TraineeInput) e para o mesmo pipeline.
   */
  submitTraineeInput: (source: TraineeInputSource, rawContent: string) => TraineeInput | null;

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
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function TrainingSessionProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TrainingConfig>(defaultConfig);
  const [providedFields, setProvidedFields] = useState<ConfigField[]>([]);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [lastCompleted, setLastCompleted] = useState<TrainingSession | null>(null);
  const [setupMessages, setSetupMessages] = useState<ShadowMessage[]>([]);
  const [roomMessages, setRoomMessages] = useState<ShadowMessage[]>([]);
  const [runtime, setRuntimeState] = useState<ClinicalCaseRuntime | null>(null);
  const [pendingFacts, setPendingFacts] = useState<string[]>([]);

  const setConfig = useCallback((next: Partial<TrainingConfig>) => {
    setConfigState((prev) => ({ ...prev, ...next }));
    setProvidedFields((prev) => {
      const keys = Object.keys(next) as ConfigField[];
      return Array.from(new Set([...prev, ...keys]));
    });
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

  const setRuntime = useCallback((next: ClinicalCaseRuntime) => setRuntimeState(next), []);

  const consumePendingFacts = useCallback(() => {
    const facts = pendingFacts;
    if (facts.length > 0) setPendingFacts([]);
    return facts;
  }, [pendingFacts]);

  const startSession = useCallback(() => {
    setSession(createSession(config));
    setRuntimeState(initializeCase(referenceCase));
    setRoomMessages([]);
    setPendingFacts([]);
  }, [config]);

  const pauseSession = useCallback(() => {
    setSession((prev) =>
      prev && prev.status === "active" ? { ...prev, status: "paused", voiceState: "paused" } : prev,
    );
  }, []);

  const resumeSession = useCallback(() => {
    setSession((prev) =>
      prev && prev.status === "paused"
        ? { ...prev, status: "active", voiceState: "listening" }
        : prev,
    );
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
    return finished;
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setRuntimeState(null);
    setRoomMessages([]);
    setPendingFacts([]);
  }, []);

  const setVoiceState = useCallback((voiceState: VoiceState) => {
    setSession((prev) => (prev && prev.status !== "finished" ? { ...prev, voiceState } : prev));
  }, []);

  const submitTraineeInput = useCallback((source: TraineeInputSource, rawContent: string) => {
    const current = sessionRef.current;
    if (!current || current.status !== "active") return null;
    if (!rawContent.trim()) return null;
    const input = createTraineeInput({
      sessionId: current.id,
      source,
      rawContent,
      clinicalTime: current.durationSeconds - current.remainingSeconds,
    });
    setSession((prev) =>
      prev && prev.id === current.id
        ? { ...prev, traineeInputs: [...prev.traineeInputs, input] }
        : prev,
    );
    return input;
  }, []);

  // Cronômetro + tempo clínico determinístico (o motor decide, nunca o modelo).
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const interval = window.setInterval(() => {
      setRuntimeState((prevRuntime) => {
        if (!prevRuntime) return prevRuntime;
        const result = advanceClinicalTime(prevRuntime, 1, referenceCase);
        if (result.newEvents.length > 0) {
          setPendingFacts((prev) => [...prev, ...result.newEvents.map((e) => e.fact)]);
        }
        return result.runtime;
      });

      setSession((prev) => {
        if (!prev || prev.status !== "active") return prev;
        const remainingSeconds = Math.max(0, prev.remainingSeconds - 1);
        if (remainingSeconds === 0) {
          const finished: TrainingSession = {
            ...prev,
            remainingSeconds: 0,
            status: "finished",
            voiceState: "finished",
            finishedAt: Date.now(),
            completed: true,
          };
          setLastCompleted(finished);
          return finished;
        }
        return { ...prev, remainingSeconds };
      });
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
      setupMessages,
      addSetupMessage,
      roomMessages,
      addRoomMessage,
      runtime,
      setRuntime,
      pendingFacts,
      consumePendingFacts,
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
      setupMessages,
      addSetupMessage,
      roomMessages,
      addRoomMessage,
      runtime,
      setRuntime,
      pendingFacts,
      consumePendingFacts,
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
