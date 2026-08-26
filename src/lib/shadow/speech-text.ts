/**
 * displayText → speechText (client-safe, determinístico).
 *
 * A resposta canônica do Sombra é ÚNICA. Aqui não se gera conteúdo novo:
 * apenas se reescreve a apresentação para que a síntese de voz soe natural.
 * Nenhuma informação médica é alterada, acrescentada ou removida.
 */
export function toSpeechText(displayText: string): string {
  let text = displayText;

  // Markdown e símbolos de UI nunca vão para o TTS.
  text = text
    .replace(/[*_`#>]/g, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\s*[-•]\s+/g, " ");

  // Subscritos/superescritos comuns.
  text = text
    .replace(/SpO₂|SpO2|SatO₂|SatO2/gi, "saturação")
    .replace(/FiO₂|FiO2/gi, "fração inspirada de oxigênio")
    .replace(/CO₂|CO2/gi, "gás carbônico")
    .replace(/O₂/g, "oxigênio");

  // Pressões e frações: "120/80" fala melhor como "120 por 80".
  text = text.replace(/(\d+)\s*\/\s*(\d+)/g, "$1 por $2");

  // Unidades.
  text = text
    .replace(/\bmmHg\b/g, "milímetros de mercúrio")
    .replace(/\bmg\/dL\b/gi, "miligramas por decilitro")
    .replace(/\bmg\s+por\s+dL\b/gi, "miligramas por decilitro")
    .replace(/\bbpm\b/gi, "batimentos por minuto")
    .replace(/\birpm\b/gi, "incursões por minuto")
    .replace(/(\d)\s*%/g, "$1 por cento")
    .replace(/(\d)\s*°C/g, "$1 graus");

  // Decimais falados em pt-BR.
  text = text.replace(/(\d+)\.(\d+)/g, "$1 vírgula $2");

  return text.replace(/\s{2,}/g, " ").trim();
}
