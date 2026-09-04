import { cn } from "@/lib/utils";

export type CosmicTone = "oxygen" | "ai" | "solar" | "mars" | "aurora";

type PrimitiveProps = {
  tone?: CosmicTone;
  className?: string;
};

export function CosmicAmbientBackground({ tone = "oxygen", className }: PrimitiveProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("cosmic-ambient-background", `cosmic-ambient-${tone}`, className)}
    />
  );
}

export function SectionGlowLayer({ tone = "oxygen", className }: PrimitiveProps) {
  return <div aria-hidden="true" className={cn("section-glow-layer", `section-glow-${tone}`, className)} />;
}

export function AnimatedOrbitalRings({ tone = "oxygen", className }: PrimitiveProps) {
  return <div aria-hidden="true" className={cn("animated-orbital-rings", `orbital-rings-${tone}`, className)} />;
}

export function HorizonGlow({ tone = "oxygen", className }: PrimitiveProps) {
  return <div aria-hidden="true" className={cn("horizon-glow", `horizon-${tone}`, className)} />;
}

export function NebulaMist({ tone = "ai", className }: PrimitiveProps) {
  return <div aria-hidden="true" className={cn("nebula-mist", `nebula-${tone}`, className)} />;
}

export function LightStreaks({ tone = "oxygen", className }: PrimitiveProps) {
  return <div aria-hidden="true" className={cn("light-streaks", `light-streaks-${tone}`, className)} />;
}

export function SoftParticleField({ tone = "oxygen", className }: PrimitiveProps) {
  return <div aria-hidden="true" className={cn("soft-particle-field", `particles-${tone}`, className)} />;
}

export function AnimatedGlassReflection({ className }: Pick<PrimitiveProps, "className">) {
  return <div aria-hidden="true" className={cn("animated-glass-reflection", className)} />;
}

export function SectionDividerGlow({ tone = "oxygen", className }: PrimitiveProps) {
  return <div aria-hidden="true" className={cn("section-divider-glow", `divider-${tone}`, className)} />;
}
