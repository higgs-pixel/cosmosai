import { jsonOk } from "@/lib/api-response";
import { serverFetchJson } from "@/lib/server-fetch";

export const runtime = "nodejs";
export const revalidate = 0;

type OpenNotifyIssResponse = {
  message?: string;
  timestamp?: number;
  iss_position?: {
    latitude?: string;
    longitude?: string;
  };
};

function fallbackIss() {
  return {
    status: "unavailable" as const,
    latitude: null,
    longitude: null,
    timestamp: new Date().toISOString(),
    source: "Open Notify",
    message: "ISS signal temporarily unavailable",
  };
}

export async function GET() {
  try {
    const payload = await serverFetchJson<OpenNotifyIssResponse>("http://api.open-notify.org/iss-now.json", {
      timeoutMs: 5000,
    });
    const latitude = Number(payload.iss_position?.latitude);
    const longitude = Number(payload.iss_position?.longitude);

    if (payload.message !== "success" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !payload.timestamp) {
      return jsonOk(fallbackIss(), {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    return jsonOk(
      {
        status: "live" as const,
        latitude,
        longitude,
        timestamp: new Date(payload.timestamp * 1000).toISOString(),
        source: "Open Notify",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return jsonOk(fallbackIss(), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
