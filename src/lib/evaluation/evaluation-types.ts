/**
 * Phase 06 — Clinical Scoring & Debriefing: tipos.
 *
 * Regra fundamental: a pontuação é DETERMINÍSTICA e nasce dos metadados do caso
 * (ações esperadas, pesos, janelas, criticidade, consequências que realmente
 * ocorreram). Nenhum LLM define, altera ou arredonda número algum. O LLM pode,
 * depois, apenas redigir explicações a partir desta estrutura.
 */
import type { ActionCategory, ActionStatus } from "@/lib/clinical/clinical-case-types";
import type { TrainingConfig } from "@/lib/training-session";
import type { TraineeInputSource } from "@/lib/trainee-input";

/* ------------------------------------------------------------ domínios ---- */

export type EvaluationDomain =
  | "initial_approach"
  | "safety"
  | "clinical_assessment"
  | "diagnostic_reasoning"
  | "investigations"
  | "treatment"
  | "prioritization"
  | "reassessment"
  | "disposition";

export const domainLabels: Record<EvaluationDomain, string> = {
  initial_approach: "Abordagem inicial",
  safety: "Segurança",
  clinical_assessment: "Avaliação clínica",
  diagnostic_reasoning: "Raciocínio diagnóstico",
  investigations: "Exames complementares",
  treatment: "Tratamento",
  prioritization: "Priorização",
  reassessment: "Reavaliação",
  disposition: "Destino / tratamento definitivo",
};

/** Fallback determinístico quando o caso não declara domínio para uma ação. */
export const categoryToDomain: Record<ActionCategory, EvaluationDomain> = {
  history: "clinical_assessment",
  physical_exam: "clinical_assessment",
  monitoring: "safety",
  investigation: "investigations",
  medication: "treatment",
  procedure: "treatment",
  consultation: "disposition",
  disposition: "disposition",
  reassessment: "reassessment",
  communication: "clinical_assessment",
};

/* ------------------------------------------------- itens por ação --------- */

export type ExpectedActionOutcome =
  | "completed_in_window"
  | "completed_late"
  | "incomplete"
  | "not_performed"
  | "not_applicable";

export type ExpectedActionEvaluation = {
  actionId: string;
  label: string;
  domain: EvaluationDomain;
  importance: string;
  critical: boolean;
  outcome: ExpectedActionOutcome;
  status: ActionStatus;
  /** Tempo clínico (s) em que a ação foi registrada, quando ocorreu. */
  performedAtSecond?: number;
  recommendedWindowSeconds?: number;
  weight: number;
  /** Crédito obtido (0..weight) — sempre determinístico. */
  earned: number;
  /** Justificativa factual em pt-BR (não é dica, é explicação pós-estação). */
  rationale: string;
  /** Ensino acionável definido pelo caso, quando existir. */
  learningPoint?: string;
};

/* ------------------------------------------------------- por domínio ------ */

export type CategoryEvaluation = {
  category: EvaluationDomain;
  label: string;
  score: number;
  maxScore: number;
  /** Inteiro 0..100 — sem falsa precisão. */
  percentage: number;
  performedItems: string[];
  missedItems: string[];
  criticalIssues: string[];
};

/* ------------------------------------------------ omissões / inseguras ---- */

export type CriticalOmission = {
  actionId: string;
  description: string;
  expectedWindowSeconds?: number;
  /** Consequência definida pelo caso — só exibida se o evento ocorreu. */
  consequence?: string;
  occurred: boolean;
};

export type UnsafeActionFinding = {
  actionId: string;
  description: string;
  domain: EvaluationDomain;
  penaltyPoints: number;
  atClinicalSecond: number;
};

/* ----------------------------------------------------------- timeline ----- */

export type TimelineEntryKind =
  | "trainee_action"
  | "clinical_event"
  | "investigation_result"
  | "state_change";

export type TimelineEntry = {
  atClinicalSecond: number;
  /** mm:ss */
  clock: string;
  kind: TimelineEntryKind;
  text: string;
};

/* --------------------------------------------------------- transcrição --- */

export type TranscriptEntry = {
  atClinicalSecond: number;
  clock: string;
  source: TraineeInputSource;
  rawContent: string;
  /** O que o Sombra entendeu (rótulos de ações), para transparência. */
  understoodActions: string[];
};

/* ------------------------------------------------------------ bandas ------ */

export type PerformanceBand =
  | "excelente"
  | "muito_bom"
  | "bom"
  | "em_desenvolvimento"
  | "precisa_revisao";

export const performanceBandLabels: Record<PerformanceBand, string> = {
  excelente: "Excelente",
  muito_bom: "Muito bom",
  bom: "Bom",
  em_desenvolvimento: "Em desenvolvimento",
  precisa_revisao: "Precisa de revisão",
};

/* ------------------------------------------------------- avaliação ------- */

export type SessionEvaluation = {
  caseId: string;
  caseVersion: string;
  scoringVersion: string;
  /** Inteiro 0..100. */
  overallScore: number;
  band: PerformanceBand;
  bandLabel: string;
  /** Frase factual determinística (não é LLM). */
  headline: string;
  totalEarned: number;
  totalMax: number;
  penaltyPoints: number;
  categories: CategoryEvaluation[];
  actions: ExpectedActionEvaluation[];
  strengths: string[];
  misses: string[];
  criticalIssues: string[];
  criticalOmissions: CriticalOmission[];
  unsafeActions: UnsafeActionFinding[];
  improvements: string[];
  expectedManagement: string[];
  outcome: string;
  clinicalSecondsElapsed: number;
};

/* ------------------------------------------------------- debriefing ------ */

export type Debriefing = {
  /** Resumo curto pós-estação. */
  summary: string;
  /** Recomendações redigidas — mesmo conteúdo educacional da versão determinística. */
  improvements: string[];
  /** true quando o texto veio do fallback determinístico (sem LLM). */
  fallback: boolean;
};

/* ------------------------------------------- resultado durável (Phase 07) - */

export type CompletedTrainingResult = {
  sessionId: string;
  caseId: string;
  caseTitle: string;
  configuration: TrainingConfig;
  startedAt: number | null;
  finishedAt: number | null;
  durationSeconds: number;
  clinicalSecondsElapsed: number;
  evaluation: SessionEvaluation;
  timeline: TimelineEntry[];
  transcript: TranscriptEntry[];
  debriefing: Debriefing | null;
  meta: {
    caseVersion: string;
    scoringVersion: string;
    engineVersion: string;
  };
};
