import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getContentSecurityPolicy } from "../src/lib/security/headers.ts";
import {
  normalizeNasaImageUrl,
  resolveNasaImage,
  resolveNasaSearchResponse,
  selectBestNasaImageAsset,
} from "../src/services/nasa/image-asset-resolver.ts";

const trustedBase = "https://images-assets.nasa.gov/image/PIA01973";

function searchItem(overrides: Record<string, unknown> = {}) {
  return {
    href: `${trustedBase}/collection.json`,
    data: [{ nasa_id: "PIA01973", media_type: "image", title: "Saturn" }],
    links: [],
    ...overrides,
  };
}

test("a direct NASA JPEG preview is selected without fetching a manifest", async () => {
  let manifestRequests = 0;
  const result = await resolveNasaImage(
    searchItem({
      links: [{ href: `${trustedBase}/PIA01973~small.jpg`, rel: "preview", render: "image", width: 640, height: 480 }],
    }),
    {
      fetchManifest: async () => {
        manifestRequests += 1;
        return {};
      },
    },
  );

  assert.equal(result.previewUrl, `${trustedBase}/PIA01973~small.jpg`);
  assert.equal(result.source, "search-preview");
  assert.equal(result.width, 640);
  assert.equal(result.height, 480);
  assert.equal(manifestRequests, 0);
});

test("an asset manifest resolves to the preferred JPEG preview and original", async () => {
  const result = await resolveNasaImage(searchItem(), {
    fetchManifest: async () => ({
      collection: {
        items: [
          { href: `${trustedBase}/PIA01973~orig.jpg` },
          { href: `${trustedBase}/PIA01973~large.jpg` },
          { href: `${trustedBase}/PIA01973~small.jpg` },
        ],
      },
    }),
  });

  assert.equal(result.previewUrl, `${trustedBase}/PIA01973~small.jpg`);
  assert.equal(result.originalUrl, `${trustedBase}/PIA01973~orig.jpg`);
  assert.equal(result.source, "asset-manifest");
});

test("PNG is used when a manifest has no compatible JPEG", async () => {
  const result = await resolveNasaImage(searchItem(), {
    fetchManifest: async () => ({ collection: { items: [{ href: `${trustedBase}/PIA01973~small.png` }] } }),
  });
  assert.equal(result.previewUrl, `${trustedBase}/PIA01973~small.png`);
});

test("unsupported TIFF, JSON, video, and binary assets are rejected", () => {
  const result = selectBestNasaImageAsset([
    { href: `${trustedBase}/metadata.json` },
    { href: `${trustedBase}/PIA01973~orig.tif` },
    { href: `${trustedBase}/PIA01973~orig.mp4` },
    { href: `${trustedBase}/PIA01973.zip` },
  ]);
  assert.equal(result, null);
});

test("trusted HTTP URLs normalize to HTTPS and unsafe characters are encoded once", () => {
  assert.deepEqual(
    normalizeNasaImageUrl("http://images-assets.nasa.gov/image/A B/(Saturn)'s_\u65e5\u672c.jpg?download=A B"),
    {
      ok: true,
      url: "https://images-assets.nasa.gov/image/A%20B/(Saturn)'s_%E6%97%A5%E6%9C%AC.jpg?download=A%20B",
      extension: "jpg",
    },
  );
  assert.equal(normalizeNasaImageUrl("https://images-assets.nasa.gov/image/A%20B/file.jpg").ok, true);
});

test("untrusted, private, credentialed, protocol-relative, and non-HTTP URLs are rejected", () => {
  const urls = [
    "https://example.com/image.jpg",
    "https://127.0.0.1/image.jpg",
    "https://user:pass@images-assets.nasa.gov/image.jpg",
    "//images-assets.nasa.gov/image.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,abc",
    "file:///tmp/image.jpg",
  ];
  for (const url of urls) assert.equal(normalizeNasaImageUrl(url).ok, false, url);
});

test("missing and empty manifests return a polished unavailable result", async () => {
  const missing = await resolveNasaImage(searchItem(), { fetchManifest: async () => ({}) });
  const empty = await resolveNasaImage(searchItem(), {
    fetchManifest: async () => ({ collection: { items: [] } }),
  });
  assert.equal(missing.previewUrl, null);
  assert.equal(missing.source, "fallback");
  assert.equal(empty.previewUrl, null);
  assert.equal(empty.failureCategory, "no_supported_asset");
});

test("a provider timeout returns a fallback without throwing", async () => {
  const result = await resolveNasaImage(searchItem(), {
    timeoutMs: 5,
    fetchManifest: async () => await new Promise(() => undefined),
  });
  assert.equal(result.previewUrl, null);
  assert.equal(result.failureCategory, "provider_timeout");
});

test("a rejected manifest produces a provider-safe fallback", async () => {
  const result = await resolveNasaImage(searchItem(), {
    fetchManifest: async () => {
      throw Object.assign(new Error("provider details"), { status: 503 });
    },
  });
  assert.equal(result.previewUrl, null);
  assert.equal(result.failureCategory, "manifest_unavailable");
});

test("search normalization resolves previews server-side and deduplicates manifest requests", async () => {
  let manifestRequests = 0;
  const response = {
    collection: {
      items: [searchItem(), searchItem({ data: [{ nasa_id: "PIA01973", media_type: "image", title: "Duplicate" }] })],
    },
  };
  const resolved = await resolveNasaSearchResponse(response, {
    fetchManifest: async () => {
      manifestRequests += 1;
      return { collection: { items: [{ href: `${trustedBase}/PIA01973~small.jpg` }] } };
    },
  });
  const items = resolved.collection?.items ?? [];
  assert.equal(items[0]?.resolvedImage?.previewUrl, `${trustedBase}/PIA01973~small.jpg`);
  assert.equal(items[1]?.resolvedImage?.previewUrl, `${trustedBase}/PIA01973~small.jpg`);
  assert.equal(manifestRequests, 1);
});

test("the card uses a stable fallback and bypasses the failing deployment image optimizer", async () => {
  const source = await readFile("src/components/image-explorer/nasa-preview-image.tsx", "utf8");
  assert.match(source, /unoptimized/);
  assert.match(source, /onError/);
  assert.match(source, /Preview unavailable/);
  assert.match(source, /opacity-0/);
  assert.doesNotMatch(source, /<img\b/);
});

test("existing card metadata, open action, and bookmark control remain wired", async () => {
  const source = await readFile("src/components/image-explorer/nasa-image-explorer.tsx", "utf8");
  assert.match(source, /item\.center/);
  assert.match(source, /formatDate\(item\.date\)/);
  assert.match(source, /Open media/);
  assert.match(source, /SaveDiscoveryButton/);
  assert.match(source, /NasaPreviewImage/);
});

test("browser image failures are reported through a bounded server diagnostic route", async () => {
  const route = await readFile("src/app/api/nasa/media/preview-failure/route.ts", "utf8");
  assert.match(route, /image_load_failed/);
  assert.match(route, /console\.warn/);
  assert.match(route, /nasaId/);
  assert.doesNotMatch(route, /authorization|cookie|apiKey/i);
});

test("search cards receive server-resolved previews without per-card browser manifest requests", async () => {
  const route = await readFile("src/app/api/nasa/media/search/route.ts", "utf8");
  const client = await readFile("src/components/image-explorer/nasa-image-explorer.tsx", "utf8");
  assert.match(route, /searchNasaImagesWithResolvedPreviews/);
  assert.match(client, /item\.resolvedImage\?\.previewUrl/);
  assert.equal((client.match(/\/api\/nasa\/media\/\$\{encodeURIComponent\(item\.id\)\}/g) ?? []).length, 1);
});

test("Next image and CSP configuration explicitly permit the NASA asset host", async () => {
  const nextConfig = await readFile("next.config.ts", "utf8");
  const contentSecurityPolicy = getContentSecurityPolicy(true);
  assert.match(nextConfig, /hostname:\s*["']images-assets\.nasa\.gov["']/);
  assert.doesNotMatch(nextConfig, /hostname:\s*["']\*\*\.(?:nasa|jpl\.nasa)\.gov["']/);
  assert.match(contentSecurityPolicy, /img-src[^;]+https:\/\/images-assets\.nasa\.gov/);
});
