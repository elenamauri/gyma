"use client";

import { ExerciseCatalogList } from "@/components/catalog/ExerciseCatalogList";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { useAppStore } from "@/lib/store";

export default function CatalogPage() {
  const { exercises, facets, fuse, loading } = useExerciseCatalog();
  const { favorites, recentExerciseIds, toggleFavorite } = useAppStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Catalogo</h1>
        <p className="mt-1 text-sm text-muted">
          873 esercizi da free-exercise-db. Cerca e filtra.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted">Caricamento esercizi…</p>
      ) : (
        <ExerciseCatalogList
          exercises={exercises}
          facets={facets}
          fuse={fuse}
          favorites={favorites}
          recentIds={recentExerciseIds}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
