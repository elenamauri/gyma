"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session, SessionExercise, WeightUnit } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/storage";
import {
  exerciseMaxWeight,
  exerciseVolume,
} from "@/lib/pr";
import {
  displayWeight,
  formatWeight,
  formatWeightWithUnit,
} from "@/lib/units";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";
import { MuscleMap } from "@/components/exercises/MuscleMap";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";

function sessionDurationSec(session: Session): number {
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.completedAt ?? session.startedAt).getTime();
  return Math.max(0, Math.round((end - start) / 1000));
}

function formatLongDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${rem.toString().padStart(2, "0")}s`;
  return `${rem}s`;
}

function avgRpe(session: Session): number | null {
  const values: number[] = [];
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      if (set.completed && set.rpe !== undefined) values.push(set.rpe);
    }
  }
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function intensityLabel(rpe: number | null, volumePerMin: number): string {
  if (rpe !== null) {
    if (rpe >= 9) return "Molto alta";
    if (rpe >= 7.5) return "Alta";
    if (rpe >= 6) return "Media";
    if (rpe >= 4) return "Moderata";
    return "Leggera";
  }
  // Heuristic on kg/min density (rough, unit-agnostic after display conversion)
  if (volumePerMin >= 120) return "Alta";
  if (volumePerMin >= 60) return "Media";
  if (volumePerMin >= 25) return "Moderata";
  return "Leggera";
}

function intensityFill(rpe: number | null, volumePerMin: number): number {
  if (rpe !== null) return Math.min(100, Math.max(8, (rpe / 10) * 100));
  return Math.min(100, Math.max(8, (volumePerMin / 150) * 100));
}

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const justFinished = params.get("done") === "1";
  const { sessions, upsertSession, deleteSession, settings } = useAppStore();
  const { exercises: catalog } = useExerciseCatalog();
  const session = sessions.find((s) => s.id === sessionId);

  const summary = useMemo(() => {
    if (!session) return null;
    let volumeKg = 0;
    let setsDone = 0;
    let repsDone = 0;
    let maxWeightKg = 0;
    const primary: string[] = [];
    const secondary: string[] = [];
    const muscleVolume = new Map<string, number>();

    const exerciseRows = session.exercises.map((ex) => {
      const cat = catalog.find((c) => c.id === ex.exerciseId);
      const primaries =
        ex.primaryMuscles.length > 0
          ? ex.primaryMuscles
          : cat?.primaryMuscles ?? [];
      const secondaries = cat?.secondaryMuscles ?? [];
      primary.push(...primaries);
      secondary.push(...secondaries);

      const completedSets = ex.sets.filter((s) => s.completed);
      const vol = exerciseVolume(ex);
      const maxW = exerciseMaxWeight(ex);
      volumeKg += vol;
      maxWeightKg = Math.max(maxWeightKg, maxW);
      setsDone += completedSets.length;
      for (const s of completedSets) repsDone += s.reps;

      const share = vol || completedSets.length;
      for (const m of primaries) {
        muscleVolume.set(m, (muscleVolume.get(m) ?? 0) + share);
      }

      return {
        ex,
        cat,
        primaries,
        completedSets,
        volume: vol,
        maxWeight: maxW,
      };
    });

    const durationSec = sessionDurationSec(session);
    const durationMin = Math.max(durationSec / 60, 1 / 60);
    const volumeDisplay = displayWeight(volumeKg, settings.unit) ?? 0;
    const volumePerMin = volumeDisplay / durationMin;
    const rpe = avgRpe(session);
    const topMuscles = [...muscleVolume.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);

    return {
      durationSec,
      volumeKg,
      volumeDisplay,
      volumePerMin,
      setsDone,
      repsDone,
      maxWeightKg,
      rpe,
      primary: [...new Set(primary)],
      secondary: [...new Set(secondary)],
      topMuscles,
      exerciseRows,
      intensity: intensityLabel(rpe, volumePerMin),
      intensityPct: intensityFill(rpe, volumePerMin),
    };
  }, [session, catalog, settings.unit]);

  if (!session) {
    return (
      <EmptyState
        title="Sessione non trovata"
        description="Potrebbe essere stata eliminata."
        action={
          <Link href="/history">
            <Button>Torna allo storico</Button>
          </Link>
        }
      />
    );
  }

  if (!summary) return null;

  function repeat() {
    const copy: Session = {
      ...session!,
      id: uid(),
      status: "active",
      completedAt: undefined,
      prs: undefined,
      startedAt: new Date().toISOString(),
      exercises: session!.exercises.map((ex) => ({
        ...ex,
        id: uid(),
        sets: ex.sets.map((s) => ({
          ...s,
          id: uid(),
          completed: false,
          completedAt: undefined,
        })),
      })),
    };
    upsertSession(copy);
    router.push(`/session/live?id=${copy.id}`);
  }

  function remove() {
    const label = session!.routineName ?? "questa sessione";
    if (
      !confirm(
        `Eliminare “${label}”? I dati di volume e PR di questa sessione spariranno dallo storico.`,
      )
    ) {
      return;
    }
    deleteSession(session!.id);
    router.replace("/history");
  }

  const unit = settings.unit;

  return (
    <div className="space-y-8 pb-8">
      <section className="space-y-2">
        {justFinished ? (
          <p className="text-xs uppercase tracking-wide text-accent">
            Allenamento completato
          </p>
        ) : (
          <Link href="/history" className="text-sm text-muted hover:text-ink">
            ← Storico
          </Link>
        )}
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {session.routineName ?? "Sessione"}
        </h1>
        <p className="text-sm text-muted">
          {new Date(session.completedAt ?? session.startedAt).toLocaleString(
            "it-IT",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            },
          )}
        </p>
      </section>

      {/* Hero metrics */}
      <section className="grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-4">
        <Metric
          label="Durata"
          value={formatLongDuration(summary.durationSec)}
        />
        <Metric
          label={`Volume`}
          value={`${formatWeight(summary.volumeDisplay, unit)} ${unit}`}
          accent
        />
        <Metric label="Serie" value={String(summary.setsDone)} />
        <Metric
          label="Max carico"
          value={
            summary.maxWeightKg > 0
              ? formatWeightWithUnit(
                  displayWeight(summary.maxWeightKg, unit),
                  unit,
                )
              : "—"
          }
        />
      </section>

      {/* Intensity */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">
              Intensità
            </div>
            <div className="font-display text-2xl font-bold">
              {summary.intensity}
            </div>
          </div>
          <div className="text-right text-sm text-muted">
            {summary.rpe !== null ? (
              <>
                RPE medio{" "}
                <Mono className="text-ink">{summary.rpe.toFixed(1)}</Mono>
              </>
            ) : (
              <>
                Densità{" "}
                <Mono className="text-ink">
                  {Math.round(summary.volumePerMin)} {unit}/min
                </Mono>
              </>
            )}
          </div>
        </div>
        <div className="h-2 w-full bg-ink/10">
          <div
            className="h-full bg-accent transition-[width] duration-500"
            style={{ width: `${summary.intensityPct}%` }}
          />
        </div>
        <p className="text-xs text-muted">
          {summary.repsDone} ripetizioni · {session.exercises.length} esercizi
        </p>
      </section>

      {/* Muscles */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
          Muscoli coinvolti
        </h2>
        <div className="flex items-center gap-4">
          <div className="mx-auto w-40 shrink-0 sm:mx-0">
            <MuscleMap
              primaryMuscles={summary.primary}
              secondaryMuscles={summary.secondary}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {summary.topMuscles.length === 0 ? (
              <p className="text-sm text-muted">Nessun muscolo registrato.</p>
            ) : (
              summary.topMuscles.map((m, i) => (
                <div key={m} className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2 w-2 shrink-0 ${
                      i === 0 ? "bg-accent" : "bg-ink/30"
                    }`}
                  />
                  <span className="capitalize">{m}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {session.prs && session.prs.length > 0 && (
        <section className="border border-accent/40 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-accent">
            Record personali
          </div>
          <ul className="mt-2 space-y-1">
            {session.prs.map((pr, i) => (
              <li key={i} className="text-sm">
                <span className="text-accent">PR</span> {pr.exerciseName} —{" "}
                {pr.kind === "weight" ? "carico" : "volume"}{" "}
                <Mono>
                  {formatWeightWithUnit(
                    displayWeight(pr.value, unit),
                    unit,
                  )}
                </Mono>
                {pr.previousValue !== undefined && (
                  <span className="text-muted">
                    {" "}
                    (era{" "}
                    {formatWeightWithUnit(
                      displayWeight(pr.previousValue, unit),
                      unit,
                    )}
                    )
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {session.notes && (
        <p className="text-sm text-muted">Note: {session.notes}</p>
      )}

      {/* Exercises */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
          Esercizi
        </h2>
        <ul className="divide-y divide-hairline">
          {summary.exerciseRows.map(
            ({ ex, cat, completedSets, volume, maxWeight, primaries }) => (
              <ExerciseSummaryRow
                key={ex.id}
                ex={ex}
                imagePath={cat?.images[0]}
                primaryMuscles={primaries}
                secondaryMuscles={cat?.secondaryMuscles ?? []}
                completedSets={completedSets}
                volume={volume}
                maxWeight={maxWeight}
                unit={unit}
              />
            ),
          )}
        </ul>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="accent" className="flex-1" onClick={repeat}>
          Ripeti questa sessione
        </Button>
        <Link href="/" className="contents">
          <Button type="button" variant="ghost" className="w-full flex-1">
            Torna alla home
          </Button>
        </Link>
      </div>

      <Button type="button" variant="danger" className="w-full" onClick={remove}>
        Elimina sessione
      </Button>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-chalk px-3 py-4 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <Mono className={`mt-1 text-lg ${accent ? "text-accent" : ""}`}>
        {value}
      </Mono>
    </div>
  );
}

function ExerciseSummaryRow({
  ex,
  imagePath,
  primaryMuscles,
  secondaryMuscles,
  completedSets,
  volume,
  maxWeight,
  unit,
}: {
  ex: SessionExercise;
  imagePath?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  completedSets: SessionExercise["sets"];
  volume: number;
  maxWeight: number;
  unit: WeightUnit;
}) {
  return (
    <li className="py-4">
      <div className="flex items-start gap-3">
        <ExerciseThumb
          size="sm"
          exerciseId={ex.exerciseId}
          exerciseName={ex.exerciseName}
          imagePath={imagePath}
          primaryMuscles={primaryMuscles}
          secondaryMuscles={secondaryMuscles}
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{ex.exerciseName}</div>
          {primaryMuscles.length > 0 && (
            <div className="mt-0.5 text-xs capitalize text-muted">
              {primaryMuscles.slice(0, 3).join(" · ")}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-muted">Vol </span>
              <Mono>
                {formatWeight(displayWeight(volume, unit), unit)} {unit}
              </Mono>
            </span>
            {maxWeight > 0 && (
              <span>
                <span className="text-muted">Max </span>
                <Mono>
                  {formatWeightWithUnit(displayWeight(maxWeight, unit), unit)}
                </Mono>
              </span>
            )}
            <span className="text-muted">
              {completedSets.length} serie
            </span>
          </div>
          {ex.notes && (
            <p className="mt-1 text-xs text-muted">{ex.notes}</p>
          )}
          {completedSets.length > 0 && (
            <ul className="mt-2 space-y-0.5 font-mono text-xs tabular-nums text-muted">
              {completedSets.map((s, i) => (
                <li key={s.id}>
                  {i + 1}. {s.reps} ×{" "}
                  {s.weight !== undefined
                    ? formatWeightWithUnit(displayWeight(s.weight, unit), unit)
                    : "bw"}
                  {s.rpe !== undefined ? ` · RPE ${s.rpe}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
