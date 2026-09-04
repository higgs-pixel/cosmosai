export interface CatalogStar {
  id: string;
  name: string;
  bayer?: string;
  constellation: string;
  raHours: number; // Right Ascension in hours (0..24)
  decDeg: number;  // Declination in degrees (-90..+90)
  vmag: number;    // Visual magnitude (smaller = brighter)
  bvIndex: number; // B-V color index (-0.3 = blue, 0.0 = white, 0.6 = yellow, 1.5 = orange, 2.0 = red)
  spectral?: string;
}

export interface DeepSkyObject {
  id: string;
  name: string;
  type: "Galaxy" | "Nebula" | "Star Cluster" | "Supernova Remnant";
  constellation: string;
  raHours: number;
  decDeg: number;
  vmag: number;
  description: string;
}

export interface ConstellationDef {
  id: string;
  name: string;
  englishName: string;
  raHours: number;  // Center RA for labeling
  decDeg: number;   // Center Dec for labeling
  lines: [number, number][]; // Line segments connecting star indices in the catalog array or star IDs
  starIds: string[]; // List of star IDs belonging to this constellation stick figure
}

// Map B-V color index to hex color
export function bvToColorHex(bv: number): string {
  if (bv < -0.2) return "#aabfff"; // Deep Blue-White (O5)
  if (bv < 0.0) return "#cad3ff";  // Blue-White (B0)
  if (bv < 0.3) return "#f8f9ff";  // White (A0 - Vega/Sirius)
  if (bv < 0.6) return "#fff4ea";  // Yellow-White (F5 - Procyon)
  if (bv < 0.8) return "#fff0db";  // Yellow (G2 - Sun/Capella)
  if (bv < 1.3) return "#ffd2a1";  // Orange (K0 - Arcturus/Aldebaran)
  return "#ffab73";                // Red (M2 - Betelgeuse/Antares)
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMINENT VISIBLE STARS CATALOG (RA in hours, Dec in degrees, Vmag, B-V)
// ─────────────────────────────────────────────────────────────────────────────
export const STAR_CATALOG: CatalogStar[] = [
  // Polaris & Ursa Minor
  { id: "polaris", name: "Polaris", bayer: "Alpha UMi", constellation: "UMi", raHours: 2.53, decDeg: 89.26, vmag: 1.98, bvIndex: 0.6, spectral: "F7Ib" },
  { id: "kochab", name: "Kochab", bayer: "Beta UMi", constellation: "UMi", raHours: 14.85, decDeg: 74.16, vmag: 2.08, bvIndex: 1.47, spectral: "K4III" },
  { id: "pherkad", name: "Pherkad", bayer: "Gamma UMi", constellation: "UMi", raHours: 15.35, decDeg: 71.83, vmag: 3.05, bvIndex: 0.05, spectral: "A3II" },
  { id: "zeta_umi", name: "Zeta UMi", bayer: "Zeta UMi", constellation: "UMi", raHours: 15.73, decDeg: 77.79, vmag: 4.28, bvIndex: 0.04 },
  { id: "eta_umi", name: "Eta UMi", bayer: "Eta UMi", constellation: "UMi", raHours: 16.29, decDeg: 75.76, vmag: 4.95, bvIndex: 0.37 },
  { id: "epsilon_umi", name: "Epsilon UMi", bayer: "Epsilon UMi", constellation: "UMi", raHours: 16.76, decDeg: 82.04, vmag: 4.21, bvIndex: 0.94 },
  { id: "yildun", name: "Yildun", bayer: "Delta UMi", constellation: "UMi", raHours: 17.54, decDeg: 86.59, vmag: 4.36, bvIndex: -0.04 },

  // Ursa Major (Big Dipper)
  { id: "dubhe", name: "Dubhe", bayer: "Alpha UMa", constellation: "UMa", raHours: 11.06, decDeg: 61.75, vmag: 1.79, bvIndex: 1.07, spectral: "K0III" },
  { id: "merak", name: "Merak", bayer: "Beta UMa", constellation: "UMa", raHours: 11.03, decDeg: 56.38, vmag: 2.37, bvIndex: 0.0, spectral: "A1V" },
  { id: "phecda", name: "Phecda", bayer: "Gamma UMa", constellation: "UMa", raHours: 11.90, decDeg: 53.69, vmag: 2.44, bvIndex: 0.08 },
  { id: "megrez", name: "Megrez", bayer: "Delta UMa", constellation: "UMa", raHours: 12.26, decDeg: 57.03, vmag: 3.31, bvIndex: 0.08 },
  { id: "alioth", name: "Alioth", bayer: "Epsilon UMa", constellation: "UMa", raHours: 12.90, decDeg: 55.96, vmag: 1.77, bvIndex: -0.02, spectral: "A1p" },
  { id: "mizar", name: "Mizar", bayer: "Zeta UMa", constellation: "UMa", raHours: 13.40, decDeg: 54.92, vmag: 2.23, bvIndex: 0.02 },
  { id: "alkaid", name: "Alkaid", bayer: "Eta UMa", constellation: "UMa", raHours: 13.79, decDeg: 49.31, vmag: 1.86, bvIndex: -0.19, spectral: "B3V" },

  // Orion
  { id: "betelgeuse", name: "Betelgeuse", bayer: "Alpha Ori", constellation: "Ori", raHours: 5.92, decDeg: 7.41, vmag: 0.42, bvIndex: 1.85, spectral: "M1-M2ia-Iab" },
  { id: "rigel", name: "Rigel", bayer: "Beta Ori", constellation: "Ori", raHours: 5.24, decDeg: -8.20, vmag: 0.13, bvIndex: -0.03, spectral: "B8Iab" },
  { id: "bellatrix", name: "Bellatrix", bayer: "Gamma Ori", constellation: "Ori", raHours: 5.42, decDeg: 6.35, vmag: 1.64, bvIndex: -0.22, spectral: "B2III" },
  { id: "mintaka", name: "Mintaka", bayer: "Delta Ori", constellation: "Ori", raHours: 5.53, decDeg: -0.30, vmag: 2.23, bvIndex: -0.21 },
  { id: "alnilam", name: "Alnilam", bayer: "Epsilon Ori", constellation: "Ori", raHours: 5.60, decDeg: -1.20, vmag: 1.69, bvIndex: -0.19 },
  { id: "alnitak", name: "Alnitak", bayer: "Zeta Ori", constellation: "Ori", raHours: 5.68, decDeg: -1.94, vmag: 1.77, bvIndex: -0.21 },
  { id: "saiph", name: "Saiph", bayer: "Kappa Ori", constellation: "Ori", raHours: 5.79, decDeg: -9.67, vmag: 2.09, bvIndex: -0.18 },
  { id: "meissa", name: "Meissa", bayer: "Lambda Ori", constellation: "Ori", raHours: 5.58, decDeg: 9.93, vmag: 3.33, bvIndex: -0.18 },

  // Canis Major
  { id: "sirius", name: "Sirius", bayer: "Alpha CMa", constellation: "CMa", raHours: 6.75, decDeg: -16.72, vmag: -1.46, bvIndex: 0.0, spectral: "A1V" },
  { id: "adhara", name: "Adhara", bayer: "Epsilon CMa", constellation: "CMa", raHours: 6.98, decDeg: -28.97, vmag: 1.50, bvIndex: -0.21 },
  { id: "wezen", name: "Wezen", bayer: "Delta CMa", constellation: "CMa", raHours: 7.14, decDeg: -26.39, vmag: 1.84, bvIndex: 0.67 },
  { id: "mirzam", name: "Mirzam", bayer: "Beta CMa", constellation: "CMa", raHours: 6.38, decDeg: -17.96, vmag: 1.98, bvIndex: -0.24 },
  { id: "aludra", name: "Aludra", bayer: "Eta CMa", constellation: "CMa", raHours: 7.40, decDeg: -29.30, vmag: 2.45, bvIndex: -0.10 },

  // Taurus
  { id: "aldebaran", name: "Aldebaran", bayer: "Alpha Tau", constellation: "Tau", raHours: 4.60, decDeg: 16.51, vmag: 0.85, bvIndex: 1.54, spectral: "K5III" },
  { id: "elnath", name: "Elnath", bayer: "Beta Tau", constellation: "Tau", raHours: 5.44, decDeg: 28.61, vmag: 1.65, bvIndex: -0.13 },
  { id: "tianguan", name: "Tianguan", bayer: "Zeta Tau", constellation: "Tau", raHours: 5.63, decDeg: 21.14, vmag: 3.01, bvIndex: -0.19 },
  { id: "alcyone", name: "Alcyone (Pleiades)", bayer: "Eta Tau", constellation: "Tau", raHours: 3.79, decDeg: 24.11, vmag: 2.87, bvIndex: -0.09 },

  // Cassiopeia
  { id: "schedar", name: "Schedar", bayer: "Alpha Cas", constellation: "Cas", raHours: 0.68, decDeg: 56.54, vmag: 2.24, bvIndex: 1.17, spectral: "K0IIIa" },
  { id: "caph", name: "Caph", bayer: "Beta Cas", constellation: "Cas", raHours: 0.15, decDeg: 59.15, vmag: 2.28, bvIndex: 0.34 },
  { id: "gamma_cas", name: "Navi", bayer: "Gamma Cas", constellation: "Cas", raHours: 0.94, decDeg: 60.72, vmag: 2.15, bvIndex: -0.15 },
  { id: "ruchbah", name: "Ruchbah", bayer: "Delta Cas", constellation: "Cas", raHours: 1.43, decDeg: 60.23, vmag: 2.68, bvIndex: 0.13 },
  { id: "segin", name: "Segin", bayer: "Epsilon Cas", constellation: "Cas", raHours: 1.90, decDeg: 63.67, vmag: 3.35, bvIndex: -0.15 },

  // Cygnus
  { id: "deneb", name: "Deneb", bayer: "Alpha Cyn", constellation: "Cyg", raHours: 20.69, decDeg: 45.28, vmag: 1.25, bvIndex: 0.09, spectral: "A2Ia" },
  { id: "sadr", name: "Sadr", bayer: "Gamma Cyn", constellation: "Cyg", raHours: 20.37, decDeg: 40.26, vmag: 2.23, bvIndex: 0.67 },
  { id: "albireo", name: "Albireo", bayer: "Beta Cyn", constellation: "Cyg", raHours: 19.51, decDeg: 27.96, vmag: 3.05, bvIndex: 1.10 },
  { id: "gienah_cyg", name: "Gienah", bayer: "Epsilon Cyn", constellation: "Cyg", raHours: 20.77, decDeg: 33.97, vmag: 2.48, bvIndex: 1.03 },
  { id: "fawaris", name: "Fawaris", bayer: "Delta Cyn", constellation: "Cyg", raHours: 19.75, decDeg: 45.13, vmag: 2.87, bvIndex: -0.06 },

  // Lyra
  { id: "vega", name: "Vega", bayer: "Alpha Lyr", constellation: "Lyr", raHours: 18.62, decDeg: 38.78, vmag: 0.03, bvIndex: 0.0, spectral: "A0V" },
  { id: "sheliak", name: "Sheliak", bayer: "Beta Lyr", constellation: "Lyr", raHours: 18.83, decDeg: 33.36, vmag: 3.52, bvIndex: 0.0 },
  { id: "sulafat", name: "Sulafat", bayer: "Gamma Lyr", constellation: "Lyr", raHours: 18.98, decDeg: 32.69, vmag: 3.25, bvIndex: -0.05 },

  // Aquila
  { id: "altair", name: "Altair", bayer: "Alpha Aql", constellation: "Aql", raHours: 19.84, decDeg: 8.87, vmag: 0.77, bvIndex: 0.22, spectral: "A7V" },
  { id: "alshain", name: "Alshain", bayer: "Beta Aql", constellation: "Aql", raHours: 19.92, decDeg: 6.41, vmag: 3.71, bvIndex: 0.86 },
  { id: "tarazed", name: "Tarazed", bayer: "Gamma Aql", constellation: "Aql", raHours: 19.77, decDeg: 10.61, vmag: 2.72, bvIndex: 1.52 },

  // Scorpius
  { id: "antares", name: "Antares", bayer: "Alpha Sco", constellation: "Sco", raHours: 16.49, decDeg: -26.43, vmag: 0.96, bvIndex: 1.83, spectral: "M1.5Iab" },
  { id: "shaula", name: "Shaula", bayer: "Lambda Sco", constellation: "Sco", raHours: 17.56, decDeg: -37.10, vmag: 1.62, bvIndex: -0.22 },
  { id: "sargas", name: "Sargas", bayer: "Theta Sco", constellation: "Sco", raHours: 17.62, decDeg: -42.99, vmag: 1.86, bvIndex: 0.40 },
  { id: "dschubba", name: "Dschubba", bayer: "Delta Sco", constellation: "Sco", raHours: 16.00, decDeg: -22.62, vmag: 2.29, bvIndex: -0.12 },
  { id: "larawag", name: "Larawag", bayer: "Epsilon Sco", constellation: "Sco", raHours: 16.84, decDeg: -34.29, vmag: 2.29, bvIndex: 1.15 },
  { id: "graffias", name: "Graffias", bayer: "Beta Sco", constellation: "Sco", raHours: 16.09, decDeg: -19.80, vmag: 2.56, bvIndex: -0.07 },

  // Leo
  { id: "regulus", name: "Regulus", bayer: "Alpha Leo", constellation: "Leo", raHours: 10.14, decDeg: 11.97, vmag: 1.36, bvIndex: -0.11, spectral: "B7V" },
  { id: "denebola", name: "Denebola", bayer: "Beta Leo", constellation: "Leo", raHours: 11.82, decDeg: 14.57, vmag: 2.14, bvIndex: 0.09 },
  { id: "algieba", name: "Algieba", bayer: "Gamma Leo", constellation: "Leo", raHours: 10.33, decDeg: 19.84, vmag: 2.01, bvIndex: 1.14 },
  { id: "zosma", name: "Zosma", bayer: "Delta Leo", constellation: "Leo", raHours: 11.23, decDeg: 20.52, vmag: 2.56, bvIndex: 0.12 },

  // Bootes
  { id: "arcturus", name: "Arcturus", bayer: "Alpha Boo", constellation: "Boo", raHours: 14.26, decDeg: 19.18, vmag: -0.05, bvIndex: 1.23, spectral: "K1.5III" },
  { id: "iztar", name: "Izar", bayer: "Epsilon Boo", constellation: "Boo", raHours: 14.75, decDeg: 27.07, vmag: 2.35, bvIndex: 0.97 },
  { id: "muphrid", name: "Muphrid", bayer: "Eta Boo", constellation: "Boo", raHours: 13.91, decDeg: 18.39, vmag: 2.68, bvIndex: 0.58 },

  // Virgo
  { id: "spica", name: "Spica", bayer: "Alpha Vir", constellation: "Vir", raHours: 13.42, decDeg: -11.16, vmag: 0.98, bvIndex: -0.23, spectral: "B1III" },
  { id: "porrima", name: "Porrima", bayer: "Gamma Vir", constellation: "Vir", raHours: 12.69, decDeg: -1.45, vmag: 2.74, bvIndex: 0.36 },
  { id: "vindemiatrix", name: "Vindemiatrix", bayer: "Epsilon Vir", constellation: "Vir", raHours: 13.04, decDeg: 10.96, vmag: 2.85, bvIndex: 0.94 },

  // Auriga
  { id: "capella", name: "Capella", bayer: "Alpha Aur", constellation: "Aur", raHours: 5.28, decDeg: 46.00, vmag: 0.08, bvIndex: 0.80, spectral: "G3III" },
  { id: "menkalinan", name: "Menkalinan", bayer: "Beta Aur", constellation: "Aur", raHours: 5.99, decDeg: 44.95, vmag: 1.90, bvIndex: 0.03 },

  // Gemini
  { id: "pollux", name: "Pollux", bayer: "Beta Gem", constellation: "Gem", raHours: 7.76, decDeg: 28.03, vmag: 1.14, bvIndex: 1.00, spectral: "K0III" },
  { id: "castor", name: "Castor", bayer: "Alpha Gem", constellation: "Gem", raHours: 7.58, decDeg: 31.89, vmag: 1.58, bvIndex: 0.03, spectral: "A1V" },
  { id: "alhena", name: "Alhena", bayer: "Gamma Gem", constellation: "Gem", raHours: 6.63, decDeg: 16.39, vmag: 1.93, bvIndex: 0.0 },

  // Canis Minor
  { id: "procyon", name: "Procyon", bayer: "Alpha CMi", constellation: "CMi", raHours: 7.65, decDeg: 5.22, vmag: 0.38, bvIndex: 0.42, spectral: "F5IV-V" },

  // Pegasus
  { id: "enif", name: "Enif", bayer: "Epsilon Peg", constellation: "Peg", raHours: 21.74, decDeg: 9.87, vmag: 2.38, bvIndex: 1.53 },
  { id: "scheat", name: "Scheat", bayer: "Beta Peg", constellation: "Peg", raHours: 23.06, decDeg: 28.08, vmag: 2.44, bvIndex: 1.67 },
  { id: "markab", name: "Markab", bayer: "Alpha Peg", constellation: "Peg", raHours: 23.08, decDeg: 15.21, vmag: 2.49, bvIndex: -0.04 },

  // Andromeda
  { id: "alpheratz", name: "Alpheratz", bayer: "Alpha And", constellation: "And", raHours: 0.14, decDeg: 29.09, vmag: 2.07, bvIndex: -0.11 },
  { id: "mirach", name: "Mirach", bayer: "Beta And", constellation: "And", raHours: 1.16, decDeg: 35.62, vmag: 2.07, bvIndex: 1.57 },
  { id: "almach", name: "Almach", bayer: "Gamma And", constellation: "And", raHours: 2.06, decDeg: 42.33, vmag: 2.10, bvIndex: 1.37 },

  // Perseus
  { id: "mirfak", name: "Mirfak", bayer: "Alpha Per", constellation: "Per", raHours: 3.41, decDeg: 49.86, vmag: 1.79, bvIndex: 0.48 },
  { id: "algol", name: "Algol", bayer: "Beta Per", constellation: "Per", raHours: 3.14, decDeg: 40.95, vmag: 2.09, bvIndex: -0.05 },

  // Southern Sky Luminaries
  { id: "canopus", name: "Canopus", bayer: "Alpha Car", constellation: "Car", raHours: 6.40, decDeg: -52.70, vmag: -0.74, bvIndex: 0.15, spectral: "A9II" },
  { id: "achernar", name: "Achernar", bayer: "Alpha Eri", constellation: "Eri", raHours: 1.63, decDeg: -57.24, vmag: 0.45, bvIndex: -0.16, spectral: "B6Vep" },
  { id: "hadar", name: "Hadar", bayer: "Beta Cen", constellation: "Cen", raHours: 14.06, decDeg: -60.37, vmag: 0.61, bvIndex: -0.23, spectral: "B1III" },
  { id: "alpha_centauri", name: "Rigil Kentaurus", bayer: "Alpha Cen", constellation: "Cen", raHours: 14.66, decDeg: -60.83, vmag: -0.27, bvIndex: 0.71, spectral: "G2V" },
  { id: "acrux", name: "Acrux", bayer: "Alpha Cru", constellation: "Cru", raHours: 12.44, decDeg: -63.10, vmag: 0.77, bvIndex: -0.26, spectral: "B0.5IV" },
  { id: "mimosa", name: "Mimosa", bayer: "Beta Cru", constellation: "Cru", raHours: 12.79, decDeg: -59.69, vmag: 1.25, bvIndex: -0.23 },
  { id: "gacrux", name: "Gacrux", bayer: "Gamma Cru", constellation: "Cru", raHours: 12.52, decDeg: -57.11, vmag: 1.64, bvIndex: 1.59 },
  { id: "fomalhaut", name: "Fomalhaut", bayer: "Alpha PsA", constellation: "PsA", raHours: 22.96, decDeg: -29.62, vmag: 1.17, bvIndex: 0.09, spectral: "A3V" },
];

// ─────────────────────────────────────────────────────────────────────────────
// DEEP SKY OBJECTS (DSOs)
// ─────────────────────────────────────────────────────────────────────────────
export const DEEP_SKY_OBJECTS: DeepSkyObject[] = [
  { id: "m31", name: "M31 Andromeda Galaxy", type: "Galaxy", constellation: "And", raHours: 0.71, decDeg: 41.27, vmag: 3.44, description: "Nearest spiral galaxy to the Milky Way, visible to the naked eye." },
  { id: "m42", name: "M42 Orion Nebula", type: "Nebula", constellation: "Ori", raHours: 5.59, decDeg: -5.39, vmag: 4.0, description: "Massive stellar nursery visible in Orion's sword." },
  { id: "m45", name: "M45 Pleiades (Seven Sisters)", type: "Star Cluster", constellation: "Tau", raHours: 3.79, decDeg: 24.11, vmag: 1.6, description: "Bright open star cluster surrounded by reflection nebulosity." },
  { id: "m13", name: "M13 Hercules Globular Cluster", type: "Star Cluster", constellation: "Her", raHours: 16.69, decDeg: 36.46, vmag: 5.8, description: "Dense swarm of 300,000 ancient stars." },
  { id: "m8", name: "M8 Lagoon Nebula", type: "Nebula", constellation: "Sgr", raHours: 18.06, decDeg: -24.38, vmag: 6.0, description: "Giant interstellar cloud in Sagittarius." },
  { id: "lmc", name: "Large Magellanic Cloud", type: "Galaxy", constellation: "Dor", raHours: 5.39, decDeg: -69.75, vmag: 0.9, description: "Satellite galaxy of the Milky Way visible in Southern hemisphere." },
];

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL IAU CONSTELLATIONS & STICK-FIGURE CONNECTIVITY
// ─────────────────────────────────────────────────────────────────────────────
export const CONSTELLATIONS_CATALOG: ConstellationDef[] = [
  {
    id: "UMa",
    name: "Ursa Major",
    englishName: "Great Bear / Big Dipper",
    raHours: 11.8,
    decDeg: 56.0,
    starIds: ["dubhe", "merak", "phecda", "megrez", "alioth", "mizar", "alkaid"],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  {
    id: "UMi",
    name: "Ursa Minor",
    englishName: "Little Bear / Little Dipper",
    raHours: 15.5,
    decDeg: 78.0,
    starIds: ["polaris", "yildun", "epsilon_umi", "zeta_umi", "eta_umi", "pherkad", "kochab"],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
  {
    id: "Ori",
    name: "Orion",
    englishName: "The Hunter",
    raHours: 5.6,
    decDeg: 0.0,
    starIds: ["betelgeuse", "rigel", "bellatrix", "saiph", "alnitak", "alnilam", "mintaka", "meissa"],
    lines: [[7, 2], [7, 0], [2, 6], [6, 5], [5, 4], [4, 0], [2, 0], [4, 3], [6, 1], [3, 1]],
  },
  {
    id: "Cas",
    name: "Cassiopeia",
    englishName: "The Queen",
    raHours: 1.0,
    decDeg: 60.0,
    starIds: ["caph", "schedar", "gamma_cas", "ruchbah", "segin"],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    id: "Cyg",
    name: "Cygnus",
    englishName: "The Swan / Northern Cross",
    raHours: 20.3,
    decDeg: 42.0,
    starIds: ["deneb", "sadr", "albireo", "gienah_cyg", "fawaris"],
    lines: [[0, 1], [1, 2], [4, 1], [1, 3]],
  },
  {
    id: "Sco",
    name: "Scorpius",
    englishName: "The Scorpion",
    raHours: 16.8,
    decDeg: -30.0,
    starIds: ["graffias", "dschubba", "antares", "larawag", "sargas", "shaula"],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  {
    id: "CMa",
    name: "Canis Major",
    englishName: "Greater Dog",
    raHours: 6.8,
    decDeg: -22.0,
    starIds: ["sirius", "mirzam", "adhara", "wezen", "aludra"],
    lines: [[1, 0], [0, 3], [3, 2], [2, 4]],
  },
  {
    id: "Tau",
    name: "Taurus",
    englishName: "The Bull",
    raHours: 4.6,
    decDeg: 18.0,
    starIds: ["aldebaran", "elnath", "tianguan", "alcyone"],
    lines: [[0, 1], [0, 2], [0, 3]],
  },
  {
    id: "Leo",
    name: "Leo",
    englishName: "The Lion",
    raHours: 11.0,
    decDeg: 18.0,
    starIds: ["regulus", "algieba", "zosma", "denebola"],
    lines: [[0, 1], [1, 2], [2, 3]],
  },
  {
    id: "Boo",
    name: "Boötes",
    englishName: "The Herdsman",
    raHours: 14.3,
    decDeg: 20.0,
    starIds: ["arcturus", "muphrid", "iztar"],
    lines: [[1, 0], [0, 2]],
  },
  {
    id: "Vir",
    name: "Virgo",
    englishName: "The Maiden",
    raHours: 13.0,
    decDeg: -4.0,
    starIds: ["porrima", "spica", "vindemiatrix"],
    lines: [[0, 1], [0, 2]],
  },
  {
    id: "Aur",
    name: "Auriga",
    englishName: "The Charioteer",
    raHours: 5.6,
    decDeg: 42.0,
    starIds: ["capella", "menkalinan"],
    lines: [[0, 1]],
  },
  {
    id: "Gem",
    name: "Gemini",
    englishName: "The Twins",
    raHours: 7.3,
    decDeg: 24.0,
    starIds: ["castor", "pollux", "alhena"],
    lines: [[0, 1], [1, 2]],
  },
  {
    id: "Cru",
    name: "Crux",
    englishName: "Southern Cross",
    raHours: 12.5,
    decDeg: -60.0,
    starIds: ["gacrux", "acrux", "mimosa"],
    lines: [[0, 1], [2, 1]],
  },
  {
    id: "Lyr",
    name: "Lyra",
    englishName: "The Lyre / Harp",
    raHours: 18.8,
    decDeg: 35.0,
    starIds: ["vega", "sheliak", "sulafat"],
    lines: [[0, 1], [1, 2], [2, 0]],
  },
  {
    id: "Aql",
    name: "Aquila",
    englishName: "The Eagle",
    raHours: 19.8,
    decDeg: 8.0,
    starIds: ["altair", "alshain", "tarazed"],
    lines: [[1, 0], [0, 2]],
  },
  {
    id: "Peg",
    name: "Pegasus",
    englishName: "Winged Horse",
    raHours: 22.5,
    decDeg: 20.0,
    starIds: ["markab", "scheat", "enif", "alpheratz"],
    lines: [[0, 1], [1, 3], [0, 2]],
  },
  {
    id: "And",
    name: "Andromeda",
    englishName: "Chained Maiden",
    raHours: 1.0,
    decDeg: 35.0,
    starIds: ["alpheratz", "mirach", "almach"],
    lines: [[0, 1], [1, 2]],
  },
];
