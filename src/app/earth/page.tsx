import type { Metadata } from "next";
import { LiveEarthDashboard } from "@/components/earth/live-earth-dashboard";
import { getEarthDashboardData } from "@/services/earth/dashboard";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Live Earth Dashboard",
  description:
    "A premium COSMOS AI Earth dashboard for NASA APOD, near-Earth asteroids, DONKI space weather, ISS location, open weather, and planetary watch signals.",
  alternates: {
    canonical: "/earth",
  },
  openGraph: {
    title: "Live Earth Dashboard | COSMOS AI",
    description:
      "A mission-control inspired Earth dashboard built from NASA, NOAA, ISS, and Open-Meteo public signals with clean fallbacks.",
    url: "/earth",
  },
};

export default async function EarthPage() {
  const data = await getEarthDashboardData();

  return <LiveEarthDashboard data={data} />;
}
