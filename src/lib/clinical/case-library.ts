/**
 * Phase 06.7 — Registro central da biblioteca de casos.
 *
 * Fonte única de verdade sobre QUAIS casos existem. Nenhum LLM entra aqui:
 * todo caso é definição determinística validada pelo `case-validation`.
 */
import type { ClinicalCaseDefinition } from "./clinical-case-types";
import { referenceCase } from "./reference-cases";
import { opioidIntoxicationCase } from "./library/opioid-intoxication";
import { stemiCase } from "./library/stemi";
import { aorticDissectionCase } from "./library/aortic-dissection";
import { pulmonaryEmbolismCase } from "./library/pulmonary-embolism";
import { septicShockCase } from "./library/septic-shock";
import { anaphylaxisCase } from "./library/anaphylaxis";

export const caseLibrary: ClinicalCaseDefinition[] = [
  referenceCase,
  opioidIntoxicationCase,
  stemiCase,
  aorticDissectionCase,
  pulmonaryEmbolismCase,
  septicShockCase,
  anaphylaxisCase,
];

const byId = new Map(caseLibrary.map((c) => [c.id, c]));

/** Caso por id; volta ao caso de referência quando o id é desconhecido. */
export function getCaseById(caseId: string | null | undefined): ClinicalCaseDefinition {
  return (caseId ? byId.get(caseId) : undefined) ?? referenceCase;
}

export function hasCase(caseId: string): boolean {
  return byId.has(caseId);
}
