"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AI_ROUTINE_PROMPT } from "@/lib/ai";
import {
  buildRoutineFromResolved,
  parseAiRoutineJson,
  resolveAiImport,
  type ResolvedImportExercise,
} from "@/lib/ai-import";
import { useAppStore } from "@/lib/store";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { Button, Textarea, Label, Select } from "@/components/ui/primitives";

export function AiRoutineImportPanel() {
  const router = useRouter();
  const { upsertRoutine } = useAppStore();
  const { exercises, loading } = useExerciseCatalog();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resolved, setResolved] = useState<ResolvedImportExercise[] | null>(null);
  const [importName, setImportName] = useState("");
  const [importType, setImportType] = useState<"reps" | "timed">("reps");

  async function copyPrompt() {
    await navigator.clipboard.writeText(AI_ROUTINE_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function validateAndMatch() {
    setError(null);
    const result = parseAiRoutineJson(raw);
    if (!result.ok || !result.data) {
      setError(result.error ?? "Errore di validazione");
      setResolved(null);
      return;
    }
    setImportName(result.data.name);
    setImportType(result.data.type);
    setResolved(resolveAiImport(result.data, exercises));
  }

  const needsPicks = useMemo(
    () => resolved?.some((r) => r.needsManualPick || !r.exerciseId) ?? false,
    [resolved],
  );

  function save() {
    if (!resolved) return;
    const built = buildRoutineFromResolved(importName, importType, resolved);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    upsertRoutine(built);
    router.push("/routines");
  }

  return (
    <div className="space-y-4 border-t border-hairline pt-6">
      <h2 className="font-display text-lg font-bold">Import da Claude (AI)</h2>
      <p className="text-sm text-muted">
        Copia il prompt, chiedi a Claude una routine, poi incolla il JSON qui.
        I nomi vengono abbinati al catalogo con fuzzy matching.
      </p>
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
      <Button type="button" onClick={validateAndMatch} disabled={loading || !raw.trim()}>
        Valida e abbina
      </Button>
      {error && <p className="text-sm text-accent">{error}</p>}

      {resolved && (
        <div className="space-y-3">
          <p className="text-sm">
            Routine: <strong>{importName}</strong> · tipo {importType}
          </p>
          <ul className="divide-y divide-hairline">
            {resolved.map((item, idx) => (
              <li key={`${item.importedName}-${idx}`} className="space-y-2 py-3">
                <div className="text-sm">
                  Importato: <span className="font-mono">{item.importedName}</span>
                </div>
                {item.exerciseId && !item.needsManualPick ? (
                  <div className="text-sm text-muted">
                    Abbinato: {item.exerciseName}
                  </div>
                ) : (
                  <div>
                    <Label>Scegli esercizio</Label>
                    <Select
                      value={item.exerciseId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        const pick =
                          item.suggestions.find((s) => s.id === id) ??
                          exercises.find((s) => s.id === id);
                        setResolved((prev) =>
                          prev
                            ? prev.map((r, i) =>
                                i === idx
                                  ? {
                                      ...r,
                                      exerciseId: pick?.id,
                                      exerciseName: pick?.name,
                                      needsManualPick: !pick,
                                    }
                                  : r,
                              )
                            : prev,
                        );
                      }}
                    >
                      <option value="">— seleziona —</option>
                      {item.suggestions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Button type="button" onClick={save} disabled={needsPicks}>
            Crea routine
          </Button>
        </div>
      )}
    </div>
  );
}
