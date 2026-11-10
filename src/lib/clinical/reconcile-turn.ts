import { applyAction, buildAction } from "./clinical-case-engine";
import type { ClinicalCaseDefinition, ClinicalCaseRuntime } from "./clinical-case-types";

/** Interpretations may arrive after clock events. Never replace newer patient truth. */
export function reconcileTurn(
  current: ClinicalCaseRuntime,
  returned: ClinicalCaseRuntime,
  def: ClinicalCaseDefinition,
): ClinicalCaseRuntime {
  if (current.caseId !== returned.caseId) return current;
  if (returned.actionLog.length <= current.actionLog.length) return current;
  let next = current;
  for (const action of returned.actionLog.slice(current.actionLog.length)) {
    const built = buildAction(def, next, action.actionId, action.source, action.timestamp);
    next = applyAction(next, { ...built, ...(action.params ? { params: action.params } : {}) }, def).runtime;
  }
  return next;
}