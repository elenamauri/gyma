"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { exerciseVolume } from "@/lib/pr";
import { displayWeight, formatWeight } from "@/lib/units";
import { computeStreak, toDateKey } from "@/lib/utils";
import { AccountPanel } from "@/components/settings/AccountPanel";
import { CalendarStreak } from "@/components/history/CalendarStreak";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";

export function UserProfilePage() {
  const { ready: authReady, user } = useAuth();
  const { ready, sessions, routines, settings, bodyweightLog } = useAppStore();

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

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {displayName ?? "Il tuo profilo"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {user?.email ?? "Dati locali su questo dispositivo"}
        </p>
      </section>

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
          <Link href="/history" className="text-sm text-muted hover:text-ink">
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
        <div className="flex items-end justify-between border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">Progressi</h2>
          <Link href="/progress" className="text-sm text-muted hover:text-ink">
            Grafici
          </Link>
        </div>
        <p className="text-sm text-muted">
          Carichi, volume e peso corporeo nella sezione progressi.
        </p>
      </section>

      <AccountPanel />
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
