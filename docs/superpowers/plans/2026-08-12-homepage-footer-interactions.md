# Homepage Footer Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an animated floating footer share menu, preserve the custom cursor animation through internal homepage scrolling, and make every rotating archive card actionable.

**Architecture:** Keep share URL construction and gesture decisions as pure, testable contracts in the existing homepage contract module. Add one focused client component for the share menu, connect the cursor to the homepage's real scroll element, and keep archive destination/drag protection inside the existing archive composition and circular gallery.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, GSAP, Lucide React, Node test runner.

## Global Constraints

- Preserve the approved cinematic layout and existing routes.
- Share WhatsApp, X, LinkedIn, Facebook, and Copy Link actions for the current page.
- Do not invent COSMOS AI social-profile URLs.
- Coarse pointers and reduced-motion users retain native cursor behavior.
- Live archive cards open trusted NASA sources; unavailable slots route to `/image-explorer`.
- Do not stage or overwrite the unrelated generated `tsconfig.tsbuildinfo` change.

---

### Task 1: Share and archive behavior contracts

**Files:**
- Modify: `src/components/home/aryan/homepage-contract.ts`
- Modify: `tests/homepage-navigation.test.ts`

**Interfaces:**
- Produces: `HomepageSharePlatform`, `buildHomepageShareUrl(platform, pageUrl, title)`, `homepageArchiveDestination(sourceUrl)`, and `homepageGalleryGestureIsDrag(distance)`.
- Consumes: standard `URL`/`URLSearchParams` encoding only.

- [ ] **Step 1: Write failing share URL tests**

Add literal expectations for WhatsApp, X, LinkedIn, and Facebook. Each expected URL must independently verify that `https://cosmosatlas.space/?view=archive` and `Explore COSMOS AI` are encoded correctly. Add Copy Link as a platform with no external URL.

- [ ] **Step 2: Write failing archive and drag tests**

Assert that a NASA URL remains the destination, an absent source becomes `/image-explorer`, `5` pixels is a click, and `7` pixels is a drag.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```powershell
node scripts/run-node-tests.mjs tests/homepage-navigation.test.ts
```

Expected: FAIL because the new exports do not exist.

- [ ] **Step 4: Implement the minimal pure contracts**

Use exact platform endpoints:

```ts
export type HomepageSharePlatform = "whatsapp" | "x" | "linkedin" | "facebook" | "copy";

export function buildHomepageShareUrl(
  platform: Exclude<HomepageSharePlatform, "copy">,
  pageUrl: string,
  title: string,
): string;

export function homepageArchiveDestination(sourceUrl?: string): string;
export function homepageGalleryGestureIsDrag(distance: number): boolean;
```

The drag threshold is strictly greater than `6` CSS pixels.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the same command and require zero failures.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- src/components/home/aryan/homepage-contract.ts tests/homepage-navigation.test.ts
git commit -m "Test homepage share and archive contracts"
```

### Task 2: Animated floating share menu

**Files:**
- Create: `src/components/home/aryan/footer-share-menu.tsx`
- Modify: `src/components/home/cosmos-home.tsx`

**Interfaces:**
- Consumes: `buildHomepageShareUrl` and `HomepageSharePlatform` from Task 1.
- Produces: `<FooterShareMenu />`, a self-contained client component.

- [ ] **Step 1: Build the accessible menu state**

Create a circular trigger with `aria-expanded`, `aria-controls="homepage-share-menu"`, and `data-cursor-link="true"`. Store `open` and copy-status state. Close on Escape, outside pointer-down, and successful selection.

- [ ] **Step 2: Render the five floating actions**

Use Lucide React icons for WhatsApp-style messaging, X/Twitter, LinkedIn, Facebook, and Copy Link. Render actions in a compact absolute fan above the trigger. Apply staggered delays using the action index and Tailwind translate/scale/opacity transitions. External actions call `window.open(url, "_blank", "noopener,noreferrer")`; Copy Link calls `navigator.clipboard.writeText(window.location.href)`.

- [ ] **Step 3: Add error and reduced-motion behavior**

Show `Copied` after success and `Copy failed` after rejection. Use `motion-reduce:transition-none` and remove translated entry motion for reduced-motion users. Ensure labels remain available to screen readers.

- [ ] **Step 4: Replace the disabled footer control**

Import and render `<FooterShareMenu />` at the current centered footer share location. Leave Privacy and Terms disabled.

- [ ] **Step 5: Run focused type and lint checks**

```powershell
npm.cmd run typecheck
.\node_modules\.bin\eslint.cmd src\components\home\cosmos-home.tsx src\components\home\aryan\footer-share-menu.tsx
```

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- src/components/home/cosmos-home.tsx src/components/home/aryan/footer-share-menu.tsx
git commit -m "Add animated homepage share menu"
```

### Task 3: Cursor animation across internal scrolling

**Files:**
- Modify: `src/components/home/aryan/custom-cursor.tsx`

**Interfaces:**
- Consumes: `.cosmos-aryan-home` as the page's scroll owner and existing `[data-cursor-link="true"]` targets.
- Produces: viewport cursor behavior that re-evaluates hover state on internal scrolling.

- [ ] **Step 1: Record the browser RED case**

At a fine-pointer desktop viewport, move the pointer over a non-interactive hero location, scroll the internal homepage until the same viewport coordinates cover an interactive control, and confirm the cursor's inner size remains `12px` before pointer movement. This is the failing one-off regression test.

- [ ] **Step 2: Attach to the actual scroll owner**

Resolve `document.querySelector<HTMLElement>(".cosmos-aryan-home")`, attach the existing passive `onScroll` handler to it, and remove that listener during cleanup. Retain the window listener for ordinary page scrolling.

- [ ] **Step 3: Verify the browser GREEN case**

Repeat Step 1 and require the cursor to reach the interactive `32px` state without an extra pointer move. Then move across the section and visually confirm velocity stretch/rotation remains active.

- [ ] **Step 4: Run focused lint and type checks**

```powershell
.\node_modules\.bin\eslint.cmd src\components\home\aryan\custom-cursor.tsx
npm.cmd run typecheck
```

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- src/components/home/aryan/custom-cursor.tsx
git commit -m "Keep homepage cursor animated while scrolling"
```

### Task 4: Clickable rotating archive cards

**Files:**
- Modify: `src/components/home/cosmos-home.tsx`
- Modify: `src/components/home/aryan/circular-gallery.tsx`

**Interfaces:**
- Consumes: `homepageArchiveDestination` and `homepageGalleryGestureIsDrag` from Task 1.
- Produces: a link for every card and drag suppression after pointer movement exceeds 6 pixels.

- [ ] **Step 1: Make the fallback card a link**

Render both preview and unavailable states through one anchor. Use `_blank` and `noopener noreferrer` only for external NASA destinations; use `/image-explorer` as a normal same-tab internal destination. Give the fallback link the accessible label `Explore NASA imagery`.

- [ ] **Step 2: Distinguish clicks from drags**

Track total horizontal movement from pointer-down. Once `homepageGalleryGestureIsDrag(Math.abs(currentX - pointerDownX))` returns true, mark the gesture as a drag. In `onClickCapture`, prevent navigation once for a dragged gesture, then reset the flag.

- [ ] **Step 3: Verify pointer and keyboard behavior in the browser**

Confirm a normal click opens a live NASA card, a fallback card routes to `/image-explorer`, dragging rotates without navigation, Tab reaches cards, and Enter activates the focused link.

- [ ] **Step 4: Commit Task 4**

```powershell
git add -- src/components/home/cosmos-home.tsx src/components/home/aryan/circular-gallery.tsx
git commit -m "Make homepage archive cards actionable"
```

### Task 5: Release verification and PR update

**Files:**
- Verify only; do not add generated artifacts.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: a verified update to PR #5 and its Vercel preview.

- [ ] **Step 1: Run local gates**

```powershell
node scripts/run-node-tests.mjs tests/homepage-navigation.test.ts tests/homepage-nasa-previews.test.ts
npm.cmd run typecheck
.\node_modules\.bin\eslint.cmd src\components\home\cosmos-home.tsx src\components\home\aryan\footer-share-menu.tsx src\components\home\aryan\custom-cursor.tsx src\components\home\aryan\circular-gallery.tsx
npm.cmd run build
git diff --check
```

- [ ] **Step 2: Verify desktop preview**

At `1351x639`, confirm the share fan, Copy Link status, cursor expansion after internal scrolling, live/fallback card links, drag suppression, and zero app console errors.

- [ ] **Step 3: Verify mobile preview**

At `586x1280`, confirm the fan remains in the viewport, all actions are reachable by touch, the footer is not horizontally clipped, fallback archive cards are tappable, and reduced-motion/coarse-pointer behavior remains usable.

- [ ] **Step 4: Push normally and verify PR #5**

Push `codex/homepage-motion-preview-hotfix` without force, require the Vercel check to succeed, and confirm the PR head SHA matches the tested preview.

- [ ] **Step 5: Merge and verify production**

Merge with the repository's merge-commit method only after all checks pass. Confirm the automatic `main` Vercel deployment reaches `READY` and repeat the critical browser checks on production.
