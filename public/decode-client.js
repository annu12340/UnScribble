export function buildDecodeRequestBody(state, getEnhancementMode) {
  const mode = getEnhancementMode();
  const requestBody = {
    imageDataUrl: state.imageDataUrl,
    fileName: state.file?.name || "",
    enhancementMode: mode
  };
  if (mode !== "original" && state.originalDataUrl) {
    requestBody.originalImageDataUrl = state.originalDataUrl;
  }
  return requestBody;
}

export async function consumeSseStream(response, onEvent, signal) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError = null;

  const dispatch = (chunk) => {
    try {
      onEvent(parseSseChunk(chunk));
    } catch (error) {
      streamError = error;
    }
  };

  while (true) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => {});
      throw new DOMException("Decode aborted", "AbortError");
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      dispatch(chunk);
      if (streamError) break;
      boundary = buffer.indexOf("\n\n");
    }
    if (streamError) break;
  }

  if (!streamError && buffer.trim()) {
    dispatch(buffer);
  }

  if (streamError) {
    throw streamError;
  }
}

export function parseSseChunk(raw) {
  if (!raw.trim() || raw.trim().startsWith(":")) return null;

  let event = "message";
  let data = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    else if (line.startsWith("data: ")) data += line.slice(6);
  }
  if (!data) return null;

  try {
    return { event, payload: JSON.parse(data) };
  } catch {
    return null;
  }
}

export async function decodePrescriptionStream(url, body, onEvent, signal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    let message = "Decoding failed.";
    try {
      const err = await response.json();
      message = err.detail || err.error || message;
    } catch {
      message = await response.text().catch(() => message);
    }
    throw new Error(message);
  }

  await consumeSseStream(response, (parsed) => {
    if (parsed && parsed.event && parsed.payload) {
      onEvent(parsed.event, parsed.payload);
    }
  }, signal);
}
