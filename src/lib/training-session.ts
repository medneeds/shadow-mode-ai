/**
 * Phase 02 — typed client-side training session model.
 * Mock-driven: no backend, no persistence, no real AI.
 */
import type { LevelId } from "./shadow-content";
import { durations, levels, themes } from "./shadow-content";
import type { VoiceState } from "@/components/shadow/VoicePresence";

export type SessionStatus = "configuring" | "ready" | "active" | "paused" | "finished";

export type TrainingConfig = {
  themeId: string;
  levelId: LevelId;
  durationId: string;
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

export function createSession(config: TrainingConfig): TrainingSession {
  const durationSeconds = durationToSeconds(config.durationId);
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}`,
    config,
    caseId: mockCase.id,
    status: "active",
    startedAt: Date.now(),
    finishedAt: null,
    durationSeconds,
    remainingSeconds: durationSeconds,
    voiceState: "speaking",
    completed: false,
  };
}

/** Nota geral mockada — o motor de avaliação real chega em fases futuras. */
export const mockScore = 78;
