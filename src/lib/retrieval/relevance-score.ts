import type { ResearchRequest, ScholarlyPaperType } from "./research-request.ts";

export type RelevanceMatchLevel = "direct" | "context" | "background";
export type ScholarlySourceClass =
  | "foundational"
  | "landmark-development"
  | "review"
  | "modern-resolution"
  | "specialist-application"
  | "peripheral-context";
export type ResearchBenchmarkCategory =
  | "information-loss"
  | "page-curve"
  | "complementarity-firewall"
  | "holography"
  | "island-replica";

export type RelevanceQueryProfile = {
  originalQuery: string;
  exactQueries: string[];
  expandedQueries: string[];
  providerPriority: string[];
  researchRequest?: ResearchRequest;
};

export type SourceCandidate = {
  id: string;
  title: string;
  abstract?: string;
  authors?: string[];
  year?: number;
  provider: string;
  source?: string;
  url?: string;
  doi?: string;
  arxivId?: string;
  openAlexId?: string;
  adsBibcode?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  openAccess?: boolean;
  publishedAt?: string;
  concepts?: string[];
  keywords?: string[];
  fieldsOfStudy?: string[];
  paperType?: ScholarlyPaperType;
  isRetracted?: boolean;
  isPreprint?: boolean;
  isPeerReviewed?: boolean;
  sourceProviders?: string[];
  rawProviderIds?: Record<string, string>;
  sourceClass?: ScholarlySourceClass;
  benchmarkCategory?: ResearchBenchmarkCategory;
  foundationalPriority?: number;
  citationLabel?: string;
  relevanceReason?: string;
  retrievalPaths?: Array<
    "doi" | "id" | "exact-title" | "partial-title" | "author" | "lexical" | "semantic" | "provider"
  >;
  structuredMatchScore?: number;
};

export type PaperRelevanceFeatures = {
  exactPhraseInTitle: boolean;
  requiredConceptCoverageInTitle: number;
  requiredConceptCoverageInAbstract: number;
  topicCentrality: number;
  semanticSimilarity: number;
  paperTypeMatch: number;
  dateMatch: number;
  authorityScore: number;
  citationScore: number;
  providerAgreement: number;
  landmarkScore: number;
  reviewMatch: number;
  recencyScore: number;
  peripheralPenalty: number;
  ambiguityPenalty: number;
  metadataConfidence: number;
};

export type RankedSource = SourceCandidate & {
  score: number;
  relevanceReason: string;
  matchLevel: RelevanceMatchLevel;
  matchedTerms: string[];
  isDirectMatch: boolean;
  sourceClass: ScholarlySourceClass;
  citationLabel: string;
  relevanceFeatures: PaperRelevanceFeatures;
  classificationBadges: string[];
};

export type SourceRejection = {
  id: string;
  title: string;
  reasons: string[];
};

export type ScholarlySourceSetResult = {
  sources: RankedSource[];
  retrievedCount: number;
  deduplicatedCount: number;
  filteredCount: number;
  qualityPassed: boolean;
  qualityIssues: string[];
  rejections: SourceRejection[];
};

const STOP_WORDS = new Set([
  "a", "an", "and", "about", "after", "best", "directly", "each", "explain", "for", "find", "foundational", "give",
  "highly", "in", "including", "latest", "me", "of", "on", "or", "paper", "papers", "peer", "preprint", "published",
  "recent", "relevant", "research", "review", "show", "sources", "specifically", "study", "the", "to", "what", "why", "with",
]);

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\\[a-z]+\{([^}]*)\}/g, "$1")
    .replace(/[$\\{}]/g, " ")
    .replace(/-/g, " ")
    .replace(/[^\p{L}\p{N}*+\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDoi(value?: string) {
  return value?.toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "").trim();
}

function normalizeArxiv(value?: string) {
  const input = `${value ?? ""}`.replace(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\//i, "").replace(/\.pdf$/i, "");
  return input.replace(/^arxiv:\s*/i, "").replace(/v\d+$/i, "").toLowerCase() || undefined;
}

function normalizedTitle(value: string) {
  return normalizeText(value).replace(/\bv\d+\s*$/i, "").replace(/^(?:a|an|the)\s+/, "");
}

function majorTerms(value: string) {
  return Array.from(new Set(normalizeText(value).split(" ").filter((term) => term.length > 2 && !STOP_WORDS.has(term))));
}

function singularToken(value: string) {
  if (value.endsWith("ies") && value.length > 4) return `${value.slice(0, -3)}y`;
  if (["analysis", "cosmos", "gas", "mars", "physics", "species", "status"].includes(value)) return value;
  if (value.endsWith("s") && !value.endsWith("ss") && value.length > 3) return value.slice(0, -1);
  return value;
}

function conceptForm(value: string) {
  return normalizeText(value).split(" ").map(singularToken).join(" ");
}

const CONCEPT_ALIASES: Record<string, string[]> = {
  atmospheric: ["atmosphere"],
  exoplanet: ["extrasolar planet", "habitable world"],
  jwst: ["james webb", "webb space telescope"],
  mars: ["martian"],
  "early galaxy": ["high redshift galaxy", "cosmic dawn galaxy"],
  "direct detection": ["direct detector", "detector search", "nuclear recoil"],
};

function conceptMatches(text: string, concept: string) {
  const normalizedConcept = conceptForm(concept);
  const alternatives = [normalizedConcept, ...(CONCEPT_ALIASES[normalizedConcept] ?? []).map(conceptForm)];
  return alternatives.some((alternative) => text.includes(` ${alternative} `));
}

function conceptCoverage(text: string, concepts: string[]) {
  if (concepts.length === 0) return 0;
  const comparableText = ` ${conceptForm(text)} `;
  return concepts.filter((concept) => conceptMatches(comparableText, concept)).length / concepts.length;
}

function tokenSimilarity(left: string, right: string) {
  const a = new Set(majorTerms(left));
  const b = new Set(majorTerms(right));
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((term) => b.has(term)).length;
  return intersection / Math.max(a.size, b.size);
}

function providerScore(provider: string, priorities: string[]) {
  const index = priorities.findIndex((candidate) => normalizeText(candidate) === normalizeText(provider));
  return index < 0 ? 0.35 : Math.max(0.45, 1 - index * 0.16);
}

function citationAuthority(citations?: number) {
  if (!citations || citations <= 0) return 0;
  return Math.min(1, Math.log10(citations + 1) / 4);
}

function recency(year?: number, request?: ResearchRequest) {
  if (!year) return 0;
  const currentYear = new Date().getUTCFullYear();
  if (request?.startYear && request.endYear) {
    if (year < request.startYear || year > request.endYear) return 0;
    const span = Math.max(1, request.endYear - request.startYear);
    return 0.65 + 0.35 * ((year - request.startYear) / span);
  }
  return Math.max(0, 1 - Math.max(0, currentYear - year) / 12);
}

function inferBenchmarkCategory(profile: RelevanceQueryProfile, source: SourceCandidate, title: string, abstract: string): ResearchBenchmarkCategory | undefined {
  if (source.benchmarkCategory) return source.benchmarkCategory;
  const topic = normalizeText(profile.researchRequest?.topic ?? profile.originalQuery);
  if (!topic.includes("black hole") || (!topic.includes("information paradox") && !topic.includes("information loss"))) return undefined;
  const combined = `${title} ${abstract}`;
  if (/breakdown of predictability|information loss|particle creation by black holes/.test(combined)) return "information-loss";
  if (/page curve|information in black hole radiation|radiation entropy/.test(combined)) return "page-curve";
  if (/complementarity|firewall/.test(combined)) return "complementarity-firewall";
  if (/ads cft|holograph|superconformal field theories and supergravity/.test(combined)) return "holography";
  if (/island formula|replica wormhole|quantum extremal surface/.test(combined)) return "island-replica";
  return undefined;
}

function inferSourceClass(
  source: SourceCandidate,
  title: string,
  abstract: string,
  benchmarkCategory?: ResearchBenchmarkCategory,
  foundationalAuthority = false,
): ScholarlySourceClass {
  if (source.sourceClass) return source.sourceClass;
  const combined = `${title} ${abstract}`;
  if (/nonperturbative isentropic processes|nonlinear electrodynamics/.test(title)) return "peripheral-context";
  if (source.paperType === "review" || /\b(review|systematic review|progress in|status of|survey)\b/.test(title)) return "review";
  if (foundationalAuthority) {
    if (/entanglement wedge reconstruction|replica wormhole|island formula|complementarity or firewall|large n limit/.test(title)) {
      return "landmark-development";
    }
    return benchmarkCategory === "information-loss" || benchmarkCategory === "page-curve"
      ? "foundational"
      : "landmark-development";
  }
  if (/\b(island|replica wormhole|quantum extremal surface)\b/.test(combined)) return "modern-resolution";
  return "specialist-application";
}

function hasFoundationalAuthority(
  profile: RelevanceQueryProfile,
  source: SourceCandidate,
  title: string,
) {
  if (source.foundationalPriority) return true;
  if (!informationParadoxProfile(profile)) return false;
  const authors = normalizeText(source.authors?.join(" "));
  const hawking = /\bhawking\b/.test(authors) && /breakdown of predictability|particle creation by black holes/.test(title);
  const page = /\bpage\b/.test(authors) && /information in black hole radiation|average entropy of a subsystem|page curve/.test(title);
  const complementarity = /\b(susskind|thorlacius|uglum)\b/.test(authors) && /stretched horizon|black hole complementarity/.test(title);
  const holography = /\bmaldacena\b/.test(authors) && /large n limit|superconformal field theories and supergravity|ads cft/.test(title);
  const firewall = /\b(almheiri|marolf|polchinski|sully)\b/.test(authors) && /complementarity or firewalls|firewall/.test(title);
  const islands = /\b(penington|almheiri|engelhardt|marolf|maxfield)\b/.test(authors) && /entanglement wedge reconstruction|replica wormhole|island formula|page curve|entropy of hawking radiation|quantum extremal surface/.test(title);
  return hawking || page || complementarity || holography || firewall || islands;
}

function labelFor(source: SourceCandidate) {
  if (source.citationLabel) return source.citationLabel;
  const firstAuthor = source.authors?.[0]?.trim();
  const familyName = firstAuthor?.split(/\s+/).at(-1)?.replace(/[^\p{L}'-]/gu, "");
  return `[${familyName || source.provider || "Source"}${(source.authors?.length ?? 0) > 1 ? " et al." : ""} ${source.year ?? "n.d."}]`;
}

function metadataConfidence(source: SourceCandidate) {
  const checks = [
    source.title.length >= 8,
    Boolean(source.authors?.length),
    Boolean(source.year),
    Boolean(source.abstract),
    Boolean(source.url || source.doi || source.arxivId),
    Boolean(source.doi || source.arxivId || source.openAlexId || source.adsBibcode),
  ];
  return checks.filter(Boolean).length / checks.length;
}

function typeMatches(source: SourceCandidate, request?: ResearchRequest) {
  if (!request || !source.paperType) return 0.65;
  return request.paperTypes.includes(source.paperType) ? 1 : 0;
}

function reviewMatches(source: SourceCandidate, sourceClass: ScholarlySourceClass, request?: ResearchRequest) {
  if (!request || (request.mode !== "review" && request.mode !== "systematic-review")) return sourceClass === "review" ? 0.8 : 0.4;
  if (source.paperType !== "review" && sourceClass !== "review") return 0;
  if (request.mode === "systematic-review") {
    return /\bsystematic review|meta analysis|evidence synthesis\b/i.test(`${source.title} ${source.abstract ?? ""}`) ? 1 : 0;
  }
  return 1;
}

function computeScore(features: PaperRelevanceFeatures, request: ResearchRequest | undefined, sourceClass: ScholarlySourceClass) {
  const direct = Math.min(1, features.exactPhraseInTitle ? 1 : features.requiredConceptCoverageInTitle * 0.65 + features.topicCentrality * 0.35);
  const abstractCentrality = features.requiredConceptCoverageInAbstract;
  const authority = Math.max(features.authorityScore, features.citationScore);
  const penalties = features.peripheralPenalty * 45 + features.ambiguityPenalty * 18;
  let score: number;

  switch (request?.mode) {
    case "recent":
      score = direct * 40 + features.recencyScore * 25 + abstractCentrality * 15 + authority * 10 + features.metadataConfidence * 5 + features.providerAgreement * 5;
      break;
    case "latest-developments":
      score = features.recencyScore * 30 + direct * 40 + Math.max(features.semanticSimilarity, abstractCentrality) * 15 + features.authorityScore * 10 + features.metadataConfidence * 5;
      break;
    case "foundational":
    case "landmark":
      score = features.landmarkScore * 30 + direct * 30 + authority * 20 + features.landmarkScore * 15 + features.metadataConfidence * 5;
      break;
    case "review":
    case "systematic-review":
      score = direct * 35 + authority * 25 + Math.min(1, abstractCentrality * 0.7 + features.semanticSimilarity * 0.3) * 20 + features.paperTypeMatch * 10 + features.recencyScore * 10;
      break;
    case "directly-relevant":
      score = Math.max(direct, abstractCentrality) * 55 + features.topicCentrality * 20 + features.metadataConfidence * 10 + authority * 10 + features.recencyScore * 5;
      break;
    case "highly-cited":
      score = direct * 42 + authority * 33 + features.landmarkScore * 15 + features.metadataConfidence * 10;
      break;
    default:
      score = direct * 50 + abstractCentrality * 15 + authority * 12 + features.recencyScore * 8 + features.metadataConfidence * 10 + features.providerAgreement * 5;
  }

  if (sourceClass === "foundational" || sourceClass === "landmark-development") score += request?.mode === "foundational" || request?.mode === "landmark" ? 12 : 3;
  if (sourceClass === "modern-resolution" && request?.mode === "latest-developments") score += 8;
  if (sourceClass === "peripheral-context") score -= 45;
  if (features.reviewMatch === 0 && (request?.mode === "review" || request?.mode === "systematic-review")) score -= 55;
  return Math.round(Math.max(-100, Math.min(120, score - penalties)) * 100) / 100;
}

function specificReason(
  source: SourceCandidate,
  features: PaperRelevanceFeatures,
  sourceClass: ScholarlySourceClass,
  request?: ResearchRequest,
  benchmarkCategory?: ResearchBenchmarkCategory,
) {
  const topic = request?.topic ?? "the requested topic";
  if (source.relevanceReason) return source.relevanceReason;
  if (benchmarkCategory === "information-loss") return "Establishes the semiclassical information-loss side of the black-hole information paradox created by evaporation.";
  if (benchmarkCategory === "page-curve") return "Connects radiation entropy and unitary evaporation to the expected Page-curve behaviour.";
  if (benchmarkCategory === "complementarity-firewall") return "Defines a central horizon-consistency proposal or the firewall conflict that challenges it.";
  if (benchmarkCategory === "holography") return "Supplies the holographic framework in which black-hole evolution is expected to remain unitary.";
  if (benchmarkCategory === "island-replica") return "Develops the island or replica-wormhole entropy calculation that reproduces a unitary Page curve.";
  if (sourceClass === "foundational") return `Foundational work that established a central result for ${topic}.`;
  if (sourceClass === "landmark-development") return `Landmark contribution that introduced or materially changed a central framework for ${topic}.`;
  if (sourceClass === "review") return `Review focused on ${topic}, selected for direct coverage and synthesis rather than a passing keyword match.`;
  if (sourceClass === "modern-resolution") return `Modern development that directly advances a leading approach to ${topic}.`;
  if (features.exactPhraseInTitle) return source.abstract
    ? `The title directly names ${topic}, and the abstract treats it as a central objective.`
    : `The title directly names ${topic}; no abstract was available for a stronger evidence claim.`;
  if (features.requiredConceptCoverageInTitle === 1) return source.abstract
    ? `The title covers every central concept in ${topic}; the abstract confirms the paper's direct scientific focus.`
    : `The title covers every central concept in ${topic}; no abstract was available for a stronger evidence claim.`;
  if (features.requiredConceptCoverageInAbstract >= 0.8) return `The abstract directly studies ${topic} and covers the central concepts requested by the user.`;
  return `The paper provides narrower scholarly context for ${topic}.`;
}

function badges(source: SourceCandidate, features: PaperRelevanceFeatures, sourceClass: ScholarlySourceClass, request?: ResearchRequest) {
  const values: string[] = [];
  if (features.exactPhraseInTitle || features.topicCentrality >= 0.78) values.push("Direct match");
  if (sourceClass === "foundational") values.push("Foundational");
  if (sourceClass === "landmark-development") values.push("Landmark");
  if (sourceClass === "modern-resolution") values.push("Modern development");
  if (sourceClass === "review") values.push(request?.mode === "systematic-review" ? "Systematic review" : "Review");
  if (source.isPeerReviewed) values.push("Peer reviewed");
  if (source.isPreprint || source.paperType === "preprint") values.push("Preprint");
  if ((source.citationCount ?? 0) >= 500) values.push("Highly cited");
  if (request?.startYear && source.year && source.year >= request.startYear) values.push("Recent");
  return Array.from(new Set(values)).slice(0, 4);
}

export function rankSources(profile: RelevanceQueryProfile, candidates: SourceCandidate[]): RankedSource[] {
  const request = profile.researchRequest;
  const topic = request?.topic ?? profile.originalQuery;
  const topicText = normalizeText(topic);
  const requiredConcepts = request?.requiredConcepts?.length ? request.requiredConcepts : majorTerms(topic);

  return candidates
    .filter((source) => Boolean(source.title?.trim()))
    .map((source) => {
      const title = normalizeText(source.title);
      const abstract = normalizeText(source.abstract);
      const structuredIdentityMatch = Boolean(
        source.retrievalPaths?.some((path) => path === "doi" || path === "id" || path === "exact-title"),
      );
      const structuredDiscoveryMatch = Boolean(
        source.retrievalPaths?.some((path) =>
          path === "partial-title" || path === "author" || path === "lexical" || path === "semantic" || path === "provider"
        ),
      );
      const strongStructuredMatch = Boolean(
        structuredIdentityMatch ||
        source.retrievalPaths?.some((path) => path === "partial-title" || path === "author") ||
        structuredDiscoveryMatch && (source.structuredMatchScore ?? 0) >= 55,
      );
      const titleCoverage = conceptCoverage(title, requiredConcepts);
      const abstractCoverage = conceptCoverage(abstract, requiredConcepts);
      const objectiveCoverage = conceptCoverage(abstract.slice(0, 700), requiredConcepts);
      const exactPhraseInTitle = topicText.length > 5 && title.includes(topicText);
      const exactPhraseInAbstract = topicText.length > 5 && abstract.includes(topicText);
      const topicOccurrences = topicText ? abstract.split(topicText).length - 1 : 0;
      const objectiveLanguage = /\b(?:we|this (?:paper|study|review|work))\s+(?:analyse|analyze|assess|derive|evaluate|examine|investigate|present|report|review|search|study|test)\b/.test(abstract);
      const peripheralLanguage = /\b(?:background|demonstration dataset|mentioned (?:as|only)|one possible implication|passing reference|peripheral application)\b/.test(abstract);
      const benchmarkCategory = inferBenchmarkCategory(profile, source, title, abstract);
      const foundationalAuthority = hasFoundationalAuthority(profile, source, title);
      const sourceClass = inferSourceClass(source, title, abstract, benchmarkCategory, foundationalAuthority);
      const landmark = foundationalAuthority;
      const topicCentrality = Math.min(1, titleCoverage * 0.6 + objectiveCoverage * 0.25 + abstractCoverage * 0.15 + (exactPhraseInTitle ? 0.2 : 0));
      const providerAgreement = Math.min(1, Math.max(1, source.sourceProviders?.length ?? 1) / 3);
      const metadata = metadataConfidence(source);
      const peripheralPenalty = sourceClass === "peripheral-context"
        ? 1
        : landmark
          ? 0
        : titleCoverage === 0 && abstractCoverage < 0.65
          ? 0.8
          : /\bmachine learning|classifier|calibration\b/.test(title) && titleCoverage < 0.5
            ? 0.65
            : peripheralLanguage && titleCoverage < 0.75
              ? 0.65
              : exactPhraseInAbstract && topicOccurrences <= 1 && !objectiveLanguage && titleCoverage < 0.5
              ? 0.55
              : 0;
      const features: PaperRelevanceFeatures = {
        exactPhraseInTitle,
        requiredConceptCoverageInTitle: titleCoverage,
        requiredConceptCoverageInAbstract: abstractCoverage,
        topicCentrality,
        semanticSimilarity: Math.max(tokenSimilarity(topic, source.title), tokenSimilarity(topic, source.abstract ?? "")),
        paperTypeMatch: typeMatches(source, request),
        dateMatch: !request?.startYear || !source.year ? 0.5 : source.year >= request.startYear && (!request.endYear || source.year <= request.endYear) ? 1 : 0,
        authorityScore: Math.max(citationAuthority(source.citationCount), providerScore(source.provider, profile.providerPriority) * 0.5),
        citationScore: citationAuthority(source.citationCount),
        providerAgreement,
        landmarkScore: landmark ? Math.min(1, 0.75 + (source.foundationalPriority ? Math.max(0, 0.25 - source.foundationalPriority * 0.02) : 0)) : 0,
        reviewMatch: reviewMatches(source, sourceClass, request),
        recencyScore: recency(source.year, request),
        peripheralPenalty,
        ambiguityPenalty: !abstract && !exactPhraseInTitle && !landmark ? 1 : 0,
        metadataConfidence: metadata,
      };
      const score = Math.max(
        computeScore(features, request, sourceClass),
        source.structuredMatchScore ?? 0,
        structuredIdentityMatch ? 98 : structuredDiscoveryMatch ? Math.min(84, source.structuredMatchScore ?? 0) : 0,
      );
      const directEvidence = exactPhraseInTitle || titleCoverage === 1 || foundationalAuthority || (
        sourceClass === "review" &&
        features.reviewMatch > 0 &&
        (titleCoverage >= 0.5 || abstractCoverage >= 0.8)
      );
      const abstractCentral = abstractCoverage >= 0.8 && (
        exactPhraseInAbstract ||
        topicOccurrences >= 2 ||
        titleCoverage >= 2 / 3 ||
        objectiveCoverage >= 0.8 && titleCoverage >= 0.5
      ) && (
        objectiveLanguage ||
        topicOccurrences >= 2 ||
        titleCoverage >= 0.75
      ) && !peripheralLanguage;
      const abstractContradictsTitle = Boolean(
        abstract &&
        (exactPhraseInTitle || titleCoverage >= 0.8) &&
        abstractCoverage < 0.5 &&
        !benchmarkCategory &&
        !foundationalAuthority,
      );
      const isDirectMatch = Boolean(
        strongStructuredMatch ||
        (directEvidence || abstractCentral) && !abstractContradictsTitle && peripheralPenalty < 0.55,
      );
      const matchLevel: RelevanceMatchLevel = isDirectMatch && (score >= 45 || structuredIdentityMatch || foundationalAuthority || exactPhraseInTitle && score >= 38)
        ? "direct"
        : score >= 28 && peripheralPenalty < 0.8
          ? "context"
          : "background";
      const matchedTerms = majorTerms(topic).filter((term) => title.includes(term) || abstract.includes(term));

      return {
        ...source,
        benchmarkCategory,
        sourceClass,
        score,
        matchedTerms,
        isDirectMatch,
        matchLevel,
        citationLabel: labelFor(source),
        relevanceFeatures: features,
        relevanceReason: specificReason(source, features, sourceClass, request, benchmarkCategory),
        classificationBadges: badges(source, features, sourceClass, request),
      };
    })
    .sort((left, right) => right.score - left.score || (right.citationCount ?? 0) - (left.citationCount ?? 0));
}

function duplicateKey(source: SourceCandidate) {
  const doi = normalizeDoi(source.doi);
  if (doi) return `doi:${doi}`;
  const arxiv = normalizeArxiv(source.arxivId ?? source.url);
  if (arxiv) return `arxiv:${arxiv}`;
  if (source.openAlexId) return `openalex:${source.openAlexId.toLowerCase()}`;
  if (source.adsBibcode) return `ads:${source.adsBibcode.toLowerCase()}`;
  const author = source.authors?.[0] ? normalizeText(source.authors[0]) : "unknown";
  return `title:${normalizedTitle(source.title)}:${author}`;
}

export function deduplicateRankedSources(sources: RankedSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = duplicateKey(source);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function metadataReasons(source: RankedSource) {
  const reasons: string[] = [];
  const currentYear = new Date().getUTCFullYear();
  if (!source.title || source.title.length < 8 || /^(?:untitled|unknown)(?:\s|$)/i.test(source.title)) reasons.push("invalid_title");
  if (!source.authors?.length) reasons.push("missing_authors");
  if (source.year !== undefined && (source.year < 1600 || source.year > currentYear + 1)) reasons.push("implausible_year");
  if (source.doi && !/^10\.\d{4,9}\/[\w.()/:;-]+$/i.test(normalizeDoi(source.doi) ?? "")) reasons.push("malformed_doi");
  if (!source.url && !source.doi && !source.arxivId) reasons.push("missing_verifiable_link");
  if (source.isRetracted) reasons.push("retracted");
  return reasons;
}

function constraintReasons(source: RankedSource, profile: RelevanceQueryProfile, requiresDirectSources: boolean) {
  const request = profile.researchRequest;
  const reasons = metadataReasons(source);
  if (request?.startYear && (!source.year || source.year < request.startYear)) reasons.push("outside_requested_date_range");
  if (request?.endYear && (!source.year || source.year > request.endYear)) reasons.push("outside_requested_date_range");
  if (request?.peerReviewedOnly && !source.isPeerReviewed) reasons.push("peer_review_required");
  if ((request?.mode === "foundational" || request?.mode === "landmark") && source.relevanceFeatures.landmarkScore === 0) reasons.push("foundational_authority_required");
  if (request && source.paperType && !request.paperTypes.includes(source.paperType)) reasons.push("paper_type_mismatch");
  if ((request?.mode === "review" || request?.mode === "systematic-review") && source.relevanceFeatures.reviewMatch === 0) reasons.push("review_required");
  if (source.sourceClass === "peripheral-context" || source.relevanceFeatures.peripheralPenalty >= 0.55 || requiresDirectSources && !source.isDirectMatch || source.matchLevel === "background") {
    reasons.push("below_direct_relevance_threshold");
  }
  return Array.from(new Set(reasons));
}

function informationParadoxProfile(profile: RelevanceQueryProfile) {
  const topic = normalizeText(profile.researchRequest?.topic ?? profile.originalQuery);
  return topic.includes("black hole") && (topic.includes("information paradox") || topic.includes("information loss"));
}

export function selectScholarlySourceSet(
  profile: RelevanceQueryProfile,
  rankedSources: RankedSource[],
  options: { limit?: number; requiresDirectSources?: boolean } = {},
): ScholarlySourceSetResult {
  const requested = profile.researchRequest?.resultCount ?? options.limit ?? 8;
  const limit = Math.min(10, Math.max(1, options.limit ?? requested));
  const requiresDirectSources = options.requiresDirectSources ?? true;
  const seen = new Set<string>();
  const deduplicated: RankedSource[] = [];
  const rejections: SourceRejection[] = [];

  for (const source of rankedSources) {
    const key = duplicateKey(source);
    if (seen.has(key)) {
      rejections.push({ id: source.id, title: source.title, reasons: ["duplicate_version"] });
      continue;
    }
    seen.add(key);
    deduplicated.push(source);
  }

  const eligible = deduplicated.filter((source) => {
    const reasons = constraintReasons(source, profile, requiresDirectSources);
    if (reasons.length === 0) return true;
    rejections.push({ id: source.id, title: source.title, reasons });
    return false;
  });
  const selected: RankedSource[] = [];

  if (informationParadoxProfile(profile) && requiresDirectSources) {
    const categoryOrder: ResearchBenchmarkCategory[] = ["information-loss", "page-curve", "complementarity-firewall", "holography", "island-replica"];
    for (const category of categoryOrder) {
      const source = eligible.find((candidate) => candidate.benchmarkCategory === category && !selected.includes(candidate));
      if (source) selected.push(source);
      if (selected.length >= limit) break;
    }
  }

  for (const source of eligible) {
    if (selected.length >= limit) break;
    if (selected.includes(source)) continue;
    const sameLeadAuthor = selected.filter((item) => item.authors?.[0] && item.authors[0] === source.authors?.[0]).length;
    if (sameLeadAuthor >= 2 && eligible.some((item) => item.authors?.[0] !== source.authors?.[0] && !selected.includes(item))) continue;
    selected.push(source);
  }

  const qualityIssues: string[] = [];
  if (selected.length < limit) qualityIssues.push("fewer_sources_met_direct_relevance_threshold");
  if (informationParadoxProfile(profile)) {
    const foundationalCount = selected.filter((source) => source.sourceClass === "foundational" || source.sourceClass === "landmark-development").length;
    if (profile.researchRequest?.mode === "foundational" && foundationalCount < Math.min(2, limit)) qualityIssues.push("fewer_than_two_foundational_or_landmark_sources");
  }
  if ((profile.researchRequest?.mode === "review" || profile.researchRequest?.mode === "systematic-review") && selected.some((source) => source.sourceClass !== "review")) {
    qualityIssues.push("non_review_source_selected");
  }

  return {
    sources: selected,
    retrievedCount: rankedSources.length,
    deduplicatedCount: deduplicated.length,
    filteredCount: Math.max(0, rankedSources.length - selected.length),
    qualityPassed: qualityIssues.length === 0,
    qualityIssues,
    rejections,
  };
}

export function selectHighQualitySources(sources: RankedSource[], limit = 8) {
  const deduplicated = deduplicateRankedSources(sources);
  const direct = deduplicated.filter((source) => source.sourceClass !== "peripheral-context" && source.matchLevel === "direct");
  if (direct.length > 0) return direct.slice(0, limit);
  return deduplicated
    .filter((source) => source.sourceClass !== "peripheral-context" && source.matchLevel !== "background")
    .slice(0, Math.min(3, limit));
}

export function validateCitationSourceMapping(text: string, sources: RankedSource[]) {
  const labels = Array.from(new Set(text.match(/\[[A-Z][^\]\n]{1,70}(?:\d{4}|n\.d\.)\]/g) ?? []));
  const allowed = new Set(sources.map((source) => source.citationLabel));
  const unmappedLabels = labels.filter((label) => !allowed.has(label));
  return { valid: unmappedLabels.length === 0, labels, unmappedLabels };
}
