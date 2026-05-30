const fs = require("node:fs");
const fsp = require("node:fs/promises");
const crypto = require("node:crypto");
const http = require("node:http");
const path = require("node:path");
const zlib = require("node:zlib");
const { URL } = require("node:url");

const ROOT = __dirname;
loadDotEnv(path.join(ROOT, ".env"));

const config = require("./agents/config");
const log = require("./agents/logger");
const { AGENT_MANIFEST, runWorkflow } = require("./agents/orchestrator");
const { initSseResponse, writeSse } = require("./agents/sse");
const { formularySize } = require("./agents/formulary");
const { predictProteinMechanism } = require("./agents/features/protein-mechanism");
const { getMedicationInsights } = require("./agents/features/medication-insights");

const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const SAMPLES_DIR = path.join(ROOT, "samples");
const SAMPLE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Gzip text assets when the client supports it and the file is big enough to be worth it.
const COMPRESSIBLE_EXTENSIONS = new Set([".html", ".css", ".js", ".json", ".svg"]);
const GZIP_MIN_BYTES = 1024;

const PORT = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "connect-src 'self' https://accounts.google.com https://www.googleapis.com https://content.googleapis.com",
    "frame-src https://accounts.google.com https://content.googleapis.com",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY"
};

function applySecurityHeaders(res) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
}

function createAppServer() {
  return http.createServer(async (req, res) => {
    try {
      applySecurityHeaders(res);
      const requestId = requestIdFor(req);
      req.requestId = requestId;
      res.setHeader("X-Request-ID", requestId);
      const requestUrl = new URL(req.url, `http://${req.headers.host}`);

      // API routes
      if (req.method === "GET" && requestUrl.pathname === "/api/config") {
        return sendJson(res, 200, {
          configured: Boolean(config.apiKey),
          model: config.model,
          provider: "nvidia-nim",
          maxImageBytes: MAX_IMAGE_BYTES,
          workflow: true,
          agents: AGENT_MANIFEST,
          mock: config.mock,
          googleCalendar: {
            enabled: Boolean(process.env.GOOGLE_CLIENT_ID),
            clientId: process.env.GOOGLE_CLIENT_ID || ""
          }
        });
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/decode/stream") {
        return await handleDecodeStream(req, res);
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/decode") {
        return await handleDecodeBatch(req, res);
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/protein-mechanism") {
        return await handleProteinMechanism(req, res);
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/medication-insights") {
        return await handleMedicationInsights(req, res);
      }

      if (
        (req.method === "GET" || req.method === "HEAD") &&
        requestUrl.pathname === "/data/drug-body-effects.json"
      ) {
        return await serveDataFile(req, res, "drug-body-effects.json");
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/samples") {
        return await handleListSamples(res);
      }

      if (
        (req.method === "GET" || req.method === "HEAD") &&
        requestUrl.pathname.startsWith("/samples/")
      ) {
        const fileName = decodeURIComponent(requestUrl.pathname.slice("/samples/".length));
        return await serveSampleFile(req, res, fileName);
      }

      // Static file routes
      if (req.method === "GET" || req.method === "HEAD") {
        if (requestUrl.pathname === "/") {
          res.writeHead(302, { Location: "/landing.html" });
          res.end();
          return;
        }
        return await serveStatic(req, res, requestUrl.pathname);
      }

      sendJson(res, 405, { error: "Method not allowed" });
    } catch (error) {
      log.error("http", "request error", {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        message: error.message
      });
      const statusCode = error.statusCode || 500;
      sendJson(res, statusCode, {
        error: statusCode >= 500 ? "Server error" : error.message,
        detail: statusCode >= 500 ? error.message : undefined
      });
    }
  });
}

if (require.main === module) {
  const server = createAppServer();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`UnScribble running at http://localhost:${PORT}`);
    console.log(`Workflow: multi-agent SSE · formulary entries: ${formularySize}`);
    if (config.mock) console.log("WORKFLOW_MOCK=1 — using fixture agent outputs");
    if (!config.apiKey) {
      console.log("NVIDIA_API_KEY is not set. Add it to .env before decoding prescriptions.");
    }
  });
}

function requestIdFor(req) {
  const incoming = String(req.headers["x-request-id"] || "").trim();
  if (/^[A-Za-z0-9._:-]{8,128}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}

async function handleDecodeStream(req, res) {
  if (!config.apiKey && !config.mock) {
    return sendJson(res, 500, {
      error: "NVIDIA_API_KEY is not configured",
      detail: "Set NVIDIA_API_KEY in .env or WORKFLOW_MOCK=1 for local testing."
    });
  }

  let body;
  try {
    body = await readJson(req);
    validateDecodeBody(body);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message });
  }

  initSseResponse(res);
  log.info("http", "POST /api/decode/stream", {
    requestId: req.requestId,
    fileName: body.fileName,
    enhancementMode: body.enhancementMode
  });

  try {
    await runWorkflow(
      body,
      (event, data) => {
        log.debug("sse", event, data.id || data.workflowId || "");
        writeSse(res, event, { requestId: req.requestId, ...data });
      },
      { requestId: req.requestId }
    );
    log.info("http", "SSE stream finished", { requestId: req.requestId });
    res.end();
  } catch (error) {
    log.error("http", "SSE stream error", {
      requestId: req.requestId,
      message: error.message,
      agentId: error.agentId
    });
    writeSse(res, "workflow.error", {
      requestId: req.requestId,
      message: error.detail || error.message,
      agentId: error.agentId || null
    });
    res.end();
  }
}

async function handleDecodeBatch(req, res) {
  if (!config.apiKey && !config.mock) {
    return sendJson(res, 500, {
      error: "NVIDIA_API_KEY is not configured",
      detail: "Set NVIDIA_API_KEY in .env or WORKFLOW_MOCK=1 for local testing."
    });
  }

  let body;
  try {
    body = await readJson(req);
    validateDecodeBody(body);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message });
  }

  log.info("http", "POST /api/decode", {
    requestId: req.requestId,
    fileName: body.fileName,
    enhancementMode: body.enhancementMode
  });

  const events = [];
  try {
    const { result, workflow } = await runWorkflow(
      body,
      (event, data) => {
        log.debug("http", `batch event · ${event}`, data.id || "");
        events.push({ event, data: { requestId: req.requestId, ...data } });
      },
      { requestId: req.requestId }
    );
    log.info("http", "batch decode complete", {
      requestId: req.requestId,
      totalMs: workflow?.totalMs
    });
    return sendJson(res, 200, {
      requestId: req.requestId,
      result,
      workflow,
      events,
      model: config.model,
      decodedAt: new Date().toISOString()
    });
  } catch (error) {
    log.error("http", "batch decode failed", {
      requestId: req.requestId,
      message: error.message,
      agentId: error.agentId
    });
    const statusCode = error.statusCode || 500;
    return sendJson(res, statusCode, {
      requestId: req.requestId,
      error: statusCode >= 500 ? "Decoding failed" : error.message,
      detail: error.detail || error.message,
      events,
      agentId: error.agentId || null
    });
  }
}

async function handleProteinMechanism(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message });
  }

  const medication = String(body.medication || "").trim();
  if (!medication) {
    return sendJson(res, 400, { error: "Medication name is required" });
  }

  log.info("http", "POST /api/protein-mechanism", { requestId: req.requestId, medication });

  try {
    const result = await predictProteinMechanism(medication);
    return sendJson(res, 200, result);
  } catch (error) {
    log.error("http", "protein mechanism failed", {
      requestId: req.requestId,
      medication,
      message: error.message
    });
    return sendJson(res, error.statusCode || 500, {
      error: "Failed to predict protein mechanism",
      detail: error.message
    });
  }
}

async function handleMedicationInsights(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message });
  }

  const medication = String(body.medication_name || "").trim();
  const rawText = String(body.raw_text || "").trim();
  if (!medication && !rawText) {
    return sendJson(res, 400, { error: "Medication name or raw_text is required" });
  }

  log.info("http", "POST /api/medication-insights", {
    requestId: req.requestId,
    medication,
    rawText: Boolean(rawText)
  });

  try {
    const result = await getMedicationInsights(medication, rawText);
    return sendJson(res, 200, result);
  } catch (error) {
    log.error("http", "medication insights failed", {
      requestId: req.requestId,
      medication,
      message: error.message
    });
    return sendJson(res, error.statusCode || 500, {
      error: "Failed to load medication insights",
      detail: error.message
    });
  }
}

function validateDecodeBody(body) {
  const imageDataUrl = String(body.imageDataUrl || "");
  validateImageDataUrl(imageDataUrl);
  const originalImageDataUrl = body.originalImageDataUrl ? String(body.originalImageDataUrl) : "";
  if (originalImageDataUrl) validateImageDataUrl(originalImageDataUrl);
}

function validateImageDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    const error = new Error("Upload a PNG, JPG, JPEG, or WEBP image.");
    error.statusCode = 400;
    throw error;
  }
  const base64 = match[2];
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    const error = new Error("Image is too large after processing. Use a clearer crop under 10 MB.");
    error.statusCode = 413;
    throw error;
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let tooLarge = false;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        tooLarge = true;
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        const error = new Error("Request body must be valid JSON.");
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

async function resolveStaticFile(pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(safePath);
  } catch {
    return { missing: true };
  }
  const filePath = path.normalize(path.join(PUBLIC_DIR, decodedPath));

  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    return { forbidden: true };
  }

  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      const indexStat = await fsp.stat(indexPath).catch(() => null);
      if (indexStat && indexStat.isFile()) return { filePath: indexPath, stat: indexStat };
      return { missing: true };
    }
    return { filePath, stat };
  } catch {
    return { missing: true };
  }
}

async function serveDataFile(req, res, fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const stat = await fsp.stat(filePath).catch(() => null);
  if (!stat?.isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  sendFile(req, res, filePath, stat, "no-store");
}

async function listSampleImages() {
  const entries = await fsp.readdir(SAMPLES_DIR, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => {
      if (!entry.isFile()) return false;
      return SAMPLE_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
    })
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

async function handleListSamples(res) {
  const names = await listSampleImages();
  sendJson(res, 200, {
    samples: names.map((name) => ({
      name,
      url: `/samples/${encodeURIComponent(name)}`,
      label: formatSampleLabel(name)
    }))
  });
}

function formatSampleLabel(fileName) {
  const base = path.basename(fileName, path.extname(fileName));
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

async function serveSampleFile(req, res, fileName) {
  const safeName = path.basename(String(fileName || ""));
  if (!safeName || safeName !== fileName) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  const ext = path.extname(safeName).toLowerCase();
  if (!SAMPLE_IMAGE_EXTENSIONS.has(ext)) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const filePath = path.join(SAMPLES_DIR, safeName);
  if (!filePath.startsWith(SAMPLES_DIR + path.sep)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  const stat = await fsp.stat(filePath).catch(() => null);
  if (!stat?.isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  sendFile(req, res, filePath, stat, "public, max-age=3600");
}

async function serveStatic(req, res, pathname) {
  let resolved = await resolveStaticFile(pathname);

  if (resolved.forbidden) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  if (resolved.missing) {
    const indexPath = path.join(PUBLIC_DIR, "index.html");
    const indexStat = await fsp.stat(indexPath).catch(() => null);
    if (!indexStat) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    resolved = { filePath: indexPath, stat: indexStat };
  }

  const cacheControl = cacheControlFor(resolved.filePath);
  sendFile(req, res, resolved.filePath, resolved.stat, cacheControl);
}

function contentTypeFor(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function cacheControlFor(filePath) {
  const type = contentTypeFor(filePath);
  if (type.includes("html")) return "no-store";
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".js" || ext === ".css") {
    return "public, max-age=86400, stale-while-revalidate=604800";
  }
  return "public, max-age=3600";
}

function entityTagFor(stat, suffix = "") {
  return `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}${suffix}"`;
}

function acceptsGzip(req) {
  return /\bgzip\b/.test(req.headers["accept-encoding"] || "");
}

function isFresh(req, stat, etag) {
  const ifNoneMatch = req.headers["if-none-match"];
  if (
    ifNoneMatch &&
    ifNoneMatch
      .split(",")
      .map((value) => value.trim())
      .includes(etag)
  ) {
    return true;
  }

  const ifModifiedSince = req.headers["if-modified-since"];
  if (!ifModifiedSince) return false;
  const sinceMs = Date.parse(ifModifiedSince);
  if (Number.isNaN(sinceMs)) return false;
  return Math.floor(stat.mtimeMs / 1000) * 1000 <= sinceMs;
}

function sendFile(req, res, filePath, stat, cacheControl) {
  const type = contentTypeFor(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const compressible = COMPRESSIBLE_EXTENSIONS.has(ext);
  const useGzip =
    compressible && req.method !== "HEAD" && stat.size >= GZIP_MIN_BYTES && acceptsGzip(req);
  const etag = entityTagFor(stat, useGzip ? "-gz" : "");
  const lastModified = stat.mtime.toUTCString();

  if (compressible) res.setHeader("Vary", "Accept-Encoding");

  if (isFresh(req, stat, etag)) {
    res.writeHead(304, {
      ETag: etag,
      "Last-Modified": lastModified,
      "Cache-Control": cacheControl
    });
    res.end();
    return;
  }

  const headers = {
    "Content-Type": type,
    "Cache-Control": cacheControl,
    ETag: etag,
    "Last-Modified": lastModified
  };
  // Compressed length is unknown up front; only set Content-Length for identity responses.
  if (useGzip) headers["Content-Encoding"] = "gzip";
  else headers["Content-Length"] = stat.size;

  res.writeHead(200, headers);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  if (useGzip) fileStream.pipe(zlib.createGzip()).pipe(res);
  else fileStream.pipe(res);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

module.exports = {
  createAppServer,
  cacheControlFor,
  contentTypeFor,
  entityTagFor,
  resolveStaticFile,
  listSampleImages,
  formatSampleLabel
};
