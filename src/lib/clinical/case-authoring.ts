/**
 * Phase 06.7 — Kit de autoria de casos (data-driven).
 *
 * Objetivo: um autor com conhecimento clínico escreve um caso RICO sem tocar
 * no motor. Aqui vivem apenas defaults estruturais reutilizáveis (rótulos,
 * categorias, atrasos de resultado). A VERDADE MÉDICA é sempre do caso.
 */
import type {
  ActionCategory,
  ActionDefinition,
  ClinicalCaseDefinition,
  ExamFinding,
  ExpectedAction,
  InvestigationCategory,
  InvestigationDefinition,
  PatientInformation,
  PatientState,
  TimeTrigger,
  TriggerCondition,
} from "./clinical-case-types";
import type { ClinicalCaseMeta } from "./case-taxonomy";
import type { ClinicalEventType } from "@/lib/shadow-trainer";

/* ------------------------------------------------------ estado inicial --- */

const baselineState: PatientState = {
  consciousness: "alert",
  airway: "patent",
  breathing: { effort: "normal", description: "Respiração espontânea, sem ruídos adventícios" },
  circulation: { perfusion: "normal", description: "Pulso radial cheio, extremidades tépidas" },
  neurologic: { gcs: 15, pupils: "isocoric_reactive", focalDeficit: false, seizing: false },
  vitals: {
    heartRate: 84,
    respiratoryRate: 16,
    systolicBP: 124,
    diastolicBP: 78,
    oxygenSaturation: 98,
    temperatureC: 36.5,
  },
  tags: [],
};

export function patientState(patch: {
  consciousness?: PatientState["consciousness"];
  airway?: PatientState["airway"];
  breathing?: Partial<PatientState["breathing"]>;
  circulation?: Partial<PatientState["circulation"]>;
  neurologic?: Partial<PatientState["neurologic"]>;
  vitals?: Partial<PatientState["vitals"]>;
  tags?: string[];
}): PatientState {
  return {
    consciousness: patch.consciousness ?? baselineState.consciousness,
    airway: patch.airway ?? baselineState.airway,
    breathing: { ...baselineState.breathing, ...patch.breathing },
    circulation: { ...baselineState.circulation, ...patch.circulation },
    neurologic: { ...baselineState.neurologic, ...patch.neurologic },
    vitals: { ...baselineState.vitals, ...patch.vitals },
    tags: [...(patch.tags ?? [])].sort(),
  };
}

/* --------------------------------------------------- catálogo de ações --- */

type CoreActionSpec = {
  label: string;
  category: ActionCategory;
  requestsInvestigationId?: string;
  prerequisites?: string[];
};

/**
 * Vocabulário canônico compartilhado por toda a biblioteca. Casos escolhem
 * quais ações existem e sobrescrevem o que for específico (fato imediato,
 * consequência fisiológica, pré-requisitos).
 */
export const coreActionCatalog: Record<string, CoreActionSpec> = {
  /* avaliação */
  assess_airway: { label: "Avaliar via aérea", category: "physical_exam" },
  assess_breathing: { label: "Avaliar respiração", category: "physical_exam" },
  assess_circulation: { label: "Avaliar circulação", category: "physical_exam" },
  neurologic_assessment: { label: "Avaliação neurológica", category: "physical_exam" },
  exam_general: { label: "Exame físico geral", category: "physical_exam" },
  exam_respiratory: { label: "Exame respiratório", category: "physical_exam" },
  exam_cardiovascular: { label: "Exame cardiovascular", category: "physical_exam" },
  exam_abdomen: { label: "Exame abdominal", category: "physical_exam" },
  exam_extremities: { label: "Exame de extremidades", category: "physical_exam" },
  exam_skin: { label: "Exame de pele e mucosas", category: "physical_exam" },
  check_vital_signs: { label: "Aferir sinais vitais", category: "monitoring" },

  /* suporte */
  place_monitoring: { label: "Instalar monitorização", category: "monitoring" },
  obtain_iv_access: { label: "Obter acesso venoso", category: "procedure" },
  obtain_io_access: { label: "Obter acesso intraósseo", category: "procedure" },
  administer_oxygen: { label: "Administrar oxigênio suplementar", category: "medication" },
  noninvasive_ventilation: { label: "Iniciar ventilação não invasiva", category: "procedure" },
  secure_airway: { label: "Assegurar via aérea definitiva", category: "procedure" },
  administer_fluids: { label: "Administrar cristaloide intravenoso", category: "medication" },

  /* investigações */
  check_capillary_glucose: {
    label: "Solicitar glicemia capilar",
    category: "investigation",
    requestsInvestigationId: "inv_capillary_glucose",
  },
  request_ecg: {
    label: "Solicitar ECG",
    category: "investigation",
    requestsInvestigationId: "inv_ecg",
  },
  request_laboratory_tests: {
    label: "Solicitar exames laboratoriais",
    category: "investigation",
    requestsInvestigationId: "inv_labs",
  },
  request_blood_gas: {
    label: "Solicitar gasometria",
    category: "investigation",
    requestsInvestigationId: "inv_blood_gas",
  },
  request_troponin: {
    label: "Solicitar troponina",
    category: "investigation",
    requestsInvestigationId: "inv_troponin",
  },
  request_lactate: {
    label: "Solicitar lactato",
    category: "investigation",
    requestsInvestigationId: "inv_lactate",
  },
  request_chest_xray: {
    label: "Solicitar radiografia de tórax",
    category: "investigation",
    requestsInvestigationId: "inv_chest_xray",
  },
  request_bedside_ultrasound: {
    label: "Realizar ultrassom à beira do leito",
    category: "investigation",
    requestsInvestigationId: "inv_bedside_us",
  },
  request_head_ct: {
    label: "Solicitar tomografia de crânio",
    category: "investigation",
    requestsInvestigationId: "inv_head_ct",
  },
  request_chest_ct: {
    label: "Solicitar angiotomografia de tórax",
    category: "investigation",
    requestsInvestigationId: "inv_chest_ct",
  },
  request_abdominal_ct: {
    label: "Solicitar tomografia de abdome",
    category: "investigation",
    requestsInvestigationId: "inv_abdominal_ct",
  },
  request_toxicology: {
    label: "Solicitar rastreio toxicológico",
    category: "investigation",
    requestsInvestigationId: "inv_toxicology",
  },
  request_coagulation: {
    label: "Solicitar coagulograma e tipagem",
    category: "investigation",
    requestsInvestigationId: "inv_coagulation",
  },

  /* história */
  history_hpi: { label: "Detalhar a história da doença atual", category: "history" },
  history_family: { label: "Colher história com a família", category: "history" },
  history_medications: { label: "Perguntar sobre medicações e alergias", category: "history" },
  history_prehospital: { label: "Perguntar sobre o pré-hospitalar", category: "history" },
  history_past: { label: "Perguntar antecedentes e comorbidades", category: "history" },
  history_social: { label: "Colher história social", category: "history" },

  /* condução */
  reassess_patient: { label: "Reavaliar paciente", category: "reassessment" },
  reassess_vitals: { label: "Reaferir sinais vitais", category: "reassessment" },
  request_specialist: { label: "Acionar especialista", category: "consultation" },
  communicate_team: { label: "Comunicar equipe e distribuir tarefas", category: "communication" },
  communicate_family: { label: "Comunicar a família", category: "communication" },

  /* destino */
  disposition_discharge: { label: "Definir alta", category: "disposition" },
  disposition_observation: { label: "Manter em observação", category: "disposition" },
  disposition_ward: { label: "Internar em enfermaria", category: "disposition" },
  disposition_icu: { label: "Encaminhar à terapia intensiva", category: "disposition" },
  disposition_cathlab: { label: "Encaminhar à hemodinâmica", category: "disposition" },
  disposition_or: { label: "Encaminhar ao centro cirúrgico", category: "disposition" },
  disposition_transfer: { label: "Transferir para serviço de referência", category: "disposition" },
};

export type ActionOverride = Partial<Omit<ActionDefinition, "id">>;

/** Cria uma ação a partir do catálogo canônico, com ajustes do caso. */
export function action(id: string, override: ActionOverride = {}): ActionDefinition {
  const base = coreActionCatalog[id];
  if (!base) {
    // Ação exclusiva do caso: rótulo e categoria são obrigatórios no override.
    return {
      id,
      label: override.label ?? id,
      category: override.category ?? "procedure",
      ...override,
    } as ActionDefinition;
  }
  return {
    id,
    label: base.label,
    category: base.category,
    ...(base.requestsInvestigationId
      ? { requestsInvestigationId: base.requestsInvestigationId }
      : {}),
    ...(base.prerequisites ? { prerequisites: base.prerequisites } : {}),
    ...override,
  };
}

/** Várias ações do catálogo de uma vez, com overrides por id. */
export function actions(
  ids: string[],
  overrides: Record<string, ActionOverride> = {},
): ActionDefinition[] {
  return ids.map((id) => action(id, overrides[id] ?? {}));
}

/* ------------------------------------------- catálogo de investigações --- */

type CoreInvestigationSpec = {
  name: string;
  category: InvestigationCategory;
  /** Atraso padrão de disponibilidade, em segundos de tempo clínico. */
  delay: number;
};

export const coreInvestigationCatalog: Record<string, CoreInvestigationSpec> = {
  inv_capillary_glucose: { name: "Glicemia capilar", category: "bedside", delay: 20 },
  inv_ecg: { name: "ECG de 12 derivações", category: "cardiac", delay: 90 },
  inv_blood_gas: { name: "Gasometria", category: "laboratory", delay: 240 },
  inv_labs: { name: "Exames laboratoriais", category: "laboratory", delay: 600 },
  inv_troponin: { name: "Troponina", category: "laboratory", delay: 600 },
  inv_lactate: { name: "Lactato", category: "laboratory", delay: 300 },
  inv_coagulation: { name: "Coagulograma e tipagem sanguínea", category: "laboratory", delay: 480 },
  inv_toxicology: { name: "Rastreio toxicológico", category: "laboratory", delay: 720 },
  inv_chest_xray: { name: "Radiografia de tórax", category: "imaging", delay: 300 },
  inv_bedside_us: { name: "Ultrassom à beira do leito", category: "bedside", delay: 120 },
  inv_head_ct: { name: "Tomografia de crânio", category: "imaging", delay: 900 },
  inv_chest_ct: { name: "Angiotomografia de tórax", category: "imaging", delay: 900 },
  inv_abdominal_ct: { name: "Tomografia de abdome", category: "imaging", delay: 900 },
  inv_specialist: { name: "Avaliação do especialista", category: "other", delay: 600 },
};

/** Investigação com atraso e categoria padrão; o RESULTADO é sempre autoral. */
export function investigation(
  id: string,
  result: string,
  override: Partial<Omit<InvestigationDefinition, "id" | "result">> = {},
): InvestigationDefinition {
  const base = coreInvestigationCatalog[id];
  return {
    id,
    name: override.name ?? base?.name ?? id,
    category: override.category ?? base?.category ?? "other",
    availabilityDelaySeconds: override.availabilityDelaySeconds ?? base?.delay ?? 300,
    result,
    ...override,
  };
}

/* ------------------------------------------------------------ builders --- */

export function info(
  id: string,
  group: string,
  content: string,
  availability: PatientInformation["availability"],
): PatientInformation {
  return { id, group, content, availability };
}

/** Informação liberada por uma ação de história/exame. */
export function infoOnAction(
  id: string,
  group: string,
  content: string,
  actionId: string,
): PatientInformation {
  return info(id, group, content, { kind: "requires_action", actionId });
}

export function finding(
  id: string,
  system: string,
  text: string,
  requiredAction: string,
  override: Partial<Omit<ExamFinding, "id" | "system" | "finding" | "requiredAction">> = {},
): ExamFinding {
  return {
    id,
    system,
    finding: text,
    requiredAction,
    availability: override.availability ?? "on_exam",
    ...override,
  };
}

export function expected(
  actionId: string,
  spec: {
    importance: ExpectedAction["importance"];
    weight: number;
    critical?: boolean;
    windowSeconds?: number;
    category?: ActionCategory;
    domain?: ExpectedAction["domain"];
    equivalentActionIds?: string[];
    objectiveId?: string;
    completionStatus?: ExpectedAction["completionStatus"];
    clinicalRelevance?: string;
    learningPoint?: string;
    omission?: ExpectedAction["omission"];
  },
): ExpectedAction {
  const category = spec.category ?? coreActionCatalog[actionId]?.category ?? "procedure";
  const base: ExpectedAction = {
    actionId,
    category,
    importance: spec.importance,
    scoreWeight: spec.weight,
    critical: spec.critical ?? false,
    completionStatus: spec.completionStatus ?? "performed",
  };
  if (spec.windowSeconds !== undefined) base.recommendedWindowSeconds = spec.windowSeconds;
  if (spec.domain) base.domain = spec.domain;
  if (spec.equivalentActionIds) base.equivalentActionIds = spec.equivalentActionIds;
  if (spec.objectiveId) base.objectiveId = spec.objectiveId;
  if (spec.clinicalRelevance) base.clinicalRelevance = spec.clinicalRelevance;
  if (spec.learningPoint) base.learningPoint = spec.learningPoint;
  if (spec.omission) base.omission = spec.omission;
  return base;
}

export function trigger(
  id: string,
  atClinicalSecond: number,
  fact: string,
  spec: {
    eventType?: ClinicalEventType;
    conditions?: TriggerCondition[];
    statePatch?: TimeTrigger["statePatch"];
    source?: TimeTrigger["source"];
    once?: boolean;
    branchId?: string;
  } = {},
): TimeTrigger {
  const t: TimeTrigger = {
    id,
    atClinicalSecond,
    conditions: spec.conditions ?? [{ kind: "always" }],
    source: spec.source ?? "time_trigger",
    eventType: spec.eventType ?? "clinical_deterioration",
    fact,
    once: spec.once ?? true,
  };
  if (spec.statePatch) t.statePatch = spec.statePatch;
  if (spec.branchId) t.branchId = spec.branchId;
  return t;
}

/* --------------------------------------------------------- defineCase ---- */

export type CaseSpec = Omit<ClinicalCaseDefinition, "fictional" | "themeId" | "level" | "scoring"> & {
  themeId?: string;
  scoring: Omit<ClinicalCaseDefinition["scoring"], "lateCreditFactor" | "incompleteCreditFactor"> &
    Partial<Pick<ClinicalCaseDefinition["scoring"], "lateCreditFactor" | "incompleteCreditFactor">>;
};

const specialtyToTheme: Record<string, string> = {
  emergencia: "emergencia",
  cardiologia: "cardiologia",
  neurologia: "neurologia",
  infectologia: "infectologia",
  pneumologia: "pneumologia",
  "terapia-intensiva": "terapia-intensiva",
  "clinica-medica": "clinica-medica",
  pediatria: "pediatria",
  cirurgia: "cirurgia",
};

/** Monta a definição final aplicando defaults estruturais. */
export function defineCase(spec: CaseSpec): ClinicalCaseDefinition {
  const meta: ClinicalCaseMeta = spec.meta;
  return {
    ...spec,
    themeId: spec.themeId ?? specialtyToTheme[meta.specialty] ?? "emergencia",
    level: meta.difficulty,
    scoring: {
      lateCreditFactor: 0.6,
      incompleteCreditFactor: 0.4,
      ...spec.scoring,
    },
    fictional: true,
  };
}
