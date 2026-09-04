// Pure environment-agnostic helper utilities for satellite metadata & Wikipedia URL resolution

export function isDebrisOrRocketBody(rawName: string): boolean {
  const n = rawName.toUpperCase();
  return (
    n.includes("DEB") ||
    n.includes("R/B") ||
    n.includes("ROCKET BODY") ||
    n.includes("DEBRIS") ||
    n.includes("SPENT STAGE") ||
    n.includes("UPPER STAGE") ||
    n.startsWith("SL-") ||
    n.includes("FREGAT DEB") ||
    n.includes("CENTAUR R/B") ||
    n.includes("DELTA R/B") ||
    n.includes("SOYUZ R/B") ||
    (n.includes("CZ-") && n.includes("R/B"))
  );
}

export function inferAgencyAndCountry(name: string, category: string): { agency: string; country: string } {
  const n = name.toUpperCase();

  // China Fleets
  if (
    n.includes("YAOGAN") || n.includes("GAOFEN") || n.includes("GF-") ||
    n.includes("SHIYAN") || n.includes("SY-") || n.includes("SHIJIAN") || n.includes("SJ-") ||
    n.includes("TIANGONG") || n.includes("CSS") || n.includes("TIANHE") || n.includes("WENTIAN") || n.includes("MENGTIAN") ||
    n.includes("TIANZHOU") || n.includes("BEIDOU") || n.includes("BDS") || n.includes("FENGYUN") || n.includes("FY-") ||
    n.includes("JILIN") || n.includes("CHINASAT") || n.includes("ZHONGXING") || n.includes("HJ-") || n.includes("ZY-")
  ) {
    return { agency: "CNSA (China National Space Administration)", country: "China" };
  }

  // India Fleets
  if (
    n.includes("ASTROSAT") || n.includes("CARTOSAT") || n.includes("RISAT") || n.includes("OCEANSAT") ||
    n.includes("RESOURCESAT") || n.includes("EOS-") || n.includes("GSAT") || n.includes("INSAT") ||
    n.includes("IRNSS") || n.includes("NAVIC") || n.includes("CHANDRAYAAN") || n.includes("ADITYA")
  ) {
    return { agency: "ISRO (Indian Space Research Organisation)", country: "India" };
  }

  // US Missions & Constellations
  if (
    n.includes("USA") || n.includes("NAVSTAR") || n.includes("GPS") || n.includes("STARLINK") ||
    n.includes("IRIDIUM") || n.includes("GLOBALSTAR") || n.includes("GOES") || n.includes("NOAA") ||
    n.includes("LANDSAT") || n.includes("TERRA") || n.includes("AQUA") || n.includes("AURA") ||
    n.includes("HUBBLE") || n.includes("JWST") || n.includes("CHANDRA") || n.includes("TESS") ||
    n.includes("KEPLER") || n.includes("FERMI") || n.includes("SWIFT") || n.includes("ICESAT") ||
    n.includes("GRACE") || n.includes("SMAP") || n.includes("CALIPSO") || n.includes("CLOUDSAT") ||
    n.includes("NROL") || n.includes("DMSP") || n.includes("ORBCOMM") || n.includes("FLOCK") ||
    n.includes("DOVE") || n.includes("PLANET") || n.includes("LEMUR") || n.includes("SPIRE") ||
    n.includes("CAPELLA") || n.includes("BLACKSKY") || n.includes("HAWK")
  ) {
    return { agency: "NASA / US Space Force / NOAA / USGS / US Commercial", country: "United States" };
  }

  // European Space Agency & Member States
  if (
    n.includes("SENTINEL") || n.includes("GALILEO") || n.includes("METEOSAT") || n.includes("MSG") ||
    n.includes("MTG") || n.includes("METOP") || n.includes("ENVISAT") || n.includes("EUCLID") ||
    n.includes("GAIA") || n.includes("CHEOPS") || n.includes("SWARM") || n.includes("SPOT") ||
    n.includes("PLEIADES") || n.includes("ERS-") || n.includes("AEOLUS") || n.includes("CRYOSAT") ||
    n.includes("SMOS") || n.includes("PROBA")
  ) {
    return { agency: "ESA (European Space Agency) / EUMETSAT / CNES", country: "European Union / Europe" };
  }

  // Russian Fleets
  if (
    n.includes("KOSMOS") || n.includes("COSMOS") || n.includes("GLONASS") || n.includes("SOYUZ") ||
    n.includes("PROGRESS") || n.includes("FREGAT") || n.includes("RESURS") || n.includes("KANOPUS") ||
    n.includes("METEOR") || n.includes("ELEKTRO") || n.includes("LOTOS") || n.includes("PION") ||
    n.includes("SPEKTR") || n.includes("EXPRESS") || n.includes("YAMAL")
  ) {
    return { agency: "Roscosmos / Russian Aerospace Forces (VKS)", country: "Russia" };
  }

  // Japan Fleets
  if (
    n.includes("ALOS") || n.includes("DAICHI") || n.includes("HIMAWARI") || n.includes("XRISM") ||
    n.includes("HITOMI") || n.includes("SUZAKU") || n.includes("GCOM") || n.includes("SHIZUKU") ||
    n.includes("QZSS") || n.includes("MICHIBIKI") || n.includes("HTV") || n.includes("KUNOTORI")
  ) {
    return { agency: "JAXA (Japan Aerospace Exploration Agency) / JMA", country: "Japan" };
  }

  // South Korea
  if (n.includes("KOMPSAT") || n.includes("COMS") || n.includes("GEO-KOMPSAT") || n.includes("KOREASAT")) {
    return { agency: "KARI (Korea Aerospace Research Institute)", country: "South Korea" };
  }

  // Canada
  if (n.includes("RADARSAT") || n.includes("RCM") || n.includes("BRITE") || n.includes("CASSIOPE")) {
    return { agency: "CSA (Canadian Space Agency)", country: "Canada" };
  }

  // UK / France
  if (n.includes("ONEWEB")) return { agency: "Eutelsat OneWeb", country: "United Kingdom / France" };

  // Finland
  if (n.includes("ICEYE")) return { agency: "ICEYE Oy", country: "Finland" };

  // Radio Amateur
  if (n.includes("AO-") || n.includes("FO-") || n.includes("JO-") || n.includes("PO-") || n.includes("SO-") || n.includes("CAS-") || n.includes("AMSAT")) {
    return { agency: "AMSAT Amateur Radio Satellite Corporation", country: "International Radio Amateur" };
  }

  // Clean fallback based on satellite name
  const clean = name.replace(/\(.*\)/g, '').trim();
  return { agency: `${clean} Mission Operator`, country: "Global Space Operations" };
}

export function getDirectWikipediaUrl(rawName: string, category: string): string | null {
  const n = rawName.toUpperCase();

  // Debris & Rocket Stages
  if (n.includes("FREGAT")) return "https://en.wikipedia.org/wiki/Fregat";
  if (n.includes("CENTAUR")) return "https://en.wikipedia.org/wiki/Centaur_(rocket_stage)";
  if (n.includes("SOYUZ") && (n.includes("R/B") || n.includes("DEB"))) return "https://en.wikipedia.org/wiki/Soyuz_(rocket_family)";
  if (n.includes("DELTA") && (n.includes("R/B") || n.includes("DEB"))) return "https://en.wikipedia.org/wiki/Delta_(rocket_family)";
  if (n.includes("FALCON") && (n.includes("R/B") || n.includes("DEB"))) return "https://en.wikipedia.org/wiki/Falcon_9";
  if ((n.includes("CZ-") || n.includes("LONG MARCH")) && (n.includes("R/B") || n.includes("DEB"))) return "https://en.wikipedia.org/wiki/Long_March_(rocket_family)";
  if (n.includes("TITAN") && (n.includes("R/B") || n.includes("DEB"))) return "https://en.wikipedia.org/wiki/Titan_(rocket_family)";
  if (n.includes("PEGASUS") && (n.includes("R/B") || n.includes("DEB"))) return "https://en.wikipedia.org/wiki/Pegasus_(rocket)";
  if (n.includes("ARIANE") && (n.includes("R/B") || n.includes("DEB"))) return "https://en.wikipedia.org/wiki/Ariane_(rocket_family)";
  if (n.includes("PSLV") && (n.includes("R/B") || n.includes("DEB"))) return "https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle";
  if (n.includes("H-2A") || n.includes("H-II")) return "https://en.wikipedia.org/wiki/H-IIA";
  if (isDebrisOrRocketBody(n)) return "https://en.wikipedia.org/wiki/Space_debris";

  // Cargo & Resupply Capsules
  if (n.includes("DRAGON CRS") || n.includes("CREW DRAGON")) return "https://en.wikipedia.org/wiki/SpaceX_Dragon_2";
  if (n.includes("SOYUZ MS") || n.includes("SOYUZ TMA") || n.includes("SOYUZ T")) return "https://en.wikipedia.org/wiki/Soyuz_MS";
  if (n.includes("PROGRESS MS") || n.includes("PROGRESS M")) return "https://en.wikipedia.org/wiki/Progress_(spacecraft)";
  if (n.includes("CYGNUS")) return "https://en.wikipedia.org/wiki/Cygnus_(spacecraft)";
  if (n.includes("TIANZHOU")) return "https://en.wikipedia.org/wiki/Tianzhou_(spacecraft)";
  if (n.includes("STARLINER") || n.includes("CST-100")) return "https://en.wikipedia.org/wiki/Boeing_Starliner";
  if (n.includes("HTV") || n.includes("KUNOTORI")) return "https://en.wikipedia.org/wiki/H-II_Transfer_Vehicle";

  // Space Stations
  if (n.includes("ISS") || n.includes("ZARYA") || n.includes("NAUKA") || n.includes("COLUMBUS") || n.includes("KIBO")) return "https://en.wikipedia.org/wiki/International_Space_Station";
  if (n.includes("TIANGONG") || n.includes("CSS") || n.includes("TIANHE") || n.includes("WENTIAN") || n.includes("MENGTIAN")) return "https://en.wikipedia.org/wiki/Tiangong_space_station";
  if (n.includes("MIR")) return "https://en.wikipedia.org/wiki/Mir";

  // Observatories / Telescopes
  if (n.includes("HUBBLE") || n.includes("HST")) return "https://en.wikipedia.org/wiki/Hubble_Space_Telescope";
  if (n.includes("JAMES WEBB") || n.includes("JWST")) return "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope";
  if (n.includes("CHANDRA") || n.includes("CXO")) return "https://en.wikipedia.org/wiki/Chandra_X-ray_Observatory";
  if (n.includes("SPITZER")) return "https://en.wikipedia.org/wiki/Spitzer_Space_Telescope";
  if (n.includes("KEPLER")) return "https://en.wikipedia.org/wiki/Kepler_space_telescope";
  if (n.includes("TESS")) return "https://en.wikipedia.org/wiki/Transiting_Exoplanet_Survey_Satellite";
  if (n.includes("FERMI") || n.includes("GLAST")) return "https://en.wikipedia.org/wiki/Fermi_Gamma-ray_Space_Telescope";
  if (n.includes("SWIFT")) return "https://en.wikipedia.org/wiki/Neil_Gehrels_Swift_Observatory";
  if (n.includes("EUCLID")) return "https://en.wikipedia.org/wiki/Euclid_(spacecraft)";
  if (n.includes("GAIA")) return "https://en.wikipedia.org/wiki/Gaia_(spacecraft)";
  if (n.includes("CHEOPS")) return "https://en.wikipedia.org/wiki/CHEOPS";
  if (n.includes("XRISM")) return "https://en.wikipedia.org/wiki/XRISM";
  if (n.includes("ASTROSAT")) return "https://en.wikipedia.org/wiki/Astrosat";
  if (n.includes("XMM")) return "https://en.wikipedia.org/wiki/XMM-Newton";
  if (n.includes("SOHO")) return "https://en.wikipedia.org/wiki/Solar_and_Heliospheric_Observatory";
  if (n.includes("SDO")) return "https://en.wikipedia.org/wiki/Solar_Dynamics_Observatory";
  if (n.includes("PARKER")) return "https://en.wikipedia.org/wiki/Parker_Solar_Probe";
  if (n.includes("IXPE")) return "https://en.wikipedia.org/wiki/Imaging_X-ray_Polarimetry_Explorer";
  if (n.includes("NICER")) return "https://en.wikipedia.org/wiki/Neutron_Star_Interior_Composition_Explorer";

  // Weather Satellites
  const noaaMatch = n.match(/NOAA[ -]?(\d+)/);
  if (noaaMatch) return `https://en.wikipedia.org/wiki/NOAA-${noaaMatch[1]}`;
  const goesMatch = n.match(/GOES[ -]?(\d+)/);
  if (goesMatch) return `https://en.wikipedia.org/wiki/GOES-${goesMatch[1]}`;
  if (n.includes("METEOSAT") || n.includes("MSG")) return "https://en.wikipedia.org/wiki/Meteosat";
  if (n.includes("FENGYUN") || n.includes("FY-")) return "https://en.wikipedia.org/wiki/Fengyun";
  if (n.includes("HIMAWARI")) return "https://en.wikipedia.org/wiki/Himawari_(satellites)";
  if (n.includes("METOP")) return "https://en.wikipedia.org/wiki/MetOp";
  if (n.includes("SUOMI") || n.includes("NPP")) return "https://en.wikipedia.org/wiki/Suomi_NPP";
  if (n.includes("JPSS")) return "https://en.wikipedia.org/wiki/Joint_Polar_Satellite_System";

  // China Fleets
  if (n.includes("YAOGAN")) return "https://en.wikipedia.org/wiki/Yaogan";
  if (n.includes("GAOFEN") || n.includes("GF-")) return "https://en.wikipedia.org/wiki/Gaofen";
  if (n.includes("SHIYAN") || n.includes("SY-")) return "https://en.wikipedia.org/wiki/Shiyan_(satellite_series)";
  if (n.includes("SHIJIAN") || n.includes("SJ-")) return "https://en.wikipedia.org/wiki/Shijian";
  if (n.includes("JILIN")) return "https://en.wikipedia.org/wiki/Jilin-1";

  // India ISRO Fleets
  if (n.includes("CARTOSAT")) return "https://en.wikipedia.org/wiki/Cartosat";
  if (n.includes("RISAT")) return "https://en.wikipedia.org/wiki/RISAT";
  if (n.includes("OCEANSAT")) return "https://en.wikipedia.org/wiki/Oceansat-1";
  if (n.includes("RESOURCESAT")) return "https://en.wikipedia.org/wiki/ResourceSat-1";

  // Commercial & International Remote Sensing Fleets
  if (n.includes("SPOT")) return "https://en.wikipedia.org/wiki/SPOT_(satellite)";
  if (n.includes("PLEIADES")) return "https://en.wikipedia.org/wiki/Pl%C3%A9iades_(satellite)";
  if (n.includes("COSMO-SKYMED")) return "https://en.wikipedia.org/wiki/COSMO-SkyMed";
  if (n.includes("WORLDVIEW")) return "https://en.wikipedia.org/wiki/WorldView-3";
  if (n.includes("GEOEYE")) return "https://en.wikipedia.org/wiki/GeoEye-1";
  if (n.includes("ICEYE")) return "https://en.wikipedia.org/wiki/ICEYE";
  if (n.includes("CAPELLA")) return "https://en.wikipedia.org/wiki/Capella_Space";

  // Russian Fleets
  if (n.includes("KOSMOS") || n.includes("COSMOS")) return "https://en.wikipedia.org/wiki/Kosmos_(satellite)";
  if (n.includes("RESURS")) return "https://en.wikipedia.org/wiki/Resurs-P";
  if (n.includes("KANOPUS")) return "https://en.wikipedia.org/wiki/Kanopus-V";
  if (n.includes("METEOR")) return "https://en.wikipedia.org/wiki/Meteor_(satellite)";

  // US Defense Fleets
  if (n.includes("USA") || n.includes("NROL") || n.includes("NRO")) return "https://en.wikipedia.org/wiki/National_Reconnaissance_Office";

  // Earth Resources / Remote Sensing
  const landsatMatch = n.match(/LANDSAT[ -]?(\d+)/);
  if (landsatMatch) return `https://en.wikipedia.org/wiki/Landsat_${landsatMatch[1]}`;
  const sentinelMatch = n.match(/SENTINEL[ -]?(\d+[A-Z]?)/);
  if (sentinelMatch) return `https://en.wikipedia.org/wiki/Sentinel-${sentinelMatch[1]}`;
  if (n.includes("TERRA")) return "https://en.wikipedia.org/wiki/Terra_(satellite)";
  if (n.includes("AQUA")) return "https://en.wikipedia.org/wiki/Aqua_(satellite)";
  if (n.includes("AURA")) return "https://en.wikipedia.org/wiki/Aura_(satellite)";
  if (n.includes("ICESAT")) return "https://en.wikipedia.org/wiki/ICESat-2";
  if (n.includes("GRACE")) return "https://en.wikipedia.org/wiki/GRACE-FO";
  if (n.includes("CALIPSO")) return "https://en.wikipedia.org/wiki/CALIPSO";
  if (n.includes("CLOUDSAT")) return "https://en.wikipedia.org/wiki/CloudSat";
  if (n.includes("SMAP")) return "https://en.wikipedia.org/wiki/Soil_Moisture_Active_Passive";
  if (n.includes("ENVISAT")) return "https://en.wikipedia.org/wiki/Envisat";
  if (n.includes("RADARSAT")) return "https://en.wikipedia.org/wiki/Radarsat-2";
  if (n.includes("ALOS")) return "https://en.wikipedia.org/wiki/Advanced_Land_Observing_Satellite";
  if (n.includes("SWARM")) return "https://en.wikipedia.org/wiki/Swarm_(spacecraft)";

  // Navigation (GNSS)
  if (n.includes("GPS") || n.includes("NAVSTAR") || n.includes("PRN")) return "https://en.wikipedia.org/wiki/GPS_satellite_blocks";
  if (n.includes("GALILEO") || n.includes("GSAT")) return "https://en.wikipedia.org/wiki/Galileo_(satellite_navigation)";
  if (n.includes("BEIDOU") || n.includes("BDS")) return "https://en.wikipedia.org/wiki/BeiDou";
  if (n.includes("GLONASS")) return "https://en.wikipedia.org/wiki/GLONASS";
  if (n.includes("QZSS") || n.includes("MICHIBIKI")) return "https://en.wikipedia.org/wiki/Quasi-Zenith_Satellite_System";
  if (n.includes("IRNSS") || n.includes("NAVIC")) return "https://en.wikipedia.org/wiki/Indian_Regional_Navigation_Satellite_System";

  // Constellations & Commercial
  if (n.includes("STARLINK")) return "https://en.wikipedia.org/wiki/Starlink";
  if (n.includes("ONEWEB")) return "https://en.wikipedia.org/wiki/Eutelsat_OneWeb";
  if (n.includes("IRIDIUM")) return "https://en.wikipedia.org/wiki/Iridium_NEXT";
  if (n.includes("GLOBALSTAR")) return "https://en.wikipedia.org/wiki/Globalstar";
  if (n.includes("ORBCOMM")) return "https://en.wikipedia.org/wiki/Orbcomm";
  if (n.includes("FLOCK") || n.includes("DOVE") || n.includes("PLANET")) return "https://en.wikipedia.org/wiki/Planet_Labs";
  if (n.includes("LEMUR") || n.includes("SPIRE")) return "https://en.wikipedia.org/wiki/Spire_Global";
  if (n.includes("BRITE")) return "https://en.wikipedia.org/wiki/BRITE";

  // Defense & Special
  if (n.includes("X-37B") || n.includes("OTV")) return "https://en.wikipedia.org/wiki/Boeing_X-37";
  if (n.includes("DMSP")) return "https://en.wikipedia.org/wiki/Defense_Meteorological_Satellite_Program";

  // Dynamic direct link builder by satellite clean name
  const clean = rawName.replace(/\(.*\)/g, '').trim().replace(/ /g, '_');
  if (clean) {
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(clean)}`;
  }

  return null;
}
