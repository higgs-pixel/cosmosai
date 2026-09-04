# COSMOS AI UX Fix Tracker

Created: 2026-07-07  
Scope: Current COSMOS AI web app, routes, components, and UX feedback.  
Purpose: Organize known UX, performance, content, and interaction issues into implementation phases without changing application code.

## Source Context

This tracker is based on:

- `PROJECT_STATUS.md`
- `PROJECT_AUDIT.md`
- `README.md`
- Current App Router routes in `src/app`
- Current UI components in `src/components`
- Known UX feedback supplied by the product/design review

## Current Route And Component Map

Primary routes:

- `/`: Homepage, implemented by `src/app/page.tsx` and `src/components/home/cosmos-home.tsx`
- `/ask`: Ask COSMOS, implemented by `src/app/ask/page.tsx` and `src/components/assistant/cosmos-assistant.tsx`
- `/briefing`: Daily Briefing, implemented by `src/app/briefing/page.tsx` and `src/components/briefing/mission-control-briefing.tsx`
- `/earth`: Live Earth Dashboard, implemented by `src/app/earth/page.tsx` and `src/components/earth/live-earth-dashboard.tsx`
- `/discoveries`: Saved discoveries and discovery timeline, implemented by `src/app/discoveries/page.tsx` and `src/components/discoveries/discovery-timeline-page.tsx`
- `/dashboard`: Saved discoveries dashboard, implemented by `src/app/dashboard/page.tsx` and `src/components/dashboard/saved-discoveries-dashboard.tsx`
- `/gallery`: NASA Gallery, implemented by `src/app/gallery/page.tsx` and `src/components/gallery/nasa-gallery.tsx`
- `/image-explorer`: NASA Image Explorer, implemented by `src/app/image-explorer/page.tsx` and `src/components/image-explorer/nasa-image-explorer.tsx`
- `/apod`: APOD editorial page, implemented by `src/app/apod/page.tsx` and `src/components/apod/apod-page.tsx`
- `/solar-system`: Solar System, implemented by `src/app/solar-system/page.tsx` and `src/components/solar-system/solar-system-explorer.tsx`
- `/mission-control`: Personalized Mission Control dashboard, implemented by `src/app/mission-control/page.tsx` and `src/components/mission-control/mission-control-dashboard.tsx`
- `/blog`: Blog index, implemented by `src/app/blog/page.tsx` and `src/components/blog/blog-index.tsx`
- `/blog/[slug]`: Blog article page, implemented by `src/app/blog/[slug]/page.tsx`

Shared systems:

- Global styling: `src/app/globals.css`
- Navigation and layout: `src/app/layout.tsx`, route-level components, and auth nav helpers
- Glass utilities and primitives: `src/components/ui/*`
- AI backend: `src/app/api/ai/chat/route.ts`, `src/services/openai/chat.service.ts`
- NASA/OpenAlex services: `src/services/nasa/*`, `src/lib/openalex.ts`
- Retention/local saved data: `src/lib/cosmos-retention.ts`, `src/lib/saved-discoveries.ts`, `src/components/saved/save-discovery-button.tsx`

## Phase Strategy

### Phase 1: First Impression, Trust, And Critical Usability

Objective: Fix the most visible issues that affect user trust within the first session. This phase should be completed before new feature work.

### Phase 2: Ask COSMOS Conversation Quality

Objective: Make Ask COSMOS feel like the core product, not a secondary chat widget.

### Phase 3: Retention And Daily-Use Polish

Objective: Improve saved discoveries, achievements, Earth Dashboard, and Daily Briefing so users have clear reasons to return.

### Phase 4: Media, Blog, And Content Depth

Objective: Improve discovery surfaces without replacing NASA imagery or diluting the product.

### Phase 5: Global Design System, Performance, And Accessibility

Objective: Consolidate spacing, motion, typography, loading states, and Core Web Vitals across the app.

---

# Phase 1: First Impression, Trust, And Critical Usability

## UX-001: Homepage Hero Has Excessive Vertical Spacing

- Priority: Critical
- Affected route: `/`
- Affected component: `src/components/home/cosmos-home.tsx`
- Proposed fix: Reduce top and bottom hero padding, ensure the hero headline, subtitle, and CTAs appear above the fold on desktop and mobile, and preserve enough breathing room for the cinematic background.
- Implementation risk: Medium. Hero layout changes can affect first viewport composition, navbar overlap, and mobile readability.
- Test checklist:
  - Verify `/` at 390px, 768px, 1440px, and wide desktop.
  - Confirm headline and main CTAs are visible without scrolling on common laptop viewports.
  - Confirm no horizontal overflow.
  - Confirm navbar does not cover hero text.

## UX-002: Homepage Hero Typography Collision

- Priority: Critical
- Affected route: `/`
- Affected component: `src/components/home/cosmos-home.tsx`
- Proposed fix: Audit line-height, max-width, responsive font sizes, and CTA spacing in the hero. Avoid oversized text that collides with surrounding visual layers or buttons.
- Implementation risk: Medium. Typography changes can alter brand perception and hero rhythm.
- Test checklist:
  - Check hero headline wrapping on mobile and desktop.
  - Confirm no text overlaps with CTA buttons or background badges.
  - Confirm text remains readable over glow/ray layers.

## UX-003: Ask COSMOS Button Padding Issue

- Priority: High
- Affected routes: `/`, `/ask`, shared CTAs across site
- Affected components: `src/components/home/cosmos-home.tsx`, `src/components/assistant/cosmos-assistant.tsx`, `src/components/ui/button.tsx`
- Proposed fix: Standardize CTA padding and minimum tap target sizes. Ensure Ask COSMOS labels are vertically centered and not cramped.
- Implementation risk: Low. Shared button updates can improve consistency but must be checked across all pages.
- Test checklist:
  - Verify Ask COSMOS CTA on homepage, briefing, image explorer, APOD, and nav.
  - Confirm mobile tap targets are at least 44px high.
  - Confirm icons and labels align.

## UX-004: Homepage Needs Richer Visual Introduction

- Priority: High
- Affected route: `/`
- Affected component: `src/components/home/cosmos-home.tsx`
- Proposed fix: Add richer but lightweight NASA-oriented visual context in the first two sections: stronger AI identity, mission-control framing, preview imagery, and concise explanation of what COSMOS does.
- Implementation risk: Medium. Additional visuals must not reintroduce heavy WebGL or slow LCP.
- Test checklist:
  - Confirm no new external image 404s.
  - Confirm LCP remains healthy.
  - Confirm first viewport explains COSMOS AI clearly.

## UX-005: AI Logo Should Become A Main Visual Attraction

- Priority: High
- Affected route: `/`
- Affected components: `src/components/home/cosmos-home.tsx`, global branding/navigation
- Proposed fix: Elevate COSMOS AI identity with a refined logo lockup or AI orb/mark treatment in the hero. Keep it lightweight with CSS/SVG or existing assets.
- Implementation risk: Medium. Brand/logo changes affect every first impression and navigation consistency.
- Test checklist:
  - Confirm logo is crisp on retina and mobile.
  - Confirm no layout shift from logo load.
  - Confirm nav logo and hero logo do not feel redundant.

## UX-006: Homepage Needs Better Introduction Copy

- Priority: High
- Affected route: `/`
- Affected component: `src/components/home/cosmos-home.tsx`
- Proposed fix: Add a short, clear introduction near the top explaining that COSMOS combines NASA data, daily briefings, media discovery, research grounding, and AI explanations.
- Implementation risk: Low. Copy changes are low risk but should not make the hero feel text-heavy.
- Test checklist:
  - Confirm intro can be understood in under 10 seconds.
  - Confirm no generic SaaS language.
  - Confirm mobile layout remains compact.

## UX-007: Remove Unnecessary Full Stops From Short UI Headlines

- Priority: Medium
- Affected routes: Global
- Affected components: Homepage sections, cards, CTA labels, dashboard widgets
- Proposed fix: Audit short labels and UI headlines. Remove terminal periods where the text functions as a label, not a sentence.
- Implementation risk: Low. Main risk is over-editing article/body copy where punctuation is appropriate.
- Test checklist:
  - Review homepage, Ask, Earth, Briefing, Dashboard, Gallery, Image Explorer.
  - Preserve punctuation in paragraphs and NASA descriptions.

## UX-008: View Daily Briefing Button Needs Subtle Animation

- Priority: Medium
- Affected route: `/`
- Affected component: `src/components/home/cosmos-home.tsx`
- Proposed fix: Add a light hover/tap treatment such as shimmer, arrow motion, or glow pulse to the View Daily Briefing CTA. Respect reduced motion.
- Implementation risk: Low. Must avoid over-glow and layout shift.
- Test checklist:
  - Confirm animation pauses or simplifies with `prefers-reduced-motion`.
  - Confirm hover/focus states are accessible.
  - Confirm button remains readable.

---

# Phase 2: Ask COSMOS Conversation Quality

## UX-009: AI Input Should Be Immediately Visible

- Priority: Critical
- Affected route: `/ask`
- Affected component: `src/components/assistant/cosmos-assistant.tsx`
- Proposed fix: Keep the main input in the hero/top command area. Reduce pre-input content and make the input the central product object on first load.
- Implementation risk: Medium. Moving input can affect existing chat state, sticky behavior, and mobile keyboard layout.
- Test checklist:
  - Verify input is visible above the fold on mobile and desktop.
  - Confirm keyboard focus does not cause layout jump.
  - Confirm suggested prompts remain accessible below input.

## UX-010: Assistant Answer Appears Too Far Below User Message

- Priority: Critical
- Affected route: `/ask`
- Affected component: `src/components/assistant/cosmos-assistant.tsx`
- Proposed fix: Reduce vertical gap between user bubble and assistant response. Keep source cards and related questions close to the response they belong to.
- Implementation risk: Low-medium. Spacing changes could make long answers feel dense.
- Test checklist:
  - Send a prompt and verify response begins close to the user bubble.
  - Test short and long answers.
  - Confirm source cards remain associated with the correct answer.

## UX-011: Chat Should Feel More Interactive

- Priority: High
- Affected route: `/ask`
- Affected component: `src/components/assistant/cosmos-assistant.tsx`
- Proposed fix: Improve micro-interactions for sending, streaming, copying, regenerating, and selecting suggested follow-up questions. Use 150-250ms CSS/Framer transitions only.
- Implementation risk: Medium. Extra motion can hurt performance if overused.
- Test checklist:
  - Verify send, copy, regenerate, clear, and prompt chip interactions.
  - Confirm reduced-motion behavior.
  - Confirm no duplicate requests are sent.

## UX-012: Better Response Relevance

- Priority: High
- Affected route: `/ask`
- Affected components: `src/app/api/ai/chat/route.ts`, `src/services/openai/chat.service.ts`, `src/services/ai/research-tools.service.ts`
- Proposed fix: Continue tuning prompt routing, OpenAlex filtering, NASA context selection, and answer templates. Keep answers concise and source-aware.
- Implementation risk: Medium-high. Prompt changes can improve one mode while hurting another.
- Test checklist:
  - Test "Tell me about Venus".
  - Test "Summarize recent black hole research papers".
  - Test "Find latest JWST galaxy research".
  - Test "How do I find the next ISS flyover?"
  - Test "Explain today's APOD like I'm a student".

## UX-013: Better NASA Grounding

- Priority: High
- Affected route: `/ask`
- Affected components: AI route/service, source cards, `src/components/assistant/research-source-card.tsx`
- Proposed fix: Expand visible NASA source cards for APOD, NeoWs, DONKI, Mars Rover, Image Library, ISS, NOAA SWPC, and OpenAlex where available.
- Implementation risk: Medium-high. Requires careful source metadata handling and no fabricated links.
- Test checklist:
  - Confirm APOD prompts show APOD source.
  - Confirm asteroid prompts show NeoWs source.
  - Confirm briefing prompts show DONKI/NeoWs/APOD when available.
  - Confirm no source card appears for unavailable data unless clearly labeled.

## UX-014: Suggested Follow-Up Questions After Replies

- Priority: High
- Affected route: `/ask`
- Affected component: `src/components/assistant/cosmos-assistant.tsx`
- Proposed fix: Ensure every assistant answer ends with three useful follow-up questions and render them as clickable chips that can populate/send the next prompt.
- Implementation risk: Medium. Must avoid recursively sending duplicate prompts unintentionally.
- Test checklist:
  - Confirm follow-up chips appear after streamed and fallback responses.
  - Confirm clicking a chip behaves consistently.
  - Confirm chips wrap cleanly on mobile.

## UX-015: Remove Duplicate Ask COSMOS Floating Button On Ask Page

- Priority: High
- Affected route: `/ask`
- Affected components: `src/components/assistant/cosmos-assistant.tsx`, any global floating Ask CTA if present
- Proposed fix: Hide or disable the sitewide floating Ask COSMOS trigger when already on `/ask`. Keep it available on other routes.
- Implementation risk: Low. Must ensure global CTA still appears elsewhere.
- Test checklist:
  - Verify `/ask` has no duplicate floating Ask button.
  - Verify `/`, `/briefing`, `/apod`, `/gallery`, and `/image-explorer` still expose an Ask route/action.

## UX-016: Make Ask COSMOS Button Dynamic Across Site

- Priority: High
- Affected routes: Global, especially `/apod`, `/briefing`, `/image-explorer`, `/gallery`, `/earth`
- Affected components: page-specific Ask CTAs, `src/components/saved/save-discovery-button.tsx` if reused, assistant route-link helpers
- Proposed fix: Make Ask buttons pass useful context through query params or local handoff state, such as APOD title, NASA image metadata, asteroid summary, or briefing section.
- Implementation risk: Medium. Must avoid exposing raw data or creating overly long URLs.
- Test checklist:
  - From APOD, Ask COSMOS opens with APOD context.
  - From Image Explorer media viewer, Ask opens with media title/description.
  - From Briefing section, Ask opens with selected briefing topic.
  - No hidden AI call happens until user explicitly sends.

## UX-017: Better Loading And Thinking State

- Priority: High
- Affected route: `/ask`
- Affected component: `src/components/assistant/cosmos-assistant.tsx`
- Proposed fix: Replace technical loading states with professional sequence text: "Analyzing NASA data", "Checking research sources", "Preparing response". Keep streaming animation lightweight.
- Implementation risk: Low-medium. Need to avoid fake claims if no source lookup happened.
- Test checklist:
  - Verify loading state appears immediately after send.
  - Verify wording matches actual mode/context.
  - Verify error state is friendly and non-technical.

## UX-018: No Developer-Facing Fallback Messages

- Priority: Critical
- Affected route: `/ask`
- Affected components: `src/components/assistant/cosmos-assistant.tsx`, `src/services/openai/chat.service.ts`
- Proposed fix: Continue removing phrases like "Fallback Mode", "OpenAI credits", "static NASA context", raw prompt rules, and infrastructure details from user-visible copy.
- Implementation risk: Low. The main risk is hiding useful troubleshooting detail from developers; keep details server-side only.
- Test checklist:
  - Disable AI key locally and send a prompt.
  - Trigger rate limit locally.
  - Confirm user sees professional messages only.
  - Confirm server logs still retain useful diagnostics.

## UX-019: Improve AI Response Typography

- Priority: High
- Affected route: `/ask`
- Affected component: `src/components/assistant/cosmos-assistant.tsx`
- Proposed fix: Tune markdown rendering for headings, bullets, links, code blocks, paragraphs, citations, and source sections. Keep line length comfortable.
- Implementation risk: Medium. Markdown rendering changes can affect all responses.
- Test checklist:
  - Verify headings render distinctly.
  - Verify lists are spaced well.
  - Verify links are visible and accessible.
  - Verify mobile text is readable.

## UX-020: Improve Conversation Layout

- Priority: High
- Affected route: `/ask`
- Affected component: `src/components/assistant/cosmos-assistant.tsx`
- Proposed fix: Align user bubbles right and COSMOS bubbles left, reduce max-width on desktop, improve message rhythm, and keep source cards directly under assistant responses.
- Implementation risk: Medium. Can affect saved local message rendering.
- Test checklist:
  - Verify existing saved messages still display.
  - Confirm no message overlaps on mobile.
  - Confirm source cards do not detach from responses.

## UX-021: Add Citations And Sources When Available

- Priority: High
- Affected route: `/ask`
- Affected components: AI route/service, source card rendering
- Proposed fix: Render source cards for NASA/OpenAlex/arXiv/Wikipedia/ISS/NOAA data and keep citations clearly separated from generated explanation.
- Implementation risk: Medium-high. Source generation must avoid hallucination.
- Test checklist:
  - Confirm sources are only shown when returned by services.
  - Confirm source links open correctly.
  - Confirm missing source data says "No source attached" or equivalent.

---

# Phase 3: Retention And Daily-Use Polish

## UX-022: Saved Discoveries Label And Title Spacing

- Priority: High
- Affected routes: `/dashboard`, `/discoveries`
- Affected components: `src/components/dashboard/saved-discoveries-dashboard.tsx`, `src/components/discoveries/discovery-timeline-page.tsx`
- Proposed fix: Reduce spacing between metadata label and saved item title. Make card hierarchy clearer with label, title, description, source/action row.
- Implementation risk: Low.
- Test checklist:
  - Verify saved APOD, image, planet, briefing item layouts.
  - Verify mobile cards do not become cramped.

## UX-023: Right-Side Statistics Cards Too Small

- Priority: Medium
- Affected routes: `/dashboard`, possibly `/account`
- Affected components: `src/components/dashboard/saved-discoveries-dashboard.tsx`, `src/components/account/activity-metrics.tsx`
- Proposed fix: Increase card size, typography, and hierarchy for statistics. Prioritize current streak, saved count, total discoveries, and recent activity.
- Implementation risk: Low-medium. Grid changes can affect dashboard balance.
- Test checklist:
  - Verify desktop right rail.
  - Verify tablet stacking.
  - Verify mobile single-column behavior.

## UX-024: Saved Discoveries Empty State Needs Recommendations

- Priority: High
- Affected routes: `/dashboard`, `/discoveries`
- Affected components: dashboard/discovery empty state components
- Proposed fix: Replace sparse empty state with educational explanation, recommended first actions, recent NASA suggestions, and links to APOD, Image Explorer, Solar System, and Briefing.
- Implementation risk: Medium. Must not show fake saved items.
- Test checklist:
  - Clear localStorage and view logged-out state.
  - View logged-in state with no saved items.
  - Confirm recommendations are real links.

## UX-025: Better Saved Item Cards

- Priority: High
- Affected routes: `/dashboard`, `/discoveries`
- Affected components: saved discovery cards, `src/components/saved/save-discovery-button.tsx`
- Proposed fix: Add clearer item type badges, source links, image thumbnails when available, delete/save state, and compact metadata.
- Implementation risk: Medium. Must preserve localStorage and Supabase paths.
- Test checklist:
  - Save APOD, NASA image, planet, and briefing.
  - Confirm cards render with and without images.
  - Confirm delete works in localStorage and signed-in modes.

## UX-026: Better Local Vs Signed-In State Explanation

- Priority: Medium
- Affected routes: `/dashboard`, `/discoveries`, `/account`
- Affected components: saved dashboards and account components
- Proposed fix: Explain that logged-out saves are local to this browser, while signed-in saves sync through the account. Keep copy concise and user-friendly.
- Implementation risk: Low.
- Test checklist:
  - Verify logged-out state copy.
  - Verify signed-in state copy.
  - Confirm no service-role or auth implementation details are exposed.

## UX-027: Achievement Text Too Small

- Priority: Medium
- Affected routes: `/dashboard`, `/discoveries`, possibly `/account`
- Affected components: achievement/badge sections if present in retention/dashboard components
- Proposed fix: Increase achievement card typography, icon size, and contrast. Keep badges scannable on mobile.
- Implementation risk: Low.
- Test checklist:
  - Verify badges at mobile and desktop.
  - Confirm small text passes contrast/readability checks.

## UX-028: Add Unlock Guidance And Achievement Path

- Priority: Medium
- Affected routes: `/dashboard`, `/discoveries`
- Affected components: retention/dashboard achievement sections
- Proposed fix: Add "How to unlock" text and a simple progression path, such as save APOD, explore Mars, ask a research question, open briefing three days.
- Implementation risk: Medium. Needs honest progress tracking, no fake unlocked state.
- Test checklist:
  - New user sees locked badge guidance.
  - Returning user sees progress based on actual local/account activity.

## UX-029: Add More Distinct Badges

- Priority: Medium
- Affected routes: `/dashboard`, `/discoveries`
- Affected components: achievement/badge registry if present or newly factored retention data
- Proposed fix: Expand badges such as APOD Explorer, Mars Researcher, Asteroid Hunter, Planet Expert, Research Reader, Daily Briefing Regular.
- Implementation risk: Medium. Requires stable event tracking schema.
- Test checklist:
  - Badge criteria are documented.
  - Badges do not unlock without corresponding user action.

## UX-030: Achievement Cards Need Distinct Colors And Backgrounds

- Priority: Low-medium
- Affected routes: `/dashboard`, `/discoveries`
- Affected components: achievement cards
- Proposed fix: Use restrained category accents: APOD cyan, Mars red, asteroid amber, research violet, planet blue, briefing green. Avoid rainbow overload.
- Implementation risk: Low.
- Test checklist:
  - Check contrast in dark theme.
  - Verify colors remain premium and consistent.

## UX-031: Achievements Should Be Shareable

- Priority: Low-medium
- Affected routes: `/dashboard`, `/discoveries`
- Affected components: achievement cards, share utility if added later
- Proposed fix: Add share card generation or native share for unlocked achievements. Use clear route/share metadata and avoid requiring login for local share.
- Implementation risk: Medium. Share-card generation can add complexity and image rendering edge cases.
- Test checklist:
  - Verify native share on mobile.
  - Verify copy/share fallback on desktop.
  - Confirm no private account data is shared accidentally.

## UX-032: Earth Image Visual Too Small

- Priority: High
- Affected route: `/earth`
- Affected component: `src/components/earth/live-earth-dashboard.tsx`
- Proposed fix: Increase main Earth visual prominence in the Live Earth card while preserving the existing dashboard grid. Use responsive image sizing and avoid cartoon fallback unless necessary.
- Implementation risk: Medium. Large image area can push metrics below the fold.
- Test checklist:
  - Verify 1440px desktop matches premium dashboard expectation.
  - Verify mobile does not crop essential content.
  - Confirm image paths have no 404s.

## UX-033: Open Briefing Button Should Remain Single-Line

- Priority: Medium
- Affected route: `/earth`
- Affected component: `src/components/earth/live-earth-dashboard.tsx`
- Proposed fix: Adjust button width, whitespace, and responsive wrapping so "Open Briefing" remains on one line.
- Implementation risk: Low.
- Test checklist:
  - Verify 320px, 390px, and desktop widths.
  - Confirm no horizontal overflow.

## UX-034: People In Space Needs Expandable Details

- Priority: High
- Affected route: `/earth`
- Affected component: `src/components/earth/live-earth-dashboard.tsx`
- Proposed fix: Make People in Space card expandable to list astronaut names and spacecraft, using the existing `/api/earth/people-in-space` route.
- Implementation risk: Low-medium. Needs polling state and accessible disclosure behavior.
- Test checklist:
  - Verify expand/collapse with keyboard.
  - Verify data refresh does not close unexpectedly.
  - Verify unavailable state is clean.

## UX-035: Global Weather Should Support Timezone And Location Change

- Priority: Medium-high
- Affected route: `/earth`
- Affected components: Earth dashboard UI and earth/weather service
- Proposed fix: Add location selector or coordinates input for weather monitoring point, defaulting to Delhi, India. Show local timezone and UTC where relevant.
- Implementation risk: Medium-high. Adds state, validation, and possible API request changes.
- Test checklist:
  - Verify default Delhi weather.
  - Verify custom location handles invalid values.
  - Verify timezone display is clear.

## UX-036: Earth Dashboard Needs More Facts And Contextual Explanations

- Priority: Medium
- Affected route: `/earth`
- Affected component: `src/components/earth/live-earth-dashboard.tsx`
- Proposed fix: Add concise explanations for Kp index, ISS altitude/velocity, sidereal day, cloud cover, and what each status means.
- Implementation risk: Low-medium. Must avoid making cards text-heavy.
- Test checklist:
  - Verify explanations are visible via tooltip, expandable details, or concise text.
  - Confirm no fake live claims.

## UX-037: Improve Live Widget Hierarchy

- Priority: High
- Affected route: `/earth`
- Affected component: `src/components/earth/live-earth-dashboard.tsx`
- Proposed fix: Rank widgets by user importance: Earth visual, mission alerts, ISS/people, solar activity, weather, rotation. Use stronger headings and status badges.
- Implementation risk: Medium. Layout changes can affect the reference-inspired dashboard balance.
- Test checklist:
  - Verify first glance communicates status.
  - Verify live/unavailable/demo labels are honest.

## UX-038: Briefing Page Has Excessive Top Spacing

- Priority: High
- Affected route: `/briefing`
- Affected component: `src/components/briefing/mission-control-briefing.tsx`
- Proposed fix: Reduce gap between page head and first content card. Keep hero/dashboard rhythm compact like mission control.
- Implementation risk: Low-medium.
- Test checklist:
  - Verify first meaningful briefing content appears above fold.
  - Confirm mobile top spacing is not excessive.

## UX-039: Briefing Page Has Too Many Ask COSMOS Buttons

- Priority: High
- Affected route: `/briefing`
- Affected component: `src/components/briefing/mission-control-briefing.tsx`
- Proposed fix: Reduce repeated Ask buttons into one primary Ask CTA and contextual secondary links. Keep per-section Ask actions only where they pass useful context.
- Implementation risk: Medium. Removing CTAs can reduce perceived interactivity if not replaced with clearer hierarchy.
- Test checklist:
  - Count visible Ask CTAs on desktop and mobile.
  - Confirm at least one clear Ask action remains.
  - Confirm contextual Ask actions work when present.

## UX-040: Briefing CTA Hierarchy Needs Improvement

- Priority: Medium-high
- Affected route: `/briefing`
- Affected component: `src/components/briefing/mission-control-briefing.tsx`
- Proposed fix: Define one primary action per section and demote secondary actions. Use consistent button variants for Ask, Explore, Open Source, and Save.
- Implementation risk: Medium.
- Test checklist:
  - Verify page has a clear primary CTA.
  - Verify no section has competing equal-weight buttons.
  - Verify all CTAs work or are clearly disabled.

---

# Phase 4: Media, Blog, And Content Depth

## UX-041: Blog Content Feels Limited

- Priority: Medium
- Affected routes: `/blog`, `/blog/[slug]`
- Affected components: `src/components/blog/blog-index.tsx`, `src/content/blog/posts.ts`
- Proposed fix: Add more team-written posts across Space Science, NASA Data, AI, Astronomy, Research Notes, and COSMOS Updates. Improve editorial cadence.
- Implementation risk: Low-medium. Content quality is the main risk.
- Test checklist:
  - Verify new posts follow `src/content/blog/README.md`.
  - Verify tags, categories, reading time, and slugs work.

## UX-042: Blog Needs Graphics, Images, And Diagrams

- Priority: Medium
- Affected routes: `/blog`, `/blog/[slug]`
- Affected components: blog content and article rendering
- Proposed fix: Add optional featured images, diagrams, NASA source images, and simple explanatory illustrations where useful.
- Implementation risk: Medium. Image licensing, asset paths, and performance need care.
- Test checklist:
  - Confirm local or NASA images load correctly.
  - Confirm image alt text is present.
  - Confirm article LCP remains acceptable.

## UX-043: Blog Section Should Feel More Creative

- Priority: Medium
- Affected route: `/blog`
- Affected component: `src/components/blog/blog-index.tsx`
- Proposed fix: Improve blog cards with editorial layout, category grouping, featured article, and visual hierarchy while preserving performance.
- Implementation risk: Medium.
- Test checklist:
  - Verify blog index feels like a publication, not a generic list.
  - Verify mobile card layout.

## UX-044: Blog Titles Need Improvement

- Priority: Low-medium
- Affected route: `/blog`
- Affected component: `src/content/blog/posts.ts`
- Proposed fix: Rewrite titles to be more specific, useful, and curiosity-driving while staying accurate.
- Implementation risk: Low.
- Test checklist:
  - Confirm titles match article content.
  - Confirm no clickbait or unsupported claims.

## UX-045: Add More Video Content Later

- Priority: Low
- Affected routes: `/blog`, `/gallery`, `/image-explorer`
- Affected components: blog articles, media viewer
- Proposed fix: Plan video embeds or NASA video references after performance and content strategy are stable. Do not add autoplay or heavy embeds by default.
- Implementation risk: Medium-high if implemented too early.
- Test checklist:
  - Confirm videos are lazy-loaded.
  - Confirm captions/transcripts where available.
  - Confirm no layout shift.

## UX-046: Image Explorer And Gallery Have Excessive Spacing

- Priority: High
- Affected routes: `/gallery`, `/image-explorer`
- Affected components: `src/components/gallery/nasa-gallery.tsx`, `src/components/image-explorer/nasa-image-explorer.tsx`
- Proposed fix: Tighten spacing between search controls, filters, media grid, and detail panels. Keep grouping clear rather than removing useful controls.
- Implementation risk: Medium. Dense layouts can reduce premium feel if over-tightened.
- Test checklist:
  - Verify search/filter area at mobile and desktop.
  - Verify cards do not feel crowded.
  - Verify first results appear sooner.

## UX-047: "Archive, In Motion" Should Stay One Line On Desktop

- Priority: Medium
- Affected route: `/gallery`
- Affected component: `src/components/gallery/nasa-gallery.tsx`
- Proposed fix: Adjust heading max-width, font size, or `whitespace` behavior so the phrase remains one line on desktop while still wrapping naturally on mobile.
- Implementation risk: Low.
- Test checklist:
  - Verify heading at 1024px, 1440px, and wide desktop.
  - Verify mobile wraps cleanly.

## UX-048: Too Many Media Elements Need Better Grouping

- Priority: High
- Affected routes: `/gallery`, `/image-explorer`
- Affected components: gallery/image explorer controls and viewer
- Proposed fix: Group controls into search, filters, categories, and actions. Use section headings, segmented controls, or collapsible advanced filters where appropriate.
- Implementation risk: Medium. Must preserve discoverability.
- Test checklist:
  - Verify filter controls are understandable.
  - Confirm no feature is hidden without a clear affordance.

## UX-049: Image Grid Feels Cluttered

- Priority: High
- Affected routes: `/gallery`, `/image-explorer`
- Affected components: media card grids
- Proposed fix: Improve card hierarchy with stronger image aspect ratios, less overlay noise, clearer metadata, lazy loading, and better hover/focus states.
- Implementation risk: Medium-high. Media grids are content-heavy and performance-sensitive.
- Test checklist:
  - Verify image cards lazy-load.
  - Verify hover states are subtle and accessible.
  - Verify keyboard focus opens media viewer.
  - Verify grid performs with many results.

## UX-050: Do Not Replace NASA Images With GIFs

- Priority: Critical
- Affected routes: `/gallery`, `/image-explorer`, `/apod`, `/`
- Affected components: NASA media cards and previews
- Proposed fix: Keep NASA images as the primary visual asset. Improve layout, lazy loading, hover states, metadata, and hierarchy rather than substituting animated GIFs.
- Implementation risk: Low if treated as a rule, high if ignored.
- Test checklist:
  - Confirm NASA image sources remain visible.
  - Confirm no unrelated GIFs replace NASA content.
  - Confirm animated media is shown only when it is NASA source media or explicitly relevant.

---

# Phase 5: Global Design System, Performance, And Accessibility

## UX-051: Button Padding Consistency

- Priority: High
- Affected routes: Global
- Affected components: `src/components/ui/button.tsx`, custom route buttons, `glass-button`
- Proposed fix: Define button size variants and apply them consistently across CTAs, icon buttons, nav actions, and dashboard controls.
- Implementation risk: Medium. Many pages use hand-styled links/buttons.
- Test checklist:
  - Audit primary, secondary, ghost, icon, and compact buttons.
  - Confirm 44px mobile tap target where possible.
  - Confirm no label clipping.

## UX-052: Reduce Overpowering Glow

- Priority: High
- Affected routes: Global
- Affected components: `src/app/globals.css`, homepage, briefing, dashboard cards
- Proposed fix: Tone down excessive shadow/glow on cards and backgrounds. Keep blue/cyan glow as an accent, not a haze over content.
- Implementation risk: Medium. Glow is part of the COSMOS identity, so reduction must be calibrated.
- Test checklist:
  - Verify readability over dark background.
  - Check high-DPI desktop and mobile OLED screens.
  - Confirm hover/focus states remain visible.

## UX-053: Increase Small Text Readability

- Priority: High
- Affected routes: Global, especially `/earth`, `/briefing`, `/dashboard`, `/gallery`, `/image-explorer`
- Affected components: card metadata, badges, captions, source labels
- Proposed fix: Increase minimum font sizes, line-height, contrast, and label spacing. Avoid tiny all-caps text for critical information.
- Implementation risk: Medium. Larger text can affect dense dashboards.
- Test checklist:
  - Check 320px and 390px mobile widths.
  - Verify contrast for muted text.
  - Confirm metadata remains scannable.

## UX-054: Consistent Spacing Scale

- Priority: High
- Affected routes: Global
- Affected components: route section wrappers, cards, headers, grids
- Proposed fix: Define a tighter spacing scale for page headers, section gaps, card padding, and grid gaps. Apply incrementally route by route.
- Implementation risk: Medium-high. Spacing is widespread and can create regressions.
- Test checklist:
  - Compare `/`, `/ask`, `/briefing`, `/earth`, `/dashboard`, `/gallery`, `/image-explorer`.
  - Confirm no cramped mobile layouts.

## UX-055: Better Mobile Touch Targets

- Priority: High
- Affected routes: Global
- Affected components: nav, buttons, media viewer controls, Solar System controls, dashboard widgets
- Proposed fix: Ensure interactive controls meet touch target expectations, with visible focus and enough spacing.
- Implementation risk: Medium. Some dense controls may need layout changes.
- Test checklist:
  - Test on mobile viewport with keyboard where relevant.
  - Confirm media viewer controls are reachable.
  - Confirm Solar System controls do not overlap.

## UX-056: Consistent Animation Rules

- Priority: Medium-high
- Affected routes: Global
- Affected components: Framer Motion sections, card hovers, starfield, shader hero, timeline
- Proposed fix: Establish motion durations and easing rules. Use reduced-motion fallbacks. Avoid competing animations in the same viewport.
- Implementation risk: Medium. Motion changes can affect perceived premium quality.
- Test checklist:
  - Enable `prefers-reduced-motion` and verify simplified behavior.
  - Confirm no animation causes layout shift.
  - Confirm route pages do not feel laggy.

## UX-057: Accessibility And Contrast Improvements

- Priority: High
- Affected routes: Global
- Affected components: nav, forms, chat, media cards, dashboards, modals
- Proposed fix: Audit headings, labels, aria attributes, keyboard navigation, focus rings, link text, and contrast. Prioritize interactive controls and modals.
- Implementation risk: Medium.
- Test checklist:
  - Navigate key routes by keyboard.
  - Confirm focus indicator is visible.
  - Verify modals trap/focus correctly where applicable.
  - Check contrast for small muted text.

## UX-058: Mobile Page Transitions Feel Laggy

- Priority: High
- Affected routes: Global
- Affected components: app layout, route loading, heavy client pages
- Proposed fix: Add lightweight route loading states, reduce blocking JS on first paint, and avoid full-page heavy animations during navigation.
- Implementation risk: Medium-high. Requires profiling and careful dynamic import choices.
- Test checklist:
  - Navigate among `/`, `/ask`, `/briefing`, `/gallery`, `/image-explorer`, `/earth` on mobile.
  - Confirm loading indicator appears for slower routes.
  - Confirm route changes do not freeze.

## UX-059: Route Changes Need Smoother Loading States

- Priority: Medium-high
- Affected routes: Global
- Affected components: `src/app/loading.tsx`, route loaders such as gallery/image-explorer/solar-system loaders
- Proposed fix: Add consistent skeleton/loading surfaces for routes that fetch data or lazy-load large client components.
- Implementation risk: Medium.
- Test checklist:
  - Verify route loading state is branded but lightweight.
  - Confirm skeleton does not misrepresent actual layout.

## UX-060: Break Large Components Into Smaller Components

- Priority: High
- Affected components:
  - `src/components/solar-system/solar-system-explorer.tsx`
  - `src/components/image-explorer/nasa-image-explorer.tsx`
  - `src/components/briefing/mission-control-briefing.tsx`
  - `src/components/assistant/cosmos-assistant.tsx`
  - `src/components/home/cosmos-home.tsx`
- Proposed fix: Split large files by data, layout, cards, modals, hooks, and view models. Keep behavior unchanged during refactor.
- Implementation risk: High. Refactors can introduce subtle state regressions.
- Test checklist:
  - Run lint, typecheck, build after each component split.
  - Smoke test affected route behavior.
  - Verify no UI redesign slips into refactor.

## UX-061: Add Skeleton Loaders Where Needed

- Priority: Medium-high
- Affected routes: `/briefing`, `/earth`, `/gallery`, `/image-explorer`, `/mission-control`, `/solar-system`
- Affected components: route loaders and data cards
- Proposed fix: Add skeletons for data cards and grids where loading currently feels empty or jumpy.
- Implementation risk: Medium. Skeletons can add clutter if overused.
- Test checklist:
  - Throttle network and verify loading states.
  - Confirm skeleton size matches final content.

## UX-062: Reduce Unnecessary Heavy Animations

- Priority: High
- Affected routes: Global, especially `/`, `/ask`, `/solar-system`
- Affected components: visual backgrounds, starfield, shader hero, Three.js
- Proposed fix: Keep current clean approach: no Strands, LaserFlow, MagicRings, BlackHoleLens, SupernovaBurst, GalaxySpiral, or unstable WebGL effects on content pages. Use CSS-first motion and pause offscreen animations.
- Implementation risk: Medium. Removing too much atmosphere can make the site feel plain; keep subtle cinematic depth.
- Test checklist:
  - Confirm homepage has no WebGL warnings except intended hero if retained.
  - Confirm mobile CPU/GPU load feels smooth.
  - Confirm reduced motion disables non-essential effects.

## UX-063: Improve Core Web Vitals

- Priority: High
- Affected routes: `/`, `/ask`, `/gallery`, `/image-explorer`, `/solar-system`, `/briefing`
- Affected components: large client components, images, data fetches, visual effects
- Proposed fix: Profile LCP, INP, CLS, and Total Blocking Time. Lazy-load below-the-fold sections, optimize image sizes, split large components, and reduce repeated background work.
- Implementation risk: High. Requires measurement and careful regression testing.
- Test checklist:
  - Run Lighthouse desktop and mobile.
  - Inspect bundle output.
  - Confirm no layout shifts in hero/media grids.
  - Confirm route-level performance does not regress.

---

# Dependency And Safety Notes

- Do not replace NASA media with non-NASA GIFs or decorative stock assets.
- Do not add heavy WebGL/canvas animations to solve visual issues.
- Do not make hidden paid AI calls. AI requests must follow explicit user actions.
- Do not expose server-only keys in client components.
- Do not weaken OpenAlex/NASA source-grounding rules.
- Keep Supabase account functionality and saved-discovery behavior intact.
- Keep existing routes working during every phase.

# Suggested Phase Order

1. Phase 1: Homepage first impression and CTA fixes.
2. Phase 2: Ask COSMOS input placement, chat layout, source visibility, and fallback copy.
3. Phase 3: Saved discoveries, achievements, Earth Dashboard, and Briefing polish.
4. Phase 5: Global spacing, buttons, accessibility, and performance pass.
5. Phase 4: Blog and media content depth after core UX is stable.

# Top 10 Fixes To Implement First

1. `UX-009`: Move Ask COSMOS input above the fold on `/ask`.
2. `UX-001`: Reduce excessive homepage hero spacing.
3. `UX-002`: Fix homepage hero typography collisions.
4. `UX-010`: Reduce the gap between user messages and assistant answers.
5. `UX-018`: Remove all developer-facing fallback/infrastructure messages from user-visible AI states.
6. `UX-021`: Show citations/source cards when NASA/OpenAlex/arXiv/Wikipedia/ISS/NOAA context is available.
7. `UX-015`: Remove duplicate Ask COSMOS floating button on the Ask page.
8. `UX-039`: Reduce repeated Ask COSMOS buttons on the Briefing page and improve CTA hierarchy.
9. `UX-046`: Tighten Image Explorer/Gallery spacing and control grouping without removing NASA content.
10. `UX-051`: Standardize button padding and touch targets globally.

# Definition Of Done For Each Fix

Every issue should be considered complete only when:

- The fix is implemented without redesigning unrelated surfaces.
- All visible buttons either work or are clearly disabled/coming soon.
- Mobile and desktop layouts are checked.
- Reduced-motion behavior is respected when motion is involved.
- No hidden paid AI/API calls are added.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- The affected route is manually smoke-tested.
