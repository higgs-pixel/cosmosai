import type { EarthWeather } from "../../../../services/earth/weather.ts";
import { mapErrorToHttp } from "../../../../lib/errors/http-error-mapper.ts";
import { parseInput } from "../../../../lib/validation/parse.ts";
import { earthWeatherQuerySchema } from "./schema.ts";

type WeatherRequest = {
  latitude: number;
  longitude: number;
  locationName: string;
};

type WeatherProvider = (input: WeatherRequest) => Promise<EarthWeather>;

function requestId(request: Request) {
  const supplied = request.headers.get("x-request-id");
  if (supplied && /^[A-Za-z0-9._-]{1,100}$/.test(supplied)) return supplied;
  return crypto.randomUUID();
}

function jsonSuccess(data: unknown, revalidate: number) {
  return Response.json(
    { success: true, data },
    {
      headers: {
        "Cache-Control": `s-maxage=${revalidate}, stale-while-revalidate=${revalidate * 2}`,
      },
    },
  );
}

export function createEarthWeatherHandler(
  getWeather: WeatherProvider,
  now: () => Date = () => new Date(),
) {
  return async function GET(request: Request) {
    const id = requestId(request);
    let query: ReturnType<typeof parseInput<typeof earthWeatherQuerySchema._output>>;

    try {
      const url = new URL(request.url);
      query = parseInput(
        earthWeatherQuerySchema,
        Object.fromEntries(url.searchParams),
        {
          publicMessage: "A valid latitude and longitude are required.",
          internalContext: "Earth weather query validation failed",
        },
      );
    } catch (error) {
      const mapped = mapErrorToHttp(error, id);
      return Response.json(mapped.body, {
        status: mapped.status,
        headers: {
          "Cache-Control": "no-store",
          "x-cosmos-request-id": id,
        },
      });
    }

    try {
      return jsonSuccess(
        await getWeather({
          latitude: query.lat,
          longitude: query.lon,
          locationName: query.name,
        }),
        600,
      );
    } catch {
      return jsonSuccess(
        {
          status: "unavailable" as const,
          locationName: query.name,
          temperatureC: null,
          cloudCoverPct: null,
          humidityPct: null,
          windSpeedKmh: null,
          observedAt: now().toISOString(),
          timezone: "Unavailable",
          isFallback: true,
          message: "Weather signal temporarily unavailable",
        },
        60,
      );
    }
  };
}
