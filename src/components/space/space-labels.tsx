"use client";

const LABELS = [
  {
    id: "asteroids",
    title: "ASTEROID FIELDS",
    subtitle: "Explore the distant remnants",
    pos: { top: "11%", left: "5.5%" },
  },
  {
    id: "terrestrial",
    title: "TERRESTRIAL WORLD",
    subtitle: "Rocky inhabited planet",
    pos: { top: "33%", left: "3.5%" },
  },
  {
    id: "gasgiant",
    title: "GAS GIANT",
    subtitle: "Gas tas giant",
    pos: { top: "55%", left: "16%" },
  },
  {
    id: "solar",
    title: "SOLAR CORE",
    subtitle: "The solar core",
    pos: { top: "64%", left: "40%" },
  },
  {
    id: "icegiant",
    title: "ICE GIANT",
    subtitle: "Ice giant",
    pos: { top: "19%", right: "9%" },
  },
  {
    id: "galaxy",
    title: "DISTANT GALAXY",
    subtitle: "Distant galaxy",
    pos: { bottom: "29%", left: "8%" },
  },
  {
    id: "cluster",
    title: "STAR CLUSTERS",
    subtitle: "Cradles of formation",
    pos: { bottom: "9%", right: "4.5%" },
  },
];

export function SpaceLabels() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {LABELS.map((label) => (
        <div
          key={label.id}
          style={{
            position: "absolute",
            ...label.pos,
            background: "rgba(25, 38, 55, 0.72)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "8px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.40)",
            padding: "8px 12px",
            minWidth: "120px",
          }}
        >
          <p
            style={{
              fontFamily:
                "system-ui, 'SF Pro Display', -apple-system, sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#deeaff",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {label.title}
          </p>
          <p
            style={{
              fontFamily:
                "system-ui, 'SF Pro Display', -apple-system, sans-serif",
              fontSize: "9px",
              color: "rgba(160,185,220,0.75)",
              margin: "3px 0 0",
              lineHeight: 1.4,
            }}
          >
            {label.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
}
