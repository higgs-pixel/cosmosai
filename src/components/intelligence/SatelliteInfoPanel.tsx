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
  // ══════════════════════════════════════════════════════════════════════════
  // SPACE STATIONS
  // ══════════════════════════════════════════════════════════════════════════

  // ── 25544: International Space Station ──────────────────────────────────
  25544: {
    name: "International Space Station (ISS)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/The_station_pictured_from_the_SpaceX_Crew_Dragon_5.jpg/800px-The_station_pictured_from_the_SpaceX_Crew_Dragon_5.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/International_Space_Station",
    agency: "NASA / ESA / JAXA / Roscosmos / CSA",
    country: "International Partnership (15 Nations)",
    launchDate: "1998-11-20",
    launchSite: "Baikonur Cosmodrome LC-1/5 (Zarya) & Kennedy Space Center LC-39A (Unity)",
    launchVehicle: "Proton-K (Zarya module) & Space Shuttle Discovery STS-88 (Unity node)",
    purpose: "Humanity's largest and most complex crewed microgravity research laboratory in low Earth orbit. Permanently occupied since November 2000 by rotating Expedition crews of 3–7 astronauts conducting cutting-edge experiments across 250+ research investigations annually in space medicine, materials science, fluid physics, biology, astrophysics, and technology development. Serves as a testbed for deep-space exploration systems required for future Artemis Moon and Mars missions.",
    status: "Operational",
    orbit: "LEO ~ 408 km altitude × 51.64° inclination (92.68 min orbital period)",
    mass: "450,000 kg (990,000 lbs) assembled mass",
    dimensions: "109 m width × 73 m length × 20 m height (truss to module span)",
    power: "120 kW continuous power from 8 dual-wing solar array assemblies (4 × SAW pairs, 1,090 m² total area)",
    instruments: [
      "AMS-02 — Alpha Magnetic Spectrometer (dark matter & cosmic ray detector, 7.5 tonnes)",
      "NICER — Neutron Star Interior Composition Explorer (X-ray timing of pulsars)",
      "ECOSTRESS — High-resolution thermal infrared land & vegetation stress imaging",
      "EMIT — Earth Surface Mineral Dust Source Investigation (surface mineralogy mapping)",
      "HDEV — High Definition Earth Viewing Cameras (4-camera exterior array)",
      "GEDI — Global Ecosystem Dynamics Investigation (3D forest structure lidar)",
      "MISSE — Materials International Space Station Experiments (external material exposure)"
    ],
    discoveries: [
      {
        title: "Microgravity Human Physiology & Vision Impairment Syndrome (VIIP)",
        desc: "Revealed that long-duration spaceflight causes intracranial pressure buildup, flattening the back of the eyeball and causing permanent vision impairment in 60–70% of male astronauts. Led to development of VIIP countermeasures essential for Mars missions.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/600px-International_Space_Station_after_undocking_of_STS-132.jpg")
      },
      {
        title: "Cool Flame Combustion Discovery",
        desc: "The Flame Extinguishment Experiment (FLEX) discovered spherical 'cool flames' burning without visible soot or flame at 200–500°C in microgravity — a combustion phenomenon impossible to observe on Earth. Enabled new engine efficiency and emissions research.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Expedition_64_spacewalk_microgravity.jpg/600px-Expedition_64_spacewalk_microgravity.jpg")
      },
      {
        title: "AMS-02 Cosmic Ray Positron Excess",
        desc: "The Alpha Magnetic Spectrometer detected over 200 billion cosmic ray events and found an unexpected excess of high-energy positrons — a potential signature of dark matter particle annihilation or millisecond pulsars — challenging Standard Model predictions.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Alpha_Magnetic_Spectrometer_02.jpg/600px-Alpha_Magnetic_Spectrometer_02.jpg")
      }
    ],
    links: [
      { label: "NASA ISS Portal", url: "https://www.nasa.gov/international-space-station/" },
      { label: "ESA ISS Research", url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station" },
      { label: "Live Tracking", url: "https://spotthestation.nasa.gov/" }
    ],
    tags: ["Space Station", "Crewed Laboratory", "Microgravity", "International"]
  },

  // ── 48274: Tiangong Space Station ─────────────────────────────────────────
  48274: {
    name: "Tiangong Space Station (CSS — China Space Station)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/2/25/Chinese_Tiangong_Space_Station.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Tiangong_space_station",
    agency: "CNSA (China National Space Administration)",
    country: "People's Republic of China",
    launchDate: "2021-04-29",
    launchSite: "Wenchang Spacecraft Launch Site, Hainan Province, China",
    launchVehicle: "Long March 5B (Tianhe core) / Long March 2F (Shenzhou crews)",
    purpose: "China's permanent modular crewed space station in LEO, comprising the T-shaped configuration of Tianhe core module (2021) and Wentian (2022) and Mengtian (2022) science laboratory modules. Conducts high-energy cosmic ray detection, cold atom precision metrology, protein crystallization, space medicine, and preparation for future deep-space exploration. Hosts the Xuntian optical survey telescope flying in formation at 200 m proximity.",
    status: "Operational",
    orbit: "LEO ~ 389–405 km altitude × 41.58° inclination (~92 min period)",
    mass: "100,000 kg (three main modules, fully assembled)",
    dimensions: "55 m length × 39 m solar array width (T-configuration)",
    power: "100 kW total from flexible gallium arsenide thin-film solar wings (30%+ efficiency)",
    instruments: [
      "HERD — High-Energy Cosmic-Radiation Detector (TeV dark matter & CR electrons)",
      "Cold Atomic Clock Ensemble — 1 second drift per 3 billion years precision",
      "Space Protein Crystallization Device — Drug development in microgravity",
      "Biomedical Experiment System — Life science cultivation chambers",
      "High-precision 3D Microscope for material microstructure observation"
    ],
    discoveries: [
      {
        title: "Space-Time Precision Metrology with Cold Atoms",
        desc: "Tiangong's cold-atom clock ensemble achieves unprecedented microgravity time precision, enabling fundamental tests of general relativity (gravitational redshift) and advancing 6G satellite-based precision timing networks.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Caesium_clock_block.svg/330px-Caesium_clock_block.svg.png")
      },
      {
        title: "Full Multigenerational Space Crop Cultivation",
        desc: "Completed full lifecycle germination-to-seed cultivation of rice (Oryza sativa) and arabidopsis in microgravity from seed-to-seed, demonstrating viability of closed-loop food production for future deep space habitats.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/3/32/ISS-46_Zinnia_flower_in_the_Cupola_%282%29.jpg")
      }
    ],
    links: [
      { label: "CNSA Official", url: "http://www.cnsa.gov.cn/" },
      { label: "CMS Tiangong", url: "http://www.cmse.gov.cn/" }
    ],
    tags: ["Space Station", "Modular", "Crewed", "CNSA", "China"]
  },

  // ── 53239: Wentian Laboratory Cabin Module ──────────────────────────────────
  53239: {
    name: "Wentian Laboratory Cabin Module (Tiangong LCM-1)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/7/74/Wentian_lab_module_rendering.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Wentian_module",
    agency: "CNSA (China National Space Administration)",
    country: "People's Republic of China",
    launchDate: "2022-07-24",
    launchSite: "Wenchang Spacecraft Launch Site, Hainan, China",
    launchVehicle: "Long March 5B (Y3)",
    purpose: "First laboratory module docked to the Tiangong space station. Houses life science experiment racks for space genetics, developmental biology, and biotechnology research. Features an advanced airlock cabin with a 1-meter external hatch for spacewalks and a dedicated 5-meter robotic arm for exterior payload manipulation.",
    status: "Operational",
    orbit: "LEO ~ 390 km altitude × 41.5° inclination",
    mass: "23,000 kg (wet mass at launch)",
    dimensions: "17.9 m length × 4.2 m diameter with 55 m solar wingspan",
    power: "Flexible GaAs thin-film solar wings providing >13.5 kW",
    instruments: [
      "Life & Ecology Science Experiment Rack (Arabidopsis, zebrafish, nematodes)",
      "Biotechnology Science Experiment Rack (cell growth, protein crystals)",
      "Science Glovebox and Low-Temperature Storage Rack (-80°C to +4°C)",
      "5-meter Dexterous Secondary Robotic Arm (25-ton load capacity)"
    ],
    discoveries: [
      {
        title: "Zero-Gravity Aquatic Ecosystem Experiment",
        desc: "Maintained closed-loop microgravity aquatic ecology with zebrafish and hornwort algae inside Wentian, observing vertebrate development and bone density adaptation in microgravity.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/7/74/Wentian_lab_module_rendering.jpg")
      }
    ],
    links: [
      { label: "CMSA Wentian", url: "http://www.cmse.gov.cn/" }
    ],
    tags: ["Space Station", "Laboratory", "Tiangong", "Wentian", "CNSA"]
  },

  // ── 54216: Mengtian Laboratory Cabin Module ─────────────────────────────────
  54216: {
    name: "Mengtian Laboratory Cabin Module (Tiangong LCM-2)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/0/02/Mengtian_lab_module_rendering.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Mengtian_module",
    agency: "CNSA (China National Space Administration)",
    country: "People's Republic of China",
    launchDate: "2022-10-31",
    launchSite: "Wenchang Spacecraft Launch Site, Hainan, China",
    launchVehicle: "Long March 5B (Y4)",
    purpose: "Second laboratory module docked to Tiangong, completing the T-shape configuration. Dedicated to microgravity physical sciences, fluid physics, materials science, combustion research, and fundamental physics experiments. Features a specialized cargo airlock and robotic payload deployer to release CubeSats directly into orbit.",
    status: "Operational",
    orbit: "LEO ~ 392 km altitude × 41.5° inclination",
    mass: "23,000 kg (wet mass at launch)",
    dimensions: "17.9 m length × 4.2 m diameter with 55 m solar wingspan",
    power: "Flexible GaAs solar wings providing >13.5 kW",
    instruments: [
      "Cold Atom Physics Experiment Rack (Bose-Einstein Condensate cooling to pK)",
      "High-Precision Time-Frequency System (Hydrogen + Rubidium + Cold Atom Ensemble)",
      "Two-Phase System Experiment Rack (fluid dynamics & heat pipe physics)",
      "Combustion Science Experiment Rack (microgravity soot formation & flame spread)",
      "Automated Cargo Airlock and Payload Deployer"
    ],
    discoveries: [
      {
        title: "Space-Based Bose-Einstein Condensate Creation",
        desc: "Created ultracold atomic clouds cooled to picokelvin temperatures in Mengtian's Cold Atom Physics Rack, demonstrating quantum macroscopic wave phenomena unperturbed by Earth's gravity.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Caesium_clock_block.svg/330px-Caesium_clock_block.svg.png")
      }
    ],
    links: [
      { label: "CMSA Mengtian", url: "http://www.cmse.gov.cn/" }
    ],
    tags: ["Space Station", "Laboratory", "Tiangong", "Mengtian", "Microgravity Physics"]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SPACE TELESCOPES & OBSERVATORIES
  // ══════════════════════════════════════════════════════════════════════════

  // ── 20580: Hubble Space Telescope ─────────────────────────────────────────
  20580: {
    name: "Hubble Space Telescope (HST)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Hubble_2009_close-up_2.jpg/800px-Hubble_2009_close-up_2.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Hubble_Space_Telescope",
    agency: "NASA / ESA",
    country: "United States / Europe",
    launchDate: "1990-04-24",
    launchSite: "Kennedy Space Center LC-39B",
    launchVehicle: "Space Shuttle Discovery (STS-31). Serviced by SM1 (STS-61), SM2 (STS-82), SM3A (STS-103), SM3B (STS-109), SM4 (STS-125)",
    purpose: "Humanity's premier 2.4-meter aperture Ritchey-Chrétien space telescope operating above Earth's distorting atmosphere, observing in ultraviolet, optical, and near-infrared wavelengths (115–2,500 nm). After a corrective mirror optics installation in 1993, became a transformative astrophysics observatory that has produced over 1.5 million observations, published 20,000+ peer-reviewed papers, and made over 100 major scientific discoveries.",
    status: "Operational",
    orbit: "LEO ~ 538 km altitude × 28.47° inclination (95 min period)",
    mass: "11,110 kg (24,490 lbs)",
    dimensions: "13.2 m length × 4.2 m diameter (school bus size)",
    power: "2.8 kW from two 2.6 m × 7.1 m GaAs solar array wings",
    instruments: [
      "WFC3 — Wide Field Camera 3 (UV/optical/NIR imaging, 202 × 202 arcsec FOV)",
      "COS — Cosmic Origins Spectrograph (far-UV spectroscopy 1150–3200 Å)",
      "ACS — Advanced Camera for Surveys (wide-field visible imaging, 202 × 202 arcsec)",
      "STIS — Space Telescope Imaging Spectrograph (1150–10,300 Å spectral range)",
      "FGS — Fine Guidance Sensors (0.3 mas astrometric precision)"
    ],
    discoveries: [
      {
        title: "Discovery of Accelerating Cosmic Expansion & Dark Energy",
        desc: "Measuring precise distances to Type Ia supernovae with HST revealed that the expansion of the Universe is accelerating rather than slowing — implying the existence of dark energy comprising ~68% of all cosmic energy. This discovery earned Perlmutter, Schmidt & Riess the 2011 Nobel Prize in Physics.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Supernova_1994D.jpg/600px-Supernova_1994D.jpg")
      },
      {
        title: "Hubble Ultra Deep Field — 10,000 Galaxies in One Patch",
        desc: "The 2004 HUDF exposed a 3.1 arcmin² region of sky for 11.3 days, revealing ~10,000 galaxies at redshifts up to z≈6, tracing galaxy assembly back to 800 million years after the Big Bang and constraining the galaxy luminosity function.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/NASA-HS201427a-HubbleUltraDeepField2014-20140603.jpg/600px-NASA-HS201427a-HubbleUltraDeepField2014-20140603.jpg")
      },
      {
        title: "Pillars of Creation (Eagle Nebula M16)",
        desc: "Iconic optical and infrared imaging of stellar-wind eroded gas columns inside M16, revealing OB stellar populations, protostars inside Evaporating Gaseous Globules (EGGs), and turbulent star-forming dynamics inside dense molecular clouds.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg/600px-Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg")
      }
    ],
    links: [
      { label: "HubbleSite Official", url: "https://hubblesite.org/" },
      { label: "NASA Hubble Portal", url: "https://www.nasa.gov/mission_pages/hubble/main/index.html" },
      { label: "ESA Hubble", url: "https://esahubble.org/" }
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
    launchSite: "Guiana Space Centre, Kourou, French Guiana (ELA-3)",
    launchVehicle: "Ariane 5 ECA (VA256)",
    purpose: "Flagship 6.5-meter segmented primary mirror gold-coated beryllium infrared space telescope operating at the Sun-Earth L2 Lagrange point behind a 5-layer polyimide sunshield (tennis-court area, 0.001K thermal stability). Observes in 0.6–28.5 µm wavelengths, enabling observation of the first stars and galaxies formed 200–400 Myr after the Big Bang, exoplanet atmospheric characterization, and protostellar disk chemistry.",
    status: "Operational",
    orbit: "Halo orbit around Sun-Earth L2 Lagrange Point (~1.5 million km anti-Sun, ~6-month period)",
    mass: "6,161 kg (dry bus + payload)",
    dimensions: "21.2 m × 14.1 m sunshield; 6.5 m mirror diameter; 8 m folded for launch",
    power: "2 kW from solar array (Sun side, never shadows mirror)",
    instruments: [
      "NIRCam — Near-Infrared Camera (0.6–5 µm, 9.7 arcmin² FOV, HgCdTe HyViSI detectors)",
      "NIRSpec — Near-Infrared Multi-Object Spectrograph (0.6–5.3 µm, 100 simultaneous targets via MSA)",
      "MIRI — Mid-Infrared Instrument (5–28 µm imager + spectrograph, cooled to 6.2 K by cryo-cooler)",
      "FGS/NIRISS — Fine Guidance Sensor & Near-Infrared Imager and Slitless Spectrograph"
    ],
    discoveries: [
      {
        title: "JWST Deep Field & First High-Redshift Galaxies",
        desc: "JADES-GS-z14-0 confirmed at z=14.32 — formed just 290 million years after the Big Bang — with stellar mass ~500 million M☉, far exceeding theoretical predictions. GLASS-z12 and JADES-GS-z13-0 further constrain early galaxy assembly models.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Webb%27s_First_Deep_Field.png/600px-Webb%27s_First_Deep_Field.png")
      },
      {
        title: "TRAPPIST-1e Atmospheric Carbon Dioxide Detection",
        desc: "MIRI and NIRSpec transmission spectroscopy detected CO₂ and tentative SO₂ absorption features in the atmospheres of TRAPPIST-1 system exoplanets, marking the first robust atmospheric detection for rocky Earth-sized worlds in the habitable zone.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Webb_Pillars_of_Creation.jpg/600px-Webb_Pillars_of_Creation.jpg")
      },
      {
        title: "Tarantula Nebula Infrared — Young Stellar Nursery",
        desc: "JWST NIRCam resolved thousands of never-before-seen young protostars still embedded inside the 30 Doradus Tarantula Nebula starburst region in the LMC, revealing the most massive star-forming region within 170,000 light-years in unprecedented detail.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Webb_Pillars_of_Creation.jpg/600px-Webb_Pillars_of_Creation.jpg")
      }
    ],
    links: [
      { label: "Webb Space Telescope Portal", url: "https://webbtelescope.org/" },
      { label: "NASA JWST Mission", url: "https://jwst.nasa.gov/" },
      { label: "ESA JWST", url: "https://www.esa.int/Science_Exploration/Space_Science/Webb" }
    ],
    tags: ["Telescope", "Infrared", "Lagrange L2", "Exoplanets", "Cosmology"]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WEATHER & ENVIRONMENTAL SATELLITES
  // ══════════════════════════════════════════════════════════════════════════

  // ── 33591: NOAA 19 ────────────────────────────────────────────────────────
  33591: {
    name: "NOAA 19 (NOAA-N Prime)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg/800px-NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/NOAA-19",
    agency: "NOAA / NASA",
    country: "United States",
    launchDate: "2009-02-06",
    launchSite: "Vandenberg SFB Space Launch Complex 2W",
    launchVehicle: "Delta II 7320-10C",
    purpose: "Fifth and final NOAA POES (Polar Operational Environmental Satellites) third-generation polar-orbiting spacecraft providing continuous global 3D atmospheric soundings (temperature, humidity profiles), ocean sea surface temperatures, AVHRR cloud and vegetation imagery, ozone column measurements, and international COSPAS-SARSAT search-and-rescue distress relay. Provides data to NOAA's NCEP for 6-hourly global numerical weather prediction model initialization.",
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 854 km altitude × 98.7° inclination (102.1 min period)",
    mass: "1,440 kg",
    dimensions: "4.2 m length × 1.4 m diameter hexagonal bus",
    power: "833 W from single-wing silicon solar panel array",
    instruments: [
      "AVHRR/3 — Advanced Very High Resolution Radiometer (1.1 km resolution, 6 channels: visible, NIR, MIR, TIR)",
      "HIRS/4 — High Resolution Infrared Radiation Sounder (20-channel atmospheric temperature/humidity profiler)",
      "AMSU-A — Advanced Microwave Sounding Unit-A (15-channel, tropospheric temperature profiling)",
      "MHS — Microwave Humidity Sounder (5-channel, global precipitation and humidity)",
      "SBUV/2 — Solar Backscatter UV Radiometer (stratospheric ozone column and profile)",
      "SARSAT — Search and Rescue Satellite-Aided Tracking (406 MHz distress beacon relay)"
    ],
    discoveries: [
      {
        title: "Montreal Protocol Ozone Layer Recovery Verification",
        desc: "NOAA 19's SBUV-2 UV radiometer provided decadal Antarctic stratospheric ozone measurements showing sustained recovery of 1–3% per decade since 2000, directly confirming the success of global CFC phase-out under the 1987 Montreal Protocol.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg/600px-NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg")
      }
    ],
    links: [
      { label: "NOAA OSPO Satellite Portal", url: "https://www.ospo.noaa.gov/" },
      { label: "NOAA CLASS Archive", url: "https://www.avl.class.noaa.gov/" }
    ],
    tags: ["Weather", "Polar Orbit", "NOAA", "Ozone", "SARSAT"]
  },

  // ── 59051: INSAT-3DS (NORAD approximate) ──────────────────────────────────
  59051: {
    name: "INSAT-3DS",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/INSAT-3DS_Satellite.jpg/800px-INSAT-3DS_Satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/INSAT-3DS",
    agency: "ISRO (Indian Space Research Organisation)",
    country: "India",
    launchDate: "2024-02-17",
    launchSite: "Satish Dhawan Space Centre (SDSC SHAR), Sriharikota, India (SLP)",
    launchVehicle: "GSLV-F14 with CUS-15 extended cryogenic upper stage (first flight with environment-friendly white fairing)",
    purpose: "Third-generation Indian meteorological geostationary satellite, follow-on to INSAT-3DR, providing enhanced 6-channel meteorological imaging, 19-channel atmospheric sounding, Data Relay Transponder service, and upgraded Search and Rescue (SASAR) payload. Stationed in GEO to provide continuous weather surveillance over the Indian subcontinent and Indian Ocean for cyclone forecasting, flood prediction, and disaster management.",
    status: "Operational",
    orbit: "GEO ~ 35,786 km at 74.0°E longitude (geostationary)",
    mass: "2,274 kg at launch",
    power: "1.9 kW from solar panels",
    instruments: [
      "IMAGER — 6-channel meteorological imaging radiometer (visible, SWIR, MIR, TIR 1 & 2, WV channels)",
      "SOUNDER — 19-channel atmospheric sounding radiometer for vertical temp/humidity profiles",
      "DRT — Data Relay Transponder (relay of automatic weather stations & disaster warning)",
      "SAS&R — Advanced Search and Rescue Transponder (406 MHz COSPAS-SARSAT compatible)"
    ],
    discoveries: [
      {
        title: "Enhanced Cyclone Genesis & Track Forecasting",
        desc: "INSAT-3DS's 6-channel imager improves cyclone intensity analysis over the Bay of Bengal and Arabian Sea by providing more frequent half-hourly imagery updates compared to its predecessor, enabling more accurate 72-hour track forecasts.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/INSAT-3DS_Satellite.jpg/600px-INSAT-3DS_Satellite.jpg")
      }
    ],
    links: [
      { label: "ISRO INSAT-3DS Mission", url: "https://www.isro.gov.in/INSAT3DS.html" },
      { label: "IMD Weather Portal", url: "https://mausam.imd.gov.in/" }
    ],
    tags: ["Weather", "Geostationary", "ISRO", "India", "Cyclone Forecasting"]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SOLAR OBSERVATION
  // ══════════════════════════════════════════════════════════════════════════

  // ── 57320 (approx NORAD for Aditya-L1): Aditya-L1 ──────────────────────
  57320: {
    name: "Aditya-L1 (Sun-Earth L1 Solar Observatory)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Aditya-L1.jpg/800px-Aditya-L1.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Aditya-L1",
    agency: "ISRO (Indian Space Research Organisation)",
    country: "India",
    launchDate: "2023-09-02",
    launchSite: "Satish Dhawan Space Centre (SDSC SHAR), Sriharikota (FLP)",
    launchVehicle: "PSLV-C57 / PSLV-XL (11th flight of XL variant)",
    purpose: "India's first dedicated solar science spacecraft placed in a halo orbit around the Sun-Earth L1 Lagrange point (~1.5 million km from Earth), providing continuous unobstructed observation of the Sun without any eclipse occultation. Studies solar corona, chromosphere dynamics, solar wind particle flux, coronal mass ejections (CMEs), and solar energetic particle events that drive space weather affecting satellite operations, power grids, and communications on Earth.",
    status: "Operational",
    orbit: "Halo orbit around Sun-Earth L1 Lagrange Point (~1.5 million km from Earth, ~177.86-day period)",
    mass: "1,480.7 kg",
    dimensions: "1.5 m × 1.5 m × 1.8 m satellite bus",
    power: "1.5 kW from solar panels (6 panels on bus + 1 dedicated for magnetometer)",
    instruments: [
      "VELC — Visible Emission Line Coronagraph (corona imaging & spectroscopy at 5303 Å)",
      "SUIT — Solar UV Imaging Telescope (photosphere & chromosphere UV imaging 200–400 nm)",
      "SoLEXS — Solar Low Energy X-ray Spectrometer (soft X-ray solar flare monitoring 1–30 keV)",
      "HEL1OS — High Energy L1 Orbiting X-ray Spectrometer (hard X-ray 10–150 keV)",
      "ASPEX — Aditya Solar Wind Particle EXperiment (solar wind ion & electron flux)",
      "PAPA — Plasma Analyser Package for Aditya (plasma composition measurement)",
      "Advanced Tri-axial High Resolution Digital Magnetometers (in-situ B-field measurement)"
    ],
    discoveries: [
      {
        title: "First ISRO Solar X-ray Flare Observations from L1",
        desc: "Shortly after reaching L1 orbit in January 2024, Aditya-L1's SoLEXS and HEL1OS instruments captured multiple X-class and M-class solar flares in real-time X-ray spectroscopy — marking India's first solar physics data from the L1 vantage point with direct solar wind measurements.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Aditya-L1.jpg/600px-Aditya-L1.jpg")
      },
      {
        title: "VELC First Light — Coronal Imagery",
        desc: "The VELC coronagraph produced its first-light continuous coronal imaging at 5303 Å emission line (Fe XIV), observing streamer belts, coronal holes, and nascent CME flux rope structures in real-time — inaccessible from ground-based observatories due to sky brightness.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Aditya-L1.jpg/600px-Aditya-L1.jpg")
      }
    ],
    links: [
      { label: "ISRO Aditya-L1 Mission", url: "https://www.isro.gov.in/Aditya_L1.html" },
      { label: "ISSDC Data Portal", url: "https://www.issdc.gov.in/" }
    ],
    tags: ["Solar Observatory", "ISRO", "India", "L1 Orbit", "Space Weather"]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MEGACONSTELLATIONS
  // ══════════════════════════════════════════════════════════════════════════

  // ── 44713: Starlink-1007 ──────────────────────────────────────────────────
  44713: {
    name: "Starlink-1007 (V1.0 Generation)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Starlink_Mission_%2847926144123%29.jpg/800px-Starlink_Mission_%2847926144123%29.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Starlink",
    agency: "SpaceX",
    country: "United States",
    launchDate: "2019-11-11",
    launchSite: "Cape Canaveral SLC-40, Florida",
    launchVehicle: "Falcon 9 Full Thrust (reused first stage B1048.4)",
    purpose: "First-generation commercial LEO broadband internet satellite part of the SpaceX Starlink constellation (over 6,000 satellites operational as of 2024). Delivers high-speed (50–250 Mbps) low-latency (20–40 ms) satellite internet globally via Ku/Ka-band phased array antennas, using krypton ion hall-effect thrusters for orbit maintenance. Utilizes optical inter-satellite laser links (V1.5+) for global backhaul without ground station relays.",
    status: "Operational",
    orbit: "LEO ~ 550 km altitude × 53.0° inclination (97.5 min period)",
    mass: "260 kg per satellite (V1.0); 800 kg (V2 Mini)",
    dimensions: "3.2 m × 1.6 m flat-panel fold-out design",
    power: "1.5 kW per satellite (single solar array wing)",
    instruments: [
      "Ku-band Phased Array User Antenna (10.7–12.7 GHz downlink)",
      "Ka-band Gateway Phased Array (26.5–40 GHz uplink/downlink)",
      "Inter-Satellite Optical Laser Links (V1.5+, up to 100 Gbps cross-link)",
      "Krypton / Argon Hall-Effect Ion Thrusters (100 mN thrust, 1,600 s Isp)",
      "Star Tracker Attitude Control System"
    ],
    discoveries: [
      {
        title: "Commercial Global Broadband from LEO at Scale",
        desc: "Starlink demonstrated the first commercial-scale LEO broadband constellation reaching 2+ million subscribers, proving sub-50ms latency global internet coverage from space — a previously unachievable combination of latency, coverage, and throughput.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Starlink_Mission_%2847926144123%29.jpg/600px-Starlink_Mission_%2847926144123%29.jpg")
      }
    ],
    links: [
      { label: "Starlink Official", url: "https://www.starlink.com/" },
      { label: "SpaceX Starlink", url: "https://www.spacex.com/starlink/" }
    ],
    tags: ["Broadband", "Starlink", "Mega-constellation", "SpaceX", "LEO"]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ISRO EARTH OBSERVATION
  // ══════════════════════════════════════════════════════════════════════════

  // ── 45230: RISAT-2BR1 ─────────────────────────────────────────────────────
  45230: {
    name: "RISAT-2BR1 (Radar Imaging Satellite)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/RISAT-2B.jpg/800px-RISAT-2B.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/RISAT-2BR1",
    agency: "ISRO (Indian Space Research Organisation)",
    country: "India",
    launchDate: "2019-12-11",
    launchSite: "Satish Dhawan Space Centre, Sriharikota (First Launch Pad)",
    launchVehicle: "PSLV-C48 (50th PSLV flight; -QL variant with 4 PSOM-XL strap-ons)",
    purpose: "Fourth satellite in India's RISAT (Radar Imaging Satellite) SAR series. X-band synthetic aperture radar satellite with 3.6-meter unfurlable radial rib reflector antenna providing day-night, all-weather sub-meter resolution radar imaging for agriculture monitoring, forestry assessment, soil moisture mapping, flood/cyclone disaster response, and defense strategic reconnaissance.",
    status: "Operational",
    orbit: "LEO ~ 557 km circular orbit × 37.0° inclination (96.4 min period)",
    mass: "628 kg",
    dimensions: "3.6 m SAR antenna diameter (unfurlable); 1.5 m × 1.5 m satellite bus",
    power: "775 W solar panels",
    instruments: [
      "X-band SAR — Very High Resolution Mode: 1×0.5 m and 0.5×0.3 m resolution, 5–10 km swath",
      "X-band SAR — Medium Resolution Mode: 4 m resolution, 25 km swath",
      "Unfurlable 3.6 m Radial Rib Reflector Antenna (X-band, 9.6 GHz center frequency)"
    ],
    discoveries: [
      {
        title: "Sub-Meter All-Weather Tactical Reconnaissance",
        desc: "RISAT-2BR1 provided India's first sub-meter (<0.5 m) X-band SAR imagery capability, enabling identification of military vehicles, ship classification in ports, building damage assessment after earthquakes, and precise flood extent mapping during monsoon seasons regardless of cloud cover.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/RISAT-2B.jpg/600px-RISAT-2B.jpg")
      }
    ],
    links: [
      { label: "ISRO RISAT Program", url: "https://www.isro.gov.in/earth-observation-satellites" },
      { label: "NRSC Data", url: "https://www.nrsc.gov.in/" }
    ],
    tags: ["SAR Radar", "ISRO", "India", "Earth Observation", "X-band"]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GNSS NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════

  // ── 48859: NavIC (IRNSS-1I) ──────────────────────────────────────────────
  48859: {
    name: "IRNSS-1I / NVS-01 (NavIC Navigation Satellite)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/IRNSS-1I_Satellite.jpg/800px-IRNSS-1I_Satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/NVS-01",
    agency: "ISRO (Indian Space Research Organisation) / DoS (Department of Space)",
    country: "India",
    launchDate: "2023-05-29",
    launchSite: "Satish Dhawan Space Centre (SDSC SHAR), Sriharikota (SLP)",
    launchVehicle: "GSLV-F12 / NVS-01",
    purpose: "Second-generation NavIC (Navigation with Indian Constellation) geostationary navigation satellite, first to include civilian L1 band signal (1575.42 MHz) for compatibility with international GNSS receivers. Provides regional Positioning, Navigation, and Timing (PNT) services over the Indian subcontinent and 1,500 km surrounding region with ~5m accuracy for standard service and ~1m for encrypted restricted service. Supports maritime navigation, aircraft precision approach, geodetic surveying, and automated vehicle guidance.",
    status: "Operational",
    orbit: "GEO Geosynchronous Inclined orbit (IGSO) ~ 35,786 km × 29.0°",
    mass: "2,232 kg at launch",
    power: "3.1 kW from twin solar panels",
    instruments: [
      "L5-band Navigation Signal Payload (1176.45 MHz — Standard Positioning Service)",
      "S-band Navigation Signal Payload (2492.028 MHz — Restricted Service)",
      "L1-band Navigation Signal (1575.42 MHz — new NVS-01 feature, IRNSS L1)",
      "C-band ranging transponder for orbit determination",
      "Passive Hydrogen Maser (PHM) atomic clock (first indigenous PHM in ISRO)"
    ],
    discoveries: [
      {
        title: "First Indigenous Passive Hydrogen Maser Clock in Space",
        desc: "NVS-01 marked ISRO's first deployment of an indigenously developed Passive Hydrogen Maser (PHM) atomic clock in a navigation satellite, providing 10⁻¹³ frequency stability — 10× better than rubidium oscillators and enabling decimeter-level accuracy for NavIC.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/IRNSS-1I_Satellite.jpg/600px-IRNSS-1I_Satellite.jpg")
      }
    ],
    links: [
      { label: "ISRO NavIC Portal", url: "https://www.isro.gov.in/irnss-programme.html" },
      { label: "NavIC Official", url: "https://www.navicindia.org/" }
    ],
    tags: ["NavIC", "Navigation", "GNSS", "ISRO", "India", "Geostationary"]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HELIOPHYSICS & MAGNETOSPHERE EXPLORATION
  // ══════════════════════════════════════════════════════════════════════════

  // ── 40482: MMS 1 ──────────────────────────────────────────────────────────
  40482: {
    name: "MMS 1 (Magnetospheric Multiscale Observatory 1)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/b/b3/Artist_depiction_of_MMS_spacecraft_%28SVS12239%29.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Magnetospheric_Multiscale_Mission",
    agency: "NASA Goddard Space Flight Center",
    country: "United States",
    launchDate: "2015-03-13",
    launchSite: "Cape Canaveral Space Force Station SLC-41, Florida, USA",
    launchVehicle: "Atlas V 421 (AV-053)",
    purpose: "First of four identical NASA spacecraft flying in an ultra-precise tetrahedral formation through Earth's magnetosphere. Investigates magnetic reconnection—a fundamental universal plasma physics process where magnetic topology explosively reconfigures, converting magnetic energy into kinetic particle acceleration and intense thermal energy driving solar storms, auroras, and coronal mass ejection impacts.",
    status: "Operational",
    orbit: "HEO ~ 1,800 km × 153,000 km (apogee into day-side and night-side magnetotail) × 28.5° inclination",
    mass: "1,360 kg (wet mass with 410 kg hydrazine)",
    dimensions: "3.5 m diameter × 1.2 m height octagonal prism with four 60 m wire booms",
    power: "625 W from eight body-mounted GaAs solar panels",
    instruments: [
      "FPI — Fast Plasma Investigation (measures electron distributions at 30 ms and ions at 150 ms resolution)",
      "FIELDS — Electric & Magnetic Field suite (Fluxgate Magnetometers & 60m wire double probes)",
      "HPCA — Hot Plasma Composition Analyzer (mass spectrometer distinguishing H+, He+, He++, O+)",
      "EPD — Energetic Particle Detector suite (FEEPS & EIS for 20 keV to >1 MeV particles)",
      "ASPOC — Active Spacecraft Potential Control (indium liquid metal ion emitters for zero-bias)"
    ],
    discoveries: [
      {
        title: "Direct Electron-Scale Magnetic Reconnection Observed",
        desc: "First direct in-situ measurement of the electron diffusion region where magnetic reconnection initiates, demonstrating that electron inertia breaks the frozen-in magnetic condition at sub-kilometer scales.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/2/24/Reconnection.gif")
      }
    ],
    links: [
      { label: "NASA MMS Mission", url: "https://www.nasa.gov/mission_pages/mms/index.html" },
      { label: "SwRI Science Center", url: "https://mms.space.swri.edu/" }
    ],
    tags: ["Heliophysics", "Magnetosphere", "NASA", "Space Weather", "Formation Flying"]
  },

  // ── 40483: MMS 2 ──────────────────────────────────────────────────────────
  40483: {
    name: "MMS 2 (Magnetospheric Multiscale Observatory 2)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/b/b3/Artist_depiction_of_MMS_spacecraft_%28SVS12239%29.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Magnetospheric_Multiscale_Mission",
    agency: "NASA Goddard Space Flight Center",
    country: "United States",
    launchDate: "2015-03-13",
    launchSite: "Cape Canaveral Space Force Station SLC-41, Florida, USA",
    launchVehicle: "Atlas V 421 (AV-053)",
    purpose: "Second observatory of NASA's MMS tetrahedral constellation. Together with MMS 1, 3, and 4, maintains inter-spacecraft separations adjustable down to just 7 km to reconstruct true 3D spatial gradients and curlometer magnetic field currents in the magnetopause and magnetotail.",
    status: "Operational",
    orbit: "HEO ~ 1,800 km × 153,000 km × 28.5° inclination",
    mass: "1,360 kg (wet)",
    dimensions: "3.5 m diameter × 1.2 m height with four 60 m radial wire booms",
    power: "625 W GaAs solar array",
    instruments: [
      "FPI — Fast Plasma Investigation (millisecond electron/ion spectrometers)",
      "FIELDS — Electric Double Probes & Search-Coil Magnetometers (SCM)",
      "HPCA — Hot Plasma Composition Analyzer (ion composition 1 eV to 40 keV)",
      "EPD — Energetic Particle Detector (FEEPS/EIS)",
      "ASPOC — Spacecraft Potential Neutralization"
    ],
    discoveries: [
      {
        title: "3D Current Sheet Geometry Reconstruction",
        desc: "Utilized four-point tetrahedral timing measurements to calculate the 3D velocity and curl of current sheets during explosive reconnection in Earth's magnetosheath.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/2/24/Reconnection.gif")
      }
    ],
    links: [
      { label: "NASA MMS", url: "https://www.nasa.gov/mission_pages/mms/index.html" },
      { label: "SwRI Science", url: "https://mms.space.swri.edu/" }
    ],
    tags: ["Heliophysics", "Magnetosphere", "NASA", "Space Weather"]
  },

  // ── 40484: MMS 3 ──────────────────────────────────────────────────────────
  40484: {
    name: "MMS 3 (Magnetospheric Multiscale Observatory 3)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/b/b3/Artist_depiction_of_MMS_spacecraft_%28SVS12239%29.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Magnetospheric_Multiscale_Mission",
    agency: "NASA Goddard Space Flight Center",
    country: "United States",
    launchDate: "2015-03-13",
    launchSite: "Cape Canaveral Space Force Station SLC-41, Florida, USA",
    launchVehicle: "Atlas V 421 (AV-053)",
    purpose: "Third observatory of NASA's MMS tetrahedral constellation. Flies in synchronized multi-point formation measuring the 3D structure of turbulent magnetic dissipation and particle acceleration in Earth's protective bow shock and magnetopause boundary.",
    status: "Operational",
    orbit: "HEO ~ 1,800 km × 153,000 km × 28.5° inclination",
    mass: "1,360 kg (wet mass)",
    dimensions: "3.5 m diameter × 1.2 m height with four 60 m wire booms",
    power: "625 W body-mounted solar array",
    instruments: [
      "FPI — Fast Plasma Investigation (millisecond electron/ion spectrometers)",
      "FIELDS — Digital Fluxgate & Search-Coil Magnetometers + Electric Double Probes",
      "HPCA — Hot Plasma Composition Analyzer (mass spectrometry)",
      "EPD — Energetic Particle Detector (FEEPS & EIS)",
      "ASPOC — Active Spacecraft Potential Control"
    ],
    discoveries: [
      {
        title: "Discovery of Turbulent Magnetic Reconnection",
        desc: "MMS 3 revealed that reconnection occurs inside turbulent plasma eddies smaller than previously thought possible, demonstrating universal electron-scale turbulence mechanisms.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/2/24/Reconnection.gif")
      }
    ],
    links: [
      { label: "NASA MMS", url: "https://www.nasa.gov/mission_pages/mms/index.html" },
      { label: "SwRI Science", url: "https://mms.space.swri.edu/" }
    ],
    tags: ["Heliophysics", "Magnetosphere", "NASA", "Space Science"]
  },

  // ── 40485: MMS 4 ──────────────────────────────────────────────────────────
  40485: {
    name: "MMS 4 (Magnetospheric Multiscale Observatory 4)",
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/b/b3/Artist_depiction_of_MMS_spacecraft_%28SVS12239%29.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Magnetospheric_Multiscale_Mission",
    agency: "NASA Goddard Space Flight Center",
    country: "United States",
    launchDate: "2015-03-13",
    launchSite: "Cape Canaveral Space Force Station SLC-41, Florida, USA",
    launchVehicle: "Atlas V 421 (AV-053)",
    purpose: "Fourth observatory completing the NASA MMS tetrahedron. Measures high-frequency electric waves, magnetic fluctuations, and energetic ions to track geomagnetic storm triggering in real time.",
    status: "Operational",
    orbit: "HEO ~ 1,800 km × 153,000 km × 28.5° inclination",
    mass: "1,360 kg (wet)",
    dimensions: "3.5 m diameter × 1.2 m height octagonal prism",
    power: "625 W solar array",
    instruments: [
      "FPI — Fast Plasma Investigation (millisecond plasma sensors)",
      "FIELDS — Triaxial Fluxgate & Electric Field Probes",
      "HPCA — Hot Plasma Composition Analyzer",
      "EPD — Energetic Particle Detector",
      "ASPOC — Spacecraft Potential Controller"
    ],
    discoveries: [
      {
        title: "Wave-Particle Energy Transfer in Earth's Bow Shock",
        desc: "Resolved kinetic whistler and ion-cyclotron waves transferring solar wind kinetic energy directly into plasma thermal heating at Earth's shock front.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/2/24/Reconnection.gif")
      }
    ],
    links: [
      { label: "NASA MMS", url: "https://www.nasa.gov/mission_pages/mms/index.html" },
      { label: "SwRI Science", url: "https://mms.space.swri.edu/" }
    ],
    tags: ["Heliophysics", "Magnetosphere", "NASA", "Space Science"]
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive Research-Grade Satellite Pattern Matcher
// ─────────────────────────────────────────────────────────────────────────────

function inferSatelliteInfo(name: string, category: string): Partial<SatelliteInfo> {
  const n = name.toUpperCase();
  const { agency, country } = inferAgencyAndCountry(name, category);
  const cleanName = name.replace(/\(.*\)/g, '').trim();

  // ══ MMS HELIOPHYSICS MISSIONS ══════════════════════════════════════════════
  if (n.match(/\bMMS\b/) || n.startsWith("MMS ") || n.startsWith("MMS-") || n.includes("MAGNETOSPHERIC MULTISCALE")) {
    return {
      name: `MMS (${cleanName || "Magnetospheric Multiscale"})`,
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/b/b3/Artist_depiction_of_MMS_spacecraft_%28SVS12239%29.png"),
      wikipediaUrl: "https://en.wikipedia.org/wiki/Magnetospheric_Multiscale_Mission",
      agency: "NASA Goddard Space Flight Center",
      country: "United States",
      launchDate: "2015-03-13",
      launchSite: "Cape Canaveral Space Force Station SLC-41, Florida, USA",
      launchVehicle: "Atlas V 421",
      purpose: "NASA robotic mission comprising four identical spacecraft flying in an adjustable tetrahedron formation through Earth's magnetosphere to study magnetic reconnection—a fundamental universal plasma physics process that drives solar flares and auroral geomagnetic substorms.",
      status: "Operational",
      orbit: "HEO ~ 1,800 km × 153,000 km apogee × 28.5° inclination",
      mass: "1,360 kg wet mass",
      dimensions: "3.5 m diameter × 1.2 m height octagonal prism with four 60 m wire booms",
      power: "625 W GaAs solar panels",
      instruments: [
        "FPI — Fast Plasma Investigation (millisecond electron & ion distribution spectrometers)",
        "FIELDS — Dual Fluxgate Magnetometers, Search-Coil Magnetometer & Electric Double Probes",
        "HPCA — Hot Plasma Composition Analyzer (mass spectrometry for H+, He+, He++, O+ ions)",
        "EPD — Energetic Particle Detector suite (FEEPS and EIS sensors)",
        "ASPOC — Active Spacecraft Potential Control (indium ion emission)"
      ],
      discoveries: [
        {
          title: "Direct Observation of the Electron Diffusion Region",
          desc: "First direct in-situ measurement of explosive magnetic reconnection where magnetic field lines break and reconnect at near-light speeds, converting stored magnetic energy into particle kinetic heating.",
          imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/2/24/Reconnection.gif")
        }
      ],
      links: [
        { label: "NASA MMS Mission", url: "https://www.nasa.gov/mission_pages/mms/index.html" },
        { label: "SwRI MMS Center", url: "https://mms.space.swri.edu/" }
      ],
      tags: ["Heliophysics", "Magnetosphere", "NASA", "Space Weather", "Plasma Physics"]
    };
  }

  // ══ 0. DEBRIS & ROCKET BODIES ═══════════════════════════════════════════════
  if (isDebrisOrRocketBody(n)) {
    let stageAgency = "Space Launch Provider";
    let stageCountry = "International";
    let stageWiki = "https://en.wikipedia.org/wiki/Space_debris";
    let stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Fregat_upper_stage_at_Le_Bourget_2011.jpg/800px-Fregat_upper_stage_at_Le_Bourget_2011.jpg");
    let stageTag = "Space Debris";
    let stagePurpose = `${name} is a tracked orbital debris object — a spent rocket upper stage, payload adapter, or fragmentation piece — remaining in Earth orbit following satellite launch operations. Continuously monitored by the US Space Surveillance Network (SSN) and catalogued in the SATCAT database for space domain awareness, conjunction analysis, and active satellite collision avoidance maneuver planning.`;

    if (n.includes("FREGAT")) {
      stageAgency = "NPO Lavochkin / Roscosmos"; stageCountry = "Russia";
      stageWiki = "https://en.wikipedia.org/wiki/Fregat"; stageTag = "Fregat Upper Stage";
      stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Fregat_upper_stage_at_Le_Bourget_2011.jpg/800px-Fregat_upper_stage_at_Le_Bourget_2011.jpg");
      stagePurpose = `${name} is a spent Fregat restartable liquid-propellant upper stage (UDMH/NTO, 19.85 kN thrust) manufactured by NPO Lavochkin. Fregat stages deliver payloads to LEO, MEO, GEO, and interplanetary trajectories from Soyuz-2 and Zenit launch vehicles. After payload deployment the stage is passivated and remains as tracked debris.`;
    } else if (n.includes("CENTAUR")) {
      stageAgency = "ULA (United Launch Alliance)"; stageCountry = "United States";
      stageWiki = "https://en.wikipedia.org/wiki/Centaur_(rocket_stage)"; stageTag = "Centaur Upper Stage";
      stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Centaur_V_at_KSC.jpg/800px-Centaur_V_at_KSC.jpg");
      stagePurpose = `${name} is a spent Centaur cryogenic upper stage (liquid hydrogen / liquid oxygen, dual RL-10 engines, 200 kN total thrust) developed by Convair/ULA. First cryogenic rocket stage to achieve orbit (1962), Centaur has supported Atlas, Titan, and Vulcan launch vehicles in delivering 300+ military, civil, and commercial payloads to GEO, GTO, and deep space.`;
    } else if (n.includes("SOYUZ") || n.includes("SL-4") || n.includes("SL-16")) {
      stageAgency = "Roscosmos / Samara Space Center"; stageCountry = "Russia";
      stageWiki = "https://en.wikipedia.org/wiki/Soyuz_(rocket_family)"; stageTag = "Soyuz Stage";
      stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Fregat_upper_stage_at_Le_Bourget_2011.jpg/800px-Fregat_upper_stage_at_Le_Bourget_2011.jpg");
      stagePurpose = `${name} is a spent stage from a Soyuz rocket family launch vehicle — the world's most-flown rocket series with over 1,900 launches since 1966. Soyuz has carried ISS crew and cargo, Earth observation, GNSS, and commercial satellites. Third stage (RD-0110) burns RG-1 kerosene/LOX and remains as tracked orbital debris.`;
    } else if (n.includes("DELTA")) {
      stageAgency = "Boeing / ULA"; stageCountry = "United States";
      stageWiki = "https://en.wikipedia.org/wiki/Delta_(rocket_family)"; stageTag = "Delta Upper Stage";
      stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Fregat_upper_stage_at_Le_Bourget_2011.jpg/800px-Fregat_upper_stage_at_Le_Bourget_2011.jpg");
      stagePurpose = `${name} is a spent upper stage from the Delta rocket family (Delta II/III/IV). Delta II flew 155 missions (1989–2018) launching GPS, Mars rovers, Hubble servicing, and scientific payloads. Delta IV Heavy (RP-1/LOX, 3 CBC cores) retired in 2024 after launching NRO reconnaissance satellites and NASA Orion on its first unmanned test flight.`;
    } else if (n.includes("FALCON")) {
      stageAgency = "SpaceX"; stageCountry = "United States";
      stageWiki = "https://en.wikipedia.org/wiki/Falcon_9"; stageTag = "Falcon 9 Upper Stage";
      stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Starlink_Mission_%2847926144123%29.jpg/800px-Starlink_Mission_%2847926144123%29.jpg");
      stagePurpose = `${name} is a spent Falcon 9 Block 5 upper stage (Merlin Vacuum engine, 934 kN thrust, LOX/RP-1). Unlike the reusable first stage booster, the Falcon 9 upper stage is currently expendable and remains as tracked orbital debris. Falcon 9 is the world's most launched rocket, supporting Starlink, Dragon ISS missions, and commercial GTO deliveries.`;
    } else if (n.includes("CZ-") || n.includes("LONG MARCH") || n.includes("CHANG ZHENG")) {
      stageAgency = "CALT / CASC (China)"; stageCountry = "China";
      stageWiki = "https://en.wikipedia.org/wiki/Long_March_(rocket_family)"; stageTag = "Long March Stage";
      stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Fregat_upper_stage_at_Le_Bourget_2011.jpg/800px-Fregat_upper_stage_at_Le_Bourget_2011.jpg");
      stagePurpose = `${name} is a spent stage from China's Long March (Chang Zheng) rocket family, the primary Chinese national launch vehicle series operated by CASC since 1970 with 500+ flights. Long March 5B upper stages caused international controversy by uncontrolled re-entries in 2020, 2021, and 2022. The family includes LM-2, 3, 4, 5, 6, 7, and 8 variants.`;
    } else if (n.includes("TITAN")) {
      stageAgency = "US Air Force / Martin Marietta"; stageCountry = "United States";
      stageWiki = "https://en.wikipedia.org/wiki/Titan_(rocket_family)"; stageTag = "Titan Stage";
      stagePurpose = `${name} is a spent stage from the Titan ICBM-derived rocket family (1959–2005), which launched Voyager 1 & 2, Cassini, Viking Mars landers, DMSP weather satellites, and key NRO reconnaissance payloads. Titan IV-B was the heaviest US expendable rocket before Delta IV Heavy, lifting 21,640 kg to LEO.`;
    } else if (n.includes("ARIANE")) {
      stageAgency = "Arianespace / ArianeGroup"; stageCountry = "Europe";
      stageWiki = "https://en.wikipedia.org/wiki/Ariane_(rocket_family)"; stageTag = "Ariane Stage";
      stageImg = WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Fregat_upper_stage_at_Le_Bourget_2011.jpg/800px-Fregat_upper_stage_at_Le_Bourget_2011.jpg");
      stagePurpose = `${name} is a spent stage from the Ariane rocket family (Ariane 5 / Ariane 6). Ariane 5 flew 116 missions (1997–2023) with 112 consecutive successes — the most reliable GTO launcher in history — and launched Rosetta, Herschel, Planck, ATV cargo ships, and JWST. Ariane 6 replaced it with a re-ignitable Vinci upper stage.`;
    } else if (n.includes("PSLV") || n.includes("GSLV")) {
      stageAgency = "ISRO"; stageCountry = "India";
      stageWiki = "https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle"; stageTag = "PSLV/GSLV Stage";
      stagePurpose = `${name} is a spent stage from ISRO's PSLV or GSLV rocket. PSLV (Polar Satellite Launch Vehicle) has flown 60+ missions since 1993 and is ISRO's most reliable workhorse, launching Chandrayaan-1, Mars Orbiter Mission (Mangalyaan), Aditya-L1, and over 400 international cubesats. GSLV (Geosynchronous Launch Vehicle) uses an indigenous cryogenic upper stage.`;
    } else if (n.includes("H-2") || n.includes("H2") || n.includes("EPSILON") || n.includes("SS-520")) {
      stageAgency = "JAXA (Japan Aerospace Exploration Agency)"; stageCountry = "Japan";
      stageWiki = "https://en.wikipedia.org/wiki/H-IIA"; stageTag = "H-IIA/B Stage";
      stagePurpose = `${name} is a spent stage from Japan's H-II rocket family (H-IIA / H-IIB) developed by JAXA and Mitsubishi Heavy Industries. H-IIA has 46 successful missions (2001–2023) launching weather, Earth observation, and scientific payloads. H3 replaced it in 2023 with the LE-9 LH2/LOX engine for lower-cost commercial launches.`;
    }

    return {
      name, agency: stageAgency, country: stageCountry,
      launchDate: "Orbital Debris — Spent Launch Vehicle Stage",
      launchVehicle: "Expendable Rocket Upper / Third Stage",
      purpose: stagePurpose, status: "Defunct", orbit: "Earth Debris Orbit",
      imageUrl: stageImg, wikipediaUrl: stageWiki,
      tags: ["Space Debris", "Rocket Body", stageTag, "SSN Tracked"]
    };
  }

  // ══ 1. CREWED SPACECRAFT & CARGO RESUPPLY ════════════════════════════════════
  if (n.includes("DRAGON CRS") || n.includes("CARGO DRAGON") || n.includes("DRAGON-")) return {
    agency, country, launchDate: "2012–present (CRS-1 through CRS-28)",
    launchSite: "Kennedy Space Center LC-39A",
    launchVehicle: "Falcon 9 Block 5 (reused first-stage booster)",
    purpose: `${cleanName} is a reusable SpaceX Dragon 2 pressurized cargo spacecraft delivering science experiments, food, equipment, and crew provisions to the ISS under NASA's Commercial Resupply Services (CRS) contract. Dragon is the only operational spacecraft able to return significant quantities of experiment samples from the ISS back to Earth, splashing down off the California coast for ocean recovery.`,
    status: "Operational",
    orbit: "LEO ~ 400 km × 51.64° (ISS rendezvous/berthing orbit)",
    mass: "9,750 kg (Dragon cargo), 3,307 kg payload capacity to ISS",
    dimensions: "6.1 m height × 3.7 m diameter (pressurized capsule + unpressurized trunk)",
    power: "4 solar panels, 1.5 kW continuous power to ISS trunk cargo",
    instruments: [
      "SuperDraco 8× Emergency Launch Abort Thrusters (71 kN each, hypergolic)",
      "Draco 16× Maneuvering Thrusters (400 N, MMH/NTO propellant)",
      "Autonomous Berthing System (SSRMS arm grapple, CBM docking adapter)",
      "LIDAR-based Dragon Rendezvous Sensor System (DragonEye)",
      "Pressurized capsule (10 m³ volume) + Unpressurized trunk for external cargo"
    ],
    discoveries: [{
      title: "First Commercial Vehicle to Berth at ISS (2012)",
      desc: "SpaceX Dragon became the first commercial spacecraft to successfully berth with the ISS on 25 May 2012 (CRS-1 demonstration), validating NASA's Commercial Crew and Cargo Program model that shifted LEO transport to private industry.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crew_Dragon_at_the_ISS.jpg/600px-Crew_Dragon_at_the_ISS.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crew_Dragon_at_the_ISS.jpg/800px-Crew_Dragon_at_the_ISS.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/SpaceX_Dragon_2",
    links: [{ label: "SpaceX Dragon CRS", url: "https://www.spacex.com/vehicles/dragon/" }],
    tags: ["Cargo Resupply", "SpaceX", "ISS", "Reusable", "CRS"]
  };

  if (n.includes("CREW DRAGON") || n.includes("ENDURANCE") || n.includes("RESILIENCE") || n.includes("ENDEAVOUR") || n.includes("FREEDOM")) return {
    agency, country, launchDate: "2020–present (Demo-2, Crew-1 through Crew-9)",
    launchSite: "Kennedy Space Center LC-39A",
    launchVehicle: "Falcon 9 Block 5",
    purpose: `${cleanName} is a reusable SpaceX Crew Dragon crewed spacecraft carrying 4 NASA, ESA, JAXA, and commercial astronauts to the International Space Station under NASA's Commercial Crew Program. Crew Dragon ended sole US reliance on Russian Soyuz for crew transport to the ISS and introduced autonomous docking with the IDA-2/3 International Docking Adapters.`,
    status: "Operational", orbit: "LEO ~ 400 km × 51.64°",
    mass: "12,519 kg (crew configuration)", dimensions: "8.1 m height × 4.0 m diameter",
    power: "Solar panel charging for internal systems and life support during free flight",
    instruments: [
      "8× SuperDraco Emergency Abort Engines (320 kN total, instantaneous abort capability)",
      "16× Draco Orbital Maneuvering Thrusters (400 N each, MMH/NTO)",
      "Autonomous docking system with IDA at ISS (zero astronaut intervention needed)",
      "Advanced Environmental Control & Life Support System (ECLSS)",
      "Touch-screen human-machine interface (Dragon avionics suite)"
    ],
    discoveries: [{
      title: "Returning Commercial Human Spaceflight to American Soil",
      desc: "Crew Dragon Demo-2 (May 30, 2020) was the first crewed launch from American soil since Space Shuttle Atlantis STS-135 in 2011, and the first commercial human orbital spaceflight in history — ending 9 years of exclusive US reliance on Roscosmos Soyuz for ISS crew transport at $90M per seat.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crew_Dragon_at_the_ISS.jpg/600px-Crew_Dragon_at_the_ISS.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crew_Dragon_at_the_ISS.jpg/800px-Crew_Dragon_at_the_ISS.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/SpaceX_Crew_Dragon",
    links: [{ label: "SpaceX Crew Dragon", url: "https://www.spacex.com/vehicles/dragon/" }],
    tags: ["Crew Transport", "SpaceX", "NASA CCP", "Autonomous Docking"]
  };

  if (n.includes("SOYUZ MS") || n.includes("SOYUZ TMA") || (n.includes("SOYUZ") && !isDebrisOrRocketBody(n))) return {
    agency, country, launchDate: "MS-series: 2016–present (Soyuz family since 1967)",
    launchSite: "Baikonur Cosmodrome Site 1/5 'Gagarin's Start'",
    launchVehicle: "Soyuz-2.1a (3-stage LOX/kerosene)",
    purpose: `${cleanName} is a Roscosmos Soyuz MS (Modified Spacecraft) three-module crewed spacecraft providing ISS crew rotation services and emergency lifeboat capability. The Soyuz design lineage traces to the 1960s Vostok/Voskhod program and has been continuously upgraded. At 6 hours or 2-day approach profiles, it carries up to 3 cosmonauts/astronauts to the ISS and serves as the primary emergency return vehicle throughout docked missions.`,
    status: "Operational", orbit: "LEO ~ 400 km × 51.64° (ISS chase orbit → docking)",
    mass: "7,080 kg", dimensions: "7.0 m length × 2.72 m descent module diameter",
    power: "Solar panels on orbital module providing 0.5 kW",
    instruments: [
      "Kurs-NA Automated Docking Radar System (active radar, passive KURS-P on ISS MRM-2/MIM-2)",
      "TOBOL Manual Docking Optical Sight & Periscope (backup for commander)",
      "SKD Main Propulsion Engine (Kabriolet, 2.95 kN thrust, NTO/UDMH bipropellant)",
      "DPO Approach & Attitude Control Thrusters (28× small thrusters)",
      "Vzor Visual Orientation Device & GLOB Navigation Suite"
    ],
    discoveries: [{
      title: "Two-Day to Six-Hour ISS Rendezvous Optimization",
      desc: "Soyuz MS-17 (2020) pioneered the 3-hour fast rendezvous profile (2 orbit approach) later standardized on all missions, reducing crew exposure time in the small Descent Module from 2 days and improving crew physiological wellbeing at docking.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Soyuz_MS-09_approaching_ISS.jpg/600px-Soyuz_MS-09_approaching_ISS.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Soyuz_MS-09_approaching_ISS.jpg/800px-Soyuz_MS-09_approaching_ISS.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Soyuz_MS",
    links: [{ label: "Roscosmos Soyuz", url: "https://www.roscosmos.ru/" }],
    tags: ["Crew Transport", "Roscosmos", "Soyuz", "ISS Lifeboat"]
  };

  if (n.includes("PROGRESS MS") || n.includes("PROGRESS M") || n.includes("PROGRESS-M")) return {
    agency, country, launchDate: "1978–present (Progress M-series from 1989, MS-series from 2015)",
    launchSite: "Baikonur Cosmodrome Site 1/5",
    launchVehicle: "Soyuz-2.1a",
    purpose: `${cleanName} is a Roscosmos Progress automated uncrewed cargo spacecraft delivering ~2,350 kg of wet/dry cargo (food, water, oxygen, EVA equipment, science hardware, spare parts) and ~900 kg of propellant to the ISS per mission. Progress vehicles dock autonomously using Kurs-NA radar and are loaded with waste for destructive atmospheric re-entry after undocking.`,
    status: "Operational", orbit: "LEO ~ 400 km × 51.64°",
    mass: "7,285 kg (typical launch mass)", dimensions: "7.23 m length × 2.72 m diameter",
    power: "Solar panel array on instrument/propulsion module",
    instruments: [
      "Kurs-NA Automated Rendezvous & Docking Radar (active homing to ISS passives)",
      "Rodnik-3 Water Transfer System (potable water bag transfer, 400 kg capacity)",
      "Pressurized Cargo Module (6.6 m³, 1,350 kg dry cargo including food, EVA equipment)",
      "Propellant Resupply System (propellant transfer directly to ISS via feed lines)",
      "OKD Main Propulsion System (2 × 300 N engines) for orbital maneuvers"
    ],
    discoveries: [{
      title: "ISS Re-boost & Debris Avoidance Maneuver Capability",
      desc: "Progress MS vehicles serve a critical dual function: delivering cargo AND performing periodic ISS re-boost maneuvers (DeltaV ~1 m/s) to counteract atmospheric drag decay, and executing Emergency Collision Avoidance Maneuvers (CAMs) when tracked debris poses conjunction risk.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Progress_MS-10.jpg/600px-Progress_MS-10.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Progress_MS-10.jpg/800px-Progress_MS-10.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Progress_(spacecraft)",
    links: [{ label: "Roscosmos Progress", url: "https://www.roscosmos.ru/" }],
    tags: ["Cargo Spacecraft", "Roscosmos", "ISS Resupply", "Automated Docking"]
  };

  if (n.includes("HTV") || n.includes("KOUNOTORI") || n.includes("HTV-X")) return {
    agency: "JAXA", country: "Japan",
    launchDate: "2009–2020 (HTV-1 through HTV-9); HTV-X from 2025",
    launchSite: "Tanegashima Space Center, Yoshinobu Launch Complex",
    launchVehicle: "H-IIB (HTV) / H3 (HTV-X)",
    purpose: `${cleanName} is a JAXA H-II Transfer Vehicle (Kounotori — White Stork) automated cargo spacecraft delivering up to 6,000 kg of pressurized + unpressurized cargo to the ISS. JAXA's largest spacecraft, HTV uniquely delivered external experiment pallet cargo to the ISS Exposed Facility via robotic arm, and conducted destructive re-entry after undocking.`,
    status: "Operational", orbit: "LEO ~ 400 km × 51.64°",
    mass: "10,500 kg (vehicle) + 6,000 kg payload",
    dimensions: "10.0 m × 4.4 m diameter",
    instruments: [
      "Proximity Communications System (PROX) for ISS approach guidance",
      "Pressurized Logistics Carrier (PLC) — 4,000 kg internal cargo",
      "Unpressurized Logistics Carrier (ULC) — up to 1,500 kg external payload racks",
      "NCS — Node Connection System (SSRMS berthing approach, not autonomous docking)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/HTV-1_Approaching_ISS.jpg/800px-HTV-1_Approaching_ISS.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/H-II_Transfer_Vehicle",
    links: [{ label: "JAXA HTV", url: "https://iss.jaxa.jp/en/htv/" }],
    tags: ["Cargo Spacecraft", "JAXA", "Japan", "ISS Resupply", "HTV"]
  };

  if (n.includes("CYGNUS") || n.includes("NG-")) return {
    agency: "Northrop Grumman", country: "United States",
    launchDate: "2013–present (CRS-1 through CRS-21)",
    launchSite: "Mid-Atlantic Regional Spaceport (MARS), Wallops Island, Virginia",
    launchVehicle: "Antares 230+ / Falcon 9 (backup)",
    purpose: `${cleanName} is a Northrop Grumman Cygnus Enhanced pressurized cargo spacecraft delivering ~3,800 kg of science, hardware, and crew supplies to the ISS under NASA's CRS-2 contract. Named after NASA astronauts and scientists, Cygnus can extend missions by remaining attached to the ISS as an extra pressurized volume, and is used for in-orbit waste disposal and controlled destructive re-entry.`,
    status: "Operational", orbit: "LEO ~ 400 km × 51.64°",
    mass: "7,000 kg (total vehicle)", dimensions: "6.4 m × 3.07 m diameter",
    instruments: [
      "LIDAR-based Sensor Suite for ISS SSRMS grapple approach",
      "Pressurized cargo module (based on MPLM/Thales Alenia Space heritage)",
      "Vision Navigation System for ISS proximity operations",
      "Safe Haven capability (temporary refuge during EVA depress emergencies)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Cygnus_CRS_Orb-1_ISS_rendezvous.jpg/800px-Cygnus_CRS_Orb-1_ISS_rendezvous.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Cygnus_(spacecraft)",
    links: [{ label: "Northrop Grumman Cygnus", url: "https://www.northropgrumman.com/space/cygnus-spacecraft/" }],
    tags: ["Cargo Spacecraft", "Northrop Grumman", "NASA CRS-2", "ISS"]
  };

  // ══ 2. CHINA NATIONAL SATELLITES ════════════════════════════════════════════
  if (n.includes("YAOGAN")) return {
    agency, country,
    launchDate: "2006–present (60+ Yaogan satellites)",
    launchSite: "Jiuquan, Taiyuan, or Xichang Satellite Launch Centre",
    launchVehicle: "Long March 2D / 4B / 4C (1,400–2,800 kg class)",
    purpose: `${cleanName} is a Chinese Yaogan (遥感) series Earth observation and electronic reconnaissance satellite in the constellation operated by the Chinese People's Liberation Army Strategic Support Force (PLASSF). Yaogan payloads include sub-meter resolution electro-optical cameras, L/X-band Synthetic Aperture Radar (SAR), and Electronic Intelligence (ELINT) interception arrays. Mission details are classified; satellites are officially described for 'land survey, crop yield estimation, environmental protection, and disaster monitoring'.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 625 km × 97.8°",
    mass: "1,200–2,800 kg",
    instruments: [
      "Sub-meter resolution panchromatic optical telescope (diffraction-limited optics)",
      "L-band / X-band Synthetic Aperture Radar (multi-mode: spotlight, strip, scan)",
      "Electronic Intelligence (ELINT) payload — classified signal intercept arrays",
      "Infrared multi-spectral imaging radiometer"
    ],
    discoveries: [{
      title: "First Dual-Mode Optical + SAR Chinese Constellation",
      desc: "Yaogan constellations (e.g., Yaogan-16 triplet group) pioneered Chinese use of triangulated satellite clusters — 3 satellites flying in close formation — to enable rapid repeat coverage of a single target area for military electronic intelligence collection, a technique previously only operated by the US NRO.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Long_March_2D.jpg/800px-Long_March_2D.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Long_March_2D.jpg/800px-Long_March_2D.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Yaogan",
    tags: ["Earth Observation", "Yaogan", "CNSA/PLA", "China", "SAR", "ELINT"]
  };

  if (n.includes("GAOFEN") || n.includes("GF-")) return {
    agency, country,
    launchDate: "2013–present (Gaofen-1 through Gaofen-16+)",
    launchSite: "Jiuquan / Taiyuan Satellite Launch Centre",
    launchVehicle: "Long March 2D / 4C / 4B",
    purpose: `${cleanName} is part of China's Gaofen (高分 — 'high resolution') CHEOS (China High-resolution Earth Observation System) program — a major national civil/dual-use remote sensing constellation providing sub-meter resolution optical imagery, C-band SAR, hyperspectral imaging, and infrared for agriculture precision, land resource mapping, disaster emergency response, urban monitoring, and environmental law enforcement.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 631 km × 98.0°",
    mass: "1,000–2,000 kg",
    dimensions: "Varies by variant (Gaofen-2: 2,000 kg; Gaofen-11: ~3,000 kg)",
    instruments: [
      "PAN Panchromatic High-Resolution Camera (0.5–1 m GSD for sub-meter detection)",
      "Multi-Spectral Camera (MS — 2 m GSD, 4 bands: Blue, Green, Red, NIR)",
      "Wide-Field Imager (WFI — 16 m GSD, 800 km swath for rapid mapping)",
      "C-band SAR (GF-3 variant, 1–500 m resolution, 10–650 km swath, multipolarization)",
      "Hyperspectral Imager (GF-5 variant, 330 spectral bands at 30 m resolution)"
    ],
    discoveries: [{
      title: "Sub-meter National Earth Monitoring Grid",
      desc: "Gaofen-11 achieved 0.5 m panchromatic resolution — matching commercial Maxar WorldView-3 performance — enabling China to independently monitor infrastructure, shipping ports, military facilities, and agricultural yields without reliance on foreign commercial imagery vendors.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Long_March_2D.jpg/600px-Long_March_2D.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Long_March_2D.jpg/800px-Long_March_2D.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Gaofen",
    tags: ["Gaofen", "CHEOS", "CNSA", "China", "Sub-meter Imagery"]
  };

  if (n.includes("SHIYAN") || n.includes("SY-") || n.includes("SHIJIAN") || n.includes("SJ-")) return {
    agency, country,
    launchDate: "2004–present (ongoing series)",
    launchSite: "Jiuquan / Xichang / Taiyuan Satellite Launch Centre",
    launchVehicle: "Long March 2D / Long March 11",
    purpose: `${cleanName} is part of China's Shiyan (试验 — 'Experiment') or Shijian (实践 — 'Practice') series of technology demonstration and space environment research satellites. Missions test new satellite bus platforms, optical sensors, electric propulsion systems, quantum communication payloads, and inspect other on-orbit objects. Some Shijian satellites conduct high-energy particle and X-ray astrophysics science.`,
    status: "Operational", orbit: "LEO ~ 500–1,100 km (varies by mission)",
    mass: "100–800 kg (varies)",
    instruments: [
      "Advanced Electric Propulsion Thruster (Hall-effect ion propulsion test)",
      "Optical Telescope (technology demonstration optics)",
      "Space Environment Monitoring Package (radiation, plasma flux sensors)",
      "Rendezvous & Proximity Operations Sensor (optical/lidar for on-orbit inspection)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Long_March_2D.jpg/800px-Long_March_2D.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Shiyan_(satellite_series)",
    tags: ["Technology Demo", "Shiyan", "Shijian", "CNSA", "China"]
  };

  if (n.includes("JILIN")) return {
    agency: "Chang Guang Satellite Technology Co. (CGSTL)", country: "China",
    launchDate: "2015–present (Jilin-1 commercial constellation)",
    launchSite: "Jiuquan Satellite Launch Centre",
    launchVehicle: "Long March 11 / Kuaizhou-1A",
    purpose: `${cleanName} is part of China's largest commercial remote sensing constellation operated by Chang Guang Satellite Technology. The Jilin-1 constellation targets sub-daily revisit of any point on Earth with 0.5 m resolution optical cameras, video imaging (continuous frame satellite video), and infrared sensing. Primary customers include government, agriculture, insurance, and urban planning sectors.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 535–700 km",
    mass: "40–230 kg",
    instruments: [
      "Sub-meter Panchromatic Push-broom Camera (0.5 m GSD)",
      "Multi-Spectral Imager (2 m GSD, 4-band)",
      "Video Camera (1080p HD, continuous 90-second video imaging mode)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Long_March_2D.jpg/800px-Long_March_2D.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Jilin-1",
    tags: ["Commercial Imagery", "CGSTL", "China", "Video Satellite"]
  };

  // ══ 3. ISRO INDIA SATELLITES ════════════════════════════════════════════════
  if (n.includes("CARTOSAT")) return {
    agency: "ISRO", country: "India",
    launchDate: "2005–present (Cartosat-1 through Cartosat-3)",
    launchSite: "Satish Dhawan Space Centre (SHAR), Sriharikota",
    launchVehicle: "PSLV-CA / PSLV-XL",
    purpose: `${cleanName} is an ISRO Cartosat-series Earth observation satellite providing high-resolution stereo panchromatic and multispectral imagery for large-scale cartography, urban planning, cadastral mapping, infrastructure monitoring, and disaster assessment. Cartosat-3 achieves 0.28 m panchromatic resolution — the highest resolution by any Indian government satellite.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 509–618 km × 97.5°",
    mass: "1,525 kg (Cartosat-3)", dimensions: "2.0 m × 1.8 m × 1.8 m satellite bus",
    power: "2.2 kW from dual deployable solar panels",
    instruments: [
      "PAN — Panchromatic Camera (0.28 m GSD for Cartosat-3; 2.5 m for Cartosat-1)",
      "MS — Multi-Spectral Camera (1.12 m GSD, 4-band: Blue/Green/Red/NIR)",
      "MX — Hyper-Spectral Imager (optional, mid-wave infrared)",
      "NAVIC Receiver for precision on-orbit timing"
    ],
    discoveries: [{
      title: "0.28m Sub-30cm Resolution Milestone for India",
      desc: "Cartosat-3 (November 2019) was the first Indian government satellite to achieve sub-30 cm resolution, enabling identification of individual vehicles, manholes, and electrical pylons — revolutionizing India's national cartographic database and reducing dependence on commercial foreign imagery.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Cartosat-3.jpg/800px-Cartosat-3.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Cartosat-3.jpg/800px-Cartosat-3.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Cartosat",
    links: [{ label: "ISRO Cartosat", url: "https://www.isro.gov.in/earth-observation-satellites" }],
    tags: ["Cartosat", "ISRO", "India", "Sub-meter Imagery", "Cartography"]
  };

  if (n.includes("RISAT")) return {
    agency: "ISRO", country: "India",
    launchDate: "2009–present (RISAT-1, 2, 2B, 2BR1, 2BR2)",
    launchSite: "Satish Dhawan Space Centre (SHAR), Sriharikota",
    launchVehicle: "PSLV-CA / PSLV-C48",
    purpose: `${cleanName} is an ISRO Radar Imaging Satellite (RISAT) series satellite carrying C-band (RISAT-1) or X-band (RISAT-2 series) Synthetic Aperture Radar (SAR) for all-weather, day-night surveillance of land surface, agricultural crop type mapping, flood & cyclone disaster assessment, sea ice monitoring, and strategic reconnaissance. RISAT-2BR1 achieves 0.5 × 0.3 m ultra-high resolution in spot mode.`,
    status: "Operational", orbit: "LEO ~ 500–557 km × 37–97° inclination (varies)",
    mass: "628 kg (RISAT-2BR1); 1,858 kg (RISAT-1)",
    instruments: [
      "X-band SAR — Very High Resolution Spotlight Mode (0.5×0.3 m, 5–10 km swath)",
      "X-band SAR — High Resolution Strip Mode (1 m, 10–50 km swath)",
      "X-band SAR — Medium Resolution ScanSAR (4–25 m, 25–100 km swath)",
      "C-band SAR (RISAT-1 only) — Hybrid Polarization (RH/RV), 3–50 m resolution"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/RISAT-2B.jpg/800px-RISAT-2B.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/RISAT-2BR1",
    links: [{ label: "ISRO RISAT", url: "https://www.isro.gov.in/earth-observation-satellites" }],
    tags: ["SAR Radar", "ISRO", "India", "X-band", "All-weather Imaging"]
  };

  if (n.includes("OCEANSAT")) return {
    agency: "ISRO", country: "India",
    launchDate: "1999–present (Oceansat-1, 2, 3 — EOS-06 launched 2022)",
    launchSite: "Satish Dhawan Space Centre (SHAR), Sriharikota",
    launchVehicle: "PSLV-CA",
    purpose: `${cleanName} is an ISRO Oceansat (EOS-06) satellite providing 3-day complete global ocean monitoring: ocean color, phytoplankton chlorophyll concentration, sea surface temperature, sea surface winds (Ku-band scatterometer), and marine primary productivity for fisheries forecast, cyclone track prediction, and climate science.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 742 km × 98.28°",
    mass: "1,117 kg",
    instruments: [
      "OSCAT-3 — Ku-band Pencil-beam Scatterometer (ocean surface wind speed & direction, 25 km resolution)",
      "OCM-3 — Ocean Colour Monitor (13-band imaging, 360 m resolution, 1,400 km swath)",
      "SST — Sea Surface Temperature Radiometer (visible + thermal IR)",
      "ARGOS relay payload (oceanic buoy data relay)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/EOS-06_Satellite.jpg/800px-EOS-06_Satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Oceansat",
    links: [{ label: "ISRO Oceansat/EOS-06", url: "https://www.isro.gov.in/EOS06.html" }],
    tags: ["Oceansat", "ISRO", "India", "Ocean Colour", "Scatterometer"]
  };

  if (n.includes("RESOURCESAT") || n.includes("EOS-04") || n.includes("EOS-02")) return {
    agency: "ISRO", country: "India",
    launchDate: "2003–present (IRS-1C/D → Resourcesat-1/2/2A)",
    launchSite: "Satish Dhawan Space Centre (SHAR), Sriharikota",
    launchVehicle: "PSLV-XL",
    purpose: `${cleanName} is an ISRO Resourcesat series land and forest resources monitoring satellite providing national crop inventory (kharif & rabi seasons), wasteland atlas, forest cover mapping, coastal erosion monitoring, and watershed delineation for India's National Resources Information System (NRIS).`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 817 km × 98.72°",
    mass: "1,235 kg",
    instruments: [
      "LISS-4 — Linear Imaging Self-Scanning Camera IV (5.8 m resolution, 70 km swath, 3-band)",
      "LISS-3 — Linear Imaging Self-Scanning Camera III (23.5 m, 141 km swath, 4-band)",
      "AWiFS — Advanced Wide Field Sensor (56 m resolution, 740 km swath, 4-band)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/RESOURCESAT-2.jpg/800px-RESOURCESAT-2.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Resourcesat",
    tags: ["Resourcesat", "ISRO", "India", "Land Resources", "IRS"]
  };

  if (n.includes("EOS-") || n.includes("IRS-")) return {
    agency: "ISRO", country: "India",
    launchDate: "1988–present (IRS-1A onwards, rebranded as EOS from 2020)",
    launchSite: "Satish Dhawan Space Centre (SHAR), Sriharikota",
    launchVehicle: "PSLV-XL / GSLV Mk-II",
    purpose: `${cleanName} is part of ISRO's Earth Observation Satellite (EOS) constellation — India's national remote sensing infrastructure providing optical multispectral imagery, SAR radar, thermal infrared, and hyperspectral data for agriculture, forestry, geology, disaster management, and strategic applications from sun-synchronous polar orbits.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 500–800 km",
    mass: "1,000–2,000 kg",
    instruments: [
      "Multi-resolution Multi-spectral Optical Camera",
      "Thermal Infrared Scanner (for night-time land surface temperature)",
      "C-band / X-band SAR (variant dependent)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Cartosat-3.jpg/800px-Cartosat-3.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Indian_Remote_Sensing_Programme",
    links: [{ label: "ISRO EOS", url: "https://www.isro.gov.in/earth-observation-satellites" }],
    tags: ["EOS", "IRS", "ISRO", "India", "Earth Observation"]
  };

  // ══ 4. COMMERCIAL REMOTE SENSING ═════════════════════════════════════════════
  if (n.includes("PLEIADES") || n.includes("SPOT")) return {
    agency: "Airbus Defence & Space / CNES", country: "France / Europe",
    launchDate: "SPOT: 1986–2015; Pleiades: 2011–present; Pléiades Neo: 2021–present",
    launchSite: "Guiana Space Centre, Kourou (Ariane / Vega launches)",
    launchVehicle: "Ariane 4/5 / Vega / Soyuz (various by generation)",
    purpose: `${cleanName} is a French high-resolution commercial Earth observation satellite. SPOT (Satellite Pour l'Observation de la Terre) launched 1986–2015 pioneered commercial satellite remote sensing with 10–20 m multispectral. Pleiades 1A/1B provide 0.5 m panchromatic. Pleiades Neo (2021–) achieves 0.3 m native GSD, tasking agility of ±60° off-nadir, and same-day revisit of any world target.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 694 km × 98.2°",
    mass: "980 kg (Pleiades 1A/1B); 1,170 kg (Pleiades Neo)",
    instruments: [
      "HiRI High-Resolution Imager (Pleiades) — 0.5 m PAN / 2 m MS (4-band)",
      "Pleiades Neo Imager — 0.3 m PAN native, 1.2 m MS, 8-band MS spectral range",
      "Wide-field Optical Sensor (SPOT 6/7) — 1.5 m PAN / 6 m MS, 60 km swath",
      "Stellar Gyroscopic Attitude Control (±60° extreme agility, 15°/s slew rate)"
    ],
    discoveries: [{
      title: "Founding Commercial Satellite Imagery Industry",
      desc: "SPOT-1 (1986) was the first satellite designed specifically for commercial civilian Earth observation, inspiring the entire industry of commercial remote sensing. SPOT Archive provides the world's longest continuous high-resolution optical imagery archive spanning 40+ years for multidecadal change analysis.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/SPOT_7.jpg/600px-SPOT_7.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/SPOT_7.jpg/800px-SPOT_7.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/SPOT_(satellite)",
    links: [{ label: "Airbus Pleiades Neo", url: "https://www.intelligence-airbusds.com/imagery/constellation/pleiades-neo/" }],
    tags: ["Pleiades", "SPOT", "Airbus", "CNES", "Commercial Imagery"]
  };

  if (n.includes("WORLDVIEW") || n.includes("GEOEYE") || n.includes("IKONOS") || n.includes("QUICKBIRD") || n.includes("LEGIONIMAGE")) return {
    agency: "Maxar Technologies", country: "United States",
    launchDate: "1999 (IKONOS) → 2014 (WorldView-3) → 2024 (Legion)",
    launchSite: "Vandenberg SFB SLC-3E (Delta II) / Vandenberg SFB SLC-3W (Atlas V 401)",
    launchVehicle: "Delta II / Atlas V 401 / Falcon 9",
    purpose: `${cleanName} is a Maxar Technologies commercial high-resolution optical Earth imaging satellite. WorldView-3 achieves the highest commercial optical resolution at 31 cm native GSD panchromatic and 1.24 m multispectral in 8 standard + 8 SWIR + 12 CAVIS bands — matching intelligence-grade imagery quality. WorldView Legion constellation provides same-day 15× revisit of any world target for near-real-time monitoring.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 617 km × 97.9°",
    mass: "2,800 kg (WorldView-3)", dimensions: "7.9 m × 2.5 m (bus + solar array)",
    power: "3.2 kW from GaAs solar array",
    instruments: [
      "WV-110 31 cm Aperture Telescope (WorldView-3 — 31 cm PAN / 1.24 m MS)",
      "8-band Standard Multispectral (MS, 400–1040 nm)",
      "8-band SWIR Shortwave Infrared Sensor (SWIR, 1195–2365 nm)",
      "12-band CAVIS Cloud, Aerosol, Vapour, Ice, Snow atmospheric correction sensor",
      "WorldView Legion: 50 cm resolution, 6-satellite constellation, 15+ daily revisits"
    ],
    discoveries: [{
      title: "Commercial Sub-Meter to Sub-50cm Imagery",
      desc: "IKONOS (1999) became the first commercial satellite to collect 1-meter panchromatic imagery, breaking the restriction on commercial imagery resolution. WorldView-3 later achieved 31 cm imagery in 2014, and WorldView Legion (2023) provides same-day near-real-time monitoring previously only possible for major governments.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/WorldView-3_satellite.jpg/600px-WorldView-3_satellite.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/WorldView-3_satellite.jpg/800px-WorldView-3_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/WorldView-3",
    links: [{ label: "Maxar WorldView", url: "https://www.maxar.com/imagery" }],
    tags: ["Maxar", "WorldView", "Commercial Sub-30cm Imagery", "Intelligence-Grade"]
  };

  if (n.includes("ICEYE")) return {
    agency: "ICEYE (Finland)", country: "Finland",
    launchDate: "2018–present (ICEYE-X1 through X30+)",
    launchSite: "Cape Canaveral / Vandenberg / Baikonur (rideshare launches)",
    launchVehicle: "Falcon 9 / Soyuz-2 / Electron",
    purpose: `${cleanName} is an ICEYE X-band Synthetic Aperture Radar (SAR) microsatellite — the world's first commercial SAR constellation at sub-100 kg class. ICEYE SAR provides all-weather, day-night, cloud-penetrating sub-meter resolution radar imagery for maritime vessel detection, flood monitoring, wildfire perimeter mapping, Arctic sea ice tracking, and infrastructure change detection with 1-hour revisit at any point on Earth.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 575 km × 97.6°",
    mass: "85–112 kg",
    instruments: [
      "X-band SAR — Spot Mode (25 cm resolution, 5 km × 5 km scene)",
      "X-band SAR — Strip Mode (3 m resolution, 30 km swath)",
      "X-band SAR — Scan Mode (15 m resolution, 100 km swath)",
      "X-band SAR — Dwell Mode (continuous area monitor, sub-1 min coherent change detection)"
    ],
    discoveries: [{
      title: "World's First Sub-100kg Commercial SAR Satellite (2018)",
      desc: "ICEYE-X1 (2018) was the world's first commercial SAR satellite below 100 kg — proving miniaturized SAR radar was viable in a cubesat-scale bus. This enabled a 30+ satellite constellation providing hourly revisit, previously only achievable by large government radar satellites costing 10–50× more.",
      imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ICEYE_X2_Satellite.jpg/600px-ICEYE_X2_Satellite.jpg")
    }],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ICEYE_X2_Satellite.jpg/800px-ICEYE_X2_Satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/ICEYE",
    links: [{ label: "ICEYE SAR", url: "https://www.iceye.com/" }],
    tags: ["SAR Radar", "ICEYE", "Finland", "Microsatellite", "X-band"]
  };

  if (n.includes("CAPELLA")) return {
    agency: "Capella Space (USA)", country: "United States",
    launchDate: "2020–present (Capella-2 through Acadia constellation)",
    launchSite: "Vandenberg SFB / Cape Canaveral (rideshare)",
    launchVehicle: "Falcon 9 rideshare / Rocket Lab Electron",
    purpose: `${cleanName} is a Capella Space X-band SAR microsatellite in the Acadia commercial SAR constellation. Capella Acadia satellites achieve 50 cm Ultra-Fine resolution (highest in commercial SAR) and continuous Day-Night-All-Weather monitoring with near-hourly revisit. Primary applications include US government intelligence, maritime tracking, infrastructure change detection, and Arctic ice monitoring.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 525 km × 97.5°",
    mass: "112 kg per satellite",
    instruments: [
      "X-band SAR — Ultra-Fine Mode (50 cm × 50 cm GSD, highest commercial SAR resolution)",
      "X-band SAR — Standard Mode (1 m GSD, 5 km swath)",
      "X-band SAR — Wide Area Mode (5 m GSD, 25 km swath)",
      "X-band SAR — Spotlight 100 (100 m long coherent integration for target persistence)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ICEYE_X2_Satellite.jpg/800px-ICEYE_X2_Satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Capella_Space",
    links: [{ label: "Capella Space", url: "https://www.capellaspace.com/" }],
    tags: ["SAR Radar", "Capella", "USA", "50cm Resolution", "Commercial Intelligence"]
  };

  if (n.includes("PLANET") || n.includes("DOVE") || n.includes("SKYSAT") || n.includes("FLOCK")) return {
    agency: "Planet Labs (USA)", country: "United States",
    launchDate: "2013–present (Flock/Dove constellation, SkySat series)",
    launchSite: "Vandenberg SFB / ISS deployment / Rocket Lab / Falcon 9",
    launchVehicle: "Falcon 9 rideshare / Rocket Lab Electron / ISS CubeSat deployment",
    purpose: `${cleanName} is a Planet Labs commercial Earth observation satellite. Planet's Dove constellation (3U CubeSats) provides 3–5 m resolution daily global coverage — the highest temporal resolution of any Earth observation constellation. SkySat provides 50 cm resolution with sub-daily revisit. Together they enable agriculture monitoring, deforestation tracking, ship identification, and construction change detection.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 475–500 km × 97.4°",
    mass: "4 kg (Dove 3U CubeSat) / 110 kg (SkySat-C)",
    instruments: [
      "RGB + NIR Multispectral Push-broom Imager (Dove, 3–5 m GSD, 24 km swath)",
      "SkySat 50 cm Telescope (0.5 m PAN, 1 m MS; 800 km²/day collection)",
      "Video mode 90-second streaming at 1 m resolution (SkySat)",
      "Daily global mosaic (complete Earth coverage every 24 hours)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Planet_Labs_Dove_satellite.jpg/800px-Planet_Labs_Dove_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Planet_Labs",
    links: [{ label: "Planet Labs", url: "https://www.planet.com/" }],
    tags: ["Planet Labs", "Dove", "SkySat", "Daily Revisit", "Commercial"]
  };

  // ══ 5. RUSSIA & CIS SATELLITES ══════════════════════════════════════════════
  if (n.includes("RESURS")) return {
    agency: "Roscosmos / TSNIIMASH", country: "Russia",
    launchDate: "1979–present (Resurs-O, -P, -DK series)",
    launchSite: "Baikonur / Plesetsk Cosmodrome",
    launchVehicle: "Soyuz-2.1b",
    purpose: `${cleanName} is a Russian Resurs (ресурс — 'resource') Earth remote sensing satellite providing panchromatic, multispectral, and hyperspectral optical imagery for land resources inventory, agricultural crop assessment, mineral exploration, natural disaster mapping, and environmental monitoring. Resurs-P satellites carry the Geoton-L1 telescope with 1 m panchromatic and 4 m multispectral resolution.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 475 km × 97.3°",
    mass: "6,440 kg",
    instruments: [
      "Geoton-L1 High-Resolution Optical Telescope (1 m PAN / 3–4 m MS, 38 km swath)",
      "Hyperspectrometer (GSA — 30 m resolution, 96–276 spectral bands)",
      "SMSPO Wide-Field Multispectral Scanner (120 m resolution, 450 km swath)",
      "AIS (Automatic Identification System) maritime vessel tracking payload"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Resurs-P_No1.jpg/800px-Resurs-P_No1.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Resurs-P",
    tags: ["Resurs", "Roscosmos", "Russia", "Hyperspectral", "Earth Observation"]
  };

  if (n.includes("KANOPUS")) return {
    agency: "Roscosmos / VNIIEM", country: "Russia",
    launchDate: "2012–present (Kanopus-V, Kanopus-ST)",
    launchSite: "Baikonur / Vostochny Cosmodrome",
    launchVehicle: "Soyuz-2.1b / Soyuz-2.1a",
    purpose: `${cleanName} is a Russian Kanopus-V (Канопус-В) small Earth observation satellite providing 2.1 m panchromatic and 12 m multispectral optical imagery for operational monitoring of Russian territory: environmental disasters (wildfires, floods, earthquakes), oil spills, agricultural crop disease, and Arctic ice navigation.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 510 km × 97.4°",
    mass: "473 kg",
    instruments: [
      "PSS Panchromatic-Spectral Scanner (2.1 m PAN, 12 m MS, 20 km swath)",
      "MSS Multispectral Scanner (12 m, 4 bands including NIR)",
      "AIS Automatic Identification System (maritime vessel tracking)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Kanopus-V_satellite.jpg/800px-Kanopus-V_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Kanopus-V",
    tags: ["Kanopus", "Roscosmos", "Russia", "Earth Observation", "Disaster"]
  };

  if (n.includes("METEOR")) return {
    agency: "Roscosmos / VNIIEM", country: "Russia",
    launchDate: "1969–present (Meteor-3M, Meteor-M series 2009–present)",
    launchSite: "Plesetsk / Baikonur Cosmodrome",
    launchVehicle: "Soyuz-2.1b",
    purpose: `${cleanName} is a Russian Meteor-M series polar-orbiting hydrometeorological satellite providing cloud imagery, sea surface temperature, sea ice extent, ozone column, and radiation budget measurements for Russian weather service (Roshydromet) numerical weather prediction and Arctic sea route navigation.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 830 km × 98.76°",
    mass: "2,900 kg",
    instruments: [
      "KMSS Multi-Spectral Scanner (1 km resolution, 2,800 km swath, 5 bands)",
      "MSU-MR Medium-Resolution Scanning Radiometer (1 km, 2,600 km swath)",
      "MTVZA-GY Microwave Imaging Radiometer (3–18 mm, precipitation & ice)",
      "IKAR-N Radioaltimeter (ocean surface topography)",
      "SERP Total Ozone System"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Meteor-M_No.2.jpg/800px-Meteor-M_No.2.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Meteor_(satellite)",
    tags: ["Meteor", "Roscosmos", "Russia", "Weather", "Polar Orbit"]
  };

  if (n.includes("KOSMOS") || n.includes("COSMOS")) return {
    agency: "Roscosmos / Ministry of Defence (Russia)", country: "Russia",
    launchDate: "1962–present (4,000+ Kosmos satellites launched)",
    launchSite: "Plesetsk, Kapustin Yar, Baikonur Cosmodrome",
    launchVehicle: "Cosmos-3M / Rokot / Soyuz-2.1b / Proton-M",
    purpose: `${cleanName} is a Russian/Soviet Kosmos (Космос) series satellite — the longest-running satellite series in history with 2,500+ numbered entries covering military reconnaissance (Zenit/Yantar photo-return), ELINT/SIGINT intercept (US-P), missile defense early warning (Oko), naval satellite targeting (US-A nuclear-powered radar ocean reconnaissance), scientific research, and technology demonstrations.`,
    status: "Operational", orbit: "Varies (LEO 200–1,500 km for most missions / HEO for early warning)",
    mass: "Classified (typically 1,500–7,000 kg)",
    instruments: [
      "High-resolution film-return optical camera (early Zenit series)",
      "Digital optical imaging system (Persona, modern Kosmos)",
      "ELINT / SIGINT electronic intelligence collection arrays",
      "Radar ocean reconnaissance system (RORSAT variants, retired)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Kosmos_3_satellite.jpg/800px-Kosmos_3_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Kosmos_(satellite)",
    tags: ["Kosmos", "Russia", "Roscosmos", "Defense", "ELINT"]
  };

  if (n.includes("USA") && !n.includes("STARLINK")) return {
    agency: "US National Reconnaissance Office (NRO) / USSF", country: "United States",
    launchDate: "1992–present (USA-series replaces former DIA satellite names)",
    launchSite: "Cape Canaveral SLC-41 (Atlas V) / Vandenberg SFB SLC-3E / Kennedy LC-39A (Falcon Heavy)",
    launchVehicle: "Atlas V / Vulcan Centaur / Falcon 9 / Falcon Heavy (classified NRO payloads)",
    purpose: `${cleanName} is a classified US National Reconnaissance Office (NRO) satellite — the official designation used for all US national intelligence space systems since 1984. NRO operates the world's most capable satellite intelligence collection system encompassing overhead persistent imagery (IMINT), signals intelligence (SIGINT), geospatial intelligence (GEOINT), and missile warning. Capabilities, orbit, and mass are classified and officially unacknowledged.`,
    status: "Operational",
    orbit: "Classified (LEO reconnaissance / MEO / GEO / Molniya HEO depending on mission type)",
    mass: "Classified",
    instruments: [
      "High-resolution Optical Telescope (IMINT — classified aperture, estimated 2.4–8 m mirrors)",
      "SIGINT Antenna Array (SIGINT — classified collection capability)",
      "Advanced SIGINT / ELINT Cross-linked System (COMSAT intercept)",
      "Nuclear Detonation (NUDET) Detection System (USSPACECOM treaty monitoring)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/NRO_logo.svg/800px-NRO_logo.svg.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/National_Reconnaissance_Office",
    links: [{ label: "NRO Official", url: "https://www.nro.gov/" }],
    tags: ["NRO", "Classified", "Intelligence", "USSF", "IMINT/SIGINT"]
  };

  if (n.includes("NROL") || n.includes("NRO")) return {
    agency: "US National Reconnaissance Office (NRO) / USSF", country: "United States",
    launchDate: "2005–present (designated NROL-XX)",
    launchVehicle: "Atlas V / Vulcan Centaur / Falcon 9 / Delta IV Heavy",
    purpose: `${cleanName} is classified intelligence satellite launched for the National Reconnaissance Office under an NROL (National Reconnaissance Office Launch) mission designation. Details of purpose, instruments, and orbit are officially classified; known mission families include KH-series imagery, Enhanced Crystal IMINT, Mentor SIGINT, and FIA Radar reconnaissance platforms.`,
    status: "Operational", orbit: "Classified",
    mass: "Classified",
    instruments: [
      "Classified IMINT / SIGINT / ELINT payloads",
      "Estimated very large aperture mirror (3–8 m class for KH-series)",
      "Nuclear Detonation Detection System (NUDET) where applicable"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/NRO_logo.svg/800px-NRO_logo.svg.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/National_Reconnaissance_Office",
    tags: ["NRO", "NROL", "Classified Launch", "USSF", "Intelligence"]
  };

  // ══ 6. SPACE OBSERVATORIES & TELESCOPES ══════════════════════════════════════
  if (n.includes("CHANDRA") || n.includes("CXO")) return {
    agency: "NASA / SAO (Smithsonian Astrophysical Observatory)", country: "United States",
    launchDate: "1999-07-23",
    launchSite: "Kennedy Space Center LC-39B",
    launchVehicle: "Space Shuttle Columbia (STS-93) with IUS (Inertial Upper Stage)",
    purpose: "NASA's Chandra X-ray Observatory is the world's most powerful X-ray telescope, operating 100× more sensitive than any predecessor. With 8 nested iridium-coated mirror shells achieving 0.5 arcsecond angular resolution (comparable to Hubble), Chandra detects X-ray photons (0.1–10 keV) from black hole accretion disks, supernova remnants, galaxy clusters, quasars, and neutron star magnetospheres — sources invisible to optical telescopes.",
    status: "Operational",
    orbit: "Highly elliptical HEO ~ 16,000 km perigee × 133,000 km apogee × 28.5° (64.2 hr period, 85% time above radiation belts)",
    mass: "4,790 kg (on orbit)", dimensions: "13.8 m length × 19.5 m solar array span",
    power: "2 kW from dual deployable silicon solar arrays",
    instruments: [
      "ACIS — Advanced CCD Imaging Spectrometer (10 CCD chips, 16 arcmin² FOV, energy resolution ΔE/E~30%)",
      "HRC — High Resolution Camera (micro-channel plate, 30 arcmin FOV, 0.4 arcsec resolution)",
      "LETG — Low Energy Transmission Grating (60–175 Å, resolving power ~1000)",
      "HETG — High Energy Transmission Grating (MEG: 2.5–31 Å; HEG: 1.2–15 Å, R>100)"
    ],
    discoveries: [
      {
        title: "Dark Matter in Bullet Cluster Collision Mapped",
        desc: "Chandra's 2006 observation of the Bullet Cluster (1E 0657-558) provided the most direct observational evidence for dark matter: hot X-ray gas (normal matter) was spatially separated from the gravitational lensing mass center — proving the two clusters passed through each other with dark matter (70% of mass) decoupled from gas.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/1e0657_scale.jpg/600px-1e0657_scale.jpg")
      },
      {
        title: "Measurement of Neutron Star Matter State",
        desc: "Chandra ACIS spectra of Cassiopeia A neutron star measured rapid cooling (4% in 10 years), consistent with neutron superfluidity in the core — providing the first direct observational evidence that neutron star cores contain paired superfluid neutrons, with profound implications for dense matter physics.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Chandra_X-ray_Observatory_art_concept.jpg/600px-Chandra_X-ray_Observatory_art_concept.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Chandra_X-ray_Observatory_art_concept.jpg/800px-Chandra_X-ray_Observatory_art_concept.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Chandra_X-ray_Observatory",
    links: [{ label: "Chandra X-ray Center", url: "https://chandra.harvard.edu/" }, { label: "NASA Chandra", url: "https://www.nasa.gov/mission_pages/chandra/main/index.html" }],
    tags: ["X-Ray Telescope", "NASA", "Black Holes", "Dark Matter", "Astrophysics"]
  };

  if (n.includes("TESS")) return {
    agency: "NASA / MIT (Massachusetts Institute of Technology)", country: "United States",
    launchDate: "2018-04-18",
    launchSite: "Cape Canaveral SLC-40",
    launchVehicle: "Falcon 9 Full Thrust",
    purpose: "Transiting Exoplanet Survey Satellite (TESS) — NASA's all-sky exoplanet transit photometry survey mission. TESS monitors ~200,000 of the brightest nearby stars across 26 × 24° sectors for periodic brightness dips caused by transiting exoplanets. Its 2-year prime mission covered ~85% of the sky; extended missions continue discovering thousands of transiting planet candidates for JWST atmospheric follow-up.",
    status: "Operational",
    orbit: "Highly elliptical P/2 Lunar resonant orbit ~ 108,400 km perigee × 373,000 km apogee × 37° (13.7-day period; stable for 20+ years)",
    mass: "362 kg", dimensions: "3.7 m × 1.2 m (solar array deployed)",
    power: "400 W from 2 deployable solar panel arrays",
    instruments: [
      "4 × Wide-Field Cameras (each 24°×24° FOV, 10.5 cm aperture f/1.4 lens assembly)",
      "4 × 16.8 MP Back-Illuminated CCD detectors (100×100 mm CCD per camera)",
      "Combined 24°×96° FOV strip per observing sector (2 cameras per diagonal)",
      "0.26 ppm photometric precision for V=8 stars (2 hr cadence)"
    ],
    discoveries: [
      {
        title: "10,000+ Planet Candidates Including TOI-700d (Habitable Zone Earth)",
        desc: "TESS discovered TOI-700d — a near-Earth-size planet in the habitable zone of its M-dwarf star — and over 300 confirmed exoplanets by 2024, including many rocky Earth-sized worlds ideal for JWST atmospheric characterization. Extended mission targets 'nearby systems' for detailed characterization.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/TESS_spacecraft_model.png/600px-TESS_spacecraft_model.png")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/TESS_spacecraft_model.png/800px-TESS_spacecraft_model.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Transiting_Exoplanet_Survey_Satellite",
    links: [{ label: "MIT TESS Mission", url: "https://tess.mit.edu/" }, { label: "NASA TESS", url: "https://www.nasa.gov/tess-transiting-exoplanet-survey-satellite" }],
    tags: ["Exoplanets", "TESS", "NASA/MIT", "Transit Photometry", "Habitable Zone"]
  };

  if (n.includes("KEPLER") || n.includes("K2")) return {
    agency: "NASA / Ball Aerospace", country: "United States",
    launchDate: "2009-03-07",
    launchSite: "Cape Canaveral SLC-17B",
    launchVehicle: "Delta II 7925-10L",
    purpose: "NASA Kepler Space Telescope — the historic exoplanet discovery machine that revolutionized planetary science. Kepler photometrically monitored a fixed 116 deg² star field in Cygnus-Lyra continuously for 4 years, detecting planetary transit signals from 0.5–2 Earth-radii against stellar noise floors. The extended K2 mission (2014–2018) observed 20 additional fields after reaction wheel failure.",
    status: "Defunct",
    orbit: "Heliocentric Earth-trailing drift orbit (safely away from Earth's gravity interference)",
    mass: "1,052 kg", dimensions: "4.7 m height × 2.7 m diameter", power: "1.1 kW solar array",
    instruments: [
      "Primary Photometer — 95 megapixel focal plane array (42 × 2200×1024 CCD chips)",
      "0.95 m Schmidt telescope aperture (f/1.0, 116 deg² FOV)",
      "50 ppm photometric precision per 6.5-hr integration (optimized for Earth-twin detection)",
      "30-minute cadence for 150,000 stars + 1-minute cadence for 512 'short cadence' targets"
    ],
    discoveries: [
      {
        title: "2,600+ Confirmed Exoplanets — Including Kepler-452b (Earth's Cousin)",
        desc: "Kepler confirmed 2,662 exoplanets and discovered that small rocky planets are extraordinarily common (>1 per star on average in the Milky Way), that planets in multi-planet resonant systems are stable, and that super-Earths and mini-Neptunes (1.5–4 Earth-radii) are the most common planetary type — a size absent from our own Solar System.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Kepler_spacecraft_model.png/600px-Kepler_spacecraft_model.png")
      },
      {
        title: "Tabby's Star (KIC 8462852) — Anomalous Dimming",
        desc: "Kepler discovered KIC 8462852 with uniquely dramatic irregular transit dips of up to 22% brightness loss — far exceeding any planet explanation — triggering a scientific controversy about potential dust clouds, cometary swarms, or other unusual circumstellar material that remains under active investigation.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Kepler_spacecraft_model.png/600px-Kepler_spacecraft_model.png")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Kepler_spacecraft_model.png/800px-Kepler_spacecraft_model.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Kepler_space_telescope",
    links: [{ label: "NASA Kepler/K2 Archive", url: "https://kepler.nasa.gov/" }],
    tags: ["Exoplanets", "Kepler", "NASA", "Planet Census", "Photometry"]
  };

  if (n.includes("FERMI") || n.includes("GLAST")) return {
    agency: "NASA / DOE / ESA / JAXA", country: "United States (international)",
    launchDate: "2008-06-11",
    launchSite: "Cape Canaveral SLC-17B",
    launchVehicle: "Delta II 7920H-10C",
    purpose: "NASA Fermi Gamma-ray Space Telescope — the premier high-energy gamma-ray observatory mapping the entire gamma-ray sky from 8 keV to >300 GeV every 3 hours. Fermi conducts an all-sky survey for gamma-ray bursts (GRBs), active galactic nuclei (AGN/blazars), pulsars, dark matter annihilation signals, cosmic ray electrons, and gravitational wave counterparts.",
    status: "Operational", orbit: "LEO ~ 550 km × 25.6° (95 min period)",
    mass: "4,303 kg", dimensions: "2.8 m × 2.8 m × 2.9 m", power: "1.8 kW solar array",
    instruments: [
      "LAT — Large Area Telescope (20 MeV–>300 GeV; 2.4 sr FOV; 12-layer tungsten-silicon pair tracker)",
      "GBM — Gamma-ray Burst Monitor (8 keV–40 MeV; 12 NaI + 2 BGO scintillation detectors; covers full unocculted sky)"
    ],
    discoveries: [
      {
        title: "Gravitational Wave Gamma-Ray Burst Counterpart GW170817",
        desc: "Fermi GBM detected a short gamma-ray burst (GRB 170817A) just 1.74 seconds after LIGO/Virgo detected the neutron star merger gravitational wave GW170817 — the first multi-messenger astrophysics detection proving short GRBs originate from binary neutron star mergers and are the primary sites of r-process heavy element nucleosynthesis (gold, platinum, uranium).",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Fermi_Gamma-ray_Space_Telescope.jpg/600px-Fermi_Gamma-ray_Space_Telescope.jpg")
      },
      {
        title: "Fermi Bubbles — Giant Galactic Gamma-Ray Structure",
        desc: "Fermi LAT detected two enormous 'Fermi Bubbles' extending 25,000 light-years above and below the Milky Way galactic center — gigantic gamma-ray emitting structures likely formed by past AGN jet activity or starformation-driven superwind from the galactic center within the last 10 million years.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Fermi_Gamma-ray_Space_Telescope.jpg/600px-Fermi_Gamma-ray_Space_Telescope.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Fermi_Gamma-ray_Space_Telescope.jpg/800px-Fermi_Gamma-ray_Space_Telescope.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Fermi_Gamma-ray_Space_Telescope",
    links: [{ label: "NASA Fermi", url: "https://fermi.gsfc.nasa.gov/" }],
    tags: ["Gamma-Ray", "NASA", "GRB", "Dark Matter", "Fermi Bubbles"]
  };

  if (n.includes("SWIFT") || n.includes("NEIL GEHRELS")) return {
    agency: "NASA / ASI / PPARC", country: "United States / Italy / UK",
    launchDate: "2004-11-20",
    launchSite: "Cape Canaveral SLC-17A",
    launchVehicle: "Delta II 7320-10C",
    purpose: "NASA Neil Gehrels Swift Observatory — rapid-response multi-wavelength space observatory designed to detect gamma-ray bursts (GRBs) and autonomously slew within 20–75 seconds to study afterglows in X-ray, UV, and optical simultaneously. Swift is the definitive GRB mission, detecting ~100 GRBs/year including the most distant astrophysical explosions at z>9.4.",
    status: "Operational", orbit: "LEO ~ 585 km × 20.6° (96.9 min period)",
    mass: "1,470 kg", dimensions: "5.54 m × 2.36 m × 3.57 m", power: "1.1 kW solar array",
    instruments: [
      "BAT — Burst Alert Telescope (15–350 keV coded aperture mask; 1.4 sr FoV; 4 arcmin GRB localization)",
      "XRT — X-Ray Telescope (0.2–10 keV; 0.4 arcsec centroid precision for afterglow position)",
      "UVOT — UV/Optical Telescope (170–600 nm; 17 arcmin FOV; 7 optical + 6 UV filters)"
    ],
    discoveries: [
      {
        title: "GRB 090423 — Most Distant Explosion at Redshift z=8.2",
        desc: "Swift BAT detected GRB 090423 at z=8.2 (630 million years after Big Bang) — then the most distant known object in the Universe. Short-lived GRBs became standard candles to probe the epoch of reionization, tracing early star formation and metallicity in the first billion years of cosmic history.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Swift_Observatory.jpg/600px-Swift_Observatory.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Swift_Observatory.jpg/800px-Swift_Observatory.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Neil_Gehrels_Swift_Observatory",
    links: [{ label: "Swift @ Penn State", url: "https://www.swift.psu.edu/" }],
    tags: ["GRB", "NASA", "X-Ray", "UV", "Multi-Wavelength"]
  };

  if (n.includes("EUCLID")) return {
    agency: "ESA (European Space Agency)", country: "Europe (20 member states)",
    launchDate: "2023-07-01",
    launchSite: "Cape Canaveral SLC-40",
    launchVehicle: "Falcon 9 Block 5",
    purpose: "ESA Euclid dark universe mission — a 1.2 m aperture wide-field survey telescope mapping the 3D distribution of 1.5+ billion galaxies over 15,000 deg² of sky (1/3 of the observable Universe) using weak gravitational lensing and baryon acoustic oscillation techniques to measure the effects of dark matter and dark energy on cosmic structure growth over the past 10 billion years.",
    status: "Operational",
    orbit: "Halo orbit around Sun-Earth L2 Lagrange Point (~1.5 million km, 6-month period)",
    mass: "2,160 kg", dimensions: "4.7 m height × 3.5 m diameter", power: "1.7 kW solar array",
    instruments: [
      "VIS — Visible Imager (550–900 nm; 36 CCD array; 0.5 deg² FOV; 0.1 arcsec pixel; 600 M pixel total)",
      "NISP — Near-Infrared Spectrometer and Photometer (900–2000 nm; 16 HgCdTe detectors; 50 M pixels)"
    ],
    discoveries: [
      {
        title: "Euclid Early Release Observations — 5 Iconic Deep Fields",
        desc: "Euclid's first images (November 2023) captured the Perseus galaxy cluster (1,000 galaxies + 100,000 background galaxies in single frame), Horsehead Nebula in NIR, IC 342 Hidden Galaxy, NGC 6822 Local Group dwarf, and Abell 2390 dark matter lens map — revealing unprecedented detail in each, demonstrating its capacity to map cosmic dark matter on the largest scales.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Euclid%27s_view_of_the_Perseus_cluster_of_galaxies.jpg/600px-Euclid%27s_view_of_the_Perseus_cluster_of_galaxies.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Euclid_spacecraft_model_2.png/800px-Euclid_spacecraft_model_2.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Euclid_(spacecraft)",
    links: [{ label: "ESA Euclid Mission", url: "https://www.esa.int/Science_Exploration/Space_Science/Euclid" }],
    tags: ["Dark Energy", "Dark Matter", "ESA", "L2 Orbit", "Cosmology", "Survey"]
  };

  if (n.includes("GAIA")) return {
    agency: "ESA (European Space Agency)", country: "Europe",
    launchDate: "2013-12-19",
    launchSite: "Guiana Space Centre, Kourou (ELS)",
    launchVehicle: "Soyuz ST-B / Fregat-MT",
    purpose: "ESA Gaia — the definitive stellar cartography mission measuring ultra-precise positions, proper motions, parallax distances, and radial velocities for over 1.8 billion stars down to V=21 magnitude, creating the most detailed and accurate 6D phase-space map of the Milky Way ever constructed. Gaia astrometry achieves 7 microarcsecond precision — equivalent to measuring a human hair at 1,000 km distance.",
    status: "Operational",
    orbit: "Lissajous orbit around Sun-Earth L2 (~1.5 million km)",
    mass: "2,030 kg", dimensions: "4.2 m × 3.4 m (deployed service module)",
    power: "1.9 kW from deployable solar array shield",
    instruments: [
      "Astrometric Instrument — Twin rectangular 1.45 m × 0.5 m SiC telescopes, combined 106° FOV",
      "BP/RP Photometers — Blue (330–680 nm) + Red (640–1050 nm) prism spectrophotometers",
      "RVS — Radial Velocity Spectrometer (845–872 nm Ca triplet; line-of-sight velocity to 15 km/s at G=16)",
      "1-Gigapixel focal plane assembly (106 CCDs operating in TDI time-delay integration mode)"
    ],
    discoveries: [
      {
        title: "Gaia-Sausage-Enceladus: Milky Way's Last Major Merger",
        desc: "Gaia DR2 revealed that 8–10 billion years ago the Milky Way merged with a dwarf galaxy (Gaia-Sausage-Enceladus) containing ~600 million solar masses — visible as a 'sausage-shaped' velocity distribution of accreted halo stars. This defines our galaxy's last major galactic collision and shaped the outer halo structure.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Gaia_spacecraft_artist_impression.png/600px-Gaia_spacecraft_artist_impression.png")
      },
      {
        title: "200,000 Asteroid Orbits, Exoplanet Wobble, & Quasar Reference Frame",
        desc: "Gaia DR3 provided proper motions and astrometric solutions for 200,000 Solar System objects, mass measurements for 50+ black holes via astrometric wobble of host stars, 72 new binary star system companion masses, and defined the International Celestial Reference Frame (ICRF3) anchored to 1.6 million quasars.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Gaia_spacecraft_artist_impression.png/600px-Gaia_spacecraft_artist_impression.png")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Gaia_spacecraft_artist_impression.png/800px-Gaia_spacecraft_artist_impression.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Gaia_(spacecraft)",
    links: [{ label: "ESA Gaia Mission", url: "https://www.esa.int/Science_Exploration/Space_Science/Gaia" }, { label: "Gaia Archive", url: "https://gea.esac.esa.int/archive/" }],
    tags: ["Astrometry", "Milky Way", "ESA", "Stellar Map", "1 Billion Stars"]
  };

  if (n.includes("SOLAR ORBITER") || n.includes("SOLO")) return {
    agency: "ESA / NASA", country: "Europe / United States",
    launchDate: "2020-02-10",
    launchSite: "Cape Canaveral SLC-41",
    launchVehicle: "Atlas V 411",
    purpose: "ESA/NASA Solar Orbiter — the first spacecraft to image the Sun's poles directly and study the heliosphere in situ from within 0.28 AU (42 million km) of the solar surface — closer than Mercury's orbit. Solar Orbiter combines remote sensing telescopes with in-situ particle and field sensors to connect solar surface activity to heliospheric plasma directly, revealing the origin of the solar wind.",
    status: "Operational",
    orbit: "Heliocentric elliptical orbit (0.28–1.0 AU; 168-day period; up to 33° solar latitude coverage)",
    mass: "1,800 kg", power: "180 W solar power at 0.28 AU (tilted solar panels with heat shield apertures)",
    instruments: [
      "EUI — Extreme Ultraviolet Imager (first solar polar EUV images, 17.4 nm, 30.4 nm, 121.6 nm)",
      "PHI — Polarimetric and Helioseismic Imager (photospheric magnetic field maps)",
      "METIS — Coronagraph (visible + UV corona imaging up to 3.5 R☉)",
      "SoloHI — Wide-field Heliospheric Imager (solar wind transients)",
      "SWA — Solar Wind Analyser (ion/electron distribution functions in situ)",
      "MAG — Magnetometer (in-situ heliospheric magnetic field)"
    ],
    discoveries: [
      {
        title: "'Campfires' — Nano-Flares on the Solar Surface",
        desc: "Solar Orbiter EUI detected millions of tiny 'campfire' bright flares (100–1,000× smaller than previously known solar flares) on the Sun's surface — strong candidates for the nano-flare coronal heating mechanism first proposed by Eugene Parker in 1988 to explain why the solar corona is 1 million K while the surface is only 5,778 K.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Solar_Orbiter_spacecraft_model.png/600px-Solar_Orbiter_spacecraft_model.png")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Solar_Orbiter_spacecraft_model.png/800px-Solar_Orbiter_spacecraft_model.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Solar_Orbiter",
    links: [{ label: "ESA Solar Orbiter", url: "https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter" }],
    tags: ["Solar Observatory", "ESA/NASA", "Solar Wind", "Heliosphere", "Corona"]
  };

  if (n.includes("XMM") || n.includes("XMM-NEWTON")) return {
    agency: "ESA (European Space Agency)", country: "Europe",
    launchDate: "1999-12-10",
    launchSite: "Guiana Space Centre, Kourou (ELA-3)",
    launchVehicle: "Ariane 5 G (VA116)",
    purpose: "ESA XMM-Newton X-ray Multi-Mirror Mission — the most powerful X-ray observatory in terms of photon collecting area ever launched. Three parallel X-ray mirror modules each containing 58 nested gold-coated parabolic/hyperbolic mirror shells collect X-rays (0.1–15 keV) simultaneously with a co-aligned Optical Monitor, enabling X-ray spectral energy distribution mapping of galaxy clusters, AGN, neutron stars, and transients.",
    status: "Operational",
    orbit: "Highly elliptical HEO ~ 7,000 km × 114,000 km × 40° (48 hr period, 40 hr above radiation belts)",
    mass: "3,800 kg", dimensions: "10 m length × 16 m solar wing span",
    power: "1.8 kW solar arrays",
    instruments: [
      "EPIC-pn — 12 back-illuminated pn-CCDs (0.15–15 keV; 30 arcmin FOV; 6 arcsec PSF)",
      "EPIC-MOS × 2 — Front-illuminated CCD arrays (0.15–12 keV; 30 arcmin FOV)",
      "RGS × 2 — Reflection Grating Spectrometer (0.33–2.5 keV; resolving power 100–500)",
      "OM — Optical Monitor (170–650 nm; 17 arcmin FOV; simultaneous UV/optical imaging)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/XMM-Newton_in_the_clean_room_at_Estec.jpg/800px-XMM-Newton_in_the_clean_room_at_Estec.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/XMM-Newton",
    links: [{ label: "ESA XMM-Newton", url: "https://www.esa.int/Science_Exploration/Space_Science/XMM-Newton" }],
    tags: ["X-Ray Telescope", "ESA", "Galaxy Clusters", "AGN", "Spectroscopy"]
  };

  if (n.includes("HST") || n.includes("HUBBLE")) return {
    agency: "NASA / ESA", country: "United States / Europe",
    launchDate: "1990-04-24",
    launchSite: "Kennedy Space Center LC-39B",
    launchVehicle: "Space Shuttle Discovery (STS-31)",
    purpose: "Hubble Space Telescope — the most transformative space telescope in history, operating above Earth's distorting atmosphere for 34+ years with ultraviolet, optical, and near-infrared coverage (115–2500 nm). Hubble has produced 1.5+ million observations across 3,900+ papers and enabled fundamental discoveries in cosmology, stellar astrophysics, planetary science, and galaxy evolution.",
    status: "Operational", orbit: "LEO ~ 538 km × 28.47°",
    mass: "11,110 kg", dimensions: "13.2 m × 4.2 m diameter",
    power: "2.8 kW GaAs solar arrays",
    instruments: [
      "WFC3 — Wide Field Camera 3 (UVIS: 200–1000 nm; IR: 900–1700 nm; 162×162 arcsec FOV)",
      "COS — Cosmic Origins Spectrograph (FUV: 1150–1775 Å; NUV: 1700–3200 Å; R>20,000)",
      "ACS — Advanced Camera for Surveys (WFC: 200–1100 nm; 202×202 arcsec FOV)",
      "STIS — Space Telescope Imaging Spectrograph (1150–10300 Å; spectral imaging and echelle modes)",
      "FGS — Fine Guidance Sensors (0.3 mas astrometric precision; 3 sensors)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Hubble_2009_close-up_2.jpg/800px-Hubble_2009_close-up_2.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Hubble_Space_Telescope",
    links: [{ label: "HubbleSite", url: "https://hubblesite.org/" }],
    tags: ["Hubble", "NASA/ESA", "Optical Telescope", "Deep Space", "Dark Energy"]
  };

  // ══ 7. EARTH OBSERVATION — NASA/ESA ══════════════════════════════════════════
  if (n.includes("LANDSAT")) return {
    agency: "NASA / USGS", country: "United States",
    launchDate: "1972–present (Landsat 1–9; Landsat 9 launched 2021-09-27)",
    launchSite: "Vandenberg SFB SLC-3W / SLC-2W (Delta II) / Atlas V 401 (Landsat 9)",
    launchVehicle: "Delta II 7920-10L (Landsat 7/8) / Atlas V 401 (Landsat 9)",
    purpose: `${cleanName} is a NASA/USGS Landsat Earth observation satellite — the world's longest-running program of moderate-resolution land imaging (since 1972, 50+ years of continuous archive). Landsat 8/9 provide 15–30 m multispectral and thermal data for monitoring deforestation, glacial retreat, urban expansion, crop health (NDVI), wildfire burn severity, water resource mapping, and global land cover change at local to continental scales.`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 705 km × 98.2° (98.9 min period; 16-day repeat cycle; 185 km swath)",
    mass: "2,623 kg (Landsat 9)", dimensions: "3.0 m × 2.4 m × 2.8 m (bus)",
    power: "2.1 kW from solar arrays",
    instruments: [
      "OLI-2 — Operational Land Imager 2 (Landsat 9; 30 m MS in 9 VNIR/SWIR bands; 15 m PAN)",
      "TIRS-2 — Thermal Infrared Sensor 2 (100 m resolution; Band 10: 10.6 µm; Band 11: 12.0 µm)",
      "ETM+ — Enhanced Thematic Mapper Plus (Landsat 7; 28.5 m MS; 57 m thermal)",
      "15 m Panchromatic Band (0.5–0.68 µm; 15 m GSD for pan-sharpening)"
    ],
    discoveries: [
      {
        title: "50-Year Global Deforestation & Land Change Archive",
        desc: "Landsat is the primary dataset for the IPCC, FAO, and UN for quantifying global tropical deforestation rates, urban sprawl expansion, glacier mass loss (measurable 30m retreat), and dryland degradation. The Brazilian Amazon's 15% loss since 1970 and aral Sea desiccation were first quantified from Landsat.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Landsat_8_spacecraft.png/600px-Landsat_8_spacecraft.png")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Landsat_8_spacecraft.png/800px-Landsat_8_spacecraft.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Landsat_program",
    links: [{ label: "USGS Landsat", url: "https://www.usgs.gov/landsat-missions/" }, { label: "Landsat Data Portal", url: "https://earthexplorer.usgs.gov/" }],
    tags: ["Landsat", "Earth Observation", "USGS/NASA", "50-Year Archive", "Deforestation"]
  };

  if (n.includes("SENTINEL")) return {
    agency: "ESA / Copernicus Programme", country: "Europe (ESA Member States)",
    launchDate: "2014–present (Sentinel-1A, 1B, 2A, 2B, 3A, 3B, 5P, 6, upcoming 4, 6B)",
    launchSite: "Guiana Space Centre / Baikonur / Vandenberg (various by satellite)",
    launchVehicle: "Soyuz ST-B / Vega / Vega-C / Falcon 9 (various by variant)",
    purpose: `${cleanName} is an ESA Copernicus Earth observation sentinel in the world's largest civil Earth observation programme, providing free open-access environmental data for global land, ocean, and atmosphere monitoring. Sentinel variants: S-1 (C-SAR radar for floods, deforestation, sea ice); S-2 (13-band MSI optical for crops, vegetation); S-3 (ocean colour, altimetry); S-5P (global atmospheric gas columns via TROPOMI); S-6 (ocean topography altimetry).`,
    status: "Operational", orbit: "Sun-synchronous LEO ~ 693–786 km × 98.5° (S-1/2/3); LEOSTAR (S-5P at 824 km)",
    mass: "2,300 kg (Sentinel-2B); 820 kg (Sentinel-5P)", dimensions: "Variable (Sentinel-2: 1.3 m cube + 3.4 m solar wing)",
    instruments: [
      "C-SAR — C-band Synthetic Aperture Radar (Sentinel-1; IW mode: 5×20 m, 250 km; EW: 25×100 m, 400 km; SM: 5×5 m)",
      "MSI — Multi-Spectral Imager (Sentinel-2; 10/20/60 m; 13 bands 443–2190 nm; 290 km swath; 10 m RGB/NIR)",
      "OLCI — Ocean & Land Colour Instrument (Sentinel-3; 21 bands 400–1020 nm; 300 m resolution; 1270 km swath)",
      "SRAL — SAR Radar Altimeter (Sentinel-3; ocean SSH, sea ice, inland water)",
      "TROPOMI — TROPOspheric Monitoring Instrument (Sentinel-5P; 270×3.5 km; 450–2385 nm; NO₂, SO₂, O₃, CH₄, CO)"
    ],
    discoveries: [
      {
        title: "Global Methane Plume Detection (Sentinel-5P TROPOMI)",
        desc: "TROPOMI on Sentinel-5P mapped thousands of previously undetected methane super-emitter plumes from oil/gas infrastructure, coal mines, and landfills worldwide, providing key climate policy data — including the 2019 detection that Turkmenistan's gas infrastructure emitted 3× more methane than all US offshore platforms combined.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Sentinel-2A.png/600px-Sentinel-2A.png")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Sentinel-2A.png/800px-Sentinel-2A.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Copernicus_Programme",
    links: [{ label: "ESA Copernicus", url: "https://www.copernicus.eu/en" }, { label: "Sentinel Hub", url: "https://apps.sentinel-hub.com/" }],
    tags: ["Copernicus", "ESA", "Sentinel", "Free Data", "Climate Monitoring"]
  };

  if (n.includes("TERRA") || n.includes("MODIS")) return {
    agency: "NASA", country: "United States",
    launchDate: "1999-12-18 (Terra EOS-AM1)",
    launchSite: "Vandenberg SFB SLC-2W",
    launchVehicle: "Atlas IIAS",
    purpose: "NASA Terra (EOS-AM1) — the flagship of NASA's Earth Observing System (EOS) providing comprehensive daily global monitoring of land surface, oceans, and atmosphere. Terra carries 5 instruments measuring cloud/radiation properties, vegetation health (NDVI), atmospheric aerosols, ocean temperature, and land surface temperature across 36 MODIS spectral bands at 250 m–1 km resolution with daily global coverage.",
    status: "Operational", orbit: "Sun-synchronous LEO ~ 705 km × 98.2° (descending node at 10:30 AM local time)",
    mass: "5,190 kg", dimensions: "6.8 m × 3.5 m", power: "5.5 kW solar array",
    instruments: [
      "MODIS — Moderate Resolution Imaging Spectroradiometer (36 bands, 250 m–1 km; 2,330 km swath; daily global)",
      "ASTER — Advanced Spaceborne Thermal Emission and Reflection Radiometer (15 m VNIR; 90 m TIR; 14 bands)",
      "MISR — Multi-Angle Imaging Spectroradiometer (9 cameras at ±70.5°; aerosol optical depth)",
      "MOPITT — Measurements of Pollution in the Troposphere (CO & CH₄ vertical profiles)",
      "CERES — Clouds and Earth Radiant Energy System (Earth radiation budget, TOA fluxes)"
    ],
    discoveries: [
      {
        title: "MODIS Global Fire Radiative Power & Smoke Transport",
        desc: "MODIS on Terra revolutionized global fire monitoring: its daily fire radiative power (FRP) measurements enabled the first global near-real-time wildfire detection system (NASA FIRMS), showing that biomass burning contributes 30–40% of global CO₂ emissions annually and enabling smoke aerosol transport tracking across continents.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Terra_satellite.jpg/600px-Terra_satellite.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Terra_satellite.jpg/800px-Terra_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Terra_(satellite)",
    links: [{ label: "NASA Terra/MODIS", url: "https://terra.nasa.gov/" }],
    tags: ["Terra", "MODIS", "NASA EOS", "Land Surface", "Daily Global"]
  };

  if (n.includes("AQUA")) return {
    agency: "NASA", country: "United States",
    launchDate: "2002-05-04",
    launchSite: "Vandenberg SFB SLC-2W",
    launchVehicle: "Delta II 7920-10L",
    purpose: "NASA Aqua (EOS-PM1) — companion to Terra, observing in the afternoon to capture daily global water cycle dynamics: ocean sea surface temperature, atmospheric water vapor profiles, cloud properties, sea ice extent, Arctic/Antarctic ice sheet changes, precipitation, and soil moisture via 6 advanced instruments. Named 'Aqua' for its water-focused measurement suite.",
    status: "Operational", orbit: "Sun-synchronous LEO ~ 705 km × 98.2° (ascending node at 1:30 PM local)",
    mass: "2,934 kg", power: "4.6 kW solar array",
    instruments: [
      "MODIS — Moderate Resolution Imaging Spectroradiometer (36 bands; same as Terra but pm overpass)",
      "AIRS — Atmospheric InfraRed Sounder (2,378-channel hyperspectral IR sounder; ΔT < 1 K profiles)",
      "AMSU-A — Advanced Microwave Sounding Unit (15-channel; tropospheric temperature profiling)",
      "HSB — Humidity Sounder for Brazil (4-channel microwave humidity profiler)",
      "AMSR-E — Advanced Microwave Scanning Radiometer (6–89 GHz; sea ice, precipitation, SST)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Terra_satellite.jpg/800px-Terra_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Aqua_(satellite)",
    links: [{ label: "NASA Aqua", url: "https://aqua.nasa.gov/" }],
    tags: ["Aqua", "NASA EOS", "Water Cycle", "MODIS", "Ocean Temperature"]
  };

  if (n.includes("AURA")) return {
    agency: "NASA", country: "United States",
    launchDate: "2004-07-15",
    launchSite: "Vandenberg SFB SLC-2W",
    launchVehicle: "Delta II 7920-10L",
    purpose: "NASA Aura (EOS-CHEM) — dedicated atmospheric chemistry mission measuring the composition and dynamics of Earth's troposphere and stratosphere. Aura has provided two decades of global measurements of ozone (O₃), nitrogen dioxide (NO₂), sulfur dioxide (SO₂), formaldehyde (HCHO), carbon monoxide (CO), methane (CH₄), and aerosol optical depth for pollution monitoring and climate assessment.",
    status: "Operational", orbit: "Sun-synchronous LEO ~ 705 km × 98.2°",
    mass: "2,967 kg", power: "4.7 kW solar array",
    instruments: [
      "OMI — Ozone Monitoring Instrument (270–500 nm; 13 km × 24 km nadir; NO₂, O₃, SO₂, aerosol)",
      "MLS — Microwave Limb Sounder (118–2500 GHz; stratospheric/mesospheric profiles)",
      "TES — Tropospheric Emission Spectrometer (3.2–15.4 µm; 5.3 km × 8.5 km; tropospheric O₃, CO)",
      "HIRDLS — High Resolution Dynamics Limb Sounder (21-channel IR; stratospheric profiles)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Terra_satellite.jpg/800px-Terra_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Aura_(satellite)",
    tags: ["Aura", "NASA EOS", "Atmospheric Chemistry", "Ozone", "Air Quality"]
  };

  if (n.includes("ICESat") || n.includes("ICESAT")) return {
    agency: "NASA", country: "United States",
    launchDate: "2018-09-15 (ICESat-2)",
    launchSite: "Vandenberg SFB SLC-2W",
    launchVehicle: "Delta II 7420-10C",
    purpose: "NASA Ice, Cloud, and land Elevation Satellite-2 (ICESat-2) precisely measures ice sheet elevation changes in Greenland and Antarctica with millimeter-level vertical accuracy using photon-counting lidar, tracking contributions to global sea level rise. Also measures sea ice freeboard, forest canopy height, ocean surface topography, and cloud/aerosol vertical distribution.",
    status: "Operational", orbit: "Near-polar LEO ~ 496 km × 92.0° (91-day exact repeat cycle)",
    mass: "1,514 kg",
    instruments: [
      "ATLAS — Advanced Topographic Laser Altimeter System (532 nm green photon-counting lidar; 6 beams; 0.7 m vertical accuracy; 70 cm × 17 m ground footprint)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/ICESat-2_illustration.jpg/800px-ICESat-2_illustration.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/ICESat-2",
    links: [{ label: "NASA ICESat-2", url: "https://icesat-2.gsfc.nasa.gov/" }],
    tags: ["ICESat", "NASA", "Ice Sheet", "Lidar", "Sea Level Rise"]
  };

  if (n.includes("GRACE") || n.includes("GRACE-FO")) return {
    agency: "NASA / GFZ Potsdam", country: "United States / Germany",
    launchDate: "2018-05-22 (GRACE-FO pair)",
    launchSite: "Vandenberg SFB SLC-3E",
    launchVehicle: "Falcon 9 rideshare",
    purpose: "GRACE-FO (Gravity Recovery and Climate Experiment Follow-On) — twin satellite pair orbiting 220 km apart measuring Earth's gravity field changes by microwave ranging at 1-micron precision between the two spacecraft. Maps monthly mass redistribution in ice sheets (Greenland, Antarctica), groundwater aquifer depletion, ocean bottom pressure, and mantle post-glacial rebound.",
    status: "Operational", orbit: "Near-circular LEO ~ 490 km × 89° (twin pair formation, 220 km separation)",
    mass: "592 kg each", power: "400 W solar panels",
    instruments: [
      "KBR — K/Ka-Band Ranging system (inter-satellite microwave ranging; 1 µm/s velocity precision)",
      "LRI — Laser Ranging Interferometer (first laser inter-satellite ranging in Earth orbit; 80 nm precision)",
      "ACC — SuperSTAR Accelerometer (non-gravitational force measurement; 10⁻¹⁰ m/s² sensitivity)",
      "GPS Receiver (precision orbit determination)"
    ],
    discoveries: [
      {
        title: "Greenland & Antarctic Ice Sheet Mass Loss Quantified",
        desc: "GRACE/GRACE-FO measured that Greenland has lost ~280 Gt of ice per year since 2002, and Antarctica ~150 Gt/year — the primary drivers of observed 3.7 mm/year global mean sea level rise. Monthly gravity maps revealed that the Ogallala aquifer in the US Great Plains lost 200 km³ of groundwater in 10 years.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/GRACE-FO_Satellite.jpg/600px-GRACE-FO_Satellite.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/GRACE-FO_Satellite.jpg/800px-GRACE-FO_Satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/GRACE_and_GRACE-FO",
    tags: ["GRACE", "Gravity", "Ice Sheet", "Groundwater", "NASA/GFZ"]
  };

  // ══ 8. WEATHER & ENVIRONMENTAL SATELLITES ════════════════════════════════════
  if (n.includes("METEOSAT") || n.includes("MSG") || n.includes("MTG")) return {
    agency: "EUMETSAT / ESA", country: "Europe",
    launchDate: "2002–present (MSG-1 through MSG-4); MTG-I1 launched 2022-12-13",
    launchSite: "Guiana Space Centre, Kourou (Ariane 5 / Ariane 6)",
    launchVehicle: "Ariane 5 ECA / Ariane 6",
    purpose: `${cleanName} is a EUMETSAT Meteosat Second Generation (MSG) or Meteosat Third Generation (MTG) geostationary meteorological satellite providing 15-minute full-disk Earth imagery for European weather forecasting. MTG's FCI imager provides 16 spectral bands at 1 km visible resolution with 10-minute full disk updates. MTG-S carries the IRS spectrometer for volcanic gas detection and real-time lightning mapping (LI instrument).`,
    status: "Operational", orbit: "GEO ~ 35,786 km (0°E for MSG; various slots 9.5°E–41.5°E)",
    mass: "2,040 kg (MSG); 3,813 kg (MTG-I)", dimensions: "3.2 m diameter cylindrical (MSG, spinning); 4.0 m × 3.4 m (MTG, 3-axis)",
    power: "1 kW (MSG) / 3 kW (MTG) from solar cells",
    instruments: [
      "SEVIRI — Spinning Enhanced Visible and Infrared Imager (MSG; 12 spectral channels; 3 km VIS, 1 km HRV)",
      "GERB — Geostationary Earth Radiation Budget (MSG; top-of-atmosphere shortwave + longwave fluxes)",
      "FCI — Flexible Combined Imager (MTG-I; 16 bands; 1 km VIS, 2 km IR; 10-min full disk)",
      "LI — Lightning Imager (MTG-I; all-sky optical lightning detection; 4.5 km resolution)",
      "IRS — Infrared Sounder (MTG-S; 1600+ spectral channels; 3D atmospheric temperature/humidity)"
    ],
    discoveries: [
      {
        title: "MTG Lightning Imager — Real-Time European Lightning Atlas",
        desc: "MTG-I1's Lightning Imager captured its first full-disk lightning flash data in 2023, enabling operational real-time lightning flash mapping for the first time from geostationary orbit over Europe and Africa — essential for convective storm nowcasting and aviation safety alerts.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/MSG-3.jpg/600px-MSG-3.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/MSG-3.jpg/800px-MSG-3.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Meteosat",
    links: [{ label: "EUMETSAT Portal", url: "https://www.eumetsat.int/" }],
    tags: ["Meteosat", "EUMETSAT", "Weather", "Geostationary", "Lightning"]
  };

  if (n.includes("FENGYUN") || n.includes("FY-")) return {
    agency: "CMA (China Meteorological Administration) / NSMC", country: "China",
    launchDate: "1988–present (FY-1 polar series; FY-4B launched 2021; FY-3G 2023)",
    launchSite: "Taiyuan / Xichang Satellite Launch Centre",
    launchVehicle: "Long March 4C (FY-3 polar) / Long March 3B (FY-4 GEO)",
    purpose: `${cleanName} is a Chinese Fengyun (风云 — 'Wind and Cloud') meteorological satellite. FY-3 series (polar) provides 6-hourly global atmospheric temperature/humidity soundings, ozone profiles, sea ice extent, and precipitation. FY-4 series (geostationary) provides 1 km visible imagery every 1 minute in rapid scan mode (China East Asia sector) supporting typhoon track forecasting, convective storm detection, and air quality monitoring across Asia.`,
    status: "Operational",
    orbit: "Sun-synchronous LEO ~ 836 km × 98.76° (FY-3) / GEO ~ 35,786 km × 0° (FY-4 at 105°E)",
    mass: "2,450 kg (FY-3E) / 5,400 kg (FY-4B)",
    instruments: [
      "MERSI-II — Medium Resolution Spectral Imager II (FY-3; 250 m VIS; 1 km IR; 25 spectral bands)",
      "MWTS-3 — Microwave Temperature Sounder (FY-3E; 13 channels; 33 km nadir resolution)",
      "GIIRS — Geostationary Interferometric Infrared Sounder (FY-4B; 1600 IR channels; 16 km)",
      "AGRI — Advanced Geosynchronous Radiation Imager (FY-4; 14 bands; 0.5 km VIS; 4 km IR)",
      "LMI — Lightning Mapping Imager (FY-4B; all-sky optical lightning detection)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Fengyun-3A.jpg/800px-Fengyun-3A.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Fengyun",
    tags: ["Fengyun", "CMA", "China", "Weather", "Typhoon Forecasting"]
  };

  if (n.includes("GOES")) return {
    agency: "NOAA / NASA", country: "United States",
    launchDate: "2016–present (GOES-R series: GOES-16, 17, 18; GOES-U launched 2024-06-25)",
    launchSite: "Cape Canaveral SLC-41",
    launchVehicle: "Atlas V 541",
    purpose: `${cleanName} is a NOAA Geostationary Operational Environmental Satellite (GOES-R/S/T/U series) — the most advanced weather satellite in the Western Hemisphere. GOES provides 30-second rapid-scan storm imagery (2 min full disk in CONUS mode), total lightning mapping, solar X-ray monitoring for space weather, sea surface temperature, and real-time cloud-top temperature for hurricane intensity estimation.`,
    status: "Operational", orbit: "GEO ~ 35,786 km (GOES-16 at 75.2°W / GOES-18 at 137.0°W)",
    mass: "5,192 kg (GOES-R bus)", dimensions: "6.1 m × 5.6 m (solar array deployed)",
    power: "4.7 kW solar arrays",
    instruments: [
      "ABI — Advanced Baseline Imager (16 spectral channels; 0.5 km VIS; 2 km IR; 5-min full disk; 30 sec CONUS)",
      "GLM — Geostationary Lightning Mapper (777.4 nm; all-sky lightning flash detection 24/7 hemispheric)",
      "SUVI — Solar UV Imager (6 EUV/X-ray channels; solar corona/flare monitoring)",
      "EXIS — Extreme UV and X-ray Irradiance Sensors (X-ray flare intensity for space weather alerts)",
      "SEISS — Space Environment In Situ Suite (electron/proton/ion flux; magnetometer)"
    ],
    discoveries: [
      {
        title: "GLM Lightning Mapping Reveals Storm Intensity Escalation",
        desc: "GOES-16 GLM revealed that rapid increases in lightning flash rate (Lightning Jumps of >10 flashes/min/5min) precede tornadogenesis by 10–15 minutes — providing operational meteorologists a new real-time nowcasting tool for tornado warning lead times, potentially saving lives.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/GOES-R_spacecraft_model.png/600px-GOES-R_spacecraft_model.png")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/GOES-R_spacecraft_model.png/800px-GOES-R_spacecraft_model.png"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/GOES",
    links: [{ label: "NOAA GOES Portal", url: "https://www.goes.noaa.gov/" }],
    tags: ["GOES", "NOAA", "Weather", "Geostationary", "Lightning", "Tornadoes"]
  };

  // ══ 9. GNSS NAVIGATION ════════════════════════════════════════════════════════
  if (n.includes("GPS") || n.includes("NAVSTAR") || n.includes("BIIR") || n.includes("BIIF") || n.includes("BIII") || (n.includes("PRN") && category === "gnss")) return {
    agency: "USSF (US Space Force) / GPS Directorate", country: "United States",
    launchDate: "1978–present (Block I 1978; Block IIF 2010–2016; Block III 2018–present)",
    launchSite: "Cape Canaveral SLC-41 (Atlas V) / Cape Canaveral SLC-37B (Delta IV) / Kennedy LC-39A (Falcon 9)",
    launchVehicle: "Delta II / Delta IV Medium / Atlas V 401 / Falcon 9 Block 5",
    purpose: `${cleanName} is a US GPS Block IIF or Block III navigation satellite providing global Positioning, Navigation, and Timing (PNT) services to military and civilian users worldwide. GPS Block III introduces a new L1C civil signal (interoperable with Galileo and BeiDou), Military M-code for anti-jam/anti-spoof capability, and 3× better accuracy than Block IIF through enhanced signal power and improved clock stability.`,
    status: "Operational",
    orbit: "MEO ~ 20,200 km altitude × 55.0° inclination (11 hr 58 min period; 6 orbital planes × 4–5 satellites each)",
    mass: "3,880 kg (Block III-A) / 1,630 kg (Block IIF)",
    dimensions: "17.8 m wingspan (solar array deployed, Block III)",
    power: "3.7 kW (Block III) from GaAs solar array",
    instruments: [
      "Rubidium Atomic Frequency Standard (RAFS) — 3–4 per satellite; 10⁻¹³ stability/day",
      "Cesium Atomic Frequency Standard (CAFS) — backup precision clock",
      "L1 Signal Transmitter (1575.42 MHz — C/A civil, M-code military, L1C new civilian signal)",
      "L2 Signal Transmitter (1227.60 MHz — P(Y) military, L2C civil)",
      "L5 Signal Transmitter (1176.45 MHz — safety-of-life aviation, <30 cm precision)",
      "NUDET — Nuclear Detonation Detection System (treaty monitoring)"
    ],
    discoveries: [
      {
        title: "GPS-Enabled Precision Agriculture Saves $20 Billion/Year",
        desc: "GPS sub-meter guidance systems enabled autonomous farm equipment, precision fertilizer/pesticide application, and yield mapping — reducing chemical use by 15–25% globally. GPS-enabled precision agriculture is credited with $20+ billion/year in efficiency gains in the US alone.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/GPS24goldenSMALL.gif/600px-GPS24goldenSMALL.gif")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/GPS24goldenSMALL.gif/600px-GPS24goldenSMALL.gif"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/GPS_satellite_blocks",
    links: [{ label: "GPS.gov Official", url: "https://www.gps.gov/" }, { label: "USSF GPS Directorate", url: "https://www.afspc.af.mil/gps" }],
    tags: ["GPS", "GNSS", "Navigation", "MEO", "USSF", "Atomic Clock"]
  };

  if (n.includes("GALILEO") || (n.includes("GSAT") && country === "Europe")) return {
    agency: "ESA / European Union Agency for the Space Programme (EUSPA)", country: "European Union",
    launchDate: "2011–present (IOV 2011–2012; FOC batch 2014–present; 30 satellites operational)",
    launchSite: "Guiana Space Centre, Kourou / Baikonur Cosmodrome (early launches)",
    launchVehicle: "Ariane 5 ES (2-satellite pair) / Soyuz ST-B (early) / Ariane 6 (from 2024)",
    purpose: `${cleanName} is a European Union Galileo GNSS satellite — the EU's own global navigation constellation providing civilian-controlled navigation independent of US GPS or Russian GLONASS. Galileo offers open service (1 m accuracy), Commercial Service (encrypted high-accuracy), Safety-of-Life (dual-frequency aviation approach), Public Regulated Service (PRS, encrypted for government use), and SAR distress relay. Galileo Open Service delivers sub-20 cm combined GPS+Galileo precision.`,
    status: "Operational",
    orbit: "MEO ~ 23,222 km altitude × 56.0° inclination (14 hr 5 min period; 3 orbital planes × 10 satellites each)",
    mass: "733 kg per satellite (FOC spacecraft)", dimensions: "2.7 m × 1.1 m × 1.2 m (body) + 14.5 m solar array span",
    power: "1.9 kW from GaAs triple-junction solar array",
    instruments: [
      "PHM — Passive Hydrogen Maser (most stable space clock; 10⁻¹⁵ stability per day; 1 ns timing)",
      "RAFS — Rubidium Atomic Frequency Standard (backup clock; 10⁻¹² stability)",
      "L-band Navigation Payload (E1: 1575.42 MHz; E5a/b: 1176.45/1207.14 MHz; E6: 1278.75 MHz)",
      "SAR — Search And Rescue Transponder (406 MHz uplink; L-band return link to alert originator)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Galileo_satellite_artist_impression.jpg/800px-Galileo_satellite_artist_impression.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Galileo_(satellite_navigation)",
    links: [{ label: "GSC Galileo Portal", url: "https://www.gsc-europa.eu/" }, { label: "ESA Galileo", url: "https://www.esa.int/Applications/Navigation/Galileo" }],
    tags: ["Galileo", "GNSS", "EU", "Navigation", "PHM Clock", "SAR Relay"]
  };

  if (n.includes("BEIDOU") || n.includes("BDS") || n.includes("COMPASS")) return {
    agency: "CNSA / BDS Management Office", country: "China",
    launchDate: "2015–present (BDS-3 completion 2020: 30 satellites; global service 2020-07-31)",
    launchSite: "Xichang / Wenchang Satellite Launch Centre",
    launchVehicle: "Long March 3B / 3C (GEO/IGSO) / Long March 3A (MEO)",
    purpose: `${cleanName} is a Chinese BeiDou Navigation Satellite System (BDS-3) navigation satellite providing global PNT services with <10 m open service accuracy and encrypted Authorized Service for Chinese defense applications. BDS-3 uniquely provides: RDSS (Radio Determination Satellite Service — 2-way location + short message text communication), high-accuracy augmentation, and global search-and-rescue (SAR) relay — differentiated from GPS/Galileo.`,
    status: "Operational",
    orbit: "MEO ~ 21,528 km × 55° / IGSO ~ 35,786 km × 55° / GEO ~ 35,786 km × 0° (mixed constellation)",
    mass: "1,014–4,600 kg (MEO to GEO varies)", power: "2.9 kW (MEO) solar panels",
    instruments: [
      "PHM — Passive Hydrogen Maser (10⁻¹⁵ frequency stability; BDS-3 new addition)",
      "RAFS — Rubidium Atomic Frequency Standard (backup; 10⁻¹² stability)",
      "B1I/B1C/B2a/B2b/B3I Navigational Signal Transmitters (5 signal types; interoperable with GPS L1/L5)",
      "RDSS Payload — Radio Determination Service (2-way ranging + 1,000-character text messaging)",
      "GNSS SAR — Search and Rescue Alert Relay Transponder (MEOSAR segment)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/BeiDou-3_satellite.jpg/800px-BeiDou-3_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/BeiDou",
    links: [{ label: "BeiDou System Portal", url: "http://www.beidou.gov.cn/" }],
    tags: ["BeiDou", "GNSS", "China", "Navigation", "Short Message Service"]
  };

  if (n.includes("GLONASS") || (n.includes("KOSMOS") && category === "gnss")) return {
    agency: "Roscosmos / Russian Space Forces", country: "Russia",
    launchDate: "1982–present (Glonass-M from 2003; Glonass-K2 from 2023)",
    launchSite: "Plesetsk Cosmodrome Site 43",
    launchVehicle: "Proton-M / Soyuz-2.1b",
    purpose: `${cleanName} is a Russian GLONASS navigation satellite providing global PNT services with better performance at high northern latitudes (>65°N) than GPS due to higher orbital inclination (64.8°). GLONASS Glonass-M uses FDMA (Frequency Division Multiple Access) with each satellite transmitting on a unique frequency; Glonass-K introduces CDMA L3-band signals interoperable with GPS L2C for dual-constellation receivers.`,
    status: "Operational",
    orbit: "MEO ~ 19,100 km altitude × 64.8° inclination (11 hr 15 min period; 3 orbital planes × 8 satellites each)",
    mass: "1,415 kg (Glonass-M) / 935 kg (Glonass-K1)",
    power: "1.4 kW solar arrays",
    instruments: [
      "Cesium Atomic Frequency Standards (2 × Cs beam tubes per satellite; 10⁻¹³ stability)",
      "L1 FDMA Signal (1602.0 + n×0.5625 MHz; n = satellite frequency slot −7 to +6)",
      "L2 FDMA Signal (1246.0 + n×0.4375 MHz; encrypted P-code + open L2OF)",
      "L3 CDMA Signal (1202.025 MHz; Glonass-K; aligned with GPS L5 interoperability)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Glonass-K1.jpg/800px-Glonass-K1.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/GLONASS",
    links: [{ label: "GLONASS IAC", url: "https://www.glonass-iac.ru/en/" }],
    tags: ["GLONASS", "GNSS", "Russia", "Navigation", "Arctic Coverage"]
  };

  if (n.includes("IRNSS") || n.includes("NAVIC") || n.includes("NVS-")) return {
    agency: "ISRO / Department of Space, Government of India", country: "India",
    launchDate: "2013–present (IRNSS-1A through 1I; NVS-01 launched 2023-05-29)",
    launchSite: "Satish Dhawan Space Centre (SDSC SHAR), Sriharikota",
    launchVehicle: "PSLV-XL (IRNSS-1A through 1I) / GSLV-F12 (NVS-01)",
    purpose: `${cleanName} is an Indian NavIC (Navigation with Indian Constellation) IRNSS regional satellite providing PNT services over India and 1,500 km surrounding region. NavIC covers L5 (1176.45 MHz) and S-band (2492.028 MHz) navigation signals for standard positioning (5 m accuracy) and restricted (encrypted, <1 m) services. NVS-01 added the new L1 band (1575.42 MHz) for interoperability with GPS L1 receivers — the first Indian navigation satellite with tri-band capability.`,
    status: "Operational",
    orbit: "IGSO ~ 35,786 km × 29° (5 IGSO satellites) / GEO ~ 35,786 km × 0° (2 GEO anchor satellites)",
    mass: "2,232 kg (NVS-01 launch mass)",
    power: "3.1 kW twin solar panel array",
    instruments: [
      "L5-band Navigation Payload (1176.45 MHz; 24 dBW signal; SPS & RS services)",
      "S-band Navigation Payload (2492.028 MHz; 40.5 dBW signal; RS encrypted service)",
      "L1-band Navigation Payload (1575.42 MHz; NVS-01 first — civilian GPS-compatible signal)",
      "PHM — Passive Hydrogen Maser (NVS-01 first indigenous Indian PHM; 10⁻¹³ day stability)",
      "C-band Ranging Transponder (precision orbit determination by ISRO ground stations)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/IRNSS-1I_Satellite.jpg/800px-IRNSS-1I_Satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Indian_Regional_Navigation_Satellite_System",
    links: [{ label: "ISRO NavIC", url: "https://www.isro.gov.in/irnss-programme.html" }],
    tags: ["NavIC", "IRNSS", "ISRO", "India", "Regional Navigation", "L-band"]
  };

  // ══ 10. MEGACONSTELLATIONS & COMMERCIAL COMMS ═════════════════════════════════
  if (n.includes("STARLINK") || n.includes("STARLINK-")) return {
    agency: "SpaceX", country: "United States",
    launchDate: "2019–present (6,000+ satellites as of 2024; targeting 42,000 constellation)",
    launchSite: "Cape Canaveral SLC-40 / Kennedy LC-39A / Vandenberg SFB SLC-4E",
    launchVehicle: "Falcon 9 Block 5 (reused booster; 24 Starlink per launch; 60 launches/year)",
    purpose: `${cleanName} is a SpaceX Starlink LEO broadband satellite — part of the world's largest satellite constellation providing high-speed (up to 300 Mbps residential, 1 Gbps enterprise), low-latency (20–40 ms) satellite internet to 2+ million subscribers in 70+ countries as of 2024. V2 Mini Starlinks (800 kg, launched 2023+) carry 4× more bandwidth and direct-to-cell capabilities for mobile coverage.`,
    status: "Operational",
    orbit: "LEO ~ 540–570 km × 53° or 97.6° (polar shell) (orbital shells at 53.2°, 70°, 97.6°)",
    mass: "260 kg (V1.0) / 800 kg (V2 Mini)",
    dimensions: "3.2 m × 1.6 m (V1.0 flat panel) / deployable large solar array (V2 Mini)",
    power: "1 kW (V1.0) / 3 kW (V2 Mini) solar array",
    instruments: [
      "Ku-band Phased Array Antenna (10.7–12.7 GHz downlink; 250 MHz bandwidth)",
      "Ka-band Gateway Phased Array (26.5–40 GHz; 500 MHz bandwidth per beam)",
      "Optical Inter-Satellite Laser Links (ISL; 1,550 nm; 100 Gbps cross-link; V1.5+)",
      "Krypton / Argon Hall-Effect Ion Thrusters (100 mN; 1,600 s Isp; autonomous orbit management)",
      "Direct-to-Cell Payload (700 MHz / AWS-4 LTE bands; V2 Mini — SMS/voice direct to smartphones)"
    ],
    discoveries: [
      {
        title: "Commercial Broadband at LEO Scale — 2+ Million Subscribers",
        desc: "Starlink proved commercial-scale LEO broadband at sub-50ms latency is economically viable, disrupting legacy geostationary internet with 600ms+ latency. Operated by Ukraine military for battlefield connectivity during the 2022 war, and deployed emergency maritime coverage — demonstrating the geopolitical and humanitarian significance of LEO communication constellations.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Starlink_Mission_%2847926144123%29.jpg/600px-Starlink_Mission_%2847926144123%29.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Starlink_Mission_%2847926144123%29.jpg/800px-Starlink_Mission_%2847926144123%29.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Starlink",
    links: [{ label: "Starlink Official", url: "https://www.starlink.com/" }],
    tags: ["Starlink", "Broadband", "SpaceX", "Mega-Constellation", "LEO"]
  };

  if (n.includes("ONEWEB")) return {
    agency: "Eutelsat OneWeb", country: "France / UK (EU/UK consortium)",
    launchDate: "2019–present (648-satellite polar constellation in operation)",
    launchSite: "Baikonur (Soyuz-2); Satish Dhawan (ISRO LVM3); Cape Canaveral (Falcon 9)",
    launchVehicle: "Soyuz-2.1b / LVM3 (ISRO) / Falcon 9 Block 5",
    purpose: `${cleanName} is a Eutelsat OneWeb LEO broadband satellite in the 648-satellite polar constellation at 1,200 km altitude, providing enterprise and government satellite broadband to maritime, aviation, cellular backhaul, and government sectors with latency under 60 ms. OneWeb was rescued from bankruptcy by Bharti Enterprises and UK government in 2020, and merged with Eutelsat in 2023 to form the world's second-largest LEO broadband constellation.`,
    status: "Operational",
    orbit: "LEO ~ 1,200 km × 87.9° (near-polar; 12 orbital planes × 49 satellites)",
    mass: "147 kg per satellite", power: "380 W dual deployable solar array",
    instruments: [
      "Ku-band User Link Antenna (10.7–12.7 GHz; 250 MHz bandwidth; steerable phased array)",
      "Ka-band Gateway Feeder Link (26.5–30 GHz; ground gateway uplink)",
      "Hall-Effect Electric Propulsion Thruster (100 mN; krypton propellant)",
      "GPS/GNSS Receiver for precision orbit determination"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/OneWeb_satellite.jpg/800px-OneWeb_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Eutelsat_OneWeb",
    links: [{ label: "Eutelsat OneWeb", url: "https://oneweb.net/" }],
    tags: ["OneWeb", "Eutelsat", "Broadband", "Polar Constellation", "LEO"]
  };

  if (n.includes("IRIDIUM")) return {
    agency: "Iridium Communications Inc.", country: "United States",
    launchDate: "2017–2019 (Iridium NEXT constellation; 75 satellites; replaced 1st gen fleet)",
    launchSite: "Vandenberg SFB SLC-4E",
    launchVehicle: "Falcon 9 Block 3/4/5 (8 dedicated Iridium NEXT launches, 10 sat per launch)",
    purpose: `${cleanName} is an Iridium NEXT satellite in the world's only true global mobile satellite voice/data network, covering 100% of Earth including polar regions (where most LEO broadband constellations have gaps). Iridium NEXT also hosts the Aireon ADS-B global aircraft tracking payload (first space-based ADS-B system) and ExactEarth AIS maritime monitoring, enabling real-time tracking of all aircraft and vessels worldwide.`,
    status: "Operational",
    orbit: "LEO ~ 780 km × 86.4° (near-polar; 6 orbital planes × 11 satellites; 100% global coverage)",
    mass: "860 kg per satellite",
    dimensions: "3.1 m × 2.4 m × 1.5 m",
    power: "1.2 kW from 3 deployable solar panels",
    instruments: [
      "L-band Mobile Satellite Link (1616–1626.5 MHz; voice 2.4/4.8 kbps; data 1.5 Mbps SBD)",
      "Ka-band Inter-Satellite Cross-links (24 × inter-satellite laser analog links; unique mesh routing)",
      "Ka-band Ground Gateway Links (feeder link to ~12 ground stations worldwide)",
      "Aireon ADS-B Payload (1090 MHz; global aircraft ADS-B tracking; hosted payload for aviation safety)",
      "ExactEarth AIS Payload (VHF 161.975/162.025 MHz; maritime vessel AIS position reporting)"
    ],
    discoveries: [
      {
        title: "Aireon Global ADS-B — First Real-Time Aircraft Tracking Everywhere",
        desc: "Iridium NEXT with the Aireon hosted payload became the first system providing real-time ADS-B aircraft position reports from 100% of Earth's surface including oceanic and polar routes — eliminating the 'dark' areas where previous radar-only systems lost aircraft. Critical after MH370 disappearance over the Indian Ocean.",
        imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Iridium_NEXT_satellite.jpg/600px-Iridium_NEXT_satellite.jpg")
      }
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Iridium_NEXT_satellite.jpg/800px-Iridium_NEXT_satellite.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Iridium_NEXT",
    links: [{ label: "Iridium Communications", url: "https://www.iridium.com/" }],
    tags: ["Iridium NEXT", "Global Mobile", "ADS-B", "AIS", "Polar Coverage"]
  };

  if (n.includes("INTELSAT") || n.includes("SES-") || n.includes("ASTRA") || n.includes("DIRECTV")) return {
    agency: "Intelsat / SES", country: "International (Luxembourg / USA registered)",
    launchDate: "1965–present (Intelsat-1 'Early Bird'; SES Astra-1A 1988–present)",
    launchSite: "Cape Canaveral / Baikonur / Guiana Space Centre (various)",
    launchVehicle: "Ariane 5 / Falcon 9 / Atlas V (various)",
    purpose: `${cleanName} is a commercial geostationary communication satellite operated by Intelsat or SES (Société Européenne des Satellites) for video distribution, VSAT broadband, cellular backhaul, and maritime/aviation connectivity. Intelsat operates 50+ GEO satellites; SES Astra serves 350 million direct-to-home TV subscribers across Europe and 40,000 Mbps Ka-band capacity via O3b MEO satellite fleet.`,
    status: "Operational",
    orbit: "GEO ~ 35,786 km (fixed longitude slot per satellite)",
    mass: "5,000–6,700 kg (typical large GEO comsats)",
    power: "20–25 kW from gallium arsenide solar arrays (large GEO bus)",
    instruments: [
      "C-band Transponders (3.7–4.2 GHz / 5.9–6.4 GHz; global/regional beam footprints)",
      "Ku-band Transponders (10.7–12.75 GHz / 13.75–14.5 GHz; regional beam footprints; DTH TV)",
      "Ka-band High-Throughput Satellite (HTS) Payload (17.7–21.2 GHz; spot beams for VSAT)",
      "V-band (HEO) Capacity (Optional — 40–75 GHz future high-capacity experiments)"
    ],
    imageUrl: WIKI_IMG("https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Intelsat_901.jpg/800px-Intelsat_901.jpg"),
    wikipediaUrl: "https://en.wikipedia.org/wiki/Intelsat",
    tags: ["GEO Comsat", "Intelsat", "SES", "Broadcast", "VSAT"]
  };

  // ══ 11. RESEARCH-GRADE GENERIC FALLBACK ══════════════════════════════════════
  const directWikiUrl = getDirectWikipediaUrl(name, category) || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanName.replace(/ /g, '_'))}`;

  return {
    agency, country,
    launchDate: "See mission documentation",
    launchVehicle: "See mission documentation",
    purpose: `${cleanName} is an orbital satellite classified in the '${category}' category, operating in Earth orbit for scientific observation, communications, navigation, Earth resources monitoring, or space domain operations. Full technical dossier available via the Wikipedia article link.`,
    status: "Operational",
    orbit: "Earth Orbit (see TLE orbital elements for current parameters)",
    imageUrl: LOCAL_FALLBACK_IMG,
    wikipediaUrl: directWikiUrl,
    tags: [cleanName, category.toUpperCase(), "Earth Orbit"],
    links: [{ label: "Satellite Wikipedia", url: directWikiUrl }]
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

function DiscoveryCard({ d }: { d: { title: string; desc: string; imageUrl?: string } }) {
  const [cardImgErr, setCardImgErr] = useState(false);

  return (
    <div className="border border-zinc-850 bg-black overflow-hidden flex flex-col justify-between">
      {d.imageUrl && !cardImgErr && (
        <div className="h-32 overflow-hidden relative bg-black">
          <img
            src={d.imageUrl}
            alt={d.title}
            referrerPolicy="no-referrer"
            onError={() => setCardImgErr(true)}
            className="w-full h-full object-cover opacity-90 hover:opacity-100 transition duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
      )}
      <div className="p-3.5">
        <p className="text-[11px] font-bold text-white leading-tight flex items-center gap-1.5">
          <Star className="h-3 w-3 text-[#00e5ff] flex-shrink-0" />
          {d.title}
        </p>
        <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">{d.desc}</p>
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

  const hasSpecificInferred = inferred && inferred.name && !inferred.purpose?.includes("operating in Earth orbit for communications");

  const info: Partial<SatelliteInfo> & { name: string } = {
    ...inferred,
    ...base,
    name: base?.name || (hasSpecificInferred ? inferred.name : null) || satName,
    imageUrl: base?.imageUrl || (hasSpecificInferred && inferred.imageUrl && inferred.imageUrl !== LOCAL_FALLBACK_IMG ? inferred.imageUrl : (dynamicWiki?.imageUrl || inferred.imageUrl || LOCAL_FALLBACK_IMG)),
    wikipediaUrl: base?.wikipediaUrl || directWikiUrl || (hasSpecificInferred ? inferred.wikipediaUrl : null) || dynamicWiki?.wikiUrl || fallbackWikiUrl,
    purpose: base?.purpose || (hasSpecificInferred ? inferred.purpose : (dynamicWiki?.extract || inferred.purpose)) || `${satName} is an orbital spacecraft operating in Earth orbit for communications, navigation, science, or Earth observation operations.`,
    orbit: dynamicOrbit || base?.orbit || inferred.orbit || "Earth Orbit",
  };

  const tags = info.tags || [];
  const isDebris = isDebrisOrRocketBody(satName);

  return (
    <div className="border border-zinc-850 bg-zinc-950 overflow-hidden mt-4">
      {/* Header banner */}
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${isDebris ? "border-red-900/60 bg-red-950/20" : "border-zinc-850 bg-black"}`}>
        {isDebris ? (
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 animate-pulse" />
        ) : (
          <Eye className="h-4 w-4 text-[#00e5ff] flex-shrink-0" />
        )}
        <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isDebris ? "text-red-400" : "text-white"}`}>
          {isDebris ? "Debris Intelligence & Hazard Dossier" : "Mission Intelligence & Technical Dossier"}
        </span>
        <span className="ml-auto text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5">
          NORAD #{noradId}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
        {/* Left: Satellite image + Technical specifications */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-850 bg-black">
          {/* Image Container with SVG fallback */}
          <div className="relative h-56 lg:h-64 bg-black overflow-hidden flex items-center justify-center border-b border-zinc-850">
            <img
              src={imgError ? LOCAL_FALLBACK_IMG : (info.imageUrl || LOCAL_FALLBACK_IMG)}
              alt={info.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover opacity-95 hover:opacity-100 transition duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
            
            {/* Tags overlay */}
            {tags.length > 0 && (
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1">
                {tags.slice(0, 3).map((t) => (
                  <span key={t} className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-black/85 backdrop-blur-sm border ${isDebris ? "text-red-400 border-red-500/40" : "text-zinc-200 border-white/20"}`}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick facts */}
          <div className="p-5 space-y-3.5 flex-1 text-xs">
            {info.status && (
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-850">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Operational Status</span>
                <StatusBadge status={info.status} />
              </div>
            )}

            {info.agency && (
              <div className="pb-2.5 border-b border-zinc-850">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1 font-semibold">
                  <Globe className="h-3 w-3 text-[#00e5ff]" /> Operating Agency / Country
                </span>
                <p className="text-[11px] text-white font-bold leading-snug">{info.agency}</p>
                {info.country && <p className="text-[9px] text-zinc-400 font-mono mt-0.5">{info.country}</p>}
              </div>
            )}

            {info.launchDate && (
              <div className="pb-2.5 border-b border-zinc-850">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1 font-semibold">
                  <Calendar className="h-3 w-3 text-amber-400" /> Launch Date &amp; Vehicle
                </span>
                <p className="text-[11px] text-white font-mono">{info.launchDate}</p>
                {info.launchVehicle && <p className="text-[10px] text-zinc-300 mt-0.5">{info.launchVehicle}</p>}
              </div>
            )}

            {info.orbit && (
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1 font-semibold">
                  <MapPin className="h-3 w-3 text-[#ff3366]" /> Orbit Profile
                </span>
                <p className="text-[10px] text-[#00e5ff] font-mono leading-snug">{info.orbit}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Technical Specifications, Mission Purpose & Discoveries */}
        <div className="p-6 flex flex-col gap-6 overflow-hidden bg-zinc-950">
          
          {/* Mission title & description & Direct Wikipedia Button */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                {isDebris ? <AlertTriangle className="h-4 w-4 text-red-400" /> : <Satellite className="h-4 w-4 text-[#00e5ff]" />}
                {info.name}
              </h2>

              {info.wikipediaUrl && (
                <a
                  href={info.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 px-3 py-1.5 transition"
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#00e5ff]" />
                  <span>Wikipedia Article</span>
                  <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                </a>
              )}
            </div>

            <p className={`text-xs leading-relaxed border p-4 ${isDebris ? "bg-red-950/20 border-red-900/40 text-red-200" : "bg-black border-zinc-850 text-zinc-300"}`}>
              {info.purpose}
            </p>
          </div>

          {/* Technical Specs Grid (Mass, Dimensions, Power, Instruments) */}
          {(info.mass || info.dimensions || info.power || (info.instruments && info.instruments.length > 0)) && (
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Wrench className="h-3.5 w-3.5 text-amber-400" />
                Spacecraft Technical Specifications
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {info.mass && (
                  <div className="bg-black border border-zinc-850 p-3">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Dry / Launch Mass</span>
                    <p className="text-xs font-bold text-white font-mono mt-1">{info.mass}</p>
                  </div>
                )}

                {info.dimensions && (
                  <div className="bg-black border border-zinc-850 p-3">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Physical Dimensions</span>
                    <p className="text-xs font-bold text-white font-mono mt-1">{info.dimensions}</p>
                  </div>
                )}

                {info.power && (
                  <div className="bg-black border border-zinc-850 p-3">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Electrical Power Output</span>
                    <p className="text-xs font-bold text-emerald-400 font-mono mt-1">{info.power}</p>
                  </div>
                )}
              </div>

              {info.instruments && info.instruments.length > 0 && (
                <div className="mt-3 bg-black border border-zinc-850 p-3.5">
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Cpu className="h-3 w-3 text-[#00e5ff]" /> Onboard Payload &amp; Scientific Instruments
                  </span>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {info.instruments.map((inst, idx) => (
                      <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
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
