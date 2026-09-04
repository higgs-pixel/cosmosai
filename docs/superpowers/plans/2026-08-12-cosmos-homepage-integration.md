# COSMOS AI Homepage Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surgically replace only the production homepage boundary with Aryan's approved cinematic homepage, while preserving production auth, NASA, security, analytics, middleware, routes, and unrelated application behavior.

**Architecture:** `src/app/page.tsx` remains the server component and loads six normalized APOD previews plus validated public-media configuration. A homepage-local client boundary owns Aryan's markup, route-entry animation, cursor, WebGL, videos, orbital controls, and archive gallery; no global layout or template is introduced. Existing NASA and auth services remain authoritative.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 3, GSAP, React Three Fiber, React Three Postprocessing, Three.js, Node test runner.

## Global Constraints

- Preserve `src/app/layout.tsx`, root metadata, security headers, middleware auth coverage, analytics, retention tracking, floating assistant, Supabase/auth, NASA services, Image Explorer, retrieval, and every unrelated route.
- Do not copy Aryan's `src/app`, root layout, configs, manifests, lockfile, Tailwind 4 setup, Drei, Scene, CelestialEvents, Nebula, or default SVGs.
- Keep production React, React DOM, Three.js, TypeScript, Tailwind, PostCSS, ESLint, Next configuration, and lockfile lineage unless compilation proves a specific incompatibility.
- Add only `gsap`, `@gsap/react`, `@react-three/fiber`, and `@react-three/postprocessing`.
- Keep oversized cinematic videos outside Git; configure HTTPS Vercel Blob/CDN URLs through validated server environment values and provide stable poster fallbacks.
- Do not invent social URLs or legal routes; render those controls disabled until approved.
- Do not merge, deploy, or upload media automatically.

---

### Task 1: Baseline, contracts, and release gates

**Files:**
- Create: `tests/homepage-navigation.test.ts`
- Modify: `package.json`
- Test: `tests/homepage-navigation.test.ts`

**Interfaces:**
- Consumes: production routes and existing `AuthNavLink` behavior.
- Produces: `homepageNavigationLinks`, `homepageOfferings`, and disabled-placeholder contracts consumed by the client homepage.

- [ ] **Step 1: Write the failing route-contract test**

```ts
test("homepage routes use the approved production destinations", () => {
  assert.deepEqual(homepageOfferings.map(({ href }) => href), [
    "/image-explorer", "/ask", "/spacepedia", "/mission-control",
  ]);
  assert.equal(homepageNavigationLinks.find(({ label }) => label === "Research")?.href, "/spacepedia");
});
```

- [ ] **Step 2: Run it and verify RED**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/homepage-navigation.test.ts`

Expected: fail because the production homepage contract module does not exist.

- [ ] **Step 3: Add the minimal typed contract and include the test in the production test script**

Create `src/components/home/aryan/homepage-contract.ts` with the approved route targets, asset paths, and disabled placeholder labels. Update only the existing `test` and `test:integration` script file lists.

- [ ] **Step 4: Run targeted and full tests**

Expected: route test passes; the existing 133-test baseline remains green.

### Task 2: Six recent NASA preview slots

**Files:**
- Create: `src/services/nasa/homepage-preview.service.ts`
- Modify: `src/services/nasa/index.ts`
- Create: `tests/homepage-nasa-previews.test.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `getApod`, `ApodEntry`, bounded NASA fetch/caching, and trusted HTTPS validation.
- Produces: `HomeNasaPreview`, `normalizeHomepageNasaPreviews(entries)`, `createHomepageNasaSlots(previews)`, and `getHomepageNasaPreviews(options)`.

- [ ] **Step 1: Write failing normalization tests**

Use literal APOD fixtures covering descending dates, image URLs, video thumbnails, duplicate dates, unsafe URLs, malformed dates, provider failure, attribution, and exactly six stable slots.

- [ ] **Step 2: Run them and verify RED**

Expected: module-not-found failure for `homepage-preview.service.ts`.

- [ ] **Step 3: Implement minimal server-side normalization and bounded fetch**

Fetch a recent 30-day APOD range with `thumbs: true`, validate approved NASA HTTPS hosts, use a valid video thumbnail only when present, sort descending, deduplicate, take six, and generate official NASA APOD source URLs. Never expose the API key to the client.

- [ ] **Step 4: Integrate the server page boundary**

Make `src/app/page.tsx` async, preserve its metadata, pass six serializable slots into the client homepage, and degrade to six honest unavailable slots if NASA fails.

- [ ] **Step 5: Run targeted, full, architecture, and security tests**

Expected: all preview cases pass without weakening NASA or CSP controls.

### Task 3: Media configuration, dependencies, and assets

**Files:**
- Modify: `src/lib/config/environment-schema.ts`
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `public/home/aryan/*` (approved used images and poster encodes only)
- Create: `docs/HOMEPAGE_MEDIA_CONFIGURATION.md`

**Interfaces:**
- Consumes: validated server environment parsing.
- Produces: optional HTTPS URL pairs for black-hole, Sun, and Sky WebM/MP4 files, passed as serializable homepage props.

- [ ] **Step 1: Extend existing environment tests first**

Add literal cases proving HTTPS Blob URLs are accepted, HTTP URLs are rejected, and values are absent by default.

- [ ] **Step 2: Run the environment test and verify RED**

Expected: the new media fields are missing.

- [ ] **Step 3: Add optional validated server fields and documentation**

Use server-read variables named `COSMOS_HOME_BLACKHOLE_WEBM_URL`, `COSMOS_HOME_BLACKHOLE_MP4_URL`, `COSMOS_HOME_SUN_WEBM_URL`, `COSMOS_HOME_SUN_MP4_URL`, `COSMOS_HOME_SKY_WEBM_URL`, and `COSMOS_HOME_SKY_MP4_URL`. Do not use `NEXT_PUBLIC_` or expose secrets.

- [ ] **Step 4: Add only the four approved libraries**

Run the production package manager so only the production lockfile changes. Do not add Drei or adopt Aryan's lockfile.

- [ ] **Step 5: Copy/encode only approved visual assets**

Preserve crop, dimensions, and perceived quality; omit all six large video payloads from Git and retain stable still posters for missing URLs/autoplay denial.

### Task 4: Surgical visual port

**Files:**
- Replace: `src/components/home/cosmos-home.tsx`
- Create: `src/components/home/aryan/black-hole-canvas.tsx`
- Create: `src/components/home/aryan/glass-nav.tsx`
- Create: `src/components/home/aryan/custom-cursor.tsx`
- Create: `src/components/home/aryan/circular-gallery.tsx`
- Create: `src/components/home/aryan/interactive-hover-button.tsx`
- Create: `src/components/home/aryan/optimized-video.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/auth/auth-nav-link.tsx` only if a visual variant is needed

**Interfaces:**
- Consumes: six NASA slots, validated media URLs, homepage contracts, and production auth state.
- Produces: the approved seven-section homepage with unchanged production shell.

- [ ] **Step 1: Port Aryan's markup and six used components only**

Keep section order, typography, colors, dimensions, gallery/orbital geometry, and animation timing. Move route-entry motion into the homepage client component; do not add `template.tsx`.

- [ ] **Step 2: Wire real routes and auth**

Render Ask, Explore, Research, and Observe as valid links; use the existing `AuthNavLink` account/login decision; retain `/earth`, `/briefing`, `/blog`, and `/about`.

- [ ] **Step 3: Render NASA data inside the existing gallery geometry**

Each of six slots keeps stable dimensions and displays image, title, date, attribution, and an accessible official NASA link, or an honest unavailable state.

- [ ] **Step 4: Scope all global behavior**

Namespace scroll snap, 3D utilities, cursor behavior, and keyframes below `.cosmos-aryan-home`; do not hide developer tools or patch `console.warn`.

- [ ] **Step 5: Add accessibility-preserving mobile behavior**

Keep desktop visuals unchanged, provide an accessible compact mobile menu, label controls, disable fake social/legal anchors, and honor reduced motion/coarse pointers.

### Task 5: Resource lifecycle and middleware safety

**Files:**
- Modify: `middleware.ts` only if local `.mp4`/`.webm` remains
- Modify: the six homepage components from Task 4
- Test: `tests/homepage-navigation.test.ts`

**Interfaces:**
- Consumes: browser intersection, media-query, pointer, and video APIs.
- Produces: clean video/texture teardown, conservative offscreen loading, and preserved protected-route middleware coverage.

- [ ] **Step 1: Add behavior tests for media configuration and middleware matching**

Prove configured URLs are HTTPS and that any static media exclusion does not exclude `/account`, `/login`, or auth callback routes.

- [ ] **Step 2: Implement minimal lifecycle hardening**

Dispose `VideoTexture`, pause and release generated video sources on unmount, cap canvas DPR, use `preload="metadata"` or `none`, attach sources near viewport, handle autoplay rejection without console suppression, and avoid animation loops under reduced motion.

- [ ] **Step 3: Run targeted tests and lint/typecheck**

Expected: no explicit `any`, unkeyed children, nested interactive controls, hydration warnings, or resource-leak regressions.

### Task 6: Release verification and merge decision

**Files:**
- Review: `git diff 685f74a...HEAD`
- Create: final integration report outside the repository if requested

- [ ] **Step 1: Run automated gates**

Run lint, typecheck, the full unit/integration suite, architecture check, security check, `npm audit`, production build with the existing ignored `.env.local`, and a client-bundle secret scan.

- [ ] **Step 2: Run browser matrix**

Verify desktop, tablet, mobile, touch/coarse pointer, keyboard, reduced motion, slow network, NASA failure, failed preview URL, autoplay denial, navigation, auth-aware account/login, console, hydration, layout overflow, and media preloading.

- [ ] **Step 3: Review exact diff scope**

Confirm root layout, Next/Tailwind/PostCSS/ESLint configs, middleware (unless local media requires the narrow matcher change), analytics, retention, floating assistant, Supabase/auth internals, NASA security pipeline, retrieval, Image Explorer, and unrelated routes are untouched by the integration commit.

- [ ] **Step 4: Report evidence and decision**

List exact files changed/untouched, dependencies, routes, NASA architecture, media variable mapping, verification results, remaining risks, and a clear safe/unsafe-to-merge conclusion. Do not merge or deploy.
