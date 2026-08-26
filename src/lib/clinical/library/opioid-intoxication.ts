/**
 * Rebaixamento de consciência — intoxicação por opioide (caso fictício).
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

export const opioidIntoxicationCase = defineCase({
  id: "case-ps-opioide-24",
  title: "Homem jovem encontrado sem resposta com bradipneia",
  meta: {
    specialty: "emergencia",
    topic: "Rebaixamento do nível de consciência",
    subtopic: "Intoxicação exógena",
    archetype: "poisoning",
    setting: "emergency_department",
    difficulty: "basico",
    clinicalSyndrome: "Coma com depressão respiratória",
    primaryDiagnosis: "Intoxicação por opioide",
    dangerousDifferentials: ["Hipoglicemia", "Trauma cranioencefálico", "Sepse", "Hipóxia primária"],
    ageGroup: "adult",
    acuity: "critical",
    skills: ["initial_approach", "treatment", "reassessment", "safety", "disposition"],
    compatibleDurations: ["3", "5", "15"],
    estimatedMinutes: 10,
    review: { status: "needs_clinical_review" },
    keywords: ["intoxicacao", "opioide", "overdose", "coma", "bradipneia", "naloxona", "toxicologia"],
  },
  setting: "Sala de emergência de pronto-socorro",
  opening:
    "Homem de 24 anos é trazido pelo SAMU sem resposta, encontrado no banheiro de um bar. Respira lentamente. Você assume o atendimento agora.",
  patient: {
    age: 24,
    biologicalSex: "male",
    chiefPresentation: "Encontrado sem resposta, com respiração lenta e superficial",
    information: [
      info("info-obs", "observável", "Jovem em maca, sem resposta ao chamado, respiração lenta.", {
        kind: "observable",
      }),
      infoOnAction(
        "info-samu",
        "SAMU",
        "A equipe relata que ele foi encontrado caído, sem sinais de trauma, e que havia seringas próximas.",
        "history_prehospital",
      ),
      infoOnAction(
        "info-acompanhante",
        "acompanhante",
        "Um amigo diz que ele usa heroína há alguns anos e que hoje 'usou mais que o normal'.",
        "history_family",
      ),
      infoOnAction(
        "info-medicacoes",
        "medicações",
        "Sem medicações de uso contínuo. Sem alergias conhecidas.",
        "history_medications",
      ),
    ],
  },
  initialState: patientState({
    consciousness: "unresponsive",
    airway: "threatened",
    breathing: { effort: "inadequate", description: "Respiração lenta e superficial, sem esforço" },
    neurologic: { gcs: 6, pupils: "miotic" },
    vitals: {
      heartRate: 58,
      respiratoryRate: 6,
      systolicBP: 108,
      diastolicBP: 64,
      oxygenSaturation: 86,
      temperatureC: 36,
    },
    tags: ["opioide", "depressão respiratória"],
  }),
  variableVitals: { heartRate: [52, 58, 62], oxygenSaturation: [82, 86, 88] },
  hidden: {
    diagnosis: "Intoxicação por opioide com depressão respiratória",
    differentials: ["Hipoglicemia", "TCE", "Intoxicação por benzodiazepínico", "Sepse"],
    evaluation: {
      competencies: ["Suporte ventilatório imediato", "Antídoto específico", "Reavaliação", "Destino seguro"],
      educationalPurpose:
        "Reconhecer a tríade clínica de opioide e priorizar ventilação antes de exames.",
      rubricNotes: [
        "Ventilar com bolsa-válvula-máscara antes de qualquer exame é o ponto central.",
        "Alta precoce após naloxona é conduta insegura pela meia-vida curta do antídoto.",
      ],
    },
  },
  actions: [
    ...actions(
      [
        "assess_airway",
        "assess_breathing",
        "assess_circulation",
        "neurologic_assessment",
        "check_vital_signs",
        "place_monitoring",
        "obtain_iv_access",
        "administer_oxygen",
        "check_capillary_glucose",
        "request_blood_gas",
        "request_toxicology",
        "history_prehospital",
        "history_family",
        "history_medications",
        "exam_skin",
        "reassess_patient",
        "secure_airway",
        "disposition_observation",
        "disposition_discharge",
        "disposition_icu",
      ],
      {
        administer_oxygen: {
          immediateFact: "Oxigênio suplementar instalado. A saturação sobe pouco.",
          statePatch: { vitals: { oxygenSaturation: 90 } },
        },
        reassess_patient: {
          immediateFact: "Você reavalia o paciente à beira do leito.",
          eventType: "reassessment_result",
        },
        secure_airway: {
          immediateFact: "Via aérea definitiva estabelecida com sequência rápida de intubação.",
          statePatch: { airway: "secured", breathing: { effort: "normal" }, addTags: ["via aérea protegida"] },
        },
        disposition_discharge: {
          immediateFact: "Você define alta hospitalar.",
        },
        disposition_observation: {
          immediateFact:
            "Paciente mantido em observação monitorizada pelo risco de recorrência da depressão respiratória.",
          statePatch: { addTags: ["estabilizado"] },
        },
        disposition_icu: {
          immediateFact: "Vaga de terapia intensiva acionada.",
          statePatch: { addTags: ["estabilizado"] },
        },
      },
    ),
    action("bag_mask_ventilation", {
      label: "Ventilar com bolsa-válvula-máscara",
      category: "procedure",
      immediateFact:
        "Você inicia ventilação com bolsa-válvula-máscara. A saturação sobe para 95% e o tórax expande bem.",
      statePatch: {
        breathing: { effort: "normal", description: "Ventilação assistida eficaz" },
        vitals: { oxygenSaturation: 95 },
        addTags: ["ventilação assistida"],
      },
      eventType: "improvement_after_treatment",
    }),
    action("administer_naloxone", {
      label: "Administrar naloxona",
      category: "medication",
      patchRequiresTag: "opioide",
      immediateFact:
        "Poucos minutos após a naloxona o paciente abre os olhos, responde ao chamado e a respiração normaliza.",
      ineffectiveFact: "A naloxona é administrada e não há mudança no quadro.",
      statePatch: {
        consciousness: "confused",
        airway: "patent",
        breathing: { effort: "normal", description: "Respiração espontânea eficaz" },
        neurologic: { gcs: 14, pupils: "isocoric_reactive" },
        vitals: { respiratoryRate: 16, oxygenSaturation: 96, heartRate: 82 },
        addTags: ["revertido com naloxona"],
        removeTags: ["depressão respiratória"],
      },
      eventType: "improvement_after_treatment",
    }),
  ],
  examFindings: [
    finding("f-pupilas", "neurológico", "Pupilas puntiformes e pouco reativas.", "neurologic_assessment"),
    finding("f-gcs", "neurológico", "Glasgow 6, sem déficit focal e sem sinais de trauma.", "neurologic_assessment"),
    finding("f-pele", "pele", "Marcas de punção venosa recente em fossa antecubital esquerda.", "exam_skin"),
    finding("f-via-aerea", "via aérea", "Via aérea pérvia, mas sem proteção adequada pelo rebaixamento.", "assess_airway"),
    finding("f-resp", "respiratório", "Respiração de 6 incursões por minuto, murmúrio vesicular presente.", "assess_breathing"),
    finding(
      "f-resp-pos",
      "respiratório",
      "Respiração eupneica, com boa expansibilidade.",
      "assess_breathing",
      { onlyWithTag: "revertido com naloxona" },
    ),
  ],
  investigations: [
    investigation("inv_capillary_glucose", "Glicemia capilar: 96 mg/dL.", {
      resultStatePatch: { vitals: { glucoseMgDl: 96 } },
    }),
    investigation(
      "inv_blood_gas",
      "Gasometria arterial: pH 7,21, pCO2 68 mmHg, pO2 62 mmHg, bicarbonato 24 — acidose respiratória aguda.",
    ),
    investigation("inv_toxicology", "Rastreio toxicológico urinário positivo para opiáceos."),
  ],
  timeTriggers: [
    trigger(
      "trg-dessaturacao-120",
      120,
      "A enfermagem informa que a saturação caiu para 78% e a respiração está mais lenta.",
      {
        conditions: [{ kind: "all_actions_missing", actionIds: ["bag_mask_ventilation", "administer_naloxone", "secure_airway"] }],
        statePatch: { vitals: { oxygenSaturation: 78, respiratoryRate: 4 }, addTags: ["deterioração"] },
        branchId: "branch-deterioracao",
        source: "omission_trigger",
      },
    ),
    trigger(
      "trg-bradicardia-240",
      240,
      "O monitor mostra bradicardia de 38 bpm com respiração agônica.",
      {
        conditions: [
          { kind: "all_actions_missing", actionIds: ["bag_mask_ventilation", "administer_naloxone", "secure_airway"] },
        ],
        statePatch: { vitals: { heartRate: 38, oxygenSaturation: 70 }, addTags: ["pré-parada"] },
        branchId: "branch-deterioracao",
        source: "omission_trigger",
      },
    ),
    trigger(
      "trg-recorrencia-600",
      600,
      "A enfermagem chama: o paciente voltou a ficar sonolento e a respiração desacelerou novamente.",
      {
        conditions: [
          { kind: "action_performed", actionId: "administer_naloxone" },
          { kind: "all_actions_missing", actionIds: ["disposition_observation", "disposition_icu"] },
        ],
        statePatch: { consciousness: "somnolent", vitals: { respiratoryRate: 8 }, addTags: ["recorrência"] },
        branchId: "branch-recorrencia",
        eventType: "clinical_deterioration",
      },
    ),
  ],
  branches: [
    {
      id: "branch-deterioracao",
      label: "Deterioração por hipoventilação",
      kind: "deterioration",
      tag: "deterioração",
      description: "Sem suporte ventilatório nem antídoto, a hipoventilação evolui para hipóxia grave.",
    },
    {
      id: "branch-recorrencia",
      label: "Recorrência pós-naloxona",
      kind: "complication",
      tag: "recorrência",
      description: "A meia-vida da naloxona é menor que a do opioide: sem observação, o quadro recorre.",
    },
  ],
  outcomes: [
    {
      id: "out-estabilizado",
      label: "Revertido e mantido em ambiente monitorizado",
      kind: "stabilized",
      conditions: [
        { kind: "has_tag", tag: "revertido com naloxona" },
        { kind: "has_tag", tag: "estabilizado" },
      ],
      description: "Antídoto administrado e destino seguro definido.",
    },
  ],
  objectives: [
    {
      id: "obj-ventilacao",
      label: "Garantir ventilação e oxigenação",
      domain: "initial_approach",
      satisfiedByAnyOf: ["bag_mask_ventilation", "secure_airway"],
      critical: true,
      recommendedWindowSeconds: 120,
    },
    {
      id: "obj-destino",
      label: "Definir destino seguro",
      domain: "disposition",
      satisfiedByAnyOf: ["disposition_observation", "disposition_icu"],
      critical: true,
      recommendedWindowSeconds: 600,
    },
  ],
  expectedActions: [
    expected("assess_airway", { importance: "important", weight: 6, windowSeconds: 90 }),
    expected("bag_mask_ventilation", {
      importance: "critical",
      weight: 22,
      critical: true,
      windowSeconds: 120,
      equivalentActionIds: ["secure_airway"],
      objectiveId: "obj-ventilacao",
      clinicalRelevance: "A morte na intoxicação por opioide vem da hipoventilação, não do opioide em si.",
      learningPoint: "Ventile antes de investigar: bolsa-válvula-máscara é a primeira intervenção.",
      omission: {
        description: "Suporte ventilatório não foi oferecido a um paciente em hipoventilação grave.",
        consequenceTriggerId: "trg-bradicardia-240",
        consequence: "O paciente evoluiu com bradicardia e hipóxia crítica.",
      },
    }),
    expected("administer_naloxone", {
      importance: "critical",
      weight: 20,
      critical: true,
      windowSeconds: 300,
      clinicalRelevance: "Antídoto específico que reverte a depressão respiratória.",
      learningPoint: "Titule a naloxona pela ventilação, não pelo nível de consciência.",
      omission: {
        description: "O antídoto específico não foi administrado.",
        consequenceTriggerId: "trg-dessaturacao-120",
      },
    }),
    expected("check_capillary_glucose", {
      importance: "important",
      weight: 10,
      windowSeconds: 240,
      clinicalRelevance: "Todo rebaixamento exige glicemia capilar precoce.",
    }),
    expected("obtain_iv_access", { importance: "expected", weight: 8, windowSeconds: 240 }),
    expected("place_monitoring", { importance: "expected", weight: 6, windowSeconds: 180 }),
    expected("neurologic_assessment", { importance: "expected", weight: 8, windowSeconds: 240 }),
    expected("history_prehospital", { importance: "expected", weight: 6, windowSeconds: 420 }),
    expected("reassess_patient", {
      importance: "important",
      weight: 8,
      windowSeconds: 480,
      clinicalRelevance: "Reavaliar confirma a resposta ao antídoto.",
    }),
    expected("disposition_observation", {
      importance: "critical",
      weight: 12,
      critical: true,
      windowSeconds: 780,
      equivalentActionIds: ["disposition_icu"],
      objectiveId: "obj-destino",
      clinicalRelevance: "A naloxona tem meia-vida curta; o paciente precisa de observação monitorizada.",
      learningPoint: "Não dê alta após naloxona: o risco de recorrência é real.",
      omission: {
        description: "Destino seguro não foi definido após a reversão.",
        consequenceTriggerId: "trg-recorrencia-600",
      },
    }),
  ],
  scoring: {
    caseVersion: "1.0.0",
    scoringVersion: "phase-06",
    domains: ["initial_approach", "investigation", "treatment", "reassessment", "safety", "disposition"],
    unsafeActions: [
      {
        actionId: "disposition_discharge",
        description: "Alta hospitalar após naloxona, com risco de recorrência da depressão respiratória.",
        domain: "safety",
        penaltyPoints: 20,
      },
    ],
    expectedManagement: [
      "Reconhecer a hipoventilação e ventilar imediatamente com bolsa-válvula-máscara.",
      "Verificar glicemia capilar em todo rebaixamento de consciência.",
      "Administrar naloxona titulada pela ventilação.",
      "Manter observação monitorizada pelo risco de recorrência.",
    ],
    hypotheses: {
      essential: ["Intoxicação por opioide"],
      acceptable: ["Intoxicação exógena mista", "Hipoglicemia"],
      dangerous: ["Alta precoce por 'melhora clínica' após naloxona"],
    },
  },
  relevantSpecialties: ["Toxicologia clínica", "Terapia intensiva"],
  completion: {
    resolutionActionIds: ["administer_naloxone", "disposition_observation"],
    stabilizedTag: "estabilizado",
    maxClinicalSeconds: 900,
  },
  variants: [
    {
      id: "var-basico-classico",
      label: "Apresentação clássica",
      difficulty: "basico",
      reviewNote: "Tríade completa e história do acompanhante disponível desde cedo.",
    },
    {
      id: "var-intermediario-hipoxemia",
      label: "Hipoxemia acentuada e história ausente",
      difficulty: "intermediario",
      initialVitals: { oxygenSaturation: 78, respiratoryRate: 5 },
      triggerTimeShiftSeconds: -30,
      reviewNote: "Sem acompanhante, exige decisão apenas com o exame físico.",
    },
  ],
});
