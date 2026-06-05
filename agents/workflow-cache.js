"use strict";

const crypto = require("node:crypto");
const log = require("./logger");

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 16;
const REDIS_KEY_PREFIX = "unscribble:decode:";

// -- Optional Redis client (requires ioredis: npm install ioredis) --
let redis = null;

if (process.env.REDIS_URL) {
  try {
    const Redis = require("ioredis");
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });
    redis.on("error", (err) => {
      log.warn("cache", "Redis error; falling back to in-memory", {
        message: err.message,
      });
    });
    const sanitized = process.env.REDIS_URL.replace(/:\/\/[^@]+@/, "://***@");
    log.info("cache", "Redis shared cache enabled", { url: sanitized });
  } catch {
    log.warn(
      "cache",
      "ioredis not installed; using in-memory cache (run: npm install ioredis)",
    );
  }
}

// -- In-memory LRU (always available as fallback) --
const MEMORY_CACHE = new Map();

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

async function getCached(key) {
  if (redis) {
    try {
      const raw = await redis.get(REDIS_KEY_PREFIX + key);
      if (raw) return JSON.parse(raw);
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }

  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > ttlMs()) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  // LRU: move to end
  MEMORY_CACHE.delete(key);
  MEMORY_CACHE.set(key, entry);
  return entry.value;
}

async function setCached(key, value) {
  if (redis) {
    try {
      const ttl = Math.ceil(ttlMs() / 1000);
      await redis.set(REDIS_KEY_PREFIX + key, JSON.stringify(value), "EX", ttl);
      return;
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }

  if (MEMORY_CACHE.has(key)) MEMORY_CACHE.delete(key);
  MEMORY_CACHE.set(key, { value, storedAt: Date.now() });
  while (MEMORY_CACHE.size > MAX_ENTRIES) {
    const oldest = MEMORY_CACHE.keys().next().value;
    MEMORY_CACHE.delete(oldest);
  }
}

function cacheEnabled() {
  return process.env.WORKFLOW_CACHE_DISABLE !== "1";
}

module.exports = {
  cacheKey,
  getCached,
  setCached,
  cacheEnabled,
};
