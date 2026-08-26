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
  interpretTraineeInput,
  type TraineeInput,
  type TraineeInputSource,
} from "./trainee-input";

type SessionContextValue = {
  /** Configuração atual (persiste entre estações no ciclo de vida do app). */
  config: TrainingConfig;
  setConfig: (next: Partial<TrainingConfig>) => void;
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
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function TrainingSessionProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TrainingConfig>(defaultConfig);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [lastCompleted, setLastCompleted] = useState<TrainingSession | null>(null);

  const setConfig = useCallback((next: Partial<TrainingConfig>) => {
    setConfigState((prev) => ({ ...prev, ...next }));
  }, []);

  const startSession = useCallback(() => {
    setSession(createSession(config));
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

  const clearSession = useCallback(() => setSession(null), []);

  const setVoiceState = useCallback((voiceState: VoiceState) => {
    setSession((prev) => (prev && prev.status === "active" ? { ...prev, voiceState } : prev));
  }, []);

  const submitTraineeInput = useCallback(
    (source: TraineeInputSource, rawContent: string) => {
      const current = sessionRef.current;
      if (!current || current.status !== "active") return null;
      if (!rawContent.trim()) return null;
      const input = createTraineeInput({
        sessionId: current.id,
        source,
        rawContent,
        clinicalTime: current.durationSeconds - current.remainingSeconds,
      });
      input.interpretation = interpretTraineeInput(input);
      setSession((prev) =>
        prev && prev.id === current.id
          ? { ...prev, traineeInputs: [...prev.traineeInputs, input] }
          : prev,
      );
      return input;
    },
    [],
  );

  // Cronômetro: só corre com estação ativa; limpo em toda mudança de estado.
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const interval = window.setInterval(() => {
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
  }, [session?.status, session?.id]);

  const value = useMemo<SessionContextValue>(
    () => ({
      config,
      setConfig,
      session,
      lastCompleted,
      startSession,
      pauseSession,
      resumeSession,
      finishSession,
      clearSession,
      setVoiceState,
      submitTraineeInput,
    }),
    [
      config,
      setConfig,
      session,
      lastCompleted,
      startSession,
      pauseSession,
      resumeSession,
      finishSession,
      clearSession,
      setVoiceState,
      submitTraineeInput,
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
