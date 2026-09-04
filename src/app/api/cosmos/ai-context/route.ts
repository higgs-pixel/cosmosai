import { jsonOk } from "@/lib/api-response";
import { buildCosmosToolContext } from "@/lib/ai/tool-context";
import { isCosmosChatMode } from "@/services/openai";
import { cosmosApiError, parseQuery } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseQuery(searchParams);
    const modeParam = searchParams.get("mode");
    const mode = isCosmosChatMode(modeParam) ? modeParam : "general";
    const context = await buildCosmosToolContext(query, mode);

    return jsonOk({
      query,
      mode,
      contextText: context.text.slice(0, 6000),
      sources: context.sources,
      sourceCards: context.sourceCards,
      toolsUsed: context.toolsUsed,
    });
  } catch (error) {
    return cosmosApiError(error);
  }
}
