"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { displayWeight, formatWeight } from "@/lib/units";
import { uid } from "@/lib/storage";
import {
  Button,
  Input,
  Label,
  Mono,
} from "@/components/ui/primitives";
import { Sparkline } from "@/components/progress/Sparkline";
import { ExerciseProgressPanel } from "@/components/progress/ExerciseProgressPanel";

export function ProgressPage() {
  const { sessions, bodyweightLog, setBodyweightLog, settings } = useAppStore();
  const [bw, setBw] = useState("");
  const [bwNote, setBwNote] = useState("");

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
      settings.unit === "kg" ? displayed : displayed / 2.2046226218;
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
      <section className="space-y-3">
        <h2 className="mb-3 font-display text-lg font-bold border-b border-hairline pb-2">
          Progressione esercizio
        </h2>
        <ExerciseProgressPanel sessions={sessions} unit={settings.unit} />
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
