import * as satellite from "satellite.js";
import * as THREE from "three";
import { DEFAULT_SATELLITE_CATALOG } from "@/components/intelligence/defaultCatalog";
import { SatelliteData } from "@/components/intelligence/store";

export interface SatellitePassDetails {
  riseTimeStr: string;
  riseAzimuthDeg: number;
  peakTimeStr: string;
  peakElevationDeg: number;
  setTimeStr: string;
  setAzimuthDeg: number;
  riseVec3: THREE.Vector3;
  peakVec3: THREE.Vector3;
  setVec3: THREE.Vector3;
  isOverheadNow: boolean;
}

export interface PassGraphPoint {
  timeStr: string;
  timeMs: number;
  elevationDeg: number;
  magnitude: number;
  inclinationDeg: number;
  isCurrent: boolean;
}

export interface ObserverViewingRequirements {
  visibilityClass: string;
  visibilityBadgeColor: string;
  sunIlluminationStatus: string;
  minElevationRequirement: string;
  recommendedOptics: string;
  bortleScale: string;
  optimalWindow: string;
}

export interface ScientificCoordinates {
  raStr: string; // Right Ascension (e.g. 14h 23m 12s)
  decStr: string; // Declination (e.g. +51° 14' 08")
  raDeg: number;
  decDeg: number;
}

export interface ComputedSatelliteSkyState {
  id: number;
  name: string;
  category: string;
  orbitClass: string;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  satAltitudeKm: number;
  speedKms: number;
  inclinationDeg: number;
  visualMagnitude: number;
  isAboveHorizon: boolean;
  hasUpcomingPassIn24h: boolean;
  passStatus: "Overhead" | "High Sky" | "Low Horizon" | "Below Horizon";
  vec3: THREE.Vector3;
  coordsEq?: ScientificCoordinates;
  trajectoryPoints: THREE.Vector3[];
  pastTrajectoryPoints: THREE.Vector3[];
  futureTrajectoryPoints: THREE.Vector3[];
  passDetails?: SatellitePassDetails;
  passGraphPoints?: PassGraphPoint[];
  viewingRequirements?: ObserverViewingRequirements;
  maxPassElevationDeg?: number;
  nextPassTimeMs?: number | null;

  // PHYSICS-DRIVEN OPTICAL & ILLUMINATION FIELDS
  isSunlit: boolean;
  sunElevationDeg: number;
  isObserverDark: boolean;
  isNakedEyeVisible: boolean;
  solarPhaseAngleDeg: number;
}

export function satAltAzToVector3(azDeg: number, elDeg: number, radius: number): THREE.Vector3 {
  const azRad = (azDeg * Math.PI) / 180;
  const elRad = (elDeg * Math.PI) / 180;

  // Y axis is up (0° = Horizon, 90° = Zenith)
  // Azimuth 0° = North (-Z), 90° = East (+X), 180° = South (+Z), 270° = West (-X)
  const x = radius * Math.cos(elRad) * Math.sin(azRad);
  const y = radius * Math.sin(elRad);
  const z = -radius * Math.cos(elRad) * Math.cos(azRad);

  return new THREE.Vector3(x, y, z);
}

// Calculate standard inclination from TLE Line 2
export function parseInclinationFromTLE(line2: string): number {
  try {
    const parts = line2.trim().split(/\s+/);
    if (parts.length >= 3) {
      const inc = parseFloat(parts[2]);
      if (!isNaN(inc)) return inc;
    }
  } catch {
    // fallback
  }
  return 51.64; // Default ISS inclination
}

// Compute exact Topocentric Equatorial Coordinates (RA, Dec) for scientific physics research
export function computeScientificEquatorialCoords(
  azDeg: number,
  elDeg: number,
  latDeg: number
): ScientificCoordinates {
  const azRad = (azDeg * Math.PI) / 180;
  const elRad = (elDeg * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;

  const sinDec = Math.sin(elRad) * Math.sin(latRad) + Math.cos(elRad) * Math.cos(latRad) * Math.cos(azRad);
  const decRad = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const decDeg = (decRad * 180) / Math.PI;

  const y = -Math.sin(azRad) * Math.cos(elRad);
  const x = Math.cos(elRad) * Math.sin(latRad) * Math.cos(azRad) - Math.sin(elRad) * Math.cos(latRad);
  const haRad = Math.atan2(y, x);
  const haDeg = (((haRad * 180) / Math.PI % 360) + 360) % 360;

  const raHours = (360 - haDeg) / 15;
  const raH = Math.floor(raHours);
  const raM = Math.floor((raHours - raH) * 60);
  const raS = Math.round(((raHours - raH) * 60 - raM) * 60);

  const decSign = decDeg >= 0 ? "+" : "-";
  const absDec = Math.abs(decDeg);
  const decD = Math.floor(absDec);
  const decM = Math.floor((absDec - decD) * 60);
  const decS = Math.round(((absDec - decD) * 60 - decM) * 60);

  return {
    raStr: `${raH.toString().padStart(2, "0")}h ${raM.toString().padStart(2, "0")}m ${raS.toString().padStart(2, "0")}s`,
    decStr: `${decSign}${decD.toString().padStart(2, "0")}° ${decM.toString().padStart(2, "0")}' ${decS.toString().padStart(2, "0")}"`,
    raDeg: (raHours * 15) % 360,
    decDeg,
  };
}

// Estimate visual magnitude based on category, range, and elevation
export function estimateVisualMagnitude(
  category: string,
  rangeKm: number,
  elevationDeg: number
): number {
  let baseMag = 4.5;
  const cat = category.toLowerCase();
  if (cat.includes("station") || cat.includes("iss")) baseMag = -1.8;
  else if (cat.includes("hubble") || cat.includes("telescope")) baseMag = 1.2;
  else if (cat.includes("science") || cat.includes("starlink")) baseMag = 3.2;
  else if (cat.includes("weather") || cat.includes("noaa")) baseMag = 2.8;
  else if (cat.includes("gps") || cat.includes("navigation")) baseMag = 5.2;

  const normRange = Math.max(300, rangeKm);
  const rangeFactor = 5 * Math.log10(normRange / 500);
  const elFactor = (90 - Math.max(0, elevationDeg)) * 0.02;

  const mag = baseMag + rangeFactor + elFactor;
  return Math.round(mag * 10) / 10;
}

// Generate Observer Requirements
export function computeViewingRequirements(
  satName: string,
  mag: number,
  maxEl: number,
  peakTimeStr: string,
  peakAz: number,
  isSunlit: boolean = true,
  isObserverDark: boolean = true
): ObserverViewingRequirements {
  let visibilityClass = "Naked Eye Visible";
  let visibilityBadgeColor = "text-emerald-400 border-emerald-500/50 bg-emerald-950/60";
  let recommendedOptics = "No Telescope Needed (Naked Eye)";

  if (!isSunlit) {
    visibilityClass = "Eclipsed (In Earth Shadow)";
    visibilityBadgeColor = "text-purple-400 border-purple-500/50 bg-purple-950/70";
    recommendedOptics = "Optical Darkness — Satellite is completely eclipsed in Earth umbra";
  } else if (!isObserverDark) {
    visibilityClass = "Daylight Transit (Overhead in Day Sky)";
    visibilityBadgeColor = "text-blue-300 border-blue-500/50 bg-blue-950/60";
    recommendedOptics = "Daylight Sky Drowns Satellite (Only optical transit visible)";
  } else if (mag <= 2.0) {
    visibilityClass = "Ultra-Bright (Naked Eye Landmark)";
    visibilityBadgeColor = "text-amber-300 border-amber-500/60 bg-amber-950/80";
    recommendedOptics = "Direct Naked-Eye Sight (Bright Star-Like Flare)";
  } else if (mag <= 5.5) {
    visibilityClass = "Naked Eye Visible in Dark/Suburban Sky";
    visibilityBadgeColor = "text-emerald-300 border-emerald-500/50 bg-emerald-950/60";
    recommendedOptics = "Naked Eye or Wide Field 7x50 Binoculars";
  } else if (mag <= 8.5) {
    visibilityClass = "Binoculars Required";
    visibilityBadgeColor = "text-cyan-300 border-cyan-500/50 bg-cyan-950/60";
    recommendedOptics = "Standard 7x50 / 10x50 Astronomical Binoculars";
  } else {
    visibilityClass = "Small Telescope Required";
    visibilityBadgeColor = "text-purple-300 border-purple-500/50 bg-purple-950/60";
    recommendedOptics = "70mm+ Aperture Refractor / Reflector Telescope";
  }

  const minElevationRequirement =
    maxEl >= 30
      ? `High Pass (Max ${Math.round(maxEl)}°) — Excellent Line of Sight above buildings`
      : maxEl >= 15
      ? `Mid Pass (Max ${Math.round(maxEl)}°) — Requires clear unblocked horizon`
      : `Low Horizon Pass (Max ${Math.round(maxEl)}°) — Needs unobstructed view`;

  const optimalWindow = `Peak brightness at ${peakTimeStr} (AZ ${Math.round(peakAz)}°)`;

  const sunIlluminationStatus = !isSunlit
    ? "Eclipsed in Earth Shadow (Zero Reflected Sunlight)"
    : isObserverDark
    ? "Sunlit in Twilight/Night Sky (High Contrast Optical Visibility)"
    : "Sunlit in Daylight Sky (Drowned by Atmospheric Sunlight)";

  return {
    visibilityClass,
    visibilityBadgeColor,
    sunIlluminationStatus,
    minElevationRequirement,
    recommendedOptics,
    bortleScale: mag > 4.0 ? "Bortle 1-4 (Dark Sky Site Preferred)" : "Bortle 1-6 (Suburban City Sky)",
    optimalWindow,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICS ENGINE: SOLAR VECTOR, EARTH SHADOW CONICAL UMBRA & OPTICAL VISIBILITY
// ─────────────────────────────────────────────────────────────────────────────

// 1. Calculate Sun ECI position vector for given Date (Vallado / Meeus Astronomical Algorithm)
export function computeSunPositionEci(date: Date): { x: number; y: number; z: number } {
  // Days since J2000.0 (2000 Jan 1 12:00 UTC)
  const d = (date.getTime() - 946728000000) / 86400000;

  // Mean longitude of the Sun (degrees)
  const L = (280.46 + 0.9856474 * d) % 360;
  // Mean anomaly of the Sun (degrees)
  const g = (357.528 + 0.9856003 * d) % 360;
  const gRad = (g * Math.PI) / 180;

  // Ecliptic longitude of the Sun (degrees)
  const lambda = (L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad)) % 360;
  const lambdaRad = (lambda * Math.PI) / 180;

  // Obliquity of ecliptic (degrees)
  const epsilon = 23.439 - 0.0000004 * d;
  const epsRad = (epsilon * Math.PI) / 180;

  // Distance from Earth to Sun in AU -> km
  const rAu = 1.00014 - 0.01671 * Math.cos(gRad) - 0.00014 * Math.cos(2 * gRad);
  const rKm = rAu * 149597870.7;

  // ECI position coordinates (km)
  const x = rKm * Math.cos(lambdaRad);
  const y = rKm * Math.cos(epsRad) * Math.sin(lambdaRad);
  const z = rKm * Math.sin(epsRad) * Math.sin(lambdaRad);

  return { x, y, z };
}

// 2. Calculate Observer Solar Elevation & Azimuth
export function computeObserverSunCoords(
  latDeg: number,
  lonDeg: number,
  altMeters: number,
  date: Date
): { azimuthDeg: number; elevationDeg: number; isDark: boolean } {
  const sunEci = computeSunPositionEci(date);
  const gmst = satellite.gstime(date);
  const sunEcf = satellite.eciToEcf(sunEci, gmst);
  const observerGd = {
    latitude: (latDeg * Math.PI) / 180,
    longitude: (lonDeg * Math.PI) / 180,
    height: altMeters / 1000,
  };
  const lookAngles = satellite.ecfToLookAngles(observerGd, sunEcf);
  const elevationDeg = (lookAngles.elevation * 180) / Math.PI;
  const azimuthDeg = (((lookAngles.azimuth * 180) / Math.PI % 360) + 360) % 360;

  return {
    azimuthDeg,
    elevationDeg,
    isDark: elevationDeg < -6, // Civil twilight threshold (-6°)
  };
}

// 3. Vallado Algorithm 34 Dual-Cone Earth Umbra / Penumbra Shadow Physics Model
export interface SolarIlluminationPhysics {
  isSunlit: boolean;
  shadowStatus: "Sunlit" | "Penumbra" | "Umbra (Eclipsed)";
  eclipseFraction: number; // 0 = 100% full sunlight, 1.0 = total umbral darkness
}

export function checkSatelliteSunlitPhysics(
  posEci: { x: number; y: number; z: number },
  sunEci: { x: number; y: number; z: number }
): SolarIlluminationPhysics {
  // Effective Earth radius augmented by 100km for optical atmospheric absorption & extinction
  const R_EARTH_EFF = 6378.137 + 100.0; // 6478.137 km
  const R_SUN = 696000.0; // Solar radius in km

  // Vector from satellite to Sun
  const dx = sunEci.x - posEci.x;
  const dy = sunEci.y - posEci.y;
  const dz = sunEci.z - posEci.z;
  const dSatSun = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const rSat = Math.sqrt(posEci.x ** 2 + posEci.y ** 2 + posEci.z ** 2);
  const rSun = Math.sqrt(sunEci.x ** 2 + sunEci.y ** 2 + sunEci.z ** 2);

  if (rSat < 100 || dSatSun < 1000) {
    return { isSunlit: true, shadowStatus: "Sunlit", eclipseFraction: 0 };
  }

  // Dot product of satellite position with Sun direction
  const dotSatSun = (posEci.x * sunEci.x + posEci.y * sunEci.y + posEci.z * sunEci.z) / (rSat * rSun);

  // Apparent angular semi-diameters
  const sinAlphaEarth = Math.min(1.0, R_EARTH_EFF / rSat);
  const alphaEarth = Math.asin(sinAlphaEarth);

  const sinAlphaSun = Math.min(1.0, R_SUN / dSatSun);
  const alphaSun = Math.asin(sinAlphaSun);

  // Apparent angular separation of Earth center and Sun center as seen from satellite
  // Vector sat -> Earth center is -posEci
  // Vector sat -> Sun center is (sunEci - posEci)
  const dotSeparation = ((-posEci.x) * dx + (-posEci.y) * dy + (-posEci.z) * dz) / (rSat * dSatSun);
  const thetaSep = Math.acos(Math.max(-1.0, Math.min(1.0, dotSeparation)));

  // If satellite is on dayside facing Sun and unobstructed by Earth limb
  if (dotSatSun > 0 && thetaSep > alphaEarth + alphaSun) {
    return { isSunlit: true, shadowStatus: "Sunlit", eclipseFraction: 0 };
  }

  // Vallado Eclipse Cone Geometric Test (Algorithm 34)
  if (thetaSep >= alphaEarth + alphaSun) {
    // Earth disk and Sun disk do not intersect at all: full sunlight
    return { isSunlit: true, shadowStatus: "Sunlit", eclipseFraction: 0 };
  } else if (thetaSep <= alphaEarth - alphaSun) {
    // Earth disk completely covers Sun disk: Total Umbral Eclipse
    return { isSunlit: false, shadowStatus: "Umbra (Eclipsed)", eclipseFraction: 1.0 };
  } else {
    // Partial eclipse (Penumbra)
    const frac = (alphaEarth + alphaSun - thetaSep) / (2 * alphaSun);
    const eclipseFrac = Math.max(0, Math.min(1.0, frac));
    // For optical stargazing, if >50% of the Sun is eclipsed, the satellite appears darkened
    return {
      isSunlit: eclipseFrac < 0.5,
      shadowStatus: "Penumbra",
      eclipseFraction: Math.round(eclipseFrac * 100) / 100,
    };
  }
}
export function computeSatelliteState(
  sat: SatelliteData,
  latDeg: number,
  lonDeg: number,
  altMeters: number,
  date: Date,
  skyRadius: number,
  includeTrajectory: boolean = false
): ComputedSatelliteSkyState | null {
  try {
    const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
    if (!satrec) return null;

    const positionAndVelocity = satellite.propagate(satrec, date);
    if (
      !positionAndVelocity ||
      !positionAndVelocity.position ||
      typeof positionAndVelocity.position === "boolean" ||
      !positionAndVelocity.velocity ||
      typeof positionAndVelocity.velocity === "boolean"
    ) {
      return null;
    }

    const posEci = positionAndVelocity.position as { x: number; y: number; z: number };
    const velEci = positionAndVelocity.velocity as { x: number; y: number; z: number };
    const gmst = satellite.gstime(date);
    const posEcf = satellite.eciToEcf(posEci, gmst);

    const observerGd = {
      latitude: (latDeg * Math.PI) / 180,
      longitude: (lonDeg * Math.PI) / 180,
      height: altMeters / 1000,
    };

    const lookAngles = satellite.ecfToLookAngles(observerGd, posEcf);
    const azimuthDeg = (((lookAngles.azimuth * 180) / Math.PI % 360) + 360) % 360;
    const elevationDeg = (lookAngles.elevation * 180) / Math.PI;
    const rangeKm = lookAngles.rangeSat;

    const geodetic = satellite.eciToGeodetic(posEci, gmst);
    const satAltitudeKm = Math.max(100, geodetic.height);
    const speedKms = Math.sqrt(velEci.x ** 2 + velEci.y ** 2 + velEci.z ** 2);
    const inclinationDeg = parseInclinationFromTLE(sat.line2);

    // Astrophysics Sun, Shadow & Solar Phase Angle Calculations
    const sunEci = computeSunPositionEci(date);
    const sunlitPhysics = checkSatelliteSunlitPhysics(posEci, sunEci);
    const obsSun = computeObserverSunCoords(latDeg, lonDeg, altMeters, date);

    // Compute Solar Phase Angle psi
    const satVecEci = new THREE.Vector3(posEci.x, posEci.y, posEci.z);
    const sunVecEci = new THREE.Vector3(sunEci.x, sunEci.y, sunEci.z);
    const obsEcf = satellite.geodeticToEcf(observerGd);
    const obsEci = satellite.ecfToEci(obsEcf, gmst);
    const obsVecEci = new THREE.Vector3(obsEci.x, obsEci.y, obsEci.z);

    const satToObs = obsVecEci.clone().sub(satVecEci).normalize();
    const satToSun = sunVecEci.clone().sub(satVecEci).normalize();
    const phaseRad = Math.acos(Math.max(-1, Math.min(1, satToObs.dot(satToSun))));
    const solarPhaseAngleDeg = (phaseRad * 180) / Math.PI;

    const isSunlit = sunlitPhysics.isSunlit;
    const sunElevationDeg = obsSun.elevationDeg;
    const isObserverDark = obsSun.isDark;

    const coordsEq = computeScientificEquatorialCoords(azimuthDeg, elevationDeg, latDeg);
    const visualMagnitude = estimateVisualMagnitude(sat.category || "Active", rangeKm, elevationDeg);

    const isAboveHorizon = elevationDeg > 0;
    const isNakedEyeVisible = isAboveHorizon && isSunlit && isObserverDark && visualMagnitude <= 6.0;

    // Check if satellite has an observable pass in the next 24 hours (86,400s) from observer location
    // A visible/observable pass requires an elevation cleanly clearing local ground obstacles/haze (>= 12° or currently above horizon)
    let hasUpcomingPassIn24h = isAboveHorizon && elevationDeg >= 5;
    let peakPassElevationDeg = Math.max(0, elevationDeg);
    let nextPassTimeMs: number | null = isAboveHorizon ? date.getTime() : null;

    if (includeTrajectory) {
      const stepSecs = 180; // scan every 3 minutes over 24h for detailed pass analysis
      for (let t = 0; t <= 86400; t += stepSecs) {
        const sampleDate = new Date(date.getTime() + t * 1000);
        const pv = satellite.propagate(satrec, sampleDate);
        if (pv && pv.position && typeof pv.position !== "boolean") {
          const pEci = pv.position as { x: number; y: number; z: number };
          const g = satellite.gstime(sampleDate);
          const pEcf = satellite.eciToEcf(pEci, g);
          const l = satellite.ecfToLookAngles(observerGd, pEcf);
          const elDeg = (l.elevation * 180) / Math.PI;
          if (elDeg > peakPassElevationDeg) {
            peakPassElevationDeg = elDeg;
            if (nextPassTimeMs === null && elDeg >= 10) {
              nextPassTimeMs = sampleDate.getTime();
            }
          }
        }
      }
      hasUpcomingPassIn24h = isAboveHorizon || peakPassElevationDeg >= 10;
    } else {
      // In fast check mode: 36-step temporal propagation over 24h (~0.4ms)
      for (let t = 0; t <= 86400; t += 2400) {
        const sampleDate = new Date(date.getTime() + t * 1000);
        const pv = satellite.propagate(satrec, sampleDate);
        if (pv && pv.position && typeof pv.position !== "boolean") {
          const pEci = pv.position as { x: number; y: number; z: number };
          const g = satellite.gstime(sampleDate);
          const pEcf = satellite.eciToEcf(pEci, g);
          const l = satellite.ecfToLookAngles(observerGd, pEcf);
          const elDeg = (l.elevation * 180) / Math.PI;
          if (elDeg > peakPassElevationDeg) {
            peakPassElevationDeg = elDeg;
            if (nextPassTimeMs === null && elDeg >= 10) {
              nextPassTimeMs = sampleDate.getTime();
            }
          }
        }
      }
      hasUpcomingPassIn24h = isAboveHorizon || peakPassElevationDeg >= 10;
    }

    const passStatus: "Overhead" | "High Sky" | "Low Horizon" | "Below Horizon" =
      elevationDeg > 60
        ? "Overhead"
        : elevationDeg > 20
        ? "High Sky"
        : elevationDeg > 0
        ? "Low Horizon"
        : "Below Horizon";

    const vec3 = satAltAzToVector3(azimuthDeg, elevationDeg, skyRadius * 0.92);

    let fullTrajectoryPoints: THREE.Vector3[] = [];
    let pastTrajectoryPoints: THREE.Vector3[] = [];
    let futureTrajectoryPoints: THREE.Vector3[] = [];
    let passDetails: SatellitePassDetails | undefined;
    let passGraphPoints: PassGraphPoint[] | undefined;
    let viewingRequirements: ObserverViewingRequirements | undefined;

    if (includeTrajectory) {
      // True Keplerian orbital period in seconds from mean motion no (rad/min)
      const meanMotionRadPerMin = (satrec.no && satrec.no > 0) ? satrec.no : 0.06;
      const trueOrbitalPeriodSecs = Math.max(5000, Math.min(86400, Math.round(((2 * Math.PI) / meanMotionRadPerMin) * 60)));
      const isLEO = trueOrbitalPeriodSecs <= 7200;
      const stepSecs = isLEO ? 20 : 90;
      const maxScanSecs = Math.min(43200, Math.round(trueOrbitalPeriodSecs * 0.65));

      let passRiseTimeMs: number = date.getTime();
      let passSetTimeMs: number = date.getTime();
      let hasValidPass = false;

      if (isAboveHorizon) {
        // Satellite is currently overhead: scan backward for rise and forward for set
        let tLast = 0;
        let elLast = elevationDeg;
        let foundRise = false;

        // 1. Scan backward for rise
        for (let t = -stepSecs; t >= -maxScanSecs; t -= stepSecs) {
          const sampleDate = new Date(date.getTime() + t * 1000);
          const pv = satellite.propagate(satrec, sampleDate);
          if (pv?.position && typeof pv.position !== "boolean") {
            const pEcf = satellite.eciToEcf(pv.position as satellite.EciVec3<number>, satellite.gstime(sampleDate));
            const l = satellite.ecfToLookAngles(observerGd, pEcf);
            const el = (l.elevation * 180) / Math.PI;
            if (el < 0) {
              // Linear interpolation of exact 0° horizon crossing
              const frac = elLast / (elLast - el);
              passRiseTimeMs = date.getTime() + (tLast + frac * (t - tLast)) * 1000;
              foundRise = true;
              break;
            }
            tLast = t;
            elLast = el;
          }
        }
        if (!foundRise) {
          // Pass started earlier than maxScanSecs or satellite is circumpolar
          passRiseTimeMs = date.getTime() - Math.min(maxScanSecs, 14400) * 1000;
        }

        // 2. Scan forward for set
        tLast = 0;
        elLast = elevationDeg;
        let foundSet = false;
        for (let t = stepSecs; t <= maxScanSecs; t += stepSecs) {
          const sampleDate = new Date(date.getTime() + t * 1000);
          const pv = satellite.propagate(satrec, sampleDate);
          if (pv?.position && typeof pv.position !== "boolean") {
            const pEcf = satellite.eciToEcf(pv.position as satellite.EciVec3<number>, satellite.gstime(sampleDate));
            const l = satellite.ecfToLookAngles(observerGd, pEcf);
            const el = (l.elevation * 180) / Math.PI;
            if (el < 0) {
              // Linear interpolation of exact 0° horizon crossing
              const frac = elLast / (elLast - el);
              passSetTimeMs = date.getTime() + (tLast + frac * (t - tLast)) * 1000;
              foundSet = true;
              break;
            }
            tLast = t;
            elLast = el;
          }
        }
        if (!foundSet) {
          // Pass extends beyond maxScanSecs or satellite is circumpolar
          passSetTimeMs = date.getTime() + Math.min(maxScanSecs, 14400) * 1000;
        }

        hasValidPass = passSetTimeMs > passRiseTimeMs;
      } else {
        // Satellite is below horizon: scan forward over 24 hours to find the next upcoming pass
        let scanInPass = false;
        let tLast = 0;
        let elLast = elevationDeg;
        const forwardStepSecs = isLEO ? 45 : 120;

        for (let t = forwardStepSecs; t <= 86400; t += forwardStepSecs) {
          const sampleDate = new Date(date.getTime() + t * 1000);
          const pv = satellite.propagate(satrec, sampleDate);
          if (pv?.position && typeof pv.position !== "boolean") {
            const pEcf = satellite.eciToEcf(pv.position as satellite.EciVec3<number>, satellite.gstime(sampleDate));
            const l = satellite.ecfToLookAngles(observerGd, pEcf);
            const el = (l.elevation * 180) / Math.PI;

            if (el >= 0 && !scanInPass) {
              scanInPass = true;
              const frac = (0 - elLast) / (el - elLast);
              passRiseTimeMs = date.getTime() + (tLast + frac * (t - tLast)) * 1000;
            } else if (el < 0 && scanInPass) {
              const frac = elLast / (elLast - el);
              passSetTimeMs = date.getTime() + (tLast + frac * (t - tLast)) * 1000;
              hasValidPass = true;
              break;
            }
            tLast = t;
            elLast = el;
          }
        }
      }

      if (hasValidPass && passSetTimeMs > passRiseTimeMs) {
        const numSamples = 64;
        const durationMs = passSetTimeMs - passRiseTimeMs;
        let maxEl = -90;
        let peakTime = new Date(passRiseTimeMs + durationMs / 2);
        let peakVec = vec3;
        let peakAz = azimuthDeg;
        let riseAz = azimuthDeg;
        let riseVec = vec3;
        let setAz = azimuthDeg;
        let setVec = vec3;

        const graphPts: PassGraphPoint[] = [];
        const rawFullPoints: { timeMs: number; pt: THREE.Vector3 }[] = [];

        for (let i = 0; i <= numSamples; i++) {
          const sampleTimeMs = passRiseTimeMs + (i / numSamples) * durationMs;
          const sampleDate = new Date(sampleTimeMs);
          const pv = satellite.propagate(satrec, sampleDate);
          if (pv?.position && typeof pv.position !== "boolean") {
            const pEcf = satellite.eciToEcf(pv.position as satellite.EciVec3<number>, satellite.gstime(sampleDate));
            const l = satellite.ecfToLookAngles(observerGd, pEcf);
            const el = (l.elevation * 180) / Math.PI;
            const az = (((l.azimuth * 180) / Math.PI % 360) + 360) % 360;

            const pt = satAltAzToVector3(az, Math.max(0, el), skyRadius * 0.92);
            rawFullPoints.push({ timeMs: sampleTimeMs, pt });

            if (i === 0) {
              riseAz = az;
              riseVec = pt;
            }
            if (i === numSamples) {
              setAz = az;
              setVec = pt;
            }

            if (el > maxEl) {
              maxEl = el;
              peakTime = sampleDate;
              peakVec = pt;
              peakAz = az;
            }

            const sampleMag = estimateVisualMagnitude(sat.category || "Active", l.rangeSat, el);
            const isCurr = Math.abs(sampleTimeMs - date.getTime()) < durationMs / (numSamples * 2);

            graphPts.push({
              timeStr: sampleDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              timeMs: sampleTimeMs,
              elevationDeg: Math.round(Math.max(0, el)),
              magnitude: sampleMag,
              inclinationDeg,
              isCurrent: isCurr,
            });
          }
        }

        // When satellite is overhead, ensure the exact instantaneous vec3 is inserted at the precise timestamp
        if (isAboveHorizon) {
          rawFullPoints.push({ timeMs: date.getTime(), pt: vec3 });
        }
        rawFullPoints.sort((a, b) => a.timeMs - b.timeMs);

        fullTrajectoryPoints = rawFullPoints.map((p) => p.pt);
        pastTrajectoryPoints = rawFullPoints.filter((p) => p.timeMs <= date.getTime()).map((p) => p.pt);
        futureTrajectoryPoints = rawFullPoints.filter((p) => p.timeMs >= date.getTime()).map((p) => p.pt);

        passGraphPoints = graphPts;

        const fmtTime = (d: Date | null) =>
          d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "N/A";

        passDetails = {
          riseTimeStr: fmtTime(new Date(passRiseTimeMs)),
          riseAzimuthDeg: Math.round(riseAz),
          peakTimeStr: fmtTime(peakTime),
          peakElevationDeg: Math.round(maxEl),
          setTimeStr: fmtTime(new Date(passSetTimeMs)),
          setAzimuthDeg: Math.round(setAz),
          riseVec3: riseVec,
          peakVec3: peakVec,
          setVec3: setVec,
          isOverheadNow: isAboveHorizon,
        };

        viewingRequirements = computeViewingRequirements(
          sat.name,
          visualMagnitude,
          maxEl,
          fmtTime(peakTime),
          peakAz,
          isSunlit,
          isObserverDark
        );
      }
    } else {
      viewingRequirements = computeViewingRequirements(
        sat.name,
        visualMagnitude,
        elevationDeg,
        "Now",
        azimuthDeg,
        isSunlit,
        isObserverDark
      );
    }

    return {
      id: sat.id,
      name: sat.name,
      category: sat.category || "Active",
      orbitClass: sat.orbitClass || "LEO",
      azimuthDeg,
      elevationDeg,
      rangeKm,
      satAltitudeKm,
      speedKms,
      inclinationDeg,
      visualMagnitude,
      isAboveHorizon,
      hasUpcomingPassIn24h,
      passStatus,
      vec3,
      coordsEq,
      trajectoryPoints: fullTrajectoryPoints,
      pastTrajectoryPoints,
      futureTrajectoryPoints,
      passDetails,
      passGraphPoints,
      viewingRequirements,
      maxPassElevationDeg: Number(peakPassElevationDeg.toFixed(1)),
      nextPassTimeMs,

      // PHYSICS-DRIVEN OPTICAL & ILLUMINATION FIELDS
      isSunlit,
      sunElevationDeg,
      isObserverDark,
      isNakedEyeVisible,
      solarPhaseAngleDeg,
    };
  } catch {
    return null;
  }
}

// Parse raw TLE text files (from CelesTrak NORAD API) into SatelliteData objects
export function parseTleText(text: string, defaultCategory: string = "Active"): SatelliteData[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const list: SatelliteData[] = [];
  const seenIds = new Set<number>();

  let i = 0;
  while (i < lines.length) {
    let name = "SATELLITE";
    let line1 = "";
    let line2 = "";

    if (lines[i].startsWith("1 ") && i + 1 < lines.length && lines[i + 1].startsWith("2 ")) {
      line1 = lines[i];
      line2 = lines[i + 1];
      i += 2;
    } else if (i + 2 < lines.length && lines[i + 1].startsWith("1 ") && lines[i + 2].startsWith("2 ")) {
      name = lines[i];
      line1 = lines[i + 1];
      line2 = lines[i + 2];
      i += 3;
    } else {
      i++;
      continue;
    }

    try {
      const id = parseInt(line1.substring(2, 7).trim(), 10);
      if (isNaN(id) || seenIds.has(id)) continue;
      seenIds.add(id);

      if (name === "SATELLITE") {
        name = `SAT-${id}`;
      }

      let category = defaultCategory;
      const upperName = name.toUpperCase();
      if (upperName.includes("ISS") || upperName.includes("TIANGONG") || upperName.includes("CSS")) {
        category = "Space Station";
      } else if (upperName.includes("HUBBLE") || upperName.includes("HST") || upperName.includes("FERMI") || upperName.includes("SWIFT") || upperName.includes("JAMES WEBB") || upperName.includes("JWST")) {
        category = "Science";
      } else if (upperName.includes("NOAA") || upperName.includes("GOES") || upperName.includes("METEOSAT") || upperName.includes("TERRA") || upperName.includes("AQUA") || upperName.includes("LANDSAT")) {
        category = "Weather";
      } else if (upperName.includes("GPS") || upperName.includes("GALILEO") || upperName.includes("BEIDOU") || upperName.includes("GLONASS")) {
        category = "GPS";
      }

      const meanMotion = parseFloat(line2.substring(52, 63).trim());
      let orbitClass: "LEO" | "MEO" | "GEO" | "HEO" = "LEO";
      if (meanMotion > 11) orbitClass = "LEO";
      else if (meanMotion > 3) orbitClass = "MEO";
      else if (meanMotion >= 0.9 && meanMotion <= 1.2) orbitClass = "GEO";
      else orbitClass = "HEO";

      list.push({
        id,
        name,
        line1,
        line2,
        category,
        orbitClass,
        epochDate: new Date().toISOString(),
      });
    } catch {
      // Ignore malformed TLE blocks
    }
  }

  return list;
}

export function getAllSatelliteStates(
  latDeg: number,
  lonDeg: number,
  altMeters: number,
  date: Date,
  skyRadius: number,
  selectedSatId?: number | null,
  customCatalog?: SatelliteData[]
): ComputedSatelliteSkyState[] {
  const results: ComputedSatelliteSkyState[] = [];
  const catalog = customCatalog && customCatalog.length > 0 ? customCatalog : DEFAULT_SATELLITE_CATALOG;

  let trajectoryCount = 0;
  // Compute trajectory for all visible satellites overhead (up to 30)
  const MAX_TRAJECTORIES = 30;

  for (const sat of catalog) {
    const isSelected = selectedSatId != null && sat.id === selectedSatId;

    if (isSelected) {
      const detailed = computeSatelliteState(sat, latDeg, lonDeg, altMeters, date, skyRadius, true);
      if (detailed) {
        results.push(detailed);
        trajectoryCount++;
        continue;
      }
    }

    const fastCheck = computeSatelliteState(sat, latDeg, lonDeg, altMeters, date, skyRadius, false);
    if (!fastCheck) continue;

    // For all visible satellites overhead in the dome, compute full trajectory arcs for the dome in pink
    if (fastCheck.isAboveHorizon) {
      const detailed = computeSatelliteState(sat, latDeg, lonDeg, altMeters, date, skyRadius, true);
      if (detailed) {
        results.push(detailed);
        trajectoryCount++;
        continue;
      }
    }

    results.push(fastCheck);
  }

  return results.sort((a, b) => b.elevationDeg - a.elevationDeg);
}
