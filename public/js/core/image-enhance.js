export const MAX_EDGE = 2048;
export const JPEG_QUALITY = 0.85;

export function applySauvolaThreshold(imageData) {
  const { data, width, height } = imageData;
  const total = width * height;
  const gray = new Float64Array(total);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  const stride = width + 1;
  const sum = new Float64Array(stride * (height + 1));
  const sumSq = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSumSq = 0;
    for (let x = 0; x < width; x++) {
      const g = gray[y * width + x];
      rowSum += g;
      rowSumSq += g * g;
      const idx = (y + 1) * stride + (x + 1);
      sum[idx] = sum[y * stride + (x + 1)] + rowSum;
      sumSq[idx] = sumSq[y * stride + (x + 1)] + rowSumSq;
    }
  }

  const radius = 12;
  const k = 0.2;
  const R = 128;

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const a = y0 * stride + x0;
      const b = y0 * stride + (x1 + 1);
      const c = (y1 + 1) * stride + x0;
      const d = (y1 + 1) * stride + (x1 + 1);
      const localSum = sum[d] - sum[b] - sum[c] + sum[a];
      const localSumSq = sumSq[d] - sumSq[b] - sumSq[c] + sumSq[a];
      const mean = localSum / area;
      const variance = Math.max(0, localSumSq / area - mean * mean);
      const std = Math.sqrt(variance);
      const threshold = mean * (1 + k * (std / R - 1));
      const pixelIndex = (y * width + x) * 4;
      const value = gray[y * width + x] < threshold ? 0 : 255;
      data[pixelIndex] = value;
      data[pixelIndex + 1] = value;
      data[pixelIndex + 2] = value;
    }
  }
}

export function applyCLAHE(imageData) {
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114,
    );
  }

  const tilesX = 8;
  const tilesY = 8;
  const tileW = width / tilesX;
  const tileH = height / tilesY;
  const clipLimit = 3.0;
  const bins = 256;

  const cdfs = new Array(tilesX * tilesY);
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = Math.floor(tx * tileW);
      const y0 = Math.floor(ty * tileH);
      const x1 = Math.floor((tx + 1) * tileW);
      const y1 = Math.floor((ty + 1) * tileH);
      const hist = new Uint32Array(bins);
      const area = (x1 - x0) * (y1 - y0);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[gray[y * width + x]]++;
        }
      }
      const limit = Math.max(1, Math.floor((clipLimit * area) / bins));
      let excess = 0;
      for (let i = 0; i < bins; i++) {
        if (hist[i] > limit) {
          excess += hist[i] - limit;
          hist[i] = limit;
        }
      }
      const redistribute = Math.floor(excess / bins);
      const remainder = excess - redistribute * bins;
      for (let i = 0; i < bins; i++) hist[i] += redistribute;
      for (let i = 0; i < remainder; i++) hist[i]++;

      const cdf = new Uint8Array(bins);
      let cumulative = 0;
      for (let i = 0; i < bins; i++) {
        cumulative += hist[i];
        cdf[i] = Math.round((cumulative * 255) / area);
      }
      cdfs[ty * tilesX + tx] = cdf;
    }
  }

  for (let y = 0; y < height; y++) {
    const fy = y / tileH - 0.5;
    const ty0 = Math.max(0, Math.floor(fy));
    const ty1 = Math.min(tilesY - 1, ty0 + 1);
    const wy = Math.max(0, Math.min(1, fy - ty0));
    for (let x = 0; x < width; x++) {
      const fx = x / tileW - 0.5;
      const tx0 = Math.max(0, Math.floor(fx));
      const tx1 = Math.min(tilesX - 1, tx0 + 1);
      const wx = Math.max(0, Math.min(1, fx - tx0));
      const v = gray[y * width + x];
      const c00 = cdfs[ty0 * tilesX + tx0][v];
      const c01 = cdfs[ty0 * tilesX + tx1][v];
      const c10 = cdfs[ty1 * tilesX + tx0][v];
      const c11 = cdfs[ty1 * tilesX + tx1][v];
      const top = c00 * (1 - wx) + c01 * wx;
      const bottom = c10 * (1 - wx) + c11 * wx;
      const value = Math.round(top * (1 - wy) + bottom * wy);
      const idx = (y * width + x) * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
    }
  }
}

export function enhanceImageData(imageData, mode) {
  if (mode === "contrast") {
    applyCLAHE(imageData);
  } else if (mode === "mono") {
    applySauvolaThreshold(imageData);
  }
  return imageData;
}
