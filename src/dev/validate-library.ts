import { caseLibrary } from "@/lib/clinical/case-library";
import { validateCases } from "@/lib/clinical/case-validation";
import { selectCase } from "@/lib/clinical/selection-engine";
for (const r of validateCases(caseLibrary)) console.log(JSON.stringify(r));
console.log("sel:", ["emergencia","cardiologia","pneumologia","infectologia"].map(t => selectCase({themeId:t, levelId:"intermediario", durationId:"15", seed:7}).definition.id));
