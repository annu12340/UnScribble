import { 
  renderScheduleView, 
  addMedicationToGoogleCalendar, 
  exportScheduleAsICS,
  parseMedicationSchedule
} from "./medication-schedule.js";

const state = {
  resultPayload: null,
  currentSchedules: [],
  googleCalendarConfig: {
    clientId: localStorage.getItem("googleClientId") || "",
    apiKey: localStorage.getItem("googleApiKey") || ""
  },
  currentMedicationIndex: null
};

const els = {
  noDataState: document.querySelector("#noDataState"),
  resultsContent: document.querySelector("#resultsContent"),
  processedDate: document.querySelector("#processedDate"),
  copyBtn: document.querySelector("#copyBtn"),
  downloadBtn: document.querySelector("#downloadBtn"),
  printBtn: document.querySelector("#printBtn"),
  reviewBanner: document.querySelector("#reviewBanner"),
  summaryText: document.querySelector("#summaryText"),
  qualityText: document.querySelector("#qualityText"),
  patientStrip: document.querySelector("#patientStrip"),
  medList: document.querySelector("#medList"),
  scheduleSection: document.querySelector("#scheduleSection"),
  scheduleContainer: document.querySelector("#scheduleContainer"),
  abbrevList: document.querySelector("#abbrevList"),
  otherTextList: document.querySelector("#otherTextList"),
  workflowTraceWrap: document.querySelector("#workflowTraceWrap"),
  workflowTrace: document.querySelector("#workflowTrace"),
  rawJson: document.querySelector("#rawJson"),
  toast: document.querySelector("#toast"),
  calendarModal: document.querySelector("#calendarModal"),
  modalClose: document.querySelector("#modalClose"),
  modalCancel: document.querySelector("#modalCancel"),
  modalConfirm: document.querySelector("#modalConfirm"),
  clientIdInput: document.querySelector("#clientIdInput"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  startDateInput: document.querySelector("#startDateInput")
};

let toastTimer = null;

init();

function init() {
  loadResultData();
  bindEvents();
  setTodayAsDefault();
}

function bindEvents() {
  els.copyBtn.addEventListener("click", copyResult);
  els.downloadBtn.addEventListener("click", downloadResult);
  els.printBtn.addEventListener("click", () => window.print());
  
  els.modalClose.addEventListener("click", closeModal);
  els.modalCancel.addEventListener("click", closeModal);
  els.modalConfirm.addEventListener("click", confirmCalendarSetup);
  
  // Load saved credentials
  if (state.googleCalendarConfig.clientId) {
    els.clientIdInput.value = state.googleCalendarConfig.clientId;
  }
  if (state.googleCalendarConfig.apiKey) {
    els.apiKeyInput.value = state.googleCalendarConfig.apiKey;
  }
}

function setTodayAsDefault() {
  const today = new Date().toISOString().split("T")[0];
  if (els.startDateInput) els.startDateInput.value = today;
}

function loadResultData() {
  const storedData = sessionStorage.getItem("prescriptionResult");
  
  if (!storedData) {
    els.noDataState.hidden = false;
    els.resultsContent.hidden = true;
    return;
  }

  try {
    state.resultPayload = JSON.parse(storedData);
    els.noDataState.hidden = true;
    els.resultsContent.hidden = false;
    renderResults();
  } catch (error) {
    console.error("Error loading result data:", error);
    els.noDataState.hidden = false;
    els.resultsContent.hidden = true;
  }
}

function renderResults() {
  const result = state.resultPayload.result;
  
  // Set processed date
  if (els.processedDate && state.resultPayload.decodedAt) {
    const date = new Date(state.resultPayload.decodedAt);
    els.processedDate.textContent = date.toLocaleString();
  }

  // Review banner
  els.reviewBanner.textContent = result.requires_human_review
    ? `⚠️ Human review required: ${result.review_reason || "verify prescription details"}`
    : "✓ No major review flag reported. Still verify before medical use.";
  els.reviewBanner.classList.toggle("ok", !result.requires_human_review);

  // Summary and quality
  els.summaryText.textContent = result.summary || "No summary returned.";
  const quality = result.image_quality || {};
  els.qualityText.textContent = [
    quality.legibility ? `Legibility: ${quality.legibility}` : "",
    ...(quality.issues || []),
    quality.recommended_next_capture || ""
  ]
    .filter(Boolean)
    .join(" · ") || "Not reported.";

  // Patient info
  renderPatient(els.patientStrip, result.patient || {});

  // Medications
  renderMedications(els.medList, result.medications || []);

  // Schedule
  if (result.medications && result.medications.length > 0) {
    els.scheduleSection.hidden = false;
    state.currentSchedules = renderScheduleView(els.scheduleContainer, result.medications, escapeHtml);
    bindScheduleEvents();
  } else {
    els.scheduleSection.hidden = true;
  }

  // Abbreviations
  renderAbbreviations(els.abbrevList, result.abbreviations || []);

  // Other text
  renderOtherText(
    els.otherTextList,
    result.non_medication_text || [],
    result.follow_up_instructions || [],
    result.global_warnings || [],
    result.allergies || [],
    result.clinical_context || {},
    result.raw_transcription || []
  );

  // Workflow trace
  if (state.resultPayload.workflow) {
    renderWorkflowTrace(state.resultPayload.workflow);
  }

  // Raw JSON
  els.rawJson.textContent = JSON.stringify(state.resultPayload, null, 2);
}

function bindScheduleEvents() {
  // Add all to calendar button
  const addAllBtn = document.querySelector("#addAllToCalendar");
  if (addAllBtn) {
    addAllBtn.addEventListener("click", () => {
      state.currentMedicationIndex = "all";
      openModal();
    });
  }

  // Export ICS button
  const exportBtn = document.querySelector("#exportScheduleICS");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const startDate = new Date();
      exportScheduleAsICS(state.currentSchedules, startDate);
      showToast("Schedule exported as ICS file");
    });
  }

  // Individual medication calendar buttons
  document.querySelectorAll(".add-to-calendar-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.currentTarget.dataset.medIndex);
      state.currentMedicationIndex = index;
      openModal();
    });
  });
}

function openModal() {
  els.calendarModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  els.calendarModal.hidden = true;
  document.body.style.overflow = "";
}

async function confirmCalendarSetup() {
  const clientId = els.clientIdInput.value.trim();
  const apiKey = els.apiKeyInput.value.trim();
  const startDate = new Date(els.startDateInput.value);

  if (!clientId || !apiKey) {
    showToast("Please enter both Client ID and API Key");
    return;
  }

  // Save credentials
  localStorage.setItem("googleClientId", clientId);
  localStorage.setItem("googleApiKey", apiKey);
  state.googleCalendarConfig.clientId = clientId;
  state.googleCalendarConfig.apiKey = apiKey;

  closeModal();

  try {
    if (state.currentMedicationIndex === "all") {
      // Add all medications
      let successCount = 0;
      for (const schedule of state.currentSchedules) {
        try {
          await addMedicationToGoogleCalendar(schedule, startDate, clientId, apiKey);
          successCount++;
        } catch (error) {
          console.error(`Failed to add ${schedule.medication}:`, error);
        }
      }
      showToast(`Added ${successCount} medication(s) to Google Calendar`);
    } else {
      // Add single medication
      const schedule = state.currentSchedules[state.currentMedicationIndex];
      await addMedicationToGoogleCalendar(schedule, startDate, clientId, apiKey);
      showToast(`Added ${schedule.medication} to Google Calendar`);
    }
  } catch (error) {
    console.error("Calendar error:", error);
    showToast(`Error: ${error.message}`);
  }
}

function renderPatient(container, patient) {
  const fields = [
    ["Name", patient.name],
    ["Age", patient.age],
    ["Sex", patient.sex],
    ["Weight", patient.weight],
    ["Date", patient.date],
    ["Doctor", patient.doctor],
    ["Clinic", patient.clinic]
  ];

  container.replaceChildren(
    ...fields.map(([label, value]) => {
      const node = document.createElement("div");
      node.className = "patient-item";
      node.innerHTML = `<span class="label">${escapeHtml(label)}</span><strong>${escapeHtml(value || "Not read")}</strong>`;
      return node;
    })
  );
}

function renderMedications(container, medications) {
  if (!medications.length) {
    container.innerHTML = `<div class="compact-list"><p>No medication lines were confidently extracted.</p></div>`;
    return;
  }

  container.replaceChildren(
    ...medications.map((med, index) => {
      const card = document.createElement("article");
      card.className = "med-card";
      card.style.animationDelay = `${0.08 + index * 0.06}s`;
      const confidence = Math.round(Number(med.confidence || 0) * 100);
      const nameConfidence = Math.round(Number(med.medication_name_confidence || 0) * 100);
      const fields = [
        ["Raw line", med.raw_text],
        ["Strength", med.strength],
        ["Dose", med.dose],
        ["Form", med.form],
        ["Route", med.route],
        ["Frequency", med.frequency],
        ["Frequency meaning", formatNormalizedFrequency(med.normalized_frequency)],
        ["Duration", med.duration],
        ["Quantity", med.quantity],
        ["Refills", med.refills],
        ["Sig", med.sig],
        ["Timing", med.timing],
        ["Administration", med.administration_notes],
        ["Instructions", med.instructions]
      ];

      const alternatives = (med.alternatives || [])
        .map(
          (alt) =>
            `<li>${escapeHtml(alt.text)} (${Math.round(Number(alt.confidence || 0) * 100)}%) — ${escapeHtml(alt.reason)}</li>`
        )
        .join("");
      const warnings = (med.safety_flags || [])
        .concat((med.critical_uncertainties || []).map((item) => `Uncertain: ${item}`))
        .concat((med.uncertain_tokens || []).map((item) => `Token to verify: ${item}`))
        .concat(med.requires_verification ? ["Human verification required for this line."] : [])
        .map((warning) => `<li>${escapeHtml(warning)}</li>`)
        .join("");

      card.innerHTML = `
        <div class="med-head">
          <div>
            <div class="med-name">${escapeHtml(med.medication_name || "Unread medicine")}</div>
            <span class="muted">Line ${escapeHtml(String(med.line_number || ""))} · name ${nameConfidence}%</span>
          </div>
          <span class="confidence ${confidence < 75 ? "low" : ""}">${confidence}%</span>
        </div>
        <div class="med-grid">
          ${fields.map(([label, value]) => `<div class="med-field"><span>${escapeHtml(label)}</span>${escapeHtml(value || "Not read")}</div>`).join("")}
        </div>
        ${alternatives ? `<ul class="alt-list">${alternatives}</ul>` : ""}
        ${warnings ? `<ul class="warning-list">${warnings}</ul>` : ""}
      `;
      return card;
    })
  );
}

function renderAbbreviations(container, abbreviations) {
  if (!abbreviations.length) {
    container.innerHTML = "<p>No abbreviations extracted.</p>";
    return;
  }

  container.innerHTML = abbreviations
    .map((item) => {
      const confidence = Math.round(Number(item.confidence || 0) * 100);
      return `<p><strong>${escapeHtml(item.abbreviation)}</strong>: ${escapeHtml(item.likely_expansion)} <span class="muted">${confidence}%</span></p>`;
    })
    .join("");
}

function renderOtherText(container, otherText, followUp, warnings, allergies, clinicalContext, rawTranscription) {
  const rows = [
    ...allergies.map((item) => {
      const substance = item.substance || "not read";
      const reaction = item.reaction ? ` (${item.reaction})` : "";
      return `Allergy: ${substance}${reaction}`;
    }),
    ...contextRows(clinicalContext),
    ...otherText.map((item) => `${item.label}: ${item.text}`),
    ...followUp.map((item) => `Follow-up: ${item}`),
    ...warnings.map((item) => `Warning: ${item}`),
    ...rawTranscription
      .filter((item) => item.section !== "medication")
      .slice(0, 8)
      .map((item) => `Line ${item.line_number}: ${item.text}`)
  ].filter(Boolean);

  container.innerHTML = rows.length
    ? rows.map((row) => `<p>${escapeHtml(row)}</p>`).join("")
    : "<p>No other prescription text extracted.</p>";
}

function contextRows(context) {
  if (!context || typeof context !== "object") return [];
  const labels = [
    ["Diagnosis", context.diagnoses],
    ["Symptom", context.symptoms],
    ["Vital", context.vitals],
    ["Investigation", context.investigations],
    ["Advice", context.advice],
    ["Referral", context.referrals]
  ];
  return labels.flatMap(([label, values]) =>
    Array.isArray(values) ? values.map((value) => `${label}: ${value}`) : []
  );
}

function renderWorkflowTrace(workflow) {
  if (!els.workflowTrace || !els.workflowTraceWrap) return;
  if (workflow?.cached) {
    els.workflowTraceWrap.hidden = false;
    const li = document.createElement("li");
    li.className = "trace-total";
    const ms = workflow.totalMs != null ? ` · ${workflow.totalMs} ms` : "";
    li.textContent = `Served from cache${ms}`;
    els.workflowTrace.replaceChildren(li);
    return;
  }
  if (!workflow?.steps?.length) return;
  els.workflowTraceWrap.hidden = false;
  els.workflowTrace.replaceChildren(
    ...workflow.steps.map((step) => {
      const li = document.createElement("li");
      const ms = step.durationMs != null ? `${step.durationMs} ms` : "";
      const detail = step.message || step.summary || "";
      li.textContent = [step.label, step.status, ms, detail].filter(Boolean).join(" · ");
      if (step.status === "error") li.classList.add("trace-error");
      return li;
    })
  );
  if (workflow.totalMs != null) {
    const footer = document.createElement("li");
    footer.className = "trace-total";
    footer.textContent = `Total: ${workflow.totalMs} ms`;
    els.workflowTrace.appendChild(footer);
  }
}

function formatNormalizedFrequency(frequency) {
  if (!frequency || typeof frequency !== "object") return "";
  return [frequency.abbreviation, frequency.expansion, frequency.timing]
    .filter(Boolean)
    .join(" · ");
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
