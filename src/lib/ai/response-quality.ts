export type ResponseQualityAssessment = {
  passed: boolean;
  hasRepeatedParagraphs: boolean;
  hasAnonymousResearchSources: boolean;
  unmappedCitationLabels: string[];
  unsupportedClaimSignals: string[];
};

function normalizedParagraph(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function extractCitationLabels(text: string) {
  return Array.from(new Set(text.match(/\[[A-Z][^\]\n]{1,70}(?:\d{4}|n\.d\.)\]/g) ?? []));
}

export function assessGeneratedResponse(text: string, allowedCitationLabels: string[] = []): ResponseQualityAssessment {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(normalizedParagraph)
    .filter((paragraph) => paragraph.length >= 24 && !paragraph.startsWith("related questions"));
  const seen = new Set<string>();
  const duplicateParagraph = paragraphs.some((paragraph) => {
    if (seen.has(paragraph)) return true;
    seen.add(paragraph);
    return false;
  });
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(normalizedParagraph)
    .filter((sentence) => sentence.length >= 24);
  const seenSentences = new Set<string>();
  const duplicateSentence = sentences.some((sentence) => {
    if (seenSentences.has(sentence)) return true;
    seenSentences.add(sentence);
    return false;
  });
  const hasRepeatedParagraphs = duplicateParagraph || duplicateSentence;
  const allowed = new Set(allowedCitationLabels);
  const unmappedCitationLabels = extractCitationLabels(text).filter((label) => !allowed.has(label));
  const hasAnonymousResearchSources = /\bresearch sources?\s*(?:\d|\[|one|two|three|four|five|six|seven|eight)/i.test(text);
  const overclaims = [
    /general relativity says information is destroyed/i,
    /scientists have solved the paradox/i,
    /nasa confirmed/i,
    /definitive proof/i,
    /comprehensive overview/i,
  ];
  const unsupportedClaimSignals = overclaims.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);

  return {
    passed: !hasRepeatedParagraphs && !hasAnonymousResearchSources && unmappedCitationLabels.length === 0 && unsupportedClaimSignals.length === 0,
    hasRepeatedParagraphs,
    hasAnonymousResearchSources,
    unmappedCitationLabels,
    unsupportedClaimSignals,
  };
}

export function createCitationIntegrityFilter(allowedCitationLabels: string[]) {
  const allowed = new Set(allowedCitationLabels);
  let pending = "";

  function filterComplete(value: string) {
    if (!/^\[[A-Z][^\]\n]{1,70}(?:\d{4}|n\.d\.)\]$/.test(value)) return value;
    return allowed.has(value) ? value : "";
  }

  return {
    push(chunk: string) {
      let output = "";
      for (const character of chunk) {
        if (pending) {
          pending += character;
          if (character === "]") {
            output += filterComplete(pending);
            pending = "";
          } else if (pending.length > 80 || character === "\n") {
            output += pending;
            pending = "";
          }
        } else if (character === "[") {
          pending = character;
        } else {
          output += character;
        }
      }
      return output;
    },
    flush() {
      const output = pending;
      pending = "";
      return output;
    },
  };
}
