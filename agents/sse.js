"use strict";

/**
 * Write a Server-Sent Event to the response stream
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} event - Event name
 * @param {object} data - Event data to be JSON stringified
 */
function writeSse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Initialize SSE response with proper headers
 * @param {http.ServerResponse} res - HTTP response object
 */
function initSseResponse(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write(": connected\n\n");
}

module.exports = {
  writeSse,
  initSseResponse
};
