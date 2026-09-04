import { getFoundationalResearchSources } from "../../src/lib/retrieval/foundational-literature.ts";
import type { SourceCandidate } from "../../src/lib/retrieval/relevance-score.ts";

export type ResearchBenchmark = {
  id: string;
  query: string;
  candidates: SourceCandidate[];
  expectedMode: string;
  minimumSelected: number;
};

function directSet(
  prefix: string,
  titles: string[],
  abstract: string,
  options: Partial<SourceCandidate> = {},
) {
  return titles.map((title, index): SourceCandidate => ({
    id: `${prefix}-${index + 1}`,
    title,
    abstract,
    authors: [`Benchmark Author ${index + 1}`],
    year: 2026 - (index % 3),
    provider: index % 2 === 0 ? "OpenAlex" : "arXiv",
    source: index % 2 === 0 ? "Benchmark Journal" : "arXiv",
    url: `https://example.test/research/${prefix}-${index + 1}`,
    paperType: index % 2 === 0 ? "journal-article" : "preprint",
    isPeerReviewed: index % 2 === 0,
    isPreprint: index % 2 !== 0,
    isRetracted: false,
    sourceProviders: [index % 2 === 0 ? "OpenAlex" : "arXiv"],
    citationCount: 20 + index * 10,
    ...options,
  }));
}

const TANGENTIAL: SourceCandidate[] = [
  {
    id: "tangential-ml",
    title: "A highly cited machine-learning classifier",
    abstract: "A generic classifier paper that mentions astronomy once as an example.",
    authors: ["Peripheral Author"],
    year: 2026,
    provider: "OpenAlex",
    url: "https://example.test/research/tangential-ml",
    paperType: "journal-article",
    isPeerReviewed: true,
    citationCount: 9_000,
  },
  {
    id: "retracted-record",
    title: "A retracted result with broad astronomy keywords",
    abstract: "This record is retracted and cannot pass metadata verification.",
    authors: ["Retracted Author"],
    year: 2026,
    provider: "OpenAlex",
    url: "https://example.test/research/retracted",
    paperType: "journal-article",
    isPeerReviewed: true,
    isRetracted: true,
  },
];

export const RESEARCH_BENCHMARKS: ResearchBenchmark[] = [
  {
    id: "exoplanet-biosignatures-recent",
    query: "Give me five recent papers on exoplanet atmospheric biosignatures.",
    expectedMode: "recent",
    minimumSelected: 5,
    candidates: [
      ...directSet("exobio", [
        "Exoplanet atmospheric biosignatures in temperate worlds",
        "Atmospheric biosignatures and false positives on exoplanets",
        "Detecting exoplanet atmospheric biosignatures with transmission spectra",
        "Exoplanet atmospheric biosignature gases under stellar activity",
        "Statistical evidence for atmospheric biosignatures on exoplanets",
      ], "We evaluate exoplanet atmospheric biosignatures, life-detection observables, and false-positive controls as the central objective."),
      ...TANGENTIAL,
    ],
  },
  {
    id: "information-paradox-foundational",
    query: "Give me five foundational papers on the black hole information paradox.",
    expectedMode: "foundational",
    minimumSelected: 5,
    candidates: [...getFoundationalResearchSources("black hole information paradox"), ...TANGENTIAL],
  },
  {
    id: "gravitational-lensing-reviews",
    query: "Give me the best review papers on gravitational lensing.",
    expectedMode: "review",
    minimumSelected: 3,
    candidates: [
      ...directSet("lensing-review", [
        "Gravitational lensing: a review of strong and weak regimes",
        "A review of gravitational lensing in cosmology",
        "Gravitational lensing methods and applications: a review",
      ], "This review synthesises gravitational lensing theory, observations, methods, and cosmological applications.", {
        paperType: "review",
        isPeerReviewed: true,
        isPreprint: false,
      }),
      ...directSet("lensing-article", ["A gravitational lensing measurement in one cluster"], "We report one gravitational lensing measurement.", { paperType: "journal-article" }),
    ],
  },
  {
    id: "dark-matter-direct-peer-reviewed",
    query: "Give me five peer-reviewed papers published after 2023 on dark-matter direct detection.",
    expectedMode: "recent",
    minimumSelected: 5,
    candidates: [
      ...directSet("dark-matter-direct", [
        "Dark-matter direct detection with xenon nuclear recoils",
        "Dark-matter direct-detection limits from cryogenic sensors",
        "A low-threshold dark-matter direct-detection experiment",
        "Dark-matter direct detection using electronic recoils",
        "Combined constraints from dark-matter direct-detection experiments",
      ], "We report a peer-reviewed dark-matter direct-detection search, detector response, recoil analysis, and experimental limits.", {
        paperType: "journal-article",
        isPeerReviewed: true,
        isPreprint: false,
      }),
      {
        ...directSet("old-direct", ["Dark-matter direct detection in an older experiment"], "A direct-detection search.", { paperType: "journal-article", isPeerReviewed: true })[0],
        year: 2022,
      },
      ...TANGENTIAL,
    ],
  },
  {
    id: "mars-biosignatures-recent",
    query: "Give me recent papers about Mars biosignatures.",
    expectedMode: "recent",
    minimumSelected: 5,
    candidates: [
      ...directSet("mars-bio", [
        "Mars biosignatures in Jezero crater sediments",
        "Preservation of Mars biosignatures in sulfate minerals",
        "Mars biosignatures and rover sampling strategies",
        "Assessing organic Mars biosignatures under radiation",
        "Mars biosignature detection in returned samples",
      ], "We investigate Mars biosignatures, preservation, astrobiological context, and detection evidence as the central objective."),
      ...directSet("mars-geology", ["Recent sediment transport on Mars"], "A geology study without a biosignature objective."),
    ],
  },
  {
    id: "jwst-early-galaxies",
    query: "Give me papers on JWST observations of early galaxies.",
    expectedMode: "general",
    minimumSelected: 5,
    candidates: [
      ...directSet("jwst-galaxies", [
        "JWST observations of early galaxies at high redshift",
        "Spectroscopic JWST observations of early galaxies",
        "JWST observations reveal early-galaxy star formation",
        "Early galaxies in deep JWST observations",
        "JWST observational constraints on early galaxies",
      ], "We analyse JWST observations of early galaxies, high-redshift spectra, and cosmic-dawn populations."),
      ...directSet("jwst-instrument", ["Calibration of a JWST detector"], "An instrumentation calibration paper without early-galaxy observations."),
    ],
  },
  {
    id: "astronomy-education-systematic",
    query: "Give me systematic reviews on astronomy education.",
    expectedMode: "systematic-review",
    minimumSelected: 5,
    candidates: [
      ...directSet("astro-education-review", [
        "A systematic review of astronomy education research",
        "Astronomy education interventions: a systematic review",
        "A systematic review of misconceptions in astronomy education",
        "Digital tools in astronomy education: systematic evidence review",
        "Inclusive astronomy education: a systematic review",
      ], "This systematic review synthesises astronomy education evidence using explicit search, screening, and inclusion methods.", {
        paperType: "review",
        isPeerReviewed: true,
        isPreprint: false,
      }),
      ...directSet("classroom-study", ["One classroom study in astronomy education"], "An ordinary classroom intervention study.", { paperType: "journal-article" }),
    ],
  },
  {
    id: "quantum-gravity-entropy-latest",
    query: "Give me the latest important papers on quantum gravity and black-hole entropy.",
    expectedMode: "latest-developments",
    minimumSelected: 5,
    candidates: [
      ...directSet("qg-entropy", [
        "Quantum gravity corrections to black-hole entropy",
        "Black-hole entropy microstates in quantum gravity",
        "Quantum gravity and the statistical origin of black-hole entropy",
        "Recent quantum-gravity constraints from black-hole entropy",
        "Black-hole entropy beyond semiclassical quantum gravity",
      ], "We study quantum gravity and black-hole entropy, including microstates and corrections, as the primary objective."),
      ...directSet("quantum-computing", ["Quantum computing algorithms for optimisation"], "A quantum-computing paper unrelated to gravity or black-hole entropy."),
    ],
  },
];

