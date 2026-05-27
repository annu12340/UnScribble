import { MAX_EDGE, JPEG_QUALITY, enhanceImageData } from "./image-enhance.js";
import { buildDecodeRequestBody, decodePrescriptionStream } from "./decode-client.js";

const state = {
  file: null,
  originalImage: null,
  imageDataUrl: "",
  originalDataUrl: "",
  model: "",
  workflowAgents: []
};

const els = {
  modelStatus: document.querySelector("#modelStatus"),
  statusText: document.querySelector("#modelStatus .status-text"),
  fileInput: document.querySelector("#fileInput"),
  dropzone: document.querySelector("#dropzone"),
  fileName: document.querySelector("#fileName"),
  previewSection: document.querySelector("#previewSection"),
  previewCanvas: document.querySelector("#previewCanvas"),
  removeBtn: document.querySelector("#removeBtn"),
  processBtn: document.querySelector("#processBtn"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingTitle: document.querySelector("#loadingTitle"),
  loadingHint: document.querySelector("#loadingHint"),
  agentProgress: document.querySelector("#agentProgress"),
  errorCard: document.querySelector("#errorCard"),
  errorMessage: document.querySelector("#errorMessage"),
  retryBtn: document.querySelector("#retryBtn"),
  toast: document.querySelector("#toast")
};

let enhanceWorker = null;
let enhanceJobId = 0;
let decodeAbortController = null;
let toastTimer = null;

init();

async function init() {
  bindEvents();
  await loadConfig();
  setTodayAsDefault();
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
      renderPreview();
    });
  });
  syncSegmentedControls();

  els.processBtn.addEventListener("click", processPrescription);
  els.removeBtn.addEventListener("click", resetUpload);
  els.retryBtn.addEventListener("click", () => {
    els.errorCard.hidden = true;
    els.previewSection.hidden = false;
  });
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

function setTodayAsDefault() {
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.querySelector("#startDateInput");
  if (dateInput) dateInput.value = today;
}

async function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("Please select an image file (PNG, JPG, or WEBP).");
    return;
  }

  state.file = file;
  state.originalImage = await loadImage(file);
  els.fileName.textContent = file.name;
  els.previewSection.hidden = false;
  await renderPreview();
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
}

async function processPrescription() {
  if (!state.imageDataUrl) return;

  decodeAbortController = new AbortController();
  const { signal } = decodeAbortController;

  setLoading(true);
  els.errorCard.hidden = true;

  try {
    let result = null;
    let workflow = null;

    await decodePrescriptionStream(
      "/api/decode/stream",
      buildDecodeRequestBody(state, getEnhancementMode),
      (event, payload) => {
        handleWorkflowEvent(event, payload);
        if (event === "workflow.complete") {
          result = payload.result;
          workflow = payload.workflow;
        }
      },
      signal
    );

    if (result) {
      // Store result in sessionStorage and navigate to results page
      const resultData = {
        result,
        workflow,
        model: workflow?.model || state.model,
        decodedAt: new Date().toISOString()
      };
      sessionStorage.setItem("prescriptionResult", JSON.stringify(resultData));
      window.location.href = "/results.html";
    }
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
      setLoadingHint("Running multi-agent workflow...");
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
  return parts.join("\n");
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
  els.loadingOverlay.hidden = !isLoading;
  els.processBtn.disabled = isLoading;
  if (isLoading) {
    els.previewSection.hidden = true;
  }
}

function showError(message) {
  els.errorCard.hidden = false;
  els.errorMessage.textContent = message;
  els.previewSection.hidden = true;
  els.loadingOverlay.hidden = true;
}

function resetUpload() {
  state.file = null;
  state.originalImage = null;
  state.imageDataUrl = "";
  state.originalDataUrl = "";
  els.fileInput.value = "";
  els.previewSection.hidden = true;
  els.errorCard.hidden = true;
}

function syncSegmentedControls() {
  document.querySelectorAll(".segmented label").forEach((label) => {
    const input = label.querySelector("input[type='radio']");
    label.classList.toggle("is-selected", Boolean(input?.checked));
  });
}

function getEnhancementMode() {
  return document.querySelector("input[name='enhance']:checked")?.value || "original";
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2400);
}
