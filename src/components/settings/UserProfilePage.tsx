"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import {
  collectAllPRs,
  exerciseProgressSeries,
  exerciseRecords,
  exerciseVolume,
} from "@/lib/pr";
import { displayWeight, formatWeight, formatWeightWithUnit } from "@/lib/units";
import { computeStreak, toDateKey } from "@/lib/utils";
import { AccountPanel } from "@/components/settings/AccountPanel";
import { CalendarStreak } from "@/components/history/CalendarStreak";
import {
  AllRecordsList,
  ExerciseProgressPanel,
} from "@/components/progress/ExerciseProgressPanel";
import { Button, EmptyState, Input, Mono } from "@/components/ui/primitives";

type UserTab = "overview" | "exercises";

export function UserProfilePage() {
  const { ready: authReady, user } = useAuth();
  const { ready, sessions, routines, settings, bodyweightLog } = useAppStore();
  const [tab, setTab] = useState<UserTab>("overview");

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

  const totalVolume = useMemo(() => {
    let v = 0;
    for (const s of completed) {
      for (const ex of s.exercises) v += exerciseVolume(ex);
    }
    return displayWeight(v, settings.unit) ?? 0;
  }, [completed, settings.unit]);

  const totalSets = useMemo(() => {
    let n = 0;
    for (const s of completed) {
      for (const ex of s.exercises) {
        n += ex.sets.filter((set) => set.completed).length;
      }
    }
    return n;
  }, [completed]);

  const prCount = useMemo(
    () => completed.reduce((sum, s) => sum + (s.prs?.length ?? 0), 0),
    [completed],
  );

  const latestBw = useMemo(() => {
    if (bodyweightLog.length === 0) return null;
    return [...bodyweightLog].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
  }, [bodyweightLog]);

  const displayName =
    settings.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    null;

  if (!ready || !authReady) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Accedi
          </h1>
          <p className="mt-1 text-sm text-muted">
            Accedi per sincronizzare i tuoi allenamenti e vedere il profilo.
          </p>
        </section>
        <AccountPanel loginOnly />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {displayName ?? "Il tuo profilo"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {user.email}
        </p>
      </section>

      <div
        role="tablist"
        aria-label="Sezioni utente"
        className="grid grid-cols-2 border-b border-hairline"
      >
        <TabButton
          active={tab === "overview"}
          onClick={() => setTab("overview")}
        >
          Panoramica
        </TabButton>
        <TabButton
          active={tab === "exercises"}
          onClick={() => setTab("exercises")}
        >
          Esercizi
        </TabButton>
      </div>

      {tab === "overview" ? (
        <div className="space-y-8">
          <section className="grid grid-cols-3 gap-3 border-y border-hairline py-4">
            <Stat label="Streak" value={String(streak)} accent />
            <Stat label="Sessioni" value={String(completed.length)} />
            <Stat label="Routine" value={String(routines.length)} />
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">
                Volume totale
              </div>
              <Mono className="text-xl">
                {formatWeight(totalVolume, settings.unit)} {settings.unit}
              </Mono>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">
                Serie fatte
              </div>
              <Mono className="text-xl">{totalSets}</Mono>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">PR</div>
              <Mono className="text-xl text-accent">{prCount}</Mono>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">
                Peso corporeo
              </div>
              <Mono className="text-xl">
                {latestBw
                  ? `${formatWeight(
                      displayWeight(latestBw.weight, settings.unit),
                      settings.unit,
                    )} ${settings.unit}`
                  : "—"}
              </Mono>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-end justify-between border-b border-hairline pb-2">
              <h2 className="font-display text-lg font-bold">Storico</h2>
              <Link
                href="/history"
                className="text-sm text-muted hover:text-ink"
              >
                Vedi tutto
              </Link>
            </div>
            <CalendarStreak dateKeys={dateKeys} />
            {completed.length === 0 ? (
              <EmptyState
                title="Nessuna sessione"
                description="Gli allenamenti completati appariranno qui."
                action={
                  <Link href="/routines">
                    <Button type="button">Vai alle routine</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {completed.slice(0, 5).map((s) => (
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
                          })}{" "}
                          · {s.exercises.length} esercizi
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

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
              Ultimi record
            </h2>
            <AllRecordsList
              sessions={sessions}
              unit={settings.unit}
              limit={6}
            />
          </section>

          <AccountPanel />
        </div>
      ) : (
        <ExercisesTab />
      )}
    </div>
  );
}

function ExercisesTab() {
  const { sessions, settings } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const unit = settings.unit;

  const exerciseRows = useMemo(() => {
    const allPrs = collectAllPRs(sessions);
    const prByEx = new Map<string, number>();
    for (const p of allPrs) {
      prByEx.set(p.exerciseId, (prByEx.get(p.exerciseId) ?? 0) + 1);
    }

    const map = new Map<
      string,
      { name: string; sessions: number; lastDate: string }
    >();
    for (const s of sessions) {
      if (s.status !== "completed" || !s.completedAt) continue;
      for (const ex of s.exercises) {
        const cur = map.get(ex.exerciseId) ?? {
          name: ex.exerciseName,
          sessions: 0,
          lastDate: s.completedAt,
        };
        cur.sessions += 1;
        if (s.completedAt > cur.lastDate) cur.lastDate = s.completedAt;
        map.set(ex.exerciseId, cur);
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => {
        const series = exerciseProgressSeries(sessions, id);
        const records = exerciseRecords(sessions, id);
        const first = series[0];
        const last = series[series.length - 1];
        const deltaKg =
          first && last
            ? (displayWeight(last.maxWeight, unit) ?? 0) -
              (displayWeight(first.maxWeight, unit) ?? 0)
            : 0;
        return {
          id,
          name: v.name,
          sessions: v.sessions,
          lastDate: v.lastDate,
          maxWeight: records.maxWeight,
          deltaKg,
          prCount: prByEx.get(id) ?? 0,
        };
      })
      .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
  }, [sessions, unit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exerciseRows;
    return exerciseRows.filter((e) => e.name.toLowerCase().includes(q));
  }, [exerciseRows, query]);

  if (selectedId) {
    const name = exerciseRows.find((e) => e.id === selectedId)?.name;
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm text-muted touch-manipulation hover:text-ink"
          onClick={() => setSelectedId(null)}
        >
          ← Tutti gli esercizi
        </button>
        {name && (
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {name}
          </h2>
        )}
        <ExerciseProgressPanel
          sessions={sessions}
          unit={unit}
          lockedExerciseId={selectedId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {exerciseRows.length} esercizi con storico. Apri uno per grafici e
        record.
      </p>
      <Input
        placeholder="Cerca esercizio…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Nessun esercizio"
          description="Completa allenamenti per costruire lo storico per esercizio."
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setSelectedId(e.id)}
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left touch-manipulation hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.name}</div>
                  <div className="text-xs text-muted">
                    {e.sessions} sessioni
                    {e.maxWeight > 0 && (
                      <>
                        {" "}
                        · max{" "}
                        {formatWeightWithUnit(
                          displayWeight(e.maxWeight, unit),
                          unit,
                        )}
                      </>
                    )}
                    {e.prCount > 0 && (
                      <span className="text-accent"> · {e.prCount} PR</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {e.deltaKg !== 0 && (
                    <Mono
                      className={`text-sm ${
                        e.deltaKg > 0 ? "text-accent" : "text-muted"
                      }`}
                    >
                      {e.deltaKg > 0 ? "+" : ""}
                      {formatWeight(e.deltaKg, unit)} {unit}
                    </Mono>
                  )}
                  <div className="text-muted" aria-hidden>
                    →
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 border-b-2 text-sm font-medium uppercase tracking-wide touch-manipulation ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
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
