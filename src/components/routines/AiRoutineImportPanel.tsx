"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AI_IMPORT_PROMPT } from "@/lib/ai";
import {
  buildProgramFromImport,
  buildRoutineFromResolved,
  parseAiImportJson,
  resolveAiImport,
  resolveProgramImport,
} from "@/lib/ai-import";
import {
  clearImportDraft,
  importDraftNeedsPicks,
  loadImportDraft,
  saveImportDraft,
  type ImportDraft,
} from "@/lib/import-draft";
import { useAppStore } from "@/lib/store";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { Button, Label, Select, Textarea } from "@/components/ui/primitives";
import Link from "next/link";

const IMPORT_RETURN = "/routines/import";

export function AiRoutineImportPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const { upsertRoutine, upsertProgram, programs } = useAppStore();
  const { exercises, loading } = useExerciseCatalog();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [programId, setProgramId] = useState(
    () => params.get("programId") || programs[0]?.id || "",
  );

  const restoreDraft = useCallback(() => {
    const saved = loadImportDraft();
    if (saved?.returnPath === IMPORT_RETURN) {
      setDraft(saved);
      if (saved.programId) setProgramId(saved.programId);
    }
  }, []);

  useEffect(() => {
    restoreDraft();
  }, [restoreDraft]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(AI_IMPORT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function validateAndMatch() {
    setError(null);
    const result = parseAiImportJson(raw);
    if (!result.ok) {
      setError(result.error);
      setDraft(null);
      clearImportDraft();
      return;
    }

    if (result.parsed.kind === "routine") {
      const r = result.parsed.routine;
      const next: ImportDraft = {
        returnPath: IMPORT_RETURN,
        mode: "routine",
        programId: programId || programs[0]?.id,
        routine: {
          name: r.name,
          type: r.type,
          exercises: resolveAiImport(r, exercises),
        },
      };
      setDraft(next);
      saveImportDraft(next);
      return;
    }

    const p = result.parsed.program;
    const next: ImportDraft = {
      returnPath: IMPORT_RETURN,
      mode: "program",
      program: {
        name: p.name,
        routines: resolveProgramImport(p, exercises),
      },
    };
    setDraft(next);
    saveImportDraft(next);
  }

  function openCatalogPick(routineIndex: number, exerciseIndex: number) {
    if (!draft) return;
    saveImportDraft(draft);
    router.push(
      `/routines/import/pick?routine=${routineIndex}&row=${exerciseIndex}&return=${encodeURIComponent(IMPORT_RETURN)}`,
    );
  }

  const needsPicks = draft ? importDraftNeedsPicks(draft) : false;

  function save() {
    if (!draft) return;
    setError(null);

    if (draft.mode === "routine" && draft.routine) {
      const pid = draft.programId || programId || programs[0]?.id;
      if (!pid) {
        setError("Crea prima un programma, poi importa la routine.");
        return;
      }
      const built = buildRoutineFromResolved(
        draft.routine.name,
        draft.routine.type,
        draft.routine.exercises,
        pid,
      );
      if ("error" in built) {
        setError(built.error);
        return;
      }
      upsertRoutine(built);
      clearImportDraft();
      router.push(`/routines/programs/${pid}`);
      return;
    }

    if (draft.mode === "program" && draft.program) {
      const built = buildProgramFromImport(
        draft.program.name,
        draft.program.routines,
      );
      if ("error" in built) {
        setError(built.error);
        return;
      }
      upsertProgram(built.program);
      for (const r of built.routines) upsertRoutine(r);
      clearImportDraft();
      router.push(`/routines/programs/${built.program.id}`);
    }
  }

  const canImportRoutine = programs.length > 0 || draft?.mode === "program";

  if (!canImportRoutine && !draft) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Per importare una singola routine serve almeno un programma. Puoi
          importare un programma intero senza programmi esistenti.
        </p>
        <Link href="/routines/programs/new">
          <Button type="button" variant="accent">
            Crea programma
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Copia il prompt per Claude, incolla il JSON (routine singola o programma
        con più routine). Correggi gli abbinamenti aprendo il catalogo.
      </p>

      {(!draft || draft.mode === "routine") && programs.length > 0 && (
        <div>
          <Label htmlFor="import-program">Programma destinazione (routine)</Label>
          <Select
            id="import-program"
            value={programId || programs[0]?.id}
            onChange={(e) => setProgramId(e.target.value)}
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={copyPrompt}>
          {copied ? "Prompt copiato" : "Copia prompt per Claude"}
        </Button>
      </div>

      <div>
        <Label htmlFor="ai-json">Importa JSON</Label>
        <Textarea
          id="ai-json"
          rows={10}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder='Routine: {"name":"...","type":"reps","exercises":[...]} — Programma: {"name":"...","routines":[...]}'
          className="font-mono text-xs"
        />
      </div>

      <Button
        type="button"
        onClick={validateAndMatch}
        disabled={loading || !raw.trim()}
      >
        Valida e abbina
      </Button>
      {error && <p className="text-sm text-accent">{error}</p>}

      {draft?.mode === "routine" && draft.routine && (
        <ImportReview
          title={`Routine: ${draft.routine.name}`}
          subtitle={`Tipo ${draft.routine.type}`}
          routines={[{ ...draft.routine, routineIndex: 0 }]}
          onPick={openCatalogPick}
        />
      )}

      {draft?.mode === "program" && draft.program && (
        <ImportReview
          title={`Programma: ${draft.program.name}`}
          subtitle={`${draft.program.routines.length} routine`}
          routines={draft.program.routines.map((r, routineIndex) => ({
            ...r,
            routineIndex,
          }))}
          onPick={openCatalogPick}
        />
      )}

      {draft && (
        <>
          <Button type="button" onClick={save} disabled={needsPicks}>
            {draft.mode === "program" ? "Crea programma" : "Crea routine"}
          </Button>
          {needsPicks && (
            <p className="text-xs text-muted">
              Seleziona un esercizio dal catalogo per ogni riga senza match.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ImportReview({
  title,
  subtitle,
  routines,
  onPick,
}: {
  title: string;
  subtitle: string;
  routines: Array<{
    routineIndex: number;
    name: string;
    type: string;
    exercises: import("@/lib/ai-import").ResolvedImportExercise[];
  }>;
  onPick: (routineIndex: number, exerciseIndex: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
      {routines.map((routine) => (
        <section key={`${routine.name}-${routine.routineIndex}`} className="space-y-2">
          {routines.length > 1 && (
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
              {routine.name} · {routine.type}
            </h3>
          )}
          <ul className="divide-y divide-hairline">
            {routine.exercises.map((item, exerciseIndex) => {
              const missing = !item.exerciseId;
              return (
                <li
                  key={`${item.importedName}-${exerciseIndex}`}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0 text-sm">
                    <div className="font-mono text-xs text-muted">
                      {item.importedName}
                    </div>
                    {missing ? (
                      <span className="text-accent">Nessun match</span>
                    ) : (
                      <span className="font-medium">{item.exerciseName}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-sm text-accent touch-manipulation underline-offset-2 hover:underline"
                    onClick={() => onPick(routine.routineIndex, exerciseIndex)}
                  >
                    {missing ? "Catalogo" : "Cambia"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
