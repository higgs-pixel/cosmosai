import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import {
  homepageNavigationLinks,
  homepageOfferings,
  homepagePlaceholders,
  homepageAnimationShouldRun,
  buildHomepageShareUrl,
  homepageArchiveDestination,
  homepageGalleryGestureIsDrag,
  homepageMotionAllowed,
  keepHomepageVideoPlaying,
} from "../src/components/home/aryan/homepage-contract.ts";

test("homepage share destinations encode the current page and title", () => {
  const pageUrl = "https://cosmosatlas.space/?view=archive";
  const title = "Explore COSMOS AI";

  assert.equal(
    buildHomepageShareUrl("whatsapp", pageUrl, title),
    "https://wa.me/?text=Explore%20COSMOS%20AI%20https%3A%2F%2Fcosmosatlas.space%2F%3Fview%3Darchive",
  );
  assert.equal(
    buildHomepageShareUrl("x", pageUrl, title),
    "https://twitter.com/intent/tweet?text=Explore%20COSMOS%20AI&url=https%3A%2F%2Fcosmosatlas.space%2F%3Fview%3Darchive",
  );
  assert.equal(
    buildHomepageShareUrl("linkedin", pageUrl, title),
    "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fcosmosatlas.space%2F%3Fview%3Darchive",
  );
  assert.equal(
    buildHomepageShareUrl("facebook", pageUrl, title),
    "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fcosmosatlas.space%2F%3Fview%3Darchive",
  );
});

test("homepage archive cards always have a useful destination", () => {
  assert.equal(
    homepageArchiveDestination("https://apod.nasa.gov/apod/ap260812.html"),
    "https://apod.nasa.gov/apod/ap260812.html",
  );
  assert.equal(homepageArchiveDestination(undefined), "/image-explorer");
});

test("homepage archive gestures only suppress navigation after a real drag", () => {
  assert.equal(homepageGalleryGestureIsDrag(5), false);
  assert.equal(homepageGalleryGestureIsDrag(7), true);
});

test("homepage routes use the approved production destinations", () => {
  assert.deepEqual(
    homepageOfferings.map(({ href }) => href),
    ["/image-explorer", "/ask", "/spacepedia", "/mission-control"],
  );
  assert.equal(
    homepageNavigationLinks.find(({ label }) => label === "Research")?.href,
    "/spacepedia",
  );
  assert.equal(
    homepageNavigationLinks.find(({ label }) => label === "Earth")?.href,
    "/earth",
  );
});

test("homepage offering artwork uses the committed optimized assets", () => {
  assert.deepEqual(
    homepageOfferings.map(({ image }) => image),
    [
      "/home/aryan/explore.webp",
      "/home/aryan/ask.webp",
      "/home/aryan/research.webp",
      "/home/aryan/observe.webp",
    ],
  );
});

test("only unapproved legal destinations stay disabled", () => {
  assert.deepEqual(
    homepagePlaceholders.map(({ label, enabled }) => ({ label, enabled })),
    [
      { label: "Privacy", enabled: false },
      { label: "Terms", enabled: false },
    ],
  );
  assert.ok(homepagePlaceholders.every((item) => item.href === undefined));
});

test("homepage offering cards reference shipped visual assets", () => {
  for (const offering of homepageOfferings) {
    const asset = new URL(`../public${offering.image}`, import.meta.url);
    assert.equal(
      existsSync(asset),
      true,
      `${offering.title} references a missing asset: ${offering.image}`,
    );
  }
});

test("reduced-motion preference disables cinematic playback and animation loops", () => {
  assert.equal(homepageMotionAllowed(true), false);
  assert.equal(homepageMotionAllowed(false), true);
});

test("cinematic animation runs only while motion is allowed and its section is near the viewport", () => {
  assert.equal(homepageAnimationShouldRun(true, true), true);
  assert.equal(homepageAnimationShouldRun(true, false), false);
  assert.equal(homepageAnimationShouldRun(false, true), false);
  assert.equal(homepageAnimationShouldRun(false, false), false);
});

test("hero video retries playback when the browser reports that media is ready", async () => {
  let playCalls = 0;
  let canPlay: (() => void) | undefined;
  const video = {
    play: async () => {
      playCalls += 1;
      if (playCalls === 1) throw new Error("media was not ready");
    },
    pause: () => undefined,
    addEventListener: (_type: "canplay", listener: () => void) => {
      canPlay = listener;
    },
    removeEventListener: () => undefined,
  };

  const cleanup = keepHomepageVideoPlaying(video, true);
  await Promise.resolve();
  canPlay?.();
  await Promise.resolve();

  assert.equal(playCalls, 2);
  cleanup();
});
