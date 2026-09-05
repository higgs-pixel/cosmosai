"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as satellite from "satellite.js";
import { ObserverCoords, SatellitePass } from "./PassPredictor";

interface Observer2DMapProps {
  observer: ObserverCoords;
  selectedPass: SatellitePass | null;
  simPoint?: {
    lat: number;
    lon: number;
    altKm?: number;
    satName: string;
    elDeg: number;
    line1?: string;
    line2?: string;
  } | null;
  timeMs?: number;
}

export default function Observer2DMap({ observer, selectedPass, simPoint, timeMs = 0 }: Observer2DMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const trackPolyRef = useRef<L.Polyline | null>(null);
  const subpointPolyRef = useRef<L.Polyline | null>(null);
  const obsMarkerRef = useRef<L.Marker | null>(null);
  const satMarkerRef = useRef<L.Marker | null>(null);
  const horizonCircleRef = useRef<L.Circle | null>(null);
  const currentSatNameRef = useRef<string>("");

  // Hook 1: Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const renderer = L.canvas({ padding: 0.5 });

    const mapInstance = L.map(mapContainerRef.current, {
      center: [observer?.lat || 0, observer?.lon || 0],
      zoom: 5,
      minZoom: 1.5,
      maxZoom: 14,
      worldCopyJump: true,
      zoomControl: false,
      preferCanvas: true,
      renderer: renderer,
    });

    L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri &mdash; World Imagery",
        maxZoom: 19,
      }
    ).addTo(mapInstance);

    setMap(mapInstance);

    const t1 = setTimeout(() => mapInstance.invalidateSize(), 100);
    const t2 = setTimeout(() => mapInstance.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      try {
        mapInstance.remove();
      } catch {
        /* skip */
      }
      setMap(null);
    };
  }, []);

  // Hook 2: Invalidate Map Size on Window & Container Resize
  useEffect(() => {
    if (!map) return;
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      ro.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, [map]);

  // Hook 3: Observer Location Pin & Horizon Circle
  useEffect(() => {
    if (!map) return;

    if (obsMarkerRef.current) obsMarkerRef.current.remove();
    if (horizonCircleRef.current) horizonCircleRef.current.remove();

    const obsLat = observer?.lat || 0;
    const obsLon = observer?.lon || 0;

    const customIcon = L.divIcon({
      className: "custom-obs-pin",
      html: `<div style="background-color:#ff3366; width:14px; height:14px; border-radius:50%; border:2.5px solid #ffffff; box-shadow:0 0 12px #ff3366;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    obsMarkerRef.current = L.marker([obsLat, obsLon], { icon: customIcon })
      .addTo(map)
      .bindTooltip(`SITE: ${observer?.name || "GPS Location"}<br/>Lat: ${obsLat.toFixed(4)}°, Lon: ${obsLon.toFixed(4)}°`, {
        permanent: false,
        direction: "top",
        className: "leaflet-tooltip-custom",
      });

    horizonCircleRef.current = L.circle([obsLat, obsLon], {
      radius: 500000,
      color: "#00e5ff",
      fillColor: "#00e5ff",
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: "4, 4",
    }).addTo(map);
  }, [map, observer]);

  // Hook 4: 2D Orbit Track Polyline, Subpoint Line & Tracked Satellite Marker (#dc0ec4 & #00ff88)
  useEffect(() => {
    if (!map) return;

    if (!simPoint) {
      if (trackPolyRef.current) {
        trackPolyRef.current.remove();
        trackPolyRef.current = null;
      }
      if (subpointPolyRef.current) {
        subpointPolyRef.current.remove();
        subpointPolyRef.current = null;
      }
      if (satMarkerRef.current) {
        satMarkerRef.current.remove();
        satMarkerRef.current = null;
      }
      return;
    }

    const currentTimestamp = timeMs > 0 ? timeMs : Date.now();
    let coords: [number, number][] = [];
    let currentLat = simPoint.lat || 0;
    let currentLon = simPoint.lon || 0;

    if (simPoint.line1 && simPoint.line2) {
      try {
        const satrec = satellite.twoline2satrec(simPoint.line1, simPoint.line2);
        const periodMins = 95;
        const steps = 72;

        for (let i = 0; i <= steps; i++) {
          const offsetMins = (i / steps - 0.5) * periodMins;
          const targetDate = new Date(currentTimestamp + offsetMins * 60 * 1000);
          const posVel = satellite.propagate(satrec, targetDate);

          if (posVel && posVel.position && typeof posVel.position === "object") {
            const gmst = satellite.gstime(targetDate);
            const posGd = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
            const lat = satellite.degreesLat(posGd.latitude);
            let lon = satellite.degreesLong(posGd.longitude);
            if (lon > 180) lon -= 360;
            if (lon < -180) lon += 360;
            coords.push([lat, lon]);

            if (i === Math.floor(steps / 2)) {
              currentLat = lat;
              currentLon = lon;
            }
          }
        }
      } catch {
        /* fallback */
      }
    }

    if (coords.length < 10 && selectedPass && selectedPass.points && selectedPass.points.length > 1) {
      const obsLat = observer?.lat || 0;
      const obsLon = observer?.lon || 0;
      coords = selectedPass.points.map((p) => {
        const lat = p.satLat !== undefined ? p.satLat : obsLat + (p.slantRangeKm / 111) * Math.cos((p.azimuthDeg * Math.PI) / 180);
        const lon = p.satLon !== undefined ? p.satLon : obsLon + (p.slantRangeKm / (111 * Math.cos((obsLat * Math.PI) / 180))) * Math.sin((p.azimuthDeg * Math.PI) / 180);
        return [lat, lon];
      });
    }

    if (coords.length < 10) {
      let incRad = (51.6 * Math.PI) / 180;
      if (simPoint.line1 && simPoint.line2) {
        try {
          const satrec = satellite.twoline2satrec(simPoint.line1, simPoint.line2);
          if (typeof satrec.inclo === "number" && !isNaN(satrec.inclo)) {
            incRad = satrec.inclo;
          }
        } catch {
          /* fallback */
        }
      } else if (simPoint.lat) {
        incRad = Math.max((Math.abs(simPoint.lat) + 5) * (Math.PI / 180), 0.3);
      }

      const steps = 72;
      for (let i = 0; i <= steps; i++) {
        const frac = (i / steps) * 2 * Math.PI;
        const lat = Math.asin(Math.sin(incRad) * Math.sin(frac)) * (180 / Math.PI);
        let lon = simPoint.lon + (frac - Math.PI) * (180 / Math.PI);
        while (lon > 180) lon -= 360;
        while (lon < -180) lon += 360;
        coords.push([lat, lon]);
      }
    }

    // 1. Update Orbit Polyline (Electric Green #00ff88, Weight 2.5)
    if (coords.length > 1) {
      if (trackPolyRef.current) {
        trackPolyRef.current.setLatLngs(coords);
      } else {
        trackPolyRef.current = L.polyline(coords, {
          color: "#00ff88",
          weight: 2.5,
          opacity: 0.9,
        }).addTo(map);
      }
    }

    // 2. Subpoint Line to Observer (Yellow #ffcc00 Dashed)
    const obsLat = observer?.lat || 0;
    const obsLon = observer?.lon || 0;
    const subpointCoords: [number, number][] = [
      [currentLat, currentLon],
      [obsLat, obsLon],
    ];

    if (subpointPolyRef.current) {
      subpointPolyRef.current.setLatLngs(subpointCoords);
    } else {
      subpointPolyRef.current = L.polyline(subpointCoords, {
        color: "#ffcc00",
        weight: 1.5,
        opacity: 0.8,
        dashArray: "4, 4",
      }).addTo(map);
    }

    // 3. Tracked Satellite Marker (Vibrant Magenta Pink #dc0ec4)
    const isSatChanged = currentSatNameRef.current !== simPoint.satName;
    currentSatNameRef.current = simPoint.satName;

    if (satMarkerRef.current && !isSatChanged) {
      satMarkerRef.current.setLatLng([currentLat, currentLon]);
    } else {
      if (satMarkerRef.current) satMarkerRef.current.remove();

      const satIcon = L.divIcon({
        className: "custom-sat-pin",
        html: `
          <div style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 0 10px #dc0ec4); transform:translate(-50%, -50%);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc0ec4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 7 9 3 5 7l4 4" fill="#dc0ec4" fill-opacity="0.35"/>
              <path d="m17 11 4 4-4 4-4-4" fill="#dc0ec4" fill-opacity="0.35"/>
              <path d="m8 12 4 4"/>
              <path d="m13 17 3 3"/>
              <path d="M5 19 2 22"/>
              <circle cx="12" cy="12" r="1.8" fill="#ffffff"/>
            </svg>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      satMarkerRef.current = L.marker([currentLat, currentLon], { icon: satIcon }).addTo(map);
    }
  }, [map, simPoint, selectedPass, timeMs, observer]);

  return (
    <div className="h-full w-full relative z-0">
      {/* Top-Left Corner HUD Satellite Tracking Badge (Matching Orbit Page) */}
      {simPoint && (
        <div className="absolute left-4 top-4 z-[1000] flex items-center gap-2 bg-slate-950/90 border border-[#00ff88]/80 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(0,255,136,0.4)] pointer-events-none select-none">
          <span className="flex h-2 w-2 rounded-full bg-[#00ff88] animate-ping" />
          <span className="font-mono text-[9px] font-bold text-[#00ff88] uppercase tracking-widest">
            Tracking:
          </span>
          <span className="font-mono text-[10px] font-bold text-white tracking-wide">
            {simPoint.satName}
          </span>
        </div>
      )}

      {/* Top-Right Corner HUD Satellite Hover Details Overlay Window (Matching Orbit Page) */}
      {simPoint && (
        <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-1 bg-slate-950/95 border border-[#00e5ff]/60 px-3.5 py-2.5 rounded-lg shadow-[0_0_20px_rgba(0,229,255,0.25)] pointer-events-none select-none min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-3">
            <span className="font-mono text-[9px] font-bold text-[#00e5ff] uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
              TARGET SATELLITE
            </span>
            <span className="font-mono text-[9px] font-bold text-[#00ff88]">{simPoint.elDeg}° EL</span>
          </div>
          <div className="font-mono text-[11px] font-bold text-white truncate max-w-[210px]">
            {simPoint.satName}
          </div>
          <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 pt-0.5 gap-2">
            <span>OBS: <strong className="text-cyan-300">{observer?.name?.split(",")[0] || "GPS"}</strong></span>
            <span>ALT: <strong className="text-cyan-300">{Math.round(simPoint.altKm || 500)} km</strong></span>
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="h-full w-full bg-[#0d1117] rounded-xl overflow-hidden shadow-inner" />
    </div>
  );
}
