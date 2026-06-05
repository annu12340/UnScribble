import {
  addMedicationToGoogleCalendar,
  exportScheduleAsICS,
  parseMedicationSchedule,
  isGoogleSignedIn,
  signOutGoogle,
  getGoogleUserInfo,
} from "../medication/medication-schedule.js";

const state = {
  resultPayload: null,
  currentSchedules: [],
  googleCalendarConfig: {
    clientId: "",
    enabled: false,
  },
  currentMedicationIndex: null,
};

const els = {
  noDataState: document.querySelector("#noDataState"),
  resultsContent: document.querySelector("#resultsContent"),
  processedDate: document.querySelector("#processedDate"),
  copyBtn: document.querySelector("#copyBtn"),
  downloadBtn: document.querySelector("#downloadBtn"),
  printBtn: document.querySelector("#printBtn"),
  rawTextContent: document.querySelector("#rawTextContent"),
  reviewBanner: document.querySelector("#reviewBanner"),
  summaryText: document.querySelector("#summaryText"),
  medicationsTable: document.querySelector("#medicationsTable"),
  medicationsTableBody: document.querySelector("#medicationsTableBody"),
  abbrevList: document.querySelector("#abbrevList"),
  toast: document.querySelector("#toast"),
  calendarModal: document.querySelector("#calendarModal"),
  modalClose: document.querySelector("#modalClose"),
  modalCancel: document.querySelector("#modalCancel"),
  modalConfirm: document.querySelector("#modalConfirm"),
  modalBody: document.querySelector("#calendarModal .modal-body"),
  startDateInput: document.querySelector("#startDateInput"),
};

let toastTimer = null;

init();

function init() {
  loadResultData();
  bindEvents();
  setTodayAsDefault();
  loadGoogleConfig();
}

async function loadGoogleConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();

    if (config.googleCalendar && config.googleCalendar.enabled) {
      state.googleCalendarConfig = {
        clientId: config.googleCalendar.clientId,
        enabled: true,
      };

      if (isGoogleSignedIn()) {
        updateGoogleSignInUI();
      }
    } else {
      document
        .querySelectorAll(".add-to-calendar-btn, #addAllToCalendarInline")
        .forEach((btn) => {
          btn.style.display = "none";
        });
    }
  } catch (error) {
    console.error("Error loading Google config:", error);
  }
}

function bindEvents() {
  els.copyBtn.addEventListener("click", copyResult);
  els.downloadBtn.addEventListener("click", downloadResult);
  els.printBtn.addEventListener("click", () => window.print());

  els.modalClose.addEventListener("click", closeModal);
  els.modalCancel.addEventListener("click", closeModal);
  els.modalConfirm.addEventListener("click", confirmCalendarSetup);

  // Toggle raw text
  const toggleBtn = document.querySelector("#toggleRawText");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const rawTextContent = document.querySelector("#rawTextContent");
      if (rawTextContent) {
        rawTextContent.hidden = !rawTextContent.hidden;
        toggleBtn.classList.toggle("active", !rawTextContent.hidden);
      }
    });
  }
}

function updateGoogleSignInUI() {
  const userInfo = getGoogleUserInfo();
  if (userInfo && els.modalBody) {
    const container = els.modalBody.querySelector(".google-auth-container");
    if (container) {
      const wrapper = createElement("div", "google-signed-in");
      const user = createElement("div", "google-user-info");
      const avatar = createElement("img", "google-avatar");
      avatar.src = userInfo.imageUrl || "";
      avatar.alt = userInfo.name || "Google user";

      const textWrap = document.createElement("div");
      textWrap.append(
        createElement("div", "google-user-name", userInfo.name || ""),
        createElement("div", "google-user-email", userInfo.email || ""),
      );
      user.append(avatar, textWrap);

      const signOutBtn = createElement("button", "btn ghost small", "Sign Out");
      signOutBtn.id = "signOutBtn";
      signOutBtn.type = "button";
      signOutBtn.addEventListener("click", async () => {
        await signOutGoogle();
        location.reload();
      });

      wrapper.append(user, signOutBtn);
      container.replaceChildren(wrapper);
    }
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

  // Raw transcription
  renderRawText(els.rawTextContent, result.raw_transcription || []);

  // Review banner
  els.reviewBanner.textContent = result.requires_human_review
    ? `⚠️ Human review required: ${result.review_reason || "verify prescription details"}`
    : "✓ No major review flag reported. Still verify before medical use.";
  els.reviewBanner.classList.toggle("ok", !result.requires_human_review);

  // Summary
  els.summaryText.textContent = result.summary || "No summary returned.";

  // Medications table
  renderMedicationsTable(els.medicationsTableBody, result.medications || []);

  // Parse schedules for calendar functionality
  if (result.medications && result.medications.length > 0) {
    state.currentSchedules = parseMedicationSchedule(result.medications);
    bindScheduleEvents();
  }

  // Abbreviations
  renderAbbreviations(els.abbrevList, result.abbreviations || []);
}

function bindScheduleEvents() {
  // Add all to calendar button (inline in medications section)
  const addAllBtnInline = document.querySelector("#addAllToCalendarInline");
  if (addAllBtnInline) {
    addAllBtnInline.addEventListener("click", () => {
      state.currentMedicationIndex = "all";
      openModal();
    });
  }

  // Export ICS button (inline in medications section)
  const exportBtnInline = document.querySelector("#exportScheduleICSInline");
  if (exportBtnInline) {
    exportBtnInline.addEventListener("click", () => {
      const startDate = new Date();
      exportScheduleAsICS(state.currentSchedules, startDate);
      showToast("Schedule exported as ICS file");
    });
  }
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
  if (!state.googleCalendarConfig.enabled) {
    showToast("Google Calendar is not configured on the server");
    return;
  }

  const startDate = new Date(els.startDateInput.value);

  closeModal();

  try {
    // Now add the medications
    if (state.currentMedicationIndex === "all") {
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (let i = 0; i < state.currentSchedules.length; i++) {
        const schedule = state.currentSchedules[i];
        try {
          await addMedicationToGoogleCalendar(
            schedule,
            startDate,
            state.googleCalendarConfig.clientId,
          );
          successCount++;
        } catch (error) {
          failCount++;
          errors.push({
            medication: schedule.medication,
            error: error.message,
          });
        }
      }

      if (successCount > 0 && failCount === 0) {
        showToast(
          `✓ Added all ${successCount} medication(s) to Google Calendar`,
        );
      } else if (successCount > 0 && failCount > 0) {
        showToast(
          `⚠️ Added ${successCount} medication(s), ${failCount} failed`,
        );
        console.error("[Calendar Setup] Failed medications:", errors);
      } else {
        showToast(`❌ Failed to add medications. Check console for details.`);
        console.error("[Calendar Setup] All medications failed:", errors);
      }
    } else {
      const schedule = state.currentSchedules[state.currentMedicationIndex];
      await addMedicationToGoogleCalendar(
        schedule,
        startDate,
        state.googleCalendarConfig.clientId,
      );
      showToast(`✓ Added ${schedule.medication} to Google Calendar`);
    }

    updateGoogleSignInUI();
  } catch (error) {
    console.error("Calendar error:", error);
    showToast(`Error: ${error.message}`);
  }
}

function renderMedicationsTable(tbody, medications) {
  if (!medications.length) {
    const tr = document.createElement("tr");
    const td = createElement("td", "", "No medications extracted");
    td.colSpan = 6;
    td.style.textAlign = "center";
    td.style.padding = "2rem";
    td.style.color = "var(--muted)";
    tr.append(td);
    tbody.replaceChildren(tr);
    return;
  }

  tbody.replaceChildren(
    ...medications.map((med, index) => {
      const tr = document.createElement("tr");
      tr.style.animationDelay = `${index * 0.05}s`;
      tr.classList.add("medication-row");
      tr.dataset.medIndex = index;
      tr.style.cursor = "pointer";

      const frequency =
        med.normalized_frequency?.expansion || med.frequency || "Not specified";
      const administration =
        med.administration_notes || med.timing || "Not specified";

      const nameCell = document.createElement("td");
      const nameWrap = createElement("div", "med-name-cell");
      nameWrap.append(createMedicationIcon());
      const nameText = document.createElement("div");
      nameText.append(
        createElement("strong", "", med.medication_name || "Unknown"),
      );
      if (med.form) {
        nameText.append(createElement("span", "med-form", med.form));
      }
      nameWrap.append(nameText);
      nameCell.append(nameWrap);

      const strengthCell = document.createElement("td");
      strengthCell.append(createElement("strong", "", med.strength || "—"));

      const doseCell = createElement("td", "", med.dose || "—");

      const frequencyCell = document.createElement("td");
      const frequencyWrap = createElement("div", "frequency-cell");
      frequencyWrap.append(createElement("span", "", frequency));
      if (med.normalized_frequency?.abbreviation) {
        frequencyWrap.append(
          createElement(
            "span",
            "freq-abbrev",
            med.normalized_frequency.abbreviation,
          ),
        );
      }
      frequencyCell.append(frequencyWrap);

      const durationCell = createElement("td", "", med.duration || "—");
      const adminCell = document.createElement("td");
      adminCell.append(createElement("div", "admin-cell", administration));
      tr.append(
        nameCell,
        strengthCell,
        doseCell,
        frequencyCell,
        durationCell,
        adminCell,
      );

      // Make entire row clickable
      tr.addEventListener("click", () => {
        navigateToMedicationDetails(medications[index]);
      });

      return tr;
    }),
  );
}

function navigateToMedicationDetails(medication) {
  // Store medication in sessionStorage
  sessionStorage.setItem("selectedMedication", JSON.stringify(medication));
  // Navigate to details page
  window.location.href = "/medication-details.html";
}

function renderRawText(container, rawTranscription) {
  if (!rawTranscription || !rawTranscription.length) {
    container.replaceChildren(
      createElement("p", "no-data", "No raw transcription available."),
    );
    return;
  }

  const lines = rawTranscription
    .slice()
    .sort((a, b) => (a.line_number || 0) - (b.line_number || 0))
    .map((item) => {
      const line = createElement("div", "raw-text-line");
      if (item.line_number) {
        line.append(
          createElement("span", "line-num", String(item.line_number)),
        );
      }
      if (item.section) {
        line.append(createElement("span", "line-section", item.section));
      }
      line.append(createElement("span", "line-text", item.text || ""));
      return line;
    });

  container.replaceChildren(...lines);
}

function renderAbbreviations(container, abbreviations) {
  if (!abbreviations.length) {
    container.replaceChildren(
      createElement("p", "", "No abbreviations extracted."),
    );
    return;
  }

  container.replaceChildren(
    ...abbreviations.map((item) => {
      const confidence = Math.round(Number(item.confidence || 0) * 100);
      const row = document.createElement("p");
      row.append(
        createElement("strong", "", item.abbreviation || ""),
        document.createTextNode(`: ${item.likely_expansion || ""} `),
        createElement("span", "muted", `${confidence}%`),
      );
      return row;
    }),
  );
}

async function copyResult() {
  if (!state.resultPayload) return;
  await navigator.clipboard.writeText(
    JSON.stringify(state.resultPayload.result, null, 2),
  );
  els.copyBtn.classList.add("is-success");
  showToast("Copied to clipboard");
  setTimeout(() => els.copyBtn.classList.remove("is-success"), 1400);
}

function downloadResult() {
  if (!state.resultPayload) return;
  const blob = new Blob([JSON.stringify(state.resultPayload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `unscribble-${new Date().toISOString().slice(0, 10)}.json`;
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

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== "") element.textContent = String(text);
  return element;
}

function createMedicationIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.classList.add("med-icon");

  const clipboardPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  clipboardPath.setAttribute(
    "d",
    "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2",
  );
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", "9");
  rect.setAttribute("y", "3");
  rect.setAttribute("width", "6");
  rect.setAttribute("height", "4");
  rect.setAttribute("rx", "1");
  const lines = document.createElementNS("http://www.w3.org/2000/svg", "path");
  lines.setAttribute("d", "M9 12h6M9 16h6");
  svg.append(clipboardPath, rect, lines);
  return svg;
}
