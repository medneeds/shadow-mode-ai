/**
 * Phase 03 — caso de referência único (fictício).
 *
 * Propósito educacional: apresentação indiferenciada de rebaixamento de
 * consciência no pronto-socorro, em que ABC, glicemia capilar à beira do leito,
 * história com a família/SAMU e reavaliação determinam a evolução.
 *
 * Toda a verdade médica vive aqui. O motor é genérico.
 */
import type { ClinicalCaseDefinition, PatientState } from "./clinical-case-types";

const initialState: PatientState = {
  consciousness: "unresponsive",
  airway: "patent",
  breathing: { effort: "normal", description: "Respiração espontânea, sem ruídos adventícios" },
  circulation: { perfusion: "normal", description: "Pulso radial cheio, extremidades tépidas" },
  neurologic: { gcs: 7, pupils: "isocoric_reactive", focalDeficit: false, seizing: false },
  vitals: {
    heartRate: 104,
    respiratoryRate: 18,
    systolicBP: 128,
    diastolicBP: 76,
    oxygenSaturation: 96,
    temperatureC: 36.4,
  },
  tags: ["hipoglicemia"],
};

export const referenceCase: ClinicalCaseDefinition = {
  id: "case-ps-58-inconsciente",
  title: "Rebaixamento do nível de consciência no pronto-socorro",
  themeId: "emergencia",
  level: "intermediario",
  setting: "Pronto-socorro de hospital geral",
  opening:
    "Paciente de 58 anos é trazido ao pronto-socorro inconsciente por familiares. Você assume o atendimento agora.",
  fictional: true,

  patient: {
    age: 58,
    biologicalSex: "male",
    chiefPresentation: "Encontrado inconsciente em casa, há cerca de 40 minutos",
    information: [
      {
        id: "info-observavel",
        group: "observável",
        content: "Homem de 58 anos, em maca, sem resposta ao chamado verbal.",
        availability: { kind: "observable" },
      },
      {
        id: "info-familia-inicio",
        group: "família",
        content:
          "A família relata que ele foi encontrado sem responder no sofá, há cerca de 40 minutos.",
        availability: { kind: "requires_action", actionId: "history_family" },
      },
      {
        id: "info-familia-antecedentes",
        group: "história",
        content:
          "Diabetes tipo 2 há 12 anos e hipertensão. Nega epilepsia e nega uso de álcool.",
        availability: { kind: "requires_action", actionId: "history_family" },
      },
      {
        id: "info-medicacoes",
        group: "medicações",
        content:
          "Usa insulina NPH e glibenclamida. Nos últimos dois dias comeu pouco por quadro gripal.",
        availability: { kind: "requires_action", actionId: "history_medications" },
      },
      {
        id: "info-alergias",
        group: "alergias",
        content: "Sem alergias conhecidas.",
        availability: { kind: "requires_action", actionId: "history_medications" },
      },
      {
        id: "info-samu",
        group: "SAMU",
        content:
          "O transporte foi feito pela família, sem equipe de resgate. Não houve medida de glicemia no domicílio.",
        availability: { kind: "requires_action", actionId: "history_prehospital" },
      },
      {
        id: "info-social",
        group: "social",
        content: "Mora com a esposa, independente para atividades diárias, trabalha como motorista.",
        availability: { kind: "requires_action", actionId: "history_social" },
      },
    ],
  },

  initialState,

  hidden: {
    diagnosis: "Hipoglicemia grave secundária a insulina e sulfonilureia com redução da ingesta",
    differentials: [
      "Acidente vascular cerebral",
      "Intoxicação exógena",
      "Estado pós-ictal",
      "Sepse com encefalopatia",
      "Distúrbio metabólico (uremia, hiponatremia)",
    ],
    evaluation: {
      competencies: [
        "Avaliação primária ABCDE",
        "Raciocínio diagnóstico em coma indiferenciado",
        "Uso oportuno de exames à beira do leito",
        "Conduta terapêutica e reavaliação",
      ],
      educationalPurpose:
        "Validar que decisões e omissões cronometradas alteram a evolução do paciente sem que o treinador entregue a resposta.",
      rubricNotes: [
        "Glicemia capilar é ação crítica no coma indiferenciado.",
        "Tratamento sem reavaliação é conduta incompleta.",
      ],
    },
  },

  actions: [
    {
      id: "assess_airway",
      label: "Avaliar via aérea",
      category: "physical_exam",
      immediateFact: "Via aérea pérvia, sem corpo estranho ou secreção obstrutiva.",
      eventType: "new_symptom",
    },
    {
      id: "assess_breathing",
      label: "Avaliar respiração",
      category: "physical_exam",
      immediateFact: "Expansibilidade simétrica, murmúrio vesicular presente bilateralmente.",
    },
    {
      id: "assess_circulation",
      label: "Avaliar circulação",
      category: "physical_exam",
      immediateFact: "Pulso radial cheio e regular; tempo de enchimento capilar menor que 2 segundos.",
    },
    {
      id: "neurologic_assessment",
      label: "Avaliação neurológica",
      category: "physical_exam",
      immediateFact: "Paciente não responde ao chamado; abre olhos apenas à dor.",
    },
    {
      id: "place_monitoring",
      label: "Instalar monitorização",
      category: "monitoring",
      immediateFact:
        "Monitor instalado: ritmo sinusal, FC 104 bpm, PA 128/76 mmHg, SpO₂ 96% em ar ambiente.",
      eventType: "vital_signs_change",
    },
    {
      id: "obtain_iv_access",
      label: "Obter acesso venoso",
      category: "procedure",
      immediateFact: "Dois acessos venosos periféricos calibrosos obtidos em membros superiores.",
    },
    {
      id: "check_capillary_glucose",
      label: "Solicitar glicemia capilar",
      category: "investigation",
      requestsInvestigationId: "inv_capillary_glucose",
      immediateFact: "Glicemia capilar solicitada à beira do leito.",
    },
    {
      id: "request_ecg",
      label: "Solicitar ECG",
      category: "investigation",
      requestsInvestigationId: "inv_ecg",
      immediateFact: "Eletrocardiograma solicitado.",
    },
    {
      id: "request_laboratory_tests",
      label: "Solicitar exames laboratoriais",
      category: "investigation",
      requestsInvestigationId: "inv_labs",
      immediateFact: "Exames laboratoriais coletados e enviados.",
    },
    {
      id: "request_head_ct",
      label: "Solicitar tomografia de crânio",
      category: "investigation",
      requestsInvestigationId: "inv_head_ct",
      immediateFact: "Tomografia de crânio solicitada.",
    },
    {
      id: "administer_oxygen",
      label: "Administrar oxigênio suplementar",
      category: "medication",
      statePatch: { vitals: { oxygenSaturation: 98 } },
      immediateFact: "Oxigênio por cateter nasal instalado; SpO₂ 98%.",
      eventType: "vital_signs_change",
    },
    {
      id: "administer_glucose",
      label: "Administrar glicose intravenosa",
      category: "medication",
      prerequisites: ["obtain_iv_access"],
      patchRequiresTag: "hipoglicemia",
      statePatch: {
        consciousness: "confused",
        neurologic: { gcs: 13, seizing: false },
        vitals: { glucoseMgDl: 118, heartRate: 92 },
        addTags: ["hipoglicemia corrigida", "estabilizado"],
        removeTags: ["hipoglicemia", "deterioração"],
      },
      immediateFact:
        "Após a infusão de glicose, o paciente abre os olhos, responde ao nome e fica confuso porém interativo. Glicemia de controle 118 mg/dL.",
      ineffectiveFact: "A infusão de glicose é realizada, sem mudança no quadro neurológico.",
      eventType: "improvement_after_treatment",
    },
    {
      id: "secure_airway",
      label: "Assegurar via aérea definitiva",
      category: "procedure",
      statePatch: { airway: "secured", breathing: { effort: "normal" }, addTags: ["via aérea protegida"] },
      immediateFact: "Intubação orotraqueal realizada; via aérea protegida e ventilação adequada.",
      eventType: "stabilization",
    },
    {
      id: "history_family",
      label: "Colher história com a família",
      category: "history",
      immediateFact: "A família responde às suas perguntas.",
    },
    {
      id: "history_medications",
      label: "Perguntar sobre medicações e alergias",
      category: "history",
      immediateFact: "A esposa traz a sacola de medicações do paciente.",
    },
    {
      id: "history_prehospital",
      label: "Perguntar sobre o pré-hospitalar",
      category: "history",
      immediateFact: "A família descreve como foi o transporte.",
    },
    {
      id: "history_social",
      label: "Colher história social",
      category: "history",
      immediateFact: "A família comenta a rotina do paciente.",
    },
    {
      id: "request_specialist",
      label: "Acionar especialista",
      category: "consultation",
      immediateFact: "A clínica médica retorna o contato e acompanha o caso.",
      eventType: "specialist_response",
    },
    {
      id: "reassess_patient",
      label: "Reavaliar paciente",
      category: "reassessment",
      immediateFact: "Reavaliação realizada: dados vitais e estado neurológico atualizados no monitor.",
      eventType: "vital_signs_change",
    },
    {
      id: "disposition_observation",
      label: "Definir destino do paciente",
      category: "disposition",
      immediateFact: "Paciente encaminhado para observação com monitorização e controle glicêmico.",
      eventType: "disposition",
    },
  ],

  expectedActions: [
    {
      actionId: "assess_airway",
      category: "physical_exam",
      domain: "initial_approach",
      importance: "critical",
      scoreWeight: 10,
      critical: true,
      recommendedWindowSeconds: 90,
      completionStatus: "performed",
      clinicalRelevance:
        "Em rebaixamento de consciência, a via aérea é a primeira ameaça à vida e precisa ser avaliada de imediato.",
      learningPoint:
        "Abra todo atendimento de coma indiferenciado pela via aérea, verbalizando o achado antes de seguir para B e C.",
      omission: {
        description: "A via aérea não foi avaliada na abordagem inicial.",
      },
    },
    {
      actionId: "assess_breathing",
      category: "physical_exam",
      domain: "initial_approach",
      importance: "important",
      scoreWeight: 6,
      critical: false,
      recommendedWindowSeconds: 120,
      completionStatus: "performed",
      clinicalRelevance: "A avaliação da ventilação define necessidade de suporte de oxigênio.",
      learningPoint: "Mantenha a sequência A-B-C explícita nos primeiros dois minutos.",
    },
    {
      actionId: "assess_circulation",
      category: "physical_exam",
      domain: "clinical_assessment",
      importance: "important",
      scoreWeight: 6,
      critical: false,
      recommendedWindowSeconds: 120,
      completionStatus: "performed",
      clinicalRelevance:
        "Perfusão e pele (sudorese, temperatura) trazem pistas diagnósticas relevantes neste caso.",
      learningPoint:
        "Inclua pele e perfusão periférica no exame dirigido: são achados de alto valor no coma metabólico.",
    },
    {
      actionId: "check_capillary_glucose",
      category: "investigation",
      domain: "investigations",
      importance: "critical",
      scoreWeight: 14,
      critical: true,
      recommendedWindowSeconds: 180,
      completionStatus: "requested",
      clinicalRelevance:
        "A glicemia capilar é o exame à beira do leito que muda a conduta imediatamente no coma indiferenciado.",
      learningPoint:
        "Nos próximos casos com alteração do nível de consciência, torne a glicemia capilar parte da avaliação inicial, junto com o ABC.",
      omission: {
        description: "A glicemia capilar não foi verificada dentro da janela esperada.",
        consequenceTriggerId: "trg_glucose_omission_180",
        consequence:
          "O paciente permaneceu sem identificação da hipoglicemia e evoluiu com a deterioração prevista pelo caso.",
      },
    },
    {
      actionId: "obtain_iv_access",
      category: "procedure",
      domain: "safety",
      importance: "important",
      scoreWeight: 8,
      critical: false,
      recommendedWindowSeconds: 240,
      completionStatus: "performed",
      clinicalRelevance: "O acesso venoso é pré-requisito para o tratamento intravenoso oportuno.",
      learningPoint: "Garanta acesso venoso antes de precisar dele.",
    },
    {
      actionId: "administer_glucose",
      category: "medication",
      domain: "treatment",
      importance: "critical",
      scoreWeight: 16,
      critical: true,
      recommendedWindowSeconds: 300,
      prerequisites: ["obtain_iv_access", "check_capillary_glucose"],
      completionStatus: "performed",
      clinicalRelevance:
        "A reposição de glicose intravenosa é o tratamento definitivo da hipoglicemia grave.",
      learningPoint:
        "Confirmada a hipoglicemia, trate imediatamente e reavalie o nível de consciência logo após a infusão.",
      omission: {
        description: "A hipoglicemia não foi tratada dentro da janela esperada.",
        consequenceTriggerId: "trg_glucose_omission_360",
        consequence:
          "O paciente evoluiu com crise convulsiva e queda de saturação, conforme previsto pelo caso.",
      },
    },
    {
      actionId: "place_monitoring",
      category: "monitoring",
      domain: "safety",
      importance: "expected",
      scoreWeight: 5,
      critical: false,
      recommendedWindowSeconds: 180,
      completionStatus: "performed",
      clinicalRelevance: "Monitorização contínua detecta deterioração antes do exame clínico.",
      learningPoint: "Instale monitorização na fase inicial, não depois da primeira intercorrência.",
    },
    {
      actionId: "history_family",
      category: "history",
      domain: "diagnostic_reasoning",
      importance: "important",
      scoreWeight: 7,
      critical: false,
      completionStatus: "performed",
      clinicalRelevance: "A história com a família delimita o tempo de início e os antecedentes.",
      learningPoint:
        "Colha história com quem trouxe o paciente em paralelo à estabilização, não depois dela.",
    },
    {
      actionId: "history_medications",
      category: "history",
      domain: "diagnostic_reasoning",
      importance: "important",
      scoreWeight: 7,
      critical: false,
      completionStatus: "performed",
      clinicalRelevance:
        "Insulina e sulfonilureia com redução da ingesta explicam o quadro deste paciente.",
      learningPoint: "Pergunte sempre por medicações em uso e mudança recente de ingesta alimentar.",
    },
    {
      actionId: "reassess_patient",
      category: "reassessment",
      domain: "reassessment",
      importance: "important",
      scoreWeight: 8,
      critical: false,
      completionStatus: "performed",
      clinicalRelevance:
        "Tratamento sem reavaliação é conduta incompleta: a resposta define o próximo passo.",
      learningPoint:
        "Reavalie objetivamente após cada intervenção — nível de consciência, dados vitais e glicemia de controle.",
      omission: {
        description: "O paciente não foi reavaliado de forma estruturada após a intervenção.",
      },
    },
    {
      actionId: "disposition_observation",
      category: "disposition",
      domain: "disposition",
      importance: "expected",
      scoreWeight: 5,
      critical: false,
      completionStatus: "performed",
      clinicalRelevance:
        "Hipoglicemia por sulfonilureia exige observação prolongada pelo risco de recorrência.",
      learningPoint:
        "Defina destino e plano de monitorização glicêmica: o risco de recidiva permanece por horas.",
    },
  ],


  examFindings: [
    {
      id: "find-pele",
      system: "geral",
      finding: "Pele sudorética e fria ao toque.",
      requiredAction: "assess_circulation",
      availability: "on_exam",
      onlyWithTag: "hipoglicemia",
    },
    {
      id: "find-neuro-gcs",
      system: "neurológico",
      finding:
        "Escala de coma de Glasgow 7 (abertura ocular à dor, sons incompreensíveis, retirada à dor).",
      requiredAction: "neurologic_assessment",
      availability: "on_exam",
      hiddenWithTag: "hipoglicemia corrigida",
    },
    {
      id: "find-neuro-pupilas",
      system: "neurológico",
      finding: "Pupilas isocóricas e fotorreativas, sem déficit focal evidente.",
      requiredAction: "neurologic_assessment",
      availability: "on_exam",
    },
    {
      id: "find-neuro-recuperado",
      system: "neurológico",
      finding: "Glasgow 13, orientado parcialmente no tempo, sem déficit focal.",
      requiredAction: "neurologic_assessment",
      availability: "on_exam",
      onlyWithTag: "hipoglicemia corrigida",
    },
    {
      id: "find-toracico",
      system: "respiratório",
      finding: "Ausculta pulmonar limpa, sem sibilos ou estertores.",
      requiredAction: "assess_breathing",
      availability: "on_exam",
    },
  ],

  investigations: [
    {
      id: "inv_capillary_glucose",
      name: "Glicemia capilar",
      category: "bedside",
      availabilityDelaySeconds: 30,
      result: "Glicemia capilar: 28 mg/dL.",
      resultStatePatch: { vitals: { glucoseMgDl: 28 } },
      eventType: "lab_result_available",
      relevance: "diagnostic",
    },
    {
      id: "inv_ecg",
      name: "Eletrocardiograma",
      category: "cardiac",
      availabilityDelaySeconds: 90,
      result: "ECG: ritmo sinusal, FC 104 bpm, sem alterações isquêmicas agudas.",
      eventType: "lab_result_available",
      relevance: "supportive",
    },
    {
      id: "inv_labs",
      name: "Exames laboratoriais",
      category: "laboratory",
      availabilityDelaySeconds: 300,
      prerequisites: ["obtain_iv_access"],
      result:
        "Laboratório: sódio 138 mEq/L, potássio 4,1 mEq/L, creatinina 1,3 mg/dL, hemograma sem leucocitose, lactato 1,8 mmol/L.",
      eventType: "lab_result_available",
      relevance: "supportive",
    },
    {
      id: "inv_head_ct",
      name: "Tomografia de crânio",
      category: "imaging",
      availabilityDelaySeconds: 420,
      result: "Tomografia de crânio sem sangramento, sem sinais de lesão isquêmica aguda.",
      eventType: "imaging_result_available",
      relevance: "screening",
    },
  ],

  timeTriggers: [
    {
      id: "trg_glucose_omission_180",
      atClinicalSecond: 180,
      conditions: [
        { kind: "action_missing", actionId: "check_capillary_glucose" },
        { kind: "has_tag", tag: "hipoglicemia" },
      ],
      source: "omission_trigger",
      eventType: "physiologic_deterioration",
      fact:
        "O paciente apresenta sudorese profusa, mioclonias nos membros superiores e a frequência cardíaca sobe para 118 bpm.",
      statePatch: {
        vitals: { heartRate: 118 },
        neurologic: { gcs: 6 },
        addTags: ["deterioração"],
      },
      once: true,
    },
    {
      id: "trg_glucose_omission_360",
      atClinicalSecond: 360,
      conditions: [
        { kind: "action_missing", actionId: "administer_glucose" },
        { kind: "has_tag", tag: "hipoglicemia" },
      ],
      source: "omission_trigger",
      eventType: "complication",
      fact:
        "O paciente inicia crise convulsiva tônico-clônica generalizada, com sialorreia e queda da saturação para 88%.",
      statePatch: {
        airway: "threatened",
        breathing: { effort: "labored", description: "Respiração ruidosa durante a crise" },
        neurologic: { gcs: 4, seizing: true },
        vitals: { oxygenSaturation: 88, heartRate: 126 },
        addTags: ["deterioração", "crise convulsiva"],
      },
      once: true,
    },
    {
      id: "trg_family_arrival_60",
      atClinicalSecond: 60,
      conditions: [{ kind: "always" }],
      source: "time_trigger",
      eventType: "nursing_communication",
      fact:
        "A enfermagem informa que a esposa do paciente está disponível no corredor para prestar informações.",
      once: true,
    },
  ],

  scoring: {
    caseVersion: "1.0.0",
    scoringVersion: "1.0.0",
    domains: [
      "initial_approach",
      "safety",
      "clinical_assessment",
      "diagnostic_reasoning",
      "investigations",
      "treatment",
      "reassessment",
      "disposition",
    ],
    lateCreditFactor: 0.5,
    incompleteCreditFactor: 0.6,
    unsafeActions: [
      {
        actionId: "request_head_ct",
        description:
          "Tomografia de crânio priorizada com paciente em hipoglicemia não corrigida: o paciente sai da sala de emergência sem tratamento da causa reversível.",
        domain: "prioritization",
        penaltyPoints: 6,
        onlyWithTag: "hipoglicemia",
      },
    ],
    expectedManagement: [
      "Avaliação primária A-B-C com verbalização dos achados nos primeiros dois minutos.",
      "Monitorização contínua e dois acessos venosos periféricos.",
      "Glicemia capilar à beira do leito como parte da avaliação inicial do coma.",
      "Reposição de glicose intravenosa imediatamente após a confirmação da hipoglicemia.",
      "Reavaliação neurológica e glicemia de controle após a intervenção.",
      "História com a família e revisão de medicações (insulina e sulfonilureia, ingesta reduzida).",
      "Destino com observação prolongada e controle glicêmico seriado pelo risco de recorrência.",
    ],
    hypotheses: {
      essential: ["Hipoglicemia"],
      acceptable: ["Distúrbio metabólico", "Intoxicação exógena", "Estado pós-ictal"],
      dangerous: ["Acidente vascular cerebral", "Sepse com encefalopatia"],
    },
  },

  completion: {
    resolutionActionIds: ["administer_glucose", "reassess_patient", "disposition_observation"],
    stabilizedTag: "estabilizado",
    maxClinicalSeconds: 900,
  },
};
