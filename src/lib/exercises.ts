import Fuse from "fuse.js";
import type {
  Exercise,
  ExerciseFacets,
  ExerciseIndex,
  ExerciseIndexEntry,
  FuzzyMatchResult,
} from "./types";
import { IMAGE_BASE } from "./types";

let indexCache: ExerciseIndex | null = null;
let fullCache: Exercise[] | null = null;
let fuseCache: Fuse<ExerciseIndexEntry> | null = null;

type GifMap = {
  byExerciseId: Record<string, string>;
  byNormalizedName: Record<string, string>;
  attribution?: string;
};

let gifMapCache: GifMap | null = null;
let gifMapPromise: Promise<GifMap> | null = null;

/** Must stay aligned with scripts/index-gifs.mjs `norm()` for name fallback. */
function normalizeExerciseName(name: string): string {
  let t = name.toLowerCase().trim();
  t = t.replace(/[()]/g, " ");
  t = t.replace(/flyes?\b/g, "fly");
  t = t.replace(/dumbell/g, "dumbbell");
  const pairs: [string, string][] = [
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
  return t.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function loadGifMap(): Promise<GifMap> {
  if (gifMapCache) return gifMapCache;
  if (!gifMapPromise) {
    gifMapPromise = fetch("/data/gif-map.json")
      .then((res) => res.json() as Promise<GifMap>)
      .then((data) => {
        gifMapCache = data;
        return data;
      })
      .catch(() => {
        const empty: GifMap = { byExerciseId: {}, byNormalizedName: {} };
        gifMapCache = empty;
        return empty;
      });
  }
  return gifMapPromise;
}

/** ExerciseDB animated demo GIF (CDN). Empty if no strict match. */
export async function exerciseGifUrl(
  exerciseId?: string,
  exerciseName?: string,
): Promise<string> {
  const map = await loadGifMap();
  if (exerciseId && map.byExerciseId[exerciseId]) {
    return map.byExerciseId[exerciseId];
  }
  // Exact normalized name only — never fuzzy (wrong demos)
  if (exerciseName) {
    const key = normalizeExerciseName(exerciseName);
    if (map.byNormalizedName[key]) return map.byNormalizedName[key];
  }
  return "";
}

export function gifAttribution(): string {
  return (
    gifMapCache?.attribution ??
    "Exercise GIFs © AscendAPI / ExerciseDB — non-commercial use"
  );
}

export async function loadExerciseIndex(): Promise<ExerciseIndex> {
  if (indexCache) return indexCache;
  const res = await fetch("/data/exercises-index.json");
  indexCache = (await res.json()) as ExerciseIndex;
  return indexCache;
}

export async function loadExercises(): Promise<Exercise[]> {
  if (fullCache) return fullCache;
  const res = await fetch("/data/exercises.json");
  fullCache = (await res.json()) as Exercise[];
  return fullCache;
}

export async function getExerciseById(
  id: string,
): Promise<Exercise | undefined> {
  const all = await loadExercises();
  return all.find((e) => e.id === id);
}

export function exerciseImageUrl(relativePath: string | undefined): string {
  if (!relativePath) return "";
  return `${IMAGE_BASE}${relativePath}`;
}

export function getFuse(entries: ExerciseIndexEntry[]): Fuse<ExerciseIndexEntry> {
  if (fuseCache) return fuseCache;
  fuseCache = new Fuse(entries, {
    keys: [
      { name: "name", weight: 0.7 },
      { name: "primaryMuscles", weight: 0.2 },
      { name: "equipment", weight: 0.1 },
    ],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
  });
  return fuseCache;
}

export function resetFuseCache() {
  fuseCache = null;
}

export interface CatalogFilters {
  query: string;
  primaryMuscle: string;
  equipment: string;
  level: string;
  category: string;
}

export function filterExercises(
  entries: ExerciseIndexEntry[],
  filters: CatalogFilters,
  fuse?: Fuse<ExerciseIndexEntry>,
): ExerciseIndexEntry[] {
  let list = entries;

  if (filters.primaryMuscle) {
    list = list.filter((e) =>
      e.primaryMuscles.includes(filters.primaryMuscle),
    );
  }
  if (filters.equipment) {
    list = list.filter((e) => e.equipment === filters.equipment);
  }
  if (filters.level) {
    list = list.filter((e) => e.level === filters.level);
  }
  if (filters.category) {
    list = list.filter((e) => e.category === filters.category);
  }

  const q = filters.query.trim();
  if (!q) return list;

  const searcher =
    fuse ??
    new Fuse(list, {
      keys: ["name"],
      threshold: 0.35,
      ignoreLocation: true,
    });

  if (fuse && list !== entries) {
    const filteredFuse = new Fuse(list, {
      keys: ["name"],
      threshold: 0.35,
      ignoreLocation: true,
    });
    return filteredFuse.search(q).map((r) => r.item);
  }

  if (list === entries && fuse) {
    return fuse.search(q).map((r) => r.item);
  }

  return searcher.search(q).map((r) => r.item);
}

export function fuzzyMatchExerciseName(
  name: string,
  entries: ExerciseIndexEntry[],
  primaryMuscle?: string,
): FuzzyMatchResult {
  let pool = entries;
  if (primaryMuscle) {
    const narrowed = entries.filter((e) =>
      e.primaryMuscles.includes(primaryMuscle),
    );
    if (narrowed.length) pool = narrowed;
  }

  const fuse = new Fuse(pool, {
    keys: ["name"],
    threshold: 0.5,
    includeScore: true,
    ignoreLocation: true,
  });

  const results = fuse.search(name);
  const suggestions = results.slice(0, 6).map((r) => r.item);
  const best = results[0];
  const confidence = best ? 1 - (best.score ?? 1) : 0;
  const needsManualPick = !best || confidence < 0.55;

  return {
    importedName: name,
    matched: needsManualPick ? undefined : best.item,
    suggestions,
    confidence,
    needsManualPick,
  };
}

export function alternativesForMuscle(
  entries: ExerciseIndexEntry[],
  primaryMuscles: string[],
  excludeId?: string,
): ExerciseIndexEntry[] {
  return entries.filter(
    (e) =>
      e.id !== excludeId &&
      e.primaryMuscles.some((m) => primaryMuscles.includes(m)),
  );
}

export function emptyFacets(): ExerciseFacets {
  return {
    levels: [],
    equipment: [],
    categories: [],
    primaryMuscles: [],
  };
}
