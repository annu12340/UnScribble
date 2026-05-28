const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
loadDotEnv(path.join(ROOT, ".env"));

const config = require("./agents/config");
const log = require("./agents/logger");
const { AGENT_MANIFEST, runWorkflow } = require("./agents/orchestrator");
const { initSseResponse, writeSse } = require("./agents/sse");
const { formularySize } = require("./agents/formulary");

const PUBLIC_DIR = path.join(ROOT, "public");
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
    "script-src 'self' https://apis.google.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "connect-src 'self' https://accounts.google.com https://www.googleapis.com",
    "frame-src https://accounts.google.com",
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

const server = http.createServer(async (req, res) => {
  try {
    applySecurityHeaders(res);
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && requestUrl.pathname === "/api/config") {
      sendJson(res, 200, {
        configured: Boolean(config.apiKey),
        model: config.model,
        provider: "nvidia-nim",
        maxImageBytes: MAX_IMAGE_BYTES,
        workflow: true,
        agents: AGENT_MANIFEST,
        mock: config.mock,
        googleCalendar: {
          enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_API_KEY),
          clientId: process.env.GOOGLE_CLIENT_ID || "",
          apiKey: process.env.GOOGLE_API_KEY || ""
        }
      });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/decode/stream") {
      await handleDecodeStream(req, res);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/decode") {
      await handleDecodeBatch(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      // Redirect root to upload page
      if (requestUrl.pathname === "/") {
        res.writeHead(302, { Location: "/upload.html" });
        res.end();
        return;
      }
      await serveStatic(req, res, requestUrl.pathname);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      error: statusCode >= 500 ? "Server error" : error.message,
      detail: statusCode >= 500 ? error.message : undefined
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Prescription OCR running at http://localhost:${PORT}`);
  console.log(`Workflow: multi-agent SSE · formulary entries: ${formularySize}`);
  if (config.mock) console.log("WORKFLOW_MOCK=1 — using fixture agent outputs");
  if (!config.apiKey) {
    console.log("NVIDIA_API_KEY is not set. Add it to .env before decoding prescriptions.");
  }
});

async function handleDecodeStream(req, res) {
  if (!config.apiKey && !config.mock) {
    sendJson(res, 500, {
      error: "NVIDIA_API_KEY is not configured",
      detail: "Set NVIDIA_API_KEY in .env or WORKFLOW_MOCK=1 for local testing."
    });
    return;
  }

  const body = await readJson(req);
  try {
    validateDecodeBody(body);
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message });
    return;
  }

  initSseResponse(res);
  log.info("http", "POST /api/decode/stream", {
    fileName: body.fileName,
    enhancementMode: body.enhancementMode
  });

  try {
    await runWorkflow(body, (event, data) => {
      log.debug("sse", event, data.id || data.workflowId || "");
      writeSse(res, event, data);
    });
    log.info("http", "SSE stream finished");
    res.end();
  } catch (error) {
    log.error("http", "SSE stream error", { message: error.message, agentId: error.agentId });
    writeSse(res, "workflow.error", {
      message: error.detail || error.message,
      agentId: error.agentId || null
    });
    res.end();
  }
}

async function handleDecodeBatch(req, res) {
  if (!config.apiKey && !config.mock) {
    sendJson(res, 500, {
      error: "NVIDIA_API_KEY is not configured",
      detail: "Set NVIDIA_API_KEY in .env or WORKFLOW_MOCK=1 for local testing."
    });
    return;
  }

  const body = await readJson(req);
  try {
    validateDecodeBody(body);
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message });
    return;
  }

  log.info("http", "POST /api/decode", {
    fileName: body.fileName,
    enhancementMode: body.enhancementMode
  });

  const events = [];
  try {
    const { result, workflow } = await runWorkflow(body, (event, data) => {
      log.debug("http", `batch event · ${event}`, data.id || "");
      events.push({ event, data });
    });
    log.info("http", "batch decode complete", { totalMs: workflow?.totalMs });
    sendJson(res, 200, {
      result,
      workflow,
      events,
      model: config.model,
      decodedAt: new Date().toISOString()
    });
  } catch (error) {
    log.error("http", "batch decode failed", { message: error.message, agentId: error.agentId });
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      error: statusCode >= 500 ? "Decoding failed" : error.message,
      detail: error.detail || error.message,
      events,
      agentId: error.agentId || null
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
  const decodedPath = decodeURIComponent(safePath);
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

  const type = mimeTypes[path.extname(resolved.filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": resolved.stat.size,
    "Cache-Control": type.includes("html") ? "no-store" : "public, max-age=3600"
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(resolved.filePath).pipe(res);
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
