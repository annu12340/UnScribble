import {
  addMedicationToGoogleCalendar,
  parseMedicationSchedule,
  isGoogleSignedIn,
  signOutGoogle,
  getGoogleUserInfo
} from "../medication/medication-schedule.js";
import { loadMechanismSidebar, mechanismSidebarElements } from "../medication/mechanism-sidebar.js";

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
  alternatives: []
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
  regulatorySection: document.querySelector("#section-regulatory"),
  medRegulatorySummary: document.querySelector("#medRegulatorySummary"),
  medFullyBannedCountries: document.querySelector("#medFullyBannedCountries"),
  medPrescriptionOnlyCountries: document.querySelector("#medPrescriptionOnlyCountries"),
  medRestrictedAgeGroups: document.querySelector("#medRestrictedAgeGroups"),
  medBlackBoxWarnings: document.querySelector("#medBlackBoxWarnings"),
  medWithdrawnFormulations: document.querySelector("#medWithdrawnFormulations"),
  medRegulatoryAlerts: document.querySelector("#medRegulatoryAlerts"),
  medIngredientsSection: document.querySelector("#section-ingredients"),
  medActiveIngredient: document.querySelector("#medActiveIngredient"),
  medEquivalentBrands: document.querySelector("#medEquivalentBrands"),
  medCombinationDrugs: document.querySelector("#medCombinationDrugs"),
  medDuplicateIngredientWarnings: document.querySelector("#medDuplicateIngredientWarnings"),
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
  demoBanner: document.querySelector("#demoBanner")
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

  const sectionIds = [
    "section-overview",
    "section-regulatory",
    "section-ingredients",
    "section-mechanism"
  ];
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
      els.addToCalendarBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading Google config:", error);
  }
}

function bindEvents() {
  if (els.addToCalendarBtn) els.addToCalendarBtn.addEventListener("click", openModal);
  if (els.modalClose) els.modalClose.addEventListener("click", closeModal);
  if (els.modalCancel) els.modalCancel.addEventListener("click", closeModal);
  if (els.modalConfirm) els.modalConfirm.addEventListener("click", confirmCalendarSetup);
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
        createElement("div", "google-user-email", userInfo.email || "")
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

function buildDemoMedication(overrideName) {
  const name = String(overrideName || DEMO_MEDICATION_NAME).trim() || DEMO_MEDICATION_NAME;
  return { ...DEMO_MEDICATION, medication_name: name };
}

function loadMedicationData() {
  const params = new URLSearchParams(window.location.search);
  const medOverride = params.get("med");
  const forceDemo = params.get("demo") === "1";
  let storedData = sessionStorage.getItem("selectedMedication");

  // Fallback to localStorage if sessionStorage wasn't populated for some reason
  if (!storedData) {
    try {
      storedData = localStorage.getItem("selectedMedication");
      if (storedData) {
        // Remove the fallback so it doesn't persist across unrelated visits
        localStorage.removeItem("selectedMedication");
      }
    } catch (err) {
      console.warn("localStorage fallback failed", err);
    }
  }

  if (forceDemo) {
    state.medication = buildDemoMedication(medOverride);
    els.noDataState.hidden = true;
    els.medicationDetailsContent.hidden = false;
    if (els.demoBanner) {
      els.demoBanner.hidden = false;
      els.demoBanner.textContent = `Demo mode — showing hardcoded data for "${state.medication.medication_name}". Remove ?demo=1 to use results from session.`;
    }
    renderMedicationDetails();
    return;
  }

  if (!storedData) {
    state.medication = null;
    els.noDataState.hidden = false;
    els.medicationDetailsContent.hidden = true;
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
  if (!med) return;

  const strength = med.strength?.trim() || "";
  const form = med.form?.trim() || "";
  const dose = med.dose?.trim() || "";
  const frequency =
    formatNormalizedFrequency(med.normalized_frequency) || med.frequency?.trim() || "";
  const route = med.route?.trim() || "";

  if (els.medName) els.medName.textContent = med.medication_name || "Unknown Medication";
  if (els.medStrength) els.medStrength.textContent = strength || "";
  if (els.medForm) els.medForm.textContent = form || "";

  if (els.medMeta) {
    const hasMeta = Boolean(strength || form);
    els.medMeta.classList.toggle("is-empty", !hasMeta);
    if (els.medMetaSep) els.medMetaSep.hidden = !(strength && form);
  }

  renderHeroChips({ dose, frequency, route, duration: med.duration?.trim() || "" });

  if (els.medDose) els.medDose.textContent = dose || "—";
  if (els.medFrequency) els.medFrequency.textContent = frequency || "—";
  if (els.medDuration) els.medDuration.textContent = med.duration || "—";
  if (els.medRoute) els.medRoute.textContent = route || "—";

  // Administration
  const adminText = [med.administration_notes, med.instructions].filter(Boolean).join(". ");
  if (adminText && els.medAdministration) {
    els.medAdministration.replaceChildren(createElement("p", "", adminText));
  }

  // Schedule
  const schedules = parseMedicationSchedule([med]);
  if (schedules.length > 0) {
    state.schedule = schedules[0];
    renderSchedule(state.schedule);
  }

  // Additional Information
  if (els.medQuantity) els.medQuantity.textContent = med.quantity || "—";
  if (els.medRefills) els.medRefills.textContent = med.refills || "—";
  if (els.medTiming) els.medTiming.textContent = med.timing || "—";

  const confidence = Math.round(Number(med.confidence || 0) * 100);
  if (els.medConfidence) els.medConfidence.textContent = med.confidence != null ? `${confidence}%` : "—";
  if (els.medConfidenceWrap) {
    els.medConfidenceWrap.classList.toggle("is-low", confidence > 0 && confidence < 75);
    els.medConfidenceWrap.classList.toggle("is-high", confidence >= 75);
  }

  // Sig
  if (med.sig && els.medSig && els.sigSection) {
    els.medSig.replaceChildren(createElement("p", "", med.sig));
    els.sigSection.hidden = false;
  } else if (els.sigSection) {
    els.sigSection.hidden = true;
  }

  // Warnings
  const warnings = (med.safety_flags || [])
    .concat((med.critical_uncertainties || []).map((item) => `Uncertain: ${item}`))
    .concat((med.uncertain_tokens || []).map((item) => `Token to verify: ${item}`))
    .concat(med.requires_verification ? ["Human verification required for this medication."] : []);

  if (warnings.length > 0) {
    if (els.medWarnings) els.medWarnings.replaceChildren(...warnings.map((warning) => createElement("li", "", warning)));
    if (els.warningsSection) els.warningsSection.hidden = false;
  } else {
    if (els.medWarnings) els.medWarnings.replaceChildren();
    if (els.warningsSection) els.warningsSection.hidden = true;
  }

  // Alternatives
  const alternatives = med.alternatives || [];
  if (alternatives.length > 0) {
    if (els.medAlternatives) els.medAlternatives.replaceChildren(...alternatives.map((alt) =>
      createElement(
        "li",
        "",
        `${alt.text || ""} (${Math.round(Number(alt.confidence || 0) * 100)}%) - ${alt.reason || ""}`
      )
    ));
    if (els.alternativesSection) els.alternativesSection.hidden = false;
  } else {
    if (els.medAlternatives) els.medAlternatives.replaceChildren();
    if (els.alternativesSection) els.alternativesSection.hidden = true;
  }

  const rawDetails = document.querySelector(".med-details-raw");
  if (med.raw_text) {
    if (els.medRawText) els.medRawText.replaceChildren(createElement("p", "", med.raw_text));
    if (rawDetails) rawDetails.hidden = false;
  } else if (rawDetails) {
    rawDetails.hidden = true;
  }

  const regulatory = med.regulatory_status || {};
  const regulatoryLists = {
    fullyBannedCountries: regulatory.fully_banned_countries || [],
    prescriptionOnlyCountries: regulatory.prescription_only_countries || [],
    restrictedAgeGroups: regulatory.restricted_age_groups || [],
    blackBoxWarnings: regulatory.black_box_warnings || [],
    withdrawnFormulations: regulatory.withdrawn_formulations || [],
    regulatoryAlerts: regulatory.recent_regulatory_alerts || []
  };

  const hasRegulatoryInfo = Object.values(regulatoryLists).some((list) => list.length > 0);
  if (els.medRegulatorySummary) {
    els.medRegulatorySummary.textContent = hasRegulatoryInfo
      ? "Regulatory information is available below."
      : "No regulatory notes are available for this medication.";
  }
  renderList(
    els.medFullyBannedCountries,
    regulatoryLists.fullyBannedCountries,
    "No countries listed."
  );
  renderList(
    els.medPrescriptionOnlyCountries,
    regulatoryLists.prescriptionOnlyCountries,
    "No countries listed."
  );
  renderList(
    els.medRestrictedAgeGroups,
    regulatoryLists.restrictedAgeGroups,
    "No age restrictions identified."
  );
  renderList(
    els.medBlackBoxWarnings,
    regulatoryLists.blackBoxWarnings,
    "No black-box warnings identified."
  );
  renderList(
    els.medWithdrawnFormulations,
    regulatoryLists.withdrawnFormulations,
    "No withdrawn formulations listed."
  );
  renderList(
    els.medRegulatoryAlerts,
    regulatoryLists.regulatoryAlerts,
    "No recent alerts listed."
  );

  const ingredientData = med.ingredient_analysis || {};
  const activeIngredient =
    med.active_ingredient || ingredientData.active_ingredient || med.medication_name || "—";
  const equivalentBrands =
    med.equivalent_brands || ingredientData.equivalent_brands || [];
  const combinationDrugs =
    med.combination_drugs || ingredientData.combination_drugs || [];
  const duplicateWarnings =
    med.duplicate_ingredient_warnings || ingredientData.duplicate_ingredient_warnings || [];

  if (els.medActiveIngredient) els.medActiveIngredient.textContent = activeIngredient;
  renderList(els.medEquivalentBrands, equivalentBrands, "None identified.");
  renderList(els.medCombinationDrugs, combinationDrugs, "None identified.");
  renderList(
    els.medDuplicateIngredientWarnings,
    duplicateWarnings,
    "No duplicate ingredient warnings."
  );

  loadMechanismSidebar(med.medication_name || "", els.mechanism);
}

function renderHeroChips({ dose, frequency, route, duration }) {
  if (!els.medHeroChips) return;

  const chips = [
    { label: "Dose", value: dose },
    { label: "Frequency", value: frequency },
    { label: "Route", value: route },
    { label: "Duration", value: duration }
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
        createElement("span", "med-hero-chip-value", chip.value)
      );
      return item;
    })
  );
}

function renderSchedule(schedule) {
  if (!els.medScheduleTimes) return;

  if (!schedule || !schedule.schedule || !schedule.schedule.times || schedule.schedule.times.length === 0) {
    els.medScheduleTimes.replaceChildren(
      createElement(
        "p",
        "schedule-empty",
        "No schedule times parsed - check frequency on the prescription."
      )
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
        createElement("span", "time-label", t.label)
      );
      return item;
    })
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

function renderList(el, values, emptyText) {
  if (!el) return;
  const items = Array.isArray(values) ? values : [];
  if (items.length === 0) {
    el.replaceChildren(createElement("li", "", emptyText));
    return;
  }
  el.replaceChildren(
    ...items.map((item) => createElement("li", "", String(item)))
  );
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

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== "") element.textContent = String(text);
  return element;
}
