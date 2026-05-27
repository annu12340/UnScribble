"use strict";

const crypto = require("node:crypto");

const CACHE = new Map();
const MAX_ENTRIES = 16;
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function ttlMs() {
  const fromEnv = Number(process.env.WORKFLOW_CACHE_TTL_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_TTL_MS;
}

function cacheKey(body) {
  return crypto
    .createHash("sha256")
    .update(`${body.imageDataUrl || ""}|${body.originalImageDataUrl || ""}`)
    .digest("hex");
}

function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > ttlMs()) {
    CACHE.delete(key);
    return null;
  }
  CACHE.delete(key);
  CACHE.set(key, entry);
  return entry.value;
}

function setCached(key, value) {
  if (CACHE.has(key)) CACHE.delete(key);
  CACHE.set(key, { value, storedAt: Date.now() });
  while (CACHE.size > MAX_ENTRIES) {
    const oldest = CACHE.keys().next().value;
    CACHE.delete(oldest);
  }
}

function cacheEnabled() {
  return process.env.WORKFLOW_CACHE_DISABLE !== "1";
}

module.exports = {
  cacheKey,
  getCached,
  setCached,
  cacheEnabled
};
