import { 
  addMedicationToGoogleCalendar,
  parseMedicationSchedule,
  isGoogleSignedIn,
  signOutGoogle,
  getGoogleUserInfo
} from "./medication-schedule.js";
import {
  loadMechanismSidebar,
  mechanismSidebarElements,
} from "./mechanism-sidebar.js";
import {
  renderBodyEffectsForMedication,
  bodyEffectsPanelElements,
} from "./body-effects-panel.js";

/** Change this to test another drug in the demo database (e.g. lisinopril, metformin, ibuprofen). */
const DEMO_MEDICATION_NAME = "Amoxicillin";

const DEMO_MEDICATION = {
  medication_name: DEMO_MEDICATION_NAME,
  strength: "500 mg",
  form: "Capsule",
  dose: "1 capsule",
  frequency: "Three times daily",
  duration: "7 days",
  route: "Oral",
  quantity: "21",
  refills: "0",
  timing: "With or without food",
  confidence: 0.88,
  sig: "Take 1 capsule by mouth three times daily for 7 days",
  administration_notes: "Complete the full course even if you feel better.",
  raw_text: "Amox 500mg cap i tab po tds x7d",
  safety_flags: [],
  alternatives: [],
};

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
  medMeta: document.querySelector("#medMeta"),
  medMetaSep: document.querySelector("#medMetaSep"),
  medStrength: document.querySelector("#medStrength"),
  medForm: document.querySelector("#medForm"),
  medHeroChips: document.querySelector("#medHeroChips"),
  medConfidenceWrap: document.querySelector("#medConfidenceWrap"),
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
  startDateInput: document.querySelector("#startDateInput"),
  mechanism: mechanismSidebarElements(),
  bodyEffects: bodyEffectsPanelElements(),
  demoBanner: document.querySelector("#demoBanner"),
};

let toastTimer = null;

init();

function init() {
  loadMedicationData();
  bindEvents();
  bindSideNav();
  setTodayAsDefault();
  loadGoogleConfig();
}

function bindSideNav() {
  const links = document.querySelectorAll(".med-side-nav-link");
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id?.startsWith("#")) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      links.forEach((l) => l.classList.toggle("is-active", l === link));
    });
  });

  const sectionIds = ["section-overview", "section-body", "section-mechanism"];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  if (!sections.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.id;
      links.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
      });
    },
    { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.2, 0.45] }
  );

  sections.forEach((section) => observer.observe(section));
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

function buildDemoMedication(overrideName) {
  const name = String(overrideName || DEMO_MEDICATION_NAME).trim() || DEMO_MEDICATION_NAME;
  return { ...DEMO_MEDICATION, medication_name: name };
}

function loadMedicationData() {
  const params = new URLSearchParams(window.location.search);
  const medOverride = params.get("med");
  const forceDemo = params.get("demo") === "1";
  const storedData = sessionStorage.getItem("selectedMedication");

  if (!storedData || forceDemo) {
    state.medication = buildDemoMedication(medOverride);
    els.noDataState.hidden = true;
    els.medicationDetailsContent.hidden = false;
    if (els.demoBanner) {
      els.demoBanner.hidden = false;
      els.demoBanner.textContent = forceDemo
        ? `Demo mode — showing hardcoded data for “${state.medication.medication_name}”. Remove ?demo=1 to use results from session.`
        : `Demo mode — no medication in session. Showing “${state.medication.medication_name}”. Pick one from Results, or use ?med=ibuprofen`;
    }
    renderMedicationDetails();
    return;
  }

  try {
    state.medication = JSON.parse(storedData);
    els.noDataState.hidden = true;
    els.medicationDetailsContent.hidden = false;
    if (els.demoBanner) els.demoBanner.hidden = true;
    renderMedicationDetails();
  } catch (error) {
    console.error("Error loading medication data:", error);
    els.noDataState.hidden = false;
    els.medicationDetailsContent.hidden = true;
  }
}

function renderMedicationDetails() {
  const med = state.medication;

  const strength = med.strength?.trim() || "";
  const form = med.form?.trim() || "";
  const dose = med.dose?.trim() || "";
  const frequency =
    formatNormalizedFrequency(med.normalized_frequency) || med.frequency?.trim() || "";
  const route = med.route?.trim() || "";

  els.medName.textContent = med.medication_name || "Unknown Medication";
  els.medStrength.textContent = strength || "";
  els.medForm.textContent = form || "";

  if (els.medMeta) {
    const hasMeta = Boolean(strength || form);
    els.medMeta.classList.toggle("is-empty", !hasMeta);
    if (els.medMetaSep) els.medMetaSep.hidden = !(strength && form);
  }

  renderHeroChips({ dose, frequency, route, duration: med.duration?.trim() || "" });

  els.medDose.textContent = dose || "—";
  els.medFrequency.textContent = frequency || "—";
  els.medDuration.textContent = med.duration || "—";
  els.medRoute.textContent = route || "—";
  
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
  els.medConfidence.textContent = med.confidence != null ? `${confidence}%` : "—";
  if (els.medConfidenceWrap) {
    els.medConfidenceWrap.classList.toggle("is-low", confidence > 0 && confidence < 75);
    els.medConfidenceWrap.classList.toggle("is-high", confidence >= 75);
  }
  
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
  
  const rawDetails = document.querySelector(".med-details-raw");
  if (med.raw_text) {
    els.medRawText.innerHTML = `<p>${escapeHtml(med.raw_text)}</p>`;
    if (rawDetails) rawDetails.hidden = false;
  } else if (rawDetails) {
    rawDetails.hidden = true;
  }

  renderBodyEffectsForMedication(med.medication_name || "", els.bodyEffects);
  loadMechanismSidebar(med.medication_name || "", els.mechanism);
}

function renderHeroChips({ dose, frequency, route, duration }) {
  if (!els.medHeroChips) return;

  const chips = [
    { label: "Dose", value: dose },
    { label: "Frequency", value: frequency },
    { label: "Route", value: route },
    { label: "Duration", value: duration },
  ].filter((chip) => chip.value);

  if (chips.length === 0) {
    els.medHeroChips.innerHTML = "";
    els.medHeroChips.hidden = true;
    return;
  }

  els.medHeroChips.hidden = false;
  els.medHeroChips.innerHTML = chips
    .map(
      (chip) => `<span class="med-hero-chip">
        <span class="med-hero-chip-label">${escapeHtml(chip.label)}</span>
        <span class="med-hero-chip-value">${escapeHtml(chip.value)}</span>
      </span>`
    )
    .join("");
}

function renderSchedule(schedule) {
  if (!schedule.schedule.times || schedule.schedule.times.length === 0) {
    els.medScheduleTimes.innerHTML =
      '<p class="schedule-empty">No schedule times parsed — check frequency on the prescription.</p>';
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
