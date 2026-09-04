import { getEarthWeather } from "@/services/earth/weather";
import { createEarthWeatherHandler } from "./handler";

export const runtime = "nodejs";
export const revalidate = 600;

export const GET = createEarthWeatherHandler(getEarthWeather);
