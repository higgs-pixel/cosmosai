"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Gauge,
  LocateFixed,
  Orbit,
  RotateCcw,
  Search,
  SunMedium,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import { SaveDiscoveryButton } from "@/components/saved/save-discovery-button";
import { trackPlanetCardClick } from "@/lib/cosmos-analytics";
import { recordViewedPlanet } from "@/lib/cosmos-retention";

type PlanetKey =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

type PlanetDefinition = {
  key: PlanetKey;
  name: string;
  type: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  axialTilt: number;
  color: string;
  glow: string;
  textureUrl: string;
  cloudTextureUrl?: string;
  ringTextureUrl?: string;
  cameraDistance: number;
  diameter: string;
  distanceFromSun: string;
  gravity: string;
  atmosphere: string;
  dayLength: string;
  yearLength: string;
  temperature: string;
  moons: string;
  description: string;
  signal: string;
  nasaQuery: string;
};

type RenderMode = "3d" | "2d";
type CameraPreset = "earth" | "inner" | "giants" | "outer";
type ComparisonPairKey = "earth-mars" | "earth-venus" | "jupiter-saturn";

const TEXTURE_BASE = "https://www.solarsystemscope.com/textures/download";

const planets: PlanetDefinition[] = [
  {
    key: "sun",
    name: "Sun",
    type: "G-type main-sequence star",
    radius: 2.8,
    orbitRadius: 0,
    orbitSpeed: 0,
    rotationSpeed: 0.0011,
    axialTilt: 7.25,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.58)",
    textureUrl: `${TEXTURE_BASE}/2k_sun.jpg`,
    cameraDistance: 10,
    diameter: "1,392,700 km",
    distanceFromSun: "System center",
    gravity: "274 m/s2",
    atmosphere: "Plasma: hydrogen and helium",
    dayLength: "27 Earth days",
    yearLength: "System anchor",
    temperature: "5,500 C surface",
    moons: "8 major planets",
    description:
      "The gravitational and luminous center of the solar system, driving climate, orbital order, and the visual drama of every world around it.",
    signal: "Solar radiance",
    nasaQuery: "Solar Dynamics Observatory Sun",
  },
  {
    key: "mercury",
    name: "Mercury",
    type: "Iron-rich inner planet",
    radius: 0.44,
    orbitRadius: 5,
    orbitSpeed: 0.008,
    rotationSpeed: 0.003,
    axialTilt: 0.03,
    color: "#a8a29e",
    glow: "rgba(168,162,158,0.32)",
    textureUrl: `${TEXTURE_BASE}/2k_mercury.jpg`,
    cameraDistance: 3.3,
    diameter: "4,879 km",
    distanceFromSun: "57.9 million km",
    gravity: "3.7 m/s2",
    atmosphere: "Trace exosphere",
    dayLength: "58.6 Earth days",
    yearLength: "88 Earth days",
    temperature: "-180 to 430 C",
    moons: "0",
    description:
      "A cratered world close to the Sun, where extreme temperature swings reveal the cost of having almost no atmosphere.",
    signal: "Scorched terrain",
    nasaQuery: "MESSENGER Mercury",
  },
  {
    key: "venus",
    name: "Venus",
    type: "Cloud-shrouded terrestrial planet",
    radius: 0.68,
    orbitRadius: 7,
    orbitSpeed: 0.0062,
    rotationSpeed: -0.0015,
    axialTilt: 177.4,
    color: "#fde68a",
    glow: "rgba(253,230,138,0.32)",
    textureUrl: `${TEXTURE_BASE}/2k_venus_surface.jpg`,
    cameraDistance: 3.7,
    diameter: "12,104 km",
    distanceFromSun: "108.2 million km",
    gravity: "8.87 m/s2",
    atmosphere: "CO2, nitrogen, sulfuric acid clouds",
    dayLength: "243 Earth days",
    yearLength: "225 Earth days",
    temperature: "465 C average",
    moons: "0",
    description:
      "A bright, toxic greenhouse world with crushing pressure beneath its luminous cloud deck.",
    signal: "Sulfur atmosphere",
    nasaQuery: "Venus Magellan",
  },
  {
    key: "earth",
    name: "Earth",
    type: "Living ocean planet",
    radius: 0.74,
    orbitRadius: 9.2,
    orbitSpeed: 0.005,
    rotationSpeed: 0.008,
    axialTilt: 23.44,
    color: "#38bdf8",
    glow: "rgba(56,189,248,0.38)",
    textureUrl: `${TEXTURE_BASE}/2k_earth_daymap.jpg`,
    cloudTextureUrl: `${TEXTURE_BASE}/2k_earth_clouds.jpg`,
    cameraDistance: 3.8,
    diameter: "12,742 km",
    distanceFromSun: "149.6 million km",
    gravity: "9.81 m/s2",
    atmosphere: "Nitrogen, oxygen, argon, water vapor",
    dayLength: "24 hours",
    yearLength: "365.25 days",
    temperature: "15 C average",
    moons: "1",
    description:
      "A blue observatory with liquid water, a protective atmosphere, and the only known biosphere.",
    signal: "Life-bearing world",
    nasaQuery: "Earth Observatory",
  },
  {
    key: "mars",
    name: "Mars",
    type: "Cold desert world",
    radius: 0.55,
    orbitRadius: 11.4,
    orbitSpeed: 0.004,
    rotationSpeed: 0.0076,
    axialTilt: 25.19,
    color: "#fb7185",
    glow: "rgba(251,113,133,0.34)",
    textureUrl: `${TEXTURE_BASE}/2k_mars.jpg`,
    cameraDistance: 3.6,
    diameter: "6,779 km",
    distanceFromSun: "227.9 million km",
    gravity: "3.71 m/s2",
    atmosphere: "Thin CO2, nitrogen, argon",
    dayLength: "24.6 hours",
    yearLength: "687 Earth days",
    temperature: "-63 C average",
    moons: "2",
    description:
      "A rusted, wind-shaped planet where rover tracks turn ancient lakebeds and volcanic plains into an active research frontier.",
    signal: "Rover frontier",
    nasaQuery: "Perseverance Mars rover",
  },
  {
    key: "jupiter",
    name: "Jupiter",
    type: "Gas giant",
    radius: 1.58,
    orbitRadius: 15.2,
    orbitSpeed: 0.0022,
    rotationSpeed: 0.012,
    axialTilt: 3.13,
    color: "#f8c995",
    glow: "rgba(248,201,149,0.34)",
    textureUrl: `${TEXTURE_BASE}/2k_jupiter.jpg`,
    cameraDistance: 5.4,
    diameter: "139,820 km",
    distanceFromSun: "778.5 million km",
    gravity: "24.79 m/s2",
    atmosphere: "Hydrogen, helium, ammonia clouds",
    dayLength: "9.9 hours",
    yearLength: "11.9 Earth years",
    temperature: "-110 C cloud tops",
    moons: "95+",
    description:
      "A colossal storm world whose bands, magnetic field, and moons make it a solar system within the solar system.",
    signal: "Great storm engine",
    nasaQuery: "Juno Jupiter",
  },
  {
    key: "saturn",
    name: "Saturn",
    type: "Ringed gas giant",
    radius: 1.36,
    orbitRadius: 19,
    orbitSpeed: 0.0016,
    rotationSpeed: 0.01,
    axialTilt: 26.73,
    color: "#f6d7a7",
    glow: "rgba(246,215,167,0.34)",
    textureUrl: `${TEXTURE_BASE}/2k_saturn.jpg`,
    ringTextureUrl: `${TEXTURE_BASE}/2k_saturn_ring_alpha.png`,
    cameraDistance: 5.8,
    diameter: "116,460 km",
    distanceFromSun: "1.43 billion km",
    gravity: "10.44 m/s2",
    atmosphere: "Hydrogen, helium, methane traces",
    dayLength: "10.7 hours",
    yearLength: "29.5 Earth years",
    temperature: "-140 C cloud tops",
    moons: "140+",
    description:
      "A pale giant encircled by ice and dust rings, turning orbital mechanics into sculpture.",
    signal: "Ring architecture",
    nasaQuery: "Cassini Saturn",
  },
  {
    key: "uranus",
    name: "Uranus",
    type: "Ice giant",
    radius: 1.02,
    orbitRadius: 22.6,
    orbitSpeed: 0.0011,
    rotationSpeed: -0.007,
    axialTilt: 97.77,
    color: "#67e8f9",
    glow: "rgba(103,232,249,0.3)",
    textureUrl: `${TEXTURE_BASE}/2k_uranus.jpg`,
    cameraDistance: 4.7,
    diameter: "50,724 km",
    distanceFromSun: "2.87 billion km",
    gravity: "8.69 m/s2",
    atmosphere: "Hydrogen, helium, methane",
    dayLength: "17.2 hours",
    yearLength: "84 Earth years",
    temperature: "-195 C cloud tops",
    moons: "27",
    description:
      "A blue-green ice giant tipped dramatically on its side, moving through orbit like a planet rolling through space.",
    signal: "Tilted ice giant",
    nasaQuery: "Uranus Voyager 2",
  },
  {
    key: "neptune",
    name: "Neptune",
    type: "Distant ice giant",
    radius: 1,
    orbitRadius: 26,
    orbitSpeed: 0.00085,
    rotationSpeed: 0.007,
    axialTilt: 28.32,
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.34)",
    textureUrl: `${TEXTURE_BASE}/2k_neptune.jpg`,
    cameraDistance: 4.8,
    diameter: "49,244 km",
    distanceFromSun: "4.5 billion km",
    gravity: "11.15 m/s2",
    atmosphere: "Hydrogen, helium, methane",
    dayLength: "16.1 hours",
    yearLength: "165 Earth years",
    temperature: "-200 C cloud tops",
    moons: "14",
    description:
      "A deep-blue outer world with supersonic winds, faint rings, and a frontier-like distance from sunlight.",
    signal: "Outer-system wind",
    nasaQuery: "Neptune Voyager 2",
  },
];

const planetMap = new Map(planets.map((planet) => [planet.key, planet]));

const comparisonPairs: Array<{
  key: ComparisonPairKey;
  label: string;
  planets: [PlanetKey, PlanetKey];
}> = [
  { key: "earth-mars", label: "Earth vs Mars", planets: ["earth", "mars"] },
  { key: "earth-venus", label: "Earth vs Venus", planets: ["earth", "venus"] },
  { key: "jupiter-saturn", label: "Jupiter vs Saturn", planets: ["jupiter", "saturn"] },
];

function isPlanetKey(value: string | null): value is PlanetKey {
  return planetMap.has(value as PlanetKey);
}

function hashSeed(value: string) {
  return value.split("").reduce((seed, char) => seed + char.charCodeAt(0) * 97, 137);
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shadeColor(hex: string, percent: number) {
  const normalized = hex.replace("#", "");
  const number = parseInt(normalized, 16);
  const amount = Math.round(2.55 * percent);
  const red = Math.max(0, Math.min(255, (number >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((number >> 8) & 0x00ff) + amount));
  const blue = Math.max(0, Math.min(255, (number & 0x0000ff) + amount));

  return `#${(0x1000000 + red * 0x10000 + green * 0x100 + blue).toString(16).slice(1)}`;
}

function configureTexture(texture: THREE.Texture, renderer?: THREE.WebGLRenderer) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  if (renderer) texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  texture.needsUpdate = true;
}

function createFallbackTexture(planet: PlanetDefinition, size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();

  const random = seededRandom(hashSeed(planet.key));
  const width = canvas.width;
  const height = canvas.height;

  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, shadeColor(planet.color, 30));
  base.addColorStop(0.42, planet.color);
  base.addColorStop(1, shadeColor(planet.color, -38));
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  if (planet.key === "sun") {
    for (let index = 0; index < 120; index += 1) {
      context.globalAlpha = 0.08 + random() * 0.2;
      context.fillStyle = random() > 0.48 ? "#fef3c7" : "#fb923c";
      context.beginPath();
      context.arc(random() * width, random() * height, 24 + random() * 120, 0, Math.PI * 2);
      context.fill();
    }
  } else if (["venus", "jupiter", "saturn", "uranus", "neptune"].includes(planet.key)) {
    for (let y = 18; y < height; y += 22 + random() * 22) {
      context.globalAlpha = 0.13 + random() * 0.26;
      context.fillStyle = random() > 0.5 ? shadeColor(planet.color, 42) : shadeColor(planet.color, -22);
      context.fillRect(0, y, width, 6 + random() * 16);
    }

    if (planet.key === "jupiter") {
      context.globalAlpha = 0.66;
      context.fillStyle = "#c2410c";
      context.beginPath();
      context.ellipse(width * 0.7, height * 0.54, width * 0.08, height * 0.08, -0.15, 0, Math.PI * 2);
      context.fill();
    }
  } else {
    for (let index = 0; index < 130; index += 1) {
      context.globalAlpha = 0.07 + random() * 0.18;
      context.fillStyle = random() > 0.52 ? shadeColor(planet.color, 34) : shadeColor(planet.color, -42);
      context.beginPath();
      context.ellipse(
        random() * width,
        random() * height,
        8 + random() * 52,
        4 + random() * 22,
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    if (planet.key === "earth") {
      context.globalAlpha = 0.78;
      context.fillStyle = "#2f8f5f";
      for (const [x, y, w, h, rotation] of [
        [0.2, 0.34, 0.095, 0.105, -0.2],
        [0.4, 0.58, 0.08, 0.2, 0.28],
        [0.63, 0.35, 0.13, 0.12, 0.18],
        [0.79, 0.62, 0.095, 0.08, -0.12],
      ] as const) {
        if (context && typeof context.save === "function") {
          context.save();
          context.translate(width * x, height * y);
          context.rotate(rotation);
          context.beginPath();
          context.ellipse(0, 0, width * w, height * h, 0, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
      }
    }
  }

  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  return texture;
}

function createCloudTexture(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();

  const random = seededRandom(2027);
  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(4, size / 150);

  for (let index = 0; index < 34; index += 1) {
    const startX = random() * canvas.width;
    const startY = random() * canvas.height;
    context.globalAlpha = 0.22 + random() * 0.28;
    context.beginPath();
    context.moveTo(startX, startY);
    context.bezierCurveTo(
      (startX + canvas.width * (0.12 + random() * 0.18)) % canvas.width,
      (startY + canvas.height * (random() - 0.5) * 0.45 + canvas.height) % canvas.height,
      (startX + canvas.width * (0.28 + random() * 0.2)) % canvas.width,
      (startY + canvas.height * (random() - 0.5) * 0.42 + canvas.height) % canvas.height,
      (startX + canvas.width * (0.44 + random() * 0.22)) % canvas.width,
      (startY + canvas.height * (random() - 0.5) * 0.45 + canvas.height) % canvas.height,
    );
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  return texture;
}

function createRingTexture(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();

  const gradient = context.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.18, "rgba(253,230,138,0.32)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.58)");
  gradient.addColorStop(0.48, "rgba(246,215,167,0.2)");
  gradient.addColorStop(0.62, "rgba(255,255,255,0.5)");
  gradient.addColorStop(0.82, "rgba(253,230,138,0.26)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  return texture;
}

function loadRemoteTexture(
  loader: THREE.TextureLoader,
  renderer: THREE.WebGLRenderer,
  url: string,
  onLoaded: (texture: THREE.Texture) => void,
  textures: THREE.Texture[],
  isDisposed: () => boolean,
) {
  loader.load(
    url,
    (texture) => {
      if (isDisposed()) {
        texture.dispose();
        return;
      }

      configureTexture(texture, renderer);
      textures.push(texture);
      onLoaded(texture);
    },
    undefined,
    () => {
      // Runtime texture failures keep the deterministic canvas texture in place.
    },
  );
}

function detectLowPerformanceDevice() {
  if (typeof window === "undefined") return false;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hardware = navigator.hardwareConcurrency ?? 8;
  const memory = "deviceMemory" in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) : 8;

  return reduceMotion || hardware <= 2 || memory <= 2;
}

export function SolarSystemExplorer() {
  const [selectedKey, setSelectedKey] = useState<PlanetKey>("earth");
  const [renderMode, setRenderMode] = useState<RenderMode>("3d");
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonPair, setComparisonPair] = useState<ComparisonPairKey>("earth-mars");
  const selectedPlanet = planetMap.get(selectedKey) ?? planets[3];

  useEffect(() => {
    const requestedPlanet = new URLSearchParams(window.location.search).get("planet");
    if (isPlanetKey(requestedPlanet)) {
      setSelectedKey(requestedPlanet);
    }

    if (detectLowPerformanceDevice()) {
      setRenderMode("2d");
    }
  }, []);

  useEffect(() => {
    recordViewedPlanet({
      key: selectedPlanet.key,
      name: selectedPlanet.name,
      description: selectedPlanet.description,
    });
  }, [selectedPlanet.description, selectedPlanet.key, selectedPlanet.name]);

  function focusPlanet(key: PlanetKey) {
    setSelectedKey(key);
    trackPlanetCardClick(key, "solar_system");

    const url = new URL(window.location.href);
    url.searchParams.set("planet", key);
    window.history.replaceState(null, "", url.toString());
  }

  function applyCameraPreset(preset: CameraPreset) {
    const presetTargets: Record<CameraPreset, PlanetKey> = {
      earth: "earth",
      inner: "venus",
      giants: "jupiter",
      outer: "neptune",
    };

    focusPlanet(presetTargets[preset]);
  }

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <AnimatedStarfield />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_16%,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(56,189,248,0.15),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.12),#03040a_88%)]" />
      <div className="cosmos-orbital-grid fixed z-0" />
      <div className="noise-overlay fixed z-0" />

      <section className="relative z-10 flex min-h-screen flex-col px-4 py-5 md:px-8 md:py-8">
        <header className="glass-nav mx-auto flex w-full max-w-[1720px] items-center justify-between rounded-full px-3 py-3 md:px-4">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-semibold text-cosmos-frost transition hover:bg-white/[0.06] hover:text-cosmos-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
          >
            <ArrowLeft className="h-4 w-4" />
            COSMOS AI
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-solar-300/20 bg-solar-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-solar-300 sm:flex">
            <SunMedium className="h-3.5 w-3.5" />
            Interactive Planetarium
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-[1720px] flex-1 gap-5 py-5 xl:grid-cols-[300px_minmax(0,1fr)_400px]">
          <PlanetNavigator selectedKey={selectedKey} onSelect={focusPlanet} />

          <section className="glass-panel relative order-1 min-h-[66vh] overflow-hidden rounded-[1.15rem] bg-cosmos-black/[0.5] md:min-h-[72vh] md:rounded-[1.35rem] xl:order-2">
            <div className="absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-solar-300/70 to-transparent" />
            {renderMode === "3d" ? (
              <SolarSystemScene selectedKey={selectedKey} onSelect={focusPlanet} onFallback={() => setRenderMode("2d")} />
            ) : (
              <SolarSystemFallback2D selectedKey={selectedKey} onSelect={focusPlanet} />
            )}

            <div className="pointer-events-none absolute left-3 top-3 z-30 rounded-full border border-white/10 bg-cosmos-black/[0.48] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cosmos-frost backdrop-blur-2xl md:left-5 md:top-5 md:px-4 md:text-xs md:tracking-[0.22em]">
              Camera target / {selectedPlanet.name}
            </div>

            <div className="absolute right-3 top-14 z-30 flex flex-col items-end gap-2 sm:right-4 sm:top-4 sm:flex-row md:right-5 md:top-5">
              <button
                type="button"
                onClick={() => focusPlanet("earth")}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-cosmos-black/[0.48] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-cosmos-frost backdrop-blur-2xl transition hover:border-oxygen-400/35 hover:text-cosmos-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400 sm:h-10 sm:px-4 sm:text-xs sm:tracking-[0.18em]"
              >
                <LocateFixed className="h-3.5 w-3.5 text-oxygen-400" />
                Focus Earth
              </button>
              <button
                type="button"
                onClick={() => setRenderMode((current) => (current === "3d" ? "2d" : "3d"))}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-cosmos-black/[0.48] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-cosmos-frost backdrop-blur-2xl transition hover:border-solar-300/35 hover:text-cosmos-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400 sm:h-10 sm:px-4 sm:text-xs sm:tracking-[0.18em]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-solar-300" />
                {renderMode === "3d" ? "2D view" : "Try 3D"}
              </button>
            </div>

            <CameraPresetControls onSelect={applyCameraPreset} />

            <div className="glass-card pointer-events-none absolute bottom-4 left-4 right-4 z-30 hidden gap-3 rounded-[1rem] p-4 sm:grid sm:grid-cols-2 md:bottom-5 md:left-5 md:right-5 md:grid-cols-4">
              <Telemetry label="Focus" value={selectedPlanet.name} />
              <Telemetry label="Distance" value={selectedPlanet.distanceFromSun} />
              <Telemetry label="Year" value={selectedPlanet.yearLength} />
              <Telemetry label="Controls" value={renderMode === "3d" ? "Drag / pinch / click" : "Tap / swipe"} />
            </div>
          </section>

          <PlanetDetailPanel
            planet={selectedPlanet}
            compareMode={compareMode}
            onToggleCompare={() => setCompareMode((current) => !current)}
            comparisonPair={comparisonPair}
            onSelectComparison={setComparisonPair}
          />
        </div>
      </section>
    </main>
  );
}

function CameraPresetControls({ onSelect }: { onSelect: (preset: CameraPreset) => void }) {
  const presets: Array<{ label: string; value: CameraPreset }> = [
    { label: "Earth", value: "earth" },
    { label: "Inner", value: "inner" },
    { label: "Giants", value: "giants" },
    { label: "Outer", value: "outer" },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-30 flex max-w-[calc(100%-2rem)] gap-2 overflow-x-auto pb-1 sm:bottom-auto sm:left-5 sm:top-20 sm:max-w-none sm:flex-wrap md:top-24">
      {presets.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onSelect(preset.value)}
          className="inline-flex h-9 flex-none items-center rounded-full border border-white/10 bg-cosmos-black/[0.52] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cosmos-frost backdrop-blur-xl transition hover:border-oxygen-400/35 hover:text-cosmos-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function SolarSystemScene({
  selectedKey,
  onSelect,
  onFallback,
}: {
  selectedKey: PlanetKey;
  onSelect: (key: PlanetKey) => void;
  onFallback: () => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const onFallbackRef = useRef(onFallback);
  const selectedRef = useRef(selectedKey);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onFallbackRef.current = onFallback;
  }, [onFallback]);

  useEffect(() => {
    selectedRef.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountElement = mount;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isMobile ? 54 : 46, 1, 0.1, 220);
    camera.position.set(0, isMobile ? 13 : 17, isMobile ? 32 : 34);

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isMobile,
        powerPreference: "high-performance",
      });
    } catch {
      onFallbackRef.current();
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.touchAction = "none";
    mountElement.appendChild(renderer.domElement);

    const labelLayer = document.createElement("div");
    labelLayer.className = "pointer-events-none absolute inset-0 z-10";
    mountElement.appendChild(labelLayer);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minDistance = 4;
    controls.maxDistance = isMobile ? 54 : 70;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI * 0.86;
    controls.panSpeed = isMobile ? 0.62 : 0.82;
    controls.zoomSpeed = isMobile ? 0.58 : 0.72;

    const planetObjects = new Map<PlanetKey, THREE.Mesh>();
    const orbitGroups = new Map<PlanetKey, THREE.Group>();
    const labelElements = new Map<PlanetKey, HTMLButtonElement>();
    const hitObjects: THREE.Mesh[] = [];
    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");

    const ambientLight = new THREE.AmbientLight("#172554", 0.9);
    scene.add(ambientLight);
    const solarLight = new THREE.PointLight("#fff7ed", 980, 122, 1.08);
    solarLight.position.set(0, 0, 0);
    scene.add(solarLight);
    const rimLight = new THREE.DirectionalLight("#67e8f9", 2.1);
    rimLight.position.set(-18, 14, 22);
    scene.add(rimLight);

    const orbitalPlane = new THREE.Group();
    orbitalPlane.rotation.x = -0.09;
    scene.add(orbitalPlane);

    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    materials.push(hitMaterial);

    let disposed = false;

    for (const planet of planets) {
      const fallbackTexture = createFallbackTexture(planet, isMobile ? 512 : 1024);
      configureTexture(fallbackTexture, renderer);
      textures.push(fallbackTexture);

      const geometry = new THREE.SphereGeometry(planet.radius, isMobile ? 40 : 64, isMobile ? 40 : 64);
      geometries.push(geometry);

      const material =
        planet.key === "sun"
          ? new THREE.MeshBasicMaterial({ map: fallbackTexture, color: planet.color })
          : new THREE.MeshStandardMaterial({
              map: fallbackTexture,
              color: "#ffffff",
              roughness: planet.key === "earth" ? 0.58 : 0.74,
              metalness: 0.02,
              emissive: new THREE.Color(planet.color),
              emissiveIntensity: 0.045,
            });
      materials.push(material);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.z = THREE.MathUtils.degToRad(planet.axialTilt);
      mesh.userData.planetKey = planet.key;

      const group = new THREE.Group();
      orbitGroups.set(planet.key, group);
      planetObjects.set(planet.key, mesh);

      const hitGeometry = new THREE.SphereGeometry(Math.max(planet.radius * 1.65, 0.72), 18, 18);
      geometries.push(hitGeometry);
      const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
      hitMesh.userData.planetKey = planet.key;
      hitObjects.push(hitMesh);

      if (planet.key === "sun") {
        group.add(mesh);
        group.add(hitMesh);

        const glowGeometry = new THREE.SphereGeometry(planet.radius * 1.24, isMobile ? 40 : 64, isMobile ? 40 : 64);
        geometries.push(glowGeometry);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: "#f59e0b",
          transparent: true,
          opacity: 0.2,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        materials.push(glowMaterial);
        group.add(new THREE.Mesh(glowGeometry, glowMaterial));
      } else {
        mesh.position.x = planet.orbitRadius;
        hitMesh.position.x = planet.orbitRadius;
        group.rotation.y = planet.orbitRadius * 0.17;
        group.add(mesh);
        group.add(hitMesh);
        orbitalPlane.add(createOrbitLine(planet.orbitRadius, geometries, materials, isMobile));
      }

      if (planet.key === "earth") {
        const cloudTexture = createCloudTexture(isMobile ? 512 : 1024);
        configureTexture(cloudTexture, renderer);
        textures.push(cloudTexture);

        const cloudGeometry = new THREE.SphereGeometry(planet.radius * 1.018, isMobile ? 40 : 64, isMobile ? 40 : 64);
        geometries.push(cloudGeometry);
        const cloudMaterial = new THREE.MeshLambertMaterial({
          map: cloudTexture,
          alphaMap: cloudTexture,
          transparent: true,
          opacity: 0.34,
          color: "#ffffff",
          depthWrite: false,
        });
        materials.push(cloudMaterial);
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        clouds.userData.cloudLayer = true;
        mesh.add(clouds);

        if (planet.cloudTextureUrl) {
          loadRemoteTexture(
            textureLoader,
            renderer,
            planet.cloudTextureUrl,
            (texture) => {
              cloudMaterial.map = texture;
              cloudMaterial.alphaMap = texture;
              cloudMaterial.needsUpdate = true;
            },
            textures,
            () => disposed,
          );
        }
      }

      if (planet.key === "saturn") {
        const ringTexture = createRingTexture(isMobile ? 512 : 1024);
        configureTexture(ringTexture, renderer);
        textures.push(ringTexture);

        const ringGeometry = new THREE.RingGeometry(planet.radius * 1.52, planet.radius * 2.58, isMobile ? 96 : 160);
        geometries.push(ringGeometry);
        const ringMaterial = new THREE.MeshBasicMaterial({
          map: ringTexture,
          color: "#f8e7bd",
          transparent: true,
          opacity: 0.64,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        materials.push(ringMaterial);
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.25;
        ring.rotation.z = -0.12;
        mesh.add(ring);

        if (planet.ringTextureUrl) {
          loadRemoteTexture(
            textureLoader,
            renderer,
            planet.ringTextureUrl,
            (texture) => {
              ringMaterial.map = texture;
              ringMaterial.needsUpdate = true;
            },
            textures,
            () => disposed,
          );
        }
      }

      orbitalPlane.add(group);

      const label = document.createElement("button");
      label.type = "button";
      label.className =
        "pointer-events-auto absolute rounded-full border border-white/10 bg-cosmos-black/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cosmos-frost shadow-panel backdrop-blur-xl transition";
      label.textContent = planet.name;
      label.style.willChange = "transform, opacity";
      label.addEventListener("click", () => onSelectRef.current(planet.key));
      labelLayer.appendChild(label);
      labelElements.set(planet.key, label);

      loadRemoteTexture(
        textureLoader,
        renderer,
        planet.textureUrl,
        (texture) => {
          material.map = texture;
          material.needsUpdate = true;
        },
        textures,
        () => disposed,
      );
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const targetCamera = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();
    const screenPosition = new THREE.Vector3();
    let animationFrame = 0;
    let isVisible = document.visibilityState === "visible";
    let isInViewport = true;
    let lastRenderTime = 0;
    let userControlUntil = 0;
    const frameInterval = reduceMotion ? 1000 / 15 : isMobile ? 1000 / 30 : 1000 / 45;

    function getPlanetWorldPosition(key: PlanetKey) {
      const mesh = planetObjects.get(key);
      const position = new THREE.Vector3();
      mesh?.getWorldPosition(position);
      return position;
    }

    function updateCameraTarget() {
      const selectedPlanet = planetMap.get(selectedRef.current) ?? planets[3];
      const position = getPlanetWorldPosition(selectedPlanet.key);
      const angle = Math.atan2(position.z, position.x) + (isMobile ? 1.15 : 0.92);
      const lift = selectedPlanet.key === "sun" ? 5.9 : selectedPlanet.radius * 1.85 + (isMobile ? 1.9 : 1.35);
      const distance = selectedPlanet.cameraDistance + selectedPlanet.radius * (isMobile ? 3.8 : 2.35);

      targetLookAt.copy(position);
      targetCamera.set(
        position.x + Math.cos(angle) * distance,
        lift,
        position.z + Math.sin(angle) * distance,
      );
    }

    function updateLabels() {
      const bounds = mountElement.getBoundingClientRect();
      for (const planet of planets) {
        const mesh = planetObjects.get(planet.key);
        const label = labelElements.get(planet.key);
        if (!mesh || !label) continue;

        mesh.getWorldPosition(screenPosition);
        screenPosition.project(camera);
        const visible = screenPosition.z > -1 && screenPosition.z < 1;
        const x = (screenPosition.x * 0.5 + 0.5) * bounds.width;
        const y = (-screenPosition.y * 0.5 + 0.5) * bounds.height;
        const selected = selectedRef.current === planet.key;

        label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -150%)`;
        label.style.opacity = visible ? (selected ? "1" : isMobile ? "0.62" : "0.76") : "0";
        label.style.borderColor = selected ? "rgba(103,232,249,0.48)" : "rgba(255,255,255,0.1)";
        label.style.color = selected ? "#ffffff" : "";
        label.style.boxShadow = selected ? "0 0 26px rgba(56,189,248,0.36)" : "";
      }
    }

    function resize() {
      const { width, height } = mountElement.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      updateLabels();
    }

    function handlePointerDown(event: PointerEvent) {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(hitObjects, false);
      const planetKey = intersections[0]?.object.userData.planetKey as PlanetKey | undefined;
      if (planetKey) onSelectRef.current(planetKey);
    }

    function render(time = 0) {
      if (time - lastRenderTime < frameInterval) {
        if (isVisible && isInViewport) animationFrame = requestAnimationFrame(render);
        return;
      }

      lastRenderTime = time;

      for (const planet of planets) {
        const group = orbitGroups.get(planet.key);
        const mesh = planetObjects.get(planet.key);

        if (!reduceMotion) {
          if (group && planet.orbitSpeed) group.rotation.y += planet.orbitSpeed;
          if (mesh) mesh.rotation.y += planet.rotationSpeed;
          const clouds = mesh?.children.find((child) => child.userData.cloudLayer);
          if (clouds) clouds.rotation.y += 0.0025;
        }

        if (mesh) {
          const isSelected = selectedRef.current === planet.key;
          const targetScale = isSelected ? 1.09 : 1;
          mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), reduceMotion ? 0.2 : 0.08);
        }
      }

      updateCameraTarget();
      const userControlling = performance.now() < userControlUntil;
      if (!userControlling) {
        camera.position.lerp(targetCamera, reduceMotion ? 0.18 : 0.035);
        controls.target.lerp(targetLookAt, reduceMotion ? 0.22 : 0.055);
      }

      controls.update();
      updateLabels();
      renderer.render(scene, camera);

      if (isVisible && isInViewport) {
        animationFrame = requestAnimationFrame(render);
      }
    }

    function scheduleRender() {
      if (!isVisible || !isInViewport) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(render);
    }

    function handleVisibilityChange() {
      isVisible = document.visibilityState === "visible";
      scheduleRender();
    }

    controls.addEventListener("start", () => {
      userControlUntil = performance.now() + 900;
    });
    controls.addEventListener("end", () => {
      userControlUntil = performance.now() + 1300;
    });

    const resizeObserver = new ResizeObserver(() => {
      resize();
      scheduleRender();
    });
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isInViewport = Boolean(entry?.isIntersecting);
        scheduleRender();
      },
      { threshold: 0.05 },
    );

    resize();
    updateCameraTarget();
    camera.position.copy(targetCamera);
    controls.target.copy(targetLookAt);
    controls.update();
    resizeObserver.observe(mountElement);
    intersectionObserver.observe(mountElement);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    animationFrame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      controls.dispose();
      labelElements.forEach((label) => label.remove());
      if (labelLayer.parentNode === mountElement) mountElement.removeChild(labelLayer);
      if (renderer.domElement.parentNode === mountElement) mountElement.removeChild(renderer.domElement);
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative h-full min-h-[66vh] w-full cursor-grab touch-none active:cursor-grabbing md:min-h-[72vh]"
      aria-label="Interactive 3D solar system explorer"
    />
  );
}

function createOrbitLine(
  radius: number,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  isMobile: boolean,
) {
  const segmentCount = isMobile ? 192 : 320;
  const points = Array.from({ length: segmentCount }, (_, index) => {
    const angle = (index / segmentCount) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  });

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: "#94a3b8",
    transparent: true,
    opacity: isMobile ? 0.12 : 0.16,
  });
  geometries.push(geometry);
  materials.push(material);

  return new THREE.LineLoop(geometry, material);
}

function SolarSystemFallback2D({
  selectedKey,
  onSelect,
}: {
  selectedKey: PlanetKey;
  onSelect: (key: PlanetKey) => void;
}) {
  const positions = useMemo(
    () =>
      planets.map((planet, index) => {
        if (planet.key === "sun") return { planet, x: 50, y: 50, size: 92 };
        const angle = -55 + index * 28;
        const radius = 10 + index * 4.4;
        return {
          planet,
          x: 50 + Math.cos((angle * Math.PI) / 180) * radius,
          y: 50 + Math.sin((angle * Math.PI) / 180) * radius * 0.62,
          size: Math.max(18, planet.radius * 22),
        };
      }),
    [],
  );

  return (
    <div className="relative h-full min-h-[66vh] overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.18),transparent_16%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(3,4,10,0.95))] md:min-h-[72vh]">
      <div className="cosmos-orbital-grid opacity-70" />
      <div className="glass-card absolute left-4 right-4 top-24 max-w-sm rounded-[1rem] p-4 text-sm leading-6 text-cosmos-frost sm:left-6 sm:right-auto">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-solar-300">
          2D performance view
        </p>
        <p className="mt-2">
          This device is using the lightweight orbital map. Planet data, focus states, and NASA search links remain available.
        </p>
      </div>

      {positions.map(({ planet, x, y, size }) => {
        const selected = selectedKey === planet.key;
        return (
          <button
            key={planet.key}
            type="button"
            onClick={() => onSelect(planet.key)}
            className={`absolute z-10 rounded-full border text-left transition duration-300 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400 ${
              selected ? "border-oxygen-400 shadow-glow-oxygen" : "border-white/15"
            }`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle at 34% 28%, ${shadeColor(planet.color, 42)}, ${planet.color} 44%, ${shadeColor(planet.color, -45)} 100%)`,
              boxShadow: selected ? `0 0 42px ${planet.glow}` : `0 0 22px ${planet.glow}`,
            }}
            aria-label={`Focus ${planet.name}`}
          >
            <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-cosmos-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-frost backdrop-blur-xl">
              {planet.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PlanetNavigator({
  selectedKey,
  onSelect,
}: {
  selectedKey: PlanetKey;
  onSelect: (key: PlanetKey) => void;
}) {
  return (
    <aside className="glass-panel order-3 overflow-hidden rounded-[1.25rem] p-5 xl:order-1">
      <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-solar-300">
            System Objects
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Solar System</h1>
        </div>
        <Orbit className="h-6 w-6 text-oxygen-400" />
      </div>

      <div className="grid max-h-[42vh] gap-2 overflow-y-auto pr-1 xl:max-h-[70vh]">
        {planets.map((planet) => {
          const selected = planet.key === selectedKey;

          return (
            <button
              key={planet.key}
              type="button"
              onClick={() => onSelect(planet.key)}
              className={`group flex items-center justify-between gap-4 rounded-md border p-3 text-left transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400 ${
                selected
                  ? "border-oxygen-400/[0.45] bg-oxygen-400/[0.12] shadow-glow-oxygen"
                  : "border-white/10 bg-white/[0.055] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="h-4 w-4 flex-none rounded-full shadow-[0_0_22px_currentColor]"
                  style={{ color: planet.color, backgroundColor: planet.color }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-cosmos-white">{planet.name}</span>
                  <span className="mt-1 block truncate text-xs text-cosmos-mist">{planet.type}</span>
                  <span className={`mt-2 inline-flex text-[10px] font-bold uppercase tracking-[0.18em] ${selected ? "text-oxygen-400" : "text-cosmos-slate group-hover:text-oxygen-400"}`}>
                    {selected ? "Focused" : "Focus planet"}
                  </span>
                </span>
              </span>
              <ChevronRight className={`h-4 w-4 flex-none transition ${selected ? "text-oxygen-400" : "text-cosmos-slate group-hover:text-cosmos-white"}`} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PlanetDetailPanel({
  planet,
  compareMode,
  onToggleCompare,
  comparisonPair,
  onSelectComparison,
}: {
  planet: PlanetDefinition;
  compareMode: boolean;
  onToggleCompare: () => void;
  comparisonPair: ComparisonPairKey;
  onSelectComparison: (pair: ComparisonPairKey) => void;
}) {
  const stats = [
    ["Diameter", planet.diameter],
    ["Distance", planet.distanceFromSun],
    ["Gravity", planet.gravity],
    ["Atmosphere", planet.atmosphere],
    ["Day length", planet.dayLength],
    ["Year length", planet.yearLength],
    ["Moons", planet.moons],
    ["Temperature", planet.temperature],
  ];
  const activeComparison = comparisonPairs.find((pair) => pair.key === comparisonPair) ?? comparisonPairs[0];
  const comparisonTargets = activeComparison.planets.map((key) => planetMap.get(key)!).filter(Boolean);
  const learnMoreUrl =
    planet.key === "sun"
      ? "https://science.nasa.gov/sun/"
      : `https://science.nasa.gov/solar-system/planets/${planet.key}/`;

  return (
    <aside className="glass-panel order-2 flex flex-col justify-between rounded-[1.25rem] p-6 xl:order-3">
      <div>
        <div className="mb-8 flex items-center justify-between">
          <span
            className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 shadow-[0_0_44px_currentColor]"
            style={{
              color: planet.color,
              background: `radial-gradient(circle at 35% 30%, ${shadeColor(planet.color, 42)}, ${planet.color} 46%, #03040a 82%)`,
              boxShadow: `0 0 44px ${planet.glow}`,
            }}
          >
            {planet.key === "sun" ? <SunMedium className="h-7 w-7 text-white" /> : <CircleDot className="h-7 w-7 text-white" />}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
            {planet.signal}
          </span>
        </div>

        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-oxygen-400">
          Current focus
        </p>
        <h2 className="mt-3 text-5xl font-semibold leading-[0.98] tracking-normal sm:text-[3.45rem]">
          {planet.name}
        </h2>
        <p className="mt-4 text-sm font-semibold text-solar-300">{planet.type}</p>
        <p className="mt-6 text-[15px] leading-7 text-cosmos-frost">{planet.description}</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {stats.map(([label, value]) => (
            <Metric key={label} label={label} value={value} />
          ))}
        </div>

        {compareMode ? (
          <div className="mt-5 grid gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-oxygen-400">
                Compare planets
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {comparisonPairs.map((pair) => (
                  <button
                    key={pair.key}
                    type="button"
                    onClick={() => onSelectComparison(pair.key)}
                    className={`h-9 flex-none rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                      comparisonPair === pair.key
                        ? "border-oxygen-400/45 bg-oxygen-400/15 text-cosmos-white"
                        : "border-white/10 bg-white/[0.05] text-cosmos-mist hover:border-white/20 hover:text-cosmos-white"
                    }`}
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {comparisonTargets.map((target) => (
                <div
                  key={target.key}
                  className="glass-card rounded-md p-4 transition duration-500 hover:-translate-y-0.5 hover:border-oxygen-400/35"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full shadow-[0_0_18px_currentColor]"
                      style={{ color: target.color, backgroundColor: target.color }}
                    />
                    <p className="text-lg font-semibold text-cosmos-white">{target.name}</p>
                  </div>
                  <div className="space-y-2 text-xs leading-5 text-cosmos-frost">
                    <ComparisonMetric label="Gravity" value={target.gravity} />
                    <ComparisonMetric label="Day" value={target.dayLength} />
                    <ComparisonMetric label="Year" value={target.yearLength} />
                    <ComparisonMetric label="Temperature" value={target.temperature} />
                    <ComparisonMetric label="Moons" value={target.moons} />
                    <ComparisonMetric label="Atmosphere" value={target.atmosphere} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 space-y-3">
        <div className="glass-card rounded-[1rem] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cosmos-mist">
            <Gauge className="h-3.5 w-3.5 text-solar-300" />
            Mission context
          </div>
          <p className="text-sm leading-6 text-cosmos-frost">
            Use the planetarium to compare scale, orbit, lighting, day length, atmosphere, and exploration context across worlds.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleCompare}
          className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-bold uppercase tracking-[0.18em] text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
        >
          {compareMode ? "Hide comparison" : "Compare planets"}
        </button>

        <SaveDiscoveryButton
          discovery={{
            id: `planet-${planet.key}`,
            type: "planet",
            title: planet.name,
            subtitle: planet.type,
            description: planet.description,
            href: `/solar-system?planet=${planet.key}`,
            source: "COSMOS Solar System",
            savedAt: new Date().toISOString(),
            metadata: {
              diameter: planet.diameter,
              gravity: planet.gravity,
              moons: planet.moons,
            },
          }}
          label="Save planet"
          savedLabel="Planet saved"
          className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-aurora-400/25 bg-aurora-400/10 px-4 text-xs font-bold uppercase tracking-[0.18em] text-aurora-400 transition hover:border-aurora-400/45 hover:text-cosmos-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aurora-400"
        />

        <Link
          href={`/image-explorer?q=${encodeURIComponent(planet.nasaQuery)}&mediaType=image`}
          className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-oxygen-400/30 bg-oxygen-400/10 px-4 text-xs font-bold uppercase tracking-[0.18em] text-oxygen-400 transition hover:bg-oxygen-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
        >
          <Search className="h-4 w-4" />
          Related NASA media
          <ExternalLink className="h-4 w-4" />
        </Link>
        <a
          href={learnMoreUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-bold uppercase tracking-[0.18em] text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
        >
          Learn more at NASA
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-md p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-5 text-cosmos-white">{value}</p>
    </div>
  );
}

function ComparisonMetric({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-3 border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
      <span className="text-cosmos-mist">{label}</span>
      <span className="text-right font-semibold text-cosmos-white">{value}</span>
    </p>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cosmos-mist">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-cosmos-white">{value}</p>
    </div>
  );
}
