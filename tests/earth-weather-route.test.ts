import assert from "node:assert/strict";
import test from "node:test";
import { createEarthWeatherHandler } from "../src/app/api/earth/weather/handler.ts";

const weather = {
  locationName: "Delhi, India",
  latitude: 28.61,
  longitude: 77.2,
  temperatureC: 31,
  cloudCoverPct: 20,
  humidityPct: 45,
  windSpeedKmh: 9,
  observedAt: "2026-07-20T12:00:00.000Z",
  timezone: "Asia/Kolkata",
};

test("Earth weather reference route preserves its successful response shape", async () => {
  const calls: unknown[] = [];
  const handler = createEarthWeatherHandler(async (input) => {
    calls.push(input);
    return weather;
  });
  const response = await handler(
    new Request("https://cosmos.example/api/earth/weather?lat=28.61&lon=77.20&name=Delhi%2C%20India"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: weather });
  assert.deepEqual(calls, [
    { latitude: 28.61, longitude: 77.2, locationName: "Delhi, India" },
  ]);
});

test("Earth weather reference route returns the standardized safe validation error", async () => {
  const handler = createEarthWeatherHandler(async () => weather);
  const response = await handler(
    new Request("https://cosmos.example/api/earth/weather?lat=invalid&lon=77.20", {
      headers: { "x-request-id": "req-weather" },
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "VALIDATION_ERROR",
      message: "A valid latitude and longitude are required.",
      requestId: "req-weather",
      retryable: false,
    },
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("Earth weather reference route rejects unexpected query fields", async () => {
  const handler = createEarthWeatherHandler(async () => weather);
  const response = await handler(
    new Request("https://cosmos.example/api/earth/weather?lat=28.61&lon=77.20&debug=true"),
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("Earth weather provider failure keeps the existing graceful data fallback", async () => {
  const handler = createEarthWeatherHandler(
    async () => {
      throw new Error("provider body must not escape");
    },
    () => new Date("2026-07-20T12:30:00.000Z"),
  );
  const response = await handler(
    new Request("https://cosmos.example/api/earth/weather?lat=28.61&lon=77.20&name=Delhi"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data, {
    status: "unavailable",
    locationName: "Delhi",
    temperatureC: null,
    cloudCoverPct: null,
    humidityPct: null,
    windSpeedKmh: null,
    observedAt: "2026-07-20T12:30:00.000Z",
    timezone: "Unavailable",
    isFallback: true,
    message: "Weather signal temporarily unavailable",
  });
  assert.doesNotMatch(JSON.stringify(body), /provider body/);
});
