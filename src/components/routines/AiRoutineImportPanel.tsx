"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type Fuse from "fuse.js";
import { AI_ROUTINE_PROMPT } from "@/lib/ai";
import {
  buildRoutineFromResolved,
  parseAiRoutineJson,
  resolveAiImport,
  type ResolvedImportExercise,
} from "@/lib/ai-import";
import type { ExerciseIndexEntry } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import Link from "next/link";

export function AiRoutineImportPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const { upsertRoutine, programs } = useAppStore();
  const { exercises, fuse, loading } = useExerciseCatalog();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resolved, setResolved] = useState<ResolvedImportExercise[] | null>(
    null,
  );
  const [importName, setImportName] = useState("");
  const [importType, setImportType] = useState<"reps" | "timed">("reps");
  const [programId, setProgramId] = useState(
    () => params.get("programId") || programs[0]?.id || "",
  );
  /** Index of the row currently picking from the full catalog. */
  const [pickingIdx, setPickingIdx] = useState<number | null>(null);

  async function copyPrompt() {
    await navigator.clipboard.writeText(AI_ROUTINE_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function validateAndMatch() {
    setError(null);
    setPickingIdx(null);
    const result = parseAiRoutineJson(raw);
    if (!result.ok || !result.data) {
      setError(result.error ?? "Errore di validazione");
      setResolved(null);
      return;
    }
    setImportName(result.data.name);
    setImportType(result.data.type);
    const next = resolveAiImport(result.data, exercises);
    setResolved(next);
    const firstMissing = next.findIndex(
      (r) => r.needsManualPick || !r.exerciseId,
    );
    if (firstMissing >= 0) setPickingIdx(firstMissing);
  }

  function assignExercise(idx: number, pick: ExerciseIndexEntry) {
    setResolved((prev) =>
      prev
        ? prev.map((r, i) =>
            i === idx
              ? {
                  ...r,
                  exerciseId: pick.id,
                  exerciseName: pick.name,
                  needsManualPick: false,
                }
              : r,
          )
        : prev,
    );
    setPickingIdx(null);
  }

  const needsPicks = useMemo(
    () => resolved?.some((r) => !r.exerciseId) ?? false,
    [resolved],
  );

  function save() {
    if (!resolved) return;
    const pid = programId || programs[0]?.id;
    if (!pid) {
      setError("Crea prima un programma, poi importa la routine.");
      return;
    }
    const built = buildRoutineFromResolved(
      importName,
      importType,
      resolved,
      pid,
    );
    if ("error" in built) {
      setError(built.error);
      return;
    }
    upsertRoutine(built);
    router.push(`/routines/programs/${pid}`);
  }

  if (programs.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Per importare una routine serve almeno un programma.
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
        Copia il prompt, chiedi a Claude una routine, poi incolla il JSON qui.
        Controlla e correggi gli abbinamenti sul catalogo.
      </p>

      <div>
        <Label htmlFor="import-program">Programma</Label>
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

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={copyPrompt}>
          {copied ? "Prompt copiato" : "Copia prompt per Claude"}
        </Button>
      </div>
      <div>
        <Label htmlFor="ai-json">Importa routine (JSON)</Label>
        <Textarea
          id="ai-json"
          rows={8}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder='{"name":"...","type":"reps","exercises":[...]}'
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

      {resolved && (
        <div className="space-y-3">
          <p className="text-sm">
            Routine: <strong>{importName}</strong> · tipo {importType}
          </p>
          <ul className="divide-y divide-hairline">
            {resolved.map((item, idx) => {
              const missing = !item.exerciseId;
              const isPicking = pickingIdx === idx;
              return (
                <li
                  key={`${item.importedName}-${idx}`}
                  className="space-y-2 py-3"
                >
                  <div className="text-sm">
                    Importato:{" "}
                    <span className="font-mono">{item.importedName}</span>
                  </div>

                  {!isPicking && (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-sm">
                        {missing ? (
                          <span className="text-accent">Nessun match</span>
                        ) : (
                          <>
                            <span className="text-muted">Abbinato: </span>
                            <span className="font-medium">
                              {item.exerciseName}
                            </span>
                            {item.needsManualPick === false &&
                              item.importedName.toLowerCase() !==
                                (item.exerciseName ?? "").toLowerCase() && (
                                <span className="ml-1 text-xs text-muted">
                                  (auto)
                                </span>
                              )}
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-sm text-accent touch-manipulation underline-offset-2 hover:underline"
                        onClick={() => setPickingIdx(idx)}
                      >
                        {missing ? "Scegli" : "Cambia"}
                      </button>
                    </div>
                  )}

                  {isPicking && (
                    <CatalogPicker
                      suggestions={item.suggestions}
                      catalog={exercises}
                      fuse={fuse}
                      initialQuery={missing ? item.importedName : ""}
                      onPick={(ex) => assignExercise(idx, ex)}
                      onCancel={() => setPickingIdx(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <Button type="button" onClick={save} disabled={needsPicks}>
            Crea routine
          </Button>
          {needsPicks && (
            <p className="text-xs text-muted">
              Seleziona un esercizio dal catalogo per ogni riga senza match.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CatalogPicker({
  suggestions,
  catalog,
  fuse,
  initialQuery,
  onPick,
  onCancel,
}: {
  suggestions: ExerciseIndexEntry[];
  catalog: ExerciseIndexEntry[];
  fuse: Fuse<ExerciseIndexEntry> | null;
  initialQuery: string;
  onPick: (ex: ExerciseIndexEntry) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) {
      if (suggestions.length > 0) return suggestions;
      return catalog.slice(0, 50);
    }
    if (fuse) {
      return fuse.search(q).slice(0, 60).map((r) => r.item);
    }
    const lower = q.toLowerCase();
    return catalog
      .filter((e) => e.name.toLowerCase().includes(lower))
      .slice(0, 60);
  }, [query, fuse, catalog, suggestions]);

  const showSuggestionsHint = !query.trim() && suggestions.length > 0;

  return (
    <div className="space-y-2 border border-hairline bg-chalk p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="import-catalog-search">Cerca nel catalogo</Label>
        <button
          type="button"
          className="text-xs text-muted touch-manipulation hover:text-ink"
          onClick={onCancel}
        >
          Annulla
        </button>
      </div>
      <Input
        id="import-catalog-search"
        type="search"
        autoFocus
        placeholder="Nome esercizio…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showSuggestionsHint && (
        <p className="text-xs text-muted">Suggerimenti fuzzy · oppure cerca</p>
      )}
      <ul className="max-h-56 divide-y divide-hairline overflow-y-auto">
        {results.length === 0 ? (
          <li className="py-3 text-sm text-muted">Nessun risultato</li>
        ) : (
          results.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 py-2.5 text-left touch-manipulation hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                onClick={() => onPick(ex)}
              >
                <span className="text-sm font-medium">{ex.name}</span>
                <span className="text-xs text-muted">
                  {ex.primaryMuscles.slice(0, 2).join(", ") || "—"}
                  {ex.equipment ? ` · ${ex.equipment}` : ""}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
