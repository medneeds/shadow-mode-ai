/**
 * Phase 06.7 — Variantes controladas e randomização determinística.
 *
 * Regra dura: nada aqui INVENTA fisiologia. A variante só aplica campos que o
 * autor do caso marcou explicitamente como variáveis, e o resultado é sempre
 * reproduzível a partir de (caseId, variantId, seed).
 */
import type {
  ClinicalCaseDefinition,
  ClinicalCaseVariant,
  VitalSigns,
} from "./clinical-case-types";

/** PRNG determinístico (mulberry32). Sem Math.random em nenhum ponto. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickDeterministic<T>(items: readonly T[], rand: () => number): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rand() * items.length) % items.length];
}

export type AppliedCase = {
  definition: ClinicalCaseDefinition;
  variantId: string | null;
  seed: number;
};

/**
 * Aplica variante + randomização controlada e devolve uma definição completa.
 * A definição resultante carrega `variantId` e `seed` para reprodutibilidade.
 */
export function applyVariant(
  def: ClinicalCaseDefinition,
  options: { variantId?: string | null; seed?: number } = {},
): AppliedCase {
  const seed = options.seed ?? 1;
  const rand = seededRandom(seed);

  const variants = def.variants ?? [];
  const variant: ClinicalCaseVariant | undefined =
    options.variantId === null
      ? undefined
      : options.variantId
        ? variants.find((v) => v.id === options.variantId)
        : pickDeterministic(variants, rand);

  // 1. Randomização controlada dos sinais vitais autorizados.
  const vitals: VitalSigns = { ...def.initialState.vitals };
  for (const [key, values] of Object.entries(def.variableVitals ?? {})) {
    if (!values || values.length === 0) continue;
    const chosen = pickDeterministic(values, rand);
    if (typeof chosen === "number") vitals[key as keyof VitalSigns] = chosen;
  }

  if (!variant) {
    return {
      definition: { ...def, initialState: { ...def.initialState, vitals }, variantId: null, seed },
      variantId: null,
      seed,
    };
  }

  // 2. Aplicação da variante (somente campos autorizados).
  const tags = new Set(def.initialState.tags);
  variant.addTags?.forEach((t) => tags.add(t));
  variant.removeTags?.forEach((t) => tags.delete(t));

  const shift = variant.triggerTimeShiftSeconds ?? 0;
  const baseTriggers = def.timeTriggers.map((t) =>
    shift === 0 ? t : { ...t, atClinicalSecond: Math.max(1, t.atClinicalSecond + shift) },
  );

  const investigations = def.investigations.map((inv) => {
    const replacement = variant.investigationResults?.[inv.id];
    return replacement ? { ...inv, result: replacement } : inv;
  });

  const definition: ClinicalCaseDefinition = {
    ...def,
    opening: variant.opening ?? def.opening,
    level: variant.difficulty ?? def.level,
    meta: variant.difficulty ? { ...def.meta, difficulty: variant.difficulty } : def.meta,
    patient: {
      ...def.patient,
      age: variant.patient?.age ?? def.patient.age,
      biologicalSex: variant.patient?.biologicalSex ?? def.patient.biologicalSex,
      chiefPresentation: variant.patient?.chiefPresentation ?? def.patient.chiefPresentation,
      information: [...def.patient.information, ...(variant.extraInformation ?? [])],
    },
    initialState: {
      ...def.initialState,
      vitals: { ...vitals, ...variant.initialVitals },
      tags: [...tags].sort(),
    },
    examFindings: [...def.examFindings, ...(variant.extraExamFindings ?? [])],
    investigations,
    timeTriggers: [...baseTriggers, ...(variant.extraTimeTriggers ?? [])],
    variantId: variant.id,
    seed,
  };

  return { definition, variantId: variant.id, seed };
}
