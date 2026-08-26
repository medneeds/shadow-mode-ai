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
import type { EvaluationDomain } from "@/lib/evaluation/evaluation-types";
import type { ClinicalCaseMeta } from "./case-taxonomy";

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
  /** Peso no algoritmo determinístico de avaliação (Phase 06). */
  scoreWeight: number;
  critical: boolean;
  /** Janela clínica recomendada, em segundos de tempo clínico. */
  recommendedWindowSeconds?: number;
  prerequisites?: string[];
  /** Status considerado suficiente. */
  completionStatus: ActionStatus;
  /** Domínio de avaliação (Phase 06). Sem isto, deriva-se da categoria. */
  domain?: EvaluationDomain;
  /**
   * Ações clinicamente equivalentes que satisfazem a MESMA ação esperada.
   * Evita punir uma conduta válida só porque não é a da solução de referência.
   */
  equivalentActionIds?: string[];
  /** Objetivo clínico ao qual a ação pertence (ver `objectives`). */
  objectiveId?: string;
  /** Por que a ação importa clinicamente — usado no debriefing pós-estação. */
  clinicalRelevance?: string;
  /** Ensino acionável para "Como melhorar" (pós-estação, nunca durante). */
  learningPoint?: string;
  /** Consequência definida pelo caso quando a ação crítica é omitida. */
  omission?: {
    description: string;
    /** Só é exibida se este gatilho realmente disparou na estação. */
    consequenceTriggerId?: string;
    consequence?: string;
  };
};

/** Ação explicitamente insegura, definida pelo caso (nunca inferida pelo LLM). */
export type UnsafeActionRule = {
  actionId: string;
  description: string;
  domain: EvaluationDomain;
  /** Pontos subtraídos do total (0..100). */
  penaltyPoints: number;
  /** Só é insegura se o paciente tiver esta tag no momento da ação. */
  onlyWithTag?: string;
};

/** Metadados de pontuação/debriefing do caso. Autoridade absoluta da rubrica. */
export type CaseScoringMetadata = {
  caseVersion: string;
  scoringVersion: string;
  /** Domínios aplicáveis a este caso. */
  domains: EvaluationDomain[];
  /** Crédito parcial para ação correta realizada fora da janela (0..1). */
  lateCreditFactor: number;
  /** Crédito parcial para ação solicitada mas não concluída (0..1). */
  incompleteCreditFactor: number;
  unsafeActions?: UnsafeActionRule[];
  /** Conduta esperada do caso — revelada apenas após a estação. */
  expectedManagement: string[];
  hypotheses?: {
    essential: string[];
    acceptable: string[];
    dangerous: string[];
  };
};


/* -------------------------------------------------------- gatilhos ------- */

export type TriggerCondition =
  | { kind: "always" }
  | { kind: "action_missing"; actionId: string }
  | { kind: "action_performed"; actionId: string }
  | { kind: "all_actions_missing"; actionIds: string[] }
  | { kind: "any_action_performed"; actionIds: string[] }
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
  /** Ramo clínico ao qual este gatilho pertence (rastreabilidade/debriefing). */
  branchId?: string;
};

/* ------------------------------------------------ objetivos / ramos ------ */

/**
 * Objetivo clínico: o que precisa ser alcançado, independentemente de QUAL
 * ação válida o trainee escolheu. Base da robustez da pontuação.
 */
export type ClinicalObjective = {
  id: string;
  label: string;
  domain: EvaluationDomain;
  /** Qualquer uma destas ações satisfaz o objetivo. */
  satisfiedByAnyOf: string[];
  critical: boolean;
  recommendedWindowSeconds?: number;
};

/** Ramo clínico predefinido (estabilização, deterioração, complicação...). */
export type CaseBranch = {
  id: string;
  label: string;
  kind: "stabilization" | "deterioration" | "complication" | "alternative";
  /** Tag que marca o paciente quando o ramo é atingido. */
  tag: string;
  description: string;
};

/** Desfecho predefinido do caso. Nem toda estação termina em cura. */
export type CaseOutcomeDefinition = {
  id: string;
  label: string;
  kind: CaseOutcome;
  /** Todas as condições precisam ser verdadeiras ao encerrar a estação. */
  conditions: TriggerCondition[];
  description: string;
};

/* ----------------------------------------------------------- variantes --- */

/**
 * Variante controlada: NUNCA gera verdade médica nova — apenas ajusta campos
 * explicitamente autorizados dentro de limites clinicamente válidos.
 */
export type ClinicalCaseVariant = {
  id: string;
  label: string;
  /** Quando definido, a variante muda a dificuldade efetiva do caso. */
  difficulty?: LevelId;
  patient?: { age?: number; biologicalSex?: "female" | "male"; chiefPresentation?: string };
  opening?: string;
  initialVitals?: Partial<VitalSigns>;
  addTags?: string[];
  removeTags?: string[];
  /** Informações extras (comorbidades, fatores de risco, contraindicações). */
  extraInformation?: PatientInformation[];
  /** Achados de exame adicionais desta variante. */
  extraExamFindings?: ExamFinding[];
  /** Substituição de resultados de investigação por id. */
  investigationResults?: Record<string, string>;
  /** Gatilhos adicionais (complicações, evolução alternativa). */
  extraTimeTriggers?: TimeTrigger[];
  /** Deslocamento (segundos) aplicado aos gatilhos base — muda o timing. */
  triggerTimeShiftSeconds?: number;
  reviewNote?: string;
};

/* --------------------------------------------------------- definição ----- */

export type ClinicalCaseDefinition = {
  id: string;
  title: string;
  /** Metadados de taxonomia/descoberta e status de revisão clínica. */
  meta: ClinicalCaseMeta;
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
  /** Objetivos clínicos satisfeitos por conjuntos de ações equivalentes. */
  objectives?: ClinicalObjective[];
  /** Ramos clínicos predefinidos do caso. */
  branches?: CaseBranch[];
  /** Desfechos possíveis. */
  outcomes?: CaseOutcomeDefinition[];
  /** Variantes controladas e clinicamente validadas. */
  variants?: ClinicalCaseVariant[];
  /**
   * Randomização controlada: apenas estes sinais vitais podem variar, e
   * somente dentro dos valores listados (verdade médica continua autoral).
   */
  variableVitals?: Partial<Record<keyof VitalSigns, number[]>>;
  /** Variante aplicada em runtime (reprodutibilidade). */
  variantId?: string | null;
  /** Semente usada na randomização controlada (reprodutibilidade). */
  seed?: number;
  examFindings: ExamFinding[];
  investigations: InvestigationDefinition[];
  timeTriggers: TimeTrigger[];
  /** Rubrica determinística (Phase 06). */
  scoring: CaseScoringMetadata;
  completion: {
    /** Ações que caracterizam desfecho conduzido. */
    resolutionActionIds: string[];
    /** Tag que caracteriza paciente estabilizado. */
    stabilizedTag: string;
    maxClinicalSeconds: number;
  };
  /** Especialidades cuja interconsulta é apropriada neste caso. */
  relevantSpecialties?: string[];
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
