# COSMOS AI Design System

Prepared: 2026-06-17

COSMOS AI should feel like a premium interactive space observatory: cinematic like Interstellar, precise like SpaceX, polished like Apple, fast like Vercel, and focused like Linear. The interface should not look like a generic SaaS dashboard. It should feel like entering a mission-control-grade exploration environment built around wonder, clarity, and trust.

## 1. Design Principles

### Cinematic First

The product is image-led, atmospheric, and immersive. NASA media should be treated as the primary visual material, not decoration. UI sits lightly over imagery and appears only when it helps exploration.

### Precision Over Ornament

Use clean geometry, quiet borders, subtle glows, and disciplined spacing. Avoid excessive gradients, decorative blobs, cartoon space elements, or generic glass panels everywhere.

### Dark By Default

COSMOS AI is a dark cinematic product. The dark theme is not a mode; it is the native environment. Light surfaces appear selectively for readable data, documents, or classroom exports.

### Trust Is Visible

Citations, NASA IDs, dates, source badges, and metadata should feel premium, not bureaucratic. Source visibility is part of the brand.

### Motion Has Meaning

Motion should imply orbit, depth, scanning, reveal, and travel. Avoid playful bouncing or generic SaaS slide-ins.

## 2. Color Palette

The palette is built around near-black space, cold stellar whites, oxygen blue, ion cyan, solar gold, Mars rust, and instrument green.

### Core Neutrals

| Token | Hex | Use |
| --- | --- | --- |
| cosmos.black | #03040A | App background, cinematic void |
| cosmos.abyss | #070914 | Page background, nav base |
| cosmos.night | #0B1020 | Elevated sections |
| cosmos.orbit | #111827 | Panels, dark cards |
| cosmos.steel | #1B2437 | Borders, inactive controls |
| cosmos.slate | #334155 | Secondary text, metadata |
| cosmos.mist | #94A3B8 | Body text on dark |
| cosmos.frost | #CBD5E1 | Strong text on dark |
| cosmos.white | #F8FAFC | Headlines, high contrast text |

### Luminous Accents

| Token | Hex | Use |
| --- | --- | --- |
| oxygen.400 | #38BDF8 | Primary interactive glow |
| oxygen.500 | #0EA5E9 | Primary buttons, active state |
| oxygen.600 | #0284C7 | Pressed state |
| ion.300 | #67E8F9 | Fine highlights, data glints |
| ion.500 | #06B6D4 | Secondary actions, science UI |
| solar.300 | #FDE68A | APOD/day highlight |
| solar.500 | #F59E0B | Warnings, solar events, featured badges |
| mars.400 | #FB7185 | Mars/alert accent |
| mars.600 | #E11D48 | Destructive/high-energy events |
| aurora.400 | #34D399 | Success, live status, discovery confirmation |
| violet.400 | #A78BFA | AI presence, semantic search, rare highlights |

### Semantic Tokens

| Token | Hex | Use |
| --- | --- | --- |
| background | #03040A | Root background |
| foreground | #F8FAFC | Primary text |
| muted | #94A3B8 | Secondary text |
| border | rgba(148, 163, 184, 0.18) | Hairline dividers |
| surface | rgba(11, 16, 32, 0.72) | Glass panels |
| surface-solid | #0B1020 | Non-transparent panels |
| primary | #0EA5E9 | Primary actions |
| primary-glow | rgba(56, 189, 248, 0.36) | Glow state |
| ai | #A78BFA | AI guide identity |
| success | #34D399 | Healthy/live/complete |
| warning | #F59E0B | Attention |
| danger | #E11D48 | Error/destructive |

### Gradient Rules

Use gradients as atmosphere, not decoration.

Approved gradients:

| Name | Value | Use |
| --- | --- | --- |
| Stellar Horizon | radial-gradient(circle at 50% 0%, rgba(56,189,248,0.22), transparent 34%), linear-gradient(180deg, #070914 0%, #03040A 72%) | Hero background over NASA imagery |
| Solar Edge | linear-gradient(90deg, rgba(245,158,11,0.0), rgba(245,158,11,0.45), rgba(56,189,248,0.0)) | Thin dividers, APOD accents |
| AI Aurora | linear-gradient(135deg, rgba(167,139,250,0.26), rgba(6,182,212,0.18), rgba(3,4,10,0)) | AI panels only |
| Orbital Metal | linear-gradient(180deg, rgba(248,250,252,0.10), rgba(148,163,184,0.03)) | Premium control surfaces |

Avoid:

1. Purple-blue gradient dominance.
2. Beige/sand palettes.
3. Blobby decorative gradients.
4. Neon overload.
5. Random aurora backgrounds unrelated to page content.

## 3. Typography

### Font Stack

| Role | Font |
| --- | --- |
| Display | Inter, SF Pro Display, system-ui |
| Body | Inter, SF Pro Text, system-ui |
| Mono/Data | IBM Plex Mono, SF Mono, ui-monospace |

Optional future brand upgrade:

Use r high-end editorial display face only for campaign/landing moments, not app UI. The product itself should remain precise and readable.

### Type Scale

| Token | Size | Line height | Weight | Use |
| --- | --- | --- | --- | --- |
| display-1 | 88px | 0.95 | 650 | Home hero, launch moments |
| display-2 | 64px | 1.0 | 650 | Section heroes |
| display-3 | 48px | 1.05 | 620 | Topic and journey headers |
| heading-1 | 40px | 1.1 | 620 | Page titles |
| heading-2 | 32px | 1.15 | 600 | Major sections |
| heading-3 | 24px | 1.2 | 600 | Cards, panels |
| heading-4 | 20px | 1.25 | 600 | Detail headings |
| body-lg | 18px | 1.65 | 400 | Narrative body |
| body | 16px | 1.6 | 400 | Default text |
| body-sm | 14px | 1.5 | 400 | Metadata |
| caption | 12px | 1.4 | 500 | Labels, NASA IDs |
| micro | 10px | 1.3 | 600 | Instrument labels |

### Typography Rules

1. Hero headlines are short and literal.
2. Letter spacing is 0 by default.
3. Use uppercase only for small instrument-style labels.
4. Avoid huge text inside cards or compact panels.
5. Long scientific names should wrap cleanly, never overflow.
6. Data values may use mono type, but explanations should not.

## 4. Spacing System

Use an 8px base system with cinematic section rhythm.

| Token | Value | Use |
| --- | --- | --- |
| 1 | 4px | Micro spacing |
| 2 | 8px | Tight controls |
| 3 | 12px | Icon/text gap |
| 4 | 16px | Default component padding |
| 5 | 20px | Dense panels |
| 6 | 24px | Card padding |
| 8 | 32px | Section internals |
| 10 | 40px | Medium section spacing |
| 12 | 48px | Large layout gap |
| 16 | 64px | Cinematic section gap |
| 20 | 80px | Page bands |
| 24 | 96px | Hero lower spacing |
| 32 | 128px | Major chapter spacing |

### Layout Widths

| Token | Value | Use |
| --- | --- | --- |
| content-sm | 720px | Text and explainers |
| content-md | 960px | Topic pages |
| content-lg | 1200px | Standard page content |
| content-xl | 1440px | Media grids |
| immersive | 100vw | Cinematic stages |

## 5. Radius

COSMOS AI should feel machined and premium. Use small radii for controls and restrained curves for media.

| Token | Value | Use |
| --- | --- | --- |
| none | 0 | Full-bleed media |
| xs | 4px | Badges, chips |
| sm | 6px | Buttons, inputs |
| md | 8px | Cards, panels |
| lg | 12px | Media viewer |
| xl | 16px | Modal/dialog only |
| full | 999px | Icon buttons, pills |

Rule: Cards stay at 8px unless they are immersive media containers.

## 6. Buttons

Buttons should feel like precision controls, not generic rounded SaaS pills.

### Button Anatomy

1. Height: 40px default, 48px primary hero, 32px compact.
2. Radius: 6px.
3. Icons: 16px or 18px.
4. Font: 14px, weight 600.
5. Press state: slight translateY(1px), lower glow.

### Variants

| Variant | Visual | Use |
| --- | --- | --- |
| Primary Ignition | Oxygen blue fill, subtle outer glow | Main CTA, search submit, start journey |
| Secondary Glass | Transparent glass, thin border | Secondary actions over imagery |
| Ghost Instrument | No fill, quiet text, hover border | Nav and compact tools |
| AI Aurora | Violet/cyan glass glow | Ask AI, explain, summarize |
| Solar | Gold edge/fill | Daily briefing, APOD moments |
| Danger | Mars red | Delete/destructive |
| Icon Control | Square or circular dark glass | Media tools, close, zoom, save |

### Button States

| State | Treatment |
| --- | --- |
| Hover | Border brightens, background lifts 4-8 percent, glow appears |
| Active | Translate down 1px, glow compresses |
| Focus | 2px oxygen ring with 2px offset |
| Disabled | 42 percent opacity, no glow, cursor default |
| Loading | Inline spinner or orbital sweep, label remains stable |

## 7. Cards

Cards are not generic containers. Each card type has a product purpose.

### Card Variants

| Variant | Description | Use |
| --- | --- | --- |
| Mission Tile | Image-dominant card with dark metadata rail | Missions, journeys, topics |
| Media Plate | NASA image/video preview with source badge | Search results |
| Glass Panel | Translucent panel over media | Metadata, AI answer context |
| Instrument Panel | Dense data panel with mono labels | Exoplanets, source health |
| Narrative Slab | Wide editorial block with media and text | Journey chapters |
| Command Surface | Highly interactive control panel | Search/filter dock |

### Card Rules

1. Do not nest cards inside cards.
2. Do not wrap every page section in a card.
3. Cards must have a content reason: media, data, AI, or action.
4. Prefer image-first cards for public pages.
5. Use density only where users compare data.

## 8. Glassmorphism

Glass should feel like spacecraft optics: layered, precise, and functional.

### Glass Styles

| Style | CSS intent | Use |
| --- | --- | --- |
| Glass Base | rgba dark surface, backdrop blur 20px, thin white border | Nav, drawers |
| Glass Deep | darker, less transparent, blur 28px | AI panels over bright media |
| Glass Luminous | subtle cyan/violet edge glow | AI and active controls |
| Glass Data | dark solid fallback with light transparency | Data panels |

### Glass Rules

1. Always include a solid fallback color.
2. Never put low-contrast text on glass.
3. Use glass sparingly over strong imagery.
4. Prefer gradient borders over heavy shadows.
5. Avoid frosted-card clutter.

## 9. Shadows and Glows

Use shadows for depth and glows for energy.

| Token | Value | Use |
| --- | --- | --- |
| shadow-void | 0 24px 80px rgba(0,0,0,0.48) | Large overlays |
| shadow-panel | 0 16px 48px rgba(0,0,0,0.36) | Panels and drawers |
| shadow-card | 0 10px 30px rgba(0,0,0,0.28) | Cards |
| glow-oxygen | 0 0 32px rgba(56,189,248,0.32) | Primary active |
| glow-ai | 0 0 36px rgba(167,139,250,0.28) | AI surfaces |
| glow-solar | 0 0 28px rgba(245,158,11,0.26) | APOD/solar accents |
| glow-aurora | 0 0 28px rgba(52,211,153,0.24) | Success/live |

Rule: A page should usually have one dominant glow color at a time.

## 10. Animation System

### Motion Personality

Motion should feel like:

1. Orbital drift.
2. Camera focus.
3. Mission-control scan.
4. Atmospheric reveal.
5. Zero-gravity calm.

### Timing

| Token | Duration | Use |
| --- | --- | --- |
| instant | 80ms | Micro feedback |
| fast | 160ms | Hover, toggles |
| base | 240ms | Buttons, menus |
| slow | 420ms | Drawers, panels |
| cinematic | 900ms | Page/hero reveals |
| orbital | 1400ms+ | Background ambient motion |

### Easing

| Token | Value | Use |
| --- | --- | --- |
| precision | cubic-bezier(0.2, 0.8, 0.2, 1) | Most UI |
| orbital | cubic-bezier(0.16, 1, 0.3, 1) | Large reveals |
| ignition | cubic-bezier(0.34, 1.56, 0.64, 1) | Rare CTA emphasis |
| fade | cubic-bezier(0.4, 0, 0.2, 1) | Opacity |

### Animation Patterns

| Pattern | Behavior | Use |
| --- | --- | --- |
| Stellar Reveal | Fade + 16px upward movement + slight blur out | Page sections |
| Orbital Drift | Very slow x/y/rotate motion | Background stars/particles |
| Focus Lock | Scale from 1.02 to 1, sharpen blur | Hero media load |
| Scanline Sweep | Thin light passes across edge | Active data panels |
| Gravity Pull | Cards rise slightly toward cursor | Premium media cards |
| AI Materialize | Violet edge glow + soft reveal | AI response arrival |

### Reduced Motion

When reduced motion is enabled:

1. Disable parallax.
2. Disable ambient drift.
3. Replace page transitions with opacity fades.
4. Keep essential feedback under 160ms.

## 11. Dark Theme

The dark theme uses strong contrast but avoids pure white overload.

### Theme Layers

| Layer | Color |
| --- | --- |
| Body | cosmos.black |
| Page band | cosmos.abyss |
| Elevated band | cosmos.night |
| Panel | rgba(11, 16, 32, 0.72) |
| Card | rgba(17, 24, 39, 0.78) |
| Border | rgba(148, 163, 184, 0.18) |
| Primary text | cosmos.white |
| Body text | cosmos.frost |
| Metadata | cosmos.mist |
| Disabled | rgba(148, 163, 184, 0.38) |

### Contrast Rules

1. Headlines: white/frost on dark.
2. Body: frost, not pure white.
3. Metadata: mist or slate.
4. Borders: visible but thin.
5. Interactive controls: visible focus rings always.

## 12. Tailwind Configuration

Use this as the design-token foundation for the app.

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/content/**/*.{md,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
        "2xl": "3rem",
      },
      screens: {
        sm: "720px",
        md: "960px",
        lg: "1200px",
        xl: "1440px",
        "2xl": "1600px",
      },
    },
    extend: {
      colors: {
        cosmos: {
          black: "#03040A",
          abyss: "#070914",
          night: "#0B1020",
          orbit: "#111827",
          steel: "#1B2437",
          slate: "#334155",
          mist: "#94A3B8",
          frost: "#CBD5E1",
          white: "#F8FAFC",
        },
        oxygen: {
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
        },
        ion: {
          300: "#67E8F9",
          500: "#06B6D4",
        },
        solar: {
          300: "#FDE68A",
          500: "#F59E0B",
        },
        mars: {
          400: "#FB7185",
          600: "#E11D48",
        },
        aurora: {
          400: "#34D399",
        },
        violet: {
          400: "#A78BFA",
        },
        background: "#03040A",
        foreground: "#F8FAFC",
        muted: "#94A3B8",
        border: "rgba(148, 163, 184, 0.18)",
        surface: "rgba(11, 16, 32, 0.72)",
        primary: "#0EA5E9",
        success: "#34D399",
        warning: "#F59E0B",
        danger: "#E11D48",
        ai: "#A78BFA",
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Text", "system-ui", "sans-serif"],
        display: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "SF Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-1": ["5.5rem", { lineHeight: "0.95", fontWeight: "650" }],
        "display-2": ["4rem", { lineHeight: "1", fontWeight: "650" }],
        "display-3": ["3rem", { lineHeight: "1.05", fontWeight: "620" }],
        "heading-1": ["2.5rem", { lineHeight: "1.1", fontWeight: "620" }],
        "heading-2": ["2rem", { lineHeight: "1.15", fontWeight: "600" }],
        "heading-3": ["1.5rem", { lineHeight: "1.2", fontWeight: "600" }],
        "heading-4": ["1.25rem", { lineHeight: "1.25", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.65", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
        micro: ["0.625rem", { lineHeight: "1.3", fontWeight: "600" }],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
        34: "8.5rem",
        38: "9.5rem",
      },
      borderRadius: {
        xs: "0.25rem",
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        void: "0 24px 80px rgba(0, 0, 0, 0.48)",
        panel: "0 16px 48px rgba(0, 0, 0, 0.36)",
        card: "0 10px 30px rgba(0, 0, 0, 0.28)",
        "glow-oxygen": "0 0 32px rgba(56, 189, 248, 0.32)",
        "glow-ai": "0 0 36px rgba(167, 139, 250, 0.28)",
        "glow-solar": "0 0 28px rgba(245, 158, 11, 0.26)",
        "glow-aurora": "0 0 28px rgba(52, 211, 153, 0.24)",
      },
      backgroundImage: {
        "stellar-horizon":
          "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.22), transparent 34%), linear-gradient(180deg, #070914 0%, #03040A 72%)",
        "solar-edge":
          "linear-gradient(90deg, rgba(245,158,11,0), rgba(245,158,11,0.45), rgba(56,189,248,0))",
        "ai-aurora":
          "linear-gradient(135deg, rgba(167,139,250,0.26), rgba(6,182,212,0.18), rgba(3,4,10,0))",
        "orbital-metal":
          "linear-gradient(180deg, rgba(248,250,252,0.10), rgba(148,163,184,0.03))",
      },
      backdropBlur: {
        glass: "20px",
        deep: "28px",
      },
      transitionTimingFunction: {
        precision: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        orbital: "cubic-bezier(0.16, 1, 0.3, 1)",
        ignition: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        instant: "80ms",
        fast: "160ms",
        base: "240ms",
        slow: "420ms",
        cinematic: "900ms",
      },
      keyframes: {
        "stellar-reveal": {
          "0%": {
            opacity: "0",
            transform: "translateY(16px)",
            filter: "blur(8px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
            filter: "blur(0)",
          },
        },
        "orbital-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "50%": { transform: "translate3d(12px, -10px, 0) rotate(0.6deg)" },
        },
        "focus-lock": {
          "0%": {
            transform: "scale(1.02)",
            filter: "blur(10px)",
            opacity: "0.72",
          },
          "100%": {
            transform: "scale(1)",
            filter: "blur(0)",
            opacity: "1",
          },
        },
        "scanline-sweep": {
          "0%": { transform: "translateX(-120%)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateX(120%)", opacity: "0" },
        },
        "ai-materialize": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
            boxShadow: "0 0 0 rgba(167,139,250,0)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
            boxShadow: "0 0 36px rgba(167,139,250,0.18)",
          },
        },
      },
      animation: {
        "stellar-reveal": "stellar-reveal 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "orbital-drift": "orbital-drift 14s ease-in-out infinite",
        "focus-lock": "focus-lock 1200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "scanline-sweep": "scanline-sweep 1600ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "ai-materialize": "ai-materialize 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
```

## 13. Recommended Global CSS Utilities

Use these as semantic utility classes layered on top of Tailwind tokens.

```css
:root {
  color-scheme: dark;
  background: #03040a;
}

.cosmos-glass {
  background: rgba(11, 16, 32, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(20px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.36);
}

.cosmos-glass-deep {
  background: rgba(3, 4, 10, 0.78);
  border: 1px solid rgba(203, 213, 225, 0.14);
  backdrop-filter: blur(28px);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.48);
}

.cosmos-hairline {
  background: linear-gradient(
    90deg,
    rgba(56, 189, 248, 0),
    rgba(148, 163, 184, 0.28),
    rgba(56, 189, 248, 0)
  );
  height: 1px;
}

.cosmos-text-balance {
  text-wrap: balance;
}

.cosmos-media-vignette {
  box-shadow:
    inset 0 0 120px rgba(3, 4, 10, 0.72),
    inset 0 -160px 180px rgba(3, 4, 10, 0.86);
}

.cosmos-focus-ring {
  outline: 2px solid rgba(56, 189, 248, 0.92);
  outline-offset: 2px;
}
```

## 14. Component Styling Blueprint

### Primary Button

Visual:

1. Oxygen blue base.
2. Thin bright top edge.
3. Controlled glow on hover.
4. Sharp 6px radius.
5. Icon aligned left or right.

### AI Button

Visual:

1. Dark glass base.
2. Violet-to-cyan edge glow.
3. AI icon or sparkle mark.
4. Should feel like opening a guide, not launching a chatbot widget.

### Media Card

Visual:

1. Image fills most of the card.
2. Bottom metadata rail overlays image.
3. Source badge top-left.
4. Save/icon action top-right.
5. Hover reveals subtle camera push and metadata clarity.

### Journey Card

Visual:

1. Wide cinematic crop.
2. Chapter count and difficulty as instrument labels.
3. Strong title.
4. No generic CTA button unless card is focused.

### AI Answer Panel

Visual:

1. Deep glass.
2. Violet/cyan edge.
3. Citations attached in a source drawer.
4. Confidence/uncertainty text styled as metadata, not warning spam.

## 15. Visual Quality Checklist

Before a COSMOS AI screen ships:

1. Does NASA media lead the composition?
2. Does the UI feel precise rather than decorative?
3. Is there one clear luminous accent, not many competing glows?
4. Are source and trust signals visible?
5. Does motion support exploration instead of showing off?
6. Does the page still feel premium with reduced motion?
7. Is text readable over imagery on mobile?
8. Does the page avoid generic SaaS cards and dashboards?
9. Does every section have a memorable visual moment?
10. Would this screen still feel credible next to Apple, SpaceX, Linear, or Vercel?

