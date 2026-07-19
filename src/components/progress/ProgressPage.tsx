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
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Progressi</h1>
        <p className="mt-1 text-sm text-muted">
          Progressione carichi e peso corporeo nel tempo.
        </p>
      </div>

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
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-xs uppercase text-muted">
                      <th className="py-2 font-normal">Data</th>
                      <th className="py-2 font-normal">Max</th>
                      <th className="py-2 font-normal">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {[...series].reverse().map((p) => (
                      <tr key={p.date} className="border-b border-hairline">
                        <td className="py-2">
                          {new Date(p.date).toLocaleDateString("it-IT")}
                        </td>
                        <td className="py-2">
                          {formatWeight(
                            displayWeight(p.maxWeight, settings.unit),
                            settings.unit,
                          )}
                        </td>
                        <td className="py-2">
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

function Sparkline({
  label,
  points,
  unit,
}: {
  label: string;
  points: Array<{ date: string; value: number }>;
  unit: string;
}) {
  const values = points.map((p) => p.value).filter((v) => v > 0);
  if (values.length < 1) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 320;
  const h = 80;
  const pad = 4;

  const coords = points
    .filter((p) => p.value > 0)
    .map((p, i, arr) => {
      const x = pad + (i / Math.max(arr.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - ((p.value - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        <Mono className="text-sm">
          {formatWeight(values[values.length - 1], unit as "kg")} {unit}
        </Mono>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full border border-hairline"
        role="img"
        aria-label={label}
      >
        <polyline
          fill="none"
          stroke="#E1442C"
          strokeWidth="1.5"
          points={coords}
        />
      </svg>
    </div>
  );
}
