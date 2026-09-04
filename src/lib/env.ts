import "server-only";

import { serverEnv } from "@/lib/config/env.server";
import { AppError } from "@/lib/errors";

export const env = {
  nasaApiKey: serverEnv.nasaApiKey,
  groqApiKey: serverEnv.groqApiKey,
  groqModel: serverEnv.groqModel,
  openaiApiKey: serverEnv.openaiApiKey,
  openaiModel: serverEnv.openaiModel,
  openAlexApiKey: serverEnv.openAlexApiKey,
  openAlexEmail: serverEnv.openAlexEmail,
  coreApiKey: serverEnv.coreApiKey,
  weatherstackApiKey: serverEnv.weatherstackApiKey,
  purpleAirApiKey: serverEnv.purpleAirApiKey,
  sevenTimerBaseUrl: serverEnv.sevenTimerBaseUrl,
  arcsecondBaseUrl: serverEnv.arcsecondBaseUrl,
  openMeteoBaseUrl: serverEnv.openMeteoBaseUrl,
  isroApiBaseUrl: serverEnv.isroApiBaseUrl,
  usgsEarthquakeBaseUrl: serverEnv.usgsEarthquakeBaseUrl,
  sunriseSunsetBaseUrl: serverEnv.sunriseSunsetBaseUrl,
  worldBankBaseUrl: serverEnv.worldBankBaseUrl,
  arxivBaseUrl: serverEnv.arxivBaseUrl,
  wikidataApiBaseUrl: serverEnv.wikidataApiBaseUrl,
};

export function getServerEnvironmentStatus() {
  return {
    nasaConfigured: Boolean(env.nasaApiKey),
    aiConfigured: Boolean(env.groqApiKey || env.openaiApiKey),
    researchConfigured: Boolean(env.openAlexApiKey),
    distributedRateLimitConfigured: Boolean(
      serverEnv.upstashRedisRestUrl && serverEnv.upstashRedisRestToken,
    ),
  };
}

export function getNasaApiKey() {
  if (!env.nasaApiKey) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      publicMessage: "NASA data service is temporarily unavailable.",
      internalMessage: "NASA_API_KEY is not configured.",
    });
  }
  return env.nasaApiKey;
}

export function getOpenAiApiKey() {
  if (!env.openaiApiKey) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      publicMessage: "The AI provider is temporarily unavailable.",
      internalMessage: "OPENAI_API_KEY is not configured.",
    });
  }
  return env.openaiApiKey;
}

export function getGroqApiKey() {
  if (!env.groqApiKey) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      publicMessage: "The AI provider is temporarily unavailable.",
      internalMessage: "GROQ_API_KEY is not configured.",
    });
  }
  return env.groqApiKey;
}
