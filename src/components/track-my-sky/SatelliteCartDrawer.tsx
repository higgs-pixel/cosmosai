"use client";

import { useMemo } from "react";
import {
  X,
  ShoppingCart,
  Trash2,
  Crosshair,
  ExternalLink,
  Radio,
  Clock,
  Compass,
  ArrowUpRight,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { SatelliteData } from "@/components/intelligence/store";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";
import { evaluateSatelliteVisibility } from "@/lib/orbit/visibility";

interface SatelliteCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: SatelliteData[];
  onRemoveItem: (satId: number) => void;
  onClearCart: () => void;
  onSelectSat: (satId: number) => void;
  selectedSatId: number | null;
  observer: ObserverCoords;
  timeMs: number;
}

export function SatelliteCartDrawer({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onClearCart,
  onSelectSat,
  selectedSatId,
  observer,
  timeMs,
}: SatelliteCartDrawerProps) {
  const currentDate = useMemo(() => new Date(timeMs), [timeMs]);

  // Compute live telemetry for each cart item
  const evaluatedCartItems = useMemo(() => {
    return cartItems.map((sat) => {
      try {
        const vis = evaluateSatelliteVisibility(sat, observer, currentDate);
        return { sat, vis };
      } catch {
        return { sat, vis: null };
      }
    });
  }, [cartItems, observer, currentDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside className="relative z-10 w-full max-w-lg sm:max-w-xl h-full bg-black/95 border-l border-zinc-800 shadow-2xl flex flex-col font-sans text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Orbital Watchlist Cart
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30 rounded">
                  {cartItems.length} {cartItems.length === 1 ? "ASSET" : "ASSETS"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Continuous live telemetry persists across 5-minute session rotations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                onClick={onClearCart}
                className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 hover:text-red-400 transition-colors uppercase tracking-wider flex items-center gap-1 border border-zinc-800 hover:border-red-900/60 rounded bg-zinc-950"
                title="Remove all items from watchlist"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded border border-zinc-800 hover:border-zinc-600 bg-zinc-950"
              title="Close cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Session Notice */}
        <div className="px-6 py-2.5 bg-cyan-950/20 border-b border-cyan-900/30 flex items-center gap-2 text-[11px] text-cyan-300">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
          <span>
            Telemetry Engine Active: Pinned assets update live at 60 FPS regardless of active catalogue batch.
          </span>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {evaluatedCartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-900/60 flex items-center justify-center text-zinc-500">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-semibold uppercase text-zinc-300 tracking-wider">
                  Your Watchlist Cart is Empty
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Add satellites to this cart from the Fleet Telemetry Directory or via CelesTrak search to continuously monitor their coordinates, elevation, and passes even when sessions rotate.
                </p>
              </div>
            </div>
          ) : (
            evaluatedCartItems.map(({ sat, vis }) => {
              const isSelected = selectedSatId === sat.id;
              const isOverhead = vis ? vis.isAboveHorizon : false;
              const elDeg = vis ? Math.round(vis.elevationDeg * 10) / 10 : null;
              const azDeg = vis ? Math.round(vis.azimuthDeg * 10) / 10 : null;
              const slantKm = vis ? vis.slantRangeKm : null;
              const mag = vis ? vis.estimatedMagnitude : null;
              const subLat = vis ? vis.satLat.toFixed(2) : "--";
              const subLon = vis ? vis.satLon.toFixed(2) : "--";
              const altKm = vis ? Math.round(vis.satAltKm) : "--";
              const speedKmH = vis ? Math.round(Math.sqrt(398600.4418 / (6371 + (vis.satAltKm || 400))) * 3600) : "--";

              return (
                <div
                  key={`cart-item-${sat.id}`}
                  className={`p-4 rounded-lg border transition-all ${
                    isSelected
                      ? "border-cyan-500/80 bg-cyan-950/20 shadow-[0_0_20px_rgba(0,229,255,0.15)]"
                      : "border-zinc-800/80 bg-zinc-950/90 hover:border-zinc-700"
                  }`}
                >
                  {/* Top row: Name, NORAD, and Remove */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-900">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white tracking-wide truncate">
                          {sat.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded">
                          NORAD {sat.id}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-zinc-900/60 text-cyan-300 border border-cyan-800/30 rounded">
                          {sat.category || "Active"}
                        </span>
                      </div>

                      {/* Optical / Horizon Badge */}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                        {vis ? (
                          vis.isNakedEyeVisible ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Naked-Eye Visible ({mag ? `${mag > 0 ? "+" : ""}${mag} mᵥ` : ""})
                            </span>
                          ) : vis.isSunlit ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Sunlit Illuminated
                            </span>
                          ) : isOverhead ? (
                            <span className="inline-flex items-center gap-1 text-zinc-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              In Earth Umbra (Dark)
                            </span>
                          ) : (
                            <span className="text-zinc-500">
                              Below Horizon ({elDeg}° el)
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-500">Calculating Topocentrics…</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onSelectSat(sat.id);
                          const el = document.getElementById("hero");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded border transition-colors flex items-center gap-1 ${
                          isSelected
                            ? "bg-cyan-400 text-black border-cyan-400 font-bold"
                            : "bg-zinc-900 text-zinc-300 hover:text-white border-zinc-800 hover:border-cyan-500/50"
                        }`}
                        title="Aim 3D Globe reticle at this satellite"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>{isSelected ? "Tracking" : "Track"}</span>
                      </button>

                      <button
                        onClick={() => onRemoveItem(sat.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded border border-zinc-850 hover:border-red-900/60 bg-zinc-900"
                        title="Remove from Cart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-3 text-[11px] font-mono">
                    <div className="p-2 rounded bg-black/60 border border-zinc-900">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Elevation</div>
                      <div className={`font-bold ${vis && isOverhead ? "text-emerald-400" : "text-zinc-400"}`}>
                        {elDeg !== null ? `${elDeg}°` : "--"}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/60 border border-zinc-900">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Azimuth</div>
                      <div className="text-zinc-300 font-bold">
                        {azDeg !== null ? `${azDeg}°` : "--"}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/60 border border-zinc-900">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Slant Range</div>
                      <div className="text-cyan-300 font-bold truncate">
                        {slantKm ? `${slantKm.toLocaleString()} km` : "--"}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/60 border border-zinc-900 hidden sm:block">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Altitude</div>
                      <div className="text-zinc-300 font-bold truncate">
                        {typeof altKm === "number" ? `${altKm} km` : altKm}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/60 border border-zinc-900 col-span-2">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Sub-Satellite Lat / Lon</div>
                      <div className="text-zinc-300 font-bold truncate">
                        {subLat}°, {subLon}°
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/60 border border-zinc-900 col-span-1 sm:col-span-2">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Orbital Speed</div>
                      <div className="text-zinc-300 font-bold truncate">
                        {typeof speedKmH === "number" ? `${speedKmH.toLocaleString()} km/h` : speedKmH}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 text-[11px] text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Observer Site: {observer.name}</span>
          </div>
          <span className="font-mono text-zinc-500">
            {cartItems.length} active monitors
          </span>
        </div>
      </aside>
    </div>
  );
}
