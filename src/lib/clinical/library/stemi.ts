/**
 * Dor torácica — infarto agudo com supra de ST de parede inferior (fictício).
 * Conteúdo clínico: needs_clinical_review.
 */
import {
  action,
  actions,
  defineCase,
  expected,
  finding,
  freeReasoningZone,
  guidanceOption,
  guidancePoint,
  info,
  infoOnAction,
  investigation,
  patientState,
  trigger,
} from "../case-authoring";

export const stemiCase = defineCase({
  id: "case-ps-stemi-inferior",
  title: "Dor torácica opressiva com instabilidade elétrica",
  meta: {
    specialty: "cardiologia",
    topic: "Dor torácica",
    subtopic: "Síndrome coronariana aguda com supradesnivelamento",
    archetype: "chest_pain",
    setting: "emergency_department",
    difficulty: "intermediario",
    clinicalSyndrome: "Dor torácica isquêmica aguda",
    primaryDiagnosis: "Infarto agudo do miocárdio com supra de ST de parede inferior e acometimento de ventrículo direito",
    dangerousDifferentials: [
      "Dissecção aórtica",
      "Tromboembolismo pulmonar",
      "Pericardite com derrame",
      "Pneumotórax hipertensivo",
    ],
    ageGroup: "adult",
    acuity: "critical",
    skills: ["initial_approach", "diagnostic_reasoning", "investigation", "treatment", "disposition", "safety"],
    compatibleDurations: ["5", "15", "30"],
    estimatedMinutes: 15,
    review: { status: "needs_clinical_review" },
    keywords: ["dor toracica", "peito", "infarto", "iam", "stemi", "supra de st", "coronariana", "cardiologia"],
  },
  setting: "Pronto-socorro de hospital com hemodinâmica disponível",
  opening:
    "Homem de 62 anos chega ao pronto-socorro com dor no peito iniciada há 50 minutos, sudoreico e ansioso. Você assume o atendimento agora.",
  patient: {
    age: 62,
    biologicalSex: "male",
    chiefPresentation: "Dor torácica opressiva há 50 minutos, com sudorese",
    information: [
      info("info-obs", "observável", "Homem sudoreico, pálido, sentado na maca, com fácies de dor.", {
        kind: "observable",
      }),
      infoOnAction(
        "info-hda",
        "história",
        "Dor retroesternal opressiva, iniciada em repouso há 50 minutos, irradiando para mandíbula, sem melhora espontânea. Intensidade 8/10.",
        "history_hpi",
      ),
      infoOnAction(
        "info-antecedentes",
        "antecedentes",
        "Hipertensão e dislipidemia, tabagista de 30 anos-maço. Pai com infarto aos 55 anos.",
        "history_past",
      ),
      infoOnAction(
        "info-medicacoes",
        "medicações",
        "Usa losartana e sinvastatina. Sem alergias. Nega uso de sildenafila e nega anticoagulantes.",
        "history_medications",
      ),
    ],
  },
  initialState: patientState({
    consciousness: "alert",
    circulation: { perfusion: "normal", description: "Extremidades frias e sudoreicas, pulsos simétricos" },
    vitals: {
      heartRate: 52,
      respiratoryRate: 20,
      systolicBP: 104,
      diastolicBP: 66,
      oxygenSaturation: 96,
      temperatureC: 36.3,
    },
    tags: ["isquemia miocárdica", "infarto de ventrículo direito"],
  }),
  variableVitals: { heartRate: [48, 52, 58], systolicBP: [98, 104, 112] },
  hidden: {
    diagnosis: "IAM com supra de ST inferior com extensão para ventrículo direito",
    differentials: ["Dissecção aórtica", "TEP", "Pericardite"],
    evaluation: {
      competencies: ["ECG precoce", "Antiagregação", "Reperfusão", "Segurança medicamentosa"],
      educationalPurpose:
        "Tempo porta-ECG, decisão de reperfusão e reconhecimento da contraindicação a nitrato no infarto de VD.",
      rubricNotes: [
        "ECG em até 10 minutos é o marcador de qualidade central.",
        "Nitrato no infarto de VD produz hipotensão grave — erro crítico autoral.",
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
        "request_ecg",
        "request_troponin",
        "request_laboratory_tests",
        "request_chest_xray",
        "history_hpi",
        "history_past",
        "history_medications",
        "exam_cardiovascular",
        "exam_respiratory",
        "reassess_vitals",
        "request_specialist",
        "disposition_cathlab",
        "disposition_ward",
        "disposition_discharge",
        "disposition_icu",
      ],
      {
        administer_oxygen: {
          immediateFact: "Oxigênio instalado. A saturação permanece em 96%.",
        },
        request_specialist: {
          label: "Acionar cardiologia intervencionista",
          immediateFact: "A cardiologia intervencionista é acionada e a sala de hemodinâmica começa a ser preparada.",
          requestsInvestigationId: "inv_specialist",
        },
        reassess_vitals: {
          immediateFact: "Você reafere os sinais vitais à beira do leito.",
          eventType: "vital_signs_change",
        },
        disposition_cathlab: {
          immediateFact:
            "Paciente encaminhado à hemodinâmica para angioplastia primária, com equipe avisada e tempo registrado.",
          statePatch: { addTags: ["reperfusão definida", "estabilizado"] },
          eventType: "improvement_after_treatment",
        },
        disposition_ward: { immediateFact: "Você solicita internação em enfermaria." },
        disposition_discharge: { immediateFact: "Você define alta hospitalar." },
        disposition_icu: { immediateFact: "Você solicita vaga em terapia intensiva coronariana." },
      },
    ),
    action("administer_aspirin", {
      label: "Administrar AAS",
      category: "medication",
      immediateFact: "AAS 300 mg mastigável administrado.",
      statePatch: { addTags: ["antiagregado"] },
      eventType: "improvement_after_treatment",
    }),
    action("administer_p2y12", {
      label: "Administrar segundo antiagregante",
      category: "medication",
      immediateFact: "Segundo antiagregante administrado após alinhamento com a hemodinâmica.",
      statePatch: { addTags: ["dupla antiagregação"] },
    }),
    action("administer_analgesia", {
      label: "Administrar analgesia",
      category: "medication",
      immediateFact: "Analgesia intravenosa administrada; o paciente refere alívio parcial da dor.",
    }),
    action("administer_nitrate", {
      label: "Administrar nitrato",
      category: "medication",
      patchRequiresTag: "infarto de ventrículo direito",
      immediateFact:
        "Logo após o nitrato a pressão cai para 68/40 mmHg e o paciente fica pálido e confuso.",
      ineffectiveFact: "Nitrato administrado, sem alteração hemodinâmica relevante.",
      statePatch: {
        consciousness: "confused",
        circulation: { perfusion: "poor", description: "Extremidades frias, enchimento capilar lentificado" },
        vitals: { systolicBP: 68, diastolicBP: 40, heartRate: 46 },
        addTags: ["hipotensão iatrogênica", "deterioração"],
      },
      eventType: "physiologic_deterioration",
    }),
    action("administer_fluid_bolus", {
      label: "Administrar volume intravenoso",
      category: "medication",
      immediateFact: "Após o volume a pressão sobe para 96/58 mmHg e a perfusão melhora.",
      statePatch: {
        consciousness: "alert",
        circulation: { perfusion: "normal", description: "Perfusão recuperada após volume" },
        vitals: { systolicBP: 96, diastolicBP: 58 },
        removeTags: ["hipotensão iatrogênica"],
      },
      eventType: "improvement_after_treatment",
    }),
    action("request_right_leads", {
      label: "Solicitar derivações direitas (V3R e V4R)",
      category: "investigation",
      requestsInvestigationId: "inv_right_leads",
    }),
  ],
  examFindings: [
    finding("f-cv", "cardiovascular", "Bulhas rítmicas hipofonéticas, sem sopros; turgência jugular presente.", "exam_cardiovascular"),
    finding("f-resp", "respiratório", "Murmúrio vesicular presente e simétrico, sem crepitações.", "exam_respiratory"),
    finding("f-vitais", "geral", "Bradicardia sinusal com pressão limítrofe e sudorese fria.", "check_vital_signs"),
  ],
  investigations: [
    investigation(
      "inv_ecg",
      "ECG: supradesnivelamento de ST em DII, DIII e aVF, com infra em DI e aVL. Ritmo sinusal bradicárdico.",
      { availabilityDelaySeconds: 60 },
    ),
    investigation(
      "inv_right_leads",
      "Derivações direitas: supra de ST em V4R, compatível com acometimento de ventrículo direito.",
      { name: "Derivações direitas (V3R/V4R)", category: "cardiac", availabilityDelaySeconds: 90 },
    ),
    investigation("inv_troponin", "Troponina ultrassensível inicial elevada, em curva ascendente."),
    investigation("inv_labs", "Hemograma e função renal sem alterações relevantes; eletrólitos normais."),
    investigation("inv_chest_xray", "Radiografia de tórax: área cardíaca normal, sem congestão e sem alargamento de mediastino."),
    investigation("inv_specialist", "A cardiologia intervencionista confirma sala pronta para angioplastia primária."),
  ],
  timeTriggers: [
    trigger("trg-dor-180", 180, "A enfermagem informa que a dor aumentou para 9/10 e a sudorese piorou.", {
      conditions: [{ kind: "all_actions_missing", actionIds: ["administer_analgesia", "disposition_cathlab"] }],
      source: "omission_trigger",
      eventType: "new_symptom",
    }),
    trigger(
      "trg-bav-420",
      420,
      "O monitor mostra bloqueio atrioventricular avançado com frequência de 38 bpm e queda da pressão.",
      {
        conditions: [{ kind: "action_missing", actionId: "disposition_cathlab" }],
        statePatch: { vitals: { heartRate: 38, systolicBP: 84, diastolicBP: 52 }, addTags: ["deterioração"] },
        branchId: "branch-deterioracao",
        source: "omission_trigger",
      },
    ),
    trigger(
      "trg-reperfusao-900",
      900,
      "A equipe informa que o tempo porta-balão ultrapassou a meta recomendada.",
      {
        conditions: [{ kind: "action_missing", actionId: "disposition_cathlab" }],
        statePatch: { addTags: ["reperfusão tardia"] },
        branchId: "branch-deterioracao",
        source: "omission_trigger",
        eventType: "physiologic_deterioration",
      },
    ),
  ],
  branches: [
    {
      id: "branch-deterioracao",
      label: "Isquemia sem reperfusão",
      kind: "deterioration",
      tag: "deterioração",
      description: "Sem definição de reperfusão, surgem bradiarritmia e instabilidade hemodinâmica.",
    },
  ],
  outcomes: [
    {
      id: "out-reperfundido",
      label: "Reperfusão definida",
      kind: "stabilized",
      conditions: [{ kind: "has_tag", tag: "reperfusão definida" }],
      description: "Diagnóstico eletrocardiográfico feito e reperfusão encaminhada.",
    },
  ],
  objectives: [
    {
      id: "obj-reperfusao",
      label: "Definir estratégia de reperfusão",
      domain: "disposition",
      satisfiedByAnyOf: ["disposition_cathlab"],
      critical: true,
      recommendedWindowSeconds: 600,
    },
  ],
  expectedActions: [
    expected("request_ecg", {
      importance: "critical",
      weight: 22,
      critical: true,
      windowSeconds: 180,
      clinicalRelevance: "O ECG em até 10 minutos define toda a estratégia da dor torácica.",
      learningPoint: "ECG primeiro: nenhuma decisão de reperfusão existe sem ele.",
      omission: {
        description: "O ECG não foi solicitado precocemente.",
        consequenceTriggerId: "trg-bav-420",
        consequence: "O paciente evoluiu com bloqueio avançado sem diagnóstico definido.",
      },
    }),
    expected("administer_aspirin", {
      importance: "critical",
      weight: 14,
      critical: true,
      windowSeconds: 420,
      clinicalRelevance: "Antiagregação precoce reduz mortalidade na síndrome coronariana aguda.",
    }),
    expected("disposition_cathlab", {
      importance: "critical",
      weight: 20,
      critical: true,
      windowSeconds: 720,
      objectiveId: "obj-reperfusao",
      clinicalRelevance: "Reperfusão é o tratamento definitivo; estabilizar sem reperfundir não resolve o caso.",
      learningPoint: "Separe estabilização inicial de tratamento definitivo.",
      omission: {
        description: "A estratégia de reperfusão não foi definida dentro da janela.",
        consequenceTriggerId: "trg-reperfusao-900",
      },
    }),
    expected("place_monitoring", { importance: "important", weight: 8, windowSeconds: 180 }),
    expected("obtain_iv_access", { importance: "expected", weight: 6, windowSeconds: 240 }),
    expected("request_right_leads", {
      importance: "important",
      weight: 10,
      windowSeconds: 480,
      clinicalRelevance: "No supra inferior, as derivações direitas mudam a conduta medicamentosa.",
      learningPoint: "Supra inferior pede V3R/V4R antes de qualquer vasodilatador.",
    }),
    expected("history_hpi", { importance: "expected", weight: 6, windowSeconds: 300 }),
    expected("request_troponin", { importance: "expected", weight: 5, windowSeconds: 600 }),
    expected("request_specialist", { importance: "important", weight: 9, windowSeconds: 600 }),
  ],
  scoring: {
    caseVersion: "1.0.0",
    scoringVersion: "phase-06",
    domains: ["initial_approach", "investigations", "treatment", "prioritization", "safety", "disposition"],
    unsafeActions: [
      {
        actionId: "administer_nitrate",
        description: "Nitrato administrado com infarto de ventrículo direito, causando hipotensão grave.",
        domain: "safety",
        penaltyPoints: 18,
        onlyWithTag: "infarto de ventrículo direito",
      },
      {
        actionId: "disposition_discharge",
        description: "Alta hospitalar com supradesnivelamento de ST ativo.",
        domain: "safety",
        penaltyPoints: 25,
      },
    ],
    expectedManagement: [
      "ECG de 12 derivações em até 10 minutos, com derivações direitas no supra inferior.",
      "Monitorização, acesso venoso e antiagregação precoce.",
      "Evitar nitrato diante de acometimento de ventrículo direito.",
      "Acionar hemodinâmica e encaminhar para angioplastia primária.",
    ],
    hypotheses: {
      essential: ["Infarto agudo do miocárdio com supra de ST"],
      acceptable: ["Síndrome coronariana aguda"],
      dangerous: ["Dor torácica inespecífica com alta hospitalar"],
    },
  },
  relevantSpecialties: ["Cardiologia intervencionista", "Terapia intensiva"],
  completion: {
    resolutionActionIds: ["disposition_cathlab"],
    stabilizedTag: "estabilizado",
    maxClinicalSeconds: 1200,
  },
  guidance: {
    points: [
    guidancePoint("gp-abertura", {
      educationalPurpose:
        "Estruturar os primeiros minutos de uma dor torácica sem antecipar o diagnóstico.",
      guidedOptions: [
        guidanceOption("check_vital_signs", "high_priority"),
        guidanceOption("request_ecg", "high_priority"),
        guidanceOption("history_hpi", "reasonable"),
      ],
      adaptiveOptions: [
        guidanceOption("check_vital_signs", "high_priority"),
        guidanceOption("request_ecg", "high_priority"),
        guidanceOption("place_monitoring", "reasonable"),
        guidanceOption("exam_cardiovascular", "reasonable"),
        guidanceOption("history_hpi", "lower_priority"),
      ],
    }),
    guidancePoint("gp-apos-reperfusao", {
      educationalPurpose:
        "Depois da decisão de reperfusão, organizar vigilância, analgesia e destino.",
      conditions: [{ kind: "action_performed", actionId: "disposition_cathlab" }],
      guidedOptions: [
        guidanceOption("reassess_vitals", "high_priority"),
        guidanceOption("request_specialist", "reasonable"),
        guidanceOption("disposition_icu", "reasonable"),
      ],
      adaptiveOptions: [
        guidanceOption("reassess_vitals", "high_priority"),
        guidanceOption("request_specialist", "reasonable"),
        guidanceOption("disposition_icu", "reasonable"),
        guidanceOption("administer_analgesia", "context_dependent"),
        guidanceOption("request_troponin", "lower_priority"),
      ],
    }),
    ],
    freeReasoningZones: [
    freeReasoningZone("frz-conduta-inicial", {
      label: "Interpretação e conduta definitiva",
      educationalPurpose:
        "Interpretar o eletrocardiograma, tratar e decidir a reperfusão sem sugestões na tela.",
      appliesTo: ["adaptive"],
      conditions: [
        { kind: "action_performed", actionId: "request_ecg" },
        { kind: "action_missing", actionId: "disposition_cathlab" },
      ],
    }),
    ],
  },

  variants: [
    {
      id: "var-intermediario-classico",
      label: "Apresentação típica",
      difficulty: "intermediario",
      reviewNote: "Dor típica, ECG diagnóstico e história clara.",
    },
    {
      id: "var-avancado-instavel",
      label: "Hipotensão precoce e história atípica",
      difficulty: "avancado",
      initialVitals: { systolicBP: 88, diastolicBP: 54, heartRate: 44 },
      triggerTimeShiftSeconds: -120,
      patient: { chiefPresentation: "Mal-estar e sudorese, com dor epigástrica pouco valorizada" },
      opening:
        "Homem de 62 anos chega ao pronto-socorro com mal-estar intenso, sudorese e dor epigástrica há cerca de uma hora. Você assume o atendimento agora.",
      reviewNote: "Apresentação atípica e instabilidade precoce exigem priorização sob pressão.",
    },
  ],
});
