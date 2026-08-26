/**
 * Arquitetura de marca oficial.
 *
 * Ecossistema: Medneeds
 * Produto (pt-BR): Modo Sombra
 * Nome internacional: Shadow Mode
 * Assinatura: By Medneeds
 */

export const brand = {
  ecosystem: "Medneeds",
  product: "Modo Sombra",
  productInternational: "Shadow Mode",
  signature: "By Medneeds",
  /** Apresentação preferida (linha de apoio sob o nome do produto). */
  supportLine: "Shadow Mode | By Medneeds",
  /** Superfícies compactas (header mobile, metadados curtos). */
  compact: "Modo Sombra | By Medneeds",
} as const;

/** Sufixo de título de página: "Configurar estação — Modo Sombra | By Medneeds". */
export function pageTitle(pageName: string): string {
  return `${pageName} — ${brand.compact}`;
}
