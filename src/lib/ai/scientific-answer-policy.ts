import { classifyCosmosQuery } from "./query-intent.ts";

export type ScientificQuestionAnalysis = {
  isAdvanced: boolean;
  topic: "black-hole-information-paradox" | "general-advanced-science" | "standard";
  sections: string[];
  requiredConcepts: string[];
  targetWords?: { min: number; max: number };
};

export type ScientificResponseBudget = {
  maxOutputTokens: number;
  maxStreamedCharacters: number;
  timeoutMs: number;
};

const ADVANCED_SECTIONS = [
  "Direct answer",
  "Physical setup",
  "Why the paradox arises",
  "Key concepts",
  "Major proposed resolutions",
  "Current scientific status",
  "Sources and evidence",
  "Remaining uncertainty",
];

const INFORMATION_PARADOX_CONCEPTS = [
  "Hawking radiation",
  "approximately thermal radiation",
  "pure and mixed quantum states",
  "unitarity",
  "entanglement across the event horizon",
  "black-hole evaporation",
  "Page curve",
  "Page time",
  "information recovery",
  "holography / AdS-CFT",
  "black-hole complementarity",
  "AMPS firewall proposal",
  "quantum extremal surfaces",
  "replica wormholes",
  "island formula",
  "remnants or non-unitary alternatives",
];

const ADVANCED_MARKERS = [
  "including",
  "derive",
  "mechanism",
  "paradox",
  "unitarity",
  "quantum state",
  "evidence",
  "proposed resolutions",
  "current scientific status",
];

function normalized(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function analyzeScientificQuestion(
  prompt: string,
  mode: string,
  audience: string,
): ScientificQuestionAnalysis {
  const query = normalized(prompt);
  const intent = classifyCosmosQuery(prompt);
  const isInformationParadox =
    query.includes("black hole") &&
    (query.includes("information paradox") || query.includes("information loss")) &&
    (query.includes("hawking") || query.includes("unitarity") || query.includes("evaporation"));
  const isAdvanced =
    isInformationParadox ||
    intent.mode === "advanced-scientific" ||
    audience === "researcher" ||
    ADVANCED_MARKERS.filter((marker) => query.includes(marker)).length >= 2;

  if (isInformationParadox) {
    return {
      isAdvanced: true,
      topic: "black-hole-information-paradox",
      sections: [...ADVANCED_SECTIONS],
      requiredConcepts: [...INFORMATION_PARADOX_CONCEPTS],
      targetWords: { min: 650, max: 1_100 },
    };
  }

  if (isAdvanced) {
    return {
      isAdvanced: true,
      topic: "general-advanced-science",
      sections: [...ADVANCED_SECTIONS],
      requiredConcepts: [],
      targetWords: { min: 650, max: 1_100 },
    };
  }

  return {
    isAdvanced: false,
    topic: "standard",
    sections: [],
    requiredConcepts: [],
  };
}

export function getScientificResponseBudget(
  analysis: ScientificQuestionAnalysis,
): ScientificResponseBudget {
  return analysis.isAdvanced
    ? { maxOutputTokens: 2_200, maxStreamedCharacters: 11_000, timeoutMs: 60_000 }
    : { maxOutputTokens: 300, maxStreamedCharacters: 1_500, timeoutMs: 25_000 };
}

export function buildScientificAnswerPolicy(analysis: ScientificQuestionAnalysis) {
  if (!analysis.isAdvanced) return "";

  const sectionRules = [
    "ADVANCED SCIENTIFIC ANSWER POLICY:",
    `Write ${analysis.targetWords?.min ?? 650}-${analysis.targetWords?.max ?? 1_100} words unless the user explicitly asks for brevity.`,
    "Use these markdown headings exactly and in this order:",
    ...analysis.sections.map((section) => `### ${section}`),
    "Begin with a direct 3-5 sentence answer, then develop the physics in concise paragraphs without repeating points.",
    "Define each explicitly named concept and explain its role in the argument; do not merely list terminology.",
    "Attach a supplied bracketed citation label to each source-dependent claim. Use only labels present in SOURCE CONTEXT.",
    "Place each citation immediately after the claim it supports rather than attaching one generic citation block to a whole section.",
    "Every source discussed must give its title, author or first author, year, provider, DOI or arXiv identifier when available, and one sentence explaining relevance.",
    "Every source named in prose must map exactly to an attached source record and its visible source card.",
    "Never write 'Research source 1', 'Research sources 1-8', or another anonymous numbered-source label.",
    "Calibrate claims using these labels where appropriate: established result, strong theoretical evidence, leading proposal, disputed proposal, speculative possibility.",
    "Distinguish mathematical results in controlled models from a demonstrated microscopic mechanism for realistic evaporating black holes.",
  ];

  if (analysis.topic !== "black-hole-information-paradox") {
    return sectionRules.join("\n");
  }

  return [
    ...sectionRules,
    "Required concept coverage (explain the meaning and relevance of every item):",
    ...analysis.requiredConcepts.map((concept) => `- ${concept}`),
    "Precision requirements:",
    "- Say that classical general relativity hides information behind the horizon; do not say that general relativity by itself proves information is destroyed.",
    "- Explain that Hawking's semiclassical evaporation calculation creates the apparent information-loss problem through apparently thermal outgoing radiation.",
    "- Define unitarity as preservation of quantum probabilities and inner products, equivalently reversible evolution from a complete pure state to another pure state.",
    "- Explain why a pure initial state evolving into a genuinely mixed final radiation state would violate unitarity.",
    "- Explain the expected Page curve and Page time, including what changes before and after the entropy maximum.",
    "- State that holographic evidence strongly favours unitarity, while the detailed physical mechanism in realistic evaporating black holes remains debated.",
    "- Explain at least four resolution families in substantive paragraphs: complementarity, holography/AdS-CFT, AMPS firewalls, islands/quantum extremal surfaces/replica wormholes, and remnants or explicitly non-unitary alternatives. Give each core mechanism, evidence level, and principal cost or unresolved problem.",
    "- Do not say that information is simply stored inside, that the paradox is solved without qualification, or that there is no consensus without explaining what is and is not broadly accepted.",
    "Before finalizing, silently verify that every required concept has a substantive explanation and every bibliographic claim maps to an attached source.",
  ].join("\n");
}

export function buildInformationParadoxFallbackAnswer() {
  return [
    "### Direct answer",
    "",
    "The black-hole information paradox is a conflict between Hawking's semiclassical description of an evaporating black hole and unitary quantum mechanics. Hawking's calculation makes the outgoing radiation approximately thermal: at leading order, it depends on macroscopic quantities such as mass, charge and spin, not on the detailed quantum state that formed the hole. If evaporation ends with only genuinely thermal radiation, an initially pure state appears to become a mixed state, erasing recoverable quantum correlations and violating unitarity. Holography provides strong theoretical evidence that the full process is unitary, but the exact microscopic account for realistic astrophysical black holes remains unsettled. [Hawking 1976] [Maldacena 1997]",
    "",
    "### Physical setup",
    "",
    "In quantum field theory on a curved black-hole background, the horizon separates field modes accessible to distant observers from partner modes behind the horizon. The outgoing mode is entangled with its interior partner. After tracing over the inaccessible interior mode, a distant observer describes the outgoing radiation by a thermal density matrix. This is the basis of Hawking radiation and predicts gradual loss of black-hole mass: black-hole evaporation. The calculation is an established semiclassical result, meaning quantum fields are treated on a classical spacetime rather than in a complete quantum theory of gravity. [Hawking 1975]",
    "",
    "A pure quantum state contains maximal information about a closed system and can be represented by a state vector. A mixed state is instead a statistical mixture described by a density matrix that cannot be reduced to one state vector. Unitarity means that the evolution operator preserves inner products and total probability; for a complete isolated system, it maps a pure state reversibly to another pure state. Therefore a fundamental pure-to-mixed map would not merely hide information from a practical observer: it would change the rules of quantum evolution. [Hawking 1976]",
    "",
    "### Why the problem arises",
    "",
    "Early Hawking quanta are entangled with partners behind the horizon. If each later quantum is produced in the same independent thermal way, the entanglement entropy of the accumulated radiation keeps rising. But if the entire evaporation is unitary, the radiation must eventually purify itself through correlations among the emitted quanta. The Page curve expresses that expectation: radiation entropy rises at first, reaches a maximum near the Page time, then falls toward zero as information becomes recoverable from correlations in the late radiation. The Page time is roughly when the black hole has radiated about half of its initial entropy, not a sharply universal clock time. [Page 1993]",
    "",
    "### Essential concepts",
    "",
    "The tension is therefore among horizon entanglement, approximately thermal emission and unitary information recovery. A late Hawking quantum cannot be maximally entangled both with an interior partner, as a smooth horizon appears to require, and with early radiation, as late-time purification requires. This is an application of entanglement monogamy and makes the paradox sharper than the vague statement that information is 'inside' the hole.",
    "",
    "### Major proposed resolutions",
    "",
    "**Black-hole complementarity — leading proposal.** Information can be encoded in degrees of freedom associated with a stretched horizon and later emerge in radiation for a distant observer, while an infalling observer experiences a smooth horizon. No single observer can compare both descriptions and witness forbidden cloning. The challenge is to formulate this observer-dependent picture in a complete microscopic theory. [Susskind et al. 1993]",
    "",
    "**Holography and AdS/CFT — strong theoretical evidence.** AdS/CFT relates certain gravitational systems to nongravitational quantum theories whose evolution is unitary. This strongly suggests that black-hole formation and evaporation have a unitary description. Its force is greatest in controlled anti-de Sitter models; translating the mechanism to evaporating black holes in our approximately flat universe remains nontrivial. [Maldacena 1997]",
    "",
    "**AMPS firewalls — disputed proposal.** AMPS argued that purity of the radiation, ordinary effective field theory outside the horizon and a smooth horizon cannot all hold simultaneously after the Page time. A firewall abandons the smooth-horizon assumption by placing high-energy excitations near the horizon. It exposes the logical conflict clearly, but many researchers regard the violent horizon as a substantial physical cost rather than an established feature. [Almheiri et al. 2012]",
    "",
    "**Quantum extremal surfaces, islands and replica wormholes — modern resolution framework.** In controlled gravitational models, the entropy calculation must include an 'island' region inside the black hole when evaluating the radiation's generalized entropy. The dominant quantum extremal surface changes near the Page time, causing the calculated entropy to follow the Page curve. Replica-wormhole saddle points give a path-integral route to the same transition. These are major mathematical developments, but reproducing a unitary entropy curve is not yet the same as identifying every microscopic carrier of information in a realistic evaporating black hole. [Almheiri et al. 2019] [Penington et al. 2019]",
    "",
    "**Remnants or fundamental non-unitarity — speculative alternatives.** A long-lived Planck-scale remnant might retain the information, but it must accommodate an enormous number of states and raises production and stability problems. Fundamental non-unitary evolution accepts Hawking's original conclusion, but would require modifying ordinary quantum mechanics and confronting energy, causality and predictability constraints.",
    "",
    "### Current scientific status",
    "",
    "Hawking radiation in semiclassical theory and the internal consistency of unitary quantum mechanics are established ingredients of the paradox. Holography strongly favours unitary evolution, and island calculations reproduce the expected Page curve in controlled models. Neither result licenses the simple claim that the paradox is completely solved for realistic four-dimensional black holes. The live questions concern how interior information is encoded, how semiclassical spacetime emerges, and what an infalling observer physically experiences.",
    "",
    "### Evidence and sources",
    "",
    "The attached scholarly cards map the claims above to Hawking's evaporation and information-loss papers, Page's entropy argument, complementarity, AdS/CFT, AMPS, and modern island and replica-wormhole calculations. Bibliographic fields shown there come from the retrieved records; absent fields are left unavailable rather than inferred.",
    "",
    "### Remaining uncertainty",
    "",
    "The strongest current position is calibrated rather than absolute: unitary evaporation has compelling theoretical support, while the detailed mechanism in realistic spacetime, the status of the interior, and the operational experience at the horizon remain active research questions.",
  ].join("\n");
}
