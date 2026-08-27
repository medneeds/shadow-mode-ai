/**
 * Phase 02 — typed client-side training session model.
 * Mock-driven: no backend, no persistence, no real AI.
 */
import type { LevelId } from "./shadow-content";
import { durations, levels, themes } from "./shadow-content";
import type { VoiceState } from "@/components/shadow/VoicePresence";
import type {
  ShadowOutputMode,
  TraineeInputMode,
  TrainerProfile,
  VoicePreference,
} from "./shadow-trainer";
import type { TraineeInput } from "./trainee-input";
import type { SpeechRate } from "./voice/voice-types";
import type { ClinicalCaseDefinition, ClinicalCaseRuntime } from "./clinical/clinical-case-types";

export type SessionStatus = "configuring" | "ready" | "active" | "paused" | "finished";

export type TrainingConfig = {
  themeId: string;
  levelId: LevelId;
  durationId: string;
  /** Como o SOMBRA responde (saída). Independente da entrada do trainee. */
  shadowOutputMode: ShadowOutputMode;
  /** Como o TRAINEE responde (entrada). Independente da saída do Sombra. */
  traineeInputMode: TraineeInputMode;
  /** Apresentação de voz apenas; não altera comportamento clínico. */
  voicePreference: VoicePreference;
  /** Ritmo da síntese de voz. Independente do perfil do treinador. */
  speechRate: SpeechRate;
  /** Estilo de comunicação e pressão; nunca altera a verdade médica do caso. */
  trainerProfile: TrainerProfile;
};

export type TrainingSession = {
  id: string;
  config: TrainingConfig;
  caseId: string;
  status: SessionStatus;
  startedAt: number | null;
  finishedAt: number | null;
  durationSeconds: number;
  remainingSeconds: number;
  voiceState: VoiceState;
  completed: boolean;
  /**
   * Entradas do trainee (voz e texto convergem aqui). O conteúdo original nunca
   * é descartado — auditoria, debugging, avaliação e debriefing dependem dele.
   */
  traineeInputs: TraineeInput[];
};

export type MockClinicalCase = {
  id: string;
  title: string;
  opening: string;
  themeId: string;
  difficulty: LevelId;
  /** Metadados internos — não exibidos ao usuário nesta fase. */
  meta?: { setting: string };
};

/** Phase 02 usa um único caso controlado. O motor de casos chega na Phase 03. */
export const mockCase: MockClinicalCase = {
  id: "case-ps-58-inconsciente",
  title: "Rebaixamento do nível de consciência no pronto-socorro",
  opening:
    "Paciente de 58 anos é trazido ao pronto-socorro inconsciente por familiares. Você pode iniciar o atendimento.",
  themeId: "emergencia",
  difficulty: "intermediario",
  meta: { setting: "Pronto-socorro" },
};

export const defaultConfig: TrainingConfig = {
  themeId: "emergencia",
  levelId: "intermediario",
  durationId: "15",
  shadowOutputMode: "voice_text",
  traineeInputMode: "hybrid",
  voicePreference: "female",
  speechRate: "normal",
  trainerProfile: "assertive",
};

export function durationToSeconds(durationId: string): number {
  const minutes = Number(durationId);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 15 * 60;
}

export function themeLabel(themeId: string): string {
  return themes.find((t) => t.id === themeId)?.label ?? "";
}

export function levelLabel(levelId: LevelId): string {
  return levels.find((l) => l.id === levelId)?.label ?? "";
}

export function durationLabel(durationId: string): string {
  return durations.find((d) => d.id === durationId)?.label ?? "";
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function createSession(config: TrainingConfig, caseId?: string): TrainingSession {
  const durationSeconds = durationToSeconds(config.durationId);
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}`,
    config,
    caseId: caseId ?? mockCase.id,
    status: "active",
    startedAt: Date.now(),
    finishedAt: null,
    durationSeconds,
    remainingSeconds: durationSeconds,
    voiceState: "speaking",
    completed: false,
    traineeInputs: [],
  };
}

/** Pure completion transition shared by manual and automatic session endings. */
export function completeSession(
  session: TrainingSession,
  finishedAt = Date.now(),
): TrainingSession {
  if (session.status === "finished") return session;
  return {
    ...session,
    status: "finished",
    voiceState: "finished",
    finishedAt,
    completed: true,
  };
}

/** Fails loudly in development if UI, session, and clinical runtime diverge. */
export function assertSessionIntegrity(
  session: TrainingSession,
  definition: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
): void {
  if (session.caseId !== definition.id || runtime.caseId !== definition.id) {
    throw new Error("A estação clínica está usando casos inconsistentes.");
  }
}

/** Nota geral mockada — o motor de avaliação real chega em fases futuras. */
export const mockScore = 78;
