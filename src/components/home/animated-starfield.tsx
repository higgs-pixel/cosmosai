export function AnimatedStarfield() {
  return (
    <div className="static-starfield-layer fixed inset-0 z-0 h-screen w-screen" aria-hidden="true">
      <span className="static-starfield-layer__dust" />
      <span className="static-starfield-layer__glow" />
    </div>
  );
}
