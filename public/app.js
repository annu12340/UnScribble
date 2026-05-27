import { MAX_EDGE, JPEG_QUALITY, enhanceImageData } from "./image-enhance.js";
import { buildDecodeRequestBody, decodePrescriptionStream } from "./decode-client.js";
import { createResultRenderer } from "./render-result.js";

const state = {
  file: null,
  originalImage: null,
  imageDataUrl: "",
  originalDataUrl: "",
  resultPayload: null,
  model: "",
  workflowAgents: []
};

const els = {
  modelStatus: document.querySelector("#modelStatus"),
  statusText: document.querySelector("#modelStatus .status-text"),
  fileInput: document.querySelector("#fileInput"),
  dropzone: document.querySelector("#dropzone"),
  fileMeta: document.querySelector("#fileMeta"),
  previewWrap: document.querySelector("#previewWrap"),
  previewCanvas: document.querySelector("#previewCanvas"),
  enhanceBadge: document.querySelector("#enhanceBadge"),
  decodeBtn: document.querySelector("#decodeBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  downloadBtn: document.querySelector("#downloadBtn"),
  emptyState: document.querySelector("#emptyState"),
  loadingState: document.querySelector("#loadingState"),
  errorState: document.querySelector("#errorState"),
  errorMessage: document.querySelector("#errorState .error-message"),
  resultContent: document.querySelector("#resultContent"),
  reviewBanner: document.querySelector("#reviewBanner"),
  summaryText: document.querySelector("#summaryText"),
  qualityText: document.querySelector("#qualityText"),
  patientStrip: document.querySelector("#patientStrip"),
  medList: document.querySelector("#medList"),
  abbrevList: document.querySelector("#abbrevList"),
  otherTextList: document.querySelector("#otherTextList"),
  rawJson: document.querySelector("#rawJson"),
  toast: document.querySelector("#toast"),
  steps: document.querySelectorAll(".step"),
  stepLines: document.querySelectorAll(".step-line"),
  loadingHint: document.querySelector("#loadingHint"),
  loadingTitle: document.querySelector("#loadingTitle"),
  agentProgress: document.querySelector("#agentProgress"),
  workflowTraceWrap: document.querySelector("#workflowTraceWrap"),
  workflowTrace: document.querySelector("#workflowTrace")
};

let toastTimer = null;
let previewDebounceTimer = null;
let decodeAbortController = null;
let enhanceWorker = null;
let enhanceJobId = 0;

const resultRenderer = createResultRenderer(els, state, {
  getEnhancementMode,
  escapeHtml
});

init();

async function init() {
  bindEvents();
  updateSteps();
  await loadConfig();
}

function bindEvents() {
  els.fileInput.addEventListener("change", () => {
    const [file] = els.fileInput.files || [];
    if (file) handleFile(file);
  });

  for (const eventName of ["dragenter", "dragover"]) {
    els.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropzone.classList.add("dragging");
    });
  }

  for (const eventName of ["dragleave", "drop"]) {
    els.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropzone.classList.remove("dragging");
    });
  }

  els.dropzone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files || [];
    if (file) handleFile(file);
  });

  document.querySelectorAll("input[name='enhance']").forEach((input) => {
    input.addEventListener("change", () => {
      syncSegmentedControls();
      updateEnhanceBadge();
      schedulePreviewRender();
    });
  });
  syncSegmentedControls();

  els.decodeBtn.addEventListener("click", decodePrescription);
  els.clearBtn.addEventListener("click", resetAll);
  els.copyBtn.addEventListener("click", copyResult);
  els.downloadBtn.addEventListener("click", downloadResult);
 }

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    state.model = config.model || "";
    state.workflowAgents = config.agents || [];
    const label = config.configured
      ? `Ready · ${shortModelName(config.model)}${config.mock ? " (mock)" : ""}`
      : "API key missing";
    setStatusText(label);
    els.modelStatus.classList.toggle("ready", Boolean(config.configured));
    els.modelStatus.classList.toggle("missing", !config.configured);
  } catch {
    setStatusText("Server unavailable");
    els.modelStatus.classList.add("missing");
  }
}

function setStatusText(text) {
  if (els.statusText) {
    els.statusText.textContent = text;
  } else {
    els.modelStatus.textContent = text;
  }
}

function shortModelName(model) {
  const id = String(model || "");
  if (!id) return "model";
  const parts = id.split("/");
  return parts[parts.length - 1] || id;
}

function updateSteps() {
  const hasImage = Boolean(state.imageDataUrl);
  const hasResult = Boolean(state.resultPayload);
  const isLoading = !els.loadingState.hidden;

  els.steps.forEach((step) => {
    const n = Number(step.dataset.step);
    step.classList.remove("is-active", "is-done");
    if (n === 1) {
      if (!hasImage) step.classList.add("is-active");
      else step.classList.add("is-done");
    } else if (n === 2) {
      if (!hasImage) return;
      if (!hasResult && !isLoading) step.classList.add("is-active");
      else step.classList.add("is-done");
    } else if (n === 3) {
      if (isLoading || hasResult) step.classList.add("is-active");
    }
  });

  els.stepLines.forEach((line, index) => {
    const filled = (index === 0 && hasImage) || (index === 1 && (hasResult || isLoading));
    line.classList.toggle("is-filled", filled);
  });

  syncAppState(hasImage, hasResult, isLoading);
}

function syncAppState(hasImage, hasResult, isLoading) {
  document.body.classList.toggle("has-image", hasImage);
  document.body.classList.toggle("has-result", hasResult);
  document.body.classList.toggle("is-decoding", isLoading);
  els.dropzone.classList.toggle("has-image", hasImage);
}

function syncSegmentedControls() {
  document.querySelectorAll(".segmented label").forEach((label) => {
    const input = label.querySelector("input[type='radio']");
    label.classList.toggle("is-selected", Boolean(input?.checked));
  });
}

function updateEnhanceBadge() {
  const mode = getEnhancementMode();
  const labels = { original: "Original", contrast: "Contrast", mono: "Mono" };
  if (!els.enhanceBadge) return;
  els.enhanceBadge.textContent = labels[mode] || mode;
  els.enhanceBadge.classList.add("is-updating");
  setTimeout(() => els.enhanceBadge.classList.remove("is-updating"), 250);
}

function schedulePreviewRender() {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    renderPreview().catch((error) => showError(error.message));
  }, 200);
}

function abortDecode() {
  if (decodeAbortController) {
    decodeAbortController.abort();
    decodeAbortController = null;
  }
}

async function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("Select an image file.");
    return;
  }

  abortDecode();
  state.file = file;
  state.originalImage = await loadImage(file);
  els.fileMeta.textContent = file.name;
  els.fileMeta.classList.add("has-file");
  els.fileMeta.title = `${file.name} · ${formatBytes(file.size)}`;
  els.previewWrap.hidden = false;
  updateEnhanceBadge();
  await renderPreview();
  clearResult();
  els.decodeBtn.disabled = false;
  updateSteps();
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read image."));
    image.src = URL.createObjectURL(file);
  });
}

function getEnhanceWorker() {
  if (!enhanceWorker) {
    enhanceWorker = new Worker("/image-enhance.worker.js", { type: "module" });
  }
  return enhanceWorker;
}

function enhanceInWorker(imageData, mode) {
  return new Promise((resolve, reject) => {
    const worker = getEnhanceWorker();
    const id = ++enhanceJobId;
    const onMessage = (event) => {
      if (event.data.id !== id) return;
      worker.removeEventListener("message", onMessage);
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.imageData);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, imageData, mode });
  });
}

async function renderPreview() {
  if (!state.originalImage) return;

  const mode = getEnhancementMode();
  const canvas = els.previewCanvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const scale = Math.min(1, MAX_EDGE / Math.max(state.originalImage.width, state.originalImage.height));
  canvas.width = Math.max(1, Math.round(state.originalImage.width * scale));
  canvas.height = Math.max(1, Math.round(state.originalImage.height * scale));
  ctx.drawImage(state.originalImage, 0, 0, canvas.width, canvas.height);

  state.originalDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

  if (mode === "original") {
    state.imageDataUrl = state.originalDataUrl;
    updateSteps();
    return;
  }

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  try {
    imageData = await enhanceInWorker(imageData, mode);
  } catch {
    enhanceImageData(imageData, mode);
  }
  ctx.putImageData(imageData, 0, 0);

  state.imageDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  updateSteps();
}

async function decodePrescription() {
  if (!state.imageDataUrl) return;

  abortDecode();
  decodeAbortController = new AbortController();
  const { signal } = decodeAbortController;

  setLoading(true);
  resetWorkflowUi();
  try {
    await decodePrescriptionStream(
      "/api/decode/stream",
      buildDecodeRequestBody(state, getEnhancementMode),
      handleWorkflowEvent,
      signal
    );
  } catch (error) {
    if (error.name !== "AbortError") {
      showError(error.message);
    }
  } finally {
    decodeAbortController = null;
    setLoading(false);
  }
}

function handleWorkflowEvent(event, payload) {
  switch (event) {
    case "workflow.start":
      initAgentProgress(payload.agents || state.workflowAgents);
      setLoadingHint("Running multi-agent workflow…");
      break;
    case "agent.start":
      setLoadingHint(payload.label || payload.id);
      setAgentStatus(payload.id, "active");
      break;
    case "agent.complete":
      setAgentStatus(payload.id, "done");
      if (payload.summary) {
        setLoadingHint(`${agentLabel(payload.id)} · ${payload.summary}`);
      }
      break;
    case "agent.error":
      setAgentStatus(payload.id, "error");
      throw new Error(formatWorkflowError(payload.id, payload));
    case "workflow.complete":
      state.resultPayload = {
        result: payload.result,
        workflow: payload.workflow,
        model: payload.workflow?.model || state.model,
        decodedAt: new Date().toISOString()
      };
      resultRenderer.renderWorkflowTrace(payload.workflow);
      resultRenderer.renderResult(payload.result);
      updateSteps();
      showToast("Prescription decoded");
      break;
    case "workflow.error":
      throw new Error(formatWorkflowError(payload.agentId, payload));
    default:
      break;
  }
}

function agentLabel(id) {
  const found = (state.workflowAgents || []).find((a) => a.id === id);
  return found?.label || id;
}

function formatWorkflowError(agentId, payload) {
  const label = agentId ? agentLabel(agentId) : "Workflow";
  const message = payload?.message || "failed";
  const parts = [`${label}: ${message}`];
  if (payload?.detail && payload.detail !== message) parts.push(payload.detail);
  if (payload?.rawText) parts.push(`Raw output snippet: ${payload.rawText}`);
  return parts.join("\n");
}

function resetWorkflowUi() {
  if (els.loadingHint) els.loadingHint.textContent = "Starting workflow…";
  if (els.loadingTitle) els.loadingTitle.textContent = "Decoding handwriting";
  if (els.agentProgress) {
    els.agentProgress.hidden = true;
    els.agentProgress.replaceChildren();
  }
  if (els.workflowTraceWrap) els.workflowTraceWrap.hidden = true;
  if (els.workflowTrace) els.workflowTrace.replaceChildren();
}

function initAgentProgress(agents) {
  if (!els.agentProgress || !agents?.length) return;
  state.workflowAgents = agents;
  els.agentProgress.hidden = false;
  els.agentProgress.replaceChildren(
    ...agents.map((agent) => {
      const li = document.createElement("li");
      li.dataset.agentId = agent.id;
      li.className = "is-pending";
      li.textContent = agent.label;
      return li;
    })
  );
}

function setAgentStatus(agentId, status) {
  if (!els.agentProgress) return;
  const item = els.agentProgress.querySelector(`[data-agent-id="${agentId}"]`);
  if (!item) return;
  item.classList.remove("is-pending", "is-active", "is-done");
  if (status === "active") item.classList.add("is-active");
  else if (status === "done") item.classList.add("is-done");
  else item.classList.add("is-pending");
}

function setLoadingHint(text) {
  if (els.loadingHint) els.loadingHint.textContent = text;
}

function setLoading(isLoading) {
  els.decodeBtn.disabled = isLoading || !state.imageDataUrl;
  const label = els.decodeBtn.querySelector(".btn-label");
  if (label) label.textContent = isLoading ? "Decoding…" : "Decode prescription";
  els.decodeBtn.classList.toggle("is-loading", isLoading);
  els.loadingState.hidden = !isLoading;
  els.loadingState.classList.toggle("is-visible", isLoading);
  updateSteps();
  if (isLoading) {
    els.emptyState.hidden = true;
    els.errorState.hidden = true;
    els.resultContent.hidden = true;
  }
}

function showError(message) {
  els.emptyState.hidden = true;
  els.loadingState.hidden = true;
  els.resultContent.hidden = true;
  els.errorState.hidden = false;
  if (els.errorMessage) {
    els.errorMessage.textContent = message;
  } else {
    els.errorState.textContent = message;
  }
}

function clearResult() {
  state.resultPayload = null;
  els.emptyState.hidden = false;
  els.loadingState.hidden = true;
  els.errorState.hidden = true;
  els.resultContent.hidden = true;
  els.copyBtn.disabled = true;
  els.downloadBtn.disabled = true;
  if (els.workflowTraceWrap) els.workflowTraceWrap.hidden = true;
  updateSteps();
}

function resetAll() {
  abortDecode();
  state.file = null;
  state.originalImage = null;
  state.imageDataUrl = "";
  state.originalDataUrl = "";
  els.fileInput.value = "";
  els.fileMeta.textContent = "No image";
  els.fileMeta.classList.remove("has-file");
  els.fileMeta.removeAttribute("title");
  els.previewWrap.hidden = true;
  els.decodeBtn.disabled = true;
  clearResult();
  updateSteps();
}

async function copyResult() {
  if (!state.resultPayload) return;
  await navigator.clipboard.writeText(JSON.stringify(state.resultPayload.result, null, 2));
  els.copyBtn.classList.add("is-success");
  showToast("Copied to clipboard");
  setTimeout(() => els.copyBtn.classList.remove("is-success"), 1400);
}

function downloadResult() {
  if (!state.resultPayload) return;
  const blob = new Blob([JSON.stringify(state.resultPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `prescription-ocr-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("JSON downloaded");
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2400);
}

function getEnhancementMode() {
  return document.querySelector("input[name='enhance']:checked")?.value || "original";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
