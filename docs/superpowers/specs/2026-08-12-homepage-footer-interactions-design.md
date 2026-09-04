# Homepage Footer Interactions Design

Date: 2026-08-12

## Scope

Improve three homepage interactions without changing the approved cinematic layout:

1. Turn the footer share circle into an animated floating share menu.
2. Preserve the custom cursor's motion and interactive hover animation after the user scrolls beyond the hero.
3. Make every rotating Cosmic Archive card lead somewhere useful.

## Floating share menu

The existing centered circular share button remains the visual anchor. Activating it opens a compact fan above the button containing WhatsApp, X, LinkedIn, Facebook, and Copy Link actions. Items enter with a short staggered translate, scale, and fade animation and close in reverse. The menu stays within the footer and must not cover the Ask COSMOS control.

Each social action shares the current canonical page URL and a concise COSMOS AI title through the platform's standard share endpoint. Copy Link writes the current URL to the clipboard and replaces its label with a short success confirmation. External share actions open safely in a new tab.

The trigger exposes `aria-expanded` and `aria-controls`; each icon has an accessible name. Escape, clicking outside, or selecting an action closes the menu. Keyboard focus remains usable, and reduced-motion preferences remove staggered movement while preserving the open and closed states.

## Custom cursor

The homepage scrolls inside `.cosmos-aryan-home`, not the browser window. The cursor therefore listens to both pointer movement and that internal scroll container. After any section scroll, it re-evaluates the element beneath the last pointer position and restores the interactive expansion state for links and buttons.

The cursor remains a viewport-level sibling of the transformed homepage so its position cannot scroll away. Pointer velocity continues to control stretch and rotation. Hovering any element marked `data-cursor-link="true"` enlarges the cursor with the existing elastic transition. Coarse pointers and reduced-motion users keep the native cursor behavior.

## Cosmic Archive links

Cards backed by a NASA preview open their existing trusted NASA source in a new tab. An unavailable slot becomes a keyboard- and pointer-accessible link to `/image-explorer`, so every visible card has a destination.

Dragging the circular gallery continues to rotate it. A movement threshold distinguishes a drag from a click so a deliberate drag does not accidentally follow a card link. Keyboard rotation with the left and right arrow keys remains unchanged.

## Error handling and security

- Share URLs are constructed from known platform endpoints and encode all user-visible values.
- External links use `noopener noreferrer`.
- Clipboard failure leaves the menu open and presents a non-blocking failure label so the user can retry or choose another destination.
- No COSMOS AI social-profile URLs are invented; the menu shares content rather than linking to unapproved profiles.
- Missing NASA data falls back to the internal Image Explorer instead of a dead card.

## Verification

- Unit tests cover exact platform share destinations, safe URL encoding, and the archive fallback destination.
- A browser test at desktop verifies the cursor remains animated and expands over interactive targets after internal scrolling.
- Desktop and mobile browser checks verify the share fan opens, all five actions are reachable, Copy Link reports success, and the menu stays inside the viewport.
- Browser checks verify live and fallback archive cards are keyboard accessible and clickable without breaking drag rotation.
- Type checking, focused lint, homepage integration tests, production build, Vercel preview, and a browser error scan must pass before merge.
