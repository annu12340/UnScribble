import {
  addMedicationToGoogleCalendar,
  parseMedicationSchedule,
  isGoogleSignedIn,
  signOutGoogle,
  getGoogleUserInfo,
} from "../medication/medication-schedule.js";
import {
  loadMechanismSidebar,
  mechanismSidebarElements,
} from "../medication/mechanism-sidebar.js";
import {
  renderOverviewCharts,
  renderInsightCharts,
  setChartsLoading,
  syncChartReveal,
  INSIGHT_CHART_IDS,
} from "../medication/medication-charts.js";
import {
  buildInsightsRequestBody,
  collectMedicationWarnings,
  confidencePercent,
  formatNormalizedFrequency,
  hasInsightPayload,
  resolveMedicationLoad,
} from "../medication/medication-details-shared.js";
import { renderInsightSections } from "../medication/medication-details-sections.js";
import {
  calculateProgress,
  calculateNextDose,
  categorizeScheduleBlocks,
  categorizeSideEffects,
} from "../medication/tier-calculations.js";

const state = {
  medication: null,
  schedule: null,
  googleCalendarConfig: {
    clientId: "",
    enabled: false,
  },
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
  medConfidenceGauge: document.querySelector("#medConfidenceGauge"),
  medDose: document.querySelector("#medDose"),
  medFrequency: document.querySelector("#medFrequency"),
  medDuration: document.querySelector("#medDuration"),
  medRoute: document.querySelector("#medRoute"),
  medAdministration: document.querySelector("#medAdministration"),
  medScheduleTimes: document.querySelector("#medScheduleTimes"),
  medScheduleDuration: document.querySelector("#medScheduleDuration"),
  medConfidence: document.querySelector("#medConfidence"),
  medSig: document.querySelector("#medSig"),
  sigSection: document.querySelector("#sigSection"),
  medWarnings: document.querySelector("#medWarnings"),
  warningsSection: document.querySelector("#warningsSection"),
  medAlternatives: document.querySelector("#medAlternatives"),
  alternativesSection: document.querySelector("#alternativesSection"),
  regulatorySection: document.querySelector("#section-regulatory"),
  medRegulatorySummary: document.querySelector("#medRegulatorySummary"),
  medFullyBannedCountries: document.querySelector("#medFullyBannedCountries"),
  medPrescriptionOnlyCountries: document.querySelector(
    "#medPrescriptionOnlyCountries",
  ),
  medRestrictedAgeGroups: document.querySelector("#medRestrictedAgeGroups"),
  medBlackBoxWarnings: document.querySelector("#medBlackBoxWarnings"),
  medWithdrawnFormulations: document.querySelector("#medWithdrawnFormulations"),
  medRegulatoryAlerts: document.querySelector("#medRegulatoryAlerts"),
  medIngredientsSection: document.querySelector("#section-ingredients"),
  medActiveIngredient: document.querySelector("#medActiveIngredient"),
  medEquivalentBrands: document.querySelector("#medEquivalentBrands"),
  medCombinationDrugs: document.querySelector("#medCombinationDrugs"),
  medDuplicateIngredientWarnings: document.querySelector(
    "#medDuplicateIngredientWarnings",
  ),
  medFoodCard: document.querySelector("#medFoodCard"),
  medFoodIcon: document.querySelector("#medFoodIcon"),
  medFoodText: document.querySelector("#medFoodText"),
  medFoodDetail: document.querySelector("#medFoodDetail"),
  medPkOnset: document.querySelector("#medPkOnset"),
  medPkPeak: document.querySelector("#medPkPeak"),
  medPkDuration: document.querySelector("#medPkDuration"),
  medCommonInteractingMedications: document.querySelector(
    "#medCommonInteractingMedications",
  ),
  medFoodSupplementAvoidance: document.querySelector(
    "#medFoodSupplementAvoidance",
  ),
  medContraindicatedConditions: document.querySelector(
    "#medContraindicatedConditions",
  ),
  medPregnancyLactationCategory: document.querySelector(
    "#medPregnancyLactationCategory",
  ),
  medRenalHepaticDosingGuidance: document.querySelector(
    "#medRenalHepaticDosingGuidance",
  ),
  medAgePrecautions: document.querySelector("#medAgePrecautions"),
  medAllergyRiskSummary: document.querySelector("#medAllergyRiskSummary"),
  medCommonSideEffects: document.querySelector("#medCommonSideEffects"),
  medSeriousAdverseEvents: document.querySelector("#medSeriousAdverseEvents"),
  medMonitoringNotes: document.querySelector("#medMonitoringNotes"),
  medStorageInstructions: document.querySelector("#medStorageInstructions"),
  medMissedDoseGuidance: document.querySelector("#medMissedDoseGuidance"),
  medRecentRecalls: document.querySelector("#medRecentRecalls"),
  medCountryRestrictions: document.querySelector("#medCountryRestrictions"),
  medWithdrawalHistory: document.querySelector("#medWithdrawalHistory"),
  addToCalendarBtn: document.querySelector("#addToCalendarBtn"),
  toast: document.querySelector("#toast"),
  calendarModal: document.querySelector("#calendarModal"),
  modalClose: document.querySelector("#modalClose"),
  modalCancel: document.querySelector("#modalCancel"),
  modalConfirm: document.querySelector("#modalConfirm"),
  modalBody: document.querySelector("#calendarModal .modal-body"),
  startDateInput: document.querySelector("#startDateInput"),
  mechanism: mechanismSidebarElements(),
  demoBanner: document.querySelector("#demoBanner"),
  // Tier 1 elements
  snapshotCard: document.querySelector("#snapshotCard"),
  snapshotName: document.querySelector("#snapshotName"),
  snapshotMeta: document.querySelector("#snapshotMeta"),
  snapshotConfidence: document.querySelector("#snapshotConfidence"),
  snapshotConfidenceValue: document.querySelector("#snapshotConfidenceValue"),
  snapshotProgress: document.querySelector("#snapshotProgress"),
  snapshotProgressLabel: document.querySelector("#snapshotProgressLabel"),
  snapshotProgressPercent: document.querySelector("#snapshotProgressPercent"),
  snapshotProgressFill: document.querySelector("#snapshotProgressFill"),
  snapshotNextDose: document.querySelector("#snapshotNextDose"),
  snapshotNextDoseTime: document.querySelector("#snapshotNextDoseTime"),
  snapshotNextDoseCountdown: document.querySelector(
    "#snapshotNextDoseCountdown",
  ),
  alertsSection: document.querySelector("#alertsSection"),
  alertDanger: document.querySelector("#alertDanger"),
  alertDangerList: document.querySelector("#alertDangerList"),
  alertWarning: document.querySelector("#alertWarning"),
  alertWarningList: document.querySelector("#alertWarningList"),
  scheduleBlocks: document.querySelector("#scheduleBlocks"),
  scheduleNowIndicator: document.querySelector("#scheduleNowIndicator"),
  // Tier 2 elements
  severityCommon: document.querySelector("#severityCommon"),
  severityCommonList: document.querySelector("#severityCommonList"),
  severityContact: document.querySelector("#severityContact"),
  severityContactList: document.querySelector("#severityContactList"),
  severityEmergency: document.querySelector("#severityEmergency"),
  severityEmergencyList: document.querySelector("#severityEmergencyList"),
  sideEffectsEmpty: document.querySelector("#sideEffectsEmpty"),
  lifestyleFoodCard: document.querySelector("#lifestyleFoodCard"),
  lifestyleFoodIcon: document.querySelector("#lifestyleFoodIcon"),
  lifestyleFoodText: document.querySelector("#lifestyleFoodText"),
  lifestyleAlcoholCard: document.querySelector("#lifestyleAlcoholCard"),
  lifestyleStorageText: document.querySelector("#lifestyleStorageText"),
  interactionBadges: document.querySelector("#interactionBadges"),
  interactionsEmpty: document.querySelector("#interactionsEmpty"),
  missedDoseContent: document.querySelector("#missedDoseContent"),
  missedDoseEmpty: document.querySelector("#missedDoseEmpty"),
};

let toastTimer = null;
const chartInstances = {};
let insightsRequest = null;

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

  const sectionIds = [
    "tierOne",
    "todaysSchedule",
    "sideEffectsCard",
    "lifestyleCard",
    "interactionsCard",
    "tierThree",
  ];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.id;
      links.forEach((link) => {
        link.classList.toggle(
          "is-active",
          link.getAttribute("href") === `#${id}`,
        );
      });
    },
    { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.2, 0.45] },
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
        enabled: true,
      };

      if (isGoogleSignedIn()) {
        updateGoogleSignInUI();
      }
    } else if (els.addToCalendarBtn) {
      els.addToCalendarBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading Google config:", error);
  }
}

function bindEvents() {
  if (els.addToCalendarBtn) {
    els.addToCalendarBtn.addEventListener("click", openModal);
  }
  if (els.modalClose) els.modalClose.addEventListener("click", closeModal);
  if (els.modalCancel) els.modalCancel.addEventListener("click", closeModal);
  if (els.modalConfirm) {
    els.modalConfirm.addEventListener("click", confirmCalendarSetup);
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

function loadMedicationData() {
  const params = new URLSearchParams(window.location.search);
  const medOverride = params.get("med");
  const forceDemo = params.get("demo") === "1";
  let storedData = sessionStorage.getItem("selectedMedication");

  if (!storedData) {
    try {
      storedData = localStorage.getItem("selectedMedication");
      if (storedData) {
        localStorage.removeItem("selectedMedication");
      }
    } catch (err) {
      console.warn("localStorage fallback failed", err);
    }
  }

  const resolved = resolveMedicationLoad({
    storedData,
    forceDemo,
    medOverride,
  });

  if (resolved.mode === "empty") {
    state.medication = null;
    els.noDataState.hidden = false;
    els.medicationDetailsContent.hidden = true;
    if (resolved.error) {
      console.error("Error loading medication data:", resolved.error);
    }
    return;
  }

  state.medication = resolved.medication;
  els.noDataState.hidden = true;
  els.medicationDetailsContent.hidden = false;

  if (resolved.mode === "demo" && els.demoBanner) {
    els.demoBanner.hidden = false;
    els.demoBanner.textContent = resolved.demoBannerText || "";
  } else if (els.demoBanner) {
    els.demoBanner.hidden = true;
  }

  renderMedicationDetails();
}

function renderMedicationDetails() {
  const med = state.medication;
  if (!med) return;

  const strength = med.strength?.trim() || "";
  const form = med.form?.trim() || "";
  const dose = med.dose?.trim() || "";
  const frequency =
    formatNormalizedFrequency(med.normalized_frequency) ||
    med.frequency?.trim() ||
    "";
  const route = med.route?.trim() || "";

  if (els.medName) {
    els.medName.textContent = med.medication_name || "Unknown Medication";
  }
  if (els.medStrength) els.medStrength.textContent = strength || "";
  if (els.medForm) els.medForm.textContent = form || "";

  if (els.medMeta) {
    const hasMeta = Boolean(strength || form);
    els.medMeta.classList.toggle("is-empty", !hasMeta);
    if (els.medMetaSep) els.medMetaSep.hidden = !(strength && form);
  }

  renderHeroChips({
    dose,
    frequency,
    route,
    duration: med.duration?.trim() || "",
  });

  if (els.medDose) els.medDose.textContent = dose || "—";
  if (els.medFrequency) els.medFrequency.textContent = frequency || "—";
  if (els.medDuration) els.medDuration.textContent = med.duration || "—";
  if (els.medRoute) els.medRoute.textContent = route || "—";

  const adminText = [med.administration_notes, med.instructions]
    .filter(Boolean)
    .join(". ");
  if (adminText && els.medAdministration) {
    els.medAdministration.replaceChildren(createElement("p", "", adminText));
  }

  const schedules = parseMedicationSchedule([med]);
  if (schedules.length > 0) {
    state.schedule = schedules[0];
    renderSchedule(state.schedule);
  }

  const confidence = confidencePercent(med.confidence);
  if (els.medConfidence) {
    els.medConfidence.textContent =
      med.confidence != null ? `${confidence}%` : "—";
  }
  if (els.medConfidenceWrap) {
    els.medConfidenceWrap.classList.toggle(
      "is-low",
      confidence > 0 && confidence < 75,
    );
    els.medConfidenceWrap.classList.toggle("is-high", confidence >= 75);
  }
  renderConfidenceGauge(med.confidence);

  if (med.sig && els.medSig && els.sigSection) {
    els.medSig.replaceChildren(createElement("p", "", med.sig));
    els.sigSection.hidden = false;
  } else if (els.sigSection) {
    els.sigSection.hidden = true;
  }

  const warnings = collectMedicationWarnings(med);
  if (warnings.length > 0) {
    if (els.medWarnings) {
      els.medWarnings.replaceChildren(
        ...warnings.map((warning) => createElement("li", "", warning)),
      );
    }
    if (els.warningsSection) els.warningsSection.hidden = false;
  } else {
    if (els.medWarnings) els.medWarnings.replaceChildren();
    if (els.warningsSection) els.warningsSection.hidden = true;
  }

  const alternatives = med.alternatives || [];
  if (alternatives.length > 0) {
    if (els.medAlternatives) {
      els.medAlternatives.replaceChildren(
        ...alternatives.map((alt) =>
          createElement(
            "li",
            "",
            `${alt.text || ""} (${Math.round(Number(alt.confidence || 0) * 100)}%) - ${alt.reason || ""}`,
          ),
        ),
      );
    }
    if (els.alternativesSection) els.alternativesSection.hidden = false;
  } else {
    if (els.medAlternatives) els.medAlternatives.replaceChildren();
    if (els.alternativesSection) els.alternativesSection.hidden = true;
  }

  renderInsightSections(med, els, renderTagList);
  renderPharmacology(med);

  // Tier 1: Snapshot card, alerts, schedule blocks
  renderTier1(med, state.schedule);

  // Tier 2: Side effects by severity, lifestyle, interactions
  renderTier2(med);

  renderOverviewCharts(med, state.schedule, chartInstances);

  if (med._insightsLoaded) {
    renderInsightCharts(med, state.schedule, chartInstances);
  } else {
    setChartsLoading(INSIGHT_CHART_IDS);
  }

  syncChartReveal(chartInstances);

  loadMechanismSidebar(med.medication_name || "", els.mechanism);
  ensureMedicationInsights(med);
}

function ensureMedicationInsights(med) {
  if (!med || med._insightsLoaded || med._insightsLoading) return;
  if (hasInsightPayload(med)) {
    med._insightsLoaded = true;
    renderInsightCharts(med, state.schedule, chartInstances);
    return;
  }

  med._insightsLoading = true;
  setChartsLoading(INSIGHT_CHART_IDS);

  if (insightsRequest) return;

  insightsRequest = loadMedicationInsights(
    med.medication_name || "",
    med.raw_text || "",
  )
    .catch((error) => {
      console.warn("Medication insights load failed:", error);
      if (els.medRegulatorySummary) {
        els.medRegulatorySummary.textContent =
          "Regulatory and ingredient information unavailable.";
      }
      if (els.medActiveIngredient) {
        els.medActiveIngredient.textContent = med.medication_name || "—";
      }
    })
    .finally(() => {
      med._insightsLoading = false;
      insightsRequest = null;
    });
}

async function loadMedicationInsights(medicationName, rawText) {
  const response = await fetch("/api/medication-insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildInsightsRequestBody(medicationName, rawText)),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Medication insights request failed: ${response.status} ${details}`,
    );
  }

  const insights = await response.json();
  if (typeof insights !== "object" || insights === null) {
    throw new Error("Invalid medication insights response");
  }

  state.medication = {
    ...state.medication,
    ...insights,
    _insightsLoaded: true,
  };
  renderMedicationDetails();
  return insights;
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
    els.medHeroChips.replaceChildren();
    els.medHeroChips.hidden = true;
    return;
  }

  els.medHeroChips.hidden = false;
  els.medHeroChips.replaceChildren(
    ...chips.map((chip) => {
      const item = createElement("span", "med-hero-chip");
      item.append(
        createElement("span", "med-hero-chip-label", chip.label),
        createElement("span", "med-hero-chip-value", chip.value),
      );
      return item;
    }),
  );
}

function renderSchedule(schedule) {
  if (!els.medScheduleTimes) return;

  if (
    !schedule ||
    !schedule.schedule ||
    !schedule.schedule.times ||
    schedule.schedule.times.length === 0
  ) {
    els.medScheduleTimes.replaceChildren(
      createElement(
        "p",
        "schedule-empty",
        "No schedule times parsed - check frequency on the prescription.",
      ),
    );
    if (els.medScheduleDuration) {
      els.medScheduleDuration.style.display = "none";
    }
    return;
  }

  els.medScheduleTimes.replaceChildren(
    ...schedule.schedule.times.map((t) => {
      const timeDisplay = t.time || t.label;
      const item = createElement("div", "schedule-time");
      item.append(
        createElement("span", "time-badge", timeDisplay),
        createElement("span", "time-label", t.label),
      );
      return item;
    }),
  );

  if (els.medScheduleDuration) {
    if (schedule.duration) {
      els.medScheduleDuration.textContent = `Duration: ${schedule.duration}`;
      els.medScheduleDuration.style.display = "block";
    } else {
      els.medScheduleDuration.style.display = "none";
    }
  }
}

function renderTagList(el, values, emptyText) {
  if (!el) return;
  const items = Array.isArray(values) ? values : [];
  if (items.length === 0) {
    el.replaceChildren(
      createElement("li", "med-tag med-tag--empty", emptyText),
    );
    return;
  }
  el.replaceChildren(
    ...items.map((item) => createElement("li", "med-tag", String(item))),
  );
}

const FOOD_PRESETS = {
  with: {
    icon: "🍽️",
    text: "Take with food",
    detail: "Take alongside a meal or snack.",
  },
  without: {
    icon: "⏳",
    text: "Take on an empty stomach",
    detail: "Take 1 hour before or 2 hours after eating.",
  },
  either: {
    icon: "✅",
    text: "With or without food",
    detail: "Food timing is flexible.",
  },
};

function resolveFood(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (!text) return null;
  if (text.includes("without") || text.includes("empty")) return "without";
  if (text.includes("either") || text.includes("with or without")) {
    return "either";
  }
  if (text.includes("with")) return "with";
  return "either";
}

function formatHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
}

function renderPharmacology(med) {
  const food = resolveFood(med.administration?.food_instruction);
  if (els.medFoodCard) {
    const preset = food ? FOOD_PRESETS[food] : null;
    els.medFoodCard.dataset.food = food || "unknown";
    if (els.medFoodIcon) {
      els.medFoodIcon.textContent = preset ? preset.icon : "🍽️";
    }
    if (els.medFoodText) {
      els.medFoodText.textContent = preset
        ? preset.text
        : "Food guidance not available";
    }
    if (els.medFoodDetail) {
      els.medFoodDetail.textContent = preset
        ? preset.detail
        : "Ask your pharmacist about taking this with food.";
    }
  }

  const pk = med.pharmacokinetics || {};
  if (els.medPkOnset) els.medPkOnset.textContent = formatHours(pk.onset_hours);
  if (els.medPkPeak) els.medPkPeak.textContent = formatHours(pk.peak_hours);
  if (els.medPkDuration) {
    els.medPkDuration.textContent = formatHours(pk.duration_hours);
  }
}

function renderConfidenceGauge(confidence) {
  if (!els.medConfidenceGauge) return;
  const percentage = confidencePercent(confidence);
  els.medConfidenceGauge.style.setProperty("--gauge", percentage);
  const color =
    percentage >= 75 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444";
  els.medConfidenceGauge.style.setProperty("--gauge-color", color);
  els.medConfidenceGauge.dataset.label = `${percentage}%`;
  if (els.medConfidence) els.medConfidence.textContent = `${percentage}%`;
  if (els.medConfidenceWrap) {
    els.medConfidenceWrap.setAttribute(
      "aria-label",
      `Decode confidence ${percentage} percent`,
    );
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
      state.googleCalendarConfig.clientId,
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

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== "") element.textContent = String(text);
  return element;
}

// ═══════════════════════════════════════════════════════════════
// TIER RENDERING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

let countdownInterval = null;

/**
 * Render Tier 1: Snapshot card, alerts, and schedule blocks.
 */
function renderTier1(med, schedule) {
  renderSnapshotCard(med);
  renderAlerts(med);
  renderScheduleBlocks(schedule);
  startCountdownTimer(schedule);
}

/**
 * Render the snapshot card with medication name, stats, progress, and next dose.
 */
function renderSnapshotCard(med) {
  // Name and meta
  if (els.snapshotName) {
    els.snapshotName.textContent = med.medication_name || "Unknown Medication";
  }

  const strength = med.strength?.trim() || "";
  const form = med.form?.trim() || "";
  if (els.snapshotMeta) {
    els.snapshotMeta.textContent = [strength, form].filter(Boolean).join(" · ");
  }

  // Confidence
  const confidence = confidencePercent(med.confidence);
  if (els.snapshotConfidenceValue) {
    els.snapshotConfidenceValue.textContent =
      confidence > 0 ? `${confidence}%` : "—";
  }

  // Progress bar
  const progress = calculateProgress(med.duration);
  if (progress && els.snapshotProgress) {
    els.snapshotProgress.hidden = false;
    if (els.snapshotProgressLabel) {
      els.snapshotProgressLabel.textContent = `Day ${progress.currentDay} of ${progress.totalDays}`;
    }
    if (els.snapshotProgressPercent) {
      els.snapshotProgressPercent.textContent = `${progress.percentRemaining}% remaining`;
    }
    if (els.snapshotProgressFill) {
      els.snapshotProgressFill.style.width = `${progress.percentComplete}%`;
    }
  } else if (els.snapshotProgress) {
    els.snapshotProgress.hidden = true;
  }
}

/**
 * Render alert cards (danger and warning).
 */
function renderAlerts(med) {
  const warnings = collectMedicationWarnings(med);
  const seriousEvents = med.serious_adverse_events || [];

  // Categorize warnings
  const dangerItems = [];
  const cautionItems = [];

  for (const w of warnings) {
    const lower = w.toLowerCase();
    if (
      lower.includes("emergency") ||
      lower.includes("severe") ||
      lower.includes("immediately") ||
      lower.includes("stop taking")
    ) {
      dangerItems.push(w);
    } else {
      cautionItems.push(w);
    }
  }

  // Add serious adverse events to danger
  dangerItems.push(...seriousEvents);

  const hasDanger = dangerItems.length > 0;
  const hasCaution = cautionItems.length > 0;

  if (els.alertsSection) {
    els.alertsSection.hidden = !hasDanger && !hasCaution;
  }

  if (els.alertDanger) {
    els.alertDanger.hidden = !hasDanger;
    if (hasDanger && els.alertDangerList) {
      els.alertDangerList.replaceChildren(
        ...dangerItems.map((item) => createElement("li", "", item)),
      );
    }
  }

  if (els.alertWarning) {
    els.alertWarning.hidden = !hasCaution;
    if (hasCaution && els.alertWarningList) {
      els.alertWarningList.replaceChildren(
        ...cautionItems.map((item) => createElement("li", "", item)),
      );
    }
  }
}

/**
 * Render today's schedule blocks.
 */
function renderScheduleBlocks(schedule) {
  if (!els.scheduleBlocks) return;

  const times = schedule?.schedule?.times || [];
  if (times.length === 0) {
    els.scheduleBlocks.replaceChildren(
      createElement("p", "schedule-empty", "No schedule times available"),
    );
    if (els.snapshotNextDose) els.snapshotNextDose.hidden = true;
    return;
  }

  const blocks = categorizeScheduleBlocks(times);
  els.scheduleBlocks.replaceChildren(
    ...blocks.map((block) => {
      const div = createElement(
        "div",
        `schedule-block schedule-block--${block.status}`,
      );
      div.append(
        createElement("span", "schedule-block-time", block.time),
        createElement(
          "span",
          "schedule-block-label",
          getScheduleLabel(block.label),
        ),
        createElement(
          "span",
          "schedule-block-status",
          getStatusText(block.status),
        ),
      );
      return div;
    }),
  );

  // Update next dose indicator
  const nextDose = calculateNextDose(times);
  if (nextDose && els.snapshotNextDose) {
    els.snapshotNextDose.hidden = false;
    if (els.snapshotNextDoseTime) {
      els.snapshotNextDoseTime.textContent = nextDose.time;
    }
    if (els.snapshotNextDoseCountdown) {
      els.snapshotNextDoseCountdown.textContent = nextDose.countdown;
    }
  } else if (els.snapshotNextDose) {
    els.snapshotNextDose.hidden = true;
  }

  // Update now indicator
  if (els.scheduleNowIndicator) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    const timeStr = `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
    els.scheduleNowIndicator.textContent = `Now: ${timeStr}`;
    els.scheduleNowIndicator.hidden = false;
  }
}

function getScheduleLabel(label) {
  const lower = (label || "").toLowerCase();
  if (lower.includes("morning") || lower.includes("am")) return "Morning";
  if (lower.includes("afternoon")) return "Afternoon";
  if (
    lower.includes("evening") ||
    lower.includes("night") ||
    lower.includes("pm")
  ) {
    return "Evening";
  }
  return label || "";
}

function getStatusText(status) {
  switch (status) {
    case "completed":
      return "✓ completed";
    case "current":
      return "● current";
    case "upcoming":
      return "upcoming";
    default:
      return "";
  }
}

/**
 * Start countdown timer that updates every minute.
 */
function startCountdownTimer(schedule) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  const times = schedule?.schedule?.times || [];
  if (times.length === 0) return;

  countdownInterval = setInterval(() => {
    const nextDose = calculateNextDose(times);
    if (nextDose && els.snapshotNextDoseCountdown) {
      els.snapshotNextDoseCountdown.textContent = nextDose.countdown;
    }
  }, 60000); // Update every minute
}

/**
 * Render Tier 2: Side effects by severity, lifestyle, interactions.
 */
function renderTier2(med) {
  renderSideEffectsBySeverity(med);
  renderLifestyleCards(med);
  renderInteractionBadges(med);
  renderMissedDoseGuide(med);
}

/**
 * Render side effects grouped by severity (common, contact doctor, emergency).
 */
function renderSideEffectsBySeverity(med) {
  const commonEffects = med.common_side_effects || [];
  const seriousEffects = med.serious_adverse_events || [];
  const allEffects = [...commonEffects, ...seriousEffects];

  if (allEffects.length === 0) {
    if (els.severityCommon) els.severityCommon.hidden = true;
    if (els.severityContact) els.severityContact.hidden = true;
    if (els.severityEmergency) els.severityEmergency.hidden = true;
    if (els.sideEffectsEmpty) els.sideEffectsEmpty.hidden = false;
    return;
  }

  if (els.sideEffectsEmpty) els.sideEffectsEmpty.hidden = true;

  const categorized = categorizeSideEffects(allEffects);

  // Common
  if (els.severityCommon) {
    els.severityCommon.hidden = categorized.common.length === 0;
    if (categorized.common.length > 0 && els.severityCommonList) {
      els.severityCommonList.replaceChildren(
        ...categorized.common.map((e) => createElement("li", "", e)),
      );
    }
  }

  // Contact doctor
  if (els.severityContact) {
    els.severityContact.hidden = categorized.contact.length === 0;
    if (categorized.contact.length > 0 && els.severityContactList) {
      els.severityContactList.replaceChildren(
        ...categorized.contact.map((e) => createElement("li", "", e)),
      );
    }
  }

  // Emergency
  if (els.severityEmergency) {
    els.severityEmergency.hidden = categorized.emergency.length === 0;
    if (categorized.emergency.length > 0 && els.severityEmergencyList) {
      els.severityEmergencyList.replaceChildren(
        ...categorized.emergency.map((e) => createElement("li", "", e)),
      );
    }
  }
}

/**
 * Render food and lifestyle instruction cards.
 */
function renderLifestyleCards(med) {
  const food = resolveFood(med.administration?.food_instruction);

  // Food card
  if (els.lifestyleFoodCard) {
    els.lifestyleFoodCard.dataset.food = food || "unknown";
    if (els.lifestyleFoodIcon) {
      els.lifestyleFoodIcon.textContent =
        food === "with" ? "🍽️" : food === "without" ? "⏳" : "✅";
    }
    if (els.lifestyleFoodText) {
      const foodTexts = {
        with: "Take with food",
        without: "Take on empty stomach",
        either: "With or without food",
      };
      els.lifestyleFoodText.textContent =
        foodTexts[food] || "Food guidance not available";
    }
  }

  // Alcohol card - show if there are alcohol interactions
  const avoidItems = med.food_supplement_avoidance || [];
  const hasAlcohol = avoidItems.some((item) =>
    (item || "").toLowerCase().includes("alcohol"),
  );
  if (els.lifestyleAlcoholCard) {
    els.lifestyleAlcoholCard.hidden = !hasAlcohol;
  }

  // Storage
  if (els.lifestyleStorageText) {
    els.lifestyleStorageText.textContent =
      med.storage_instructions || "Room temperature";
  }
}

/**
 * Render interaction severity badges.
 */
function renderInteractionBadges(med) {
  if (!els.interactionBadges) return;

  const interactions = med.common_interacting_medications || [];
  if (interactions.length === 0) {
    if (els.interactionsEmpty) els.interactionsEmpty.hidden = false;
    return;
  }

  if (els.interactionsEmpty) els.interactionsEmpty.hidden = true;

  // Group interactions by severity (we'll infer severity from the text)
  const badges = interactions.slice(0, 6).map((interaction) => {
    const lower = (interaction || "").toLowerCase();
    let severity = "low";
    if (
      lower.includes("serious") ||
      lower.includes("severe") ||
      lower.includes("major") ||
      lower.includes("contraindicated")
    ) {
      severity = "high";
    } else if (
      lower.includes("moderate") ||
      lower.includes("caution") ||
      lower.includes("monitor")
    ) {
      severity = "moderate";
    }

    const badge = createElement(
      "span",
      `interaction-badge interaction-badge--${severity}`,
    );
    const dot = createElement("span", "interaction-badge-dot");
    badge.append(dot, document.createTextNode(interaction));
    return badge;
  });

  els.interactionBadges.replaceChildren(...badges);
}

/**
 * Render missed dose guidance.
 */
function renderMissedDoseGuide(med) {
  if (!els.missedDoseContent) return;

  const guidance = med.missed_dose_guidance;
  if (!guidance) {
    if (els.missedDoseEmpty) els.missedDoseEmpty.hidden = false;
    return;
  }

  if (els.missedDoseEmpty) els.missedDoseEmpty.hidden = true;

  // Create guidance content
  const content = createElement("div", "missed-dose-guidance");
  content.append(createElement("p", "", guidance));
  els.missedDoseContent.replaceChildren(content);
}
