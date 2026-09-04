import assert from "node:assert/strict";
import test from "node:test";
import {
  parseClientEnvironment,
  parseServerEnvironment,
} from "../src/lib/config/environment-schema.ts";

const productionBase = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://cosmos.example",
};

test("valid server configuration is normalized without requiring optional providers", () => {
  const config = parseServerEnvironment({
    ...productionBase,
    NASA_API_KEY: "nasa-secret",
    SERVER_FETCH_TIMEOUT_MS: "7500",
  });

  assert.equal(config.nodeEnv, "production");
  assert.equal(config.siteUrl, "https://cosmos.example");
  assert.equal(config.nasaApiKey, "nasa-secret");
  assert.equal(config.serverFetchTimeoutMs, 7_500);
  assert.equal(config.groqApiKey, undefined);
  assert.equal(config.openaiApiKey, undefined);
});

test("production configuration reports a missing canonical site URL", () => {
  assert.throws(
    () => parseServerEnvironment({ NODE_ENV: "production" }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "ConfigurationError" &&
      error.message.includes("NEXT_PUBLIC_SITE_URL"),
  );
});

test("a Vercel production host satisfies the canonical site URL requirement", () => {
  const config = parseServerEnvironment({
    NODE_ENV: "production",
    VERCEL_PROJECT_PRODUCTION_URL: "cosmos.example",
  });

  assert.equal(config.siteUrl, "https://cosmos.example");
});

test("production configuration cannot opt into the localhost fallback", () => {
  assert.throws(
    () =>
      (parseServerEnvironment as (...args: unknown[]) => unknown)(
        { NODE_ENV: "production" },
        { strictProduction: false },
      ),
    (error: unknown) => error instanceof Error && error.message.includes("NEXT_PUBLIC_SITE_URL"),
  );
});

test("configuration rejects malformed URLs without echoing secret values", () => {
  assert.throws(
    () =>
      parseServerEnvironment({
        ...productionBase,
        OPEN_METEO_BASE_URL: "not-a-url",
        OPENAI_API_KEY: "must-never-appear",
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /OPEN_METEO_BASE_URL/);
      assert.doesNotMatch(error.message, /must-never-appear/);
      return true;
    },
  );
});

test("configuration rejects invalid numeric limits", () => {
  assert.throws(
    () => parseServerEnvironment({ ...productionBase, SERVER_FETCH_TIMEOUT_MS: "forever" }),
    (error: unknown) => error instanceof Error && error.message.includes("SERVER_FETCH_TIMEOUT_MS"),
  );
});

test("optional AI providers remain optional", () => {
  const config = parseServerEnvironment(productionBase);

  assert.equal(config.groqApiKey, undefined);
  assert.equal(config.openaiApiKey, undefined);
});

test("homepage media uses the approved Blob URLs by default and accepts only HTTPS overrides", () => {
  const configured = parseServerEnvironment({
    ...productionBase,
    COSMOS_HOME_BLACKHOLE_WEBM_URL:
      "https://cosmos-media.public.blob.vercel-storage.com/blackhole.webm",
    COSMOS_HOME_BLACKHOLE_MP4_URL:
      "https://cosmos-media.public.blob.vercel-storage.com/blackhole.mp4",
    COSMOS_HOME_SUN_WEBM_URL:
      "https://cosmos-media.public.blob.vercel-storage.com/sun.webm",
    COSMOS_HOME_SKY_MP4_URL:
      "https://cosmos-media.public.blob.vercel-storage.com/sky.mp4",
  });

  assert.deepEqual(configured.homepageMedia, {
    blackHole: {
      webmUrl: "https://cosmos-media.public.blob.vercel-storage.com/blackhole.webm",
      mp4Url: "https://cosmos-media.public.blob.vercel-storage.com/blackhole.mp4",
    },
    sun: {
      webmUrl: "https://cosmos-media.public.blob.vercel-storage.com/sun.webm",
      mp4Url: "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sun.mp4",
    },
    sky: {
      webmUrl: "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sky.webm",
      mp4Url: "https://cosmos-media.public.blob.vercel-storage.com/sky.mp4",
    },
  });
  assert.deepEqual(parseServerEnvironment(productionBase).homepageMedia, {
    blackHole: {
      webmUrl: "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/blackhole.webm",
      mp4Url: "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Blackhole.mp4",
    },
    sun: {
      webmUrl: "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sun.webm",
      mp4Url: "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sun.mp4",
    },
    sky: {
      webmUrl: "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sky.webm",
      mp4Url: "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sky.mp4",
    },
  });
  assert.throws(
    () =>
      parseServerEnvironment({
        ...productionBase,
        COSMOS_HOME_SUN_MP4_URL: "http://insecure.example/sun.mp4",
      }),
    (error: unknown) =>
      error instanceof Error && error.message.includes("COSMOS_HOME_SUN_MP4_URL"),
  );
});

test("client configuration is explicitly allowlisted and excludes server secrets", () => {
  const raw = {
    NEXT_PUBLIC_SITE_URL: "https://cosmos.example",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
    OPENAI_API_KEY: "server-secret",
    NASA_API_KEY: "server-secret",
  };
  const config = parseClientEnvironment(raw);
  const serialized = JSON.stringify(config);

  assert.deepEqual(Object.keys(config).sort(), [
    "siteUrl",
    "supabasePublishableKey",
    "supabaseUrl",
  ]);
  assert.doesNotMatch(serialized, /OPENAI|NASA|server-secret/);
});

test("test environment uses deterministic local defaults", () => {
  const config = parseServerEnvironment({ NODE_ENV: "test" });

  assert.equal(config.nodeEnv, "test");
  assert.equal(config.siteUrl, "http://localhost:3000");
  assert.equal(config.serverFetchTimeoutMs, 6_000);
});
