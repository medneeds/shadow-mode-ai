/**
 * Anafilaxia após antibiótico intravenoso (fictício).
 * Conteúdo clínico: needs_clinical_review.
 */
import {
  action,
  actions,
  defineCase,
  expected,
  finding,
  info,
  infoOnAction,
  investigation,
  patientState,
  trigger,
} from "../case-authoring";

export const anaphylaxisCase = defineCase({
  id: "case-ps-anafilaxia-antibiotico",
  title: "Reação grave logo após antibiótico intravenoso",
  meta: {
    specialty: "emergencia",
    topic: "Reação alérgica",
    subtopic: "Anafilaxia",
    archetype: "shock",
    setting: "emergency_department",
    difficulty: "basico",
    clinicalSyndrome: "Urticária, estridor e hipotensão de início súbito",
    primaryDiagnosis: "Anafilaxia",
    dangerousDifferentials: ["Angioedema por IECA", "Crise asmática", "Choque séptico"],
    ageGroup: "adult",
    acuity: "critical",
    skills: ["initial_approach", "treatment", "prioritization", "reassessment", "safety"],
    compatibleDurations: ["3", "5", "15"],
    estimatedMinutes: 8,
    review: { status: "needs_clinical_review" },
    keywords: ["anafilaxia", "alergia", "adrenalina", "urticaria", "estridor", "choque", "edema de glote"],
  },
  setting: "Sala de medicação do pronto-socorro",
  opening:
    "Homem de 31 anos começou a passar mal três minutos depois de receber antibiótico intravenoso. A enfermagem chama você agora.",
  patient: {
    age: 31,
    biologicalSex: "male",
    chiefPresentation: "Prurido, placas na pele e falta de ar após medicação intravenosa",
    information: [
      info("info-obs", "observável", "Paciente agitado, com placas eritematosas no tronco e voz abafada.", {
        kind: "observable",
      }),
      infoOnAction(
        "info-hda",
        "história",
        "Começou com coceira nas mãos, depois garganta fechando e falta de ar. Nunca aconteceu antes.",
        "history_hpi",
      ),
      infoOnAction(
        "info-medicacoes",
        "medicações",
        "Recebeu a primeira dose do antibiótico há três minutos. Não usa outras medicações e não sabia ter alergia.",
        "history_medications",
      ),
    ],
  },
  initialState: patientState({
    consciousness: "alert",
    airway: "threatened",
    breathing: { effort: "labored", description: "Estridor inspiratório e sibilos difusos" },
    circulation: { perfusion: "reduced", description: "Extremidades quentes, pulso fino e rápido" },
    vitals: {
      heartRate: 128,
      respiratoryRate: 30,
      systolicBP: 84,
      diastolicBP: 46,
      oxygenSaturation: 91,
      temperatureC: 36.6,
    },
    tags: ["anafilaxia", "exposição ao alérgeno em curso"],
  }),
  variableVitals: { heartRate: [120, 128, 136], systolicBP: [78, 84, 90], oxygenSaturation: [89, 91, 93] },
  hidden: {
    diagnosis: "Anafilaxia com comprometimento de via aérea e hipotensão",
    differentials: ["Angioedema", "Broncoespasmo"],
    evaluation: {
      competencies: ["Reconhecimento imediato", "Adrenalina intramuscular", "Suspensão do agente", "Reavaliação"],
      educationalPurpose: "Tratar anafilaxia com adrenalina intramuscular sem atraso e sem substituí-la por adjuvantes.",
      rubricNotes: [
        "Adrenalina IM é a única medida que altera o desfecho; anti-histamínico e corticoide são adjuvantes.",
        "Alta precoce sem observação é insegura pelo risco de reação bifásica.",
      ],
    },
  },
  actions: [
    ...actions(
      [
        "check_vital_signs",
        "place_monitoring",
        "obtain_iv_access",
        "administer_oxygen",
        "administer_fluids",
        "assess_airway",
        "exam_skin",
        "exam_respiratory",
        "history_hpi",
        "history_medications",
        "secure_airway",
        "reassess_vitals",
        "disposition_observation",
        "disposition_icu",
        "disposition_discharge",
      ],
      {
        administer_oxygen: {
          immediateFact: "Oxigênio em alto fluxo instalado; a saturação sobe para 95%.",
          statePatch: { vitals: { oxygenSaturation: 95 } },
        },
        administer_fluids: {
          immediateFact: "Cristaloide em infusão rápida: a pressão sobe discretamente para 92/54 mmHg.",
          statePatch: { vitals: { systolicBP: 92, diastolicBP: 54 }, addTags: ["volume iniciado"] },
        },
        secure_airway: {
          immediateFact: "Via aérea definitiva assegurada com o paciente sedado e monitorizado.",
          statePatch: { airway: "secured", addTags: ["via aérea protegida"] },
        },
        reassess_vitals: {
          immediateFact: "Você reafere os sinais vitais e reavalia a via aérea.",
          eventType: "vital_signs_change",
        },
        disposition_observation: {
          immediateFact: "Paciente mantido em observação monitorizada por risco de reação bifásica.",
          statePatch: { addTags: ["observação prolongada"] },
        },
        disposition_icu: { immediateFact: "Paciente encaminhado à terapia intensiva para monitorização." },
        disposition_discharge: { immediateFact: "Você define alta hospitalar." },
      },
    ),
    action("stop_offending_agent", {
      label: "Suspender o agente desencadeante",
      category: "procedure",
      immediateFact: "A infusão do antibiótico é interrompida imediatamente e o equipo é trocado.",
      statePatch: { removeTags: ["exposição ao alérgeno em curso"] },
    }),
    action("administer_epinephrine_im", {
      label: "Administrar adrenalina intramuscular",
      category: "medication",
      patchRequiresTag: "anafilaxia",
      immediateFact:
        "Adrenalina intramuscular na face anterolateral da coxa: em um minuto o estridor reduz e a pressão sobe para 104/62 mmHg.",
      ineffectiveFact: "Adrenalina administrada sem indicação identificada no caso.",
      statePatch: {
        airway: "patent",
        breathing: { effort: "increased", description: "Sibilos residuais, sem estridor" },
        circulation: { perfusion: "normal", description: "Perfusão restabelecida" },
        vitals: { systolicBP: 104, diastolicBP: 62, heartRate: 112, oxygenSaturation: 95 },
        addTags: ["adrenalina administrada", "tratamento definitivo", "estabilizado"],
      },
      eventType: "improvement_after_treatment",
    }),
    action("administer_antihistamine", {
      label: "Administrar anti-histamínico",
      category: "medication",
      immediateFact: "Anti-histamínico administrado; o prurido melhora, sem mudança na via aérea ou na pressão.",
    }),
    action("administer_corticosteroid", {
      label: "Administrar corticoide",
      category: "medication",
      immediateFact: "Corticoide intravenoso administrado; sem efeito imediato sobre o quadro agudo.",
    }),
  ],
  examFindings: [
    finding("f-pele", "pele", "Urticária difusa em tronco e membros, com edema de lábios.", "exam_skin"),
    finding("f-via-aerea", "via aérea", "Estridor inspiratório audível e voz abafada.", "assess_airway", {
      hiddenWithTag: "adrenalina administrada",
    }),
    finding("f-resp", "respiratório", "Sibilos difusos bilaterais com tempo expiratório prolongado.", "exam_respiratory"),
    finding("f-vitais", "geral", "Hipotensão com taquicardia e saturação de 91%.", "check_vital_signs"),
  ],
  investigations: [],
  timeTriggers: [
    trigger(
      "trg-via-aerea-120",
      120,
      "O estridor se intensifica e o paciente passa a apresentar tiragem e cianose perioral.",
      {
        conditions: [{ kind: "action_missing", actionId: "administer_epinephrine_im" }],
        statePatch: {
          airway: "obstructed",
          breathing: { effort: "inadequate", description: "Obstrução alta progressiva" },
          vitals: { oxygenSaturation: 84, systolicBP: 74, diastolicBP: 40 },
          addTags: ["deterioração"],
        },
        branchId: "branch-obstrucao",
        source: "omission_trigger",
      },
    ),
    trigger("trg-choque-240", 240, "O paciente fica sonolento, com pressão de 66/38 mmHg.", {
      conditions: [{ kind: "action_missing", actionId: "administer_epinephrine_im" }],
      statePatch: {
        consciousness: "somnolent",
        circulation: { perfusion: "poor", description: "Choque distributivo instalado" },
        vitals: { systolicBP: 66, diastolicBP: 38, heartRate: 140 },
      },
      branchId: "branch-obstrucao",
      source: "omission_trigger",
    }),
  ],
  branches: [
    {
      id: "branch-obstrucao",
      label: "Obstrução de via aérea e choque",
      kind: "deterioration",
      tag: "deterioração",
      description: "Sem adrenalina, o edema de via aérea progride e o choque se instala.",
    },
  ],
  outcomes: [
    {
      id: "out-revertido",
      label: "Anafilaxia revertida",
      kind: "stabilized",
      conditions: [
        { kind: "has_tag", tag: "adrenalina administrada" },
        { kind: "has_tag", tag: "estabilizado" },
      ],
      description: "Adrenalina intramuscular precoce com reversão do quadro.",
    },
  ],
  objectives: [
    {
      id: "obj-adrenalina",
      label: "Administrar adrenalina sem atraso",
      domain: "treatment",
      satisfiedByAnyOf: ["administer_epinephrine_im"],
      critical: true,
      recommendedWindowSeconds: 120,
    },
  ],
  expectedActions: [
    expected("administer_epinephrine_im", {
      importance: "critical",
      weight: 32,
      critical: true,
      windowSeconds: 120,
      objectiveId: "obj-adrenalina",
      clinicalRelevance: "É a única medida que reverte a obstrução de via aérea e o choque na anafilaxia.",
      learningPoint: "Adrenalina intramuscular primeiro; anti-histamínico e corticoide nunca a substituem.",
      omission: {
        description: "A adrenalina intramuscular não foi administrada na janela.",
        consequenceTriggerId: "trg-via-aerea-120",
        consequence: "A via aérea evoluiu com obstrução e o paciente entrou em choque.",
      },
    }),
    expected("stop_offending_agent", {
      importance: "critical",
      weight: 14,
      critical: true,
      windowSeconds: 120,
      clinicalRelevance: "Manter a infusão perpetua a exposição ao alérgeno.",
    }),
    expected("administer_oxygen", { importance: "important", weight: 10, windowSeconds: 180 }),
    expected("administer_fluids", {
      importance: "important",
      weight: 10,
      windowSeconds: 300,
      clinicalRelevance: "A vasodilatação da anafilaxia exige reposição volêmica associada.",
    }),
    expected("place_monitoring", { importance: "expected", weight: 6, windowSeconds: 180 }),
    expected("assess_airway", { importance: "important", weight: 8, windowSeconds: 120 }),
    expected("history_medications", { importance: "expected", weight: 6, windowSeconds: 300 }),
    expected("reassess_vitals", { importance: "important", weight: 8, windowSeconds: 360 }),
    expected("disposition_observation", {
      importance: "important",
      weight: 12,
      windowSeconds: 600,
      equivalentActionIds: ["disposition_icu"],
      clinicalRelevance: "A reação bifásica pode ocorrer horas depois; observação monitorizada é obrigatória.",
    }),
  ],
  scoring: {
    caseVersion: "1.0.0",
    scoringVersion: "phase-06",
    domains: ["initial_approach", "treatment", "prioritization", "reassessment", "safety", "disposition"],
    unsafeActions: [
      {
        actionId: "disposition_discharge",
        description: "Alta imediata após anafilaxia, sem período de observação.",
        domain: "safety",
        penaltyPoints: 25,
      },
    ],
    expectedManagement: [
      "Suspender o agente desencadeante imediatamente.",
      "Administrar adrenalina intramuscular sem atraso.",
      "Oxigênio, monitorização, acesso venoso e reposição volêmica.",
      "Reavaliar a resposta e manter observação monitorizada.",
    ],
    hypotheses: {
      essential: ["Anafilaxia"],
      acceptable: ["Reação alérgica grave", "Angioedema com broncoespasmo"],
      dangerous: ["Crise de ansiedade", "Broncoespasmo isolado tratado apenas com broncodilatador"],
    },
  },
  relevantSpecialties: ["Emergência", "Alergia e imunologia"],
  completion: {
    resolutionActionIds: ["administer_epinephrine_im", "disposition_observation"],
    stabilizedTag: "estabilizado",
    maxClinicalSeconds: 900,
  },
  variants: [
    {
      id: "var-basico-classico",
      label: "Anafilaxia clássica pós-medicação",
      difficulty: "basico",
      reviewNote: "Gatilho evidente e apresentação típica.",
    },
    {
      id: "var-intermediario-sem-urticaria",
      label: "Anafilaxia sem urticária",
      difficulty: "intermediario",
      initialVitals: { systolicBP: 76, diastolicBP: 42, heartRate: 134, oxygenSaturation: 88 },
      triggerTimeShiftSeconds: -30,
      reviewNote: "Sem lesões cutâneas evidentes, o reconhecimento depende de via aérea e hipotensão.",
    },
  ],
});
