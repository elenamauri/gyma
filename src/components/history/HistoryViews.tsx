"use client";

import { useMemo } from "react";
import type { Session } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/storage";
import { computeStreak, toDateKey } from "@/lib/utils";
import { formatWeightWithUnit } from "@/lib/units";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function HistoryPage() {
  const router = useRouter();
  const { sessions, upsertSession } = useAppStore();
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

  function repeatSession(session: Session) {
    const copy: Session = {
      id: uid(),
      routineId: session.routineId,
      routineName: session.routineName
        ? `${session.routineName} (ripetuta)`
        : "Sessione ripetuta",
      type: session.type,
      status: "active",
      notes: session.notes,
      startedAt: new Date().toISOString(),
      exercises: session.exercises.map((ex) => ({
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 border-y border-hairline py-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Streak</div>
          <Mono className="text-3xl text-accent">{streak}</Mono>
          <div className="text-xs text-muted">giorni consecutivi</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Sessioni</div>
          <Mono className="text-3xl">{completed.length}</Mono>
          <div className="text-xs text-muted">completate</div>
        </div>
      </div>

      <CalendarStreak dateKeys={dateKeys} />

      {completed.length === 0 ? (
        <EmptyState
          title="Nessuna sessione ancora"
          description="Completa il tuo primo allenamento per vedere lo storico qui."
          action={
            <Link href="/routines">
              <Button type="button">Vai alle routine</Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {completed.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 py-4">
              <Link
                href={`/history/${s.id}`}
                className="min-w-0 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="font-medium">
                  {s.routineName ?? "Sessione"}
                  {s.prs && s.prs.length > 0 && (
                    <span className="ml-2 text-xs text-accent">PR</span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {new Date(s.completedAt ?? s.startedAt).toLocaleString("it-IT")} ·{" "}
                  {s.exercises.length} esercizi · {s.type}
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => repeatSession(s)}
              >
                Ripeti
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CalendarStreak({ dateKeys }: { dateKeys: string[] }) {
  const set = useMemo(() => new Set(dateKeys), [dateKeys]);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const startPad = (firstDow + 6) % 7; // Monday-first

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }

  const monthLabel = now.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-bold capitalize">{monthLabel}</h2>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const active = c.key ? set.has(c.key) : false;
          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center font-mono text-xs ${
                active
                  ? "bg-accent text-chalk"
                  : c.day
                    ? "text-ink"
                    : ""
              }`}
            >
              {c.day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { sessions, upsertSession, settings } = useAppStore();
  const session = sessions.find((s) => s.id === sessionId);

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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/history" className="text-sm text-muted hover:text-ink">
          ← Storico
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold">
          {session.routineName ?? "Sessione"}
        </h1>
        <p className="text-sm text-muted">
          {new Date(session.completedAt ?? session.startedAt).toLocaleString("it-IT")}
        </p>
      </div>

      {session.prs && session.prs.length > 0 && (
        <div className="border border-accent/40 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-accent">Record personali</div>
          <ul className="mt-2 space-y-1">
            {session.prs.map((pr, i) => (
              <li key={i} className="text-sm">
                <span className="text-accent">PR</span> {pr.exerciseName} — {pr.kind}{" "}
                <Mono>
                  {formatWeightWithUnit(pr.value, settings.unit)}
                </Mono>
                {pr.previousValue !== undefined && (
                  <span className="text-muted">
                    {" "}
                    (era {formatWeightWithUnit(pr.previousValue, settings.unit)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {session.notes && (
        <p className="text-sm text-muted">Note: {session.notes}</p>
      )}

      <ul className="divide-y divide-hairline">
        {session.exercises.map((ex) => (
          <li key={ex.id} className="py-4">
            <div className="font-medium">{ex.exerciseName}</div>
            {ex.notes && <p className="text-xs text-muted">{ex.notes}</p>}
            <ul className="mt-2 space-y-1 font-mono text-sm tabular-nums">
              {ex.sets
                .filter((s) => s.completed)
                .map((s, i) => (
                  <li key={s.id} className="text-muted">
                    {i + 1}. {s.reps} ×{" "}
                    {s.weight !== undefined
                      ? formatWeightWithUnit(s.weight, settings.unit)
                      : "bw"}
                    {s.rpe !== undefined ? ` · RPE ${s.rpe}` : ""}
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>

      <Button type="button" onClick={repeat}>
        Ripeti questa sessione
      </Button>
    </div>
  );
}
