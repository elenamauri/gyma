"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ExerciseCatalogList } from "@/components/catalog/ExerciseCatalogList";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { useAppStore } from "@/lib/store";

export default function CatalogPage() {
  const { exercises, facets, fuse, loading } = useExerciseCatalog();
  const { favorites, recentExerciseIds, toggleFavorite } = useAppStore();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catalogo"
        description="Cerca e filtra gli esercizi."
        backHref="/"
        backLabel="Home"
      />
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
