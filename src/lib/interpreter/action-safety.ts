import type { ActionDefinition } from "@/lib/clinical/clinical-case-types";

/** Preserve uncertainty: this engine models actions, not dose-dependent pharmacology. */
export function unsafeInterpretationReason(
  raw: string,
  actions: { actionId: string; value: string | null }[],
  catalog: ActionDefinition[],
): string | null {
  if (!actions.length) return null;
  const normalized = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(nao|sem|evitar|suspender|cancela|cancelar)\b/.test(normalized)) {
    // Cancellation/negation requires unambiguous positive action extraction. Never execute both.
    const allClearlyAffirmative = actions.every(a => a.actionId === "stop_triggering_agent");
    if (!allClearlyAffirmative) return "Pode repetir apenas as condutas que deseja executar agora?";
  }
  const highImpact = actions.some(a => {
    const category = catalog.find(c => c.id === a.actionId)?.category;
    return category === "medication" || category === "procedure";
  });
  if (highImpact && (actions.some(a => a.value !== null) || /\d\s*(mg|mcg|g|ml|ui|%|unidades)\b/i.test(raw))) {
    return "Esta estação ainda não valida doses específicas; essa administração não foi executada.";
  }
  return null;
}