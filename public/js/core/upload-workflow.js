/** @typedef {{ id: string, label?: string }} WorkflowAgent */

export const MEDICAL_JOKES = [
  "Why did the prescription go to therapy? It had too many issues to refill...",
  "Why don't doctors trust stairs? They're always up to something...",
  "What did the doctor say to the rocket ship? Time to get your booster shot!",
  "Why was the medicine always calm? It had good patient-ce!",
  "What do you call a doctor who fixes websites? A URLologist!",
  "Why don't medications ever get lost? They always follow the directions!",
  "What did one prescription say to the other? Take it easy, don't overdose on stress!",
  "Why was the antibiotic so popular? It was a real culture killer!",
  "Why was the medicine bottle always happy? It was filled with good spirits!",
  "What's a doctor's favorite instrument? The organ!"
];

/**
 * @param {string} [model]
 * @returns {string}
 */
export function shortModelName(model) {
  const id = String(model || "");
  if (!id) return "model";
  const parts = id.split("/");
  return parts[parts.length - 1] || id;
}

/**
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isImageMimeType(mimeType) {
  return String(mimeType || "").startsWith("image/");
}

/**
 * @param {number} completed
 * @param {number} total
 * @returns {number}
 */
export function workflowProgressPercent(completed, total) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeCompleted = Math.max(0, Number(completed) || 0);
  return Math.round((safeCompleted / safeTotal) * 100);
}

/**
 * @param {WorkflowAgent[]} agents
 * @param {string} id
 * @returns {string}
 */
export function agentLabel(agents, id) {
  const found = (agents || []).find((agent) => agent.id === id);
  return found?.label || id;
}

/**
 * @param {string | undefined} agentId
 * @param {{ message?: string, detail?: string }} [payload]
 * @param {WorkflowAgent[]} [agents]
 * @returns {string}
 */
export function formatWorkflowError(agentId, payload = {}, agents = []) {
  const label = agentId ? agentLabel(agents, agentId) : "Workflow";
  const message = payload.message || "failed";
  const parts = [`${label}: ${message}`];
  if (payload.detail && payload.detail !== message) {
    parts.push(payload.detail);
  }
  return parts.join("\n");
}

/**
 * @param {number} [index]
 * @returns {string}
 */
export function pickMedicalJoke(index = Math.floor(Math.random() * MEDICAL_JOKES.length)) {
  const safeIndex =
    ((Number(index) % MEDICAL_JOKES.length) + MEDICAL_JOKES.length) % MEDICAL_JOKES.length;
  return MEDICAL_JOKES[safeIndex];
}
