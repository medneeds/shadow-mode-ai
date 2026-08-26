/**
 * Addendum 06.7 — Resolução determinística do andaime visível.
 * Mesma definição + mesmo runtime ⇒ mesmas opções.
 */
import type { ClinicalCaseDefinition, ClinicalCaseRuntime, TriggerCondition } from "./clinical-case-types";
import { evaluateTriggerCondition } from "./clinical-case-engine";
import type {
  ActiveGuidance,
  FreeReasoningZone,
  GuidanceOption,
  GuidancePoint,
  TraineeAutonomyMode,
} from "./guidance-types";
import { visibleOptionLimit } from "./guidance-types";

export * from "./guidance-types";

function conditionsMet(conditions: TriggerCondition[] | undefined, runtime: ClinicalCaseRuntime) {
  return (conditions ?? []).every((c) => evaluateTriggerCondition(c, runtime));
}

function withinWindow(point: { fromSecond?: number; untilSecond?: number }, second: number) {
  if (point.fromSecond !== undefined && second < point.fromSecond) return false;
  if (point.untilSecond !== undefined && second > point.untilSecond) return false;
  return true;
}

function optionsForMode(point: GuidancePoint, mode: TraineeAutonomyMode): GuidanceOption[] {
  if (mode === "guided") return point.guidedOptions ?? [];
  if (mode === "adaptive") return point.adaptiveOptions ?? [];
  return [];
}

export function activeFreeReasoningZone(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  mode: TraineeAutonomyMode = "adaptive",
): FreeReasoningZone | null {
  for (const zone of def.guidance?.freeReasoningZones ?? []) {
    if (!(zone.appliesTo ?? ["guided", "adaptive"]).includes(mode)) continue;
    if (!withinWindow(zone, runtime.elapsedClinicalSeconds)) continue;
    if (!conditionsMet(zone.conditions, runtime)) continue;
    return zone;
  }
  return null;
}

/**
 * Andaime visível AGORA. Determinístico: mesma definição + mesmo runtime ⇒
 * mesmas opções. Retorna null quando não há andaime (autônomo, zona livre,
 * ponto já resolvido ou fora da janela).
 */
export function resolveActiveGuidance(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime | null,
  mode: TraineeAutonomyMode,
): ActiveGuidance | null {
  if (!runtime || mode === "autonomous") return null;
  const guidance = def.guidance;
  if (!guidance || guidance.points.length === 0) return null;
  if (activeFreeReasoningZone(def, runtime, mode)) return null;

  const performed = new Set(runtime.actionLog.map((a) => a.actionId));
  const limit = visibleOptionLimit[mode];

  for (const point of guidance.points) {
    const authored = optionsForMode(point, mode);
    if (authored.length === 0) continue;
    if (!withinWindow(point, runtime.elapsedClinicalSeconds)) continue;
    if (!conditionsMet(point.conditions, runtime)) continue;

    // Resolução: o trainee já decidiu esse momento (por toque, voz ou texto).
    const resolvers = point.resolvedByActionIds ?? authored.map((o) => o.actionId);
    if (resolvers.some((id) => performed.has(id))) continue;

    const options = authored
      .filter((o) => conditionsMet(o.availabilityConditions, runtime))
      .filter((o) => !performed.has(o.actionId))
      .slice(0, limit);

    if (options.length === 0) continue;
    return {
      pointId: point.id,
      autonomyMode: mode,
      options,
      visibleOptionCount: options.length,
    };
  }
  return null;
}
