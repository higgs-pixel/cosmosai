import "server-only";

import { env } from "@/lib/env";
import { fetchJson, parseNumber } from "./shared";

export type WorldIndicatorPoint = {
  indicator: string;
  country: string;
  year: string;
  value?: number;
  source: "World Bank";
};

const INDICATORS = {
  co2: "EN.ATM.CO2E.PC",
  population: "SP.POP.TOTL",
  education: "SE.XPD.TOTL.GD.ZS",
  research: "GB.XPD.RSDV.GD.ZS",
} as const;

type WorldBankResponse = [
  unknown,
  Array<{
    indicator?: { value?: string };
    country?: { value?: string };
    date?: string;
    value?: number | string | null;
  }>,
];

export async function getWorldIndicators(country = "WLD"): Promise<WorldIndicatorPoint[]> {
  const base = env.worldBankBaseUrl.replace(/\/$/, "");
  const results = await Promise.all(
    Object.values(INDICATORS).map(async (indicator): Promise<WorldIndicatorPoint | null> => {
      const url = `${base}/v2/country/${encodeURIComponent(country)}/indicator/${indicator}?format=json&per_page=5`;
      const response = await fetchJson<WorldBankResponse>(url, {
        revalidate: 86400,
        tags: ["cosmos", "world-bank"],
      });
      const latest = response[1]?.find((item) => item.value !== null && item.value !== undefined);
      if (!latest) return null;

      return {
        indicator: latest.indicator?.value ?? indicator,
        country: latest.country?.value ?? country,
        year: latest.date ?? "unknown",
        value: parseNumber(latest.value),
        source: "World Bank",
      };
    }),
  );

  return results.filter((item): item is WorldIndicatorPoint => item !== null);
}
