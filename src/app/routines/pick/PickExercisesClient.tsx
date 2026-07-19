"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { useAppStore } from "@/lib/store";
import { filterExercises, type CatalogFilters } from "@/lib/exercises";
import {
  addExerciseToDraft,
  draftExerciseCount,
  draftHasExercise,
  loadDraft,
  removeExerciseFromDraft,
  type RoutineDraft,
} from "@/lib/routine-draft";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, Input, Label, Mono, Select } from "@/components/ui/primitives";

const emptyFilters: CatalogFilters = {
  query: "",
  primaryMuscle: "",
  equipment: "",
  level: "",
  category: "",
};

export default function PickExercisesClient() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return") || "/routines/new";
  const { settings } = useAppStore();
  const { exercises, facets, fuse, loading } = useExerciseCatalog();
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters);

  useEffect(() => {
    const d = loadDraft();
    if (!d) {
      router.replace(returnTo);
      return;
    }
    setDraft(d);
  }, [returnTo, router]);

  const filtered = useMemo(
    () => filterExercises(exercises, filters, fuse ?? undefined),
    [exercises, filters, fuse],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const ex of filtered) {
      const muscle = ex.primaryMuscles[0] || "altro";
      const list = map.get(muscle) ?? [];
      list.push(ex);
      map.set(muscle, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function toggle(exId: string) {
    if (!draft) return;
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;
    const next = draftHasExercise(draft, exId)
      ? removeExerciseFromDraft(draft, exId)
      : addExerciseToDraft(draft, ex, settings.defaultRestSeconds);
    setDraft(next);
  }

  if (loading || !draft) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  const count = draftExerciseCount(draft);

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title="Scegli esercizi"
        description="Tocca per aggiungere o togliere. Raggruppati per muscolo."
        backHref={returnTo}
        backLabel="Configuratore"
      />

      <div className="sticky top-12 z-30 -mx-4 space-y-3 border-b border-hairline bg-chalk/95 px-4 py-3 backdrop-blur-sm">
        <Input
          placeholder="Cerca esercizio…"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          autoComplete="off"
        />
        <div className="grid grid-cols-2 gap-2">
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
              onChange={(e) =>
                setFilters((f) => ({ ...f, level: e.target.value }))
              }
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
        <div className="flex items-center justify-between gap-2">
          <Mono className="text-xs text-muted">{filtered.length} risultati</Mono>
          <Button
            type="button"
            variant="accent"
            onClick={() => router.push(returnTo)}
          >
            Fatto · {count}
          </Button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Nessun esercizio con questi filtri.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([muscle, items]) => (
            <section key={muscle}>
              <h2 className="mb-2 border-b border-hairline pb-1 font-display text-base font-bold uppercase tracking-wide">
                {muscle}
                <span className="ml-2 font-mono text-xs font-normal text-muted">
                  {items.length}
                </span>
              </h2>
              <ul className="divide-y divide-hairline">
                {items.map((ex) => {
                  const selected = draftHasExercise(draft, ex.id);
                  return (
                    <li key={ex.id}>
                      <button
                        type="button"
                        onClick={() => toggle(ex.id)}
                        className={`flex min-h-14 w-full items-center gap-3 py-3 text-left touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                          selected ? "text-accent" : ""
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center border text-xs ${
                            selected
                              ? "border-accent bg-accent text-chalk"
                              : "border-hairline text-transparent"
                          }`}
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">
                            {ex.name}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {ex.equipment ?? "body"} · {ex.level}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-0 z-30 border-t border-hairline bg-chalk/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Button
            type="button"
            variant="accent"
            className="w-full"
            onClick={() => router.push(returnTo)}
          >
            Torna al configuratore · {count} esercizi
          </Button>
        </div>
      </div>
    </div>
  );
}
