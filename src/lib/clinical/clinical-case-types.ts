/**
 * Phase 03 — Clinical Case Engine: tipos.
 *
 * Camadas (nunca misturar):
 * 1. Clinical Case Engine  — verdade médica (este módulo + clinical-case-engine.ts).
 * 2. Shadow Trainer Engine — estilo de comunicação (src/lib/shadow-trainer.ts).
 * 3. Voice Engine          — áudio (Phase 05, não existe aqui).
 *
 * O motor emite FATOS clínicos em pt-BR. Ele não escreve personalidade,
 * não dá dicas e não conhece voz/áudio/LLM.
 */
import type { ClinicalEventType } from "@/lib/shadow-trainer";
import type { LevelId } from "@/lib/shadow-content";

/* ---------------------------------------------------------------- ações ---- */

export type ActionCategory =
  | "history"
  | "physical_exam"
  | "monitoring"
  | "investigation"
  | "medication"
  | "procedure"
  | "consultation"
  | "disposition"
  | "reassessment"
  | "communication";

export type ActionStatus =
  | "not_performed"
  | "requested"
  | "performed"
  | "completed"
  | "not_applicable";

export type ActionSource = "trainee" | "dev_harness" | "system";

/** Ação submetida ao motor. Timestamp real e tempo clínico são independentes. */
export type TraineeAction = {
  id: string;
  /** Id do catálogo de ações do caso. */
  actionId: string;
  type: ActionCategory;
  /** Epoch ms (wall clock) — apenas auditoria. */
  timestamp: number;
  /** Segundos de tempo clínico decorridos quando a ação foi submetida. */
  clinicalTime: number;
  params?: Record<string, string | number | boolean>;
  source: ActionSource;
};

export type LoggedAction = TraineeAction & {
  /** Rótulo pt-BR exibível na linha do tempo da estação. */
  label: string;
  status: ActionStatus;
};

/* ------------------------------------------------------------ estado ------ */

export type ConsciousnessLevel = "alert" | "confused" | "somnolent" | "unresponsive";
export type AirwayState = "patent" | "threatened" | "obstructed" | "secured";
export type PerfusionState = "normal" | "reduced" | "poor";
export type BreathingEffort = "normal" | "increased" | "labored" | "inadequate" | "apneic";
export type PupilState = "isocoric_reactive" | "miotic" | "mydriatic" | "anisocoric";

export type VitalSigns = {
  heartRate: number;
  respiratoryRate: number;
  systolicBP: number;
  diastolicBP: number;
  oxygenSaturation: number;
  temperatureC: number;
  /** Só existe depois de medida/aferida no caso. */
  glucoseMgDl?: number;
};

export type PatientState = {
  consciousness: ConsciousnessLevel;
  airway: AirwayState;
  breathing: { effort: BreathingEffort; description: string };
  circulation: { perfusion: PerfusionState; description: string };
  neurologic: { gcs: number; pupils: PupilState; focalDeficit: boolean; seizing: boolean };
  vitals: VitalSigns;
  /** Marcadores livres definidos pelo caso (ex.: "hipoglicemia", "via aérea protegida"). */
  tags: string[];
};

/** Patch determinístico e parcial do estado (merge raso por seção). */
export type PatientStatePatch = {
  consciousness?: ConsciousnessLevel;
  airway?: AirwayState;
  breathing?: Partial<PatientState["breathing"]>;
  circulation?: Partial<PatientState["circulation"]>;
  neurologic?: Partial<PatientState["neurologic"]>;
  vitals?: Partial<VitalSigns>;
  addTags?: string[];
  removeTags?: string[];
};

/* ------------------------------------------------------------ eventos ----- */

export type ClinicalEventSourceKind =
  | "trainee_action"
  | "time_trigger"
  | "omission_trigger"
  | "investigation_result"
  | "treatment_response"
  | "state_transition";

/** Fato clínico objetivo. O Shadow Trainer Engine é quem dá tom a isso. */
export type EngineClinicalEvent = {
  id: string;
  type: ClinicalEventType;
  source: ClinicalEventSourceKind;
  /** Texto factual pt-BR, sem sugestão de conduta. */
  fact: string;
  atClinicalSecond: number;
  /** Rastreabilidade interna (reprodutibilidade, debriefing, debug). */
  causeActionId?: string;
  causeTriggerId?: string;
  causeInvestigationId?: string;
};

/* --------------------------------------------------- perfil / disclosure -- */

export type InformationAvailability =
  | { kind: "opening" }
  | { kind: "observable" }
  | { kind: "requires_action"; actionId: string }
  | { kind: "requires_investigation"; investigationId: string }
  | { kind: "requires_state"; tag: string };

export type PatientInformation = {
  id: string;
  /** Ex.: "história", "medicações", "alergias", "social", "família", "SAMU". */
  group: string;
  /** Conteúdo pt-BR revelável ao trainee. */
  content: string;
  availability: InformationAvailability;
};

export type PatientProfile = {
  age: number;
  biologicalSex: "female" | "male";
  chiefPresentation: string;
  /** Informações com regra de disponibilidade — nada é entregue automaticamente. */
  information: PatientInformation[];
};

/* --------------------------------------------------------- exame físico --- */

export type ExamFinding = {
  id: string;
  system: string;
  /** Achado pt-BR. */
  finding: string;
  /** Ação de exame que revela o achado. */
  requiredAction: string;
  availability: "observable" | "on_exam";
  /** Quando presente, o achado só vale se o paciente tiver esta tag. */
  onlyWithTag?: string;
  /** Quando presente, o achado é omitido se o paciente tiver esta tag. */
  hiddenWithTag?: string;
};

/* ------------------------------------------------------- investigações ---- */

export type InvestigationCategory = "bedside" | "laboratory" | "imaging" | "cardiac" | "other";

export type InvestigationDefinition = {
  id: string;
  name: string;
  category: InvestigationCategory;
  /** Tempo clínico entre solicitação e disponibilidade do resultado. */
  availabilityDelaySeconds: number;
  /** Resultado determinístico pt-BR. */
  result: string;
  /** Ações necessárias antes de solicitar (ex.: acesso venoso para exames). */
  prerequisites?: string[];
  /** Patch aplicado quando o resultado fica disponível (ex.: glicemia medida). */
  resultStatePatch?: PatientStatePatch;
  eventType?: ClinicalEventType;
  relevance?: "diagnostic" | "supportive" | "screening";
};

export type InvestigationRuntimeStatus = "not_requested" | "requested" | "available" | "delivered";

export type InvestigationRuntime = {
  status: InvestigationRuntimeStatus;
  requestedAtSecond?: number;
  availableAtSecond?: number;
};

/* ------------------------------------------------- catálogo de ações ------ */

export type ActionDefinition = {
  id: string;
  label: string;
  category: ActionCategory;
  /** Fato pt-BR devolvido imediatamente (ex.: resultado de avaliação). */
  immediateFact?: string;
  eventType?: ClinicalEventType;
  /** Solicita uma investigação (fluxo pedido → espera → resultado). */
  requestsInvestigationId?: string;
  /** Consequência fisiológica predefinida (tratamentos/procedimentos). */
  statePatch?: PatientStatePatch;
  /** Patch aplicado somente se o paciente tiver a tag (resposta condicional). */
  patchRequiresTag?: string;
  /** Fato alternativo quando `patchRequiresTag` não é satisfeita. */
  ineffectiveFact?: string;
  /** Ids de PatientInformation liberados por esta ação. */
  disclosesInformationIds?: string[];
  /** Só executável se estas ações já tiverem ocorrido. */
  prerequisites?: string[];
  /** Status final após execução. */
  resultingStatus?: ActionStatus;
};

/* ---------------------------------------------- ações esperadas / score -- */

export type ActionImportance = "optional" | "expected" | "important" | "critical";

export type ExpectedAction = {
  actionId: string;
  category: ActionCategory;
  importance: ActionImportance;
  /** Peso para o algoritmo de avaliação futuro (não calculado nesta fase). */
  scoreWeight: number;
  critical: boolean;
  /** Janela clínica recomendada, em segundos de tempo clínico. */
  recommendedWindowSeconds?: number;
  prerequisites?: string[];
  /** Status considerado suficiente. */
  completionStatus: ActionStatus;
};

/* -------------------------------------------------------- gatilhos ------- */

export type TriggerCondition =
  | { kind: "always" }
  | { kind: "action_missing"; actionId: string }
  | { kind: "action_performed"; actionId: string }
  | { kind: "has_tag"; tag: string }
  | { kind: "missing_tag"; tag: string };

/** Gatilho de tempo determinístico: nenhum LLM decide deterioração. */
export type TimeTrigger = {
  id: string;
  atClinicalSecond: number;
  /** Todas as condições precisam ser verdadeiras. */
  conditions: TriggerCondition[];
  source: ClinicalEventSourceKind;
  eventType: ClinicalEventType;
  fact: string;
  statePatch?: PatientStatePatch;
  once: boolean;
};

/* --------------------------------------------------------- definição ----- */

export type ClinicalCaseDefinition = {
  id: string;
  title: string;
  themeId: string;
  level: LevelId;
  setting: string;
  /** Declaração de abertura lida ao trainee. */
  opening: string;
  patient: PatientProfile;
  initialState: PatientState;
  /** Oculto durante a estação ativa. */
  hidden: {
    diagnosis: string;
    differentials: string[];
    /** Metadados de avaliação — nunca expostos ao trainee em estação ativa. */
    evaluation: {
      competencies: string[];
      educationalPurpose: string;
      rubricNotes: string[];
    };
  };
  actions: ActionDefinition[];
  expectedActions: ExpectedAction[];
  examFindings: ExamFinding[];
  investigations: InvestigationDefinition[];
  timeTriggers: TimeTrigger[];
  completion: {
    /** Ações que caracterizam desfecho conduzido. */
    resolutionActionIds: string[];
    /** Tag que caracteriza paciente estabilizado. */
    stabilizedTag: string;
    maxClinicalSeconds: number;
  };
  /** Aviso permanente: ambiente de treinamento, caso fictício. */
  fictional: true;
};

/* ----------------------------------------------------------- runtime ----- */

export type CaseOutcome = "in_progress" | "stabilized" | "deteriorated" | "arrested";

export type ClinicalCaseRuntime = {
  caseId: string;
  elapsedClinicalSeconds: number;
  patient: PatientState;
  actionLog: LoggedAction[];
  events: EngineClinicalEvent[];
  investigations: Record<string, InvestigationRuntime>;
  expectedActionStatus: Record<string, ActionStatus>;
  disclosedInformationIds: string[];
  firedTriggerIds: string[];
  outcome: CaseOutcome;
  /** Contador determinístico para ids de evento (sem Math.random). */
  eventSeq: number;
};

export type EngineResult = {
  runtime: ClinicalCaseRuntime;
  /** Eventos emitidos apenas nesta chamada. */
  newEvents: EngineClinicalEvent[];
};
