import type { ResearchRequest } from "./research-request.ts";

export type ScholarlyProvider = "OpenAlex" | "arXiv" | "CORE";
export type ScholarlyQueryPurpose =
  | "exact-phrase"
  | "canonical-term"
  | "synonym"
  | "narrow-subtopic"
  | "landmark-author"
  | "review"
  | "recent-development";

export type ScholarlyQueryVariant = {
  query: string;
  purpose: ScholarlyQueryPurpose;
};

export type ScholarlyQueryPlan = {
  request: ResearchRequest;
  variants: ScholarlyQueryVariant[];
  providers: ScholarlyProvider[];
  candidateLimitPerProvider: number;
};

function normalized(value: string) {
  return value.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function variantsForTopic(request: ResearchRequest): ScholarlyQueryVariant[] {
  const topic = request.topic.trim();
  const value = normalized(topic);
  const variants: ScholarlyQueryVariant[] = [{ query: topic, purpose: "exact-phrase" }];

  if (value.includes("black hole information paradox") || value.includes("black hole information loss")) {
    variants.push(
      { query: '"Breakdown of Predictability in Gravitational Collapse"', purpose: "landmark-author" },
      { query: '"Information in Black Hole Radiation"', purpose: "landmark-author" },
      { query: '"Black Holes Complementarity or Firewalls"', purpose: "narrow-subtopic" },
      { query: '"The Large N Limit of Superconformal Field Theories and Supergravity"', purpose: "narrow-subtopic" },
      { query: '"Replica Wormholes and the Entropy of Hawking Radiation"', purpose: "recent-development" },
      { query: "black hole information loss paradox", purpose: "synonym" },
      { query: "black hole unitarity", purpose: "canonical-term" },
      { query: "black hole complementarity", purpose: "narrow-subtopic" },
    );
  } else if (value.includes("exoplanet") && value.includes("biosignature")) {
    variants.push(
      { query: "exoplanet atmospheric biosignatures", purpose: "canonical-term" },
      { query: "biosignature gases exoplanet atmospheres", purpose: "synonym" },
      { query: "exoplanet biosignature false positives", purpose: "narrow-subtopic" },
    );
  } else if (value.includes("dark matter") && value.includes("direct detection")) {
    variants.push(
      { query: "dark matter direct detection", purpose: "canonical-term" },
      { query: "WIMP nuclear recoil direct detection", purpose: "narrow-subtopic" },
      { query: "dark matter detector experimental limits", purpose: "synonym" },
    );
  } else if (value.includes("mars") && value.includes("biosignature")) {
    variants.push(
      { query: "Mars biosignature preservation", purpose: "canonical-term" },
      { query: "Martian astrobiology biosignatures", purpose: "synonym" },
    );
  } else if ((value.includes("jwst") || value.includes("james webb")) && value.includes("galax")) {
    variants.push(
      { query: "JWST early galaxies high redshift observations", purpose: "canonical-term" },
      { query: "James Webb cosmic dawn galaxy observations", purpose: "synonym" },
    );
  } else if (value.includes("gravitational lensing")) {
    variants.push({ query: "gravitational lensing review", purpose: "review" });
  } else if (value.includes("astronomy education")) {
    variants.push({ query: "astronomy education systematic review", purpose: "review" });
  } else if (value.includes("quantum gravity") && value.includes("black hole") && value.includes("entropy")) {
    variants.push(
      { query: "quantum gravity black hole entropy", purpose: "canonical-term" },
      { query: "Bekenstein Hawking entropy quantum gravity", purpose: "landmark-author" },
      { query: "black hole entropy microstates", purpose: "narrow-subtopic" },
    );
  } else if (request.requiredConcepts.length > 1) {
    variants.push({ query: request.requiredConcepts.join(" "), purpose: "canonical-term" });
  }

  if ((request.mode === "review" || request.mode === "systematic-review") && !variants.some((variant) => variant.purpose === "review")) {
    variants.push({ query: `${topic} ${request.mode === "systematic-review" ? "systematic review" : "review"}`, purpose: "review" });
  }
  if ((request.mode === "recent" || request.mode === "latest-developments") && !variants.some((variant) => variant.purpose === "recent-development")) {
    variants.push({ query: `${topic} recent developments`, purpose: "recent-development" });
  }

  const seen = new Set<string>();
  return variants.filter((variant) => {
    const key = normalized(variant.query);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 9);
}

function providerOrder(request: ResearchRequest): ScholarlyProvider[] {
  const topic = normalized(request.topic);
  const physics = /black hole|quantum gravity|entropy|cosmology|astrophys|astronom|exoplanet|mars|jwst|galax|lensing/.test(topic);
  if (physics) return ["arXiv", "OpenAlex", "CORE"];
  return ["OpenAlex", "CORE", "arXiv"];
}

export function createScholarlyQueryPlan(request: ResearchRequest): ScholarlyQueryPlan {
  return {
    request,
    variants: variantsForTopic(request),
    providers: providerOrder(request),
    candidateLimitPerProvider: 20,
  };
}

export function selectPrimaryQueryVariants(plan: ScholarlyQueryPlan) {
  const mode = plan.request.mode;
  const exact = plan.variants[0];

  if (mode === "foundational" || mode === "landmark") {
    const topic = normalized(plan.request.topic);
    if (topic.includes("black hole information paradox") || topic.includes("black hole information loss")) {
      const patterns = [
        /predictability/,
        /information in black hole radiation|page curve/,
        /complementarity|firewall/,
        /large n limit|superconformal|ads cft|holograph/,
        /island|replica wormhole/,
      ];
      return [
        exact,
        ...patterns.map((pattern) => plan.variants.find((variant) => variant !== exact && pattern.test(normalized(variant.query)))),
      ].filter((variant): variant is ScholarlyQueryVariant => Boolean(variant)).slice(0, 6);
    }

    return [
      exact,
      ...plan.variants.filter((variant) => variant !== exact && ["landmark-author", "canonical-term", "narrow-subtopic", "synonym"].includes(variant.purpose)),
    ].slice(0, 6);
  }

  const preferredPurposes: ScholarlyQueryPurpose[] = mode === "review" || mode === "systematic-review"
    ? ["review", "canonical-term", "synonym"]
    : mode === "latest-developments"
      ? ["recent-development", "canonical-term", "narrow-subtopic"]
      : ["canonical-term", "narrow-subtopic", "synonym", "recent-development"];
  const alternate = preferredPurposes
    .map((purpose) => plan.variants.find((variant) => variant.purpose === purpose && variant !== exact))
    .find((variant): variant is ScholarlyQueryVariant => Boolean(variant));

  return [exact, alternate].filter((variant): variant is ScholarlyQueryVariant => Boolean(variant));
}
