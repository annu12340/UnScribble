export function createResultRenderer(els, state, { getEnhancementMode, escapeHtml }) {
  return {
    renderResult(result) {
      els.emptyState.hidden = true;
      els.errorState.hidden = true;
      els.resultContent.hidden = false;
      els.copyBtn.disabled = false;
      els.downloadBtn.disabled = false;

      els.reviewBanner.textContent = result.requires_human_review
        ? `Human review required: ${result.review_reason || "verify prescription details"}`
        : "No major review flag reported. Still verify before medical use.";
      els.reviewBanner.classList.toggle("ok", !result.requires_human_review);

      els.summaryText.textContent = result.summary || "No summary returned.";
      const quality = result.image_quality || {};
      const preprocessingHint = formatPreprocessingHint(quality.recommended_preprocessing, getEnhancementMode);
      els.qualityText.textContent = [
        quality.legibility ? `Legibility: ${quality.legibility}` : "",
        ...(quality.issues || []),
        quality.recommended_next_capture || "",
        preprocessingHint
      ]
        .filter(Boolean)
        .join(" · ") || "Not reported.";

      renderPatient(els.patientStrip, result.patient || {}, escapeHtml);
      renderMedications(els.medList, result.medications || [], escapeHtml);
      renderAbbreviations(els.abbrevList, result.abbreviations || [], escapeHtml);
      renderOtherText(
        els.otherTextList,
        result.non_medication_text || [],
        result.follow_up_instructions || [],
        result.global_warnings || [],
        result.allergies || [],
        result.clinical_context || {},
        result.raw_transcription || [],
        escapeHtml
      );
      els.rawJson.textContent = JSON.stringify(state.resultPayload, null, 2);
    },

    renderWorkflowTrace(workflow) {
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
  };
}

function renderPatient(container, patient, escapeHtml) {
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

function renderMedications(container, medications, escapeHtml) {
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

function renderAbbreviations(container, abbreviations, escapeHtml) {
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

function formatPreprocessingHint(mode, getEnhancementMode) {
  const labels = { contrast: "Contrast", mono: "Mono", original: "Original" };
  const current = getEnhancementMode();
  if (!mode || mode === "none") return "";
  if (mode === current) return "";
  const label = labels[mode];
  return label ? `Suggestion for next capture: try ${label}` : "";
}

function formatNormalizedFrequency(frequency) {
  if (!frequency || typeof frequency !== "object") return "";
  return [frequency.abbreviation, frequency.expansion, frequency.timing]
    .filter(Boolean)
    .join(" · ");
}

function renderOtherText(
  container,
  otherText,
  followUp,
  warnings,
  allergies,
  clinicalContext,
  rawTranscription,
  escapeHtml
) {
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
