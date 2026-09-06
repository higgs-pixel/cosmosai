importScripts('/satellite.min.js');

var satellites = [];

self.onmessage = function(e) {
  var msg = e.data;
  if (!msg) return;

  if (msg.type === 'init') {
    satellites = (msg.data || []).map(function(item) {
      try {
        return {
          id: item.id,
          name: item.name,
          category: item.category || 'Active',
          orbitClass: item.orbitClass || 'LEO',
          line1: item.line1,
          line2: item.line2,
          satrec: satellite.twoline2satrec(item.line1, item.line2)
        };
      } catch (err) {
        return null;
      }
    }).filter(Boolean);
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

    var aboveHorizon = [];

    for (var j = 0; j < satellites.length; j++) {
      var s = satellites[j];
      try {
        var pv = satellite.propagate(s.satrec, vDate);
        var pEci = pv.position;
        if (!pEci || typeof pEci === 'boolean' || isNaN(pEci.x)) continue;

        var pEcf = satellite.eciToEcf(pEci, vGmst);

        // Vector from observer to satellite in ECF:
        var dx = pEcf.x - obsX;
        var dy = pEcf.y - obsY;
        var dz = pEcf.z - obsZ;

        // Blazing-fast Horizon Tangent Plane Early Exit:
        // (r_sat - R_obs) . Zenith
        // If projection along local Zenith normal is less than -250 km,
        // the satellite is geometrically below the horizon (occulted by Earth).
        var dotZenith = dx * zenX + dy * zenY + dz * zenZ;
        if (dotZenith < -250) {
          continue; // Early exit in 2 arithmetic operations!
        }

        // Full Topocentric Look Angles
        var look = satellite.ecfToLookAngles(obsGd, pEcf);
        var elDeg = look.elevation * (180 / Math.PI);

        // Keep all satellites that are above horizon (or approaching within -5°)
        if (elDeg < -5) continue;

        var azDeg = (look.azimuth * (180 / Math.PI) + 360) % 360;
        var slantKm = Math.round(look.rangeSat);

        // Subpoint Geodetics
        var posGd = satellite.eciToGeodetic(pEci, vGmst);
        var sLat = satellite.degreesLat(posGd.latitude);
        var sLon = satellite.degreesLong(posGd.longitude);
        if (sLon > 180) sLon -= 360;
        if (sLon < -180) sLon += 360;
        var sAlt = Math.round(posGd.height);

        // Earth shadow (umbra) check
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

        // Photometric magnitude
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
          satLat: Math.round(sLat * 1000) / 1000,
          satLon: Math.round(sLon * 1000) / 1000,
          satAltKm: sAlt,
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

    // Sort by elevation descending
    aboveHorizon.sort(function(a, b) {
      return b.elevationDeg - a.elevationDeg;
    });

    self.postMessage({
      type: 'visibility_results',
      results: aboveHorizon,
      timeMs: vTimeMs
    });
  }
};
