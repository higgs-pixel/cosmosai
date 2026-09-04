import { create } from "zustand";
import * as satellite from "satellite.js";

export interface SatelliteData {
  id: number;
  name: string;
  line1: string;
  line2: string;
  category: string;
  orbitClass: "LEO" | "MEO" | "GEO" | "HEO";
  epochDate: string;
}

interface OrbitalState {
  // Clock state
  timeMs: number;
  isPaused: boolean;
  speed: number; // multiplier
  
  // Satellite list and filters
  satellitesList: SatelliteData[];
  selectedSatelliteId: number | null;
  selectedSatrec: satellite.SatRec | null;
  searchQuery: string;
  orbitClassFilter: "All" | "LEO" | "MEO" | "GEO" | "HEO";
  categoryFilter: "All" | "Active" | "Weather" | "GPS" | "Science" | "Debris";
  satelliteInfoCache: Record<number, any>;

  // Actions
  setTimeMs: (timeMs: number) => void;
  setIsPaused: (isPaused: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setSatellitesList: (list: SatelliteData[]) => void;
  setSelectedSatelliteId: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
  setOrbitClassFilter: (filter: "All" | "LEO" | "MEO" | "GEO" | "HEO") => void;
  setCategoryFilter: (filter: "All" | "Active" | "Weather" | "GPS" | "Science" | "Debris") => void;
  cacheSatelliteInfo: (noradId: number, info: any) => void;
  tick: (deltaMs: number) => void;
}

export const useOrbitalStore = create<OrbitalState>((set) => ({
  timeMs: Date.now(),
  isPaused: false,
  speed: 1,
  
  satellitesList: [],
  selectedSatelliteId: null,
  selectedSatrec: null,
  searchQuery: "",
  orbitClassFilter: "All",
  categoryFilter: "All",
  satelliteInfoCache: {},

  setTimeMs: (timeMs) => set({ timeMs }),
  setIsPaused: (isPaused) => set({ isPaused }),
  togglePlay: () => set((state) => ({ isPaused: !state.isPaused })),
  setSpeed: (speed) => set({ speed }),
  setSatellitesList: (satellitesList) => set({ satellitesList }),
  
  setSelectedSatelliteId: (id) => set((state) => {
    if (id === null) {
      return { selectedSatelliteId: null, selectedSatrec: null };
    }
    const sat = state.satellitesList.find((s) => s.id === id);
    if (!sat) {
      return { selectedSatelliteId: null, selectedSatrec: null };
    }
    try {
      const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
      return { selectedSatelliteId: id, selectedSatrec: satrec };
    } catch (e) {
      console.error("Failed to parse TLE for selected satellite:", e);
      return { selectedSatelliteId: null, selectedSatrec: null };
    }
  }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setOrbitClassFilter: (orbitClassFilter) => set({ orbitClassFilter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  cacheSatelliteInfo: (noradId, info) => set((state) => ({
    satelliteInfoCache: { ...state.satelliteInfoCache, [noradId]: info }
  })),

  tick: (deltaMs) => set((state) => {
    if (state.isPaused) return {};
    return { timeMs: state.timeMs + deltaMs * state.speed };
  }),
}));
