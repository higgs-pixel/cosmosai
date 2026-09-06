import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDirectWikipediaUrl, inferAgencyAndCountry } from "@/components/intelligence/satellite-helpers";

export const runtime = "nodejs";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const memoryCache = new Map<number, any>();

function getDiskCachePath(noradId: number): string {
  return path.join(CACHE_DIR, `sat_info_${noradId}.json`);
}

function readDiskCache(noradId: number): any | null {
  try {
    const filePath = getDiskCachePath(noradId);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("[Disk Cache Read Error]", err);
  }
  return null;
}

function writeDiskCache(noradId: number, data: any): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const filePath = getDiskCachePath(noradId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Disk Cache Write Error]", err);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const noradIdStr = searchParams.get("noradId");
  const satName = searchParams.get("name") || "";
  const category = searchParams.get("category") || "";

  if (!noradIdStr) {
    return NextResponse.json({ error: "Missing noradId parameter" }, { status: 400 });
  }

  const noradId = parseInt(noradIdStr, 10);
  if (isNaN(noradId)) {
    return NextResponse.json({ error: "Invalid noradId parameter" }, { status: 400 });
  }

  // 1. Check memory cache
  if (memoryCache.has(noradId)) {
    return NextResponse.json({ ...memoryCache.get(noradId), cached: true });
  }

  // 2. Check disk cache
  const diskData = readDiskCache(noradId);
  if (diskData) {
    memoryCache.set(noradId, diskData);
    return NextResponse.json({ ...diskData, cached: true });
  }

  // 3. Infer Agency & Country dynamically
  const { agency, country } = inferAgencyAndCountry(satName, category);

  // 4. Fetch dynamically from Wikipedia API server-side
  let wikiUrl: string | null = getDirectWikipediaUrl(satName, category);
  let extract: string | null = null;
  let imageUrl: string | null = null;
  let wikiTitle: string | null = null;

  const USER_AGENT = "COSMOS-AI-Space-Observatory/1.0 (https://cosmos.ai; research@cosmos.ai)";
  const DISQUALIFIERS = /\b(film|movie|soundtrack|album|song|actor|actress|cinema|bollywood|hollywood|confederate states|television series|tv series|video game|football|cricket|tennis|basketball|murder|novel|comic|band)\b/i;
  const SPACE_QUALIFIERS = /\b(satellite|spacecraft|space probe|space station|orbit|orbital|launch vehicle|space agency|nasa|esa|isro|cnsa|roscosmos|jaxa|telescope|constellation|transponder|booster|rocket|apogee|perigee|geostationary|low earth orbit|magnetosphere|heliophysics|exoplanet|astronomy|astrophysics|payload|telemetry)\b/i;

  // A. Priority 1: Direct Wikipedia page resolution if mapped
  if (wikiUrl && wikiUrl.includes("/wiki/")) {
    try {
      const pageSlug = wikiUrl.split("/wiki/")[1];
      const sumRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageSlug)}`,
        { headers: { "User-Agent": USER_AGENT } }
      );
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        if (sumData && sumData.type !== "disambiguation") {
          extract = sumData.extract || null;
          wikiTitle = sumData.title || null;
          if (sumData.content_urls?.desktop?.page) {
            wikiUrl = sumData.content_urls.desktop.page;
          }
          if (sumData.thumbnail?.source) {
            imageUrl = `/api/image-proxy?url=${encodeURIComponent(sumData.thumbnail.source)}`;
          } else if (sumData.originalimage?.source) {
            imageUrl = `/api/image-proxy?url=${encodeURIComponent(sumData.originalimage.source)}`;
          }
        }
      }
    } catch (err) {
      console.error("[Wikipedia Direct Fetch Error]", err);
    }
  }

  // B. Priority 2: Fallback Wikipedia search with aerospace validation
  const cleanName = satName
    .replace(/\(.*\)/g, "")
    .replace(/\b(DEB|RB|R\/B|PRN\s*\d+|NORAD\s*\d+)\b/gi, "")
    .trim();

  if (!extract && cleanName) {
    try {
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanName + " spacecraft satellite")}&format=json&origin=*`,
        { headers: { "User-Agent": USER_AGENT } }
      );

      if (searchRes.ok) {
        const sData = await searchRes.json();
        const results = sData.query?.search || [];

        // Search through results and verify aerospace relevance
        for (const item of results.slice(0, 5)) {
          const itemText = `${item.title} ${item.snippet}`;
          if (DISQUALIFIERS.test(itemText)) {
            continue; // Skip movies, songs, actors, sports
          }
          if (!SPACE_QUALIFIERS.test(itemText)) {
            continue; // Must be related to space / satellites
          }

          // Verified space candidate
          const candidateTitle = item.title;
          const sumRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidateTitle.replace(/ /g, "_"))}`,
            { headers: { "User-Agent": USER_AGENT } }
          );

          if (sumRes.ok) {
            const sumData = await sumRes.json();
            if (sumData && sumData.type !== "disambiguation") {
              const fullDesc = `${sumData.title} ${sumData.description || ""} ${sumData.extract || ""}`;
              if (DISQUALIFIERS.test(fullDesc)) {
                continue;
              }

              extract = sumData.extract || null;
              wikiTitle = sumData.title || null;
              if (sumData.content_urls?.desktop?.page) {
                wikiUrl = sumData.content_urls.desktop.page;
              }
              if (sumData.thumbnail?.source) {
                imageUrl = `/api/image-proxy?url=${encodeURIComponent(sumData.thumbnail.source)}`;
              } else if (sumData.originalimage?.source) {
                imageUrl = `/api/image-proxy?url=${encodeURIComponent(sumData.originalimage.source)}`;
              }
              break; // Found good match
            }
          }
        }
      }
    } catch (err) {
      console.error("[Wikipedia Search Error]", err);
    }
  }

  const result = {
    noradId,
    satName,
    category,
    agency,
    country,
    wikipediaUrl: wikiUrl || getDirectWikipediaUrl(satName, category) || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanName.replace(/ /g, '_'))}`,
    extract,
    imageUrl,
    wikiTitle,
    fetchedAt: new Date().toISOString(),
  };

  // Cache in memory and disk
  memoryCache.set(noradId, result);
  writeDiskCache(noradId, result);

  return NextResponse.json({ ...result, cached: false });
}
