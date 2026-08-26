/**
 * Phase 06.7 — Taxonomia clínica da biblioteca de simulações.
 *
 * Metadados estruturados que tornam os casos DESCOBRÍVEIS pelo
 * CaseSelectionEngine, sem que nenhuma rota precise conhecer um caso concreto.
 *
 * Identificadores técnicos em inglês; conteúdo do trainee sempre em pt-BR.
 */
import type { LevelId } from "@/lib/shadow-content";

export const clinicalSettings = [
  "emergency_department",
  "icu",
  "ward",
  "outpatient",
  "prehospital",
  "postoperative",
] as const;
export type ClinicalSetting = (typeof clinicalSettings)[number];

export const settingLabels: Record<ClinicalSetting, string> = {
  emergency_department: "Pronto-socorro",
  icu: "Terapia intensiva",
  ward: "Enfermaria",
  outpatient: "Ambulatório",
  prehospital: "Pré-hospitalar",
  postoperative: "Pós-operatório",
};

/** Arquétipos reutilizáveis: uma apresentação pode conter vários diagnósticos. */
export const caseArchetypes = [
  "altered_mental_status",
  "chest_pain",
  "dyspnea",
  "shock",
  "sepsis",
  "arrhythmia",
  "acute_neuro_deficit",
  "seizure",
  "abdominal_pain",
  "gi_bleeding",
  "trauma",
  "poisoning",
  "electrolyte_emergency",
  "hypertensive_emergency",
  "anaphylaxis",
  "acute_respiratory_failure",
] as const;
export type CaseArchetype = (typeof caseArchetypes)[number];

export const archetypeLabels: Record<CaseArchetype, string> = {
  altered_mental_status: "Rebaixamento do nível de consciência",
  chest_pain: "Dor torácica",
  dyspnea: "Dispneia",
  shock: "Choque",
  sepsis: "Sepse",
  arrhythmia: "Arritmia",
  acute_neuro_deficit: "Déficit neurológico agudo",
  seizure: "Crise convulsiva",
  abdominal_pain: "Dor abdominal",
  gi_bleeding: "Hemorragia digestiva",
  trauma: "Trauma",
  poisoning: "Intoxicação",
  electrolyte_emergency: "Emergência hidroeletrolítica",
  hypertensive_emergency: "Emergência hipertensiva",
  anaphylaxis: "Anafilaxia",
  acute_respiratory_failure: "Insuficiência respiratória aguda",
};

export type Acuity = "critical" | "urgent" | "semi_urgent";
export type AgeGroup = "pediatric" | "adult" | "elderly";

/** Status de revisão clínica. Conteúdo gerado NUNCA nasce como "reviewed". */
export type ReviewStatus = "draft" | "needs_clinical_review" | "reviewed";

export type EvaluatedSkill =
  | "initial_approach"
  | "diagnostic_reasoning"
  | "physical_exam"
  | "investigation"
  | "treatment"
  | "prioritization"
  | "reassessment"
  | "communication"
  | "safety"
  | "disposition";

/** Metadados de descoberta e curadoria de um caso. */
export type ClinicalCaseMeta = {
  specialty: string;
  topic: string;
  subtopic?: string;
  archetype: CaseArchetype;
  setting: ClinicalSetting;
  difficulty: LevelId;
  clinicalSyndrome: string;
  primaryDiagnosis: string;
  dangerousDifferentials: string[];
  ageGroup: AgeGroup;
  acuity: Acuity;
  skills: EvaluatedSkill[];
  /** Durações de estação compatíveis (ids do catálogo de durações). */
  compatibleDurations: string[];
  estimatedMinutes: number;
  review: {
    status: ReviewStatus;
    reviewedAt?: string;
    reviewVersion?: string;
    notes?: string;
  };
  /** Termos pt-BR que o CaseSelectionEngine casa com o pedido do trainee. */
  keywords: string[];
};

/** Projeção segura para o cliente: nunca inclui diagnóstico oculto nem rubrica. */
export type PublicCaseSummary = {
  id: string;
  title: string;
  archetype: CaseArchetype;
  setting: ClinicalSetting;
  difficulty: LevelId;
  themeId: string;
  estimatedMinutes: number;
};
