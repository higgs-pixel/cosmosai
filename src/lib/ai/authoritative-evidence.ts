import type { CosmosQueryIntent } from "./query-intent.ts";

export type AuthoritativeEvidence = {
  id: string;
  title: string;
  provider: "NASA" | "NASA Science" | "NASA JPL";
  url: string;
  date?: string;
  relevanceReason: string;
  evidence: string;
};

const MARS_EVIDENCE: AuthoritativeEvidence[] = [
  {
    id: "nasa-face-on-mars",
    title: "The So-Called 'Face on Mars'",
    provider: "NASA Science",
    url: "https://science.nasa.gov/photojournal/the-so-called-face-on-mars/",
    date: "2002-05-21",
    relevanceReason: "Higher-resolution orbital imaging identifies the famous face-like feature as an eroded hill rather than an artificial structure.",
    evidence: "NASA describes slopes, resistant rock layers, wind erosion, gravity-driven downslope motion, shadows, and viewing distance as the origin of the face-like appearance.",
  },
  {
    id: "nasa-mars-organics",
    title: "NASA Finds Ancient Organic Material, Mysterious Methane on Mars",
    provider: "NASA",
    url: "https://www.nasa.gov/news-release/nasa-finds-ancient-organic-material-mysterious-methane-on-mars/",
    date: "2018-06-07",
    relevanceReason: "Separates detection of organic molecules and ancient habitability from evidence that life produced those molecules.",
    evidence: "Curiosity detected ancient organic material and evidence of a once-habitable lake, but NASA states that the source of the organics was not determined and may be non-biological.",
  },
  {
    id: "nasa-mars-life-evidence",
    title: "NASA Experiment Suggests Need to Dig Deep for Evidence of Life on Mars",
    provider: "NASA",
    url: "https://www.nasa.gov/solar-system/nasa-experiment-suggests-need-to-dig-deep-for-evidence-of-life-on-mars/",
    date: "2022-06-27",
    relevanceReason: "Explains why organic matter is not by itself a confirmed biosignature and why Mars life claims require stronger evidence.",
    evidence: "NASA explicitly notes that organic matter can be produced by non-biological chemistry and is not a conclusive sign of life.",
  },
];

const JWST_EVIDENCE: AuthoritativeEvidence[] = [
  {
    id: "nasa-webb-early-universe",
    title: "Early Universe",
    provider: "NASA Science",
    url: "https://science.nasa.gov/mission/webb/science-overview/science-explainers/early-universe/",
    relevanceReason: "Places Webb's observations of early galaxies within tests of galaxy-formation models, not as a refutation of cosmic expansion or the hot Big Bang framework.",
    evidence: "Webb studies how the first luminous structures assembled after the hot early universe; surprising early galaxies refine formation models rather than, by themselves, disproving the Big Bang.",
  },
];

export function getAuthoritativeEvidence(intent: CosmosQueryIntent): AuthoritativeEvidence[] {
  if (intent.mode !== "false-premise") return [];
  if (/\b(?:mars|alien|extraterrestrial|life|structures?)\b/.test(intent.normalizedQuery)) {
    return MARS_EVIDENCE.map((source) => ({ ...source }));
  }
  if (/\b(?:jwst|james webb|big bang)\b/.test(intent.normalizedQuery)) {
    return JWST_EVIDENCE.map((source) => ({ ...source }));
  }
  return [];
}

