import { env, getOpenAiApiKey } from "@/lib/env";
import type { ApodEntry } from "@/services/nasa";
import { getOpenAiModelCandidates, isOpenAiModelUnavailable } from "./model-fallback";

export type ApodAiExplanation = {
  summary: string;
  whyItMatters: string;
  lookFor: string;
  source: "openai" | "fallback";
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function fallbackExplanation(apod: ApodEntry): ApodAiExplanation {
  const sentences = apod.explanation.split(/(?<=\.)\s+/).filter(Boolean);
  const firstSentence = sentences[0] ?? apod.explanation;
  const secondSentence = sentences[1];
  const sourceText = `${apod.title} ${apod.explanation}`.toLowerCase();

  const context =
    sourceText.includes("galax")
      ? {
          subject: "galaxies",
          why:
            "Galaxies preserve evidence of gravity, star formation, and cosmic time, so a single image can become a map of how structure grows across the universe.",
          look:
            "Look for shape, color, and brightness differences between galaxies; those clues often separate young star-forming regions from older stellar populations.",
        }
      : sourceText.includes("nebula")
        ? {
            subject: "nebulae",
            why:
              "Nebulae reveal the raw material of stars and the sculpting force of radiation, winds, and shock waves inside interstellar clouds.",
            look:
              "Trace the glowing gas lanes and dark dust silhouettes; edges and cavities usually show where energetic stars are reshaping the cloud.",
          }
        : sourceText.includes("mars") || sourceText.includes("rover")
          ? {
              subject: "Mars exploration",
              why:
                "Mars imagery connects landscape, climate history, and robotic exploration, turning distant terrain into evidence that scientists can compare with Earth geology.",
              look:
                "Scan for layering, rounded rocks, dunes, and color changes; those details can hint at wind, water, impact, or volcanic processes.",
            }
          : sourceText.includes("sun") || sourceText.includes("solar") || sourceText.includes("flare")
            ? {
                subject: "solar activity",
                why:
                  "The Sun is the energy engine of the solar system, and its changing surface links astronomy to space weather around Earth.",
                look:
                  "Compare bright active regions with darker features and outer loops; contrast often marks magnetic structure and energetic plasma.",
              }
            : sourceText.includes("comet") || sourceText.includes("asteroid")
              ? {
                  subject: "small bodies",
                  why:
                    "Comets and asteroids are time capsules from solar system formation, preserving material that planets later transformed or absorbed.",
                  look:
                    "Notice tails, coma structure, brightness, and nearby star trails; motion and dust often reveal the object's relationship with sunlight.",
                }
              : {
                  subject: "astronomical observation",
                  why:
                    "This APOD matters because NASA is turning a remote object, event, or observing technique into a public scientific record that can be inspected, questioned, and shared.",
                  look:
                    apod.media_type === "video"
                      ? "Watch how NASA uses time, motion, or changing viewpoint to reveal structure that a still image might hide."
                      : "Start with the brightest structures, then scan the dim edges and background where scale, dust, motion, or distant objects often carry the deeper story.",
                };

  return {
    summary:
      [firstSentence, secondSentence].filter(Boolean).join(" ").slice(0, 320).trim() ||
      `NASA presents this APOD as a source-backed look at ${context.subject}.`,
    whyItMatters: context.why,
    lookFor: context.look,
    source: "fallback",
  };
}

function extractOutputText(response: OpenAiResponse) {
  if (response.output_text) return response.output_text;

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && content.text)
    ?.text;
}

function parseExplanation(text: string, apod: ApodEntry): ApodAiExplanation {
  try {
    const parsed = JSON.parse(text) as Partial<ApodAiExplanation>;

    if (parsed.summary && parsed.whyItMatters && parsed.lookFor) {
      return {
        summary: parsed.summary,
        whyItMatters: parsed.whyItMatters,
        lookFor: parsed.lookFor,
        source: "openai",
      };
    }
  } catch {
    return fallbackExplanation(apod);
  }

  return fallbackExplanation(apod);
}

export async function generateApodExplanation(apod: ApodEntry): Promise<ApodAiExplanation> {
  if (!env.openaiApiKey || apod.service_version === "fallback") {
    return fallbackExplanation(apod);
  }

  const prompt = [
    "You are COSMOS AI, a cinematic but scientifically careful space guide.",
    "Create a concise explanation for NASA's Astronomy Picture of the Day.",
    "Use only the NASA title, date, media type, and description supplied below.",
    "Do not invent facts, missions, numbers, dates, or object names not present in the source.",
    "Return strict JSON with keys: summary, whyItMatters, lookFor.",
    "",
    `Title: ${apod.title}`,
    `Date: ${apod.date}`,
    `Media type: ${apod.media_type}`,
    `NASA description: ${apod.explanation}`,
  ].join("\n");

  try {
    let outputText: string | undefined;

    for (const [index, model] of getOpenAiModelCandidates().entries()) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${getOpenAiApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: prompt,
          max_output_tokens: 520,
        }),
        next: {
          revalidate: 60 * 60 * 6,
          tags: ["openai", "openai:apod-explanation", `openai:apod:${apod.date}`],
        },
      });

      if (!response.ok) {
        const upstreamMessage = await response.text();
        const nextModel = getOpenAiModelCandidates()[index + 1];
        if (nextModel && isOpenAiModelUnavailable(response.status, upstreamMessage)) {
          console.warn({
            scope: "cosmos-ai-apod-explanation",
            event: "openai_model_fallback",
            fromModel: model,
            toModel: nextModel,
            status: response.status,
          });
          continue;
        }
        return fallbackExplanation(apod);
      }

      const json = (await response.json()) as OpenAiResponse;
      outputText = extractOutputText(json);
      break;
    }

    if (!outputText) {
      return fallbackExplanation(apod);
    }

    return parseExplanation(outputText, apod);
  } catch {
    return fallbackExplanation(apod);
  }
}
