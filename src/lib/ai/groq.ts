import "server-only";

import { env, getGroqApiKey } from "@/lib/env";
import {
  encodeSourceCardsHeader,
  fallbackGuideAnswer,
  streamText,
  type StreamOpenAiChatParams,
} from "@/services/openai";
import { buildCosmosProviderPrompt, buildCosmosSystemInstructions } from "./system-prompt";
import { analyzeScientificQuestion, getScientificResponseBudget } from "./scientific-answer-policy";
import { assessGeneratedResponse, createCitationIntegrityFilter } from "./response-quality";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
type GroqStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
  error?: {
    message?: string;
  };
};

function logGroqEvent(level: "info" | "warn" | "error", event: string, details: Record<string, unknown> = {}) {
  const payload = { scope: "cosmos-groq-provider", event, ...details };
  if (level === "error") {
    console.error(payload);
    return;
  }
  if (level === "warn") {
    console.warn(payload);
    return;
  }
  console.info(payload);
}

function createGroqFallback(params: StreamOpenAiChatParams, reason: string) {
  return streamText(
    fallbackGuideAnswer(
      params.messages[params.messages.length - 1]?.content ?? "",
      params.mode,
      params.audience,
      params.nasaContext,
      reason,
    ),
    200,
    {
      "x-cosmos-ai-source": "fallback",
      "x-cosmos-ai-fallback-reason": reason,
      "x-cosmos-ai-model": env.groqModel,
      "x-cosmos-ai-model-status": reason.includes("rate") ? "rate_limited" : "service_unavailable",
      "x-cosmos-ai-request-id": params.requestId ?? "unknown",
      "x-cosmos-ai-context-sources": (params.contextSources ?? []).join(","),
      "x-cosmos-ai-source-cards": encodeSourceCardsHeader(params.sourceCards ?? []),
    },
  );
}

async function readGroqError(response: Response) {
  try {
    const text = await response.text();
    if (!text) return response.statusText;
    const parsed = JSON.parse(text) as GroqStreamChunk;
    return parsed.error?.message ?? text.slice(0, 240);
  } catch {
    return response.statusText;
  }
}

export async function streamGroqChatResponse(params: StreamOpenAiChatParams) {
  const apiKey = getGroqApiKey();
  const isXai = apiKey.startsWith("xai-");
  const endpoint = isXai ? "https://api.x.ai/v1/chat/completions" : GROQ_ENDPOINT;
  let model = env.groqModel || "llama-3.3-70b-versatile";
  if (isXai && model === "llama-3.3-70b-versatile") {
    model = "grok-beta";
  }

  const prompt = buildCosmosProviderPrompt(params);
  const latestPrompt = [...params.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const scientificAnalysis = analyzeScientificQuestion(latestPrompt, params.mode, params.audience);
  const responseBudget = getScientificResponseBudget(scientificAnalysis);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), responseBudget.timeoutMs);
  const requestId = params.requestId ?? "unknown";
  const startedAt = Date.now();

  logGroqEvent("info", isXai ? "xai_request_start" : "groq_request_start", {
    requestId,
    model,
    mode: params.mode,
    audience: params.audience,
    contextLength: params.nasaContext.length,
    contextSources: params.contextSources,
    maxOutputTokens: responseBudget.maxOutputTokens,
    advancedScientificAnswer: scientificAnalysis.isAdvanced,
  });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: responseBudget.maxOutputTokens,
        stream: true,
        messages: [
          { role: "system", content: buildCosmosSystemInstructions() },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (error) {
    clearTimeout(timeout);
    logGroqEvent("warn", isXai ? "xai_request_failed" : "groq_request_failed", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : `Unknown ${isXai ? "xAI" : "Groq"} request error.`,
    });
    return createGroqFallback(params, error instanceof Error && error.name === "AbortError" ? (isXai ? "xai_timeout" : "groq_timeout") : (isXai ? "xai_fetch_failed" : "groq_fetch_failed"));
  }

  if (!response.ok || !response.body) {
    clearTimeout(timeout);
    const upstreamMessage = await readGroqError(response);
    logGroqEvent("warn", isXai ? "xai_bad_response" : "groq_bad_response", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      status: response.status,
      upstreamMessage,
    });
    return createGroqFallback(params, response.status === 429 ? (isXai ? "xai_rate_limited" : "groq_rate_limited") : (isXai ? "xai_service_unavailable" : "groq_service_unavailable"));
  }


  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamedCharacters = 0;
  let fullText = "";
  const citationFilter = createCitationIntegrityFilter(
    (params.sourceCards ?? []).map((card) => card.citationLabel).filter((label): label is string => Boolean(label)),
  );

  const stream = new ReadableStream({
    async start(streamController) {
      const reader = response.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
            if (!dataLine) continue;
            const data = dataLine.replace(/^data:\s*/, "");
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as GroqStreamChunk;
              const delta = parsed.choices?.[0]?.delta?.content;
              if (!delta) continue;
              const filteredDelta = citationFilter.push(delta);
              const remaining = responseBudget.maxStreamedCharacters - streamedCharacters;
              if (remaining <= 0) {
                await reader.cancel();
                break;
              }
              const chunk = filteredDelta.slice(0, remaining);
              if (!chunk) continue;
              streamedCharacters += chunk.length;
              fullText += chunk;
              streamController.enqueue(encoder.encode(chunk));
            } catch {
              continue;
            }
          }
        }

        const trailing = citationFilter.flush().slice(0, responseBudget.maxStreamedCharacters - streamedCharacters);
        if (trailing) {
          streamedCharacters += trailing.length;
          fullText += trailing;
          streamController.enqueue(encoder.encode(trailing));
        }

        if (streamedCharacters === 0) {
          const fallback = fallbackGuideAnswer(
            params.messages[params.messages.length - 1]?.content ?? "",
            params.mode,
            params.audience,
            params.nasaContext,
            "groq_empty_stream",
          );
          fullText = fallback;
          streamController.enqueue(encoder.encode(fallback));
        }
      } finally {
        clearTimeout(timeout);
        logGroqEvent("info", "groq_stream_complete", {
          requestId,
          elapsedMs: Date.now() - startedAt,
          streamedCharacters,
          responsePreview: fullText.slice(0, 500),
          responseQuality: assessGeneratedResponse(
            fullText,
            (params.sourceCards ?? []).map((card) => card.citationLabel).filter((label): label is string => Boolean(label)),
          ),
        });
        streamController.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-cosmos-ai-source": "groq",
      "x-cosmos-ai-request-id": requestId,
      "x-cosmos-ai-model": model,
      "x-cosmos-ai-model-status": "live_ai",
      "x-cosmos-ai-context-sources": (params.contextSources ?? []).join(","),
      "x-cosmos-ai-source-cards": encodeSourceCardsHeader(params.sourceCards ?? []),
      "x-cosmos-ai-cache": "miss",
    },
  });
}
