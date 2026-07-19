"use client";

import { useMemo, useState } from "react";
import type { Session, WeightUnit } from "@/lib/types";
import {
  collectAllPRs,
  exerciseProgressSeries,
  exerciseRecords,
} from "@/lib/pr";
import { displayWeight, formatWeight, formatWeightWithUnit } from "@/lib/units";
import {
  EmptyState,
  Label,
  Mono,
  Select,
} from "@/components/ui/primitives";
import { Sparkline } from "@/components/progress/Sparkline";

export function ExerciseProgressPanel({
  sessions,
  unit,
  lockedExerciseId,
}: {
  sessions: Session[];
  unit: WeightUnit;
  /** When set, skip the exercise picker and show only this exercise. */
  lockedExerciseId?: string;
}) {
  const [exerciseId, setExerciseId] = useState("");

  const exerciseOptions = useMemo(() => {
    const map = new Map<string, { name: string; sessions: number }>();
    for (const s of sessions) {
      if (s.status !== "completed") continue;
      for (const ex of s.exercises) {
        const cur = map.get(ex.exerciseId) ?? {
          name: ex.exerciseName,
          sessions: 0,
        };
        cur.sessions += 1;
        map.set(ex.exerciseId, cur);
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, sessions: v.sessions }))
      .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
  }, [sessions]);

  const selectedId =
    lockedExerciseId || exerciseId || exerciseOptions[0]?.id || "";
  const selectedName =
    exerciseOptions.find((e) => e.id === selectedId)?.name ?? "";

  const series = useMemo(
    () => (selectedId ? exerciseProgressSeries(sessions, selectedId) : []),
    [sessions, selectedId],
  );

  const records = useMemo(
    () =>
      selectedId
        ? exerciseRecords(sessions, selectedId)
        : { maxWeight: 0, maxVolume: 0, maxSets: 0 },
    [sessions, selectedId],
  );

  const exercisePrs = useMemo(() => {
    if (!selectedId) return [];
    return collectAllPRs(sessions).filter((p) => p.exerciseId === selectedId);
  }, [sessions, selectedId]);

  if (exerciseOptions.length === 0) {
    return (
      <EmptyState
        title="Nessun progresso ancora"
        description="Completa alcune sessioni per vedere grafici e record per esercizio."
      />
    );
  }

  return (
    <div className="space-y-6">
      {!lockedExerciseId && (
        <div>
          <Label htmlFor="user-ex-select">Esercizio</Label>
          <Select
            id="user-ex-select"
            value={selectedId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            {exerciseOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.sessions})
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Lifetime records */}
      <div className="grid grid-cols-3 gap-px border border-hairline bg-hairline">
        <RecordTile
          label="Max carico"
          value={
            records.maxWeight > 0
              ? formatWeightWithUnit(displayWeight(records.maxWeight, unit), unit)
              : "—"
          }
          accent
        />
        <RecordTile
          label="Max volume"
          value={
            records.maxVolume > 0
              ? formatWeightWithUnit(displayWeight(records.maxVolume, unit), unit)
              : "—"
          }
        />
        <RecordTile
          label="Max serie"
          value={records.maxSets > 0 ? String(records.maxSets) : "—"}
        />
      </div>

      {series.length === 0 ? (
        <p className="text-sm text-muted">Nessun punto dati per {selectedName}.</p>
      ) : (
        <div className="space-y-5">
          <Sparkline
            label={`Peso max (${unit})`}
            points={series.map((p) => ({
              date: p.date,
              value: displayWeight(p.maxWeight, unit) ?? 0,
            }))}
            unit={unit}
          />
          <Sparkline
            label={`Volume (${unit})`}
            points={series.map((p) => ({
              date: p.date,
              value: displayWeight(p.volume, unit) ?? 0,
            }))}
            unit={unit}
          />
          <Sparkline
            label="Serie completate"
            points={series.map((p) => ({
              date: p.date,
              value: p.sets,
            }))}
            formatValue={(v) => `${Math.round(v)}`}
          />
          <Sparkline
            label="Ripetizioni"
            points={series.map((p) => ({
              date: p.date,
              value: p.reps,
            }))}
            formatValue={(v) => `${Math.round(v)}`}
          />

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs uppercase text-muted">
                <th className="py-2 font-normal">Data</th>
                <th className="py-2 font-normal">Max</th>
                <th className="py-2 font-normal">Vol</th>
                <th className="py-2 font-normal">Serie</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {[...series].reverse().slice(0, 16).map((p) => (
                <tr key={p.date} className="border-b border-hairline">
                  <td className="py-3">
                    {new Date(p.date).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="py-3">
                    {formatWeight(displayWeight(p.maxWeight, unit), unit)}
                  </td>
                  <td className="py-3">
                    {formatWeight(displayWeight(p.volume, unit), unit)}
                  </td>
                  <td className="py-3">{p.sets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {exercisePrs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-accent">
            Record su {selectedName}
          </h3>
          <ul className="divide-y divide-hairline">
            {exercisePrs.slice(0, 8).map((pr, i) => (
              <li
                key={`${pr.sessionId}-${pr.kind}-${i}`}
                className="flex items-baseline justify-between gap-3 py-2 text-sm"
              >
                <span>
                  <span className="text-accent">PR</span>{" "}
                  {pr.kind === "weight" ? "carico" : "volume"}
                  <span className="text-muted">
                    {" "}
                    ·{" "}
                    {new Date(pr.achievedAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </span>
                <Mono>
                  {formatWeightWithUnit(displayWeight(pr.value, unit), unit)}
                </Mono>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AllRecordsList({
  sessions,
  unit,
  limit = 12,
}: {
  sessions: Session[];
  unit: WeightUnit;
  limit?: number;
}) {
  const prs = useMemo(() => collectAllPRs(sessions).slice(0, limit), [sessions, limit]);

  if (prs.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nessun record personale ancora. I PR appaiono quando superi un carico o
        un volume precedente.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-hairline">
      {prs.map((pr, i) => (
        <li
          key={`${pr.sessionId}-${pr.exerciseId}-${pr.kind}-${i}`}
          className="flex items-baseline justify-between gap-3 py-3 text-sm"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              <span className="text-accent">PR</span> {pr.exerciseName}
            </div>
            <div className="text-xs text-muted">
              {pr.kind === "weight" ? "Carico" : "Volume"} ·{" "}
              {new Date(pr.achievedAt).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {pr.previousValue !== undefined && (
                <>
                  {" "}
                  · era{" "}
                  {formatWeightWithUnit(
                    displayWeight(pr.previousValue, unit),
                    unit,
                  )}
                </>
              )}
            </div>
          </div>
          <Mono className="shrink-0 text-accent">
            {formatWeightWithUnit(displayWeight(pr.value, unit), unit)}
          </Mono>
        </li>
      ))}
    </ul>
  );
}

function RecordTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-chalk px-2 py-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <Mono className={`mt-1 text-sm ${accent ? "text-accent" : ""}`}>
        {value}
      </Mono>
    </div>
  );
}
