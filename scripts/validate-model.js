#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP_PATH = path.join(ROOT, "historical_legitimacy_stress_model_site.html");

const html = fs.readFileSync(APP_PATH, "utf8");
const presetMatch = html.match(/const presets = \[([\s\S]*?)\n    \];/);

if (!presetMatch) {
  console.error("Could not find preset array in app HTML.");
  process.exit(1);
}

const presets = vm.runInNewContext(
  `(function(){ const BASELINE_PRESET_ID = "current-2026-baseline"; return [${presetMatch[1]}\n]; })()`,
  {}
);

const SECTION_ORDER = [
  ["institutional", "A. Institutional Stress", 20],
  ["formalEconomy", "B. Formal Economic Stress", 20],
  ["livedMaterial", "C. Lived Material Stress", 20],
  ["legitimacy", "D. Legitimacy / Moral Injury Stress", 20],
  ["foreignMilitary", "E. Foreign / Military Stress", 10],
  ["candidateAffect", "F. Candidate Affect / Coalition Fit", 10],
  ["oppositionOffset", "G. Opposition Threat Offset", 25],
  ["electoralConversion", "H. Electoral College Conversion", 30],
  ["democraticRisk", "I. Democratic Conversion Risk", 30]
];

const OUTCOMES = {
  "1944": { actual: "incumbent", note: "Roosevelt/Democrats held the White House." },
  "1948": { actual: "incumbent", note: "Truman/Democrats held the White House." },
  "1952": { actual: "challenger", note: "Eisenhower/Republicans defeated the Democratic White House party." },
  "1956": { actual: "incumbent", note: "Eisenhower/Republicans held the White House." },
  "1960": { actual: "challenger", note: "Kennedy/Democrats defeated the Republican White House party." },
  "1964": { actual: "incumbent", note: "Johnson/Democrats held the White House." },
  "1968": { actual: "challenger", note: "Nixon/Republicans defeated the Democratic White House party." },
  "1972": { actual: "incumbent", note: "Nixon/Republicans held the White House." },
  "1976": { actual: "challenger", note: "Carter/Democrats defeated the Republican White House party." },
  "1980": { actual: "challenger", note: "Reagan/Republicans defeated the Democratic White House party." },
  "1984": { actual: "incumbent", note: "Reagan/Republicans held the White House." },
  "1988": { actual: "incumbent", note: "Bush/Republicans held the White House." },
  "1992": { actual: "challenger", note: "Clinton/Democrats defeated the Republican White House party." },
  "1996": { actual: "incumbent", note: "Clinton/Democrats held the White House." },
  "2000": { actual: "challenger", note: "Bush/Republicans won the certified Electoral College outcome." },
  "2004": { actual: "incumbent", note: "Bush/Republicans held the White House." },
  "2008": { actual: "challenger", note: "Obama/Democrats defeated the Republican White House party." },
  "2012": { actual: "incumbent", note: "Obama/Democrats held the White House." },
  "2016": { actual: "challenger", note: "Trump/Republicans won the certified Electoral College outcome." },
  "2020": { actual: "challenger", note: "Biden/Democrats defeated the Republican White House party." },
  "2024": { actual: "challenger", note: "Trump/Republicans defeated the Democratic White House party." }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function winnerRole(score) {
  return score >= 50 ? "challenger" : "incumbent";
}

function winnerCall(score) {
  if (score >= 65) return "Challenger Win, collapse-risk margin";
  if (score >= 50) return "Challenger Win";
  if (score >= 35) return "Incumbent Party Hold, low confidence";
  return "Incumbent Party Hold";
}

function machineryRiskLabel(value) {
  if (value >= 22) return "Severe";
  if (value >= 14) return "High";
  if (value >= 7) return "Medium";
  return "Low";
}

function scorePreset(preset) {
  const t = preset.sectionTargets;
  if (!t) return null;
  const stress = clamp(
    t.institutional +
      t.formalEconomy +
      t.livedMaterial +
      t.legitimacy +
      t.foreignMilitary +
      t.candidateAffect -
      t.oppositionOffset,
    0,
    100
  );
  const converted = clamp(stress + t.electoralConversion * 0.35, 0, 100);
  return {
    stress,
    converted,
    popularRole: winnerRole(stress),
    convertedRole: winnerRole(converted),
    popularCall: winnerCall(stress),
    convertedCall: winnerCall(converted),
    machineryRisk: machineryRiskLabel(t.democraticRisk)
  };
}

const historical = presets.filter((preset) => OUTCOMES[preset.id]);
const rows = historical.map((preset) => {
  const score = scorePreset(preset);
  if (!score) {
    return { preset, error: "Missing sectionTargets" };
  }
  const expected = OUTCOMES[preset.id];
  return {
    year: preset.id,
    title: preset.title,
    actual: expected.actual,
    note: expected.note,
    stress: score.stress,
    converted: score.converted,
    popularRole: score.popularRole,
    convertedRole: score.convertedRole,
    popularCall: score.popularCall,
    convertedCall: score.convertedCall,
    machineryRisk: score.machineryRisk,
    popularCorrect: score.popularRole === expected.actual,
    convertedCorrect: score.convertedRole === expected.actual,
    diverges: score.popularRole !== score.convertedRole
  };
});

const popularHits = rows.filter((row) => row.popularCorrect).length;
const convertedHits = rows.filter((row) => row.convertedCorrect).length;
const misses = rows.filter((row) => !row.convertedCorrect);
const divergence = rows.filter((row) => row.diverges);

console.log("Historical Legitimacy Stress Model validation");
console.log("================================================");
console.log(`Historical tests: ${rows.length}`);
console.log(`Popular-mandate hit rate: ${popularHits}/${rows.length}`);
console.log(`Converted-outcome hit rate: ${convertedHits}/${rows.length}`);
console.log(`Divergence cases: ${divergence.map((row) => row.year).join(", ") || "none"}`);
console.log(`Converted-outcome misses: ${misses.map((row) => row.year).join(", ") || "none"}`);
console.log("");

for (const row of rows) {
  const marker = row.convertedCorrect ? "PASS" : "MISS";
  const diverges = row.diverges ? " | mandate/converted diverge" : "";
  console.log(
    `${marker} ${row.year}: actual=${row.actual}; stress=${row.stress.toFixed(1)} (${row.popularCall}); converted=${row.converted.toFixed(1)} (${row.convertedCall}); machinery=${row.machineryRisk}${diverges}`
  );
}

console.log("");
console.log("Section target schema");
for (const [id, label, max] of SECTION_ORDER) {
  console.log(`- ${id}: ${label}, max ${max}`);
}

if (misses.length) {
  process.exitCode = 1;
}
