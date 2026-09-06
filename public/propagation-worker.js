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
  }
};
