import { 
  addMedicationToGoogleCalendar,
  parseMedicationSchedule,
  isGoogleSignedIn,
  signOutGoogle,
  getGoogleUserInfo
} from "./medication-schedule.js";

const state = {
  medication: null,
  schedule: null,
  googleCalendarConfig: {
    clientId: "",
    enabled: false
  }
};

const els = {
  noDataState: document.querySelector("#noDataState"),
  medicationDetailsContent: document.querySelector("#medicationDetailsContent"),
  medName: document.querySelector("#medName"),
  medStrength: document.querySelector("#medStrength"),
  medForm: document.querySelector("#medForm"),
  medDose: document.querySelector("#medDose"),
  medFrequency: document.querySelector("#medFrequency"),
  medDuration: document.querySelector("#medDuration"),
  medRoute: document.querySelector("#medRoute"),
  medAdministration: document.querySelector("#medAdministration"),
  medScheduleTimes: document.querySelector("#medScheduleTimes"),
  medScheduleDuration: document.querySelector("#medScheduleDuration"),
  medQuantity: document.querySelector("#medQuantity"),
  medRefills: document.querySelector("#medRefills"),
  medTiming: document.querySelector("#medTiming"),
  medConfidence: document.querySelector("#medConfidence"),
  medSig: document.querySelector("#medSig"),
  sigSection: document.querySelector("#sigSection"),
  medWarnings: document.querySelector("#medWarnings"),
  warningsSection: document.querySelector("#warningsSection"),
  medAlternatives: document.querySelector("#medAlternatives"),
  alternativesSection: document.querySelector("#alternativesSection"),
  medRawText: document.querySelector("#medRawText"),
  addToCalendarBtn: document.querySelector("#addToCalendarBtn"),
  toast: document.querySelector("#toast"),
  calendarModal: document.querySelector("#calendarModal"),
  modalClose: document.querySelector("#modalClose"),
  modalCancel: document.querySelector("#modalCancel"),
  modalConfirm: document.querySelector("#modalConfirm"),
  modalBody: document.querySelector("#calendarModal .modal-body"),
  startDateInput: document.querySelector("#startDateInput")
};

let toastTimer = null;

init();

function init() {
  loadMedicationData();
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
        enabled: true
      };
      
      if (isGoogleSignedIn()) {
        updateGoogleSignInUI();
      }
    } else {
      els.addToCalendarBtn.style.display = 'none';
    }
  } catch (error) {
    console.error("Error loading Google config:", error);
  }
}

function bindEvents() {
  els.addToCalendarBtn.addEventListener("click", openModal);
  els.modalClose.addEventListener("click", closeModal);
  els.modalCancel.addEventListener("click", closeModal);
  els.modalConfirm.addEventListener("click", confirmCalendarSetup);
}

function updateGoogleSignInUI() {
  const userInfo = getGoogleUserInfo();
  if (userInfo && els.modalBody) {
    const signedInHTML = `
      <div class="google-signed-in">
        <div class="google-user-info">
          <img src="${escapeHtml(userInfo.imageUrl)}" alt="${escapeHtml(userInfo.name)}" class="google-avatar" />
          <div>
            <div class="google-user-name">${escapeHtml(userInfo.name)}</div>
            <div class="google-user-email">${escapeHtml(userInfo.email)}</div>
          </div>
        </div>
        <button class="btn ghost small" id="signOutBtn">Sign Out</button>
      </div>
    `;
    
    const container = els.modalBody.querySelector('.google-auth-container');
    if (container) {
      container.innerHTML = signedInHTML;
      const signOutBtn = container.querySelector('#signOutBtn');
      if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
          await signOutGoogle();
          location.reload();
        });
      }
    }
  }
}

function setTodayAsDefault() {
  const today = new Date().toISOString().split("T")[0];
  if (els.startDateInput) els.startDateInput.value = today;
}

function loadMedicationData() {
  const storedData = sessionStorage.getItem("selectedMedication");
  
  if (!storedData) {
    els.noDataState.hidden = false;
    els.medicationDetailsContent.hidden = true;
    return;
  }

  try {
    state.medication = JSON.parse(storedData);
    els.noDataState.hidden = true;
    els.medicationDetailsContent.hidden = false;
    renderMedicationDetails();
  } catch (error) {
    console.error("Error loading medication data:", error);
    els.noDataState.hidden = false;
    els.medicationDetailsContent.hidden = true;
  }
}

function renderMedicationDetails() {
  const med = state.medication;
  
  // Header
  els.medName.textContent = med.medication_name || "Unknown Medication";
  els.medStrength.textContent = med.strength || "Not specified";
  els.medForm.textContent = med.form || "Not specified";
  
  // Dosage Information
  els.medDose.textContent = med.dose || "—";
  els.medFrequency.textContent = formatNormalizedFrequency(med.normalized_frequency) || med.frequency || "—";
  els.medDuration.textContent = med.duration || "—";
  els.medRoute.textContent = med.route || "—";
  
  // Administration
  const adminText = [med.administration_notes, med.instructions].filter(Boolean).join(". ");
  if (adminText) {
    els.medAdministration.innerHTML = `<p>${escapeHtml(adminText)}</p>`;
  }
  
  // Schedule
  const schedules = parseMedicationSchedule([med]);
  if (schedules.length > 0) {
    state.schedule = schedules[0];
    renderSchedule(state.schedule);
  }
  
  // Additional Information
  els.medQuantity.textContent = med.quantity || "—";
  els.medRefills.textContent = med.refills || "—";
  els.medTiming.textContent = med.timing || "—";
  
  const confidence = Math.round(Number(med.confidence || 0) * 100);
  els.medConfidence.textContent = `${confidence}%`;
  els.medConfidence.style.color = confidence < 75 ? '#b45309' : '#067647';
  els.medConfidence.style.fontWeight = '700';
  
  // Sig
  if (med.sig) {
    els.medSig.innerHTML = `<p>${escapeHtml(med.sig)}</p>`;
    els.sigSection.hidden = false;
  } else {
    els.sigSection.hidden = true;
  }
  
  // Warnings
  const warnings = (med.safety_flags || [])
    .concat((med.critical_uncertainties || []).map((item) => `Uncertain: ${item}`))
    .concat((med.uncertain_tokens || []).map((item) => `Token to verify: ${item}`))
    .concat(med.requires_verification ? ["Human verification required for this medication."] : []);
  
  if (warnings.length > 0) {
    els.medWarnings.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
    els.warningsSection.hidden = false;
  } else {
    els.warningsSection.hidden = true;
  }
  
  // Alternatives
  const alternatives = (med.alternatives || []);
  if (alternatives.length > 0) {
    els.medAlternatives.innerHTML = alternatives
      .map((alt) => `<li>${escapeHtml(alt.text)} (${Math.round(Number(alt.confidence || 0) * 100)}%) — ${escapeHtml(alt.reason)}</li>`)
      .join("");
    els.alternativesSection.hidden = false;
  } else {
    els.alternativesSection.hidden = true;
  }
  
  // Raw Text
  if (med.raw_text) {
    els.medRawText.innerHTML = `<p>${escapeHtml(med.raw_text)}</p>`;
  }
}

function renderSchedule(schedule) {
  if (!schedule.schedule.times || schedule.schedule.times.length === 0) {
    els.medScheduleTimes.innerHTML = '<p style="color: var(--muted);">No schedule times available</p>';
    return;
  }
  
  const timesHtml = schedule.schedule.times
    .map((t) => {
      const timeDisplay = t.time || t.label;
      return `<div class="schedule-time">
        <span class="time-badge">${escapeHtml(timeDisplay)}</span>
        <span class="time-label">${escapeHtml(t.label)}</span>
      </div>`;
    })
    .join("");
  
  els.medScheduleTimes.innerHTML = timesHtml;
  
  if (schedule.duration) {
    els.medScheduleDuration.textContent = `Duration: ${schedule.duration}`;
    els.medScheduleDuration.style.display = 'block';
  } else {
    els.medScheduleDuration.style.display = 'none';
  }
}

function formatNormalizedFrequency(frequency) {
  if (!frequency || typeof frequency !== "object") return "";
  return [frequency.abbreviation, frequency.expansion, frequency.timing]
    .filter(Boolean)
    .join(" · ");
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

  if (!state.schedule) {
    showToast("No schedule available for this medication");
    return;
  }

  const startDate = new Date(els.startDateInput.value);

  closeModal();

  try {
    await addMedicationToGoogleCalendar(
      state.schedule,
      startDate,
      state.googleCalendarConfig.clientId
    );
    
    showToast(`✓ Added ${state.schedule.medication} to Google Calendar`);
    updateGoogleSignInUI();
  } catch (error) {
    console.error("Calendar error:", error);
    showToast(`Error: ${error.message}`);
  }
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
