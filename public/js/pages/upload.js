import {
  MAX_EDGE,
  JPEG_QUALITY,
  enhanceImageData,
} from "../core/image-enhance.js";
import {
  buildDecodeRequestBody,
  decodePrescriptionStream,
} from "../core/decode-client.js";
import {
  agentLabel,
  formatWorkflowError,
  isImageMimeType,
  pickMedicalJoke,
  shortModelName,
  workflowProgressPercent,
} from "../core/upload-workflow.js";

const state = {
  file: null,
  originalImage: null,
  imageDataUrl: "",
  originalDataUrl: "",
  model: "",
  workflowAgents: [],
  totalAgents: 7,
  completedAgents: 0,
};

const els = {
  modelStatus: document.querySelector("#modelStatus"),
  statusText: document.querySelector("#modelStatus .status-text"),
  fileInput: document.querySelector("#fileInput"),
  dropzone: document.querySelector("#dropzone"),
  sampleSection: document.querySelector("#sampleSection"),
  sampleGrid: document.querySelector("#sampleGrid"),
  fileName: document.querySelector("#fileName"),
  previewSection: document.querySelector("#previewSection"),
  previewCanvas: document.querySelector("#previewCanvas"),
  removeBtn: document.querySelector("#removeBtn"),
  processBtn: document.querySelector("#processBtn"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingTitle: document.querySelector("#loadingTitle"),
  loadingHint: document.querySelector("#loadingHint"),
  errorCard: document.querySelector("#errorCard"),
  errorMessage: document.querySelector("#errorMessage"),
  retryBtn: document.querySelector("#retryBtn"),
};

let enhanceWorker = null;
let enhanceJobId = 0;

init();

async function init() {
  bindEvents();
  await Promise.all([loadConfig(), loadSamples()]);
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
    if (els.sampleSection) els.sampleSection.hidden = false;
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

async function handleFile(file, { keepSampleSelection = false } = {}) {
  if (!isImageMimeType(file.type)) {
    showError("Please select an image file (PNG, JPG, or WEBP).");
    return;
  }

  if (!keepSampleSelection) {
    clearSampleSelection();
  }

  await loadSelectedImage(file);
}

async function loadSelectedImage(file) {
  state.file = file;
  state.originalImage = await loadImage(file);

  els.dropzone.style.display = "none";

  els.fileName.textContent = file.name;
  els.previewSection.hidden = false;
  els.errorCard.hidden = true;
  await renderPreview();
}

async function loadSamples() {
  if (!els.sampleGrid) return;

  try {
    const response = await fetch("/api/samples");
    if (!response.ok) throw new Error("Unable to load samples");
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Invalid samples response");
    }
    const payload = await response.json();
    const samples = Array.isArray(payload.samples) ? payload.samples : [];
    if (!samples.length) {
      if (els.sampleSection) els.sampleSection.hidden = true;
      return;
    }

    els.sampleGrid.replaceChildren();
    for (const sample of samples) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sample-thumb";
      button.dataset.url = sample.url;
      button.dataset.name = sample.name;
      button.setAttribute("role", "option");
      button.setAttribute(
        "aria-label",
        `Use sample ${sample.label || sample.name}`,
      );

      const image = document.createElement("img");
      image.src = sample.url;
      image.alt = "";
      image.loading = "lazy";
      image.width = 92;
      image.height = 74;

      const label = document.createElement("span");
      label.className = "sample-thumb-label";
      label.textContent = sample.label || sample.name;

      button.append(image, label);
      button.addEventListener("click", () => selectSample(button));
      els.sampleGrid.append(button);
    }
  } catch {
    if (els.sampleSection) els.sampleSection.hidden = true;
  }
}

async function selectSample(button) {
  const url = button.dataset.url;
  const name = button.dataset.name;
  if (!url || !name) return;

  document.querySelectorAll(".sample-thumb").forEach((item) => {
    item.classList.toggle("is-selected", item === button);
    item.setAttribute("aria-selected", item === button ? "true" : "false");
  });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to load sample");
    const blob = await response.blob();
    const file = new File([blob], name, { type: blob.type || "image/jpeg" });
    await handleFile(file, { keepSampleSelection: true });
  } catch {
    showError("Unable to load the selected sample image.");
  }
}

function clearSampleSelection() {
  document.querySelectorAll(".sample-thumb").forEach((item) => {
    item.classList.remove("is-selected");
    item.setAttribute("aria-selected", "false");
  });
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
    enhanceWorker = new Worker("/js/core/image-enhance.worker.js", {
      type: "module",
    });
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
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(state.originalImage.width, state.originalImage.height),
  );
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
      undefined,
    );

    if (result) {
      // Store result in sessionStorage and navigate to results page
      const resultData = {
        result,
        workflow,
        model: workflow?.model || state.model,
        decodedAt: new Date().toISOString(),
      };
      sessionStorage.setItem("prescriptionResult", JSON.stringify(resultData));
      window.location.href = "/results.html";
    }
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function handleWorkflowEvent(event, payload) {
  switch (event) {
    case "workflow.start":
      state.completedAgents = 0;
      if (payload.agents?.length) {
        state.totalAgents = payload.agents.length;
        syncStepLabels(payload.agents);
      }
      updateProgressBar(0);
      initStepList();
      setLoadingTitle(
        "Deciphering hieroglyphics from your doctor ... (wish us luck) ",
      );
      setLoadingHint("Running multi-agent pipeline…");
      break;
    case "agent.start":
      setLoadingHint(
        payload.label || agentLabel(state.workflowAgents, payload.id),
      );
      updateStepStatus(payload.id, "active");
      break;
    case "agent.complete":
      {
        state.completedAgents++;
        updateProgressBar(
          workflowProgressPercent(state.completedAgents, state.totalAgents),
        );
        updateStepStatus(payload.id, "completed");
        if (payload.summary) {
          setLoadingHint(
            `${agentLabel(state.workflowAgents, payload.id)} done`,
          );
        }
      }
      break;
    case "agent.error":
      updateStepStatus(payload.id, "error");
      throw new Error(
        formatWorkflowError(payload.id, payload, state.workflowAgents),
      );
    case "workflow.error":
      throw new Error(
        formatWorkflowError(payload.agentId, payload, state.workflowAgents),
      );
    default:
      break;
  }
}

function syncStepLabels(agents) {
  for (const agent of agents) {
    const step = document.querySelector(`.step-item[data-step="${agent.id}"]`);
    const text = step?.querySelector(".step-text");
    if (text && agent.label) text.textContent = agent.label;
  }
}

function initStepList() {
  document.querySelectorAll(".step-item").forEach((step) => {
    step.classList.remove("active", "completed", "error");
  });
}

function updateStepStatus(agentId, status) {
  const step = document.querySelector(`.step-item[data-step="${agentId}"]`);
  if (!step) {
    console.warn(`Step not found for agent: ${agentId}`);
    return;
  }
  step.classList.remove("active", "completed", "error");
  if (status) step.classList.add(status);
}

function updateProgressBar(percentage) {
  const progressFill = document.getElementById("progressBarFill");
  const progressText = document.getElementById("progressText");

  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }

  if (progressText) {
    progressText.textContent = `${percentage}%`;
  }
}

function setLoadingHint(text) {
  if (els.loadingHint) els.loadingHint.textContent = text;
}

function setLoadingTitle(text) {
  if (els.loadingTitle) els.loadingTitle.textContent = text;
}

function setLoading(isLoading) {
  els.loadingOverlay.hidden = !isLoading;
  els.processBtn.disabled = isLoading;
  if (isLoading) {
    els.previewSection.hidden = true;
    if (els.sampleSection) els.sampleSection.hidden = true;
    setLoadingTitle(
      "Deciphering hieroglyphics from your doctor ... (wish us luck)",
    );
    setLoadingHint("Preparing image…");
    state.completedAgents = 0;
    updateProgressBar(0);
    const currentJoke = pickMedicalJoke();
    const jokeElement = document.querySelector("#loadingJoke");
    if (jokeElement) {
      jokeElement.textContent = currentJoke;
    }
  }
}

function showError(message) {
  els.errorCard.hidden = false;
  els.errorMessage.textContent = message;
  els.previewSection.hidden = true;
  els.loadingOverlay.hidden = true;
  if (els.sampleSection && state.file) els.sampleSection.hidden = false;
}

function resetUpload() {
  state.file = null;
  state.originalImage = null;
  state.imageDataUrl = "";
  state.originalDataUrl = "";
  els.fileInput.value = "";
  els.previewSection.hidden = true;
  els.errorCard.hidden = true;
  clearSampleSelection();

  els.dropzone.style.display = "";
  if (els.sampleSection) els.sampleSection.hidden = false;
}

function syncSegmentedControls() {
  document.querySelectorAll(".segmented label").forEach((label) => {
    const input = label.querySelector("input[type='radio']");
    label.classList.toggle("is-selected", Boolean(input?.checked));
  });
}

function getEnhancementMode() {
  return (
    document.querySelector("input[name='enhance']:checked")?.value || "original"
  );
}
