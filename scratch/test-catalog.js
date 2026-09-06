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

const obs = { lat: 13.0827, lon: 80.2707, altMeters: 180 };
const p1 = predictUpcomingPassesWorker(sats, obs, Date.now(), 1);
const p6 = predictUpcomingPassesWorker(sats, obs, Date.now(), 6);
const p24 = predictUpcomingPassesWorker(sats, obs, Date.now(), 24);
console.log('1h passes:', p1.length, '| 6h passes:', p6.length, '| 24h passes:', p24.length);
