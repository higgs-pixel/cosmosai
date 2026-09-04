import { jsonOk } from "@/lib/api-response";
import { serverFetchJson } from "@/lib/server-fetch";

export const runtime = "nodejs";
export const revalidate = 0;

type OpenNotifyAstrosResponse = {
  message?: string;
  number?: number;
  people?: Array<{
    name?: string;
    craft?: string;
  }>;
};

function fallbackPeople() {
  return {
    status: "unavailable" as const,
    number: null,
    people: [],
    timestamp: new Date().toISOString(),
    source: "Open Notify",
    message: "Crew data temporarily unavailable",
  };
}

export async function GET() {
  try {
    const payload = await serverFetchJson<OpenNotifyAstrosResponse>("http://api.open-notify.org/astros.json", {
      timeoutMs: 5000,
    });

    if (payload.message !== "success" || typeof payload.number !== "number" || !Array.isArray(payload.people)) {
      return jsonOk(fallbackPeople(), {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    return jsonOk(
      {
        status: "live" as const,
        number: payload.number,
        people: payload.people
          .map((person) => ({
            name: person.name?.trim() || "Unnamed crew member",
            craft: person.craft?.trim() || "Unknown craft",
          }))
          .slice(0, 24),
        timestamp: new Date().toISOString(),
        source: "Open Notify",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return jsonOk(fallbackPeople(), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
