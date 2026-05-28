"use strict";

const crypto = require("node:crypto");

const config = require("./config");
const log = require("./logger");
const { getMockResult } = require("./mock-fixtures");
const { mergeArtifacts, buildEarlyExit, buildDeterministicSummary } = require("./merger");
const { validateAgainstFormulary } = require("./formulary");
const { mergeMedicationRuns } = require("./merge-medication-runs");
const { cacheKey, getCached, setCached, cacheEnabled } = require("./workflow-cache");

const imageQualityAgent = require("./runners/image-quality");
const rawTranscriptionAgent = require("./runners/raw-transcription");
const patientHeaderAgent = require("./runners/patient-header");
const medicationsAgent = require("./runners/medications");
const clinicalContextAgent = require("./runners/clinical-context");
const safetyReviewAgent = require("./runners/safety-review");
const synthesisAgent = require("./runners/synthesis");

const AGENT_MANIFEST = [
  imageQualityAgent,
  rawTranscriptionAgent,
  patientHeaderAgent,
  medicationsAgent,
  clinicalContextAgent,
  safetyReviewAgent,
  synthesisAgent
].map((a) => ({ id: a.id, label: a.label }));

async function runAgent(agent, ctx, emit, steps) {
  const started = Date.now();
  log.info("workflow", `agent start · ${agent.label}`, {
    workflowId: ctx.workflowId,
    requestId: ctx.requestId,
    id: agent.id,
    mock: config.mock
  });
  emit("agent.start", {
    workflowId: ctx.workflowId,
    requestId: ctx.requestId,
    id: agent.id,
    label: agent.label
  });

  try {
    let output;
    if (config.mock && !agent.deterministic) {
      await delay(120);
      output = getMockResult(agent.id);
      log.debug("workflow", `agent mock · ${agent.id}`);
    } else if (agent.deterministic) {
      output = await agent.run(ctx);
    } else {
      output = await withTimeout(
        agent.run(ctx),
        config.agentTimeoutMs,
        `Agent ${agent.id} timed out after ${config.agentTimeoutMs}ms`
      );
    }

    const durationMs = Date.now() - started;
    ctx.artifacts[agent.id] = output;
    steps.push({ id: agent.id, label: agent.label, status: "complete", durationMs });
    const summary = summarizeOutput(agent.id, output);
    log.info("workflow", `agent done · ${agent.label}`, {
      workflowId: ctx.workflowId,
      requestId: ctx.requestId,
      id: agent.id,
      durationMs,
      summary
    });
    emit("agent.complete", {
      workflowId: ctx.workflowId,
      requestId: ctx.requestId,
      id: agent.id,
      durationMs,
      summary,
      nimRequestId: ctx.lastNimRequestId || undefined
    });
    return output;
  } catch (error) {
    const durationMs = Date.now() - started;
    steps.push({
      id: agent.id,
      label: agent.label,
      status: "error",
      durationMs,
      message: error.message
    });
    log.error("workflow", `agent failed · ${agent.label}`, {
      workflowId: ctx.workflowId,
      requestId: ctx.requestId,
      id: agent.id,
      durationMs,
      message: error.message,
      detail: error.detail,
      statusCode: error.statusCode
    });
    if (error.rawText) {
      log.debug("workflow", `raw model output · ${agent.id}`, {
        snippet: error.rawText.slice(0, 500)
      });
    }
    emit("agent.error", {
      workflowId: ctx.workflowId,
      requestId: ctx.requestId,
      id: agent.id,
      label: agent.label,
      message: error.message,
      detail: error.detail || "",
      rawText: error.rawText ? error.rawText.slice(0, 500) : ""
    });

    // Attach agent context to error for better debugging
    error.agentId = agent.id;
    error.critical = agent.critical;
    throw error;
  }
}

const SELF_CONSISTENCY_CONFIDENCE_THRESHOLD = 0.7;
const SELF_CONSISTENCY_MAX_LOW_ROWS = 6;

function rowsNeedingRerun(medications) {
  return medications.filter((med) => {
    const conf = Number(med.medication_name_confidence ?? 1);
    if (conf < SELF_CONSISTENCY_CONFIDENCE_THRESHOLD) return true;
    if ((med.uncertain_tokens || []).length > 0) return true;
    if ((med.critical_uncertainties || []).length > 0) return true;
    return false;
  });
}

async function maybeSelfConsistency(ctx, emit, steps) {
  if (config.mock) return;
  const firstPass = ctx.artifacts.medications?.medications || [];
  if (!firstPass.length) return;

  const shaky = rowsNeedingRerun(firstPass);
  if (!shaky.length) return;
  if (shaky.length > SELF_CONSISTENCY_MAX_LOW_ROWS) {
    log.info("workflow", "skip self-consistency · too many shaky rows", {
      shaky: shaky.length
    });
    return;
  }

  log.info("workflow", "stage 2b · medications self-consistency re-run", {
    shaky: shaky.length
  });

  const firstArtifact = ctx.artifacts.medications;
  ctx.medicationsRerun = true;
  let secondArtifact;
  try {
    secondArtifact = await runAgent(medicationsAgent, ctx, emit, steps);
  } catch (error) {
    log.warn("workflow", "self-consistency re-run failed; keeping first pass", {
      message: error.message
    });
    ctx.artifacts.medications = firstArtifact;
    ctx.medicationsRerun = false;
    return;
  }
  ctx.medicationsRerun = false;

  ctx.artifacts.medications = {
    ...firstArtifact,
    medications: mergeMedicationRuns(
      firstArtifact.medications || [],
      secondArtifact.medications || []
    )
  };
}

function summarizeOutput(agentId, output) {
  if (agentId === "image_quality") {
    return output?.image_quality?.legibility || "";
  }
  if (agentId === "raw_transcription") {
    return `${(output?.raw_transcription || []).length} lines`;
  }
  if (agentId === "medications") {
    return `${(output?.medications || []).length} medications`;
  }
  if (agentId === "safety_review") {
    return output?.requires_human_review ? "review required" : "ok";
  }
  return "";
}

async function runWorkflow(body, emit, options = {}) {
  const workflowId = crypto.randomUUID();
  const requestId = options.requestId || "";
  const started = Date.now();
  const steps = [];

  const useCache = !config.mock && cacheEnabled();
  const key = useCache ? cacheKey(body) : "";
  if (key) {
    const cached = getCached(key);
    if (cached) {
      log.info("workflow", "cache hit", { workflowId, requestId, key: key.slice(0, 12) });
      emit("workflow.start", { workflowId, requestId, agents: AGENT_MANIFEST });
      const workflow = {
        workflowId,
        requestId,
        steps: [],
        totalMs: Date.now() - started,
        model: cached.workflow?.model || config.model,
        cached: true
      };
      emit("workflow.complete", { workflowId, requestId, result: cached.result, workflow });
      return { result: cached.result, workflow };
    }
  }

  const ctx = {
    workflowId,
    requestId,
    body,
    imageDataUrl: body.imageDataUrl,
    originalImageDataUrl: body.originalImageDataUrl || "",
    artifacts: {},
    mergedForSynthesis: null
  };

  log.info("workflow", "decode started", {
    workflowId,
    requestId,
    fileName: body.fileName || "",
    enhancementMode: body.enhancementMode,
    mock: config.mock,
    model: config.model
  });
  emit("workflow.start", { workflowId, requestId, agents: AGENT_MANIFEST });

  try {
    let stageStart = Date.now();
    log.info("workflow", "stage 1 · image quality");
    await runAgent(imageQualityAgent, ctx, emit, steps);

    const legibility = ctx.artifacts.image_quality?.image_quality?.legibility;
    log.info("workflow", "legibility assessed", { legibility, stageMs: Date.now() - stageStart });

    if (legibility !== "unusable") {
      stageStart = Date.now();
      log.info("workflow", "stage 1b · raw transcription");
      await runAgent(rawTranscriptionAgent, ctx, emit, steps);
      log.info("workflow", "stage 1b complete", { stageMs: Date.now() - stageStart });
    }

    if (legibility === "unusable") {
      log.warn("workflow", "early exit · unusable image", { workflowId });
      let result = buildEarlyExit(ctx.artifacts);
      ctx.mergedForSynthesis = result;
      await runAgent(safetyReviewAgent, ctx, emit, steps);
      result = ctx.artifacts.safety_review;
      result.summary =
        result.summary ||
        "Image unusable — medication extraction skipped. Please recapture the prescription.";
      result = await validateAgainstFormulary(result);
      const workflow = {
        workflowId,
        requestId,
        steps,
        totalMs: Date.now() - started,
        model: config.model
      };
      log.info("workflow", "decode complete (early exit)", {
        workflowId,
        requestId,
        totalMs: workflow.totalMs,
        review: result.requires_human_review
      });
      emit("workflow.complete", { workflowId, requestId, result, workflow });
      return { result, workflow };
    }

    stageStart = Date.now();
    log.info("workflow", "stage 2 · patient header + medications + clinical context (parallel)");
    await Promise.all([
      runAgent(patientHeaderAgent, ctx, emit, steps),
      runAgent(medicationsAgent, ctx, emit, steps),
      runAgent(clinicalContextAgent, ctx, emit, steps)
    ]);
    log.info("workflow", "stage 2 complete", { stageMs: Date.now() - stageStart });

    await maybeSelfConsistency(ctx, emit, steps);

    let merged = mergeArtifacts(ctx.artifacts);
    ctx.mergedForSynthesis = merged;

    stageStart = Date.now();
    await runAgent(safetyReviewAgent, ctx, emit, steps);
    merged = ctx.artifacts.safety_review;
    ctx.mergedForSynthesis = merged;
    log.info("workflow", "stage 3 · safety review", { stageMs: Date.now() - stageStart });

    stageStart = Date.now();
    if (config.skipSynthesis) {
      merged.summary = buildDeterministicSummary(merged);
      log.info("workflow", "stage 4 · summary (deterministic, skip agent)", {
        stageMs: Date.now() - stageStart
      });
    } else {
      const synthesisOut = await runAgent(synthesisAgent, ctx, emit, steps);
      merged.summary = synthesisOut.summary || merged.summary;
      log.info("workflow", "stage 4 · summary", { stageMs: Date.now() - stageStart });
    }

    log.info("workflow", "formulary validation");
    merged = await validateAgainstFormulary(merged);

    const workflow = {
      workflowId,
      requestId,
      steps,
      totalMs: Date.now() - started,
      model: config.model
    };
    log.info("workflow", "decode complete", {
      workflowId,
      requestId,
      totalMs: workflow.totalMs,
      medications: merged.medications?.length ?? 0,
      requires_human_review: merged.requires_human_review,
      legibility: merged.image_quality?.legibility
    });
    if (key) setCached(key, { result: merged, workflow });
    emit("workflow.complete", { workflowId, requestId, result: merged, workflow });
    return { result: merged, workflow };
  } catch (error) {
    log.error("workflow", "decode failed", {
      workflowId,
      requestId,
      agentId: error.agentId,
      message: error.message,
      detail: error.detail
    });
    emit("workflow.error", {
      workflowId,
      requestId,
      message: error.detail || error.message,
      agentId: error.agentId || null
    });
    throw error;
  }
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(message);
      err.statusCode = 504;
      reject(err);
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  AGENT_MANIFEST,
  runWorkflow,
  rowsNeedingRerun,
  mergeMedicationRuns
};
