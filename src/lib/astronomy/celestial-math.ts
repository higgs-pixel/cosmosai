import * as Astronomy from "astronomy-engine";
import * as THREE from "three";
import { CatalogStar, STAR_CATALOG, DeepSkyObject, DEEP_SKY_OBJECTS } from "./star-catalog";

export interface AltAzCoord {
  azimuthDeg: number;  // 0° = North, 90° = East, 180° = South, 270° = West
  altitudeDeg: number; // -90° (Nadir) to +90° (Zenith)
  isAboveHorizon: boolean;
}

export interface PlanetSkyState {
  id: string;
  name: string;
  type: "Sun" | "Moon" | "Planet";
  raHours: number;
  decDeg: number;
  azimuthDeg: number;
  altitudeDeg: number;
  distanceAu: number;
  vmag: number;
  phasePercent?: number;
  color: string;
  size: number;
  hasRings?: boolean;
}

export interface ComputedStarState extends CatalogStar {
  azimuthDeg: number;
  altitudeDeg: number;
  isAboveHorizon: boolean;
  vec3: THREE.Vector3;
}

export interface ComputedDsoState extends DeepSkyObject {
  azimuthDeg: number;
  altitudeDeg: number;
  isAboveHorizon: boolean;
  vec3: THREE.Vector3;
}

/**
 * Converts Right Ascension (hours 0..24) and Declination (degrees -90..+90)
 * to Horizon coordinates (Azimuth & Altitude) for observer at lat/lon/date.
 */
export function raDecToAltAz(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  date: Date
): AltAzCoord {
  const time = new Astronomy.AstroTime(date);
  const observer = new Astronomy.Observer(latDeg, lonDeg, 0);

  // astronomy-engine Horizon function converts RA & Dec to Azimuth & Altitude
  const hor = Astronomy.Horizon(time, observer, raHours, decDeg, "normal");

  const azimuthDeg = (hor.azimuth % 360 + 360) % 360;
  const altitudeDeg = hor.altitude;

  return {
    azimuthDeg,
    altitudeDeg,
    isAboveHorizon: altitudeDeg > -0.5,
  };
}

/**
 * Converts Azimuth (0=North, 90=East) and Altitude (-90..+90) to 3D Sky Dome Vector3
 * In Three.js: +Y is UP, +Z is SOUTH, -Z is NORTH, +X is EAST, -X is WEST
 */
export function altAzToVector3(azDeg: number, altDeg: number, radius: number): THREE.Vector3 {
  const azRad = (azDeg * Math.PI) / 180;
  const altRad = (altDeg * Math.PI) / 180;

  const x = radius * Math.cos(altRad) * Math.sin(azRad);
  const y = radius * Math.sin(altRad);
  const z = -radius * Math.cos(altRad) * Math.cos(azRad);

  return new THREE.Vector3(x, y, z);
}

/**
 * Computes live planetary states (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune)
 * at observer location & time using astronomy-engine.
 */
export function getSkyPlanets(
  latDeg: number,
  lonDeg: number,
  date: Date
): PlanetSkyState[] {
  const time = new Astronomy.AstroTime(date);
  const observer = new Astronomy.Observer(latDeg, lonDeg, 0);

  const bodies = [
    { id: "Sun", name: "Sun", body: Astronomy.Body.Sun, color: "#fffaed", size: 4.5 },
    { id: "Moon", name: "Moon", body: Astronomy.Body.Moon, color: "#e2e8f0", size: 3.8 },
    { id: "Mercury", name: "Mercury", body: Astronomy.Body.Mercury, color: "#d1d5db", size: 1.8 },
    { id: "Venus", name: "Venus", body: Astronomy.Body.Venus, color: "#fffbeb", size: 2.6 },
    { id: "Mars", name: "Mars", body: Astronomy.Body.Mars, color: "#ef4444", size: 2.2 },
    { id: "Jupiter", name: "Jupiter", body: Astronomy.Body.Jupiter, color: "#f59e0b", size: 3.2 },
    { id: "Saturn", name: "Saturn", body: Astronomy.Body.Saturn, color: "#fbbf24", size: 2.8, hasRings: true },
    { id: "Uranus", name: "Uranus", body: Astronomy.Body.Uranus, color: "#38bdf8", size: 2.0 },
    { id: "Neptune", name: "Neptune", body: Astronomy.Body.Neptune, color: "#3b82f6", size: 1.9 },
  ];

  const results: PlanetSkyState[] = [];

  for (const b of bodies) {
    try {
      const eq = Astronomy.Equator(b.body, time, observer, true, true);
      const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, "normal");
      const illum = Astronomy.Illumination(b.body, time);

      let phasePct: number | undefined;
      if (b.id === "Moon" || b.id === "Venus" || b.id === "Mercury") {
        phasePct = Math.round(illum.phase_fraction * 100);
      }

      const type: "Sun" | "Moon" | "Planet" =
        b.id === "Sun" ? "Sun" : b.id === "Moon" ? "Moon" : "Planet";

      results.push({
        id: b.id,
        name: b.name,
        type,
        raHours: eq.ra,
        decDeg: eq.dec,
        azimuthDeg: (hor.azimuth % 360 + 360) % 360,
        altitudeDeg: hor.altitude,
        distanceAu: eq.dist,
        vmag: illum.mag,
        phasePercent: phasePct,
        color: b.color,
        size: b.size,
        hasRings: b.hasRings,
      });
    } catch {
      /* fallback */
    }
  }

  return results;
}

/**
 * Computes position for all catalog stars for current observer location & time
 */
export function getComputedStars(
  latDeg: number,
  lonDeg: number,
  date: Date,
  skyRadius: number
): ComputedStarState[] {
  return STAR_CATALOG.map((star) => {
    const { azimuthDeg, altitudeDeg, isAboveHorizon } = raDecToAltAz(
      star.raHours,
      star.decDeg,
      latDeg,
      lonDeg,
      date
    );
    const vec3 = altAzToVector3(azimuthDeg, altitudeDeg, skyRadius);
    return {
      ...star,
      azimuthDeg,
      altitudeDeg,
      isAboveHorizon,
      vec3,
    };
  });
}

/**
 * Computes position for Deep Sky Objects
 */
export function getComputedDsos(
  latDeg: number,
  lonDeg: number,
  date: Date,
  skyRadius: number
): ComputedDsoState[] {
  return DEEP_SKY_OBJECTS.map((dso) => {
    const { azimuthDeg, altitudeDeg, isAboveHorizon } = raDecToAltAz(
      dso.raHours,
      dso.decDeg,
      latDeg,
      lonDeg,
      date
    );
    const vec3 = altAzToVector3(azimuthDeg, altitudeDeg, skyRadius);
    return {
      ...dso,
      azimuthDeg,
      altitudeDeg,
      isAboveHorizon,
      vec3,
    };
  });
}

/**
 * Generates Ecliptic Arc polyline points (path of the Sun and planets across the sky)
 */
export function getEclipticLinePoints(
  latDeg: number,
  lonDeg: number,
  date: Date,
  skyRadius: number,
  samples = 72
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const time = new Astronomy.AstroTime(date);
  const observer = new Astronomy.Observer(latDeg, lonDeg, 0);

  // Ecliptic obliquity ~23.44°
  for (let i = 0; i <= samples; i++) {
    const lonRad = (i / samples) * Math.PI * 2;
    // Convert ecliptic lon to RA & Dec
    const eps = (23.439281 * Math.PI) / 180;
    const sinDec = Math.sin(eps) * Math.sin(lonRad);
    const decDeg = (Math.asin(sinDec) * 180) / Math.PI;

    const y = Math.cos(eps) * Math.sin(lonRad);
    const x = Math.cos(lonRad);
    let raHours = (Math.atan2(y, x) * 12) / Math.PI;
    if (raHours < 0) raHours += 24;

    const hor = Astronomy.Horizon(time, observer, raHours, decDeg);
    if (hor.altitude > -2) {
      points.push(altAzToVector3((hor.azimuth % 360 + 360) % 360, hor.altitude, skyRadius * 0.98));
    }
  }

  return points;
}

/**
 * Generates Celestial Equator Arc polyline points (Dec = 0°)
 */
export function getCelestialEquatorPoints(
  latDeg: number,
  lonDeg: number,
  date: Date,
  skyRadius: number,
  samples = 72
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const time = new Astronomy.AstroTime(date);
  const observer = new Astronomy.Observer(latDeg, lonDeg, 0);

  for (let i = 0; i <= samples; i++) {
    const raHours = (i / samples) * 24;
    const hor = Astronomy.Horizon(time, observer, raHours, 0);
    if (hor.altitude > -2) {
      points.push(altAzToVector3((hor.azimuth % 360 + 360) % 360, hor.altitude, skyRadius * 0.98));
    }
  }

  return points;
}

/**
 * Atmosphere state based on Sun's altitude:
 * - Alt > 0°: Daytime (Bright cyan blue, stars hidden)
 * - -6° < Alt <= 0°: Civil Twilight (Golden/orange sunset)
 * - -12° < Alt <= -6°: Nautical Twilight (Deep purple/navy)
 * - -18° < Alt <= -12°: Astronomical Twilight (Dark indigo)
 * - Alt <= -18°: Deep Night (Pitch dark, bright stars & Milky Way)
 */
export function getAtmosphericState(sunAltDeg: number) {
  if (sunAltDeg > 0) {
    return {
      skyTone: "#1e3a8a", // Bright blue
      horizonTone: "#38bdf8",
      starVisibility: 0.05,
      atmosphereOpacity: 0.85,
      isNight: false,
    };
  } else if (sunAltDeg > -6) {
    return {
      skyTone: "#311b92", // Golden sunset purple
      horizonTone: "#f97316",
      starVisibility: 0.35,
      atmosphereOpacity: 0.6,
      isNight: false,
    };
  } else if (sunAltDeg > -12) {
    return {
      skyTone: "#1e1b4b", // Nautical navy
      horizonTone: "#9333ea",
      starVisibility: 0.7,
      atmosphereOpacity: 0.3,
      isNight: true,
    };
  } else if (sunAltDeg > -18) {
    return {
      skyTone: "#090d16", // Astronomical twilight dark
      horizonTone: "#1e1b4b",
      starVisibility: 0.9,
      atmosphereOpacity: 0.15,
      isNight: true,
    };
  } else {
    return {
      skyTone: "#03040a", // Deep space night
      horizonTone: "#050814",
      starVisibility: 1.0,
      atmosphereOpacity: 0.0,
      isNight: true,
    };
  }
}
