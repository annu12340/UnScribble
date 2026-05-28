"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { cacheControlFor, contentTypeFor, entityTagFor, resolveStaticFile } = require("../server");

describe("static route helpers", () => {
  it("resolves moved browser assets under public/js", async () => {
    const resolved = await resolveStaticFile("/js/pages/upload.js");

    assert.ok(resolved.filePath.endsWith(path.join("public", "js", "pages", "upload.js")));
    assert.equal(contentTypeFor(resolved.filePath), "text/javascript; charset=utf-8");
    assert.match(cacheControlFor(resolved.filePath), /max-age=86400/);
    assert.match(entityTagFor(resolved.stat), /^"[0-9a-f]+-[0-9a-f]+"$/);
  });

  it("keeps HTML uncached and blocks path traversal", async () => {
    const html = await resolveStaticFile("/landing.html");
    assert.equal(cacheControlFor(html.filePath), "no-store");

    const forbidden = await resolveStaticFile("/../server.js");
    assert.equal(forbidden.forbidden, true);
  });
});
