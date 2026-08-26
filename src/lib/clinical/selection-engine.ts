/**
 * Phase 06.7 — Seleção determinística de caso.
 *
 * Recebe a configuração da estação (tema, nível, duração) e devolve um caso
 * da biblioteca com variante aplicada. Nenhum LLM escolhe verdade clínica:
 * a escolha é filtro + sorteio semeado, sempre reproduzível pela semente.
 */
import type { ClinicalCaseDefinition } from "./clinical-case-types";
import type { LevelId } from "@/lib/shadow-content";
import { caseLibrary, getCaseById } from "./case-library";
import { applyVariant, pickDeterministic, seededRandom } from "./case-variants";

export type CaseSelectionRequest = {
  themeId?: string;
  levelId?: LevelId;
  durationId?: string;
  /** Ids de casos já treinados recentemente — evitados quando possível. */
  excludeCaseIds?: string[];
  /** Semente para reprodutibilidade; ausente = derivada do relógio. */
  seed?: number;
};

export type CaseSelection = {
  definition: ClinicalCaseDefinition;
  seed: number;
  variantId: string | null;
  /** Quantos critérios foram relaxados para encontrar um caso. */
  relaxedCriteria: string[];
};

function matchesTheme(c: ClinicalCaseDefinition, themeId?: string) {
  return !themeId || c.themeId === themeId;
}

function matchesLevel(c: ClinicalCaseDefinition, levelId?: LevelId) {
  if (!levelId) return true;
  if (c.level === levelId) return true;
  return (c.variants ?? []).some((v) => v.difficulty === levelId);
}

function matchesDuration(c: ClinicalCaseDefinition, durationId?: string) {
  if (!durationId) return true;
  const list = c.meta.compatibleDurations;
  return !list || list.length === 0 || list.includes(durationId);
}

/** Filtro progressivo: duração → nível → tema. Nunca devolve lista vazia. */
function filterCases(req: CaseSelectionRequest): { pool: ClinicalCaseDefinition[]; relaxed: string[] } {
  const relaxed: string[] = [];
  const base = caseLibrary.filter((c) => c.meta.review.status !== "draft");
  const notRecent = (pool: ClinicalCaseDefinition[]) => {
    const filtered = pool.filter((c) => !(req.excludeCaseIds ?? []).includes(c.id));
    return filtered.length > 0 ? filtered : pool;
  };

  let pool = base.filter(
    (c) => matchesTheme(c, req.themeId) && matchesLevel(c, req.levelId) && matchesDuration(c, req.durationId),
  );
  if (pool.length > 0) return { pool: notRecent(pool), relaxed };

  relaxed.push("duração");
  pool = base.filter((c) => matchesTheme(c, req.themeId) && matchesLevel(c, req.levelId));
  if (pool.length > 0) return { pool: notRecent(pool), relaxed };

  relaxed.push("nível");
  pool = base.filter((c) => matchesTheme(c, req.themeId));
  if (pool.length > 0) return { pool: notRecent(pool), relaxed };

  relaxed.push("tema");
  return { pool: notRecent(base), relaxed };
}

/** Escolhe o caso e aplica variante compatível com o nível pedido. */
export function selectCase(req: CaseSelectionRequest = {}): CaseSelection {
  const seed = req.seed ?? Date.now();
  const rand = seededRandom(seed);
  const { pool, relaxed } = filterCases(req);
  const chosen = pickDeterministic(pool, rand) ?? caseLibrary[0]!;

  const variantPool = (chosen.variants ?? []).filter(
    (v) => !req.levelId || !v.difficulty || v.difficulty === req.levelId,
  );
  const variant = pickDeterministic(variantPool.length > 0 ? variantPool : (chosen.variants ?? []), rand);

  const applied = applyVariant(chosen, { variantId: variant?.id ?? null, seed });
  return {
    definition: applied.definition,
    seed,
    variantId: applied.definition.variantId ?? variant?.id ?? null,
    relaxedCriteria: relaxed,
  };
}

/** Reconstrói exatamente a mesma estação a partir de caso + variante + semente. */
export function rebuildCase(caseId: string, variantId: string | null, seed: number): ClinicalCaseDefinition {
  return applyVariant(getCaseById(caseId), { variantId, seed }).definition;
}
