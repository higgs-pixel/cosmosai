import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const revalidate = 7200; // Next.js ISR cache at 2 hours

// Cache structure for robust in-memory & disk fallback caching
type CacheEntry = {
  data: any;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Ensure disk cache directory exists
const CACHE_DIR = path.join(process.cwd(), ".cache");
function getDiskCachePath(cacheKey: string, ext: string): string {
  const safeKey = cacheKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `celestrak_${safeKey}.${ext}`);
}

function readDiskCache(cacheKey: string, ext: string): string | null {
  try {
    const filePath = getDiskCachePath(cacheKey, ext);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch (err) {
    console.error("[Disk Cache Read Error]", err);
  }
  return null;
}

function writeDiskCache(cacheKey: string, ext: string, content: string): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const filePath = getDiskCachePath(cacheKey, ext);
    fs.writeFileSync(filePath, content, "utf-8");
  } catch (err) {
    console.error("[Disk Cache Write Error]", err);
  }
}

// Fallback GP elements for common items when CelesTrak is offline
const OFFLINE_TLE_FALLBACKS: Record<string, string> = {
  stations: `ISS (ZARYA)
1 25544U 98067A   24045.52083333  .00014307  00000+0  25083-3 0  9993
2 25544  51.6415 161.8432 0004835  94.3214 265.8123 15.49433609439215
TIANGONG (CSS)
1 48274U 21035A   24045.52083333  .00008920  00000+0  14230-3 0  9991
2 48274  41.4721  89.1243 0003291 124.5123 236.1423 15.58912445152341`,
  gnss: `GPS BIIR-11  (PRN 19)
1 26690U 00025A   24045.52083333  .00000000  00000+0  00000+0 0  9994
2 26690  55.2249  32.8174 0127989 312.1423  46.5231  2.00568264241235
GPS BIIF-2   (PRN 01)
1 37753U 11034A   24045.52083333  .00000000  00000+0  00000+0 0  9991
2 37753  55.1989 152.8174 0089123 305.1245  53.5412  2.00568270181236
GALILEO 1 (GSAT0101)
1 37846U 11060A   24045.52083333  .00000000  00000+0  00000+0 0  9996
2 37846  56.0012  85.1245 0002145 180.1245 179.8123  1.70478912341238
BEIDOU 3M1
1 43001U 17069A   24045.52083333  .00000000  00000+0  00000+0 0  9992
2 43001  55.4512 320.1245 0003124 165.1245 194.8123  1.86241212671239`,
  weather: `NOAA 15
1 25338U 98030A   24045.52083333  .00000145  00000+0  26120-4 0  9990
2 25338  98.7123  65.4123 0011985  90.4123 269.8123 14.25891212451236
NOAA 18
1 28654U 05018A   24045.52083333  .00000138  00000+0  24890-4 0  9991
2 28654  98.7412 145.1245 0012412 110.1245 250.0123 14.11245123981234
NOAA 19
1 33591U 09005A   24045.52083333  .00000124  00000+0  21430-4 0  9992
2 33591  98.7023 215.1241 0011423 104.9124 255.3256 14.12053123789123
NOAA 20 (JPSS-1)
1 43013U 17073A   24045.52083333  .00000110  00000+0  19870-4 0  9993
2 43013  98.7189 320.1245 0001389  95.4123 264.7123 14.19512312671238
SUOMI NPP
1 37849U 11061A   24045.52083333  .00000118  00000+0  20450-4 0  9999
2 37849  98.7156  50.1245 0001395  94.1245 266.0123 14.19512212341239
METOP-B
1 38771U 12049A   24045.52083333  .00000088  00000+0  17560-4 0  9994
2 38771  98.7045 235.1241 0001289 101.4123 258.7123 14.21512412491235`,
  science: `HST (HUBBLE)
1 20580U 90037B   24045.52083333  .00001245  00000+0  34120-4 0  9992
2 20580  28.4691 124.1241 0002891 202.1245 157.9412 14.84234125741235
TERRA (EOS-AM1)
1 25994U 99068A   24045.52083333  .00000212  00000+0  48120-4 0  9996
2 25994  98.2045  45.1241 0001423  85.1245 275.1241 14.57112412251234
AQUA (EOS-PM1)
1 27424U 02022A   24045.52083333  .00000198  00000+0  42110-4 0  9995
2 27424  98.2112 189.4123 0001391 102.4123 257.7123 14.57109812161239
LANDSAT 8
1 39084U 13008A   24045.52083333  .00000115  00000+0  29120-4 0  9993
2 39084  98.2012 120.4512 0001312  78.4123 281.7123 14.57118912581234
SENTINEL-1A
1 39634U 14016A   24045.52083333  .00000078  00000+0  21140-4 0  9994
2 39634  98.1812 210.1245 0001412  65.1241 295.0123 14.59124123521235
SENTINEL-2A
1 40697U 15028A   24045.52083333  .00000095  00000+0  24120-4 0  9992
2 40697  98.5712  85.4123 0001198  74.5123 285.6123 14.30821412711234
SENTINEL-3A
1 41335U 16011A   24045.52083333  .00000065  00000+0  18120-4 0  9995
2 41335  98.6512 154.1245 0001091  88.4123 271.7123 14.28124512411236`,
  visual: `ISS (ZARYA)
1 25544U 98067A   24045.52083333  .00014307  00000+0  25083-3 0  9993
2 25544  51.6415 161.8432 0004835  94.3214 265.8123 15.49433609439215
TIANGONG (CSS)
1 48274U 21035A   24045.52083333  .00008920  00000+0  14230-3 0  9991
2 48274  41.4721  89.1243 0003291 124.5123 236.1423 15.58912445152341
HST (HUBBLE)
1 20580U 90037B   24045.52083333  .00001245  00000+0  34120-4 0  9992
2 20580  28.4691 124.1241 0002891 202.1245 157.9412 14.84234125741235
ENVISAT
1 27386U 02009A   24045.52083333  .00000085  00000+0  21090-4 0  9998
2 27386  98.5412  35.1241 0001243 284.1423  75.9123 14.29812423181235
STARLINK-1007
1 44713U 19074A   24045.52083333  .00001423  00000+0  28910-4 0  9995
2 44713  53.0012 147.1241 0001423  89.1245 271.1245 15.06412345671234
STARLINK-1019
1 44725U 19074N   24045.52083333  .00001415  00000+0  28750-4 0  9998
2 44725  53.0025 210.4512 0001415  92.4512 267.8123 15.06412412891235`,
};

// Populate comprehensive 'active' and 'default' TLE fallback from all categories
OFFLINE_TLE_FALLBACKS.active = [
  OFFLINE_TLE_FALLBACKS.stations,
  OFFLINE_TLE_FALLBACKS.visual,
  OFFLINE_TLE_FALLBACKS.weather,
  OFFLINE_TLE_FALLBACKS.science,
  OFFLINE_TLE_FALLBACKS.gnss,
].join("\n");

OFFLINE_TLE_FALLBACKS.default = OFFLINE_TLE_FALLBACKS.active;

const OFFLINE_FALLBACKS: Record<string, any[]> = {
  stations: [
    {
      OBJECT_NAME: "ISS (ZARYA)",
      OBJECT_ID: "1998-067A",
      EPOCH: new Date().toISOString().substring(0, 23),
      MEAN_MOTION: 15.49433609,
      ECCENTRICITY: 0.00074948,
      INCLINATION: 51.6326,
      RA_OF_ASC_NODE: 14.6698,
      ARG_OF_PERICENTER: 43.6909,
      MEAN_ANOMALY: 316.4672,
      NORAD_CAT_ID: 25544,
      BSTAR: 0.00008502,
      MEAN_MOTION_DOT: 0.00004307,
      MEAN_MOTION_DDOT: 0,
      COUNTRY_CODE: "US/RU",
    },
    {
      OBJECT_NAME: "TIANGONG (CSS)",
      OBJECT_ID: "2021-035A",
      EPOCH: new Date().toISOString().substring(0, 23),
      MEAN_MOTION: 15.58912445,
      ECCENTRICITY: 0.0003291,
      INCLINATION: 41.4721,
      RA_OF_ASC_NODE: 89.1243,
      ARG_OF_PERICENTER: 124.5123,
      MEAN_ANOMALY: 236.1423,
      NORAD_CAT_ID: 48274,
      BSTAR: 0.00001423,
      MEAN_MOTION_DOT: 0.00000892,
      MEAN_MOTION_DDOT: 0,
      COUNTRY_CODE: "PRC",
    },
  ],
  weather: [
    {
      OBJECT_NAME: "NOAA 19",
      OBJECT_ID: "2009-005A",
      EPOCH: new Date().toISOString().substring(0, 23),
      MEAN_MOTION: 14.12053123,
      ECCENTRICITY: 0.0011423,
      INCLINATION: 98.7023,
      RA_OF_ASC_NODE: 215.1241,
      ARG_OF_PERICENTER: 104.9124,
      MEAN_ANOMALY: 255.3256,
      NORAD_CAT_ID: 33591,
      BSTAR: 0.00002143,
      MEAN_MOTION_DOT: 0.00000124,
      MEAN_MOTION_DDOT: 0,
      COUNTRY_CODE: "US",
    },
    {
      OBJECT_NAME: "NOAA 20 (JPSS-1)",
      OBJECT_ID: "2017-073A",
      EPOCH: new Date().toISOString().substring(0, 23),
      MEAN_MOTION: 14.19512312,
      ECCENTRICITY: 0.0001389,
      INCLINATION: 98.7189,
      RA_OF_ASC_NODE: 320.1245,
      ARG_OF_PERICENTER: 95.4123,
      MEAN_ANOMALY: 264.7123,
      NORAD_CAT_ID: 43013,
      BSTAR: 0.00001987,
      MEAN_MOTION_DOT: 0.0000011,
      MEAN_MOTION_DDOT: 0,
      COUNTRY_CODE: "US",
    },
  ],
  gnss: [
    {
      OBJECT_NAME: "GPS BIIR-11 (PRN 19)",
      OBJECT_ID: "2000-025A",
      EPOCH: new Date().toISOString().substring(0, 23),
      MEAN_MOTION: 2.00568264,
      ECCENTRICITY: 0.01279893,
      INCLINATION: 55.2249,
      RA_OF_ASC_NODE: 32.8174,
      ARG_OF_PERICENTER: 312.1423,
      MEAN_ANOMALY: 46.5231,
      NORAD_CAT_ID: 26690,
      BSTAR: 0.0,
      MEAN_MOTION_DOT: 0.0,
      MEAN_MOTION_DDOT: 0,
      COUNTRY_CODE: "US",
    },
  ],
};

// Helper: fetch and combine available working groups in PARALLEL via Promise.allSettled
async function fetchCombinedGroups(format: string): Promise<string | any[]> {
  const groups = ["stations", "visual", "weather", "science", "gnss", "geo", "resource"];
  const isTle = format === "tle";

  const fetchPromises = groups.map(async (g) => {
    try {
      const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=${isTle ? "tle" : "json"}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      if (isTle) {
        const txt = await res.text();
        if (txt && !txt.includes("GP data has not updated") && txt.length > 50) {
          return txt.trim();
        }
      } else {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          return json;
        }
      }
    } catch {
      // ignore individual timeout
    }
    return null;
  });

  const settled = await Promise.allSettled(fetchPromises);
  const validResults = settled
    .filter((s): s is PromiseFulfilledResult<any> => s.status === "fulfilled" && s.value !== null)
    .map((s) => s.value);

  if (isTle) {
    if (validResults.length > 0) {
      return validResults.join("\n");
    }
    return OFFLINE_TLE_FALLBACKS.active;
  } else {
    let combinedList: any[] = [];
    for (const item of validResults) {
      if (Array.isArray(item)) {
        combinedList = combinedList.concat(item);
      }
    }
    if (combinedList.length > 0) {
      return combinedList.sort((a, b) => (Number(a.NORAD_CAT_ID) || 0) - (Number(b.NORAD_CAT_ID) || 0));
    }
    return [
      ...(OFFLINE_FALLBACKS.stations || []),
      ...(OFFLINE_FALLBACKS.weather || []),
      ...(OFFLINE_FALLBACKS.gnss || []),
    ];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group") || "";
  const catnr = searchParams.get("catnr") || "";
  const name = searchParams.get("name") || "";
  const format = searchParams.get("format") || "json";

  let queryParams = "";
  let cacheKey = "default";

  if (catnr) {
    queryParams = `CATNR=${encodeURIComponent(catnr)}`;
    cacheKey = `catnr_${catnr}`;
  } else if (name) {
    queryParams = `NAME=${encodeURIComponent(name)}`;
    cacheKey = `name_${name}`;
  } else {
    let selectedGroup = group || "stations";
    if (selectedGroup === "gps") selectedGroup = "gnss";
    queryParams = `GROUP=${encodeURIComponent(selectedGroup)}`;
    cacheKey = `group_${selectedGroup}`;
  }

  cacheKey += `_${format}`;
  const isTle = format === "tle";
  const ext = isTle ? "txt" : "json";

  // 1. Check in-memory cache
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (isTle) {
      return new NextResponse(cached.data, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "x-cosmos-cache": "memory-hit",
          "Cache-Control": "public, max-age=7200",
        },
      });
    }
    return NextResponse.json(cached.data, {
      headers: {
        "x-cosmos-cache": "memory-hit",
        "Cache-Control": "public, max-age=7200",
      },
    });
  }

  // 2. Check disk cache
  const diskData = readDiskCache(cacheKey, ext);
  if (diskData) {
    if (isTle) {
      memoryCache.set(cacheKey, { data: diskData, timestamp: Date.now() });
      return new NextResponse(diskData, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "x-cosmos-cache": "disk-hit",
          "Cache-Control": "public, max-age=7200",
        },
      });
    } else {
      try {
        const parsedJson = JSON.parse(diskData);
        memoryCache.set(cacheKey, { data: parsedJson, timestamp: Date.now() });
        return NextResponse.json(parsedJson, {
          headers: {
            "x-cosmos-cache": "disk-hit",
            "Cache-Control": "public, max-age=7200",
          },
        });
      } catch (e) {
        // invalid disk cache, proceed to fetch
      }
    }
  }

  // 3. Fetch from CelesTrak API with 15s timeout
  const celestrakUrl = `https://celestrak.org/NORAD/elements/gp.php?${queryParams}&FORMAT=${isTle ? "tle" : "json"}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(celestrakUrl, {
      signal: controller.signal,
      headers: {
        Accept: isTle ? "text/plain" : "application/json",
        "User-Agent": "COSMOS-AI-Space-Observatory/1.0 (https://cosmos.ai; research@cosmos.ai)",
      },
      next: { revalidate: 7200 },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      if (isTle) {
        const text = await response.text();
        if (text && !text.includes("GP data has not updated") && text.length > 50) {
          memoryCache.set(cacheKey, { data: text, timestamp: Date.now() });
          writeDiskCache(cacheKey, "txt", text);
          return new NextResponse(text, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "x-cosmos-cache": "miss",
              "Cache-Control": "public, max-age=7200",
            },
          });
        }
      } else {
        const rawData = await response.json();
        let dataList = Array.isArray(rawData) ? rawData : [rawData];
        dataList = dataList.filter(
          (item) => item && typeof item === "object" && item.OBJECT_NAME && item.MEAN_MOTION
        );

        if (dataList.length > 0) {
          memoryCache.set(cacheKey, { data: dataList, timestamp: Date.now() });
          writeDiskCache(cacheKey, "json", JSON.stringify(dataList));
          return NextResponse.json(dataList, {
            headers: {
              "x-cosmos-cache": "miss",
              "Cache-Control": "public, max-age=7200",
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("[CelesTrak Proxy Error]", error);
  }

  // 4. Fallback handler: Fetch multiple active groups in parallel
  console.log(`[CelesTrak Fallback] Compiling multi-group fallback for ${group || cacheKey}`);
  const combinedData = await fetchCombinedGroups(format);

  if (isTle && typeof combinedData === "string" && combinedData.length > 50) {
    memoryCache.set(cacheKey, { data: combinedData, timestamp: Date.now() });
    writeDiskCache(cacheKey, "txt", combinedData);
    return new NextResponse(combinedData, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-cosmos-cache": "multi-fallback",
        "Cache-Control": "public, max-age=7200",
      },
    });
  } else if (!isTle && Array.isArray(combinedData) && combinedData.length > 0) {
    memoryCache.set(cacheKey, { data: combinedData, timestamp: Date.now() });
    writeDiskCache(cacheKey, "json", JSON.stringify(combinedData));
    return NextResponse.json(combinedData, {
      headers: {
        "x-cosmos-cache": "multi-fallback",
        "Cache-Control": "public, max-age=7200",
      },
    });
  }

  // 5. Ultimate fallback if offline
  const fallbackGroup = group || "stations";
  if (isTle) {
    const tleFallback = OFFLINE_TLE_FALLBACKS[fallbackGroup] || OFFLINE_TLE_FALLBACKS.active || OFFLINE_TLE_FALLBACKS.stations;
    return new NextResponse(tleFallback, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-cosmos-cache": "offline-tle-fallback",
        "Cache-Control": "no-store",
      },
    });
  }

  const fallback = OFFLINE_FALLBACKS[fallbackGroup] || OFFLINE_FALLBACKS.stations;
  return NextResponse.json(fallback, {
    headers: {
      "x-cosmos-cache": "offline-fallback",
      "Cache-Control": "no-store",
    },
  });
}
