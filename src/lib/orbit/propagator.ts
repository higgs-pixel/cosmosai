export interface gpElements {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  NORAD_CAT_ID: number;
  BSTAR?: number;
  MEAN_MOTION_DOT?: number;
}

export interface OrbitState {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  semiMajorAxisKm: number;
  apogeeKm: number;
  perigeeKm: number;
  periodMin: number;
  inclinationDeg: number;
  eccentricity: number;
}

/**
 * Propagates satellite position to a given UTC timestamp using Keplerian model
 * with J2 perturbations to account for nodal precession and argument of perigee rotation.
 */
export function propagateKeplerian(gp: gpElements, targetTimeMs: number): OrbitState {
  const MU = 398600.4418; // Earth's standard gravitational parameter (km^3/s^2)
  const EARTH_RADIUS = 6378.137; // Earth's equatorial radius (km)
  const J2 = 0.00108263; // J2 perturbation coefficient

  // Parse TLE fields
  const epoch = new Date(gp.EPOCH + "Z").getTime();
  const n_mean = (gp.MEAN_MOTION * 2 * Math.PI) / 86400; // mean motion in rad/s
  const e = gp.ECCENTRICITY;
  const i = (gp.INCLINATION * Math.PI) / 180; // inclination in rad
  const RAAN = (gp.RA_OF_ASC_NODE * Math.PI) / 180; // RAAN in rad
  const omega = (gp.ARG_OF_PERICENTER * Math.PI) / 180; // argument of perigee in rad
  const M0 = (gp.MEAN_ANOMALY * Math.PI) / 180; // mean anomaly in rad

  // Semi-major axis (a = (mu / n^2)^(1/3))
  const a = Math.pow(MU / (n_mean * n_mean), 1 / 3);

  // Time difference in seconds from epoch
  const dt = (targetTimeMs - epoch) / 1000;

  // J2 secular perturbations
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const oneMinusESq = 1 - e * e;
  const j2Factor = 1.5 * J2 * Math.pow(EARTH_RADIUS / a, 2) / Math.pow(oneMinusESq, 2);

  // Rate of RAAN precession (rad/s)
  const dRaan_dt = -n_mean * j2Factor * cosI;
  // Rate of Argument of Perigee rotation (rad/s)
  const dOmega_dt = n_mean * j2Factor * (2 - 2.5 * sinI * sinI);
  // Mean anomaly rate correction (rad/s)
  const dM_dt = n_mean * (1 + j2Factor * Math.sqrt(oneMinusESq) * (1 - 1.5 * sinI * sinI));

  // Propagated angles
  const RAAN_t = RAAN + dRaan_dt * dt;
  const omega_t = omega + dOmega_dt * dt;
  const M_t = (M0 + dM_dt * dt) % (2 * Math.PI);

  // Solve Kepler's Equation: E - e * sin(E) = M
  let E = M_t;
  for (let iter = 0; iter < 12; iter++) {
    E = E - (E - e * Math.sin(E) - M_t) / (1 - e * Math.cos(E));
  }

  // True Anomaly
  const nu = Math.atan2(
    Math.sqrt(1 - e * e) * Math.sin(E),
    Math.cos(E) - e
  );

  // Radial distance from Earth's center (km)
  const r = a * (1 - e * Math.cos(E));

  // Position in orbital plane
  const x_orb = r * Math.cos(nu);
  const y_orb = r * Math.sin(nu);

  // Rotate to ECI (Earth-Centered Inertial) frame
  const cosOmega = Math.cos(RAAN_t);
  const sinOmega = Math.sin(RAAN_t);
  const cosOmega_t = Math.cos(omega_t);
  const sinOmega_t = Math.sin(omega_t);

  const x_eci = x_orb * (cosOmega_t * cosOmega - sinOmega_t * sinOmega * cosI) -
                y_orb * (sinOmega_t * cosOmega + cosOmega_t * sinOmega * cosI);

  const y_eci = x_orb * (cosOmega_t * sinOmega + sinOmega_t * cosOmega * cosI) -
                y_orb * (sinOmega_t * sinOmega - cosOmega_t * cosOmega * cosI);

  const z_eci = x_orb * (sinOmega_t * Math.sin(i)) + y_orb * (cosOmega_t * Math.sin(i));

  // Greenwich Mean Sidereal Time (GMST) for rotating ECI to ECEF (Earth-Centered, Earth-Fixed)
  // J2000 epoch reference
  const J2000 = new Date("2000-01-01T12:00:00Z").getTime();
  const daysSinceJ2000 = (targetTimeMs - J2000) / 86400000;

  // Approximate Greenwich Sidereal Time (in degrees)
  let gmst = (280.46061837 + 360.98564736629 * daysSinceJ2000) % 360;
  if (gmst < 0) gmst += 360;
  const theta = (gmst * Math.PI) / 180;

  // ECI to ECEF rotation
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const x_ecef = x_eci * cosTheta + y_eci * sinTheta;
  const y_ecef = -x_eci * sinTheta + y_eci * cosTheta;
  const z_ecef = z_eci;

  // Latitude and Longitude calculation
  const longitudeRad = Math.atan2(y_ecef, x_ecef);
  const latitudeRad = Math.asin(z_ecef / r);

  // Convert to degrees
  const latitude = (latitudeRad * 180) / Math.PI;
  let longitude = (longitudeRad * 180) / Math.PI;

  // Normalize longitude to [-180, 180]
  if (longitude > 180) longitude -= 360;
  if (longitude < -180) longitude += 360;

  // Altitude above Earth surface (km)
  const altitudeKm = r - EARTH_RADIUS;

  // Velocity (km/s) from vis-viva equation: v = sqrt(mu * (2/r - 1/a))
  const v = Math.sqrt(MU * (2 / r - 1 / a));
  const velocityKmh = v * 3600;

  return {
    latitude,
    longitude,
    altitudeKm,
    velocityKmh,
    semiMajorAxisKm: a,
    apogeeKm: a * (1 + e) - EARTH_RADIUS,
    perigeeKm: a * (1 - e) - EARTH_RADIUS,
    periodMin: 1440 / gp.MEAN_MOTION,
    inclinationDeg: gp.INCLINATION,
    eccentricity: e,
  };
}

/**
 * Generates an array of Geodetic coordinates representing the orbital path (ground track)
 * for a satellite over a full orbital period centered around the current time.
 */
export function getOrbitGroundTrack(gp: gpElements, baseTimeMs: number, pointsCount = 100): Array<{ lat: number; lng: number; time: number }> {
  const periodMin = 1440 / gp.MEAN_MOTION;
  const periodMs = periodMin * 60 * 1000;
  const startTime = baseTimeMs - periodMs / 2;
  const step = periodMs / pointsCount;
  
  const points: Array<{ lat: number; lng: number; time: number }> = [];

  for (let idx = 0; idx <= pointsCount; idx++) {
    const t = startTime + idx * step;
    const state = propagateKeplerian(gp, t);
    points.push({
      lat: state.latitude,
      lng: state.longitude,
      time: t,
    });
  }

  return points;
}
