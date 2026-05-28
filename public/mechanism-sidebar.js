/**
 * Compact protein mechanism sidebar for medication details.
 */

const FALLBACK_MEDICATION = "lisinopril";

function medicationLookupKeys(name) {
  const raw = String(name || "").trim().toLowerCase();
  if (!raw) return [];
  const first = raw.split(/\s+/)[0];
  return [...new Set([raw, first].filter(Boolean))];
}

async function fetchMechanism(medication) {
  const response = await fetch("/api/protein-mechanism", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ medication }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function resolveMechanismData(medicationName) {
  const keys = medicationLookupKeys(medicationName);
  for (const key of keys) {
    const data = await fetchMechanism(key);
    if (data.hasProteinData) {
      return { data, displayName: medicationName || key, resolvedKey: key };
    }
  }

  const fallback = await fetchMechanism(FALLBACK_MEDICATION);
  if (fallback.hasProteinData) {
    return {
      data: fallback,
      displayName: medicationName || FALLBACK_MEDICATION,
      resolvedKey: FALLBACK_MEDICATION,
      usedFallback: true,
    };
  }

  return { data: fallback, displayName: medicationName, usedFallback: false };
}

function setSidebarLoading(els) {
  els.sidebar.hidden = false;
  els.sidebar.classList.add("is-loading");
  els.sidebarTitle.textContent = "How it works";
  els.targetProtein.textContent = "Loading protein data…";
  els.bindingSite.textContent = "—";
  els.mechanism.textContent = "—";
  els.effect.textContent = "—";
  els.fallbackNote.hidden = true;
  els.viewer.innerHTML =
    '<p class="mechanism-sidebar-loading">Loading 3D structure…</p>';
}

function setSidebarUnavailable(els, message) {
  els.sidebar.hidden = false;
  els.sidebar.classList.remove("is-loading");
  els.targetProtein.textContent = message;
  els.bindingSite.textContent = "Not available for this medication yet.";
  els.mechanism.textContent = "";
  els.effect.textContent = "";
  els.viewer.innerHTML =
    '<p class="mechanism-sidebar-empty">3D protein view unavailable.</p>';
}

/**
 * @param {string} medicationName
 * @param {Record<string, HTMLElement>} els
 */
export async function loadMechanismSidebar(medicationName, els) {
  if (!els?.sidebar) return;

  setSidebarLoading(els);

  try {
    const { data, displayName, usedFallback } = await resolveMechanismData(
      medicationName
    );

    if (!data.hasProteinData) {
      setSidebarUnavailable(
        els,
        data.message || "Protein target data not available."
      );
      return;
    }

    els.sidebar.classList.remove("is-loading");
    els.sidebarTitle.textContent = `How ${displayName} works`;
    els.targetProtein.textContent = `Target: ${data.targetProtein}`;
    els.bindingSite.textContent = data.mechanism.bindingSite;
    els.mechanism.textContent = data.mechanism.mechanism;
    els.effect.textContent = data.mechanism.effect;
    els.fallbackNote.hidden = !usedFallback;
    if (usedFallback) {
      els.fallbackNote.textContent =
        "Showing example mechanism (lisinopril) — protein data for this drug is not in our demo database yet.";
    }

    els.viewer.innerHTML = "";

    if (typeof ProteinViewer === "undefined") {
      els.viewer.innerHTML =
        '<p class="mechanism-sidebar-empty">3D viewer could not load.</p>';
      return;
    }

    const viewer = new ProteinViewer("mechanismSidebarViewer");
    await viewer.loadProteinStructure(
      data.proteinStructure.pdbData,
      displayName
    );
  } catch (error) {
    console.error("Mechanism sidebar error:", error);
    setSidebarUnavailable(els, `Could not load mechanism data.`);
  }
}

export function mechanismSidebarElements() {
  return {
    sidebar: document.querySelector("#mechanismSidebar"),
    sidebarTitle: document.querySelector("#mechanismSidebarTitle"),
    targetProtein: document.querySelector("#mechanismTargetProtein"),
    bindingSite: document.querySelector("#mechanismBindingSite"),
    mechanism: document.querySelector("#mechanismAction"),
    effect: document.querySelector("#mechanismEffect"),
    fallbackNote: document.querySelector("#mechanismFallbackNote"),
    viewer: document.querySelector("#mechanismSidebarViewer"),
  };
}
