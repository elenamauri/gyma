"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { exerciseProgressSeries } from "@/lib/pr";
import { displayWeight, formatWeight } from "@/lib/units";
import { uid } from "@/lib/storage";
import {
  Button,
  EmptyState,
  Input,
  Label,
  Mono,
  Select,
} from "@/components/ui/primitives";
import { Sparkline } from "@/components/progress/Sparkline";

export function ProgressPage() {
  const { sessions, bodyweightLog, setBodyweightLog, settings } = useAppStore();
  const [exerciseId, setExerciseId] = useState("");
  const [bw, setBw] = useState("");
  const [bwNote, setBwNote] = useState("");

  const exerciseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      if (s.status !== "completed") continue;
      for (const ex of s.exercises) {
        map.set(ex.exerciseId, ex.exerciseName);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [sessions]);

  const selectedId = exerciseId || exerciseOptions[0]?.[0] || "";
  const series = useMemo(
    () => (selectedId ? exerciseProgressSeries(sessions, selectedId) : []),
    [sessions, selectedId],
  );

  const bwSorted = useMemo(
    () =>
      [...bodyweightLog].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [bodyweightLog],
  );

  function addBodyweight() {
    const displayed = Number(bw);
    if (!displayed || Number.isNaN(displayed)) return;
    const stored =
      settings.unit === "kg"
        ? displayed
        : displayed / 2.2046226218;
    const entry = {
      id: uid(),
      weight: stored,
      date: new Date().toISOString(),
      note: bwNote || undefined,
    };
    setBodyweightLog([entry, ...bodyweightLog]);
    setBw("");
    setBwNote("");
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 font-display text-lg font-bold border-b border-hairline pb-2">
          Progressione esercizio
        </h2>
        {exerciseOptions.length === 0 ? (
          <EmptyState
            title="Nessun dato ancora"
            description="Completa alcune sessioni per vedere i grafici di progressione."
          />
        ) : (
          <>
            <Label htmlFor="ex-select">Esercizio</Label>
            <Select
              id="ex-select"
              value={selectedId}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              {exerciseOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
            {series.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Nessun punto dati.</p>
            ) : (
              <div className="mt-6 space-y-6">
                <Sparkline
                  label={`Peso max (${settings.unit})`}
                  points={series.map((p) => ({
                    date: p.date,
                    value: displayWeight(p.maxWeight, settings.unit) ?? 0,
                  }))}
                  unit={settings.unit}
                />
                <Sparkline
                  label={`Volume (${settings.unit})`}
                  points={series.map((p) => ({
                    date: p.date,
                    value: displayWeight(p.volume, settings.unit) ?? 0,
                  }))}
                  unit={settings.unit}
                />
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-xs uppercase text-muted">
                      <th className="py-2 font-normal">Data</th>
                      <th className="py-2 font-normal">Max</th>
                      <th className="py-2 font-normal">Vol</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {[...series].reverse().slice(0, 12).map((p) => (
                      <tr key={p.date} className="border-b border-hairline">
                        <td className="py-3">
                          {new Date(p.date).toLocaleDateString("it-IT", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </td>
                        <td className="py-3">
                          {formatWeight(
                            displayWeight(p.maxWeight, settings.unit),
                            settings.unit,
                          )}
                        </td>
                        <td className="py-3">
                          {formatWeight(
                            displayWeight(p.volume, settings.unit),
                            settings.unit,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold border-b border-hairline pb-2">
          Peso corporeo
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="bw">Peso ({settings.unit})</Label>
            <Input
              id="bw"
              type="number"
              inputMode="decimal"
              step="any"
              value={bw}
              onChange={(e) => setBw(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bw-note">Nota</Label>
            <Input
              id="bw-note"
              value={bwNote}
              onChange={(e) => setBwNote(e.target.value)}
              placeholder="opzionale"
            />
          </div>
        </div>
        <Button type="button" className="mt-3" onClick={addBodyweight}>
          Registra peso
        </Button>

        {bwSorted.length > 0 && (
          <div className="mt-6 space-y-4">
            <Sparkline
              label={`Peso (${settings.unit})`}
              points={bwSorted.map((e) => ({
                date: e.date,
                value: displayWeight(e.weight, settings.unit) ?? 0,
              }))}
              unit={settings.unit}
            />
            <ul className="divide-y divide-hairline">
              {[...bwSorted].reverse().map((e) => (
                <li
                  key={e.id}
                  className="flex items-baseline justify-between py-2 text-sm"
                >
                  <span className="text-muted">
                    {new Date(e.date).toLocaleDateString("it-IT")}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                  <Mono>
                    {formatWeight(
                      displayWeight(e.weight, settings.unit),
                      settings.unit,
                    )}{" "}
                    {settings.unit}
                  </Mono>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
