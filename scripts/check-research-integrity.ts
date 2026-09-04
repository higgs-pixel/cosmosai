import { getVerifiedResearchCatalogue } from "../src/lib/retrieval/foundational-literature.ts";
import { checkResearchIntegrity } from "../src/lib/retrieval/research-integrity.ts";

const report = checkResearchIntegrity(getVerifiedResearchCatalogue());
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
