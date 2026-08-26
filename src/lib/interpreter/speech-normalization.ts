/**
 * Camada FINA de normalização de fala (client-safe).
 *
 * Não é o mecanismo principal de inteligência: a interpretação semântica é do LLM.
 * Aqui ficam apenas apelidos determinísticos muito comuns da fala clínica brasileira,
 * usados para:
 *  - dar ao interpretador uma pista de vocabulário; e
 *  - permitir um caminho rápido quando a fala é curta e inequívoca.
 */

/** Apelidos → id canônico. Só valem se o id existir no catálogo do caso. */
const aliasMap: Record<string, string[]> = {
  check_capillary_glucose: [
    "dextro",
    "hgt",
    "glicemia",
    "glicemia capilar",
    "ponta de dedo",
    "acucar",
    "açúcar",
    "glicose capilar",
  ],
  obtain_iv_access: [
    "acesso",
    "acessos",
    "avp",
    "acesso periferico",
    "acesso venoso",
    "pegar veia",
    "pega veia",
    "dois acessos",
    "puncionar veia",
  ],
  place_monitoring: ["monitoriza", "monitorizar", "monitor", "monitorização", "monitorizacao"],
  request_ecg: ["ecg", "eletro", "eletrocardiograma"],
  request_laboratory_tests: ["laboratorio", "laboratório", "exames de sangue", "hemograma", "labs"],
  request_head_ct: ["tomografia", "tc de cranio", "tc de crânio", "tomo de cranio"],
  administer_oxygen: ["oxigenio", "oxigênio", "o2", "cateter nasal", "mascara de oxigenio"],
  secure_airway: ["iot", "intubar", "intubacao", "intubação", "via aerea definitiva", "via aérea definitiva"],
  assess_airway: ["via aerea", "via aérea", "avalia a via aerea"],
  assess_breathing: ["ausculta", "respiracao", "respiração", "ausculto"],
  assess_circulation: ["pulso", "perfusao", "perfusão", "enchimento capilar"],
  neurologic_assessment: ["glasgow", "pupilas", "neurologico", "neurológico"],
  reassess_patient: ["reavalia", "reavaliar", "reavaliação", "reavaliacao"],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vocabulário relevante para o caso atual — enviado como pista, nunca como regra. */
export function aliasHintsFor(actionIds: string[]): string {
  return actionIds
    .filter((id) => aliasMap[id])
    .map((id) => `${id}: ${aliasMap[id]!.join(", ")}`)
    .join("\n");
}

/**
 * Caminho rápido determinístico: fala curta, sem negação/correção, que casa
 * com apelidos inequívocos. Evita uma ida ao modelo quando não há dúvida.
 */
export function matchDeterministicActions(
  rawContent: string,
  allowedActionIds: string[],
): string[] | null {
  const text = normalize(rawContent);
  if (!text || text.length > 90) return null;
  // Correção, negação, dúvida ou pergunta → sempre interpretação semântica.
  if (/\b(nao|nao e|pera|espera|na verdade|melhor|talvez|sera|quanto|como|qual|por que)\b/.test(text)) {
    return null;
  }
  if (/\?/.test(rawContent)) return null;

  const matched: string[] = [];
  for (const id of allowedActionIds) {
    const aliases = aliasMap[id];
    if (!aliases) continue;
    const hit = aliases.some((alias) => {
      const a = normalize(alias);
      return new RegExp(`(^| )${a}( |$)`).test(text);
    });
    if (hit) matched.push(id);
  }
  return matched.length > 0 && matched.length <= 4 ? matched : null;
}
