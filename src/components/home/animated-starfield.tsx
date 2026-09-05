import { SilverSpikeStarfield } from "@/components/visuals/SilverSpikeStarfield";

export function AnimatedStarfield({
  density = "medium",
}: {
  density?: "low" | "medium" | "high";
}) {
  return (
    <>
      <SilverSpikeStarfield density={density} />
      <div className="static-starfield-layer fixed inset-0 z-0 h-screen w-screen pointer-events-none" aria-hidden="true">
        <span className="static-starfield-layer__dust" />
        <span className="static-starfield-layer__glow" />
      </div>
    </>
  );
}

