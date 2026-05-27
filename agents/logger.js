"use strict";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const threshold =
  LEVELS[String(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info;

function enabled() {
  return process.env.WORKFLOW_LOG !== "0";
}

function ts() {
  return new Date().toISOString();
}

function formatMeta(meta) {
  if (meta == null) return "";
  if (typeof meta === "string") return ` ${meta}`;
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [meta unserializable]";
  }
}

function log(level, scope, message, meta) {
  if (!enabled()) return;
  if (LEVELS[level] < threshold) return;
  const line = `[${ts()}] [${scope}] ${message}${formatMeta(meta)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

module.exports = {
  debug: (scope, message, meta) => log("debug", scope, message, meta),
  info: (scope, message, meta) => log("info", scope, message, meta),
  warn: (scope, message, meta) => log("warn", scope, message, meta),
  error: (scope, message, meta) => log("error", scope, message, meta)
};
