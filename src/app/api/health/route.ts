import { jsonOk } from "@/lib/api-response";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  return jsonOk({
    status: "ok",
    service: "cosmos-ai",
    timestamp: new Date().toISOString(),
  });
}
