importScripts('/satellite.min.js');

var satellites = [];

self.onmessage = function(e) {
  var msg = e.data;
  if (msg.type === 'init') {
    satellites = msg.data.map(function(item) {
      try {
        return {
          id: item.id,
          name: item.name,
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
          
          // Map longitude to standard [-180, 180] bounds
          var lonDeg = satellite.degreesLong(posGd.longitude);
          if (lonDeg > 180) lonDeg -= 360;
          if (lonDeg < -180) lonDeg += 360;
          buffer[idx + 5] = lonDeg;

          buffer[idx + 6] = posGd.height; // altitude in km

          if (velEci && typeof velEci !== 'boolean') {
            var vx = velEci.x;
            var vy = velEci.y;
            var vz = velEci.z;
            buffer[idx + 7] = Math.sqrt(vx * vx + vy * vy + vz * vz); // in km/s
          } else {
            buffer[idx + 7] = 0;
          }
        } else {
          buffer[idx + 1] = NaN; // flag failed propagation
        }
      } catch (err) {
        buffer[idx + 1] = NaN;
      }
    }

    self.postMessage({ type: 'positions', buffer: buffer }, [buffer.buffer]);
  }
};
