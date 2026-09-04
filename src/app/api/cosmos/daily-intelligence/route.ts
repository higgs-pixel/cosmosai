import { jsonOk } from "@/lib/api-response";
import { getOpenMeteoForecast } from "@/lib/data-sources/open-meteo";
import { searchArxivPapers } from "@/lib/data-sources/arxiv";
import { searchOpenAlexResearch } from "@/lib/data-sources/openalex";
import { getRecentEarthquakes } from "@/lib/data-sources/usgs-earthquake";
import { getSevenTimerAstroWeather } from "@/lib/data-sources/seven-timer";
import { getSunriseSunset } from "@/lib/data-sources/sunrise-sunset";
import { getEarthDashboardData } from "@/services/earth/dashboard";
import { cosmosApiError, parseCoordinates } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { latitude, longitude } = parseCoordinates(searchParams);
    const location = searchParams.get("location")?.trim() || "Gwalior";
    const [earth, openAlex, arxiv, earthquakes, openMeteo, astro, sun] = await Promise.allSettled([
      getEarthDashboardData(),
      searchOpenAlexResearch("astrophysics space science latest", 4),
      searchArxivPapers("astrophysics cosmology planetary science", 4),
      getRecentEarthquakes(6),
      getOpenMeteoForecast(latitude, longitude),
      getSevenTimerAstroWeather(latitude, longitude),
      getSunriseSunset(latitude, longitude),
    ]);

    const earthData = earth.status === "fulfilled" ? earth.value : null;
    const research = [
      ...(openAlex.status === "fulfilled" ? openAlex.value : []),
      ...(arxiv.status === "fulfilled" ? arxiv.value : []),
    ].slice(0, 6);

    return jsonOk({
      date: new Date().toISOString().slice(0, 10),
      location,
      apod: earthData?.apod ?? null,
      research,
      earthEvents: {
        earthquakes: earthquakes.status === "fulfilled" ? earthquakes.value : [],
        asteroids: earthData?.asteroids ?? null,
        peopleInSpace: null,
      },
      observationConditions: {
        weather: openMeteo.status === "fulfilled" ? openMeteo.value : null,
        astroWeather: astro.status === "fulfilled" ? astro.value : null,
        sunriseSunset: sun.status === "fulfilled" ? sun.value : null,
      },
      spaceEvents: {
        spaceWeather: earthData?.spaceWeather ?? null,
        mars: earthData?.mars ?? null,
        iss: earthData?.iss ?? null,
      },
      sources: [
        "NASA APOD",
        "NASA NeoWs",
        "NASA DONKI",
        "OpenAlex",
        "arXiv",
        "Open Notify / ISS",
        "USGS",
        "Open-Meteo",
        "7Timer",
        "Sunrise-Sunset",
      ],
    }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
