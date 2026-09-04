import assert from "node:assert/strict";
import test from "node:test";
import type { ApodEntry, ApodParams } from "../src/services/nasa/nasa-types.ts";
import {
  createHomepageNasaSlots,
  getHomepageNasaPreviews,
  normalizeHomepageNasaPreviews,
} from "../src/services/nasa/homepage-preview.service.ts";

function apod(overrides: Partial<ApodEntry> & Pick<ApodEntry, "date" | "title" | "url">): ApodEntry {
  return {
    explanation: "A recent NASA astronomy record.",
    media_type: "image",
    service_version: "v1",
    ...overrides,
  };
}

test("homepage previews are safe, attributed, newest-first, unique, and limited to six", () => {
  const previews = normalizeHomepageNasaPreviews([
    apod({ date: "2026-08-08", title: "Fifth", url: "https://apod.nasa.gov/apod/image/fifth.jpg" }),
    apod({ date: "2026-08-12", title: "Newest", url: "https://apod.nasa.gov/apod/image/newest.jpg", copyright: "A. Observer" }),
    apod({ date: "2026-08-11", title: "Video", url: "https://youtube.com/watch?v=unsafe", media_type: "video", thumbnail_url: "https://www.nasa.gov/wp-content/uploads/video-thumb.jpg" }),
    apod({ date: "2026-08-10", title: "Third", url: "https://images-assets.nasa.gov/image/third/third~orig.jpg" }),
    apod({ date: "2026-08-09", title: "Fourth", url: "https://photojournal.jpl.nasa.gov/jpeg/fourth.jpg" }),
    apod({ date: "2026-08-07", title: "Sixth", url: "https://mars.nasa.gov/system/resources/sixth.jpg" }),
    apod({ date: "2026-08-06", title: "Seventh", url: "https://apod.nasa.gov/apod/image/seventh.jpg" }),
    apod({ date: "2026-08-12", title: "Duplicate date", url: "https://apod.nasa.gov/apod/image/duplicate.jpg" }),
    apod({ date: "2026-08-13", title: "Unsafe host", url: "https://attacker.example/image.jpg" }),
    apod({ date: "not-a-date", title: "Malformed date", url: "https://apod.nasa.gov/apod/image/bad.jpg" }),
  ]);

  assert.equal(previews.length, 6);
  assert.deepEqual(previews.map(({ date }) => date), [
    "2026-08-12",
    "2026-08-11",
    "2026-08-10",
    "2026-08-09",
    "2026-08-08",
    "2026-08-07",
  ]);
  assert.deepEqual(previews[0], {
    id: "apod-2026-08-12",
    date: "2026-08-12",
    title: "Newest",
    imageUrl: "https://apod.nasa.gov/apod/image/newest.jpg",
    sourceUrl: "https://apod.nasa.gov/apod/ap260812.html",
    attribution: "A. Observer",
    mediaType: "image",
  });
  assert.equal(previews[1]?.imageUrl, "https://www.nasa.gov/wp-content/uploads/video-thumb.jpg");
  assert.equal(previews[1]?.attribution, "NASA");
});

test("homepage preview slots remain exactly six when NASA has fewer usable records", () => {
  const slots = createHomepageNasaSlots([
    {
      id: "apod-2026-08-12",
      date: "2026-08-12",
      title: "Only preview",
      imageUrl: "https://apod.nasa.gov/apod/image/only.jpg",
      sourceUrl: "https://apod.nasa.gov/apod/ap260812.html",
      attribution: "NASA",
      mediaType: "image",
    },
  ]);

  assert.equal(slots.length, 6);
  assert.equal(slots[0]?.title, "Only preview");
  assert.deepEqual(slots.slice(1), [null, null, null, null, null]);
});

test("homepage APOD fetch is bounded to thirty recent days and falls back to the keyless NASA image library", async () => {
  let received: ApodParams | undefined;
  const previews = await getHomepageNasaPreviews({
    now: new Date("2026-08-12T12:00:00.000Z"),
    fetchApod: async (params) => {
      received = params;
      return apod({ date: "2026-08-12", title: "Today", url: "https://apod.nasa.gov/apod/image/today.jpg" });
    },
  });

  assert.deepEqual(received, {
    startDate: "2026-07-14",
    endDate: "2026-08-12",
    thumbs: true,
  });
  assert.equal(previews.length, 1);

  const failed = await getHomepageNasaPreviews({
    now: new Date("2026-08-12T12:00:00.000Z"),
    fetchApod: async () => {
      throw new Error("provider unavailable");
    },
    fetchImageLibrary: async () => ({
      collection: {
        items: [
          {
            data: [{
              nasa_id: "PIA01973",
              title: "Saturn in Natural Color",
              date_created: "2025-07-01T12:00:00.000Z",
              center: "JPL",
              media_type: "image",
            }],
            links: [{
              href: "https://images-assets.nasa.gov/image/PIA01973/PIA01973~small.jpg",
              rel: "preview",
              render: "image",
            }],
          },
        ],
      },
    }),
  });
  assert.deepEqual(failed, [{
    id: "nasa-PIA01973",
    date: "2025-07-01",
    title: "Saturn in Natural Color",
    imageUrl: "https://images-assets.nasa.gov/image/PIA01973/PIA01973~small.jpg",
    sourceUrl: "https://images.nasa.gov/details/PIA01973",
    attribution: "NASA / JPL",
    mediaType: "image",
  }]);
});
