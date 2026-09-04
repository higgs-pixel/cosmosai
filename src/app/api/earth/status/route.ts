import { jsonErrorFromUnknown, jsonOk } from "@/lib/api-response";
import { getEarthDashboardData } from "@/services/earth/dashboard";

export const runtime = "nodejs";
export const revalidate = 900;

export async function GET() {
  try {
    const data = await getEarthDashboardData();
    return jsonOk(data, { revalidate });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
