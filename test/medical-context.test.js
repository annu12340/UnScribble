"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { primaryImage, enhancedImage, visionImageUrl } = require("../agents/medical-context");

describe("medical-context images", () => {
  it("primaryImage prefers original data url", () => {
    const ctx = {
      imageDataUrl: "data:image/jpeg;base64,enhanced",
      originalImageDataUrl: "data:image/jpeg;base64,original"
    };
    assert.equal(primaryImage(ctx), "data:image/jpeg;base64,original");
  });

  it("visionImageUrl uses enhanced when different from primary", () => {
    const ctx = {
      imageDataUrl: "data:image/jpeg;base64,enhanced",
      originalImageDataUrl: "data:image/jpeg;base64,original"
    };
    assert.equal(enhancedImage(ctx), "data:image/jpeg;base64,enhanced");
    assert.equal(visionImageUrl(ctx), "data:image/jpeg;base64,enhanced");
  });

  it("visionImageUrl falls back to primary when no enhancement", () => {
    const ctx = {
      imageDataUrl: "data:image/jpeg;base64,same",
      originalImageDataUrl: ""
    };
    assert.equal(visionImageUrl(ctx), "data:image/jpeg;base64,same");
  });
});
