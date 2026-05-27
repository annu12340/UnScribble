import { enhanceImageData } from "./image-enhance.js";

self.onmessage = (event) => {
  const { imageData, mode, id } = event.data;
  try {
    enhanceImageData(imageData, mode);
    self.postMessage({ id, imageData }, [imageData.data.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error.message || "Enhancement failed" });
  }
};
