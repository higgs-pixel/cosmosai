import { jsonOk } from "@/lib/api-response";
import { getIsroSummary } from "@/lib/data-sources/isro";
import { cosmosApiError } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET() {
  try {
    return jsonOk(await getIsroSummary(), { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
