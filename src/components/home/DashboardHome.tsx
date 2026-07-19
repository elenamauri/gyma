"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  createEmptySession,
  createSessionFromRoutine,
  getActiveSessionId,
} from "@/components/session/LiveSession";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";
import { CalendarStreak } from "@/components/history/CalendarStreak";
import {
  Sparkline,
  WeeklyVolumeBars,
} from "@/components/progress/Sparkline";
import { exerciseProgressSeries, exerciseVolume } from "@/lib/pr";
import { displayWeight } from "@/lib/units";
import { computeStreak, toDateKey } from "@/lib/utils";

export function DashboardHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { ready, routines, sessions, settings, bodyweightLog, upsertSession } =
    useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    setActiveId(getActiveSessionId());
  }, [sessions]);

  const completed = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? b.startedAt).getTime() -
            new Date(a.completedAt ?? a.startedAt).getTime(),
        ),
    [sessions],
  );

  const dateKeys = completed.map((s) =>
    toDateKey(s.completedAt ?? s.startedAt),
  );
  const streak = computeStreak(dateKeys);

  const hasActive =
    !!activeId &&
    sessions.some((s) => s.id === activeId && s.status === "active");

  const greetingName = useMemo(() => {
    const custom = settings.displayName?.trim();
    if (custom) return custom;
    const email = user?.email?.split("@")[0]?.trim();
    if (email) return email;
    return null;
  }, [settings.displayName, user?.email]);

  const topExercise = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>();
    for (const s of completed) {
      for (const ex of s.exercises) {
        const cur = counts.get(ex.exerciseId) ?? {
          name: ex.exerciseName,
          n: 0,
        };
        cur.n += 1;
        counts.set(ex.exerciseId, cur);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0] ?? null;
  }, [completed]);

  const series = useMemo(
    () =>
      topExercise ? exerciseProgressSeries(sessions, topExercise[0]) : [],
    [sessions, topExercise],
  );

  const weeklyVolume = useMemo(() => {
    const weeks: Array<{ label: string; volume: number; start: Date }> = [];
    const now = new Date();
    // Monday of current week
    const day = (now.getDay() + 6) % 7;
    const thisMonday = new Date(now);
    thisMonday.setHours(0, 0, 0, 0);
    thisMonday.setDate(now.getDate() - day);

    for (let i = 7; i >= 0; i--) {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      let volume = 0;
      for (const s of completed) {
        const t = new Date(s.completedAt ?? s.startedAt).getTime();
        if (t >= start.getTime() && t < end.getTime()) {
          for (const ex of s.exercises) volume += exerciseVolume(ex);
        }
      }
      weeks.push({
        label: start.toLocaleDateString("it-IT", {
          day: "numeric",
          month: "short",
        }),
        volume: displayWeight(volume, settings.unit) ?? 0,
        start,
      });
    }
    return weeks;
  }, [completed, settings.unit]);

  const bwSorted = useMemo(
    () =>
      [...bodyweightLog].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [bodyweightLog],
  );

  function startRoutine(routineId: string) {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const session = createSessionFromRoutine(routine);
    upsertSession(session);
    setStartOpen(false);
    router.push(`/session/live?id=${session.id}`);
  }

  function startEmpty() {
    const session = createEmptySession();
    upsertSession(session);
    setStartOpen(false);
    router.push(`/session/live?id=${session.id}`);
  }

  function onFabClick() {
    if (hasActive) {
      router.push(`/session/live?id=${activeId}`);
      return;
    }
    setStartOpen(true);
  }

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  return (
    <div className="space-y-8 pb-24">
      <section>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Ciao{greetingName ? ` ${greetingName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">Allenati, tieni traccia, ripeti.</p>
      </section>

      <section className="grid grid-cols-3 gap-3 border-y border-hairline py-4">
        <Stat label="Streak" value={String(streak)} accent />
        <Stat label="Sessioni" value={String(completed.length)} />
        <Stat label="Routine" value={String(routines.length)} />
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">Calendario</h2>
          <Link href="/history" className="text-sm text-muted hover:text-ink">
            Storico
          </Link>
        </div>
        <CalendarStreak dateKeys={dateKeys} />
        {completed.length > 0 && (
          <ul className="divide-y divide-hairline">
            {completed.slice(0, 3).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/history/${s.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {s.routineName ?? "Sessione"}
                      {s.prs && s.prs.length > 0 && (
                        <span className="ml-2 text-xs text-accent">PR</span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(
                        s.completedAt ?? s.startedAt,
                      ).toLocaleDateString("it-IT", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <span className="text-muted" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">Progressi</h2>
          <Link href="/progress" className="text-sm text-muted hover:text-ink">
            Tutti
          </Link>
        </div>

        {completed.length === 0 ? (
          <EmptyState
            title="Nessun dato ancora"
            description="Completa un allenamento per vedere i grafici."
          />
        ) : (
          <>
            <WeeklyVolumeBars weeks={weeklyVolume} unit={settings.unit} />
            {topExercise && series.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  {topExercise[1].name} — esercizio più frequente
                </p>
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
              </div>
            )}
            {bwSorted.length > 0 && (
              <Sparkline
                label={`Peso corporeo (${settings.unit})`}
                points={bwSorted.map((e) => ({
                  date: e.date,
                  value: displayWeight(e.weight, settings.unit) ?? 0,
                }))}
                unit={settings.unit}
              />
            )}
          </>
        )}
      </section>

      {/* Sticky FAB */}
      <button
        type="button"
        onClick={onFabClick}
        className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-4 z-50 flex min-h-12 max-w-[calc(100%-2rem)] items-center gap-2 bg-accent px-5 py-3 font-display text-sm font-bold tracking-tight text-chalk shadow-lg touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-90 sm:right-[max(1rem,calc(50%-16rem+1rem))]"
        aria-label={hasActive ? "Riprendi allenamento" : "Inizia allenamento"}
      >
        {hasActive ? "Riprendi" : "Inizia allenamento"}
      </button>

      {startOpen && (
        <StartWorkoutSheet
          routines={routines}
          onClose={() => setStartOpen(false)}
          onFree={startEmpty}
          onRoutine={startRoutine}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <Mono className={`text-2xl ${accent ? "text-accent" : ""}`}>{value}</Mono>
    </div>
  );
}

function StartWorkoutSheet({
  routines,
  onClose,
  onFree,
  onRoutine,
}: {
  routines: Array<{
    id: string;
    name: string;
    type: string;
    exercises: unknown[];
  }>;
  onClose: () => void;
  onFree: () => void;
  onRoutine: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Chiudi"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-workout-title"
        className="relative mx-auto w-full max-w-lg border-t border-hairline bg-chalk px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="start-workout-title"
            className="font-display text-xl font-bold"
          >
            Inizia allenamento
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-muted touch-manipulation"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        <Button
          type="button"
          variant="accent"
          className="w-full"
          onClick={onFree}
        >
          Sessione libera
        </Button>

        <div className="mt-6">
          <div className="mb-2 flex items-end justify-between">
            <h3 className="text-xs uppercase tracking-wide text-muted">
              Oppure una routine
            </h3>
            <Link
              href="/routines"
              className="text-xs text-muted hover:text-ink"
              onClick={onClose}
            >
              Tutte
            </Link>
          </div>
          {routines.length === 0 ? (
            <EmptyState
              title="Nessuna routine"
              description="Crea una routine per avviarla da qui."
              action={
                <Link href="/routines/new" onClick={onClose}>
                  <Button type="button">Crea routine</Button>
                </Link>
              }
            />
          ) : (
            <ul className="max-h-64 divide-y divide-hairline overflow-y-auto">
              {routines.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onRoutine(r.id)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left touch-manipulation hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="text-xs text-muted">
                        {r.type === "reps" ? "Serie/reps" : "A tempo"} ·{" "}
                        {r.exercises.length} esercizi
                      </div>
                    </div>
                    <span className="text-sm text-accent">Avvia</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
