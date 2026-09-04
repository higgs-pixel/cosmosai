export type EarthDashboardData = {
  date: string;
  generatedAt: string;
  apod: {
    title: string;
    date: string;
    sourceUrl: string;
    isFallback?: boolean;
  };
  asteroids: {
    total: number;
    hazardous: number;
    closestName: string;
    closestMissKm: number | null;
    isFallback?: boolean;
  };
  spaceWeather: {
    flares: number;
    cmes: number;
    storms: number;
    latestKp?: number;
    kpObservedAt?: string;
    isFallback?: boolean;
  };
  iss: {
    latitude: number | null;
    longitude: number | null;
    altitudeKm: number | null;
    velocityKmh: number | null;
    timestamp?: string;
    isFallback?: boolean;
  };
  weather: {
    locationName: string;
    temperatureC: number | null;
    cloudCoverPct: number | null;
    humidityPct: number | null;
    windSpeedKmh: number | null;
    observedAt?: string;
    timezone?: string;
    isFallback?: boolean;
  };
  rotation: {
    siderealDay: string;
    currentUtc: string;
    progressPct: number;
  };
  mars: {
    rover: string;
    status: string;
    latestSol?: number;
    latestEarthDate?: string;
    totalPhotos?: number;
    isFallback?: boolean;
  };
};
