import * as Astronomy from "astronomy-engine";

export interface PlanetState {
  name: string;
  id: string;
  // Heliocentric coordinates in AU
  x: number;
  y: number;
  z: number;
  // Distances in AU
  distanceSun: number;
  distanceEarth: number;
  // Geocentric equatorial coordinates (RA / Dec)
  raHours: number;
  decDeg: number;
  // Velocity in km/s
  speedKms: number;
  // Orbital period in Earth days
  periodDays: number;
  nextPerihelion?: string;
  nextAphelion?: string;
}

const BODIES = [
  { id: "Mercury", name: "Mercury", engineBody: Astronomy.Body.Mercury },
  { id: "Venus", name: "Venus", engineBody: Astronomy.Body.Venus },
  { id: "Earth", name: "Earth", engineBody: Astronomy.Body.Earth },
  { id: "Mars", name: "Mars", engineBody: Astronomy.Body.Mars },
  { id: "Jupiter", name: "Jupiter", engineBody: Astronomy.Body.Jupiter },
  { id: "Saturn", name: "Saturn", engineBody: Astronomy.Body.Saturn },
  { id: "Uranus", name: "Uranus", engineBody: Astronomy.Body.Uranus },
  { id: "Neptune", name: "Neptune", engineBody: Astronomy.Body.Neptune },
  { id: "Pluto", name: "Pluto", engineBody: Astronomy.Body.Pluto },
];

const AU_TO_KM = 149597870.7;
const DAY_TO_SEC = 86400;
const VELOCITY_FACTOR = AU_TO_KM / DAY_TO_SEC; // Convert AU/day to km/s (~1731.4568)

/**
 * Calculates planetary coordinates, distances, apparent coordinates,
 * and orbital speeds for all bodies at a given date.
 */
export function getSolarSystemState(date: Date): Record<string, PlanetState> {
  const time = new Astronomy.AstroTime(date);
  const stateMap: Record<string, PlanetState> = {};

  // 1. Earth's Heliocentric vector (used to calculate Geocentric vectors if needed)
  const earthHelio = Astronomy.HelioVector(Astronomy.Body.Earth, time);

  // 2. Add Sun (at the center of heliocentric view)
  const sunGeo = Astronomy.GeoVector(Astronomy.Body.Sun, time, false);
  const sunEquator = Astronomy.EquatorFromVector(sunGeo);
  
  stateMap["Sun"] = {
    name: "Sun",
    id: "Sun",
    x: 0,
    y: 0,
    z: 0,
    distanceSun: 0,
    distanceEarth: sunEquator.dist,
    raHours: sunEquator.ra,
    decDeg: sunEquator.dec,
    speedKms: 0,
    periodDays: 0,
  };

  // 3. Add Planets
  for (const bodyConf of BODIES) {
    try {
      const helio = Astronomy.HelioVector(bodyConf.engineBody, time);
      
      let distanceEarth = 0;
      let raHours = 0;
      let decDeg = 0;

      if (bodyConf.id !== "Earth") {
        const geo = Astronomy.GeoVector(bodyConf.engineBody, time, false);
        const equator = Astronomy.EquatorFromVector(geo);
        distanceEarth = equator.dist;
        raHours = equator.ra;
        decDeg = equator.dec;
      }
      
      // Calculate orbital velocity
      let speedKms = 0;
      try {
        const helioState = Astronomy.HelioState(bodyConf.engineBody, time);
        const vx = helioState.vx * VELOCITY_FACTOR;
        const vy = helioState.vy * VELOCITY_FACTOR;
        const vz = helioState.vz * VELOCITY_FACTOR;
        speedKms = Math.sqrt(vx * vx + vy * vy + vz * vz);
      } catch {
        // Fallback average speed if HelioState is unsupported
        speedKms = 0;
      }

      // Orbital Period
      let periodDays = 0;
      try {
        periodDays = Astronomy.PlanetOrbitalPeriod(bodyConf.engineBody);
      } catch {
        periodDays = 0;
      }

      // Next Aphelion / Perihelion
      let nextPerihelion: string | undefined;
      let nextAphelion: string | undefined;

      try {
        const firstApsis = Astronomy.SearchPlanetApsis(bodyConf.engineBody, time);
        const secondApsis = Astronomy.NextPlanetApsis(bodyConf.engineBody, firstApsis);
        
        let peri = firstApsis.kind === 0 ? firstApsis : secondApsis;
        let apo = firstApsis.kind === 1 ? firstApsis : secondApsis;
        
        nextPerihelion = peri.time.date.toISOString();
        nextAphelion = apo.time.date.toISOString();
      } catch {
        // Earth/Barycenters apsis can sometimes fail depending on Astronomy Engine implementation
        nextPerihelion = undefined;
        nextAphelion = undefined;
      }

      const ecliptic = Astronomy.Ecliptic(helio);

      stateMap[bodyConf.id] = {
        name: bodyConf.name,
        id: bodyConf.id,
        x: ecliptic.vec.x,
        y: ecliptic.vec.y,
        z: ecliptic.vec.z,
        distanceSun: Astronomy.HelioDistance(bodyConf.engineBody, time),
        distanceEarth,
        raHours,
        decDeg,
        speedKms,
        periodDays,
        nextPerihelion,
        nextAphelion,
      };
    } catch (err) {
      console.warn(`[Ephemeris Error] Failed to calculate ephemeris for ${bodyConf.name}:`, err);
    }
  }

  // 4. Add Moon (orbits Earth, so we compute heliocentric position relative to Earth)
  try {
    const moonGeo = Astronomy.GeoVector(Astronomy.Body.Moon, time, false);
    const moonEquator = Astronomy.EquatorFromVector(moonGeo);
    
    // Moon's heliocentric vector = Earth's heliocentric vector + Moon's geocentric vector (convert to J2000 ecliptic)
    const moonEqX = earthHelio.x + moonGeo.x;
    const moonEqY = earthHelio.y + moonGeo.y;
    const moonEqZ = earthHelio.z + moonGeo.z;
    const moonEqVector = new Astronomy.Vector(moonEqX, moonEqY, moonEqZ, time);
    const moonEcliptic = Astronomy.Ecliptic(moonEqVector);

    // Moon's speed relative to Earth
    let speedKms = 1.022; // average speed in orbit is ~1.022 km/s
    try {
      const moonState = Astronomy.GeoMoonState(time);
      const vx = moonState.vx * VELOCITY_FACTOR;
      const vy = moonState.vy * VELOCITY_FACTOR;
      const vz = moonState.vz * VELOCITY_FACTOR;
      speedKms = Math.sqrt(vx * vx + vy * vy + vz * vz);
    } catch {
      speedKms = 1.022;
    }

    stateMap["Moon"] = {
      name: "Moon",
      id: "Moon",
      x: moonEcliptic.vec.x,
      y: moonEcliptic.vec.y,
      z: moonEcliptic.vec.z,
      distanceSun: Math.sqrt(
        moonEcliptic.vec.x * moonEcliptic.vec.x +
        moonEcliptic.vec.y * moonEcliptic.vec.y +
        moonEcliptic.vec.z * moonEcliptic.vec.z
      ),
      distanceEarth: moonEquator.dist,
      raHours: moonEquator.ra,
      decDeg: moonEquator.dec,
      speedKms,
      periodDays: 27.32166, // Lunar sidereal month
    };
  } catch (err) {
    console.warn(`[Ephemeris Error] Failed to calculate ephemeris for Moon:`, err);
  }

  return stateMap;
}
