/**
 * Phase 03 — Clinical Case Engine (determinístico, sem LLM).
 *
 * Contrato:
 * - Nenhuma mutação: toda função recebe runtime e devolve um novo runtime.
 * - Mesma definição + mesma sequência de ações + mesmos tempos ⇒ mesmo resultado.
 * - O motor emite fatos clínicos; não escreve tom, não dá dicas, não conhece voz.
 */
import type {
  ActionDefinition,
  ActionStatus,
  ClinicalCaseDefinition,
  ClinicalCaseRuntime,
  EngineClinicalEvent,
  EngineResult,
  ExamFinding,
  PatientInformation,
  PatientState,
  PatientStatePatch,
  TimeTrigger,
  TraineeAction,
  TriggerCondition,
} from "./clinical-case-types";

/* --------------------------------------------------------------- utils ---- */

export function formatClinicalClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function applyPatch(state: PatientState, patch?: PatientStatePatch): PatientState {
  if (!patch) return state;
  const tags = new Set(state.tags);
  patch.addTags?.forEach((t) => tags.add(t));
  patch.removeTags?.forEach((t) => tags.delete(t));
  return {
    consciousness: patch.consciousness ?? state.consciousness,
    airway: patch.airway ?? state.airway,
    breathing: { ...state.breathing, ...patch.breathing },
    circulation: { ...state.circulation, ...patch.circulation },
    neurologic: { ...state.neurologic, ...patch.neurologic },
    vitals: { ...state.vitals, ...patch.vitals },
    tags: [...tags].sort(),
  };
}

function actionDef(def: ClinicalCaseDefinition, actionId: string): ActionDefinition | undefined {
  return def.actions.find((a) => a.id === actionId);
}

function hasPerformed(runtime: ClinicalCaseRuntime, actionId: string): boolean {
  return runtime.actionLog.some((a) => a.actionId === actionId);
}

function evaluateCondition(
  condition: TriggerCondition,
  runtime: ClinicalCaseRuntime,
): boolean {
  switch (condition.kind) {
    case "always":
      return true;
    case "action_missing":
      return !hasPerformed(runtime, condition.actionId);
    case "action_performed":
      return hasPerformed(runtime, condition.actionId);
    case "all_actions_missing":
      return condition.actionIds.every((id) => !hasPerformed(runtime, id));
    case "any_action_performed":
      return condition.actionIds.some((id) => hasPerformed(runtime, id));
    case "has_tag":
      return runtime.patient.tags.includes(condition.tag);
    case "missing_tag":
      return !runtime.patient.tags.includes(condition.tag);
  }
}

function makeEvent(
  runtime: ClinicalCaseRuntime,
  event: Omit<EngineClinicalEvent, "id" | "atClinicalSecond">,
): EngineClinicalEvent {
  return {
    ...event,
    id: `evt-${runtime.eventSeq + 1}`,
    atClinicalSecond: runtime.elapsedClinicalSeconds,
  };
}

function pushEvents(
  runtime: ClinicalCaseRuntime,
  events: EngineClinicalEvent[],
): ClinicalCaseRuntime {
  if (events.length === 0) return runtime;
  return {
    ...runtime,
    events: [...runtime.events, ...events],
    eventSeq: runtime.eventSeq + events.length,
  };
}

function deriveOutcome(
  runtime: ClinicalCaseRuntime,
  def: ClinicalCaseDefinition,
): ClinicalCaseRuntime["outcome"] {
  const { patient } = runtime;

  // Desfechos autorais do caso têm precedência sobre a heurística genérica.
  for (const outcome of def.outcomes ?? []) {
    if (outcome.conditions.every((c) => evaluateCondition(c, runtime))) return outcome.kind;
  }

  if (patient.tags.includes("parada cardiorrespiratória")) return "arrested";
  if (patient.tags.includes(def.completion.stabilizedTag)) return "stabilized";
  if (patient.consciousness === "unresponsive" && patient.airway !== "secured") {
    return runtime.elapsedClinicalSeconds > 0 && patient.tags.includes("deterioração")
      ? "deteriorated"
      : "in_progress";
  }
  if (patient.tags.includes("deterioração")) return "deteriorated";
  return "in_progress";
}

/* ------------------------------------------------------- inicialização ---- */

export function initializeCase(def: ClinicalCaseDefinition): ClinicalCaseRuntime {
  const investigations: ClinicalCaseRuntime["investigations"] = {};
  for (const inv of def.investigations) investigations[inv.id] = { status: "not_requested" };

  const expectedActionStatus: Record<string, ActionStatus> = {};
  for (const expected of def.expectedActions)
    expectedActionStatus[expected.actionId] = "not_performed";

  const disclosedInformationIds = def.patient.information
    .filter((i) => i.availability.kind === "opening" || i.availability.kind === "observable")
    .map((i) => i.id);

  return {
    caseId: def.id,
    elapsedClinicalSeconds: 0,
    patient: def.initialState,
    actionLog: [],
    events: [],
    investigations,
    expectedActionStatus,
    disclosedInformationIds,
    firedTriggerIds: [],
    outcome: "in_progress",
    eventSeq: 0,
  };
}

/* --------------------------------------------------------- applyAction ---- */

export function applyAction(
  runtime: ClinicalCaseRuntime,
  action: TraineeAction,
  def: ClinicalCaseDefinition,
): EngineResult {
  const definition = actionDef(def, action.actionId);
  if (!definition) {
    // Ação desconhecida: registrada, sem efeito clínico (o motor nunca inventa verdade).
    const next: ClinicalCaseRuntime = {
      ...runtime,
      actionLog: [
        ...runtime.actionLog,
        { ...action, label: action.actionId, status: "not_applicable" },
      ],
    };
    return { runtime: next, newEvents: [] };
  }

  const missingPrereq = (definition.prerequisites ?? []).filter((p) => !hasPerformed(runtime, p));
  if (missingPrereq.length > 0) {
    const next: ClinicalCaseRuntime = {
      ...runtime,
      actionLog: [
        ...runtime.actionLog,
        { ...action, label: definition.label, status: "not_applicable" },
      ],
    };
    return { runtime: next, newEvents: [] };
  }

  const newEvents: EngineClinicalEvent[] = [];
  let next: ClinicalCaseRuntime = { ...runtime };

  // 1. Consequência fisiológica predefinida (tratamento/procedimento).
  const patchApplies =
    definition.statePatch !== undefined &&
    (!definition.patchRequiresTag || runtime.patient.tags.includes(definition.patchRequiresTag));

  if (patchApplies) {
    next = { ...next, patient: applyPatch(next.patient, definition.statePatch) };
  }

  // 2. Fato imediato / resposta ao tratamento.
  const fact =
    definition.statePatch && !patchApplies
      ? definition.ineffectiveFact ?? definition.immediateFact
      : definition.immediateFact;

  if (fact) {
    newEvents.push(
      makeEvent(next, {
        type: definition.eventType ?? (patchApplies ? "improvement_after_treatment" : "new_symptom"),
        source: definition.statePatch ? "treatment_response" : "trainee_action",
        fact,
        causeActionId: definition.id,
      }),
    );
  }

  // 3. Achados de exame revelados por esta ação.
  for (const finding of examFindingsFor(def, next, definition.id)) {
    newEvents.push(
      makeEvent(next, {
        type: "new_symptom",
        source: "trainee_action",
        fact: finding.finding,
        causeActionId: definition.id,
      }),
    );
  }

  // 4. Informação de história liberada.
  const disclosed = new Set(next.disclosedInformationIds);
  for (const info of def.patient.information) {
    const rule = info.availability;
    if (rule.kind === "requires_action" && rule.actionId === definition.id) disclosed.add(info.id);
  }
  definition.disclosesInformationIds?.forEach((id) => disclosed.add(id));
  next = { ...next, disclosedInformationIds: [...disclosed] };

  // 5. Solicitação de investigação (pedido → espera → resultado).
  let status: ActionStatus = definition.resultingStatus ?? "performed";
  if (definition.requestsInvestigationId) {
    const inv = def.investigations.find((i) => i.id === definition.requestsInvestigationId);
    if (inv) {
      const unmet = (inv.prerequisites ?? []).filter((p) => !hasPerformed(runtime, p));
      if (unmet.length === 0) {
        next = {
          ...next,
          investigations: {
            ...next.investigations,
            [inv.id]: {
              status: "requested",
              requestedAtSecond: next.elapsedClinicalSeconds,
              availableAtSecond: next.elapsedClinicalSeconds + inv.availabilityDelaySeconds,
            },
          },
        };
        status = "requested";
      } else {
        status = "not_applicable";
      }
    }
  }

  // 6. Log da ação.
  next = {
    ...next,
    actionLog: [...next.actionLog, { ...action, label: definition.label, status }],
  };

  // 7. Status de ação esperada.
  if (definition.id in next.expectedActionStatus) {
    next = {
      ...next,
      expectedActionStatus: { ...next.expectedActionStatus, [definition.id]: status },
    };
  }

  next = pushEvents(next, newEvents);
  next = { ...next, outcome: deriveOutcome(next, def) };
  return { runtime: next, newEvents };
}

/* ------------------------------------------------- advanceClinicalTime ---- */

/**
 * Avança o tempo clínico segundo a segundo, avaliando de forma determinística:
 * disponibilidade de investigações e gatilhos de tempo/omissão.
 */
export function advanceClinicalTime(
  runtime: ClinicalCaseRuntime,
  seconds: number,
  def: ClinicalCaseDefinition,
): EngineResult {
  let next = runtime;
  const newEvents: EngineClinicalEvent[] = [];
  const steps = Math.max(0, Math.floor(seconds));

  for (let i = 0; i < steps; i += 1) {
    next = { ...next, elapsedClinicalSeconds: next.elapsedClinicalSeconds + 1 };

    // Investigações que ficaram disponíveis neste segundo.
    for (const inv of def.investigations) {
      const state = next.investigations[inv.id];
      if (!state || state.status !== "requested") continue;
      if ((state.availableAtSecond ?? Infinity) > next.elapsedClinicalSeconds) continue;

      next = {
        ...next,
        investigations: { ...next.investigations, [inv.id]: { ...state, status: "available" } },
        patient: applyPatch(next.patient, inv.resultStatePatch),
      };
      const event = makeEvent(next, {
        type:
          inv.eventType ??
          (inv.category === "imaging" ? "imaging_result_available" : "lab_result_available"),
        source: "investigation_result",
        fact: inv.result,
        causeInvestigationId: inv.id,
      });
      next = pushEvents(next, [event]);
      newEvents.push(event);
    }

    // Gatilhos de tempo / omissão.
    for (const trigger of def.timeTriggers) {
      if (trigger.once && next.firedTriggerIds.includes(trigger.id)) continue;
      if (trigger.atClinicalSecond !== next.elapsedClinicalSeconds) continue;
      if (!trigger.conditions.every((c) => evaluateCondition(c, next))) continue;

      next = {
        ...next,
        patient: applyPatch(next.patient, trigger.statePatch),
        firedTriggerIds: [...next.firedTriggerIds, trigger.id],
      };
      const event = makeEvent(next, {
        type: trigger.eventType,
        source: trigger.source,
        fact: trigger.fact,
        causeTriggerId: trigger.id,
      });
      next = pushEvents(next, [event]);
      newEvents.push(event);
    }
  }

  next = { ...next, outcome: deriveOutcome(next, def) };
  return { runtime: next, newEvents };
}

/* --------------------------------------------- divulgação de informação --- */

function examFindingsFor(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  actionId: string,
): ExamFinding[] {
  return def.examFindings.filter((f) => {
    if (f.requiredAction !== actionId) return false;
    if (f.onlyWithTag && !runtime.patient.tags.includes(f.onlyWithTag)) return false;
    if (f.hiddenWithTag && runtime.patient.tags.includes(f.hiddenWithTag)) return false;
    return true;
  });
}

/** Marca resultados como entregues (o Trainer Engine já comunicou). */
export function markInvestigationDelivered(
  runtime: ClinicalCaseRuntime,
  investigationId: string,
): ClinicalCaseRuntime {
  const state = runtime.investigations[investigationId];
  if (!state || state.status !== "available") return runtime;
  return {
    ...runtime,
    investigations: { ...runtime.investigations, [investigationId]: { ...state, status: "delivered" } },
  };
}

/**
 * Tudo — e somente — o que o Sombra pode comunicar neste momento.
 * Diagnóstico oculto, ações esperadas, rubrica e gatilhos nunca aparecem aqui.
 */
export function disclosableInformation(
  runtime: ClinicalCaseRuntime,
  def: ClinicalCaseDefinition,
): {
  opening: string;
  information: PatientInformation[];
  investigationResults: { id: string; name: string; result: string }[];
  events: EngineClinicalEvent[];
  observedState: {
    consciousness: PatientState["consciousness"];
    airway: PatientState["airway"];
    vitals: PatientState["vitals"];
  };
} {
  const information = def.patient.information.filter((info) => {
    if (!runtime.disclosedInformationIds.includes(info.id)) {
      const rule = info.availability;
      if (rule.kind === "requires_investigation") {
        const st = runtime.investigations[rule.investigationId]?.status;
        return st === "available" || st === "delivered";
      }
      if (rule.kind === "requires_state") return runtime.patient.tags.includes(rule.tag);
      return false;
    }
    return true;
  });

  const investigationResults = def.investigations
    .filter((inv) => {
      const st = runtime.investigations[inv.id]?.status;
      return st === "available" || st === "delivered";
    })
    .map((inv) => ({ id: inv.id, name: inv.name, result: inv.result }));

  return {
    opening: def.opening,
    information,
    investigationResults,
    events: runtime.events,
    observedState: {
      consciousness: runtime.patient.consciousness,
      airway: runtime.patient.airway,
      vitals: runtime.patient.vitals,
    },
  };
}

/** Ajuda a construir uma TraineeAction determinística no harness/dev. */
export function buildAction(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  actionId: string,
  source: TraineeAction["source"] = "trainee",
  timestamp = 0,
): TraineeAction {
  const definition = actionDef(def, actionId);
  return {
    id: `act-${runtime.actionLog.length + 1}`,
    actionId,
    type: definition?.category ?? "communication",
    timestamp,
    clinicalTime: runtime.elapsedClinicalSeconds,
    source,
  };
}
