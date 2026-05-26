"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const { scenarios: seedScenarios } = require("./app.js");

const ROOT = __dirname;
const DEFAULT_PORT = Number(process.env.PORT || 4173);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const clients = new Set();
let scenarios = clone(seedScenarios);
let loopTimer = null;

const runtime = {
  scenarioId: scenarios[0].id,
  forecastIndex: 0,
  cycle: 0,
  live: true,
  speed: 1600,
  loop: [],
  updatedAt: new Date().toISOString(),
};

runCycle("initial");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/state") {
      return sendJson(res, 200, snapshot());
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, mode: "dynamic", updatedAt: runtime.updatedAt });
    }

    if (req.method === "GET" && url.pathname === "/events") {
      return openEventStream(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/cycle") {
      runCycle("manual");
      return sendJson(res, 200, snapshot());
    }

    if (req.method === "POST" && url.pathname === "/api/scenario") {
      const body = await readJson(req);
      switchScenario(body.scenarioId);
      return sendJson(res, 200, snapshot());
    }

    if (req.method === "POST" && url.pathname === "/api/live") {
      const body = await readJson(req);
      runtime.live = Boolean(body.live);
      scheduleLoop();
      touch();
      broadcast();
      return sendJson(res, 200, snapshot());
    }

    if (req.method === "POST" && url.pathname === "/api/speed") {
      const body = await readJson(req);
      runtime.speed = clampNumber(Number(body.speed || runtime.speed), 500, 6000);
      scheduleLoop();
      touch();
      broadcast();
      return sendJson(res, 200, snapshot());
    }

    if (req.method === "POST" && url.pathname === "/api/report") {
      const body = await readJson(req);
      addReport(body);
      return sendJson(res, 200, snapshot());
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(url.pathname, req, res);
    }

    sendJson(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    sendJson(res, 500, { error: "server_error", message: error.message });
  }
});

startServer(DEFAULT_PORT);

function startServer(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port < DEFAULT_PORT + 20) {
      startServer(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    scheduleLoop();
    console.log(`Climate Incident Command Center running at http://localhost:${port}`);
  });
}

function switchScenario(scenarioId) {
  const seed = seedScenarios.find((scenario) => scenario.id === scenarioId);
  if (!seed) return;

  const index = scenarios.findIndex((scenario) => scenario.id === scenarioId);
  if (index >= 0) scenarios[index] = clone(seed);
  runtime.scenarioId = scenarioId;
  runtime.forecastIndex = 0;
  runtime.cycle = 0;
  runtime.loop = [];
  runCycle("scenario");
}

function scheduleLoop() {
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
  if (!runtime.live) return;
  loopTimer = setInterval(() => runCycle("auto"), runtime.speed);
}

function runCycle(source) {
  const scenario = currentScenario();
  if (!scenario) return;

  if (source !== "initial" && source !== "scenario") {
    runtime.forecastIndex = (runtime.forecastIndex + 1) % scenario.forecasts.length;
  }
  runtime.cycle += 1;

  mutateScenario(scenario, source);

  const forecast = currentForecast();
  const criticalDamage = scenario.damage.filter((item) => item.severity === "critical").length;
  const closedRoads = scenario.roads.filter((road) => road.status === "closed").length;
  const highCalls = scenario.calls.filter((call) => ["critical", "high"].includes(call.severity)).length;
  const topRoute = scenario.routes[(runtime.cycle - 1) % scenario.routes.length];

  runtime.loop.unshift({
    cycle: runtime.cycle,
    lead: forecast.lead,
    title: `${scenario.trigger}: ${scenario.place}`,
    actions: [
      `${scenario.type === "earthquake" ? "USGS/Earth-2" : "Earth-2"} risk ${forecast.risk}% with ${forecast.confidence}% confidence`,
      `Vision triage marked ${criticalDamage} critical scenes and ${closedRoads} closed roads`,
      `cuOpt refreshed ${topRoute.name} toward ${topRoute.to} in ${topRoute.eta} min`,
      `Nemotron refreshed ${scenario.type} alert text and responder brief`,
      `ASR escalated ${highCalls} high-priority calls for dispatch review`,
    ],
  });

  runtime.loop = runtime.loop.slice(0, 8);
  touch();
  broadcast();
}

function mutateScenario(scenario, source) {
  const seed = seedScenarios.find((item) => item.id === scenario.id) || scenario;
  const forecast = currentForecast();
  const seedForecast = seed.forecasts[runtime.forecastIndex] || forecast;
  const riskPressure = forecast.risk >= 88 ? 1 : forecast.risk >= 70 ? 0 : -1;
  const wave = Math.round(Math.sin(runtime.cycle / 3) * 3);

  forecast.risk = clampNumber(seedForecast.risk + wave + randomInt(-1, 3 + riskPressure), 35, 99);
  forecast.confidence = clampNumber(seedForecast.confidence + randomInt(-2, 2), 70, 99);
  forecast.wind = clampNumber(seedForecast.wind + randomInt(-2, 3), 0, 99);
  forecast.water = clampNumber(seedForecast.water + wave + randomInt(-2, 4 + riskPressure), 0, 99);

  scenario.tools = scenario.tools.map(([name, detail, health], index) => [
    name,
    detail,
    clampNumber((seed.tools[index] ? seed.tools[index][2] : health) + randomInt(-4, 4), 72, 99),
  ]);

  scenario.routes.forEach((route, index) => {
    const seedRoute = seed.routes[index] || route;
    const riskDelay = forecast.risk > 90 ? 8 : forecast.risk > 75 ? 4 : 0;
    route.eta = clampNumber(seedRoute.eta + riskDelay + randomInt(-4, 8), 8, 120);
    if (source === "auto" && forecast.risk > 90 && route.status === "queued") route.status = "active";
    if (source === "auto" && Math.random() > 0.82) route.status = route.status === "active" ? "rerouted" : "active";
  });

  if (source === "auto" && Math.random() > 0.58) {
    const shelter = scenario.shelters[randomInt(0, scenario.shelters.length - 1)];
    const intake = randomInt(8, 38);
    shelter.occupied = Math.min(shelter.capacity, shelter.occupied + intake);
    scenario.metrics.evacuees += intake;
  }

  if (source === "auto" && Math.random() > 0.68) {
    const hospital = scenario.hospitals[randomInt(0, scenario.hospitals.length - 1)];
    hospital.occupied = Math.min(hospital.capacity, hospital.occupied + randomInt(0, 2));
    hospital.status = hospital.capacity - hospital.occupied < 6 ? "surge" : hospital.status;
  }

  if (source === "auto" && runtime.cycle % 3 === 0) addSyntheticCall(scenario);
  if (source === "auto" && runtime.cycle % 5 === 0) addSyntheticDamage(scenario);
}

function addReport(report) {
  const scenario = currentScenario();
  if (!scenario) return;

  const type = normalizeChoice(report.type, ["call", "damage", "road", "shelter"], "call");
  const severity = normalizeChoice(report.severity, ["critical", "high", "medium", "low"], "high");
  const title = cleanText(report.title, "New field report", 70);
  const details = cleanText(report.details, "Responder submitted a new report.", 220);
  const language = cleanText(report.language, "English", 30);
  const point = randomIncidentPoint(scenario);

  if (type === "damage") {
    scenario.damage.unshift({
      name: title,
      source: "Field ingest",
      severity,
      confidence: 87,
      x: point.x,
      y: point.y,
      status: "Needs triage",
      need: "Dispatch review",
    });
    scenario.damage = scenario.damage.slice(0, 12);
  } else if (type === "road") {
    const road = scenario.roads.find((item) => item.status !== "closed") || scenario.roads[0];
    road.status = severity === "critical" ? "closed" : "restricted";
    scenario.damage.unshift({
      name: title,
      source: "Road ingest",
      severity,
      confidence: 90,
      x: point.x,
      y: point.y,
      status: `${road.name} marked ${road.status}`,
      need: "Traffic control",
    });
    scenario.damage = scenario.damage.slice(0, 12);
  } else if (type === "shelter") {
    const shelter = scenario.shelters[randomInt(0, scenario.shelters.length - 1)];
    const intake = severity === "critical" ? 110 : severity === "high" ? 70 : 35;
    shelter.occupied = Math.min(shelter.capacity, shelter.occupied + intake);
    scenario.metrics.evacuees += intake;
  } else {
    scenario.calls.unshift({
      name: title,
      language,
      severity,
      confidence: 91,
      x: point.x,
      y: point.y,
      transcript: details,
      status: severity === "critical" ? "Immediate dispatch" : "Dispatch review",
    });
    scenario.calls = scenario.calls.slice(0, 12);
  }

  runtime.loop.unshift({
    cycle: runtime.cycle,
    lead: currentForecast().lead,
    title: `Field ingest: ${scenario.place}`,
    actions: [
      `${type} report accepted with ${severity} priority`,
      "Vision, ASR, routing, and alert adapters queued for next cycle",
      details,
    ],
  });

  runtime.loop = runtime.loop.slice(0, 8);
  touch();
  broadcast();
}

function addSyntheticCall(scenario) {
  const point = randomIncidentPoint(scenario);
  const forecast = currentForecast();
  const severity = forecast.risk > 92 ? "critical" : "high";
  const byType = {
    flood: "Water rising around occupied structure",
    cyclone: "Storm surge evacuation transport needed",
    wildfire: "Resident reports flames visible behind homes",
    earthquake: "Entrapment and utility hazard reported",
  };
  scenario.calls.unshift({
    name: byType[scenario.type] || "Emergency assistance requested",
    language: ["English", "Spanish", "Hindi"][randomInt(0, 2)],
    severity,
    confidence: randomInt(82, 96),
    x: point.x,
    y: point.y,
    transcript: "Live simulated ASR intake from emergency channel.",
    status: severity === "critical" ? "Immediate dispatch" : "Dispatch review",
  });
  scenario.calls = scenario.calls.slice(0, 12);
}

function addSyntheticDamage(scenario) {
  const point = randomIncidentPoint(scenario);
  const byType = {
    flood: ["Flooded arterial detected", "Pump and barricade crew"],
    cyclone: ["Wind damage cluster detected", "USAR light team"],
    wildfire: ["Spot fire detected", "Engine company"],
    earthquake: ["Structural damage detected", "Search team"],
  };
  const [name, need] = byType[scenario.type] || ["New damage detected", "Field team"];
  scenario.damage.unshift({
    name,
    source: "Live Vision NIM",
    severity: currentForecast().risk > 90 ? "critical" : "high",
    confidence: randomInt(83, 97),
    x: point.x,
    y: point.y,
    status: "Needs triage",
    need,
  });
  scenario.damage = scenario.damage.slice(0, 12);
}

function snapshot() {
  return {
    mode: "dynamic",
    scenarioId: runtime.scenarioId,
    forecastIndex: runtime.forecastIndex,
    cycle: runtime.cycle,
    live: runtime.live,
    speed: runtime.speed,
    loop: runtime.loop,
    updatedAt: runtime.updatedAt,
    scenarios,
  };
}

function currentScenario() {
  return scenarios.find((scenario) => scenario.id === runtime.scenarioId) || scenarios[0];
}

function currentForecast() {
  const scenario = currentScenario();
  return scenario.forecasts[runtime.forecastIndex] || scenario.forecasts[0];
}

function openEventStream(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`);
  clients.add(res);
  req.on("close", () => clients.delete(res));
}

function broadcast() {
  const payload = `event: state\ndata: ${JSON.stringify(snapshot())}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

function serveStatic(pathname, req, res) {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relative);
  if (!(filePath === ROOT || filePath.startsWith(`${ROOT}${path.sep}`))) {
    return sendText(res, 403, "Forbidden");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) return sendText(res, 404, "Not found");
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    if (req.method === "HEAD") return res.end();
    res.end(data);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("request_too_large"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function touch() {
  runtime.updatedAt = new Date().toISOString();
}

function randomIncidentPoint(scenario) {
  const zone = scenario.zones[randomInt(0, scenario.zones.length - 1)] || { x: 50, y: 50 };
  return {
    x: clampNumber(Math.round(zone.x + randomInt(-7, 7)), 6, 94),
    y: clampNumber(Math.round(zone.y + randomInt(-7, 7)), 6, 94),
  };
}

function normalizeChoice(value, choices, fallback) {
  return choices.includes(value) ? value : fallback;
}

function cleanText(value, fallback, maxLength) {
  const text = String(value || fallback).replace(/\s+/g, " ").trim();
  return text.slice(0, maxLength);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

process.on("SIGTERM", () => {
  if (loopTimer) clearInterval(loopTimer);
  server.close(() => process.exit(0));
});
