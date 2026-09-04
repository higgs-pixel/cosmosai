import "server-only";

import { env } from "@/lib/env";
import { streamOpenAiChatResponse, type StreamOpenAiChatParams } from "@/services/openai";
import { streamGroqChatResponse } from "./groq";

export type CosmosAiProvider = "groq" | "openai" | "fallback";

export function getPrimaryAiProvider(): CosmosAiProvider {
  if (env.groqApiKey) return "groq";
  if (env.openaiApiKey) return "openai";
  return "fallback";
}

export async function streamAiChatResponse(params: StreamOpenAiChatParams) {
  if (env.groqApiKey) {
    return streamGroqChatResponse(params);
  }

  return streamOpenAiChatResponse(params);
}
