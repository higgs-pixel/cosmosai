"use client";

import { memo, useState, useMemo } from "react";
import { Search, Crosshair, Sparkles, Sun, Moon } from "lucide-react";
import { SatelliteVisibilityResult } from "@/lib/orbit/visibility";

interface SatelliteCatalogSectionProps {
  visibleSats: SatelliteVisibilityResult[];
  selectedSatId: number | null;
  onSelectSat: (id: number) => void;
}

export const SatelliteCatalogSection = memo(function SatelliteCatalogSection({
  visibleSats,
  selectedSatId,
  onSelectSat,
}: SatelliteCatalogSectionProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "visible" | "sunlit">("all");

  const filtered = useMemo(() => {
    return visibleSats.filter((sat) => {
      if (filter === "visible" && !sat.isNakedEyeVisible) return false;
      if (filter === "sunlit" && !sat.isSunlit) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return sat.satName.toLowerCase().includes(q) || String(sat.satId).includes(q);
    });
  }, [visibleSats, filter, search]);

  const nakedEyeCount = useMemo(() => visibleSats.filter((s) => s.isNakedEyeVisible).length, [visibleSats]);
  const sunlitCount = useMemo(() => visibleSats.filter((s) => s.isSunlit).length, [visibleSats]);

  return (
    <section
      id="satellite-catalog"
      className="relative w-full py-20 px-4 sm:px-8 md:px-12 lg:px-16 bg-black select-none border-t border-white/[0.08]"
    >
      <div className="max-w-[1720px] mx-auto space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/10">
          <div className="space-y-2">
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-cyan-400 uppercase font-semibold">
              07 // ORBITAL EPHEMERIS
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extralight text-white uppercase tracking-tight">
              SATELLITE CATALOG
            </h2>
            <p className="text-xs sm:text-sm font-light text-slate-400 tracking-wide italic">
              "Objects currently above the observer horizon."
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Minimal Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="SEARCH NORAD / NAME…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 sm:w-64 pl-9 pr-3 text-xs font-mono bg-black border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center border border-white/20 bg-white/[0.02] p-1 font-mono text-xs">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 uppercase transition cursor-pointer ${
                  filter === "all" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                ALL ({visibleSats.length})
              </button>
              <button
                onClick={() => setFilter("visible")}
                className={`px-3 py-1 uppercase transition cursor-pointer ${
                  filter === "visible" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                NAKED-EYE ({nakedEyeCount})
              </button>
              <button
                onClick={() => setFilter("sunlit")}
                className={`px-3 py-1 uppercase transition cursor-pointer ${
                  filter === "sunlit" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                SUNLIT ({sunlitCount})
              </button>
            </div>
          </div>
        </div>

        {/* Minimalist Scientific Data Table */}
        <div className="overflow-x-auto border border-white/10 bg-black">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4">SATELLITE</th>
                <th className="p-4">NORAD ID</th>
                <th className="p-4">OPTICAL STATUS</th>
                <th className="p-4">ALTITUDE</th>
                <th className="p-4">ELEVATION</th>
                <th className="p-4">AZIMUTH</th>
                <th className="p-4">SLANT RANGE</th>
                <th className="p-4">ILLUMINATION</th>
                <th className="p-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((sat) => {
                const isSelected = selectedSatId === sat.satId;
                return (
                  <tr
                    key={`cat-${sat.satId}`}
                    onClick={() => onSelectSat(sat.satId)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-white/[0.08] text-white"
                        : "hover:bg-white/[0.03] text-slate-300"
                    }`}
                  >
                    <td className="p-4 font-light text-white flex items-center gap-2.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          sat.isNakedEyeVisible
                            ? "bg-emerald-400"
                            : sat.isSunlit
                            ? "bg-amber-400"
                            : "bg-slate-500"
                        }`}
                      />
                      <span className="truncate max-w-[200px] sm:max-w-none tracking-wide">
                        {sat.satName}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{sat.satId}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 text-[9px] tracking-wider uppercase border ${
                          sat.isNakedEyeVisible
                            ? "border-emerald-500/40 text-emerald-400"
                            : sat.isSunlit
                            ? "border-amber-500/40 text-amber-400"
                            : "border-white/10 text-slate-400"
                        }`}
                      >
                        {sat.statusLabel}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{sat.satAltKm} KM</td>
                    <td className="p-4 font-bold text-white">{sat.elevationDeg}°</td>
                    <td className="p-4 text-slate-300">{sat.azimuthDeg}°</td>
                    <td className="p-4 text-cyan-400">{sat.slantRangeKm} KM</td>
                    <td className="p-4 text-slate-400">
                      {sat.isSunlit ? "Sunlit" : "Umbral Shadow"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSat(sat.satId);
                        }}
                        className={`px-3 py-1 text-[10px] font-mono tracking-widest uppercase transition ${
                          isSelected
                            ? "bg-white text-black font-bold"
                            : "border border-white/20 hover:border-white text-slate-300"
                        }`}
                      >
                        {isSelected ? "LOCKED" : "TRACK"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
});

export default SatelliteCatalogSection;
