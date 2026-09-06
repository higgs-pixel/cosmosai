importScripts('/satellite.min.js');

var satellites = [];

function parseTleText(text) {
  var lines = (text || '').split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);
  var list = [];
  var seenIds = {};

  var i = 0;
  while (i < lines.length) {
    var name = 'SATELLITE';
    var line1 = '';
    var line2 = '';

    if (lines[i].indexOf('1 ') === 0 && i + 1 < lines.length && lines[i + 1].indexOf('2 ') === 0) {
      line1 = lines[i];
      line2 = lines[i + 1];
      i += 2;
    } else if (i + 2 < lines.length && lines[i + 1].indexOf('1 ') === 0 && lines[i + 2].indexOf('2 ') === 0) {
      name = lines[i];
      line1 = lines[i + 1];
      line2 = lines[i + 2];
      i += 3;
    } else {
      i++;
      continue;
    }

    try {
      var id = parseInt(line1.substring(2, 7).trim(), 10);
      if (isNaN(id) || seenIds[id]) continue;
      seenIds[id] = true;

      if (name === 'SATELLITE') {
        name = 'SAT-' + id;
      }

      list.push({
        id: id,
        name: name,
        line1: line1,
        line2: line2,
        category: 'Active',
        orbitClass: 'LEO',
        epochDate: new Date().toISOString()
      });
    } catch (err) {
      // skip
    }
  }
  return list;
}

function initSatellites(dataList) {
  satellites = (dataList || []).map(function(item) {
    try {
      var satrec = satellite.twoline2satrec(item.line1, item.line2);
      if (!satrec || satrec.error) return null;
      return {
        id: item.id,
        name: item.name,
        category: item.category || 'Active',
        orbitClass: item.orbitClass || 'LEO',
        line1: item.line1,
        line2: item.line2,
        epochDate: item.epochDate,
        satrec: satrec
      };
    } catch (err) {
      return null;
    }
  }).filter(Boolean);

  var rawList = satellites.map(function(s) {
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      orbitClass: s.orbitClass,
      line1: s.line1,
      line2: s.line2,
      epochDate: s.epochDate
    };
  });

  self.postMessage({
    type: 'catalog_loaded',
    satellites: rawList,
    count: rawList.length
  });
}

self.onmessage = function(e) {
  var msg = e.data;
  if (!msg) return;

  if (msg.type === 'init') {
    initSatellites(msg.data || []);
  } else if (msg.type === 'fetch_catalog') {
    var rawUrl = msg.url || '/api/orbital?group=active&format=tle';
    var fullUrl = rawUrl;
    try {
      if (rawUrl.indexOf('http') !== 0 && self.location && self.location.origin) {
        fullUrl = self.location.origin + (rawUrl.indexOf('/') === 0 ? '' : '/') + rawUrl;
      }
    } catch (e) {}

    var fallback = msg.fallback || [];
    var satMap = {};
    for (var f = 0; f < fallback.length; f++) {
      satMap[fallback[f].id] = fallback[f];
    }

    fetch(fullUrl)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function(txt) {
        var parsed = parseTleText(txt);
        for (var p = 0; p < parsed.length; p++) {
          satMap[parsed[p].id] = parsed[p];
        }
        var fullList = Object.keys(satMap).map(function(k) { return satMap[k]; });
        initSatellites(fullList);
      })
      .catch(function(err) {
        var fullList = Object.keys(satMap).map(function(k) { return satMap[k]; });
        initSatellites(fullList);
      });
  } else if (msg.type === 'propagate') {
    var timeMs = (msg.data && msg.data.timeMs) || msg.timeMs || Date.now();
    var date = new Date(timeMs);
    var gmst = satellite.gstime(date);

    // Buffer format: 8 elements per satellite:
    // [id, x, y, z, lat, lon, alt, velocity]
    var buffer = new Float32Array(satellites.length * 8);

    for (var i = 0; i < satellites.length; i++) {
      var sat = satellites[i];
      var idx = i * 8;
      buffer[idx] = sat.id;

      try {
        var posAndVel = satellite.propagate(sat.satrec, date);
        var posEci = posAndVel.position;
        var velEci = posAndVel.velocity;

        if (posEci && typeof posEci !== 'boolean' && !isNaN(posEci.x)) {
          buffer[idx + 1] = posEci.x;
          buffer[idx + 2] = posEci.y;
          buffer[idx + 3] = posEci.z;

          var posGd = satellite.eciToGeodetic(posEci, gmst);
          buffer[idx + 4] = satellite.degreesLat(posGd.latitude);
          
          var lonDeg = satellite.degreesLong(posGd.longitude);
          if (lonDeg > 180) lonDeg -= 360;
          if (lonDeg < -180) lonDeg += 360;
          buffer[idx + 5] = lonDeg;

          buffer[idx + 6] = posGd.height;

          if (velEci && typeof velEci !== 'boolean') {
            var vx = velEci.x;
            var vy = velEci.y;
            var vz = velEci.z;
            buffer[idx + 7] = Math.sqrt(vx * vx + vy * vy + vz * vz);
          } else {
            buffer[idx + 7] = 0;
          }
        } else {
          buffer[idx + 1] = NaN;
        }
      } catch (err) {
        buffer[idx + 1] = NaN;
      }
    }

    self.postMessage({ type: 'positions', buffer: buffer }, [buffer.buffer]);
  } else if (msg.type === 'evaluate_visibility') {
    var vTimeMs = msg.timeMs || Date.now();
    var observer = msg.observer;
    if (!observer || typeof observer.lat !== 'number' || typeof observer.lon !== 'number') {
      return;
    }

    var vDate = new Date(vTimeMs);
    var vGmst = satellite.gstime(vDate);

    // Observer Geodetic Coordinates
    var obsLatRad = (observer.lat * Math.PI) / 180;
    var obsLonRad = (observer.lon * Math.PI) / 180;
    var obsAltKm = (observer.altMeters || 0) / 1000;
    var obsGd = { latitude: obsLatRad, longitude: obsLonRad, height: obsAltKm };

    // Observer ECF coordinates on WGS-84 spheroid
    var cosLat = Math.cos(obsLatRad);
    var sinLat = Math.sin(obsLatRad);
    var cosLon = Math.cos(obsLonRad);
    var sinLon = Math.sin(obsLonRad);
    var a = 6378.137;
    var f = 1 / 298.257223563;
    var e2 = 2 * f - f * f;
    var N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
    var obsX = (N + obsAltKm) * cosLat * cosLon;
    var obsY = (N + obsAltKm) * cosLat * sinLon;
    var obsZ = (N * (1 - e2) + obsAltKm) * sinLat;

    // Zenith unit vector in ECF
    var zenX = cosLat * cosLon;
    var zenY = cosLat * sinLon;
    var zenZ = sinLat;

    // Sun vector in ECI for shadow calculation
    var yearDay = Math.floor((vDate.getTime() - new Date(Date.UTC(vDate.getUTCFullYear(), 0, 0)).getTime()) / (24 * 3600 * 1000));
    var meanAnomalySun = ((357.529 + 0.98560028 * yearDay) * Math.PI) / 180;
    var sunLon = ((280.459 + 0.98564736 * yearDay + 1.915 * Math.sin(meanAnomalySun)) * Math.PI) / 180;
    var obliq = (23.439 * Math.PI) / 180;
    var sunX = Math.cos(sunLon);
    var sunY = Math.cos(obliq) * Math.sin(sunLon);
    var sunZ = Math.sin(obliq) * Math.sin(sunLon);
    var R_EARTH = 6378.137;

    // Observer twilight angle
    var cosGmst = Math.cos(vGmst);
    var sinGmst = Math.sin(vGmst);
    var sunEcfX = sunX * cosGmst + sunY * sinGmst;
    var sunEcfY = -sunX * sinGmst + sunY * cosGmst;
    var sunEcfZ = sunZ;
    var sunDotZenith = sunEcfX * zenX + sunEcfY * zenY + sunEcfZ * zenZ;
    var sunAltDeg = Math.asin(Math.max(-1, Math.min(1, sunDotZenith))) * (180 / Math.PI);
    var isObserverDark = sunAltDeg < -6;

    // 1. Calculate Selected Satellite Live Telemetry in Worker
    var selectedTelemetry = null;
    var targetSatId = msg.selectedSatId || 25544;
    var targetSat = null;

    for (var k = 0; k < satellites.length; k++) {
      if (satellites[k].id === targetSatId) {
        targetSat = satellites[k];
        break;
      }
    }
    if (!targetSat && satellites.length > 0) {
      targetSat = satellites[0];
    }

    if (targetSat) {
      try {
        var sPv = satellite.propagate(targetSat.satrec, vDate);
        if (sPv && sPv.position && typeof sPv.position !== 'boolean' && sPv.velocity && typeof sPv.velocity !== 'boolean') {
          var sPos = sPv.position;
          var sVel = sPv.velocity;
          var sPosGd = satellite.eciToGeodetic(sPos, vGmst);
          var sLat = satellite.degreesLat(sPosGd.latitude);
          var sLon = satellite.degreesLong(sPosGd.longitude);
          if (sLon > 180) sLon -= 360;
          if (sLon < -180) sLon += 360;
          var sAlt = sPosGd.height;
          var sVx = sVel.x;
          var sVy = sVel.y;
          var sVz = sVel.z;
          var sSpeed = Math.sqrt(sVx * sVx + sVy * sVy + sVz * sVz);

          var sEcf = satellite.eciToEcf(sPos, vGmst);
          var sLook = satellite.ecfToLookAngles(obsGd, sEcf);
          var sElDeg = sLook.elevation * (180 / Math.PI);
          var sAzDeg = (sLook.azimuth * (180 / Math.PI) + 360) % 360;
          var sSlant = Math.round(sLook.rangeSat);

          var sRDotSun = sPos.x * sunX + sPos.y * sunY + sPos.z * sunZ;
          var sIsSunlit = true;
          if (sRDotSun < 0) {
            var spx = sPos.x - sRDotSun * sunX;
            var spy = sPos.y - sRDotSun * sunY;
            var spz = sPos.z - sRDotSun * sunZ;
            if (Math.sqrt(spx * spx + spy * spy + spz * spz) < R_EARTH) sIsSunlit = false;
          }

          var sIntrinsic = 4.2;
          var sNameUpper = (targetSat.name || '').toUpperCase();
          if (targetSat.id === 25544 || sNameUpper.indexOf('ISS') !== -1) sIntrinsic = -1.8;
          else if (targetSat.id === 48274 || sNameUpper.indexOf('TIANGONG') !== -1) sIntrinsic = -0.8;
          else if (targetSat.id === 20580 || sNameUpper.indexOf('HUBBLE') !== -1) sIntrinsic = 1.5;
          else if (sNameUpper.indexOf('STARLINK') !== -1) sIntrinsic = 5.2;

          var sEstMag = sIntrinsic + 5 * Math.log10(Math.max(1, sSlant) / 400);
          if (!sIsSunlit) sEstMag += 4.5;
          sEstMag = Math.round(sEstMag * 10) / 10;

          var sAbove = sElDeg > 0;
          var sObs = sElDeg >= 10;
          var sNaked = sAbove && sObs && sIsSunlit && isObserverDark && sEstMag <= 4.5;
          var sStatus = 'Below Horizon';
          if (sNaked) sStatus = 'Naked-Eye Visible';
          else if (sAbove && sIsSunlit) sStatus = 'Sunlit Outside Umbra';
          else if (sAbove && !sIsSunlit) sStatus = 'In Umbral Eclipse';

          selectedTelemetry = {
            satId: targetSat.id,
            satName: targetSat.name,
            category: targetSat.category,
            orbitClass: targetSat.orbitClass,
            line1: targetSat.line1,
            line2: targetSat.line2,
            px: sPos.x,
            py: sPos.y,
            pz: sPos.z,
            vx: sVx,
            vy: sVy,
            vz: sVz,
            vel: sSpeed,
            lat: sLat,
            lon: sLon,
            alt: sAlt,
            elevationDeg: Math.round(sElDeg * 10) / 10,
            azimuthDeg: Math.round(sAzDeg * 10) / 10,
            slantRangeKm: sSlant,
            isSunlit: sIsSunlit,
            isAboveHorizon: sAbove,
            isNakedEyeVisible: sNaked,
            estimatedMagnitude: sEstMag,
            statusLabel: sStatus
          };
        }
      } catch (err) {
        // skip
      }
    }

    // 2. Scan All 900+ Satellites for Horizon Visibility using Tangent Plane Culling
    var aboveHorizon = [];

    for (var j = 0; j < satellites.length; j++) {
      var s = satellites[j];
      try {
        var pv = satellite.propagate(s.satrec, vDate);
        var pEci = pv.position;
        if (!pEci || typeof pEci === 'boolean' || isNaN(pEci.x)) continue;

        var pEcf = satellite.eciToEcf(pEci, vGmst);

        var dx = pEcf.x - obsX;
        var dy = pEcf.y - obsY;
        var dz = pEcf.z - obsZ;

        // Coarse opposite-hemisphere Earth culling (distance > 2500 km below observer horizon plane)
        var dotZenith = dx * zenX + dy * zenY + dz * zenZ;
        if (dotZenith < -2500) {
          continue;
        }

        var look = satellite.ecfToLookAngles(obsGd, pEcf);
        var elDeg = look.elevation * (180 / Math.PI);

        if (elDeg < -5) continue;

        var azDeg = (look.azimuth * (180 / Math.PI) + 360) % 360;
        var slantKm = Math.round(look.rangeSat);

        var posGd = satellite.eciToGeodetic(pEci, vGmst);
        var subLat = satellite.degreesLat(posGd.latitude);
        var subLon = satellite.degreesLong(posGd.longitude);
        if (subLon > 180) subLon -= 360;
        if (subLon < -180) subLon += 360;
        var subAlt = Math.round(posGd.height);

        var rDotSun = pEci.x * sunX + pEci.y * sunY + pEci.z * sunZ;
        var isSunlit = true;
        if (rDotSun < 0) {
          var px = pEci.x - rDotSun * sunX;
          var py = pEci.y - rDotSun * sunY;
          var pz = pEci.z - rDotSun * sunZ;
          var perpDist = Math.sqrt(px * px + py * py + pz * pz);
          if (perpDist < R_EARTH) {
            isSunlit = false;
          }
        }

        var intrinsic = 4.2;
        var uName = (s.name || '').toUpperCase();
        if (s.id === 25544 || uName.indexOf('ISS') !== -1 || uName.indexOf('STATION') !== -1 || uName.indexOf('ZARYA') !== -1) intrinsic = -1.8;
        else if (s.id === 48274 || uName.indexOf('TIANGONG') !== -1 || uName.indexOf('TIANHE') !== -1) intrinsic = -0.8;
        else if (s.id === 20580 || uName.indexOf('HUBBLE') !== -1 || uName.indexOf('HST') !== -1) intrinsic = 1.5;
        else if (s.id === 50463 || uName.indexOf('JWST') !== -1) intrinsic = 2.0;
        else if (s.id === 33591 || uName.indexOf('NOAA') !== -1) intrinsic = 3.5;
        else if (uName.indexOf('STARLINK') !== -1) intrinsic = 5.2;

        var estMag = intrinsic + 5 * Math.log10(Math.max(1, slantKm) / 400);
        if (!isSunlit) estMag += 4.5;
        estMag = Math.round(estMag * 10) / 10;

        var isAbove = elDeg > 0;
        var isObservable = elDeg >= 10;
        var isNakedEye = isAbove && isObservable && isSunlit && isObserverDark && estMag <= 4.5;

        var status = 'Below Horizon';
        if (isNakedEye) status = 'Naked-Eye Visible';
        else if (isAbove && isSunlit) status = 'Sunlit';
        else if (isAbove && !isSunlit) status = 'In Umbral Eclipse';
        else if (!isAbove && elDeg >= -5) status = 'Approaching';

        aboveHorizon.push({
          satId: s.id,
          satName: s.name,
          category: s.category || 'Active',
          orbitClass: s.orbitClass || 'LEO',
          line1: s.line1 || '',
          line2: s.line2 || '',
          azimuthDeg: Math.round(azDeg * 10) / 10,
          elevationDeg: Math.round(elDeg * 10) / 10,
          slantRangeKm: slantKm,
          satLat: Math.round(subLat * 1000) / 1000,
          satLon: Math.round(subLon * 1000) / 1000,
          satAltKm: subAlt,
          isAboveHorizon: isAbove,
          isObservable: isObservable,
          isSunlit: isSunlit,
          isObserverDark: isObserverDark,
          isNakedEyeVisible: isNakedEye,
          estimatedMagnitude: estMag,
          phaseAngleDeg: 45,
          statusLabel: status
        });
      } catch (err) {
        // Skip
      }
    }

    aboveHorizon.sort(function(a, b) {
      return b.elevationDeg - a.elevationDeg;
    });

    self.postMessage({
      type: 'visibility_results',
      results: aboveHorizon,
      selectedTelemetry: selectedTelemetry,
      timeMs: vTimeMs
    });
  } else if (msg.type === 'predict_passes') {
    var pCandidateSats = msg.candidateSats || [];
    var pObserver = msg.observer;
    var pStartTimeMs = msg.startTimeMs || Date.now();
    var pLookaheadHours = msg.lookaheadHours || 6;
    var pRequestId = msg.requestId || 0;

    // Use passed candidate sats, or find from satellites catalog if empty
    var satsToEvaluate = [];
    if (pCandidateSats.length > 0) {
      for (var cs = 0; cs < pCandidateSats.length; cs++) {
        var csId = pCandidateSats[cs].id;
        var existing = null;
        for (var si = 0; si < satellites.length; si++) {
          if (satellites[si].id === csId) {
            existing = satellites[si];
            break;
          }
        }
        if (existing) {
          satsToEvaluate.push(existing);
        } else {
          satsToEvaluate.push(pCandidateSats[cs]);
        }
      }
    } else {
      satsToEvaluate = satellites.slice(0, 75);
    }

    var computedPasses = predictUpcomingPassesWorker(satsToEvaluate, pObserver, pStartTimeMs, pLookaheadHours);

    self.postMessage({
      type: 'passes_predicted',
      passes: computedPasses,
      requestId: pRequestId
    });
  } else if (msg.type === 'propagate_and_evaluate') {
    var peTimeMs = msg.timeMs || Date.now();
    var peDate = new Date(peTimeMs);
    var peGmst = satellite.gstime(peDate);
    var peObserver = msg.observer;
    var peTargetId = msg.selectedSatId || 25544;

    // Buffer for 3D globe [id, x, y, z, lat, lon, alt, velocity]
    var peBuffer = new Float32Array(satellites.length * 8);

    var hasObs = peObserver && typeof peObserver.lat === 'number' && typeof peObserver.lon === 'number';
    var peObsGd = null;
    var peObsX = 0, peObsY = 0, peObsZ = 0, peZenX = 0, peZenY = 0, peZenZ = 0;
    var peSunX = 0, peSunY = 0, peSunZ = 0, peIsDark = false;
    var PE_R_EARTH = 6378.137;

    if (hasObs) {
      var peObsLatRad = (peObserver.lat * Math.PI) / 180;
      var peObsLonRad = (peObserver.lon * Math.PI) / 180;
      var peObsAltKm = (peObserver.altMeters || 0) / 1000;
      peObsGd = { latitude: peObsLatRad, longitude: peObsLonRad, height: peObsAltKm };

      var peCosLat = Math.cos(peObsLatRad);
      var peSinLat = Math.sin(peObsLatRad);
      var peCosLon = Math.cos(peObsLonRad);
      var peSinLon = Math.sin(peObsLonRad);
      var peA = 6378.137;
      var peF = 1 / 298.257223563;
      var peE2 = 2 * peF - peF * peF;
      var peN = peA / Math.sqrt(1 - peE2 * peSinLat * peSinLat);
      peObsX = (peN + peObsAltKm) * peCosLat * peCosLon;
      peObsY = (peN + peObsAltKm) * peCosLat * peSinLon;
      peObsZ = (peN * (1 - peE2) + peObsAltKm) * peSinLat;

      peZenX = peCosLat * peCosLon;
      peZenY = peCosLat * peSinLon;
      peZenZ = peSinLat;

      var peYearDay = Math.floor((peDate.getTime() - new Date(Date.UTC(peDate.getUTCFullYear(), 0, 0)).getTime()) / (24 * 3600 * 1000));
      var peMeanAnomaly = ((357.529 + 0.98560028 * peYearDay) * Math.PI) / 180;
      var peSunLon = ((280.459 + 0.98564736 * peYearDay + 1.915 * Math.sin(peMeanAnomaly)) * Math.PI) / 180;
      var peObliq = (23.439 * Math.PI) / 180;
      peSunX = Math.cos(peSunLon);
      peSunY = Math.cos(peObliq) * Math.sin(peSunLon);
      peSunZ = Math.sin(peObliq) * Math.sin(peSunLon);

      var peCosGmst = Math.cos(peGmst);
      var peSinGmst = Math.sin(peGmst);
      var peSunEcfX = peSunX * peCosGmst + peSunY * peSinGmst;
      var peSunEcfY = -peSunX * peSinGmst + peSunY * peCosGmst;
      var peSunEcfZ = peSunZ;
      var peSunDotZen = peSunEcfX * peZenX + peSunEcfY * peZenY + peSunEcfZ * peZenZ;
      var peSunAlt = Math.asin(Math.max(-1, Math.min(1, peSunDotZen))) * (180 / Math.PI);
      peIsDark = peSunAlt < -6;
    }

    var peAboveHorizon = [];
    var peSelectedTelemetry = null;

    for (var m = 0; m < satellites.length; m++) {
      var satObj = satellites[m];
      var bufIdx = m * 8;
      peBuffer[bufIdx] = satObj.id;

      try {
        var pv = satellite.propagate(satObj.satrec, peDate);
        var pEci = pv ? pv.position : null;
        var vEci = pv ? pv.velocity : null;

        if (!pEci || typeof pEci === 'boolean' || isNaN(pEci.x)) {
          peBuffer[bufIdx + 1] = NaN;
          continue;
        }

        peBuffer[bufIdx + 1] = pEci.x;
        peBuffer[bufIdx + 2] = pEci.y;
        peBuffer[bufIdx + 3] = pEci.z;

        var posGd = satellite.eciToGeodetic(pEci, peGmst);
        var subLat = satellite.degreesLat(posGd.latitude);
        var subLon = satellite.degreesLong(posGd.longitude);
        if (subLon > 180) subLon -= 360;
        if (subLon < -180) subLon += 360;
        var subAlt = posGd.height;

        peBuffer[bufIdx + 4] = subLat;
        peBuffer[bufIdx + 5] = subLon;
        peBuffer[bufIdx + 6] = subAlt;

        var speedKms = 0;
        if (vEci && typeof vEci !== 'boolean') {
          speedKms = Math.sqrt(vEci.x * vEci.x + vEci.y * vEci.y + vEci.z * vEci.z);
          peBuffer[bufIdx + 7] = speedKms;
        } else {
          peBuffer[bufIdx + 7] = 0;
        }

        // Topocentric observation calculations
        if (hasObs && peObsGd) {
          var pEcf = satellite.eciToEcf(pEci, peGmst);
          var dx = pEcf.x - peObsX;
          var dy = pEcf.y - peObsY;
          var dz = pEcf.z - peObsZ;

          var dotZen = dx * peZenX + dy * peZenY + dz * peZenZ;
          var isTrackedSat = (satObj.id === peTargetId);

          // Fast rejection if deeply below horizon and not active selected sat
          if (dotZen >= -2500 || isTrackedSat) {
            var look = satellite.ecfToLookAngles(peObsGd, pEcf);
            var elDeg = (look.elevation * 180) / Math.PI;
            var azDeg = ((look.azimuth * 180) / Math.PI + 360) % 360;
            var slantKm = Math.round(look.rangeSat);

            // Sunlit condition
            var rDotSun = pEci.x * peSunX + pEci.y * peSunY + pEci.z * peSunZ;
            var isSunlit = true;
            if (rDotSun < 0) {
              var px = pEci.x - rDotSun * peSunX;
              var py = pEci.y - rDotSun * peSunY;
              var pz = pEci.z - rDotSun * peSunZ;
              if (Math.sqrt(px * px + py * py + pz * pz) < PE_R_EARTH) {
                isSunlit = false;
              }
            }

            var intrinsic = getIntrinsicMagnitudeWorker(satObj.id, satObj.name);
            var estMag = intrinsic + 5 * Math.log10(Math.max(1, slantKm) / 400);
            if (!isSunlit) estMag += 4.5;
            estMag = Math.round(estMag * 10) / 10;

            var isAbove = elDeg > 0;
            var isObservable = elDeg >= 10;
            var isNakedEye = isAbove && isObservable && isSunlit && peIsDark && estMag <= 4.5;

            var status = 'Below Horizon';
            if (isNakedEye) status = 'Naked-Eye Visible';
            else if (isAbove && isSunlit) status = 'Sunlit';
            else if (isAbove && !isSunlit) status = 'In Umbral Eclipse';
            else if (!isAbove && elDeg >= -5) status = 'Approaching';

            if (isTrackedSat) {
              peSelectedTelemetry = {
                satId: satObj.id,
                satName: satObj.name,
                category: satObj.category,
                orbitClass: satObj.orbitClass,
                line1: satObj.line1,
                line2: satObj.line2,
                px: pEci.x,
                py: pEci.y,
                pz: pEci.z,
                vx: vEci ? vEci.x : 0,
                vy: vEci ? vEci.y : 0,
                vz: vEci ? vEci.z : 0,
                vel: speedKms,
                lat: subLat,
                lon: subLon,
                alt: subAlt,
                elevationDeg: Math.round(elDeg * 10) / 10,
                azimuthDeg: Math.round(azDeg * 10) / 10,
                slantRangeKm: slantKm,
                isSunlit: isSunlit,
                isAboveHorizon: isAbove,
                isNakedEyeVisible: isNakedEye,
                estimatedMagnitude: estMag,
                statusLabel: status
              };
            }

            if (elDeg >= -5) {
              peAboveHorizon.push({
                satId: satObj.id,
                satName: satObj.name,
                category: satObj.category || 'Active',
                orbitClass: satObj.orbitClass || 'LEO',
                line1: satObj.line1 || '',
                line2: satObj.line2 || '',
                azimuthDeg: Math.round(azDeg * 10) / 10,
                elevationDeg: Math.round(elDeg * 10) / 10,
                slantRangeKm: slantKm,
                satLat: Math.round(subLat * 1000) / 1000,
                satLon: Math.round(subLon * 1000) / 1000,
                satAltKm: Math.round(subAlt),
                isAboveHorizon: isAbove,
                isObservable: isObservable,
                isSunlit: isSunlit,
                isObserverDark: peIsDark,
                isNakedEyeVisible: isNakedEye,
                estimatedMagnitude: estMag,
                phaseAngleDeg: 45,
                statusLabel: status
              });
            }
          }
        }
      } catch (err) {
        peBuffer[bufIdx + 1] = NaN;
      }
    }

    peAboveHorizon.sort(function(a, b) {
      return b.elevationDeg - a.elevationDeg;
    });

    // Transfer positions buffer directly to avoid copying overhead
    self.postMessage({
      type: 'unified_tick',
      buffer: peBuffer,
      results: peAboveHorizon,
      selectedTelemetry: peSelectedTelemetry,
      timeMs: peTimeMs
    }, [peBuffer.buffer]);
  }
};

function getIntrinsicMagnitudeWorker(noradId, satName) {
  if (noradId === 25544) return -1.8;
  if (noradId === 48274) return -0.8;
  if (noradId === 20580) return 1.5;
  if (noradId === 50463) return 2.0;
  if (noradId === 33591) return 3.5;
  if (noradId === 44713) return 5.0;
  var n = (satName || '').toUpperCase();
  if (n.indexOf('ISS') !== -1 || n.indexOf('STATION') !== -1 || n.indexOf('CSS') !== -1) return -1.5;
  if (n.indexOf('STARLINK') !== -1) return 5.2;
  if (n.indexOf('GPS') !== -1 || n.indexOf('NAVSTAR') !== -1 || n.indexOf('GLONASS') !== -1 || n.indexOf('BEIDOU') !== -1) return 4.5;
  if (n.indexOf('WEATHER') !== -1 || n.indexOf('NOAA') !== -1 || n.indexOf('GOES') !== -1) return 3.8;
  return 4.2;
}

function predictUpcomingPassesWorker(candidateSats, observer, startTimeMs, lookaheadHours) {
  if (!candidateSats || candidateSats.length === 0 || !observer) return [];

  var passes = [];
  var obsLatRad = (observer.lat * Math.PI) / 180;
  var obsLonRad = (observer.lon * Math.PI) / 180;
  var obsAltKm = (observer.altMeters || 10) / 1000;
  var obsGd = { latitude: obsLatRad, longitude: obsLonRad, height: obsAltKm };

  var stepMin = lookaheadHours <= 1 ? 1.0 : lookaheadHours <= 6 ? 2.0 : 3.0;
  var totalSteps = Math.min(480, Math.ceil((lookaheadHours * 60) / stepMin));

  for (var sIdx = 0; sIdx < candidateSats.length; sIdx++) {
    var sat = candidateSats[sIdx];
    var satrec = sat.satrec;
    if (!satrec) {
      try {
        satrec = satellite.twoline2satrec(sat.line1, sat.line2);
      } catch (e) {
        continue;
      }
    }
    if (!satrec || satrec.error) continue;

    var intrinsicMag = getIntrinsicMagnitudeWorker(sat.id, sat.name);
    var inPass = false;
    var currentPassPoints = [];

    for (var i = 0; i < totalSteps; i++) {
      var tMs = startTimeMs + i * stepMin * 60 * 1000;
      var date = new Date(tMs);
      var gmst = satellite.gstime(date);

      var posAndVel = satellite.propagate(satrec, date);
      var posEci = posAndVel ? posAndVel.position : null;
      var velEci = posAndVel ? posAndVel.velocity : null;

      if (!posEci || typeof posEci === 'boolean' || isNaN(posEci.x) || !velEci || typeof velEci === 'boolean') {
        continue;
      }

      var lookAngles = satellite.ecfToLookAngles(obsGd, satellite.eciToEcf(posEci, gmst));
      var elDeg = (lookAngles.elevation * 180) / Math.PI;
      var azDeg = (lookAngles.azimuth * 180) / Math.PI;
      var slantRangeKm = lookAngles.rangeSat;

      var posGd = satellite.eciToGeodetic(posEci, gmst);
      var satLat = satellite.degreesLat(posGd.latitude);
      var satLon = satellite.degreesLong(posGd.longitude);
      if (satLon > 180) satLon -= 360;
      if (satLon < -180) satLon += 360;
      var altKm = posGd.height;
      var velKms = Math.sqrt(velEci.x * velEci.x + velEci.y * velEci.y + velEci.z * velEci.z);

      var yearDay = Math.floor((date.getTime() - new Date(Date.UTC(date.getUTCFullYear(), 0, 0)).getTime()) / (24 * 3600 * 1000));
      var meanAnomalySun = ((357.529 + 0.98560028 * yearDay) * Math.PI) / 180;
      var sunLon = ((280.459 + 0.98564736 * yearDay + 1.915 * Math.sin(meanAnomalySun)) * Math.PI) / 180;
      var obliq = (23.439 * Math.PI) / 180;
      var sunUnitX = Math.cos(sunLon);
      var sunUnitY = Math.cos(obliq) * Math.sin(sunLon);
      var sunUnitZ = Math.sin(obliq) * Math.sin(sunLon);
      var AU_KM = 149597870.7;
      var sunEci = {
        x: sunUnitX * AU_KM,
        y: sunUnitY * AU_KM,
        z: sunUnitZ * AU_KM
      };

      var obsSunAngles = satellite.ecfToLookAngles(obsGd, satellite.eciToEcf(sunEci, gmst));
      var obsSunElDeg = (obsSunAngles.elevation * 180) / Math.PI;
      var isObserverInDarkness = obsSunElDeg < -6.0;

      var projAntiSun = -(posEci.x * sunUnitX + posEci.y * sunUnitY + posEci.z * sunUnitZ);
      var earthRadiusKm = 6371;
      var isSunlit = true;
      if (projAntiSun > 0) {
        var satDistSq = posEci.x * posEci.x + posEci.y * posEci.y + posEci.z * posEci.z;
        var distSqToAxis = satDistSq - projAntiSun * projAntiSun;
        if (distSqToAxis < earthRadiusKm * earthRadiusKm) {
          isSunlit = false;
        }
      }

      var satSunVec = {
        x: sunEci.x - posEci.x,
        y: sunEci.y - posEci.y,
        z: sunEci.z - posEci.z
      };
      var sunDist = Math.sqrt(satSunVec.x * satSunVec.x + satSunVec.y * satSunVec.y + satSunVec.z * satSunVec.z);
      var satDist = Math.sqrt(posEci.x * posEci.x + posEci.y * posEci.y + posEci.z * posEci.z);
      var dot = (posEci.x * satSunVec.x + posEci.y * satSunVec.y + posEci.z * satSunVec.z) / (satDist * sunDist);
      var phaseAngleRad = Math.acos(Math.max(-1, Math.min(1, dot)));

      var phaseFunc = (Math.sin(phaseAngleRad) + (Math.PI - phaseAngleRad) * Math.cos(phaseAngleRad)) / Math.PI;
      var elClamped = Math.max(1, elDeg);
      var airmass = 1 / (Math.sin((elClamped * Math.PI) / 180) + 0.15 * Math.pow(elClamped + 3.885, -1.25));
      var extMag = 0.2 * Math.max(0, airmass - 1);
      var vmag = intrinsicMag - 15.75 + 5 * Math.log10(Math.max(100, slantRangeKm)) - 2.5 * Math.log10(Math.max(0.001, phaseFunc)) + extMag;
      var isVisible = isObserverInDarkness && isSunlit && elDeg >= 10.0 && vmag <= 4.5;

      var pt = {
        timeMs: tMs,
        timeLabel: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        azimuthDeg: Math.round(azDeg),
        elevationDeg: Math.round(elDeg),
        slantRangeKm: Math.round(slantRangeKm),
        altitudeKm: Math.round(altKm),
        velocityKms: Number(velKms.toFixed(2)),
        vmag: Number(vmag.toFixed(1)),
        sunlit: isSunlit,
        isVisible: isVisible,
        satLat: Number(satLat.toFixed(3)),
        satLon: Number(satLon.toFixed(3))
      };

      if (elDeg >= 5.0) {
        if (!inPass) inPass = true;
        currentPassPoints.push(pt);
      } else {
        if (inPass && currentPassPoints.length >= 1) {
          var fPass = finalizePassWorker(sat, currentPassPoints);
          if (fPass.maxElevationDeg >= 8) {
            passes.push(fPass);
          }
        }
        inPass = false;
        currentPassPoints = [];
      }
    }

    if (inPass && currentPassPoints.length >= 1) {
      var fPassEnd = finalizePassWorker(sat, currentPassPoints);
      if (fPassEnd.maxElevationDeg >= 8) {
        passes.push(fPassEnd);
      }
    }
  }

  passes.sort(function(a, b) {
    return a.startTimeMs - b.startTimeMs;
  });
  return passes;
}

function finalizePassWorker(sat, points) {
  var maxEl = 0;
  var peakMag = 99;
  var maxPt = points[0];
  var isEye = false;

  for (var i = 0; i < points.length; i++) {
    var pt = points[i];
    if (pt.elevationDeg > maxEl) {
      maxEl = pt.elevationDeg;
      maxPt = pt;
    }
    if (pt.vmag < peakMag) {
      peakMag = pt.vmag;
    }
    if (pt.isVisible) {
      isEye = true;
    }
  }

  var startPt = points[0];
  var endPt = points[points.length - 1];
  var durSec = points.length >= 2
    ? Math.max(60, Math.round((endPt.timeMs - startPt.timeMs) / 1000))
    : 180;
  var minsFromNow = Math.max(0, Math.round((startPt.timeMs - Date.now()) / 60000));

  return {
    id: sat.id * 1000000 + (startPt.timeMs % 1000000),
    satName: sat.name,
    noradId: sat.id,
    startTimeMs: startPt.timeMs,
    maxTimeMs: maxPt.timeMs,
    endTimeMs: endPt.timeMs,
    maxElevationDeg: Math.round(maxEl),
    peakVmag: peakMag === 99 ? 5.0 : peakMag,
    riseAzimuthDeg: startPt.azimuthDeg,
    setAzimuthDeg: endPt.azimuthDeg,
    durationSec: durSec,
    isVisibleToEye: isEye,
    minsFromNow: minsFromNow,
    points: points,
    line1: sat.line1,
    line2: sat.line2
  };
}

