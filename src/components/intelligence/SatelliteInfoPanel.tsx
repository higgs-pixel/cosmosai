"use client";

import { useState, useEffect } from "react";
import { useOrbitalStore } from "./store";
import { isDebrisOrRocketBody, inferAgencyAndCountry, getDirectWikipediaUrl } from "./satellite-helpers";
import {
  Rocket, Globe, Satellite, Shield, Telescope,
  Zap, Info, Calendar, MapPin, ExternalLink, Star, Eye,
  Wrench, Activity, Radio, Cpu, Layers, BookOpen, AlertTriangle
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Rich Satellite Metadata Interface & Database
// Real high-res photographs proxied via /api/image-proxy + direct Wikipedia article links
// ─────────────────────────────────────────────────────────────────────────────

export interface SatelliteInfo {
  name: string;
  imageUrl: string;
  wikipediaUrl?: string;
  agency: string;
  country: string;
  launchDate: string;
  launchSite?: string;
  launchVehicle: string;
  purpose: string;
  status: "Operational" | "Defunct" | "Decaying" | "Unknown";
  orbit: string;
  mass?: string;
  dimensions?: string;
  power?: string;
  instruments?: string[];
  discoveries?: { title: string; desc: string; imageUrl?: string }[];
  links?: { label: string; url: string }[];
  tags?: string[];
}

const WIKI_IMG = (url: string) => `/api/image-proxy?url=${encodeURIComponent(url)}`;
const LOCAL_FALLBACK_IMG = "/images/satellites/hubble.svg";

const SATELLITE_DB: Record<number, SatelliteInfo> = {
  // ── 25544: International Space Station ──────────────────────────────────────
  25544: {
    name: "International Space Station (ISS)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/The_station_pictured_from_the_SpaceX_Crew_Dragon_5.jpg/800px-The_station_pictured_from_the_SpaceX_Crew_Dragon_5.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/International_Space_Station",
    agency: "NASA / ESA / JAXA / Roscosmos / CSA",
    country: "International Partnership (15 Nations)",
    launchDate: "1998-11-20",
    launchSite: "Baikonur Cosmodrome Site 1/5 & Kennedy Space Center LC-39A",
    launchVehicle: "Proton-K (Zarya) & Space Shuttle Discovery (STS-88)",
    purpose: "Humanity's primary crewed microgravity research laboratory. Permanently occupied by rotating expedition crews conducting cutting-edge experiments in space medicine, materials science, astrophysics, fluid physics, and astrobiology.",
    status: "Operational",
    orbit: "LEO ~ 408 km altitude × 51.64° inclination (92.6 min period)",
    mass: "450,000 kg (990,000 lbs)",
    dimensions: "109 m × 73 m × 20 m (Truss structure span)",
    power: "120 kW continuous from 8 dual-solar array wings (1,090 m² total solar panel area)",
    instruments: [
      "Alpha Magnetic Spectrometer (AMS-02) — Dark matter search",
      "NICER — X-ray timing of neutron stars & pulsars",
      "ECOSTRESS — High-resolution thermal land imaging",
      "EMIT — Earth Surface Mineral Dust Source Investigation"
    ],
    discoveries: [
      {
        title: "Microgravity Human Physiology & Bone Density",
        desc: "Discovered mechanisms of bone loss (1-1.5% per month) and fluid shifts affecting ocular vision. Developed resistive exercise and bisphosphonate therapies essential for long-duration Mars journeys.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/600px-International_Space_Station_after_undocking_of_STS-132.jpg")
      },
      {
        title: "Spherical Cool-Flame Combustion",
        desc: "Discovered 'cool flames' burning at 200°C–500°C without visible soot, enabling revolutionary clean-burning engine designs on Earth.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Expedition_64_spacewalk_microgravity.jpg/600px-Expedition_64_spacewalk_microgravity.jpg")
      },
      {
        title: "Cosmic Ray Antimatter Detection",
        desc: "AMS-02 detected over 200 billion cosmic ray events, identifying an excess of high-energy positrons potential signature of dark matter annihilation.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Alpha_Magnetic_Spectrometer_02.jpg/600px-Alpha_Magnetic_Spectrometer_02.jpg")
      }
    ],
    links: [
      { label: "NASA ISS Portal", url: "https://www.nasa.gov/international-space-station/" },
      { label: "ESA Station Guide", url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station" }
    ],
    tags: ["Space Station", "Crewed Laboratory", "Microgravity", "International"]
  },

  // ── 48274: Tiangong Space Station ──────────────────────────────────────────
  48274: {
    name: "Tiangong Space Station (CSS)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/China_Space_Station_Animation.gif/600px-China_Space_Station_Animation.gif"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Tiangong_space_station",
    agency: "CNSA (China National Space Administration)",
    country: "China",
    launchDate: "2021-04-29",
    launchSite: "Wenchang Spacecraft Launch Site",
    launchVehicle: "Long March 5B (CZ-5B)",
    purpose: "China's permanent modular space station comprising the Tianhe core module and Wentian & Mengtian science lab modules. Conducts physics, astronomy, life science, and microgravity material research.",
    status: "Operational",
    orbit: "LEO ~ 389 km altitude × 41.58° inclination",
    mass: "100,000 kg (Three main modules)",
    dimensions: "55 m length × 39 m solar array width",
    power: "100 kW total via flexible GaAs thin-film solar wings (30%+ efficiency)",
    instruments: [
      "High-energy Cosmic Ray Detector",
      "Cold Atomic Clock Ensemble — 1 sec drift per 3 billion years",
      "Xuntian Survey Space Telescope (optical companion observatory)"
    ],
    discoveries: [
      {
        title: "Ultra-High Precision Space Time Standards",
        desc: "Operated the world's most stable cold-atom clock ensemble in microgravity, advancing tests of general relativity.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/China_Space_Station_Animation.gif/600px-China_Space_Station_Animation.gif")
      },
      {
        title: "Space Crop Reproduction & Mutagenesis",
        desc: "Completed full lifecycle rice and arabidopsis cultivation in space, demonstrating multigenerational seed production."
      }
    ],
    links: [
      { label: "CNSA Tiangong Portal", url: "http://www.cnsa.gov.cn/" }
    ],
    tags: ["Space Station", "Modular", "Crewed", "CNSA"]
  },

  // ── 20580: Hubble Space Telescope ──────────────────────────────────────────
  20580: {
    name: "Hubble Space Telescope (HST)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Hubble_2009_close-up_2.jpg/800px-Hubble_2009_close-up_2.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Hubble_Space_Telescope",
    agency: "NASA / ESA",
    country: "United States / Europe",
    launchDate: "1990-04-24",
    launchSite: "Kennedy Space Center Pad 39B",
    launchVehicle: "Space Shuttle Discovery (STS-31)",
    purpose: "Humanity's premier 2.4-meter aperture optical, ultraviolet, and near-infrared space telescope operating above atmospheric distortion. Serviced 5 times by Shuttle crews.",
    status: "Operational",
    orbit: "LEO ~ 538 km altitude × 28.47° inclination",
    mass: "11,110 kg (24,490 lbs)",
    dimensions: "13.2 m length × 4.2 m diameter",
    power: "2.8 kW from gallium-arsenide solar arrays",
    instruments: [
      "Wide Field Camera 3 (WFC3) — UV, Optical, Near-IR",
      "Cosmic Origins Spectrograph (COS) — UV Spectrograph",
      "Advanced Camera for Surveys (ACS) — Wide-field visible imaging",
      "Space Telescope Imaging Spectrograph (STIS)"
    ],
    discoveries: [
      {
        title: "Discovery of Accelerating Cosmic Expansion (Dark Energy)",
        desc: "Measuring distant Type Ia supernovae with Hubble revealed the expansion of the universe is accelerating rather than slowing. Awarded the 2011 Nobel Prize in Physics.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Supernova_1994D.jpg/600px-Supernova_1994D.jpg")
      },
      {
        title: "The Hubble Ultra Deep Field",
        desc: "Exposed 10,000 galaxies in a patch of sky 1/10th the diameter of the full Moon, revealing galaxy formation back to 800 million years after the Big Bang.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/NASA-HS201427a-HubbleUltraDeepField2014-20140603.jpg/600px-NASA-HS201427a-HubbleUltraDeepField2014-20140603.jpg")
      },
      {
        title: "Pillars of Creation in Eagle Nebula",
        desc: "Iconic optical and infrared imaging of star-forming columns in M16 revealing star formation dynamics inside dense molecular gas clouds.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg/600px-Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg")
      }
    ],
    links: [
      { label: "HubbleSite Official", url: "https://hubblesite.org/" },
      { label: "NASA Hubble Portal", url: "https://www.nasa.gov/mission_pages/hubble/main/index.html" }
    ],
    tags: ["Telescope", "Optical Astronomy", "Deep Space", "NASA/ESA"]
  },

  // ── 50463: James Webb Space Telescope ──────────────────────────────────────
  50463: {
    name: "James Webb Space Telescope (JWST)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/JWST_spacecraft_model_3.png/800px-JWST_spacecraft_model_3.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope",
    agency: "NASA / ESA / CSA",
    country: "United States / Europe / Canada",
    launchDate: "2021-12-25",
    launchSite: "Europe's Spaceport, Kourou, French Guiana",
    launchVehicle: "Ariane 5 ECA",
    purpose: "Flagship 6.5-meter golden beryllium segmented infrared space observatory operating at the Sun-Earth L2 Lagrange point behind a 5-layer tennis-court-sized sunshield. Imaged the first galaxies formed after the Big Bang.",
    status: "Operational",
    orbit: "Halo orbit around Sun-Earth L2 Lagrange Point (~1.5 million km from Earth)",
    mass: "6,500 kg",
    dimensions: "20.1 m × 14.1 m (Sunshield dimensions)",
    power: "2 kW from solar array",
    instruments: [
      "NIRCam — Near-Infrared Camera (0.6–5 µm)",
      "NIRSpec — Near-Infrared Spectrograph (100 simultaneous targets)",
      "MIRI — Mid-Infrared Instrument (5–28 µm with cryocooler)",
      "FGS/NIRISS — Fine Guidance Sensor & Slitless Spectrograph"
    ],
    discoveries: [
      {
        title: "JWST Deep Field & First High-Redshift Galaxies",
        desc: "Discovered luminous galaxies (GLASS-z12, JADES-GS-z14-0) formed just 290–350 million years after the Big Bang, challenging galaxy formation models.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Webb%27s_First_Deep_Field.png/600px-Webb%27s_First_Deep_Field.png")
      },
      {
        title: "Pillars of Creation Infrared Reveal",
        desc: "JWST's infrared vision penetrated cosmic dust to reveal thousands of newborn stars hidden inside the Eagle Nebula.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Webb_Pillars_of_Creation.jpg/600px-Webb_Pillars_of_Creation.jpg")
      }
    ],
    links: [
      { label: "Webb Space Telescope Portal", url: "https://webbtelescope.org/" },
      { label: "NASA JWST Mission", url: "https://jwst.nasa.gov/" }
    ],
    tags: ["Telescope", "Infrared", "Lagrange L2", "Exoplanets"]
  },

  // ── 33591: NOAA 19 Weather Satellite ──────────────────────────────────────
  33591: {
    name: "NOAA 19 (NOAA-N Prime)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg/800px-NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/NOAA-19",
    agency: "NOAA / NASA",
    country: "United States",
    launchDate: "2009-02-06",
    launchSite: "Vandenberg Space Launch Complex 2W",
    launchVehicle: "Delta II 7320-10C",
    purpose: "Polar-orbiting environmental satellite providing continuous 3D global atmospheric soundings, ocean sea surface temperatures, cloud imagery, and search-and-rescue (SARSAT) distress signal relay.",
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 854 km × 98.7° (102.1 min period)",
    mass: "1,440 kg",
    dimensions: "4.2 m length × 1.4 m diameter",
    power: "833 W from 1-wing solar panel array",
    instruments: [
      "AVHRR/3 — Advanced Very High Resolution Radiometer (6 channels)",
      "HIRS/4 — High Resolution Infrared Radiation Sounder (20 channels)",
      "AMSU-A / MHS — Advanced Microwave Sounding Units",
      "SBUV/2 — Solar Backscatter Ultraviolet Radiometer (Ozone)"
    ],
    discoveries: [
      {
        title: "Decadal Ozone Layer Recovery Measurement",
        desc: "Tracked Antarctic stratospheric ozone recovery following Montreal Protocol CFC phase-outs with high-precision SBUV ultraviolet profiles.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg/600px-NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg")
      }
    ],
    links: [
      { label: "NOAA Satellite Operations", url: "https://www.ospo.noaa.gov/" }
    ],
    tags: ["Weather", "Polar Orbit", "NOAA", "Atmosphere"]
  },

  // ── 44713: Starlink Satellite ─────────────────────────────────────────────
  44713: {
    name: "Starlink-1007 (V1.0)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Starlink_Mission_%2847926144123%29.jpg/800px-Starlink_Mission_%2847926144123%29.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Starlink",
    agency: "SpaceX",
    country: "United States",
    launchDate: "2019-11-11",
    launchSite: "Cape Canaveral SLC-40",
    launchVehicle: "Falcon 9 Full Thrust",
    purpose: "Commercial low Earth orbit communication satellite delivering high-speed, low-latency satellite broadband internet globally using Ku/Ka-band phased array antennas and krypton ion thrusters.",
    status: "Operational",
    orbit: "LEO ~ 550 km altitude × 53.0° inclination",
    mass: "260 kg per satellite",
    dimensions: "3.2 m × 1.6 m flat-panel design",
    power: "750 W single solar array wing",
    instruments: [
      "Ku/Ka-band Digital Phased Array Antennas",
      "Optical Space Lasers (inter-satellite mesh links)",
      "Krypton / Argon Hall-effect Ion Thrusters"
    ],
    links: [
      { label: "Starlink Official Portal", url: "https://www.starlink.com/" }
    ],
    tags: ["Broadband", "Starlink", "Constellation", "SpaceX"]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive Research-Grade Satellite Pattern Matcher
// ─────────────────────────────────────────────────────────────────────────────

function inferSatelliteInfo(name: string, category: string): Partial<SatelliteInfo> {
  const n = name.toUpperCase();
  const { agency, country } = inferAgencyAndCountry(name, category);
  const cleanName = name.replace(/\(.*\)/g, '').trim();

  // ── 0. Debris & Rocket Bodies Filter ─────────────────────────────────────────
  if (isDebrisOrRocketBody(n)) {
    let stageAgency = "Space Launch Provider";
    let stageCountry = "International";
    let stageWiki = "https://en.wikipedia.org/wiki/Space_debris";
    let stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Fregat_upper_stage_at_Le_Bourget_2011.jpg/800px-Fregat_upper_stage_at_Le_Bourget_2011.jpg");
    let stageTag = "Space Debris";

    if (n.includes("FREGAT")) {
      stageAgency = "NPO Lavochkin / Roscosmos";
      stageCountry = "Russia";
      stageWiki = "https://en.wikipedia.org/wiki/Fregat";
      stageTag = "Fregat Stage";
    } else if (n.includes("CENTAUR")) {
      stageAgency = "ULA (United Launch Alliance)";
      stageCountry = "United States";
      stageWiki = "https://en.wikipedia.org/wiki/Centaur_(rocket_stage)";
      stageTag = "Centaur Stage";
      stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Centaur_V_at_KSC.jpg/800px-Centaur_V_at_KSC.jpg");
    } else if (n.includes("SOYUZ") || n.includes("SL-4") || n.includes("SL-16")) {
      stageAgency = "Roscosmos / Samara Space Center";
      stageCountry = "Russia";
      stageWiki = "https://en.wikipedia.org/wiki/Soyuz_(rocket_family)";
      stageTag = "Soyuz Stage";
    } else if (n.includes("DELTA")) {
      stageAgency = "Boeing / ULA";
      stageCountry = "United States";
      stageWiki = "https://en.wikipedia.org/wiki/Delta_(rocket_family)";
      stageTag = "Delta Stage";
    } else if (n.includes("FALCON")) {
      stageAgency = "SpaceX";
      stageCountry = "United States";
      stageWiki = "https://en.wikipedia.org/wiki/Falcon_9";
      stageTag = "Falcon 9 Stage";
    } else if (n.includes("CZ-") || n.includes("LONG MARCH") || n.includes("CHANG ZHENG")) {
      stageAgency = "CALT / CASC (China)";
      stageCountry = "China";
      stageWiki = "https://en.wikipedia.org/wiki/Long_March_(rocket_family)";
      stageTag = "Long March Stage";
    } else if (n.includes("TITAN")) {
      stageAgency = "US Air Force / Martin Marietta";
      stageCountry = "United States";
      stageWiki = "https://en.wikipedia.org/wiki/Titan_(rocket_family)";
      stageTag = "Titan Stage";
    } else if (n.includes("ARIANE")) {
      stageAgency = "Arianespace / ArianeGroup";
      stageCountry = "Europe";
      stageWiki = "https://en.wikipedia.org/wiki/Ariane_(rocket_family)";
      stageTag = "Ariane Stage";
    } else if (n.includes("PSLV") || n.includes("GSLV")) {
      stageAgency = "ISRO";
      stageCountry = "India";
      stageWiki = "https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle";
      stageTag = "PSLV Stage";
    }

    return {
      name,
      agency: stageAgency,
      country: stageCountry,
      launchDate: "Launch Debris / Spent Stage",
      launchVehicle: "Expendable Rocket Upper Stage",
      purpose: `${name} is a tracked orbital space debris or spent rocket upper stage fragment remaining from satellite launch operations. Monitored continuously for space domain awareness and satellite collision avoidance.`,
      status: "Defunct",
      orbit: "Earth Debris Orbit",
      imageUrl: stageImg,
      wikipediaUrl: stageWiki,
      tags: ["Space Debris", "Rocket Body", stageTag, "Tracked Hazard"]
    };
  }

  // ── 1. Cargo Resupply & Crew Spacecraft ─────────────────────────────────────
  if (n.includes("DRAGON CRS") || n.includes("CREW DRAGON") || n.includes("DRAGON-")) return {
    agency,
    country,
    launchDate: "2010–present",
    launchVehicle: "Falcon 9 Block 5",
    purpose: `${cleanName} is a reusable SpaceX Dragon orbital spacecraft designed to transport crew astronauts and pressurized science cargo to and from the International Space Station.`,
    status: "Operational",
    orbit: "LEO ~ 400 km × 51.6° (Station rendezvous)",
    mass: "9,600 kg (Cargo) / 12,000 kg (Crew)",
    instruments: ["SuperDraco Emergency Abort Thrusters", "Draco Maneuvering Thrusters", "Autonomous Docking System"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crew_Dragon_at_the_ISS.jpg/800px-Crew_Dragon_at_the_ISS.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/SpaceX_Dragon_2",
    tags: ["Crew Capsule", "Cargo Resupply", "SpaceX", "ISS Rendezvous"]
  };

  if (n.includes("SOYUZ MS") || n.includes("SOYUZ TMA")) return {
    agency,
    country,
    launchDate: "1967–present (MS-series current)",
    launchVehicle: "Soyuz-2.1a",
    purpose: `${cleanName} is a crew transport spacecraft providing crew rotation and emergency lifeboat capabilities for Expedition crews aboard the International Space Station.`,
    status: "Operational",
    orbit: "LEO ~ 400 km × 51.6°",
    mass: "7,080 kg",
    instruments: ["Kurs-NA Automated Docking Radar", "Periscope & Optical Sight", "Kabriolet Descent Engine"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Soyuz_MS-09_approaching_ISS.jpg/800px-Soyuz_MS-09_approaching_ISS.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Soyuz_MS",
    tags: ["Crew Transport", "Roscosmos", "Lifeboat", "Soyuz"]
  };

  if (n.includes("PROGRESS MS") || n.includes("PROGRESS M")) return {
    agency,
    country,
    launchDate: "1978–present",
    launchVehicle: "Soyuz-2.1a",
    purpose: `${cleanName} is an automated cargo spacecraft delivering food, water, oxygen, propellant, and scientific hardware to the International Space Station.`,
    status: "Operational",
    orbit: "LEO ~ 400 km × 51.6°",
    mass: "7,400 kg",
    instruments: ["Rodnik Water Transfer System", "Kurs Automated Docking Radar"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Progress_MS-10.jpg/800px-Progress_MS-10.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Progress_(spacecraft)",
    tags: ["Cargo Spacecraft", "Roscosmos", "ISS Resupply"]
  };

  // ── 2. China Fleets (Yaogan, Gaofen, Shiyan, Shijian, Jilin) ──────────────────
  if (n.includes("YAOGAN")) return {
    agency,
    country,
    launchDate: "2006–present (Yaogan Series)",
    launchVehicle: "Long March 2D / 4B / 4C",
    purpose: `${cleanName} is a Chinese Yaogan Earth observation reconnaissance satellite equipped with synthetic aperture radar (SAR) or optical sensors for high-resolution land surveys, crop yield monitoring, disaster management, and defense research.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 625 km × 98.0°",
    mass: "1,200 kg to 2,800 kg",
    instruments: ["Sub-meter Optical Multispectral Telescope", "C-band Synthetic Aperture Radar (SAR)", "Electronic Intelligence (ELINT) Payload"],
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Yaogan",
    tags: ["Yaogan", "CNSA", "Earth Observation", "China"]
  };

  if (n.includes("GAOFEN") || n.includes("GF-")) return {
    agency,
    country,
    launchDate: "2013–present (Gaofen Series)",
    launchVehicle: "Long March 2D / 4B / 4C",
    purpose: `${cleanName} is a high-definition Earth observation satellite of China's CHEOS network providing sub-meter optical and radar imagery for environmental protection, land survey, and precision agriculture.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 630 km",
    mass: "1,500 kg",
    instruments: ["Sub-meter Optical Camera", "C-band Synthetic Aperture Radar"],
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Gaofen",
    tags: ["Gaofen", "CHEOS", "CNSA", "China"]
  };

  if (n.includes("SHIYAN") || n.includes("SY-") || n.includes("SHIJIAN") || n.includes("SJ-")) return {
    agency,
    country,
    launchDate: "2004–present",
    launchVehicle: "Long March 2D / 11",
    purpose: `${cleanName} is a space technology demonstration and space environment research satellite testing new satellite platforms, optical sensors, and orbital maintenance thrusters.`,
    status: "Operational",
    orbit: "LEO ~ 500–1,100 km",
    mass: "800 kg",
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Shiyan_(satellite_series)",
    tags: ["Shiyan", "CNSA", "Tech Demo", "China"]
  };

  // ── 3. India ISRO Fleets (Cartosat, Risat, Oceansat, Resourcesat, EOS) ────────
  if (n.includes("CARTOSAT") || n.includes("RISAT") || n.includes("OCEANSAT") || n.includes("RESOURCESAT") || n.includes("EOS-")) return {
    agency,
    country,
    launchDate: "2005–present",
    launchVehicle: "PSLV-XL / GSLV",
    purpose: `${cleanName} is an Indian ISRO Earth observation satellite delivering sub-meter panchromatic cartographic imaging, C-band SAR radar, ocean wind vectors, or multispectral land resources mapping.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 500–800 km",
    mass: "1,250 kg",
    instruments: ["High-Resolution Panchromatic Camera", "C-band Active SAR Radar", "Ocean Colour Monitor (OCM-3)"],
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Cartosat",
    tags: ["ISRO", "Cartosat", "Earth Observation", "India"]
  };

  // ── 4. Commercial & International Remote Sensing Fleets ─────────────────────
  if (n.includes("SPOT") || n.includes("PLEIADES")) return {
    agency,
    country,
    launchDate: "1986–present",
    launchVehicle: "Ariane 4/5 / Vega / Soyuz",
    purpose: `${cleanName} is a French high-resolution optical Earth observation satellite delivering 50 cm panchromatic and 2 meter multispectral satellite imagery worldwide.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 694 km × 98.2°",
    mass: "980 kg",
    instruments: ["HiRI High-Resolution Optical Imager (50 cm resolution)"],
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/SPOT_(satellite)",
    tags: ["SPOT", "Pleiades", "CNES", "Airbus"]
  };

  if (n.includes("WORLDVIEW") || n.includes("GEOEYE") || n.includes("IKONOS") || n.includes("QUICKBIRD")) return {
    agency,
    country,
    launchDate: "2008–present",
    launchVehicle: "Delta II / Atlas V 401",
    purpose: `${cleanName} is a commercial sub-meter high-resolution optical Earth imaging satellite delivering 31 cm panchromatic and 8-band multispectral imagery for global mapping and intelligence.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 617 km × 97.9°",
    mass: "2,800 kg",
    instruments: ["WV-110 31 cm Aperture Telescope (31 cm GSD)"],
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/WorldView-3",
    tags: ["Maxar", "WorldView", "Commercial Imagery", "High-Res"]
  };

  if (n.includes("ICEYE") || n.includes("CAPELLA")) return {
    agency,
    country,
    launchDate: "2018–present",
    launchVehicle: "Falcon 9 / Electron",
    purpose: `${cleanName} is a commercial X-band Synthetic Aperture Radar (SAR) microsatellite providing sub-meter radar imagery day and night through cloud cover and atmospheric smoke.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 575 km",
    mass: "85–112 kg",
    instruments: ["X-band Synthetic Aperture Radar (Sub-meter SAR)"],
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/ICEYE",
    tags: ["SAR Radar", "ICEYE", "Capella", "Microsat"]
  };

  if (n.includes("KOSMOS") || n.includes("COSMOS") || n.includes("RESURS") || n.includes("KANOPUS") || n.includes("METEOR")) return {
    agency,
    country,
    launchDate: "1962–present",
    launchVehicle: "Soyuz-2.1b / Proton-M",
    purpose: `${cleanName} is a Russian national space mission supporting high-resolution optical land observation, meteorological soundings, navigation, or defense space research.`,
    status: "Operational",
    orbit: "LEO ~ 500–900 km × 98° / MEO",
    mass: "1,500 kg to 6,500 kg",
    instruments: ["High-Resolution Optical Camera", "Multispectral Radiometer", "SAR Radar"],
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Kosmos_(satellite)",
    tags: ["Kosmos", "Roscosmos", "Russia", "Earth Observation"]
  };

  if (n.includes("USA") || n.includes("NROL") || n.includes("NRO")) return {
    agency,
    country,
    launchDate: "1989–present",
    launchVehicle: "Atlas V / Vulcan / Falcon 9 / Falcon Heavy",
    purpose: `${cleanName} is a classified US National Reconnaissance Office satellite payload delivering high-resolution optical/radar intelligence, electronic signals intelligence (SIGINT), or early warning detection.`,
    status: "Operational",
    orbit: "LEO / MEO / GEO / HEO Classified Orbit",
    mass: "Confidential",
    instruments: ["Advanced SIGINT Antennas", "Optical/Radar Intelligence Sensors"],
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: "https://en.wikipedia.org/wiki/National_Reconnaissance_Office",
    tags: ["NRO", "Defense", "USSF", "Reconnaissance"]
  };

  // ── 5. Space Observatories & Telescopes ─────────────────────────────────────
  if (n.includes("CHANDRA") || n.includes("CXO")) return {
    agency,
    country,
    launchDate: "1999-07-23",
    launchVehicle: "Space Shuttle Columbia (STS-93)",
    purpose: "NASA's flagship X-ray space telescope equipped with high-resolution mirrors to detect high-energy X-ray emission from black hole accretion disks, supernova remnants, and galaxy clusters.",
    status: "Operational",
    orbit: "Elliptical HEO ~ 14,000 km × 133,000 km × 28.5°",
    mass: "4,790 kg",
    dimensions: "13.8 m length × 19.5 m solar array span",
    power: "2 kW dual solar arrays",
    instruments: ["ACIS Advanced CCD Imaging Spectrometer", "HRC High Resolution Camera", "LETG/HETG Transmission Gratings"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Chandra_X-ray_Observatory_art_concept.jpg/800px-Chandra_X-ray_Observatory_art_concept.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Chandra_X-ray_Observatory",
    tags: ["X-Ray Telescope", "NASA", "Black Holes", "Astrophysics"]
  };

  if (n.includes("TESS")) return {
    agency,
    country,
    launchDate: "2018-04-18",
    launchVehicle: "Falcon 9 Full Thrust",
    purpose: "All-sky survey space telescope searching for transiting exoplanets around bright nearby stars, mapping 85% of the sky across 26 sectors.",
    status: "Operational",
    orbit: "Highly elliptical Lunar Resonance Orbit (P/2) ~ 108,000 km × 373,000 km",
    mass: "362 kg",
    power: "400 W dual solar arrays",
    instruments: ["Wide-field Optical Cameras (4x 16.8 MP CCD Array)"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/TESS_spacecraft_model.png/800px-TESS_spacecraft_model.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Transiting_Exoplanet_Survey_Satellite",
    tags: ["Exoplanets", "TESS", "NASA/MIT", "Survey"]
  };

  if (n.includes("KEPLER")) return {
    agency,
    country,
    launchDate: "2009-03-07",
    launchVehicle: "Delta II 7925-10L",
    purpose: "Historic exoplanet discovery telescope that monitored 150,000 stars simultaneously, discovering over 2,600 confirmed extrasolar planets.",
    status: "Defunct",
    orbit: "Heliocentric Earth-trailing orbit",
    mass: "1,052 kg",
    instruments: ["95 Megapixel Photometer Array (42 CCDs)"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Kepler_spacecraft_model.png/800px-Kepler_spacecraft_model.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Kepler_space_telescope",
    tags: ["Exoplanets", "Kepler", "NASA", "Deep Space"]
  };

  if (n.includes("FERMI") || n.includes("GLAST")) return {
    agency,
    country,
    launchDate: "2008-06-11",
    launchVehicle: "Delta II 7920H-10C",
    purpose: "High-energy gamma-ray observatory mapping cosmic gamma-ray bursts, active galactic nuclei (blazars), pulsars, and cosmic ray sources.",
    status: "Operational",
    orbit: "LEO ~ 535 km × 25.6°",
    mass: "4,303 kg",
    instruments: ["LAT Large Area Telescope (20 MeV–300 GeV)", "GBM Gamma-ray Burst Monitor"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Fermi_Gamma-ray_Space_Telescope.jpg/800px-Fermi_Gamma-ray_Space_Telescope.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Fermi_Gamma-ray_Space_Telescope",
    tags: ["Gamma-Ray", "NASA", "Astrophysics", "Cosmic Rays"]
  };

  if (n.includes("SWIFT")) return {
    agency,
    country,
    launchDate: "2004-11-20",
    launchVehicle: "Delta II 7320-10C",
    purpose: "Multi-wavelength space observatory dedicated to detecting gamma-ray bursts (GRBs) and rapidly slewing within 20–75 seconds to observe afterglows.",
    status: "Operational",
    orbit: "LEO ~ 585 km × 20.6°",
    mass: "1,470 kg",
    instruments: ["BAT Burst Alert Telescope", "XRT X-ray Telescope", "UVOT Ultraviolet/Optical Telescope"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Swift_Observatory.jpg/800px-Swift_Observatory.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Neil_Gehrels_Swift_Observatory",
    tags: ["Gamma-Ray Burst", "NASA", "X-Ray", "Transient"]
  };

  if (n.includes("EUCLID")) return {
    agency,
    country,
    launchDate: "2023-07-01",
    launchVehicle: "Falcon 9 Block 5",
    purpose: "ESA space telescope mapping the geometry of the dark Universe, measuring shape and redshift of billions of galaxies across 10 billion light-years.",
    status: "Operational",
    orbit: "Halo orbit around Sun-Earth L2 Lagrange Point (~1.5 million km)",
    mass: "2,160 kg",
    instruments: ["VIS Visible Instrument (36 CCDs)", "NISP Near-Infrared Spectrometer and Photometer"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Euclid_spacecraft_model.png/800px-Euclid_spacecraft_model.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Euclid_(spacecraft)",
    tags: ["Dark Energy", "ESA", "Cosmology", "L2 Orbit"]
  };

  if (n.includes("GAIA")) return {
    agency,
    country,
    launchDate: "2013-12-19",
    launchVehicle: "Soyuz ST-B / Fregat-MT",
    purpose: "ESA astrometry mission measuring ultra-precise 3D positions, motions, and distances for over 1 billion stars, creating the most accurate 3D map of the Milky Way.",
    status: "Operational",
    orbit: "Lissajous orbit around Sun-Earth L2 Lagrange Point",
    mass: "2,030 kg",
    instruments: ["Astrometric Instrument (1 Gigapixel CCD Focal Plane)", "Photometric Instrument", "Radial Velocity Spectrometer"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Gaia_spacecraft_artist_impression.png/800px-Gaia_spacecraft_artist_impression.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Gaia_(spacecraft)",
    tags: ["Astrometry", "Milky Way", "ESA", "Stellar Map"]
  };

  // ── 6. Earth Observation & Science ──────────────────────────────────────────
  if (n.includes("LANDSAT")) return {
    agency,
    country,
    launchDate: "1999–2021 (Landsat 7, 8, 9)",
    launchVehicle: "Delta II / Atlas V 401",
    purpose: `${cleanName} is an Earth observation satellite collecting 15–30 meter optical and thermal multispectral imagery for global land cover change analysis.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 705 km × 98.2°",
    mass: "2,626 kg (Landsat 9)",
    instruments: ["OLI-2 Operational Land Imager", "TIRS-2 Thermal Infrared Sensor"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Landsat_8_spacecraft.png/800px-Landsat_8_spacecraft.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Landsat_program",
    tags: ["Earth Observation", "Landsat", "USGS", "Multispectral"]
  };

  if (n.includes("SENTINEL")) return {
    agency,
    country,
    launchDate: "2014–present",
    launchVehicle: "Soyuz / Vega / Falcon 9",
    purpose: `${cleanName} is an ESA Copernicus flagship Earth observation satellite providing C-band SAR radar or multispectral land/ocean imagery for global environmental monitoring.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 693–786 km × 98.5°",
    mass: "1,140–2,300 kg",
    instruments: ["C-SAR Radar", "MSI Multispectral Instrument", "OLCI Ocean Colour Instrument", "TROPOMI Atmospheric Sounder"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Sentinel-2A.png/800px-Sentinel-2A.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Copernicus_Programme",
    tags: ["Copernicus", "ESA", "Radar", "Earth Observation"]
  };

  if (n.includes("TERRA") || n.includes("AQUA") || n.includes("AURA")) return {
    agency,
    country,
    launchDate: "1999–2004 (NASA Earth Observing System)",
    launchVehicle: "Atlas IIAS / Delta II",
    purpose: `${cleanName} is a core NASA Earth Observing System (EOS) satellite measuring global cloud properties, vegetation health (MODIS), atmospheric ozone (OMI), and ocean chlorophyll.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 705 km × 98.2°",
    mass: "5,190 kg (Terra)",
    instruments: ["MODIS Moderate Resolution Imaging Spectroradiometer", "MISR Multi-angle Imaging", "AIRS Atmospheric Infrared Sounder", "OMI Ozone Monitoring Instrument"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Terra_satellite.jpg/800px-Terra_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Earth_Observing_System",
    tags: ["Earth Science", "NASA EOS", "MODIS", "Climate"]
  };

  // ── 7. Weather & Environmental ──────────────────────────────────────────────
  if (n.includes("METEOSAT") || n.includes("MSG")) return {
    agency,
    country,
    launchDate: "2002–present (MSG / MTG series)",
    launchVehicle: "Ariane 5 / Ariane 6",
    purpose: `${cleanName} is a geostationary weather satellite providing high-frequency multispectral imagery for storm tracking and numerical weather prediction.`,
    status: "Operational",
    orbit: "GEO ~ 35,786 km × 0.0°",
    mass: "2,000 kg",
    instruments: ["SEVIRI (12 multispectral channels)", "GERB (Earth Radiation Budget)"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/MSG-3.jpg/800px-MSG-3.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Meteosat",
    tags: ["Weather", "Geostationary", "EUMETSAT", "Europe"]
  };

  if (n.includes("FENGYUN") || n.includes("FY-")) return {
    agency,
    country,
    launchDate: "2008–present (FY-3 polar & FY-4 geostationary)",
    launchVehicle: "Long March 4C / 3B",
    purpose: `${cleanName} is a Chinese Fengyun meteorological satellite conducting 3D atmospheric temperature profiling, microwave moisture sounding, and typhoon path forecasting.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 830 km / GEO ~ 35,786 km",
    mass: "2,450 kg",
    instruments: ["VIRR Optical Radiometer", "MWTS Microwave Temperature Sounder", "GIIRS Interferometric Sounder"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Fengyun-3A.jpg/800px-Fengyun-3A.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Fengyun",
    tags: ["Weather", "CMA", "China", "Meteorology"]
  };

  if (n.includes("EWS") || n.includes("GOES")) return {
    agency,
    country,
    launchDate: "2016–present (GOES-R / EWS series)",
    launchVehicle: "Atlas V 541 / Falcon 9",
    purpose: `${cleanName} is an advanced geostationary meteorological observatory capturing real-time full-disk lightning mapping, severe solar flare X-ray monitoring, and 30-second storm imaging.`,
    status: "Operational",
    orbit: "GEO ~ 35,786 km",
    mass: "5,200 kg at launch",
    instruments: ["ABI Advanced Baseline Imager (16 channels)", "GLM Geostationary Lightning Mapper", "SUVI Solar UV Imager"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/GOES-R_spacecraft_model.png/800px-GOES-R_spacecraft_model.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/GOES",
    tags: ["Weather", "Geostationary", "NOAA", "Lightning"]
  };

  // ── 8. GNSS Navigation ──────────────────────────────────────────────────────
  if (n.includes("GPS") || n.includes("NAVSTAR") || n.includes("PRN") || n.includes("BIIR") || n.includes("BIIF") || n.includes("BIII")) return {
    agency,
    country,
    launchDate: "1978–present (Block IIF & III current operational fleet)",
    launchVehicle: "Delta IV / Atlas V / Falcon 9",
    purpose: `${cleanName} is an operational US Global Positioning System navigation satellite operating in MEO to deliver atomic timing, 3D positioning, and velocity.`,
    status: "Operational",
    orbit: "MEO ~ 20,200 km altitude × 55.0° inclination (11 hr 58 min period)",
    mass: "1,630 kg to 2,200 kg",
    power: "1.9 kW dual solar arrays",
    instruments: ["Rubidium & Cesium Atomic Clocks (3-4 per sat)", "L1 (1575.42 MHz), L2 (1227.60 MHz), L5 (1176.45 MHz) Payloads", "Nuclear Detonation Detection System (NDS)"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/GPS24goldenSMALL.gif/600px-GPS24goldenSMALL.gif"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/GPS_satellite_blocks",
    tags: ["GPS", "Navigation", "MEO", "USSF", "GNSS"]
  };

  if (n.includes("GALILEO") || n.includes("GSAT")) return {
    agency,
    country,
    launchDate: "2011–present",
    launchVehicle: "Ariane 5 / Soyuz / Ariane 6",
    purpose: `${cleanName} is a European Union Galileo GNSS satellite offering sub-meter positioning precision, encrypted Public Regulated Service (PRS), and Search and Rescue (SAR) alert relay.`,
    status: "Operational",
    orbit: "MEO ~ 23,222 km × 56.0°",
    mass: "700 kg per satellite",
    instruments: ["Passive Hydrogen Maser (PHM) Clocks", "Rubidium Atomic Frequency Standards (RAFS)", "E1, E5, E6 Navigation Transmitters"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Galileo_satellite_artist_impression.jpg/800px-Galileo_satellite_artist_impression.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Galileo_(satellite_navigation)",
    tags: ["Galileo", "GNSS", "Navigation", "European Union"]
  };

  if (n.includes("BEIDOU") || n.includes("BDS")) return {
    agency,
    country,
    launchDate: "2015–present (BDS-3 Constellation)",
    launchVehicle: "Long March 3B / 3C",
    purpose: `${cleanName} is a Chinese BeiDou BDS-3 navigation satellite delivering positioning, timing, and short-message text communications globally.`,
    status: "Operational",
    orbit: "MEO ~ 21,500 km / GEO ~ 35,786 km / IGSO ~ 35,786 km × 55°",
    mass: "1,014 kg to 4,600 kg",
    instruments: ["High-stability Hydrogen Atomic Clock", "Inter-satellite Laser Links", "B1I, B1C, B2a, B3I Navigation Signals"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/BeiDou-3_satellite.jpg/800px-BeiDou-3_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/BeiDou",
    tags: ["BeiDou", "GNSS", "Navigation", "China"]
  };

  if (n.includes("GLONASS") || (n.includes("KOSMOS") && category === "gnss")) return {
    agency,
    country,
    launchDate: "2003–present (Glonass-M / Glonass-K series)",
    launchVehicle: "Proton-M / Soyuz-2.1b",
    purpose: `${cleanName} is a Russian GLONASS navigation satellite operating in MEO to deliver continuous navigation coverage across high northern latitudes.`,
    status: "Operational",
    orbit: "MEO ~ 19,100 km × 64.8°",
    mass: "1,415 kg",
    instruments: ["Cesium Atomic Clocks", "FDAMA/CDMA L1/L2 Transmitters"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Glonass-K1.jpg/800px-Glonass-K1.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/GLONASS",
    tags: ["GLONASS", "GNSS", "Navigation", "Russia"]
  };

  // ── 9. Megaconstellations & Commercial Satellites ─────────────────────────
  if (n.includes("STARLINK")) return {
    agency,
    country,
    launchDate: "2019–present",
    launchVehicle: "Falcon 9 Block 5",
    purpose: `${cleanName} is a SpaceX Starlink low Earth orbit communication satellite delivering high-speed satellite broadband internet globally using Ku/Ka-band phased array antennas.`,
    status: "Operational",
    orbit: "LEO ~ 550 km × 53.0°",
    mass: "260–800 kg per satellite",
    instruments: ["Ku/Ka-band Digital Phased Array Antennas", "Optical Inter-Satellite Lasers"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Starlink_Mission_%2847926144123%29.jpg/800px-Starlink_Mission_%2847926144123%29.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Starlink",
    tags: ["Broadband", "Starlink", "Constellation", "SpaceX"]
  };

  if (n.includes("ONEWEB")) return {
    agency,
    country,
    launchDate: "2019–present",
    launchVehicle: "Soyuz-2 / Falcon 9 / LVM3",
    purpose: `${cleanName} is a Eutelsat OneWeb LEO communication satellite operating in polar constellation to deliver enterprise broadband and cellular backhaul.`,
    status: "Operational",
    orbit: "LEO ~ 1,200 km × 87.9° polar inclination",
    mass: "147 kg per satellite",
    power: "380 W dual solar array",
    instruments: ["Ku-band User Link & Ka-band Gateway Transmitters", "Hall-effect Electric Propulsion"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/OneWeb_satellite.jpg/800px-OneWeb_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Eutelsat_OneWeb",
    tags: ["Broadband", "OneWeb", "Constellation", "LEO"]
  };

  if (n.includes("IRIDIUM")) return {
    agency,
    country,
    launchDate: "2017–2019 (Iridium NEXT fleet)",
    launchVehicle: "Falcon 9 Block 4/5",
    purpose: `${cleanName} is an Iridium NEXT cross-linked LEO satellite providing global mobile voice/data communications, Aireon ADS-B aircraft tracking, and AIS maritime monitoring.`,
    status: "Operational",
    orbit: "LEO ~ 780 km × 86.4° polar orbit",
    mass: "860 kg per satellite",
    instruments: ["L-band Transceivers", "Ka-band Cross-links", "Aireon ADS-B Receiver", "ExactEarth AIS Payload"],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Iridium_NEXT_satellite.jpg/800px-Iridium_NEXT_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Iridium_NEXT",
    tags: ["Iridium", "Voice/Data", "ADS-B", "Cross-Link"]
  };

  // ── 10. Research-Grade Generic Fallback tailored by Satellite Name ────────
  const directWikiUrl = getDirectWikipediaUrl(name, category) || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanName.replace(/ /g, '_'))}`;

  return {
    agency,
    country,
    purpose: `${cleanName} is an orbital satellite operating in Earth orbit, conducting scientific observation, communications, satellite navigation, or space domain operations.`,
    status: "Operational",
    orbit: "Earth Orbit",
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: directWikiUrl,
    tags: [cleanName, category.toUpperCase(), "Earth Orbit"]
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper component: colored status badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Operational: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Defunct: "bg-red-500/15 text-red-400 border-red-500/30",
    Decaying: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    Unknown: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${styles[status] || styles.Unknown}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery card sub-component
// ─────────────────────────────────────────────────────────────────────────────
function DiscoveryCard({ d }: { d: { title: string; desc: string; imageUrl?: string } }) {
  const [cardImgErr, setCardImgErr] = useState(false);

  return (
    <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 overflow-hidden flex flex-col justify-between">
      {d.imageUrl && !cardImgErr && (
        <div className="h-32 overflow-hidden relative bg-slate-950">
          <img
            src={d.imageUrl}
            alt={d.title}
            referrerPolicy="no-referrer"
            onError={() => setCardImgErr(true)}
            className="w-full h-full object-cover opacity-90 hover:opacity-100 transition duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        </div>
      )}
      <div className="p-3">
        <p className="text-[11px] font-bold text-[#00e5ff] leading-tight flex items-center gap-1.5">
          <Star className="h-3 w-3 text-[#00e5ff] flex-shrink-0" />
          {d.title}
        </p>
        <p className="text-[10px] text-slate-300 mt-1.5 leading-relaxed">{d.desc}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────────────────────────
interface SatelliteInfoPanelProps {
  noradId: number;
  satName: string;
  category: string;
  orbitalElements?: {
    inclination: number;
    eccentricity: number;
    periodMin: number;
    perigeeAlt: number;
    apogeeAlt: number;
  } | null;
}

export default function SatelliteInfoPanel({ noradId, satName, category, orbitalElements }: SatelliteInfoPanelProps) {
  const [imgError, setImgError] = useState(false);
  const [dynamicWiki, setDynamicWiki] = useState<{ imageUrl?: string; wikiUrl?: string; extract?: string } | null>(null);

  const satelliteInfoCache = useOrbitalStore((s) => s.satelliteInfoCache);
  const cacheSatelliteInfo = useOrbitalStore((s) => s.cacheSatelliteInfo);

  const base = SATELLITE_DB[noradId];
  const inferred = inferSatelliteInfo(satName, category);
  const directWikiUrl = getDirectWikipediaUrl(satName, category);

  // Dynamic Wikipedia API fetcher via server-side endpoint with client + disk cache
  useEffect(() => {
    let isCurrent = true;
    setImgError(false);

    // 1. Check client store cache
    const cached = satelliteInfoCache[noradId];
    if (cached) {
      setDynamicWiki({
        imageUrl: cached.imageUrl || undefined,
        wikiUrl: cached.wikipediaUrl || undefined,
        extract: cached.extract || undefined,
      });
      return;
    }

    // 2. Fetch from server API route
    fetch(`/api/orbit/satellite-info?noradId=${noradId}&name=${encodeURIComponent(satName)}&category=${encodeURIComponent(category)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isCurrent) return;
        if (data && !data.error) {
          cacheSatelliteInfo(noradId, data);
          setDynamicWiki({
            imageUrl: data.imageUrl || undefined,
            wikiUrl: data.wikipediaUrl || undefined,
            extract: data.extract || undefined,
          });
        }
      })
      .catch(() => { /* skip API fallback */ });

    return () => {
      isCurrent = false;
    };
  }, [noradId, satName, category, base, satelliteInfoCache, cacheSatelliteInfo]);

  // Format live telemetry orbit profile dynamically if orbital elements are provided
  const dynamicOrbit = orbitalElements
    ? `${orbitalElements.perigeeAlt < 2000 ? "LEO" : orbitalElements.perigeeAlt < 35000 ? "MEO" : "GEO"} ~ ${Math.round(orbitalElements.perigeeAlt)} km × ${Math.round(orbitalElements.apogeeAlt)} km (${orbitalElements.periodMin.toFixed(1)} min period, ${orbitalElements.inclination.toFixed(2)}° inc)`
    : null;

  // Merge Priority: Curated DB -> Direct Series Link -> Dynamic Server/Wiki -> Pattern Inferred -> Direct Satellite URL
  const cleanName = satName.replace(/\(.*\)/g, '').trim().replace(/ /g, '_');
  const fallbackWikiUrl = directWikiUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanName)}`;

  const info: Partial<SatelliteInfo> & { name: string } = {
    ...inferred,
    ...base,
    name: base?.name || satName,
    imageUrl: base?.imageUrl || dynamicWiki?.imageUrl || inferred.imageUrl || LOCAL_FALLBACK_IMG,
    wikipediaUrl: base?.wikipediaUrl || directWikiUrl || dynamicWiki?.wikiUrl || inferred.wikipediaUrl || fallbackWikiUrl,
    purpose: base?.purpose || dynamicWiki?.extract || inferred.purpose || `${satName} is an orbital spacecraft operating in Earth orbit for communications, navigation, science, or Earth observation operations.`,
    orbit: dynamicOrbit || base?.orbit || inferred.orbit || "Earth Orbit",
  };

  const tags = info.tags || [];
  const isDebris = isDebrisOrRocketBody(satName);

  return (
    <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-[#0b0f19] to-[#080c16] overflow-hidden shadow-2xl mt-4">
      {/* Header banner */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isDebris ? "border-red-900/60 bg-red-950/20" : "border-slate-800/80 bg-[#00e5ff]/5"}`}>
        {isDebris ? (
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 animate-pulse" />
        ) : (
          <Eye className="h-4 w-4 text-[#00e5ff] flex-shrink-0" />
        )}
        <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isDebris ? "text-red-400" : "text-[#00e5ff]"}`}>
          {isDebris ? "Debris Intelligence & Hazard Dossier" : "Mission Intelligence & Technical Dossier"}
        </span>
        <span className="ml-auto text-[10px] font-mono text-slate-400 bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded">
          NORAD #{noradId}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
        {/* Left: Satellite image + Technical specifications */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950/40">
          {/* Image Container with SVG fallback */}
          <div className="relative h-52 lg:h-60 bg-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-800/60">
            <img
              src={imgError ? LOCAL_FALLBACK_IMG : (info.imageUrl || LOCAL_FALLBACK_IMG)}
              alt={info.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover opacity-95 hover:opacity-100 transition duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-transparent pointer-events-none" />
            
            {/* Tags overlay */}
            {tags.length > 0 && (
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                {tags.slice(0, 3).map((t) => (
                  <span key={t} className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border ${isDebris ? "text-red-400 border-red-500/30" : "text-[#00e5ff] border-[#00e5ff]/20"}`}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick facts */}
          <div className="p-4 space-y-3 flex-1 text-xs">
            {info.status && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Operational Status</span>
                <StatusBadge status={info.status} />
              </div>
            )}

            {info.agency && (
              <div className="pb-2 border-b border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1 font-semibold">
                  <Globe className="h-3 w-3 text-[#00e5ff]" /> Operating Agency / Country
                </span>
                <p className="text-[11px] text-white font-bold leading-snug">{info.agency}</p>
                {info.country && <p className="text-[9px] text-slate-400 font-mono mt-0.5">{info.country}</p>}
              </div>
            )}

            {info.launchDate && (
              <div className="pb-2 border-b border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1 font-semibold">
                  <Calendar className="h-3 w-3 text-amber-400" /> Launch Date &amp; Vehicle
                </span>
                <p className="text-[11px] text-white font-mono">{info.launchDate}</p>
                {info.launchVehicle && <p className="text-[10px] text-slate-300 mt-0.5">{info.launchVehicle}</p>}
              </div>
            )}

            {info.orbit && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1 font-semibold">
                  <MapPin className="h-3 w-3 text-[#ff3366]" /> Orbit Profile
                </span>
                <p className="text-[10px] text-[#00e5ff] font-mono leading-snug">{info.orbit}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Technical Specifications, Mission Purpose & Discoveries */}
        <div className="p-5 flex flex-col gap-5 overflow-hidden">
          
          {/* Mission title & description & Direct Wikipedia Button */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                {isDebris ? <AlertTriangle className="h-4.5 w-4.5 text-red-400" /> : <Satellite className="h-4.5 w-4.5 text-[#00e5ff]" />}
                {info.name}
              </h2>

              {info.wikipediaUrl && (
                <a
                  href={info.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-100 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-[#00e5ff] rounded-lg px-3 py-1.5 transition shadow-lg"
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#00e5ff]" />
                  <span>Wikipedia Article</span>
                  <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                </a>
              )}
            </div>

            <p className={`text-xs leading-relaxed border p-3.5 rounded-lg ${isDebris ? "bg-red-950/20 border-red-900/40 text-red-200" : "bg-slate-900/40 border-slate-850 text-slate-300"}`}>
              {info.purpose}
            </p>
          </div>

          {/* Technical Specs Grid (Mass, Dimensions, Power, Instruments) */}
          {(info.mass || info.dimensions || info.power || (info.instruments && info.instruments.length > 0)) && (
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Wrench className="h-3.5 w-3.5 text-amber-400" />
                Spacecraft Technical Specifications
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {info.mass && (
                  <div className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded-lg">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Dry / Launch Mass</span>
                    <p className="text-xs font-bold text-white font-mono mt-1">{info.mass}</p>
                  </div>
                )}

                {info.dimensions && (
                  <div className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded-lg">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Physical Dimensions</span>
                    <p className="text-xs font-bold text-white font-mono mt-1">{info.dimensions}</p>
                  </div>
                )}

                {info.power && (
                  <div className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded-lg">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Electrical Power Output</span>
                    <p className="text-xs font-bold text-emerald-400 font-mono mt-1">{info.power}</p>
                  </div>
                )}
              </div>

              {info.instruments && info.instruments.length > 0 && (
                <div className="mt-3 bg-slate-900/30 border border-slate-850 p-3 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Cpu className="h-3 w-3 text-[#00e5ff]" /> Onboard Payload &amp; Scientific Instruments
                  </span>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {info.instruments.map((inst, idx) => (
                      <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                        <span className="text-[#00e5ff] font-bold mt-0.5">•</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Discoveries & Key Findings */}
          {info.discoveries && info.discoveries.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Star className="h-3.5 w-3.5 text-[#ff3366]" />
                Key Discoveries &amp; Mission Accomplishments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {info.discoveries.map((d, i) => (
                  <DiscoveryCard key={i} d={d} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
