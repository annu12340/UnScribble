"use strict";

const { distance: levenshteinDistance } = loadLevenshtein();

// Curated LASA (look-alike sound-alike) pairs.
// Mix of ISMP-style Western confusion pairs and common Indian-market brand confusions.
// Prefer pairs where at least one side appears in data/formulary.json.
const LASA_PAIRS = [
  // ISMP / Western generics
  ["losartan", "lisinopril"],
  ["hydroxyzine", "hydralazine"],
  ["clonidine", "klonopin"],
  ["clonidine", "clonazepam"],
  ["amlodipine", "amiodarone"],
  ["celecoxib", "citalopram"],
  ["bupropion", "buspirone"],
  ["metformin", "metronidazole"],
  ["tramadol", "trazodone"],
  ["fluoxetine", "fluvoxamine"],
  ["acetazolamide", "acetohexamide"],
  ["allopurinol", "haloperidol"],
  ["amantadine", "amiodarone"],
  ["atenolol", "albuterol"],
  ["azithromycin", "erythromycin"],
  ["cefazolin", "cefoxitin"],
  ["cefotaxime", "cefoxitin"],
  ["ceftriaxone", "ceftazidime"],
  ["chlorpromazine", "chlorpropamide"],
  ["clobazam", "clonazepam"],
  ["cycloserine", "cyclosporine"],
  ["dapsone", "diazepam"],
  ["dexamethasone", "desipramine"],
  ["digoxin", "doxepin"],
  ["dobutamine", "dopamine"],
  ["doxorubicin", "daunorubicin"],
  ["ephedrine", "epinephrine"],
  ["fentanyl", "sufentanil"],
  ["glipizide", "glyburide"],
  ["heparin", "hespan"],
  ["hydromorphone", "morphine"],
  ["lamotrigine", "lamivudine"],
  ["levothyroxine", "liothyronine"],
  ["methotrexate", "metolazone"],
  ["metoprolol", "misoprostol"],
  ["mifepristone", "misoprostol"],
  ["niacin", "nicardipine"],
  ["nifedipine", "nimodipine"],
  ["olanzapine", "quetiapine"],
  ["oxycodone", "oxybutynin"],
  ["paroxetine", "fluoxetine"],
  ["prednisone", "prednisolone"],
  ["quinine", "quinidine"],
  ["risperidone", "ropinirole"],
  ["sertraline", "selegiline"],
  ["simvastatin", "sumatriptan"],
  ["sulfasalazine", "sulfadiazine"],
  ["tiagabine", "tizanidine"],
  ["tobramycin", "tropicamide"],
  ["valacyclovir", "valganciclovir"],
  ["vinblastine", "vincristine"],
  ["zolpidem", "zaleplon"],
  // Indian-market brand pairs (often handwritten, frequent confusion)
  ["augmentin", "augmentin dds"],
  ["augmentin", "ampoxin"],
  ["cetzine", "cetirizine"],
  ["voveran", "volini"],
  ["combiflam", "calpol"],
  ["dolo", "calpol"],
  ["pan", "pan 40"],
  ["pan", "pantop"],
  ["pantop", "pantocid"],
  ["rantac", "zinetac"],
  ["azithral", "azee"],
  ["clavam", "augmentin"],
  ["taxim", "taxim-o"],
  ["zifi", "cefixime"],
  ["ecosprin", "aspirin"],
  ["atorva", "atorlip"],
  ["telma", "telmisartan"],
  ["losar", "losartan"],
  ["enalapril", "amlodipine"],
  ["norflox", "norfloxacin"],
  ["ofloxacin", "ornidazole"],
  ["meftal", "meftal spas"],
  ["spasmonil", "spasmoproxyvon"],
  ["dolopar", "dolo"],
  ["wikoryl", "sinarest"],
  ["levocet", "levocetirizine"],
  ["okacet", "cetirizine"],
  ["sinarest", "cheston cold"],
  ["zincovit", "becosules"],
  ["shelcal", "calcimax"],
  ["thyronorm", "eltroxin"],
];

function cleanPromptField(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

function buildContextFields(body) {
  return [
    ["Client-side image enhancement applied", body.enhancementMode],
    ["Original file name", body.fileName],
  ]
    .map(
      ([label, value]) =>
        `${label}: ${cleanPromptField(value) || "not provided"}`,
    )
    .join("\n");
}

function buildUserContextBlock(body) {
  return ["User context:", buildContextFields(body)].join("\n");
}

function loadLevenshtein() {
  try {
    return require("fastest-levenshtein");
  } catch {
    return { distance: (a, b) => (a === b ? 0 : Math.max(a.length, b.length)) };
  }
}

function lasaBlock() {
  return LASA_PAIRS.map(([a, b]) => `  - ${a} / ${b}`).join("\n");
}

function lasaBlockFor(medNames) {
  const names = (Array.isArray(medNames) ? medNames : [])
    .map((n) =>
      String(n || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  if (!names.length) return lasaBlock();

  const relevant = LASA_PAIRS.filter(([a, b]) =>
    names.some((name) => fuzzyMatchAny(name, [a, b])),
  );
  if (!relevant.length) return lasaBlock();
  return relevant.map(([a, b]) => `  - ${a} / ${b}`).join("\n");
}

function fuzzyMatchAny(name, candidates) {
  for (const candidate of candidates) {
    if (name === candidate) return true;
    if (Math.abs(name.length - candidate.length) > 3) continue;
    if (levenshteinDistance(name, candidate) <= 2) return true;
  }
  return false;
}

function regionDirective(regionHint, audience) {
  const style = String(regionHint?.style || "").toLowerCase();
  if (style === "indian") {
    if (audience === "medications") {
      return "Region hint: Indian-style prescription. Expect `Tab`/`Cap` prefixes; treat `1-0-1` / `1-1-1` / `0-0-1` as morning-noon-night schedules in `normalized_frequency.timing`. Treat `BD` as twice daily and `HS` as bedtime; do not expand `BD` as blood draw.";
    }
    return "Region hint: Indian-style prescription. When expanding abbreviations, prefer Indian conventions: `BD` = twice daily, `HS` = at bedtime, `SOS` = as needed. Do not expand `BD` as blood draw.";
  }
  if (style === "western") {
    if (audience === "medications") {
      return "Region hint: Western-style prescription. Expect `Sig:`, `po`, `qd`/`bid`/`tid`/`qid` schedules; expand into `normalized_frequency.expansion` (e.g. `tid` → `three times daily`).";
    }
    return "Region hint: Western-style prescription. Prefer Western conventions for abbreviations: `qd` = once daily, `bid` = twice daily, `tid` = three times daily, `qid` = four times daily, `prn` = as needed.";
  }
  return "";
}

function primaryImage(ctx) {
  return ctx.originalImageDataUrl || ctx.imageDataUrl;
}

function enhancedImage(ctx) {
  const primary = primaryImage(ctx);
  if (ctx.imageDataUrl && ctx.imageDataUrl !== primary) {
    return ctx.imageDataUrl;
  }
  return "";
}

/** Single image for vision agents: enhanced when present, else primary. */
function visionImageUrl(ctx) {
  return enhancedImage(ctx) || primaryImage(ctx);
}

module.exports = {
  buildUserContextBlock,
  lasaBlock,
  lasaBlockFor,
  regionDirective,
  primaryImage,
  enhancedImage,
  visionImageUrl,
};
