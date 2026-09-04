export type DailyBriefing = {
  date: string;
  headline: string;
  bullets: string[];
  note: string;
  generatedBy: "openai" | "fallback";
  apod: {
    date: string;
    mediaType: string;
    title: string;
    url: string;
  } | null;
  metrics: {
    asteroids: {
      total: number;
      hazardous: number;
      safe: number;
      closestName?: string;
      closestMissKm?: number;
    };
    spaceWeather: {
      flares: number;
      cmes: number;
      storms: number;
    };
    news: {
      count: number;
    };
  };
  news: Array<{
    title: string;
    link: string;
    pubDate?: string;
  }>;
};

export type HomeBriefingStatus = "loading" | "ready" | "fallback";

export const fallbackBriefing: DailyBriefing = {
  date: "",
  headline: "Today's cosmic signal is coming into focus.",
  bullets: [
    "NASA APOD, asteroid tracking, space weather, and news signals are being assembled.",
    "COSMOS will condense the day into a source-grounded mission briefing when live data is available.",
    "If a live feed is unavailable, the page keeps a conservative fallback summary.",
  ],
  note: "Live NASA signals load from the daily briefing endpoint. If the signal is unavailable, COSMOS keeps this sample briefing visible.",
  generatedBy: "fallback",
  apod: null,
  metrics: {
    asteroids: {
      total: 0,
      hazardous: 0,
      safe: 0,
    },
    spaceWeather: {
      flares: 0,
      cmes: 0,
      storms: 0,
    },
    news: {
      count: 0,
    },
  },
  news: [],
};

export function normalizeDailyBriefing(payload: Partial<DailyBriefing>): DailyBriefing {
  return {
    ...fallbackBriefing,
    ...payload,
    bullets: payload.bullets?.length ? payload.bullets : fallbackBriefing.bullets,
    metrics: {
      asteroids: {
        ...fallbackBriefing.metrics.asteroids,
        ...payload.metrics?.asteroids,
      },
      spaceWeather: {
        ...fallbackBriefing.metrics.spaceWeather,
        ...payload.metrics?.spaceWeather,
      },
      news: {
        ...fallbackBriefing.metrics.news,
        ...payload.metrics?.news,
      },
    },
    news: payload.news?.length ? payload.news : fallbackBriefing.news,
  };
}

export function formatBriefingDate(date: string) {
  if (!date) return "Today";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}
