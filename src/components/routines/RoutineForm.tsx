"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Routine, RoutineType } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import {
  clearDraft,
  draftToRoutine,
  ensureDraft,
  loadDraft,
  saveDraft,
  type RoutineDraft,
} from "@/lib/routine-draft";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui/primitives";

export function RoutineForm({
  initial,
  returnPath,
}: {
  initial?: Routine;
  returnPath: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { upsertRoutine, settings } = useAppStore();
  const [draft, setDraft] = useState<RoutineDraft | null>(null);

  useEffect(() => {
    // Prefer current draft in session when returning from pick
    const existing = loadDraft();
    if (existing && existing.returnPath === returnPath) {
      setDraft(existing);
      return;
    }
    setDraft(ensureDraft(returnPath, initial));
  }, [returnPath, initial, pathname]);

  function update(patch: Partial<RoutineDraft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      // switching type keeps both lists; UI shows the active one
      saveDraft(next);
      return next;
    });
  }

  function move(index: number, dir: -1 | 1) {
    if (!draft) return;
    if (draft.type === "reps") {
      const target = index + dir;
      if (target < 0 || target >= draft.repsExercises.length) return;
      const next = [...draft.repsExercises];
      [next[index], next[target]] = [next[target], next[index]];
      update({ repsExercises: next });
    } else {
      const target = index + dir;
      if (target < 0 || target >= draft.timedExercises.length) return;
      const next = [...draft.timedExercises];
      [next[index], next[target]] = [next[target], next[index]];
      update({ timedExercises: next });
    }
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
  }

  function save() {
    if (!draft || !draft.name.trim()) return;
    const list =
      draft.type === "reps" ? draft.repsExercises : draft.timedExercises;
    if (list.length === 0) return;
    upsertRoutine(draftToRoutine(draft));
    clearDraft();
    router.push("/routines");
  }

  function openPicker() {
    if (!draft) return;
    saveDraft(draft);
    router.push(`/routines/pick?return=${encodeURIComponent(returnPath)}`);
  }

  if (!draft) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  const list =
    draft.type === "reps" ? draft.repsExercises : draft.timedExercises;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
          1. Impostazioni
        </h2>
        <div>
          <Label htmlFor="rname">Nome routine</Label>
          <Input
            id="rname"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Push A, Full body, HIIT core…"
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
          {initial && (
            <p className="mt-1 text-xs text-muted">
              Il tipo non è modificabile dopo la creazione.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2 border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">
            2. Esercizi
            <span className="ml-2 font-mono text-sm font-normal text-muted">
              {list.length}
            </span>
          </h2>
        </div>

        <Button type="button" className="w-full" onClick={openPicker}>
          {list.length === 0 ? "Scegli esercizi dal catalogo" : "Aggiungi / modifica esercizi"}
        </Button>

        {list.length === 0 ? (
          <EmptyState
            title="Nessun esercizio"
            description="Apri il catalogo, filtra per muscolo e seleziona gli esercizi."
            action={
              <Button type="button" variant="accent" onClick={openPicker}>
                Apri catalogo
              </Button>
            }
          />
        ) : draft.type === "reps" ? (
          <ul className="divide-y divide-hairline">
            {draft.repsExercises.map((ex, index) => (
              <li key={ex.id} className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted">#{index + 1}</div>
                    <div className="font-medium">{ex.exerciseName}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconBtn label="Su" onClick={() => move(index, -1)}>
                      ↑
                    </IconBtn>
                    <IconBtn label="Giù" onClick={() => move(index, 1)}>
                      ↓
                    </IconBtn>
                    <IconBtn label="Rimuovi" onClick={() => removeAt(index)}>
                      ×
                    </IconBtn>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Serie"
                    value={ex.sets}
                    onChange={(v) =>
                      update({
                        repsExercises: draft.repsExercises.map((p, i) =>
                          i === index ? { ...p, sets: v } : p,
                        ),
                      })
                    }
                  />
                  <NumField
                    label="Reps"
                    value={ex.reps}
                    onChange={(v) =>
                      update({
                        repsExercises: draft.repsExercises.map((p, i) =>
                          i === index ? { ...p, reps: v } : p,
                        ),
                      })
                    }
                  />
                  <NumField
                    label={`Peso (${settings.unit})`}
                    value={ex.targetWeight ?? ""}
                    optional
                    onChange={(v) =>
                      update({
                        repsExercises: draft.repsExercises.map((p, i) =>
                          i === index
                            ? { ...p, targetWeight: v || undefined }
                            : p,
                        ),
                      })
                    }
                  />
                  <NumField
                    label="Recupero s"
                    value={ex.restSeconds}
                    onChange={(v) =>
                      update({
                        repsExercises: draft.repsExercises.map((p, i) =>
                          i === index ? { ...p, restSeconds: v } : p,
                        ),
                      })
                    }
                  />
                </div>
                <Textarea
                  placeholder="Note (opzionale)"
                  rows={2}
                  value={ex.notes ?? ""}
                  onChange={(e) =>
                    update({
                      repsExercises: draft.repsExercises.map((p, i) =>
                        i === index ? { ...p, notes: e.target.value } : p,
                      ),
                    })
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-hairline">
            {draft.timedExercises.map((ex, index) => (
              <li key={ex.id} className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted">#{index + 1}</div>
                    <div className="font-medium">{ex.exerciseName}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconBtn label="Su" onClick={() => move(index, -1)}>
                      ↑
                    </IconBtn>
                    <IconBtn label="Giù" onClick={() => move(index, 1)}>
                      ↓
                    </IconBtn>
                    <IconBtn label="Rimuovi" onClick={() => removeAt(index)}>
                      ×
                    </IconBtn>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Durata s"
                    value={ex.durationSeconds}
                    onChange={(v) =>
                      update({
                        timedExercises: draft.timedExercises.map((p, i) =>
                          i === index ? { ...p, durationSeconds: v } : p,
                        ),
                      })
                    }
                  />
                  <NumField
                    label="Recupero s"
                    value={ex.restSeconds}
                    onChange={(v) =>
                      update({
                        timedExercises: draft.timedExercises.map((p, i) =>
                          i === index ? { ...p, restSeconds: v } : p,
                        ),
                      })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-hairline pt-4">
        <h2 className="font-display text-lg font-bold">3. Salva</h2>
        <Button
          type="button"
          variant="accent"
          className="w-full"
          onClick={save}
          disabled={!draft.name.trim() || list.length === 0}
        >
          Salva routine
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            clearDraft();
            router.push("/routines");
          }}
        >
          Annulla
        </Button>
      </section>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center border border-hairline text-sm text-muted hover:text-ink touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}

function NumField({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: number | "";
  onChange: (v: number) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        min={optional ? 0 : 1}
        step="any"
        value={value}
        onChange={(e) => {
          const n = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(n);
        }}
        className="font-mono"
      />
    </div>
  );
}
