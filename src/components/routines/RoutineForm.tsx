"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Routine, RoutineType } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import {
  clearDraft,
  draftToRoutine,
  ensureDraft,
  loadDraft,
  saveDraft,
  type RoutineDraft,
} from "@/lib/routine-draft";
import {
  RoutineAccordion,
  RoutineExerciseList,
  reorderByIds,
  useRoutineStats,
} from "@/components/routines/RoutinePreview";
import {
  addDropSetStep,
  addDropSetStepTimed,
  linkSupersetWithNext,
  unlinkFromGroup,
} from "@/lib/exercise-groups";
import { DEFAULT_PROGRESSION } from "@/lib/types";
import {
  Button,
  Input,
  Label,
  Select,
  EmptyState,
} from "@/components/ui/primitives";

export function RoutineForm({
  initial,
  returnPath,
  programId,
}: {
  initial?: Routine;
  returnPath: string;
  programId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const catalogReturnHref = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);
  const { upsertRoutine, settings, programs } = useAppStore();
  const { exercises } = useExerciseCatalog();
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resolvedProgramId =
    programId || initial?.programId || programs[0]?.id || "";

  useEffect(() => {
    const existing = loadDraft();
    if (existing && existing.returnPath === returnPath) {
      setDraft({
        ...existing,
        programId: existing.programId || resolvedProgramId,
        wizardStep: existing.wizardStep ?? (existing.name.trim() ? 2 : 1),
      });
      return;
    }
    setDraft(ensureDraft(returnPath, initial, resolvedProgramId));
  }, [returnPath, initial, pathname, resolvedProgramId]);

  function update(patch: Partial<RoutineDraft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveDraft(next);
      return next;
    });
  }

  function goStep2() {
    if (!draft?.name.trim()) return;
    update({ wizardStep: 2 });
  }

  function openPicker() {
    if (!draft) return;
    saveDraft({ ...draft, wizardStep: 2 });
    router.push(`/routines/pick?return=${encodeURIComponent(returnPath)}`);
  }

  function removeAt(index: number) {
    if (!draft) return;
    if (draft.type === "reps") {
      update({
        repsExercises: draft.repsExercises.filter((_, i) => i !== index),
      });
    } else {
      update({
        timedExercises: draft.timedExercises.filter((_, i) => i !== index),
      });
    }
    setEditingId(null);
  }

  function save() {
    if (!draft || !draft.name.trim()) return;
    const list =
      draft.type === "reps" ? draft.repsExercises : draft.timedExercises;
    if (list.length === 0) return;
    if (!draft.programId) {
      update({ programId: resolvedProgramId });
      if (!resolvedProgramId) return;
    }
    const routine = draftToRoutine({
      ...draft,
      programId: draft.programId || resolvedProgramId,
    });
    upsertRoutine(routine);
    clearDraft();
    router.push(`/routines/programs/${routine.programId}`);
  }

  const list =
    draft?.type === "reps"
      ? draft.repsExercises
      : draft?.timedExercises ?? [];

  const stats = useRoutineStats(
    draft
      ? {
          type: draft.type,
          exercises: list,
        }
      : null,
    exercises,
  );

  if (!draft) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  const step = draft.wizardStep ?? 1;

  /* ——— Step 1: nome programma ——— */
  if (step === 1) {
    return (
      <div className="space-y-6 pb-28">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Passo 1 di 2</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
            Nome programma
          </h2>
          <p className="mt-1 text-sm text-muted">
            Dai un nome alla routine, poi scegli gli esercizi.
          </p>
        </div>

        <div>
          <Label htmlFor="rname">Nome</Label>
          <Input
            id="rname"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="es. Schiena A, Full body…"
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="rtype">Tipo</Label>
          <Select
            id="rtype"
            value={draft.type}
            onChange={(e) => update({ type: e.target.value as RoutineType })}
            disabled={!!initial}
          >
            <option value="reps">Serie / reps</option>
            <option value="timed">A tempo (circuito)</option>
          </Select>
        </div>

        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-0 z-30 border-t border-hairline bg-chalk/95 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto max-w-lg">
            <Button
              type="button"
              variant="accent"
              className="w-full"
              disabled={!draft.name.trim()}
              onClick={goStep2}
            >
              Continua · Aggiungi esercizi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ——— Step 2: lista + catalogo ——— */
  return (
    <div className="space-y-5 pb-36">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted">Passo 2 di 2</p>
        <button
          type="button"
          className="text-sm text-muted underline underline-offset-2 touch-manipulation"
          onClick={() => update({ wizardStep: 1 })}
        >
          Cambia nome
        </button>
      </div>

      <RoutineAccordion
        name={draft.name.trim() || "Routine"}
        subtitle={`${list.length} esercizi`}
        stats={stats}
        defaultOpen={false}
      />

      {list.length === 0 ? (
        <EmptyState
          title="Nessun esercizio"
          description="Apri il catalogo e seleziona più esercizi insieme."
          action={
            <Button type="button" variant="accent" onClick={openPicker}>
              Apri catalogo
            </Button>
          }
        />
      ) : (
        <RoutineExerciseList
          type={draft.type}
          exercises={list}
          catalog={exercises}
          editingId={editingId}
          weightUnit={settings.unit}
          catalogReturnHref={catalogReturnHref}
          onSelect={(id) => setEditingId(id === editingId ? null : id)}
          onChangeReps={(id, patch) =>
            update({
              repsExercises: draft.repsExercises.map((p) =>
                p.id === id ? { ...p, ...patch } : p,
              ),
            })
          }
          onChangeTimed={(id, patch) =>
            update({
              timedExercises: draft.timedExercises.map((p) =>
                p.id === id ? { ...p, ...patch } : p,
              ),
            })
          }
          onRemove={(id) => {
            const idx =
              draft.type === "reps"
                ? draft.repsExercises.findIndex((e) => e.id === id)
                : draft.timedExercises.findIndex((e) => e.id === id);
            if (idx >= 0) removeAt(idx);
          }}
          onReplace={(id) => {
            saveDraft({ ...draft, wizardStep: 2 });
            router.push(
              `/routines/pick?return=${encodeURIComponent(returnPath)}&replace=${encodeURIComponent(id)}`,
            );
          }}
          onSuperset={(id) => {
            if (draft.type === "reps") {
              update({
                repsExercises: linkSupersetWithNext(draft.repsExercises, id),
              });
            } else {
              update({
                timedExercises: linkSupersetWithNext(draft.timedExercises, id),
              });
            }
          }}
          onDropSet={(id) => {
            if (draft.type === "reps") {
              update({
                repsExercises: addDropSetStep(draft.repsExercises, id),
              });
            } else {
              update({
                timedExercises: addDropSetStepTimed(draft.timedExercises, id),
              });
            }
          }}
          onUngroup={(id) => {
            if (draft.type === "reps") {
              update({
                repsExercises: unlinkFromGroup(draft.repsExercises, id),
              });
            } else {
              update({
                timedExercises: unlinkFromGroup(draft.timedExercises, id),
              });
            }
          }}
          onReorder={(activeId, overId) => {
            if (draft.type === "reps") {
              update({
                repsExercises: reorderByIds(
                  draft.repsExercises,
                  activeId,
                  overId,
                ),
              });
            } else {
              update({
                timedExercises: reorderByIds(
                  draft.timedExercises,
                  activeId,
                  overId,
                ),
              });
            }
          }}
        />
      )}

      {draft.type === "reps" && (
        <section className="space-y-3 border-t border-hairline pt-5">
          <h3 className="font-display text-lg font-bold">Progressione</h3>
          <p className="text-sm text-muted">
            Dopo ogni sessione completata, aggiorna i carichi target della
            routine.
          </p>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent"
              checked={
                (draft.progression ?? DEFAULT_PROGRESSION).enabled
              }
              onChange={(e) =>
                update({
                  progression: {
                    ...DEFAULT_PROGRESSION,
                    ...draft.progression,
                    enabled: e.target.checked,
                  },
                })
              }
            />
            Progressione automatica
          </label>
          {(draft.progression ?? DEFAULT_PROGRESSION).enabled && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="bumpKg">Incremento (kg)</Label>
                <Input
                  id="bumpKg"
                  type="number"
                  step="0.5"
                  min={0}
                  className="font-mono"
                  value={(draft.progression ?? DEFAULT_PROGRESSION).bumpKg}
                  onChange={(e) =>
                    update({
                      progression: {
                        ...DEFAULT_PROGRESSION,
                        ...draft.progression,
                        bumpKg: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="bumpWhen">Condizione incremento</Label>
                <Select
                  id="bumpWhen"
                  value={
                    (draft.progression ?? DEFAULT_PROGRESSION).bumpWhen
                  }
                  onChange={(e) =>
                    update({
                      progression: {
                        ...DEFAULT_PROGRESSION,
                        ...draft.progression,
                        bumpWhen: e.target.value as
                          | "all_sets_hit"
                          | "rpe_avg_below",
                      },
                    })
                  }
                >
                  <option value="all_sets_hit">
                    Tutte le serie al target
                  </option>
                  <option value="rpe_avg_below">
                    Serie ok e RPE medio sotto soglia
                  </option>
                </Select>
              </div>
              {(draft.progression ?? DEFAULT_PROGRESSION).bumpWhen ===
                "rpe_avg_below" && (
                <div>
                  <Label htmlFor="rpeCeiling">Soglia RPE</Label>
                  <Input
                    id="rpeCeiling"
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    className="font-mono"
                    value={
                      (draft.progression ?? DEFAULT_PROGRESSION).rpeCeiling
                    }
                    onChange={(e) =>
                      update({
                        progression: {
                          ...DEFAULT_PROGRESSION,
                          ...draft.progression,
                          rpeCeiling: Number(e.target.value) || 8,
                        },
                      })
                    }
                  />
                </div>
              )}
              <div>
                <Label htmlFor="deloadN">Deload ogni N sessioni (0 = no)</Label>
                <Input
                  id="deloadN"
                  type="number"
                  min={0}
                  className="font-mono"
                  value={
                    (draft.progression ?? DEFAULT_PROGRESSION)
                      .deloadEveryNSessions
                  }
                  onChange={(e) =>
                    update({
                      progression: {
                        ...DEFAULT_PROGRESSION,
                        ...draft.progression,
                        deloadEveryNSessions: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="deloadPct">Riduzione deload (%)</Label>
                <Input
                  id="deloadPct"
                  type="number"
                  min={0}
                  max={50}
                  className="font-mono"
                  value={
                    (draft.progression ?? DEFAULT_PROGRESSION).deloadPercent
                  }
                  onChange={(e) =>
                    update({
                      progression: {
                        ...DEFAULT_PROGRESSION,
                        ...draft.progression,
                        deloadPercent: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}
        </section>
      )}

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-0 z-30 space-y-2 border-t border-hairline bg-chalk/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg space-y-2">
          <Button type="button" className="w-full" onClick={openPicker}>
            {list.length === 0
              ? "Apri catalogo · selezione multipla"
              : "+ Aggiungi altri esercizi"}
          </Button>
          <Button
            type="button"
            variant="accent"
            className="w-full"
            onClick={save}
            disabled={!draft.name.trim() || list.length === 0}
          >
            Salva routine
          </Button>
        </div>
      </div>
    </div>
  );
}
