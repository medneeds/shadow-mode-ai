/** Mock content for Phase 01. No engine, no persistence. */

export type LevelId = "basico" | "intermediario" | "avancado";

export const themes = [
  { id: "emergencia", label: "Emergência", hint: "Instabilidade e prioridades" },
  { id: "cardiologia", label: "Cardiologia", hint: "Dor torácica, arritmias" },
  { id: "neurologia", label: "Neurologia", hint: "Déficits e rebaixamento" },
  { id: "infectologia", label: "Infectologia", hint: "Sepse e febre" },
  { id: "pneumologia", label: "Pneumologia", hint: "Dispneia e hipoxemia" },
  { id: "terapia-intensiva", label: "Terapia Intensiva", hint: "Suporte avançado" },
  { id: "clinica-medica", label: "Clínica Médica", hint: "Enfermaria e ambulatório" },
  { id: "pediatria", label: "Pediatria", hint: "Particularidades da criança" },
  { id: "cirurgia", label: "Cirurgia", hint: "Abdome agudo e trauma" },
] as const;

export const levels: { id: LevelId; label: string; audience: string; description: string }[] = [
  {
    id: "basico",
    label: "Básico",
    audience: "Estudantes de medicina",
    description: "Fundamentos do raciocínio clínico, anamnese e exame físico estruturado.",
  },
  {
    id: "intermediario",
    label: "Intermediário",
    audience: "Médicos e residentes",
    description: "Decisão clínica realista, emergência, enfermaria e priorização.",
  },
  {
    id: "avancado",
    label: "Avançado",
    audience: "Preparação para provas de título",
    description: "Casos difíceis, pistas sutis e decisão sob alta pressão.",
  },
];

export const durations = [
  { id: "3", label: "3 minutos", hint: "Foco pontual" },
  { id: "5", label: "5 minutos", hint: "Estação curta" },
  { id: "15", label: "15 minutos", hint: "Caso completo" },
  { id: "30", label: "30 minutos", hint: "Condução estendida" },
] as const;

export const mockHistory = [
  {
    id: "1",
    theme: "Emergência",
    level: "Intermediário",
    duration: "15 minutos",
    date: "24 de agosto",
    score: 78,
    summary: "Choque séptico de foco urinário",
  },
  {
    id: "2",
    theme: "Cardiologia",
    level: "Avançado",
    duration: "15 minutos",
    date: "21 de agosto",
    score: 64,
    summary: "Dor torácica com supra de ST",
  },
  {
    id: "3",
    theme: "Neurologia",
    level: "Básico",
    duration: "5 minutos",
    date: "18 de agosto",
    score: 85,
    summary: "Déficit focal agudo",
  },
];

export const mockCompetencies = [
  { label: "Abordagem inicial", value: 82 },
  { label: "Raciocínio diagnóstico", value: 74 },
  { label: "Exame físico", value: 68 },
  { label: "Exames complementares", value: 71 },
  { label: "Tratamento", value: 79 },
  { label: "Priorização", value: 65 },
  { label: "Segurança", value: 88 },
];
