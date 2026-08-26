/**
 * Addendum 06.7 — Tipos de autonomia do trainee e andaimes pedagógicos.
 *
 * Dificuldade controla DUAS dimensões independentes:
 *   1. complexidade clínica  (autoral, dentro da definição do caso);
 *   2. autonomia do trainee  (quanto andaime a estação oferece).
 *
 * basico        → guided     → exatamente 3 ações contextuais no GuidancePoint
 * intermediario → adaptive   → até 5 ações em momentos guiados, 0 nas zonas livres
 * avancado      → autonomous → nenhuma sugestão em nenhum momento
 *
 * Nenhuma opção cria verdade clínica: toda opção aponta para uma ação que já
 * existe no catálogo autoral do caso. O LLM nunca inventa opções.
 */
import type { LevelId } from "@/lib/shadow-content";
import type { TriggerCondition } from "./clinical-case-types";

export type TraineeAutonomyMode = "guided" | "adaptive" | "autonomous";

export const autonomyByLevel: Record<LevelId, TraineeAutonomyMode> = {
  basico: "guided",
  intermediario: "adaptive",
  avancado: "autonomous",
};

/** Densidade oficial de andaime por modo de autonomia. */
export const visibleOptionLimit: Record<TraineeAutonomyMode, number> = {
  guided: 3,
  adaptive: 5,
  autonomous: 0,
};

export const autonomyLabels: Record<TraineeAutonomyMode, string> = {
  guided: "Simulação guiada",
  adaptive: "Andaime adaptativo",
  autonomous: "Simulação autônoma",
};

export function autonomyForLevel(level: LevelId): TraineeAutonomyMode {
  return autonomyByLevel[level] ?? "adaptive";
}

/**
 * Papel educacional interno da opção. NUNCA é exibido durante a estação:
 * existe para autoria e para analytics futuros de independência.
 */
export type GuidanceEducationalRole =
  | "high_priority"
  | "reasonable"
  | "lower_priority"
  | "context_dependent";

export type GuidanceOption = {
  id: string;
  /** Rótulo pt-BR em forma de AÇÃO. Nunca um diagnóstico, nunca uma dica. */
  label: string;
  /** Ação do catálogo do caso — mesma verdade clínica de voz/texto. */
  actionId: string;
  educationalRole: GuidanceEducationalRole;
  /** Só aparece se todas as condições forem verdadeiras. */
  availabilityConditions?: TriggerCondition[];
  objectiveId?: string;
};

export type GuidancePoint = {
  id: string;
  educationalPurpose: string;
  /** Tempo clínico mínimo (segundos) para o ponto poder aparecer. */
  fromSecond?: number;
  /** Deixa de aparecer depois deste tempo clínico. */
  untilSecond?: number;
  /** Todas as condições precisam ser verdadeiras. */
  conditions?: TriggerCondition[];
  /**
   * O ponto se resolve quando qualquer uma destas ações é executada — por toque,
   * por voz ou por texto. Por padrão, as próprias ações das opções resolvem.
   */
  resolvedByActionIds?: string[];
  /** Exatamente 3 opções (nível básico). */
  guidedOptions?: GuidanceOption[];
  /** Até 5 opções (nível intermediário, momentos guiados autorais). */
  adaptiveOptions?: GuidanceOption[];
};

/**
 * Trecho do caso em que NENHUMA sugestão aparece: o raciocínio é do trainee.
 * Sempre autoral — a IA não decide quando o trainee merece ajuda.
 */
export type FreeReasoningZone = {
  id: string;
  label: string;
  educationalPurpose: string;
  /**
   * Modos em que a zona silencia o andaime. Por padrão vale para guided e
   * adaptive; zonas exclusivas do intermediário usam ["adaptive"].
   */
  appliesTo?: TraineeAutonomyMode[];
  fromSecond?: number;
  untilSecond?: number;
  /** Todas as condições precisam ser verdadeiras para a zona estar ativa. */
  conditions?: TriggerCondition[];
};

export type CaseGuidance = {
  points: GuidancePoint[];
  freeReasoningZones?: FreeReasoningZone[];
};

export type ActiveGuidance = {
  pointId: string;
  autonomyMode: TraineeAutonomyMode;
  options: GuidanceOption[];
  visibleOptionCount: number;
};

