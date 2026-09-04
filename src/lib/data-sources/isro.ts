import "server-only";

import { env } from "@/lib/env";
import { fetchJson } from "./shared";

export type IsroSummary = {
  spacecrafts: string[];
  launchers: string[];
  centres: string[];
  customerSatellites: string[];
  source: "ISRO API";
};

type NamedList<T extends string> = Record<T, Array<Record<string, unknown>>>;

function readNames(items: Array<Record<string, unknown>> | undefined, keys: string[]) {
  return (items ?? [])
    .map((item) => keys.map((key) => item[key]).find((value): value is string => typeof value === "string" && value.length > 0))
    .filter((value): value is string => Boolean(value))
    .slice(0, 8);
}

export async function getIsroSummary(): Promise<IsroSummary> {
  const base = `${env.isroApiBaseUrl.replace(/\/$/, "")}/api`;
  const [spacecrafts, launchers, centres, satellites] = await Promise.all([
    fetchJson<NamedList<"spacecrafts">>(`${base}/spacecrafts`, { revalidate: 86400, tags: ["cosmos", "isro"] }),
    fetchJson<NamedList<"launchers">>(`${base}/launchers`, { revalidate: 86400, tags: ["cosmos", "isro"] }),
    fetchJson<NamedList<"centres">>(`${base}/centres`, { revalidate: 86400, tags: ["cosmos", "isro"] }),
    fetchJson<NamedList<"customer_satellites">>(`${base}/customer_satellites`, { revalidate: 86400, tags: ["cosmos", "isro"] }),
  ]);

  return {
    spacecrafts: readNames(spacecrafts.spacecrafts, ["name", "id"]),
    launchers: readNames(launchers.launchers, ["id", "name"]),
    centres: readNames(centres.centres, ["name", "Place"]),
    customerSatellites: readNames(satellites.customer_satellites, ["id", "country", "launcher"]),
    source: "ISRO API",
  };
}
