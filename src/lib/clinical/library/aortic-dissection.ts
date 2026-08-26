/**
 * Dor torácica — dissecção aórtica tipo A (fictício).
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

export const aorticDissectionCase = defineCase({
  id: "case-ps-disseccao-aortica",
  title: "Dor torácica dilacerante com assimetria de pulsos",
  meta: {
    specialty: "emergencia",
    topic: "Dor torácica",
    subtopic: "Emergência aórtica",
    archetype: "chest_pain",
    setting: "emergency_department",
    difficulty: "avancado",
    clinicalSyndrome: "Dor torácica aguda de início súbito com má perfusão diferencial",
    primaryDiagnosis: "Dissecção aórtica tipo A de Stanford",
    dangerousDifferentials: ["Infarto agudo do miocárdio", "Tromboembolismo pulmonar", "Tamponamento cardíaco"],
    ageGroup: "adult",
    acuity: "critical",
    skills: ["diagnostic_reasoning", "prioritization", "treatment", "safety", "disposition"],
    compatibleDurations: ["15", "30"],
    estimatedMinutes: 20,
    review: { status: "needs_clinical_review" },
    keywords: ["dor toracica", "disseccao", "aorta", "dor dilacerante", "assimetria de pulso", "emergencia"],
  },
  setting: "Pronto-socorro de hospital terciário",
  opening:
    "Homem de 58 anos, hipertenso, chega com dor torácica intensa de início súbito há 30 minutos, irradiando para o dorso. Você assume o atendimento agora.",
  patient: {
    age: 58,
    biologicalSex: "male",
    chiefPresentation: "Dor torácica dilacerante de início abrupto, irradiada para o dorso",
    information: [
      info("info-obs", "observável", "Homem agitado, sudoreico, referindo dor intensa que 'rasga' as costas.", {
        kind: "observable",
      }),
      infoOnAction(
        "info-hda",
        "história",
        "A dor foi máxima desde o início, sem melhora com repouso, irradiando para a região interescapular.",
        "history_hpi",
      ),
      infoOnAction(
        "info-antecedentes",
        "antecedentes",
        "Hipertensão de difícil controle, com má adesão ao tratamento nos últimos meses.",
        "history_past",
      ),
      infoOnAction(
        "info-medicacoes",
        "medicações",
        "Deveria usar anlodipino e hidroclorotiazida; não toma há semanas. Sem anticoagulantes e sem alergias.",
        "history_medications",
      ),
    ],
  },
  initialState: patientState({
    circulation: { perfusion: "reduced", description: "Pulso radial direito amplo, esquerdo diminuído" },
    vitals: {
      heartRate: 108,
      respiratoryRate: 24,
      systolicBP: 198,
      diastolicBP: 108,
      oxygenSaturation: 96,
      temperatureC: 36.4,
    },
    tags: ["dissecção aórtica"],
  }),
  variableVitals: { systolicBP: [186, 198, 208], heartRate: [98, 108, 116] },
  hidden: {
    diagnosis: "Dissecção aórtica tipo A de Stanford",
    differentials: ["IAM", "TEP", "Tamponamento"],
    evaluation: {
      competencies: ["Suspeição diagnóstica", "Controle de frequência antes de vasodilatação", "Cirurgia precoce"],
      educationalPurpose:
        "Reconhecer a dissecção entre as dores torácicas e conduzir o controle pressórico na ordem correta.",
      rubricNotes: [
        "Anticoagulação/trombólise por hipótese equivocada de IAM é erro crítico autoral.",
        "Betabloqueio precede o vasodilatador para evitar taquicardia reflexa.",
      ],
    },
  },
  actions: [
    ...actions(
      [
        "check_vital_signs",
        "place_monitoring",
        "obtain_iv_access",
        "request_ecg",
        "request_chest_xray",
        "request_chest_ct",
        "request_laboratory_tests",
        "request_coagulation",
        "history_hpi",
        "history_past",
        "history_medications",
        "exam_cardiovascular",
        "exam_extremities",
        "reassess_vitals",
        "request_specialist",
        "disposition_or",
        "disposition_icu",
        "disposition_ward",
        "disposition_discharge",
      ],
      {
        request_specialist: {
          label: "Acionar cirurgia cardiovascular",
          immediateFact: "A cirurgia cardiovascular é acionada e solicita as imagens.",
          requestsInvestigationId: "inv_specialist",
        },
        reassess_vitals: {
          immediateFact: "Você reafere a pressão nos dois braços e checa os pulsos.",
          eventType: "vital_signs_change",
        },
        disposition_or: {
          immediateFact:
            "Paciente encaminhado ao centro cirúrgico com a equipe de cirurgia cardiovascular a postos.",
          statePatch: { addTags: ["tratamento definitivo", "estabilizado"] },
          eventType: "improvement_after_treatment",
        },
        disposition_icu: { immediateFact: "Vaga em terapia intensiva solicitada." },
        disposition_ward: { immediateFact: "Você solicita internação em enfermaria." },
        disposition_discharge: { immediateFact: "Você define alta hospitalar." },
      },
    ),
    action("administer_analgesia", {
      label: "Administrar analgesia opioide",
      category: "medication",
      immediateFact: "Analgesia intravenosa administrada; a dor reduz e a agitação diminui.",
      statePatch: { vitals: { heartRate: 96 }, addTags: ["dor controlada"] },
    }),
    action("administer_beta_blocker", {
      label: "Administrar betabloqueador intravenoso",
      category: "medication",
      immediateFact:
        "Betabloqueador intravenoso titulado: frequência cai para 68 bpm e a pressão para 148/84 mmHg.",
      statePatch: {
        vitals: { heartRate: 68, systolicBP: 148, diastolicBP: 84 },
        addTags: ["frequência controlada"],
      },
      eventType: "improvement_after_treatment",
    }),
    action("administer_vasodilator", {
      label: "Administrar vasodilatador intravenoso",
      category: "medication",
      prerequisites: ["administer_beta_blocker"],
      immediateFact: "Vasodilatador em bomba: pressão sistólica alcança 118 mmHg com frequência estável.",
      statePatch: {
        vitals: { systolicBP: 118, diastolicBP: 70 },
        addTags: ["pressão alvo atingida"],
      },
      eventType: "improvement_after_treatment",
    }),
    action("administer_anticoagulation", {
      label: "Administrar anticoagulação plena",
      category: "medication",
      immediateFact:
        "Anticoagulação plena iniciada. Minutos depois a pressão cai e o paciente fica mais pálido.",
      statePatch: {
        circulation: { perfusion: "poor", description: "Perfusão piorando após anticoagulação" },
        vitals: { systolicBP: 92, diastolicBP: 58, heartRate: 124 },
        addTags: ["sangramento", "deterioração"],
      },
      eventType: "physiologic_deterioration",
    }),
  ],
  examFindings: [
    finding("f-pulsos", "extremidades", "Pulso radial esquerdo francamente diminuído em relação ao direito.", "exam_extremities"),
    finding("f-pa-assimetrica", "cardiovascular", "Diferença de 32 mmHg de pressão sistólica entre os braços; sopro diastólico aórtico discreto.", "exam_cardiovascular"),
    finding("f-vitais", "geral", "Hipertensão importante com taquicardia e sudorese.", "check_vital_signs"),
  ],
  investigations: [
    investigation("inv_ecg", "ECG: taquicardia sinusal com sobrecarga ventricular esquerda, sem supradesnivelamento de ST.", {
      availabilityDelaySeconds: 60,
    }),
    investigation("inv_chest_xray", "Radiografia de tórax: alargamento do mediastino superior.", {
      availabilityDelaySeconds: 240,
    }),
    investigation(
      "inv_chest_ct",
      "Angiotomografia: flap intimal em aorta ascendente estendendo-se ao arco — dissecção tipo A, sem derrame pericárdico significativo.",
      { availabilityDelaySeconds: 600 },
    ),
    investigation("inv_labs", "Hemograma sem anemia; função renal preservada; lactato levemente elevado."),
    investigation("inv_coagulation", "Coagulograma normal; tipagem sanguínea e reserva de hemocomponentes providenciadas."),
    investigation("inv_specialist", "A cirurgia cardiovascular confirma indicação de correção cirúrgica de urgência."),
  ],
  timeTriggers: [
    trigger("trg-dor-240", 240, "O paciente refere que a dor migrou para a região lombar.", {
      conditions: [{ kind: "action_missing", actionId: "request_chest_ct" }],
      source: "omission_trigger",
      eventType: "new_symptom",
    }),
    trigger(
      "trg-hipotensao-600",
      600,
      "A enfermagem avisa que a pressão caiu para 86/52 mmHg e as bulhas estão abafadas.",
      {
        conditions: [{ kind: "all_actions_missing", actionIds: ["administer_beta_blocker", "disposition_or"] }],
        statePatch: {
          circulation: { perfusion: "poor", description: "Perfusão comprometida" },
          vitals: { systolicBP: 86, diastolicBP: 52, heartRate: 128 },
          addTags: ["deterioração", "tamponamento"],
        },
        branchId: "branch-deterioracao",
        source: "omission_trigger",
      },
    ),
  ],
  branches: [
    {
      id: "branch-deterioracao",
      label: "Progressão da dissecção",
      kind: "deterioration",
      tag: "deterioração",
      description: "Sem controle pressórico e sem definição cirúrgica, a dissecção progride para tamponamento.",
    },
  ],
  outcomes: [
    {
      id: "out-cirurgia",
      label: "Encaminhado à correção cirúrgica",
      kind: "stabilized",
      conditions: [{ kind: "has_tag", tag: "tratamento definitivo" }],
      description: "Diagnóstico confirmado, controle pressórico feito e cirurgia acionada.",
    },
  ],
  objectives: [
    {
      id: "obj-controle",
      label: "Controlar frequência e pressão na ordem correta",
      domain: "treatment",
      satisfiedByAnyOf: ["administer_beta_blocker"],
      critical: true,
      recommendedWindowSeconds: 480,
    },
  ],
  expectedActions: [
    expected("exam_extremities", {
      importance: "important",
      weight: 10,
      windowSeconds: 300,
      clinicalRelevance: "A assimetria de pulsos é a pista de exame físico que muda a hipótese.",
    }),
    expected("administer_beta_blocker", {
      importance: "critical",
      weight: 18,
      critical: true,
      windowSeconds: 480,
      objectiveId: "obj-controle",
      clinicalRelevance: "Reduzir frequência e força de ejeção limita a progressão da dissecção.",
      learningPoint: "Betabloqueio antes do vasodilatador evita taquicardia reflexa.",
      omission: {
        description: "O controle de frequência não foi iniciado.",
        consequenceTriggerId: "trg-hipotensao-600",
      },
    }),
    expected("request_chest_ct", {
      importance: "critical",
      weight: 18,
      critical: true,
      windowSeconds: 600,
      clinicalRelevance: "A angiotomografia confirma o diagnóstico e define o tipo de dissecção.",
    }),
    expected("disposition_or", {
      importance: "critical",
      weight: 18,
      critical: true,
      windowSeconds: 1080,
      clinicalRelevance: "Dissecção tipo A é emergência cirúrgica; estabilizar não substitui a cirurgia.",
      learningPoint: "Tratamento definitivo é o centro cirúrgico, não a unidade de terapia intensiva.",
    }),
    expected("request_specialist", { importance: "important", weight: 10, windowSeconds: 720 }),
    expected("administer_analgesia", { importance: "expected", weight: 6, windowSeconds: 420 }),
    expected("request_ecg", {
      importance: "expected",
      weight: 6,
      windowSeconds: 300,
      clinicalRelevance: "Afastar supradesnivelamento antes de qualquer decisão sobre anticoagulação.",
    }),
    expected("obtain_iv_access", { importance: "expected", weight: 5, windowSeconds: 240 }),
    expected("request_coagulation", { importance: "expected", weight: 5, windowSeconds: 600 }),
    expected("reassess_vitals", { importance: "important", weight: 8, windowSeconds: 720 }),
  ],
  scoring: {
    caseVersion: "1.0.0",
    scoringVersion: "phase-06",
    domains: ["diagnostic_reasoning", "investigation", "treatment", "prioritization", "safety", "disposition"],
    unsafeActions: [
      {
        actionId: "administer_anticoagulation",
        description: "Anticoagulação plena em dissecção aórtica, com risco de sangramento catastrófico.",
        domain: "safety",
        penaltyPoints: 25,
        onlyWithTag: "dissecção aórtica",
      },
      {
        actionId: "administer_vasodilator",
        description: "Vasodilatador isolado, sem betabloqueio prévio, com taquicardia reflexa.",
        domain: "safety",
        penaltyPoints: 10,
      },
      {
        actionId: "disposition_discharge",
        description: "Alta hospitalar com dissecção aórtica ativa.",
        domain: "safety",
        penaltyPoints: 30,
      },
    ],
    expectedManagement: [
      "Suspeitar de dissecção diante de dor dilacerante com assimetria de pulsos.",
      "Analgesia e controle de frequência com betabloqueador antes do vasodilatador.",
      "Angiotomografia de tórax para confirmação.",
      "Acionar cirurgia cardiovascular e encaminhar ao centro cirúrgico.",
    ],
    hypotheses: {
      essential: ["Dissecção aórtica"],
      acceptable: ["Síndrome aórtica aguda"],
      dangerous: ["IAM tratado com anticoagulação plena"],
    },
  },
  relevantSpecialties: ["Cirurgia cardiovascular", "Terapia intensiva"],
  completion: {
    resolutionActionIds: ["disposition_or"],
    stabilizedTag: "estabilizado",
    maxClinicalSeconds: 1800,
  },
  variants: [
    {
      id: "var-avancado-classico",
      label: "Assimetria evidente",
      difficulty: "avancado",
      reviewNote: "Pistas clássicas presentes desde o exame inicial.",
    },
    {
      id: "var-avancado-sutil",
      label: "Pistas sutis e pressão limítrofe",
      difficulty: "avancado",
      initialVitals: { systolicBP: 152, diastolicBP: 92, heartRate: 96 },
      triggerTimeShiftSeconds: 60,
      reviewNote: "Menor assimetria e pressão menos alarmante aumentam a ambiguidade diagnóstica.",
    },
  ],
});
