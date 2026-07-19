"use client";

import { useEffect, useState } from "react";
import {
  emptyFacets,
  getFuse,
  loadExerciseIndex,
} from "@/lib/exercises";
import type { ExerciseFacets, ExerciseIndexEntry } from "@/lib/types";
import type Fuse from "fuse.js";

export function useExerciseCatalog() {
  const [exercises, setExercises] = useState<ExerciseIndexEntry[]>([]);
  const [facets, setFacets] = useState<ExerciseFacets>(emptyFacets());
  const [fuse, setFuse] = useState<Fuse<ExerciseIndexEntry> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadExerciseIndex().then((index) => {
      if (cancelled) return;
      setExercises(index.exercises);
      setFacets(index.facets);
      setFuse(getFuse(index.exercises));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { exercises, facets, fuse, loading };
}
