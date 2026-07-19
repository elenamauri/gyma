/**
 * Build public/data/gif-map.json — maps free-exercise-db IDs to ExerciseDB GIF CDN URLs.
 *
 * Source metadata: public ExerciseDB mirror (GIFs stay on AscendAPI CDN; we do not bundle media).
 * License: non-commercial + attribution required — https://oss.exercisedb.dev
 * Upstream: https://github.com/ExerciseDB/exercisedb-api
 *
 * Usage: npm run index-gifs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const EDB_JSON =
  process.env.EDB_JSON_URL ||
  "https://raw.githubusercontent.com/AbdallahAbuKhurma/exercises-dataset/main/data/exercises.json";

function norm(s) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/dumbell/g, "dumbbell")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ratio(a, b) {
  // Dice coefficient on bigrams — fast enough for build script
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) || 0) + 1);
    }
    return m;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [k, v] of A) {
    if (B.has(k)) overlap += Math.min(v, B.get(k));
  }
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

function gifCdn(e) {
  const m = String(e.gif_url || "").match(/-([A-Za-z0-9]+)\.gif$/);
  if (!m) return null;
  return `https://static.exercisedb.dev/media/${m[1]}.gif`;
}

async function main() {
  console.log("Fetching ExerciseDB metadata…");
  const res = await fetch(EDB_JSON);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const edb = await res.json();

  const ours = JSON.parse(
    fs.readFileSync(path.join(root, "public/data/exercises-index.json"), "utf8"),
  ).exercises;

  const edbRows = [];
  for (const e of edb) {
    const url = gifCdn(e);
    if (!url) continue;
    edbRows.push({
      name: e.name,
      n: norm(e.name),
      gifUrl: url,
      equipment: e.equipment || "",
    });
  }

  const byNorm = new Map();
  for (const r of edbRows) {
    if (!byNorm.has(r.n)) byNorm.set(r.n, r);
  }

  const byExerciseId = {};
  for (const o of ours) {
    const n = norm(o.name);
    if (byNorm.has(n)) {
      byExerciseId[o.id] = byNorm.get(n).gifUrl;
      continue;
    }
    const tokens = new Set(n.split(" "));
    let best = null;
    let bestS = 0;
    for (const r of edbRows) {
      const et = new Set(r.n.split(" "));
      let inter = 0;
      for (const t of tokens) if (et.has(t)) inter++;
      if (inter < Math.max(1, Math.min(2, Math.floor(tokens.size / 2)))) continue;
      let s = ratio(n, r.n);
      if (o.equipment && r.n.includes(String(o.equipment).toLowerCase())) s += 0.05;
      if (s > bestS) {
        bestS = s;
        best = r;
      }
    }
    if (best && bestS >= 0.65) byExerciseId[o.id] = best.gifUrl;
  }

  const byNormalizedName = {};
  for (const r of edbRows) byNormalizedName[r.n] = r.gifUrl;

  const out = {
    source: "ExerciseDB / AscendAPI",
    upstream: "https://github.com/ExerciseDB/exercisedb-api",
    attribution:
      "Exercise media © AscendAPI / ExerciseDB — non-commercial use with attribution. https://oss.exercisedb.dev",
    byExerciseId,
    byNormalizedName,
    stats: {
      ourExercises: ours.length,
      edbExercises: edbRows.length,
      matched: Object.keys(byExerciseId).length,
      coveragePct: Math.round(
        (1000 * Object.keys(byExerciseId).length) / ours.length,
      ) / 10,
      builtAt: new Date().toISOString(),
    },
  };

  const dest = path.join(root, "public/data/gif-map.json");
  fs.writeFileSync(dest, JSON.stringify(out));
  console.log(
    `Matched ${out.stats.matched}/${out.stats.ourExercises} (${out.stats.coveragePct}%) → ${dest}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
