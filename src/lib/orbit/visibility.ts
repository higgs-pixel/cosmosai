import * as SunCalc from "suncalc";
import * as satellite from "satellite.js";

export type TwilightPhase = "Daylight" | "Civil Twilight" | "Nautical Twilight" | "Astronomical Twilight / Deep Night";

export interface ObserverTwilightInfo {
  sunAltitudeDeg: number;
  sunAzimuthDeg: number;
  phase: TwilightPhase;
  isDarkEnough: boolean; // Sun alt < -6°
  details: string;
}

export interface SatelliteVisibilityResult {
  satId: number;
  satName: string;
  category: string;
  orbitClass: string;
  line1: string;
  line2: string;
  
  // Observer-Relative Coordinates
  azimuthDeg: number; // 0° = North, 90° = East, 180° = South, 270° = West
  elevationDeg: number; // 0° = Horizon, 90° = Zenith
  slantRangeKm: number; // Distance from observer in km
  
  // Real 3D ECI/Geodetic Position
  satLat: number;
  satLon: number;
  satAltKm: number;

  // Real 3-Condition Astronomical Visibility
  isAboveHorizon: boolean; // Elevation > 0°
  isObservable: boolean; // Elevation > 10°
  isSunlit: boolean; // Not in Earth's umbral shadow
  isObserverDark: boolean; // Observer Sun alt < -6°
  isNakedEyeVisible: boolean; // Elevation > 10° AND isSunlit AND isObserverDark

  // Photometric & Pass Data
  estimatedMagnitude: number; // e.g. -1.8, +2.4
  phaseAngleDeg: number; // Sun-Sat-Observer angle
  statusLabel: "Naked-Eye Visible" | "Sunlit (Daylight/Low Alt)" | "Eclipsed in Earth Shadow" | "Below Horizon";
}

// 1. Observer Twilight Classifier
export function getObserverTwilight(date: Date, lat: number, lon: number): ObserverTwilightInfo {
  let sunAltDeg = 0;
  let sunAzDeg = 0;

  try {
    const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
    const getPos = SunCalc.getPosition || (SunCalc as any).default?.getPosition;
    const sunPos = typeof getPos === "function" ? getPos(d, lat, lon) : null;

    if (sunPos && typeof sunPos.altitude === "number" && !isNaN(sunPos.altitude)) {
      const rawAlt = (sunPos.altitude * 180) / Math.PI;
      sunAltDeg = Math.max(-90, Math.min(90, rawAlt));
      sunAzDeg = (((sunPos.azimuth * 180) / Math.PI + 180) % 360 + 360) % 360;
    }
  } catch {
    sunAltDeg = 15; // default daylight fallback
  }


  let phase: TwilightPhase = "Daylight";
  let isDarkEnough = false;
  let details = "Sun above horizon. Sky too bright for naked-eye satellite passes.";

  if (sunAltDeg <= -18) {
    phase = "Astronomical Twilight / Deep Night";
    isDarkEnough = true;
    details = "Deep astronomical darkness. Optimal stargazing conditions.";
  } else if (sunAltDeg <= -12) {
    phase = "Nautical Twilight";
    isDarkEnough = true;
    details = "Nautical twilight. Excellent contrast for satellite tracking.";
  } else if (sunAltDeg <= -6) {
    phase = "Civil Twilight";
    isDarkEnough = true;
    details = "Civil twilight. Brightest satellites (ISS, Tiangong) visible.";
  }

  return {
    sunAltitudeDeg: parseFloat(sunAltDeg.toFixed(2)),
    sunAzimuthDeg: parseFloat(sunAzDeg.toFixed(2)),
    phase,
    isDarkEnough,
    details,
  };
}

// 2. Earth Umbral Shadow Test (Conical / Cylindrical Model)
export function checkSatelliteIllumination(satEci: satellite.EciVec3<number>, date: Date): { isSunlit: boolean; shadowDistKm: number } {
  // Compute solar unit vector ECI at Date
  const yearDay = Math.floor((date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / (24 * 3600 * 1000));
  const meanAnomalySun = ((357.529 + 0.98560028 * yearDay) * Math.PI) / 180;
  const sunLon = ((280.459 + 0.98564736 * yearDay + 1.915 * Math.sin(meanAnomalySun)) * Math.PI) / 180;
  const obliq = (23.439 * Math.PI) / 180;

  const sunX = Math.cos(sunLon);
  const sunY = Math.cos(obliq) * Math.sin(sunLon);
  const sunZ = Math.sin(obliq) * Math.sin(sunLon);

  // Projection of satellite position vector onto anti-solar direction (-sunVector)
  const dotSun = satEci.x * sunX + satEci.y * sunY + satEci.z * sunZ;

  // If dotSun > 0, satellite is on day-side of Earth (Sunlit)
  if (dotSun > 0) {
    return { isSunlit: true, shadowDistKm: 99999 };
  }

  // Satellite is behind Earth (night-side). Calculate perpendicular distance to anti-solar axis.
  const satDistSq = satEci.x * satEci.x + satEci.y * satEci.y + satEci.z * satEci.z;
  const perpDistSq = satDistSq - dotSun * dotSun;
  const perpDist = Math.sqrt(Math.max(0, perpDistSq));

  const R_EARTH = 6371.0; // Earth mean radius in km
  const isSunlit = perpDist > R_EARTH;

  return {
    isSunlit,
    shadowDistKm: parseFloat(perpDist.toFixed(1)),
  };
}

// 3. Visual Magnitude Estimation (Photometric Falloff + Phase Angle)
export function estimateVisualMagnitude(satName: string, category: string, slantRangeKm: number, phaseAngleRad: number): number {
  const n = satName.toUpperCase();
  let m0 = 3.5; // default intrinsic magnitude

  if (n.includes("ISS") || n.includes("ZARYA")) m0 = -2.2;
  else if (n.includes("TIANGONG") || n.includes("CSS")) m0 = -1.2;
  else if (n.includes("HUBBLE") || n.includes("HST")) m0 = +1.5;
  else if (n.includes("STARLINK")) m0 = +4.8;
  else if (n.includes("ENVISAT")) m0 = +2.1;
  else if (n.includes("NOAA") || n.includes("GOES")) m0 = +3.2;
  else if (category.toLowerCase().includes("station")) m0 = -0.5;
  else if (category.toLowerCase().includes("debris")) m0 = +5.2;

  // Inverse-square distance term (standardized to 1000km reference)
  const distTerm = 5 * Math.log10(Math.max(200, slantRangeKm) / 1000);

  // Lambertian phase law
  const safePhase = Math.max(0, Math.min(Math.PI, phaseAngleRad));
  const phaseFunc = (Math.sin(safePhase) + (Math.PI - safePhase) * Math.cos(safePhase)) / Math.PI;
  const phaseTerm = -2.5 * Math.log10(Math.max(0.01, phaseFunc));

  const mVis = m0 + distTerm + phaseTerm;
  return parseFloat(Math.min(9.0, Math.max(-4.0, mVis)).toFixed(1));
}

// 4. Evaluate Satellite 3-Condition Visibility Test
export function evaluateSatelliteVisibility(
  satData: { id: number; name: string; line1: string; line2: string; category?: string; orbitClass?: string },
  observer: { lat: number; lon: number; altMeters: number },
  date: Date
): SatelliteVisibilityResult | null {
  if (!satData.line1 || !satData.line2) return null;

  try {
    const satrec = satellite.twoline2satrec(satData.line1, satData.line2);
    const posVel = satellite.propagate(satrec, date);

    if (!posVel || !posVel.position || typeof posVel.position !== "object" || isNaN((posVel.position as satellite.EciVec3<number>).x)) {
      return null;
    }

    const posEci = posVel.position as satellite.EciVec3<number>;
    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(posEci, gmst);

    const satLat = satellite.degreesLat(geodetic.latitude);
    const satLon = satellite.degreesLong(geodetic.longitude);
    const satAltKm = geodetic.height;

    // Convert observer to ECF & compute topocentric look angles
    const obsGd = {
      latitude: satellite.degreesToRadians(observer.lat),
      longitude: satellite.degreesToRadians(observer.lon),
      height: (observer.altMeters || 180) / 1000,
    };

    const posEcf = satellite.eciToEcf(posEci, gmst);
    const lookAngles = satellite.ecfToLookAngles(obsGd, posEcf);

    const azimuthDeg = (satellite.radiansToDegrees(lookAngles.azimuth) + 360) % 360;
    const elevationDeg = satellite.radiansToDegrees(lookAngles.elevation);
    const slantRangeKm = lookAngles.rangeSat;

    // 1. Check Horizon Cutoff
    const isAboveHorizon = elevationDeg > 0;
    const isObservable = elevationDeg > 10;

    // 2. Check Satellite Sun Illumination (Umbra Test)
    const shadowRes = checkSatelliteIllumination(posEci, date);
    const isSunlit = shadowRes.isSunlit;

    // 3. Check Observer Sky Darkness / Twilight
    const twilight = getObserverTwilight(date, observer.lat, observer.lon);
    const isObserverDark = twilight.isDarkEnough;

    // 4. Naked-Eye Visibility (All 3 Conditions MUST hold)
    const isNakedEyeVisible = isObservable && isSunlit && isObserverDark;

    // Phase Angle & Magnitude Estimation
    const phaseAngleRad = Math.acos(Math.max(-1, Math.min(1, lookAngles.rangeSat / (satAltKm + 6371))));
    const estimatedMagnitude = estimateVisualMagnitude(satData.name, satData.category || "Active", slantRangeKm, phaseAngleRad);

    let statusLabel: SatelliteVisibilityResult["statusLabel"] = "Below Horizon";
    if (isNakedEyeVisible) statusLabel = "Naked-Eye Visible";
    else if (isAboveHorizon && isSunlit) statusLabel = "Sunlit (Daylight/Low Alt)";
    else if (isAboveHorizon && !isSunlit) statusLabel = "Eclipsed in Earth Shadow";

    let computedOrbitClass = satData.orbitClass;
    if (!computedOrbitClass || computedOrbitClass === "LEO") {
      if (satAltKm > 35000) computedOrbitClass = "GEO";
      else if (satAltKm > 2000) computedOrbitClass = "MEO";
      else computedOrbitClass = "LEO";
    }

    return {
      satId: satData.id,
      satName: satData.name,
      category: satData.category || "Active",
      orbitClass: computedOrbitClass,
      line1: satData.line1,
      line2: satData.line2,
      azimuthDeg: parseFloat(azimuthDeg.toFixed(1)),
      elevationDeg: parseFloat(elevationDeg.toFixed(1)),
      slantRangeKm: parseFloat(slantRangeKm.toFixed(1)),
      satLat: parseFloat(satLat.toFixed(4)),
      satLon: parseFloat(satLon.toFixed(4)),
      satAltKm: parseFloat(satAltKm.toFixed(1)),
      isAboveHorizon,
      isObservable,
      isSunlit,
      isObserverDark,
      isNakedEyeVisible,
      estimatedMagnitude,
      phaseAngleDeg: parseFloat(((phaseAngleRad * 180) / Math.PI).toFixed(1)),
      statusLabel,
    };
  } catch {
    return null;
  }
}
