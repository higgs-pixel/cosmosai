import { jsonOk } from "@/lib/api-response";
import { searchArxivPapers } from "@/lib/data-sources/arxiv";
import { searchOpenAlexResearch } from "@/lib/data-sources/openalex";
import { cosmosApiError, parseLimit } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 3600;

const DEFAULT_TOPICS = [
  "astrophysics",
  "cosmology",
  "planetary science",
  "space technology",
  "AI in astronomy",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams, 8, 20);
    const topic = searchParams.get("topic")?.trim() || DEFAULT_TOPICS.join(" OR ");
    const [openAlex, arxiv] = await Promise.allSettled([
      searchOpenAlexResearch(topic, Math.ceil(limit / 2)),
      searchArxivPapers(topic, Math.ceil(limit / 2)),
    ]);

    return jsonOk({
      query: topic,
      defaultTopics: DEFAULT_TOPICS,
      results: [
        ...(openAlex.status === "fulfilled" ? openAlex.value : []),
        ...(arxiv.status === "fulfilled" ? arxiv.value : []),
      ].slice(0, limit),
    }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
