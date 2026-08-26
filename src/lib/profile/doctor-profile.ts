/**
 * Perfil do médico (client-safe, local).
 *
 * Personaliza LINGUAGEM, RITMO e PADRÕES de configuração. Nunca influencia
 * verdade clínica, conduta correta, dificuldade real do caso ou pontuação.
 * Persistido apenas no navegador nesta etapa — sem backend.
 */
import type { LevelId } from "@/lib/shadow-content";
import type { TrainerProfile, VoicePreference } from "@/lib/shadow-trainer";

export const STORAGE_KEY = "smt-doctor-profile";

export type CareerStage =
  | "estudante"
  | "internato"
  | "residente"
  | "generalista"
  | "especialista";
export type StressStyle = "calmo" | "oscila" | "acelera";
export type Comfort = "confortavel" | "neutro" | "desafiador";

export type DoctorProfile = {
  version: 1;
  stage: CareerStage | null;
  stress: StressStyle | null;
  strengths: string[];
  scarcity: Comfort | null;
  fastThinking: Comfort | null;
  /** Expectativas escolhidas entre opções (0..N). */
  expectations: string[];
  /** Complemento livre, opcional. */
  expectation: string | null;
  voicePreference: VoicePreference | null;
  tone: TrainerProfile | null;
  completedAt: number;
};

export const emptyProfile: DoctorProfile = {
  version: 1,
  stage: null,
  stress: null,
  strengths: [],
  scarcity: null,
  fastThinking: null,
  expectations: [],
  expectation: null,
  voicePreference: null,
  tone: null,
  completedAt: 0,
};

export const careerStages: { id: CareerStage; label: string; hint: string; level: LevelId }[] = [
  { id: "estudante", label: "Estudante", hint: "Fundamentos", level: "basico" },
  { id: "internato", label: "Internato", hint: "Prática inicial", level: "basico" },
  { id: "residente", label: "Residente", hint: "Decisão real", level: "intermediario" },
  { id: "generalista", label: "Generalista", hint: "Médico formado, atuação ampla", level: "intermediario" },
  { id: "especialista", label: "Especialista", hint: "Alta pressão", level: "avancado" },
];

export const stressStyles: { id: StressStyle; label: string; hint: string }[] = [
  { id: "calmo", label: "Fico calmo", hint: "Pressão não me desorganiza" },
  { id: "oscila", label: "Oscila", hint: "Depende do dia e do caso" },
  { id: "acelera", label: "Acelero demais", hint: "Tendo a atropelar etapas" },
];

export const comfortOptions: { id: Comfort; label: string }[] = [
  { id: "confortavel", label: "Confortável" },
  { id: "neutro", label: "Mais ou menos" },
  { id: "desafiador", label: "É meu ponto fraco" },
];

export const strengthOptions = [
  "Anamnese",
  "Exame físico",
  "Raciocínio diagnóstico",
  "Emergência",
  "Procedimentos",
  "Comunicação",
];

export const expectationOptions = [
  "Sentir mais segurança na hora de decidir",
  "Treinar para provas práticas e OSCE",
  "Afiar raciocínio clínico sob pressão",
  "Evoluir tecnicamente em condutas",
  "Melhorar comunicação com o paciente",
  "Manter o ritmo de treino constante",
];

export const toneOptions: { id: TrainerProfile; label: string; hint: string }[] = [
  { id: "gentle", label: "Acolhedor", hint: "Calmo e paciente" },
  { id: "assertive", label: "Direto", hint: "Firme, sem rodeios" },
  { id: "fast_paced", label: "Sob pressão", hint: "Ritmo acelerado" },
  { id: "permissive", label: "Exploratório", hint: "Mais espaço para pensar" },
];

export function loadDoctorProfile(): DoctorProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DoctorProfile;
    if (!parsed || parsed.version !== 1) return null;
    // Perfis salvos antes das expectativas múltiplas continuam válidos.
    return { ...parsed, expectations: parsed.expectations ?? [], strengths: parsed.strengths ?? [] };
  } catch {
    return null;
  }
}

export function saveDoctorProfile(profile: DoctorProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* armazenamento indisponível não pode quebrar o treino */
  }
}

export function clearDoctorProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* idem */
  }
}

/** Preferências derivadas — apenas padrões iniciais, sempre sobrescrevíveis. */
export function profileDefaults(profile: DoctorProfile): {
  levelId?: LevelId;
  trainerProfile?: TrainerProfile;
  voicePreference?: VoicePreference;
} {
  const out: {
    levelId?: LevelId;
    trainerProfile?: TrainerProfile;
    voicePreference?: VoicePreference;
  } = {};
  const stage = careerStages.find((s) => s.id === profile.stage);
  if (stage) out.levelId = stage.level;
  if (profile.tone) out.trainerProfile = profile.tone;
  else if (profile.stress === "acelera") out.trainerProfile = "gentle";
  if (profile.voicePreference) out.voicePreference = profile.voicePreference;
  return out;
}

/** Resumo curto para a tela de perfil. */
export function profileSummary(profile: DoctorProfile): string {
  const parts = [
    careerStages.find((s) => s.id === profile.stage)?.label,
    toneOptions.find((t) => t.id === profile.tone)?.label,
    profile.voicePreference === "male" ? "Voz masculina" : profile.voicePreference === "female" ? "Voz feminina" : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Linhas do resumo — usadas na revisão do questionário e na tela de perfil. */
export function profileRows(profile: DoctorProfile): { label: string; value?: string }[] {
  const expectations = [...profile.expectations];
  if (profile.expectation) expectations.push(profile.expectation);
  return [
    { label: "Momento", value: careerStages.find((s) => s.id === profile.stage)?.label },
    { label: "Sob pressão", value: stressStyles.find((s) => s.id === profile.stress)?.label },
    { label: "Domínios", value: profile.strengths.length > 0 ? profile.strengths.join(", ") : undefined },
    { label: "Escassez de recursos", value: comfortOptions.find((c) => c.id === profile.scarcity)?.label },
    { label: "Raciocínio rápido", value: comfortOptions.find((c) => c.id === profile.fastThinking)?.label },
    { label: "Expectativa", value: expectations.length > 0 ? expectations.join(" · ") : undefined },
    {
      label: "Voz do Sombra",
      value:
        profile.voicePreference === "male"
          ? "Masculina"
          : profile.voicePreference === "female"
            ? "Feminina"
            : undefined,
    },
    { label: "Tom", value: toneOptions.find((t) => t.id === profile.tone)?.label },
  ];
}
