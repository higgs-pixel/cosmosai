"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "HOME", href: "/space" },
  { label: "EXPLORE", href: "/image-explorer" },
  { label: "RESEARCH LAB", href: "/spacepedia" },
];

export function SpaceNavbar() {
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "56px",
        zIndex: 100,
        background: "rgba(4,18,35,0.78)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: "1600px",
          margin: "0 auto",
          padding: "0 32px",
        }}
      >
        {/* Brand wordmark */}
        <Link
          href="/"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#ddeeff",
            textDecoration: "none",
            fontFamily: "system-ui, 'SF Pro Display', -apple-system, sans-serif",
            flexShrink: 0,
          }}
        >
          ASTRO-LEARN (COSMOS AI)
        </Link>

        {/* Navigation */}
        <nav
          style={{
            display: "flex",
            gap: "36px",
            alignItems: "center",
          }}
          aria-label="Space navigation"
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  position: "relative",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  color: active ? "#ffffff" : "rgba(170,195,230,0.72)",
                  paddingBottom: "4px",
                  fontFamily: "system-ui, 'SF Pro Display', -apple-system, sans-serif",
                  transition: "color 0.22s ease",
                  ...(active
                    ? { textShadow: "0 0 14px rgba(100,160,255,0.55)" }
                    : {}),
                }}
              >
                {link.label}
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: "10%",
                      right: "10%",
                      height: "1px",
                      background:
                        "linear-gradient(90deg, transparent, rgba(100,160,255,0.85), transparent)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
