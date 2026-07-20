"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { filterExercises } from "@/lib/exercises";
import type { CatalogFilters } from "@/lib/exercises";
import type { ExerciseFacets, ExerciseIndexEntry } from "@/lib/types";
import type Fuse from "fuse.js";
import { Input, Select, Label, EmptyState, Mono } from "@/components/ui/primitives";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";

function catalogDetailHref(id: string) {
  return `/catalog/${id}?return=${encodeURIComponent("/catalog")}`;
}

const emptyFilters: CatalogFilters = {
  query: "",
  primaryMuscle: "",
  equipment: "",
  level: "",
  category: "",
};

export function ExerciseCatalogList({
  exercises,
  facets,
  fuse,
  favorites,
  recentIds,
  onToggleFavorite,
}: {
  exercises: ExerciseIndexEntry[];
  facets: ExerciseFacets;
  fuse: Fuse<ExerciseIndexEntry> | null;
  favorites: string[];
  recentIds: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters);

  const filtered = useMemo(
    () => filterExercises(exercises, filters, fuse ?? undefined),
    [exercises, filters, fuse],
  );

  const favoriteItems = useMemo(
    () => exercises.filter((e) => favorites.includes(e.id)),
    [exercises, favorites],
  );

  const recentItems = useMemo(
    () =>
      recentIds
        .map((id) => exercises.find((e) => e.id === id))
        .filter(Boolean) as ExerciseIndexEntry[],
    [exercises, recentIds],
  );

  const showQuick =
    !filters.query &&
    !filters.primaryMuscle &&
    !filters.equipment &&
    !filters.level &&
    !filters.category;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <Label htmlFor="search">Cerca</Label>
          <Input
            id="search"
            placeholder="Nome esercizio…"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            autoComplete="off"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="muscle">Muscolo</Label>
            <Select
              id="muscle"
              value={filters.primaryMuscle}
              onChange={(e) =>
                setFilters((f) => ({ ...f, primaryMuscle: e.target.value }))
              }
            >
              <option value="">Tutti</option>
              {facets.primaryMuscles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="equipment">Attrezzatura</Label>
            <Select
              id="equipment"
              value={filters.equipment}
              onChange={(e) =>
                setFilters((f) => ({ ...f, equipment: e.target.value }))
              }
            >
              <option value="">Tutte</option>
              {facets.equipment.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="level">Livello</Label>
            <Select
              id="level"
              value={filters.level}
              onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
            >
              <option value="">Tutti</option>
              {facets.levels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select
              id="category"
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value }))
              }
            >
              <option value="">Tutte</option>
              {facets.categories.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {showQuick && favoriteItems.length > 0 && (
        <QuickSection title="Preferiti" items={favoriteItems} />
      )}
      {showQuick && recentItems.length > 0 && (
        <QuickSection title="Usati di recente" items={recentItems} />
      )}

      <div>
        <div className="mb-2 flex items-baseline justify-between border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">Esercizi</h2>
          <Mono className="text-sm text-muted">{filtered.length}</Mono>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="Nessun esercizio"
            description="Prova a cambiare i filtri o la ricerca."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {filtered.map((ex) => (
              <li key={ex.id} className="flex min-h-14 items-center gap-2">
                <Link
                  href={catalogDetailHref(ex.id)}
                  className="min-w-0 flex-1 py-3 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="truncate text-[15px] font-medium">{ex.name}</div>
                  <div className="truncate text-xs text-muted">
                    {ex.primaryMuscles.join(", ")}
                    {ex.equipment ? ` · ${ex.equipment}` : ""}
                    {` · ${ex.level}`}
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={
                    favorites.includes(ex.id)
                      ? "Rimuovi dai preferiti"
                      : "Aggiungi ai preferiti"
                  }
                  onClick={() => onToggleFavorite(ex.id)}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center text-lg touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    favorites.includes(ex.id) ? "text-accent" : "text-muted"
                  }`}
                >
                  {favorites.includes(ex.id) ? "★" : "☆"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuickSection({
  title,
  items,
}: {
  title: string;
  items: ExerciseIndexEntry[];
}) {
  return (
    <div>
      <h2 className="mb-2 font-display text-lg font-bold border-b border-hairline pb-2">
        {title}
      </h2>
      <ul className="divide-y divide-hairline">
        {items.slice(0, 8).map((ex) => (
          <li key={ex.id}>
            <Link
              href={catalogDetailHref(ex.id)}
              className="flex items-center gap-3 py-2 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ExerciseThumb
                link={false}
                size="sm"
                exerciseId={ex.id}
                exerciseName={ex.name}
                imagePath={ex.images[0]}
                primaryMuscles={ex.primaryMuscles}
                secondaryMuscles={ex.secondaryMuscles}
                className="!h-10 !w-10"
              />
              <div className="min-w-0">
                <div className="truncate text-sm">{ex.name}</div>
                <div className="truncate text-xs text-muted">
                  {ex.primaryMuscles.join(", ")}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
