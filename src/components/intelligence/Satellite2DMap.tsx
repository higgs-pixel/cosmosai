"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useOrbitalStore, SatelliteData } from "./store";
import * as satellite from "satellite.js";

interface Satellite2DMapProps {
  satellites: SatelliteData[];
  selectedId?: number | null;
  setSelectedId?: (id: number) => void;
  latestPositions: React.RefObject<Float32Array | null>;
  showDebug?: boolean;
  onTrackSatellite?: (id: number) => void;
}

export default function Satellite2DMap({
  satellites,
  selectedId: propSelectedId,
  setSelectedId: propSetSelectedId,
  latestPositions,
  showDebug = false,
  onTrackSatellite,
}: Satellite2DMapProps) {
  const storeSelectedId = useOrbitalStore((s) => s.selectedSatelliteId);
  const selectedId = propSelectedId !== undefined ? propSelectedId : storeSelectedId;
  const setSelectedId = propSetSelectedId || ((id: number) => useOrbitalStore.getState().setSelectedSatelliteId(id));
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);

const createSatDivIcon = (isSelected: boolean) => {
  const color = isSelected ? "#ff3366" : "#00e5ff";
  const size = isSelected ? 24 : 16;
  return L.divIcon({
    className: "sat-leaflet-custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 0 6px ${color});
        transform: translate(-50%, -50%);
      ">
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 7 9 3 5 7l4 4" fill="${color}" fill-opacity="0.3"/>
          <path d="m17 11 4 4-4 4-4-4" fill="${color}" fill-opacity="0.3"/>
          <path d="m8 12 4 4"/>
          <path d="m13 17 3 3"/>
          <path d="M5 19 2 22"/>
          <circle cx="12" cy="12" r="1.8" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

  const markersMapRef = useRef<Map<number, L.Marker>>(new Map());
  const trackLayersRef = useRef<L.Polyline[]>([]);
  const footprintCircleRef = useRef<L.Circle | null>(null);
  const prevSelectedIdRef = useRef<number | null>(null);

  const selectedSatrec = useOrbitalStore((s) => s.selectedSatrec);
  const timeMs = useOrbitalStore((s) => s.timeMs);

  const [debugLat, setDebugLat] = useState<number | null>(null);
  const [debugLon, setDebugLon] = useState<number | null>(null);

  // Pre-build O(1) ID to buffer index map for 60 FPS animation loop
  const satIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    const fullList = useOrbitalStore.getState().satellitesList;
    for (let i = 0; i < satellites.length; i++) {
      const sat = satellites[i];
      const fullIdx = fullList.findIndex((s) => s.id === sat.id);
      if (fullIdx !== -1) {
        map.set(sat.id, fullIdx * 8);
      }
    }
    return map;
  }, [satellites]);

  // ── 1. Initialize Leaflet Map with Canvas Renderer for extreme performance ─────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const renderer = L.canvas({ padding: 0.5 });
    canvasRendererRef.current = renderer;

    const mapInstance = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1.5,
      maxZoom: 12,
      worldCopyJump: true,
      zoomControl: false,
      preferCanvas: true,
      renderer: renderer,
    });

    L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxZoom: 19,
      }
    ).addTo(mapInstance);

    setMap(mapInstance);

    const t1 = setTimeout(() => mapInstance.invalidateSize(), 100);
    const t2 = setTimeout(() => mapInstance.invalidateSize(), 400);
    const t3 = setTimeout(() => mapInstance.invalidateSize(), 1200);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      ro = new ResizeObserver(() => mapInstance.invalidateSize());
      ro.observe(mapContainerRef.current);
    }

    const handleResize = () => mapInstance.invalidateSize();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro?.disconnect();
      window.removeEventListener("resize", handleResize);
      mapInstance.remove();
      setMap(null);
      canvasRendererRef.current = null;
    };
  }, []);

  const isMapValid = (m: L.Map | null): m is L.Map => {
    if (!m) return false;
    const panes = (m as any)._panes;
    return Boolean(panes && panes.overlayPane);
  };

  // ── 2. Create SVG Satellite Markers ONCE when satellite list changes ──────────
  useEffect(() => {
    if (!isMapValid(map)) return;

    markersMapRef.current.forEach((m) => {
      try { m.remove(); } catch (e) { /* ignore */ }
    });
    markersMapRef.current.clear();

    satellites.forEach((sat) => {
      const isSelected = sat.id === selectedId;
      const marker = L.marker([0, 0], {
        icon: createSatDivIcon(isSelected),
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedId(sat.id);
        if (onTrackSatellite) {
          onTrackSatellite(sat.id);
        }
      });

      marker.bindTooltip(sat.name, {
        permanent: isSelected,
        direction: "top",
        className: "leaflet-tooltip-custom",
        opacity: 0.9,
      });

      try {
        if (isMapValid(map)) {
          marker.addTo(map);
          markersMapRef.current.set(sat.id, marker);
        }
      } catch (err) {
        // Ignored if map container is being destroyed asynchronously
      }
    });
  }, [map, satellites]);

  // ── 3. Ultra-fast Selection Style Update (Instant 0ms execution) ──────────────
  useEffect(() => {
    if (prevSelectedIdRef.current !== null && prevSelectedIdRef.current !== selectedId) {
      const oldMarker = markersMapRef.current.get(prevSelectedIdRef.current);
      if (oldMarker) {
        oldMarker.setIcon(createSatDivIcon(false));
        oldMarker.unbindTooltip();
        const oldSat = satellites.find((s) => s.id === prevSelectedIdRef.current);
        if (oldSat) {
          oldMarker.bindTooltip(oldSat.name, {
            permanent: false,
            direction: "top",
            className: "leaflet-tooltip-custom",
            opacity: 0.9,
          });
        }
      }
    }

    if (selectedId !== null) {
      const newMarker = markersMapRef.current.get(selectedId);
      if (newMarker) {
        newMarker.setIcon(createSatDivIcon(true));
        const newSat = satellites.find((s) => s.id === selectedId);
        if (newSat) {
          newMarker.unbindTooltip();
          newMarker
            .bindTooltip(newSat.name, {
              permanent: true,
              direction: "top",
              className: "leaflet-tooltip-custom",
              opacity: 0.9,
            })
            .openTooltip();
        }
      }
    }

    prevSelectedIdRef.current = selectedId;
  }, [selectedId, satellites]);


  // ── 4. Ground-track polyline for selected satellite ──────────────────────
  useEffect(() => {
    if (!isMapValid(map) || !selectedSatrec) {
      trackLayersRef.current.forEach((l) => {
        try { l.remove(); } catch (e) { /* ignore */ }
      });
      trackLayersRef.current = [];
      try { footprintCircleRef.current?.remove(); } catch (e) { /* ignore */ }
      footprintCircleRef.current = null;
      return;
    }

    trackLayersRef.current.forEach((l) => {
      try { l.remove(); } catch (e) { /* ignore */ }
    });
    trackLayersRef.current = [];

    const meanMotionRadMin = selectedSatrec.no;
    const periodMin = (2 * Math.PI) / meanMotionRadMin;
    const steps = 120;
    const trackPoints: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const offsetMin = (i / steps) * periodMin;
      const propTime = new Date(timeMs + offsetMin * 60 * 1000);
      const gmst = satellite.gstime(propTime);
      const posAndVel = satellite.propagate(selectedSatrec, propTime);
      const pos = posAndVel?.position;

      if (pos && typeof pos !== "boolean" && !isNaN(pos.x)) {
        const posGd = satellite.eciToGeodetic(pos, gmst);
        const lat = satellite.degreesLat(posGd.latitude);
        let lon = satellite.degreesLong(posGd.longitude);
        if (lon > 180) lon -= 360;
        trackPoints.push([lat, lon]);
      }
    }

    const segments: [number, number][][] = [[]];
    let cur = segments[0];
    for (let i = 0; i < trackPoints.length; i++) {
      const pt = trackPoints[i];
      if (i > 0 && Math.abs(pt[1] - trackPoints[i - 1][1]) > 180) {
        cur = [];
        segments.push(cur);
      }
      cur.push(pt);
    }

    segments.forEach((seg) => {
      if (seg.length < 2) return;
      try {
        if (isMapValid(map)) {
          const poly = L.polyline(seg, {
            color: "#ff3366",
            weight: 1.8,
            opacity: 0.8,
            dashArray: "4, 4",
          }).addTo(map);
          trackLayersRef.current.push(poly);
        }
      } catch (err) {
        // Ignored if map container is being destroyed asynchronously
      }
    });

    if (!footprintCircleRef.current && isMapValid(map)) {
      try {
        footprintCircleRef.current = L.circle([0, 0], {
          radius: 0,
          color: "#ffcc00",
          fillColor: "#ffcc00",
          fillOpacity: 0.08,
          weight: 1,
          dashArray: "3, 3",
        }).addTo(map);
      } catch (err) {
        footprintCircleRef.current = null;
      }
    }
  }, [map, selectedSatrec, timeMs]);

  // ── 5. High-efficiency 60 FPS rAF animation tick ──────────────────────────────
  useEffect(() => {
    let frameId: number;

    const updateFrame = () => {
      const positions = latestPositions.current;
      if (positions) {
        let selectedLat: number | null = null;
        let selectedLon: number | null = null;
        let selectedAlt: number | null = null;

        for (let i = 0; i < satellites.length; i++) {
          const sat = satellites[i];
          const bufferIdx = satIndexMap.get(sat.id);
          if (bufferIdx === undefined) continue;

          const lat = positions[bufferIdx + 4];
          const lon = positions[bufferIdx + 5];
          const alt = positions[bufferIdx + 6];

          const marker = markersMapRef.current.get(sat.id);
          if (marker) {
            if (isNaN(lat)) {
              marker.setOpacity(0);
            } else {
              marker.setOpacity(1);
              marker.setLatLng([lat, lon]);
              if (sat.id === selectedId) {
                selectedLat = lat;
                selectedLon = lon;
                selectedAlt = alt;
              }
            }
          }
        }

        if (footprintCircleRef.current) {
          if (selectedLat !== null && selectedLon !== null && selectedAlt !== null) {
            const R_E = 6371.0;
            const theta = Math.acos(R_E / (R_E + selectedAlt));
            const radiusMeters = R_E * theta * 1000;
            footprintCircleRef.current.setLatLng([selectedLat, selectedLon]);
            footprintCircleRef.current.setRadius(radiusMeters);
            footprintCircleRef.current.setStyle({ opacity: 1, fillOpacity: 0.08 });
            setDebugLat(selectedLat);
            setDebugLon(selectedLon);
          } else {
            footprintCircleRef.current.setStyle({ opacity: 0, fillOpacity: 0 });
            setDebugLat(null);
            setDebugLon(null);
          }
        }
      }

      frameId = requestAnimationFrame(updateFrame);
    };

    updateFrame();
    return () => cancelAnimationFrame(frameId);
  }, [satellites, selectedId, satIndexMap]);

  return (
    <div className="h-full w-full relative">
      <div
        ref={mapContainerRef}
        className="h-full w-full bg-[#0d1117] rounded-xl overflow-hidden shadow-inner"
      />

      {showDebug && debugLat !== null && debugLon !== null && (
        <div className="absolute top-2 left-2 z-[9999] bg-slate-950/90 border border-yellow-400/60 text-yellow-300 font-mono text-[9px] px-2 py-1.5 rounded-lg shadow-lg pointer-events-none space-y-0.5">
          <p className="text-yellow-400 font-bold uppercase tracking-wider text-[8px] mb-1">
            ⚠ Position Debug (shared buffer)
          </p>
          <p>2D map lat : {debugLat.toFixed(5)}°</p>
          <p>2D map lon : {debugLon.toFixed(5)}°</p>
          <p className="text-slate-400 text-[8px] mt-1">3D globe reads same idx+4/idx+5</p>
        </div>
      )}
    </div>
  );
}
