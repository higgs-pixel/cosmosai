const fs = require('fs');
global.satellite = require('../public/satellite.min.js');
global.importScripts = () => {};
global.self = { postMessage: () => {}, addEventListener: () => {} };
let workerCode = fs.readFileSync('./public/propagation-worker.js', 'utf8');
eval(workerCode);

let catalogCode = fs.readFileSync('./src/components/intelligence/defaultCatalog.ts', 'utf8');
const idMatches = catalogCode.matchAll(/id:\s*(\d+),\s*\n\s*name:\s*["']([^"']+)["'][\s\S]*?line1:\s*["']([^"']+)["'][\s\S]*?line2:\s*["']([^"']+)["']/g);
const sats = [];
for (const m of idMatches) {
  sats.push({ id: parseInt(m[1]), name: m[2], line1: m[3], line2: m[4] });
}

// Test locations across the globe
const locations = [
  { name: 'Chennai, India', lat: 13.0827, lon: 80.2707 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
  { name: 'New York, USA', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 }
];

for (const loc of locations) {
  const passes = predictUpcomingPassesWorker(sats, { lat: loc.lat, lon: loc.lon, altMeters: 180 }, Date.now(), 6);
  console.log(`[${loc.name}] 6h passes: ${passes.length}`);
}
