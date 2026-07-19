/**
 * Build public/data/gif-map.json — STRICT name matching only.
 *
 * Maps free-exercise-db IDs → ExerciseDB GIF CDN URLs.
 * Fuzzy matching is intentionally NOT used (it produced wrong demos).
 *
 * Match rules (in order):
 * 1. Exact normalized name
 * 2. Same token set (word reorder / hyphenation), unique candidate
 * 3. Same token set after folding our equipment into the name, unique candidate
 *
 * Usage: npm run index-gifs
 * Upstream: https://github.com/ExerciseDB/exercisedb-api
 * License: non-commercial + attribution — https://oss.exercisedb.dev
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const EDB_JSON =
  process.env.EDB_JSON_URL ||
  "https://raw.githubusercontent.com/AbdallahAbuKhurma/exercises-dataset/main/data/exercises.json";

const STOP = new Set([
  "with",
  "the",
  "a",
  "an",
  "to",
  "of",
  "on",
  "in",
  "and",
  "or",
  "from",
  "for",
  "using",
  "v",
  "version",
  "male",
  "female",
  "against",
  "your",
  "off",
]);

const EQ_ALIAS = {
  "body only": "body weight",
  "e-z curl bar": "ez barbell",
  "ez curl bar": "ez barbell",
  kettlebells: "kettlebell",
  dumbbells: "dumbbell",
  bands: "band",
};

function norm(s) {
  let t = String(s || "")
    .toLowerCase()
    .trim();
  if (EQ_ALIAS[t]) t = EQ_ALIAS[t];
  t = t.replace(/[()]/g, " ");
  t = t.replace(/flyes?\b/g, "fly");
  t = t.replace(/dumbell/g, "dumbbell");
  const pairs = [
    ["pushups", "push up"],
    ["push-ups", "push up"],
    ["pushup", "push up"],
    ["pullups", "pull up"],
    ["pull-ups", "pull up"],
    ["pullup", "pull up"],
    ["chinups", "chin up"],
    ["chin-ups", "chin up"],
    ["chinup", "chin up"],
    ["situps", "sit up"],
    ["sit-ups", "sit up"],
    ["situp", "sit up"],
    ["pulldowns", "pull down"],
    ["pulldown", "pull down"],
    ["pushdowns", "push down"],
    ["pushdown", "push down"],
  ];
  for (const [a, b] of pairs) t = t.split(a).join(b);
  t = t.replace(/[^a-z0-9]+/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

/** Light plural fold so "Hammer Curls" ↔ "hammer curl". */
function singular(w) {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("sses") || w.endsWith("ss") || w.endsWith("us") || w.endsWith("is"))
    return w;
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

function tokenSet(name, equipment) {
  const parts = new Set();
  for (const w of norm(name).split(" ")) {
    if (w && !STOP.has(w)) parts.add(singular(w));
  }
  if (equipment) {
    for (const w of norm(equipment).split(" ")) {
      if (w && !STOP.has(w)) parts.add(singular(w));
    }
  }
  return parts;
}

function sigKey(set) {
  return [...set].sort().join("|");
}

function gifCdn(e) {
  const m = String(e.gif_url || "").match(/-([A-Za-z0-9]+)\.gif$/);
  if (!m) return null;
  return `https://static.exercisedb.dev/media/${m[1]}.gif`;
}

function equipOk(ourEquip, edbName) {
  const eq = norm(ourEquip || "");
  if (!eq || eq === "other" || eq === "none") return false;
  const first = eq.split(" ")[0];
  return norm(edbName).includes(first);
}

async function main() {
  console.log("Fetching ExerciseDB metadata…");
  const res = await fetch(EDB_JSON);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const edb = await res.json();

  const ours = JSON.parse(
    fs.readFileSync(
      path.join(root, "public/data/exercises-index.json"),
      "utf8",
    ),
  ).exercises;

  const byNorm = new Map();
  const bySig = new Map();
  const edbRows = [];

  for (const e of edb) {
    const gifUrl = gifCdn(e);
    if (!gifUrl) continue;
    const n = norm(e.name);
    const row = { name: e.name, n, gifUrl };
    edbRows.push(row);
    if (!byNorm.has(n)) byNorm.set(n, row);
    const key = sigKey(tokenSet(e.name));
    if (!bySig.has(key)) bySig.set(key, []);
    bySig.get(key).push(row);
  }

  const byExerciseId = {};
  const matchedMeta = {};
  const how = { exact: 0, sig: 0, sigEquip: 0, ambiguous: 0 };

  for (const o of ours) {
    const n = norm(o.name);

    if (byNorm.has(n)) {
      const row = byNorm.get(n);
      byExerciseId[o.id] = row.gifUrl;
      matchedMeta[o.id] = { our: o.name, edb: row.name, how: "exact" };
      how.exact++;
      continue;
    }

    let matched = null;
    let method = null;

    const trySig = (set, label, requireEquip) => {
      const cands = bySig.get(sigKey(set)) || [];
      const uniq = new Map();
      for (const c of cands) uniq.set(c.n, c);
      if (uniq.size === 0) return false;
      if (uniq.size === 1) {
        const row = [...uniq.values()][0];
        if (requireEquip && !equipOk(o.equipment, row.name)) return false;
        matched = row;
        method = label;
        return true;
      }
      // multiple: pick uniquely shortest token length
      const sorted = [...uniq.values()].sort(
        (a, b) => a.n.split(" ").length - b.n.split(" ").length,
      );
      if (
        sorted[0].n.split(" ").length < sorted[1].n.split(" ").length &&
        (!requireEquip || equipOk(o.equipment, sorted[0].name))
      ) {
        matched = sorted[0];
        method = label;
        return true;
      }
      how.ambiguous++;
      return true; // consumed attempt, no match
    };

    if (trySig(tokenSet(o.name), "sig", false) && matched) {
      byExerciseId[o.id] = matched.gifUrl;
      matchedMeta[o.id] = { our: o.name, edb: matched.name, how: method };
      how.sig++;
      continue;
    }

    if (
      o.equipment &&
      trySig(tokenSet(o.name, o.equipment), "sigEquip", true) &&
      matched
    ) {
      byExerciseId[o.id] = matched.gifUrl;
      matchedMeta[o.id] = { our: o.name, edb: matched.name, how: method };
      how.sigEquip++;
    }
  }

  // Exact-name index only (no fuzzy) for runtime name lookup
  const byNormalizedName = {};
  for (const row of edbRows) {
    byNormalizedName[row.n] = row.gifUrl;
  }

  const out = {
    source: "ExerciseDB / AscendAPI",
    upstream: "https://github.com/ExerciseDB/exercisedb-api",
    matching:
      "strict: exact normalized name, or identical token set (optional equipment fold). No fuzzy similarity.",
    attribution:
      "Exercise media © AscendAPI / ExerciseDB — non-commercial use with attribution. https://oss.exercisedb.dev",
    byExerciseId,
    byNormalizedName,
    matchedMeta,
    stats: {
      ourExercises: ours.length,
      edbExercises: edbRows.length,
      matched: Object.keys(byExerciseId).length,
      coveragePct:
        Math.round(
          (1000 * Object.keys(byExerciseId).length) / ours.length,
        ) / 10,
      how,
      builtAt: new Date().toISOString(),
    },
  };

  const dest = path.join(root, "public/data/gif-map.json");
  fs.writeFileSync(dest, JSON.stringify(out));
  console.log(
    `Matched ${out.stats.matched}/${out.stats.ourExercises} (${out.stats.coveragePct}%)`,
    out.stats.how,
  );
  console.log(`Wrote ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
