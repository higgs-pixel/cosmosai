import { z } from "zod";

type EnvironmentInput = Record<string, string | undefined>;

const PLACEHOLDER_PREFIXES = ["your_", "replace_with_", "example_"];

export class ConfigurationError extends Error {
  readonly issues: readonly { variable: string; message: string }[];

  constructor(issues: readonly { variable: string; message: string }[]) {
    super(
      `Invalid environment configuration: ${issues
        .map(({ variable, message }) => `${variable} ${message}`)
        .join("; ")}`,
    );
    this.name = "ConfigurationError";
    this.issues = issues;
  }
}

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return undefined;
  }
  return trimmed;
}, z.string().optional());

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}, z.url().optional());

const optionalHttpsUrl = optionalUrl.refine(
  (value) => {
    if (!value) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  },
  "must use https",
);

function httpsUrlWithDefault(fallback: string) {
  return z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return fallback;
    return value.trim();
  }, z.url().refine((value) => new URL(value).protocol === "https:", "must use https"));
}

const timeoutLimit = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return value;
}, z.number().int().min(100).max(30_000).default(6_000));

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  VERCEL_PROJECT_PRODUCTION_URL: optionalText,
  VERCEL_URL: optionalText,
  NEXT_PUBLIC_SUPABASE_URL: optionalHttpsUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalText,
  NASA_API_KEY: optionalText,
  GROQ_API_KEY: optionalText,
  GROQ_MODEL: optionalText,
  OPENAI_API_KEY: optionalText,
  OPENAI_MODEL: optionalText,
  OPENALEX_API_KEY: optionalText,
  OPENALEX_EMAIL: optionalText,
  CORE_API_KEY: optionalText,
  WEATHERSTACK_API_KEY: optionalText,
  PURPLEAIR_API_KEY: optionalText,
  COSMOS_HOME_BLACKHOLE_WEBM_URL: httpsUrlWithDefault(
    "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/blackhole.webm",
  ),
  COSMOS_HOME_BLACKHOLE_MP4_URL: httpsUrlWithDefault(
    "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Blackhole.mp4",
  ),
  COSMOS_HOME_SUN_WEBM_URL: httpsUrlWithDefault(
    "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sun.webm",
  ),
  COSMOS_HOME_SUN_MP4_URL: httpsUrlWithDefault(
    "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sun.mp4",
  ),
  COSMOS_HOME_SKY_WEBM_URL: httpsUrlWithDefault(
    "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sky.webm",
  ),
  COSMOS_HOME_SKY_MP4_URL: httpsUrlWithDefault(
    "https://67j4ob8jer25jd6r.public.blob.vercel-storage.com/Sky.mp4",
  ),
  UPSTASH_REDIS_REST_URL: optionalHttpsUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalText,
  SECURITY_LOG_SALT: optionalText,
  SERVER_FETCH_TIMEOUT_MS: timeoutLimit,
  SEVENTIMER_BASE_URL: optionalHttpsUrl.default("https://www.7timer.info"),
  ARCSECOND_BASE_URL: optionalHttpsUrl.default("https://api.arcsecond.io"),
  OPEN_METEO_BASE_URL: optionalHttpsUrl.default("https://api.open-meteo.com"),
  ISRO_API_BASE_URL: optionalHttpsUrl.default("https://isro.vercel.app"),
  USGS_EARTHQUAKE_BASE_URL: optionalHttpsUrl.default("https://earthquake.usgs.gov"),
  SUNRISE_SUNSET_BASE_URL: optionalHttpsUrl.default("https://api.sunrise-sunset.org"),
  WORLD_BANK_BASE_URL: optionalHttpsUrl.default("https://api.worldbank.org"),
  ARXIV_BASE_URL: optionalHttpsUrl.default("https://export.arxiv.org"),
  WIKIDATA_API_BASE_URL: optionalHttpsUrl.default("https://www.wikidata.org"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optionalUrl.default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalHttpsUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalText,
});

function configurationError(error: z.ZodError) {
  return new ConfigurationError(
    error.issues.map((issue) => ({
      variable: issue.path.join(".") || "environment",
      message: issue.message,
    })),
  );
}

function parseWithConfigurationError<T>(schema: z.ZodType<T>, input: EnvironmentInput): T {
  const result = schema.safeParse(input);
  if (!result.success) throw configurationError(result.error);
  return result.data;
}

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

function vercelUrl(value: string | undefined) {
  if (!value) return undefined;
  return normalizeUrl(value.startsWith("http") ? value : `https://${value}`);
}

export type ServerEnvironment = ReturnType<typeof parseServerEnvironment>;

export function parseServerEnvironment(
  input: EnvironmentInput,
) {
  const parsed = parseWithConfigurationError(serverSchema, input);
  const siteUrl = parsed.NEXT_PUBLIC_SITE_URL
    ? normalizeUrl(parsed.NEXT_PUBLIC_SITE_URL)
    : vercelUrl(parsed.VERCEL_PROJECT_PRODUCTION_URL) ??
      vercelUrl(parsed.VERCEL_URL) ??
      (parsed.NODE_ENV === "production"
        ? undefined
        : "http://localhost:3000");

  if (!siteUrl) {
    throw new ConfigurationError([
      {
        variable: "NEXT_PUBLIC_SITE_URL",
        message: "is required in production when no Vercel production URL is available",
      },
    ]);
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    siteUrl,
    supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL
      ? normalizeUrl(parsed.NEXT_PUBLIC_SUPABASE_URL)
      : undefined,
    supabasePublishableKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    nasaApiKey: parsed.NASA_API_KEY,
    groqApiKey: parsed.GROQ_API_KEY,
    groqModel: parsed.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    openaiApiKey: parsed.OPENAI_API_KEY,
    openaiModel: parsed.OPENAI_MODEL ?? "gpt-5-mini",
    openAlexApiKey: parsed.OPENALEX_API_KEY,
    openAlexEmail: parsed.OPENALEX_EMAIL,
    coreApiKey: parsed.CORE_API_KEY,
    weatherstackApiKey: parsed.WEATHERSTACK_API_KEY,
    purpleAirApiKey: parsed.PURPLEAIR_API_KEY,
    homepageMedia: {
      blackHole: {
        webmUrl: parsed.COSMOS_HOME_BLACKHOLE_WEBM_URL,
        mp4Url: parsed.COSMOS_HOME_BLACKHOLE_MP4_URL,
      },
      sun: {
        webmUrl: parsed.COSMOS_HOME_SUN_WEBM_URL,
        mp4Url: parsed.COSMOS_HOME_SUN_MP4_URL,
      },
      sky: {
        webmUrl: parsed.COSMOS_HOME_SKY_WEBM_URL,
        mp4Url: parsed.COSMOS_HOME_SKY_MP4_URL,
      },
    },
    upstashRedisRestUrl: parsed.UPSTASH_REDIS_REST_URL,
    upstashRedisRestToken: parsed.UPSTASH_REDIS_REST_TOKEN,
    securityLogSalt: parsed.SECURITY_LOG_SALT,
    serverFetchTimeoutMs: parsed.SERVER_FETCH_TIMEOUT_MS,
    sevenTimerBaseUrl: normalizeUrl(parsed.SEVENTIMER_BASE_URL),
    arcsecondBaseUrl: normalizeUrl(parsed.ARCSECOND_BASE_URL),
    openMeteoBaseUrl: normalizeUrl(parsed.OPEN_METEO_BASE_URL),
    isroApiBaseUrl: normalizeUrl(parsed.ISRO_API_BASE_URL),
    usgsEarthquakeBaseUrl: normalizeUrl(parsed.USGS_EARTHQUAKE_BASE_URL),
    sunriseSunsetBaseUrl: normalizeUrl(parsed.SUNRISE_SUNSET_BASE_URL),
    worldBankBaseUrl: normalizeUrl(parsed.WORLD_BANK_BASE_URL),
    arxivBaseUrl: normalizeUrl(parsed.ARXIV_BASE_URL),
    wikidataApiBaseUrl: `${normalizeUrl(parsed.WIKIDATA_API_BASE_URL)}/w/api.php`,
  } as const;
}

export type ClientEnvironment = ReturnType<typeof parseClientEnvironment>;

export function parseClientEnvironment(input: EnvironmentInput) {
  const parsed = parseWithConfigurationError(clientSchema, input);
  return {
    siteUrl: normalizeUrl(parsed.NEXT_PUBLIC_SITE_URL),
    supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL
      ? normalizeUrl(parsed.NEXT_PUBLIC_SUPABASE_URL)
      : undefined,
    supabasePublishableKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  } as const;
}
