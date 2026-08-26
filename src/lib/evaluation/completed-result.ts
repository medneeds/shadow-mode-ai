/**
 * CompletedTrainingResult — resultado durável de uma estação.
 *
 * Já está pronto para persistência (Phase 07) e para alimentar /historico e
 * /desempenho. Nesta fase vive apenas em memória: nada é gravado em banco.
 */
import type { ClinicalCaseDefinition, ClinicalCaseRuntime } from "@/lib/clinical/clinical-case-types";
import type { TrainingSession } from "@/lib/training-session";
import { buildTimeline, buildTranscript, evaluateSession } from "./evaluation-engine";
import type { CompletedTrainingResult, Debriefing } from "./evaluation-types";

export const ENGINE_VERSION = "phase-06";

export function buildCompletedResult(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  session: TrainingSession,
  debriefing: Debriefing | null = null,
): CompletedTrainingResult {
  const evaluation = evaluateSession(def, runtime, session);
  return {
    sessionId: session.id,
    caseId: def.id,
    caseTitle: def.title,
    configuration: session.config,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    durationSeconds: session.durationSeconds,
    clinicalSecondsElapsed: runtime.elapsedClinicalSeconds,
    evaluation,
    timeline: buildTimeline(def, runtime),
    transcript: buildTranscript(def, session),
    debriefing,
    meta: {
      caseVersion: def.scoring.caseVersion,
      scoringVersion: def.scoring.scoringVersion,
      engineVersion: ENGINE_VERSION,
    },
  };
}
