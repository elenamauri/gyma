"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  compareSessions,
  formatSideWeight,
} from "@/lib/session-compare";
import { displayWeight, formatWeight } from "@/lib/units";
import { EmptyState, Mono } from "@/components/ui/primitives";

function formatSessionLabel(startedAt: string, name?: string) {
  const d = new Date(startedAt).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
  return name ? `${name} · ${d}` : d;
}

export function SessionCompare() {
  const params = useSearchParams();
  const aId = params.get("a") ?? "";
  const bId = params.get("b") ?? "";
  const { sessions, settings, ready } = useAppStore();
  const unit = settings.unit;

  const a = sessions.find((s) => s.id === aId);
  const b = sessions.find((s) => s.id === bId);

  const comparison = useMemo(() => {
    if (!a || !b) return null;
    return compareSessions(a, b);
  }, [a, b]);

  const candidates = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "completed" && s.id !== aId)
        .sort(
          (x, y) =>
            new Date(y.completedAt ?? y.startedAt).getTime() -
            new Date(x.completedAt ?? x.startedAt).getTime(),
        )
        .slice(0, 40),
    [sessions, aId],
  );

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  if (!a) {
    return (
      <EmptyState
        title="Sessione non trovata"
        description="Scegli una sessione dallo storico per confrontarla."
        action={
          <Link href="/history" className="text-sm text-accent underline">
            Storico
          </Link>
        }
      />
    );
  }

  if (!bId || !b) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted">
            Confronta con:{" "}
            <span className="text-ink">
              {formatSessionLabel(a.completedAt ?? a.startedAt, a.routineName)}
            </span>
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Scegli la seconda sessione
          </h1>
        </div>
        {candidates.length === 0 ? (
          <EmptyState
            title="Nessuna altra sessione"
            description="Completa almeno due allenamenti per confrontarli."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {candidates.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/history/compare?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(s.id)}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {s.routineName ?? "Sessione"}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(
                        s.completedAt ?? s.startedAt,
                      ).toLocaleString("it-IT")}
                    </div>
                  </div>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!comparison) return null;

  const { rows, totals } = comparison;
  const volA = displayWeight(totals.a.volume, unit) ?? 0;
  const volB = displayWeight(totals.b.volume, unit) ?? 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-2 gap-3 border-b border-hairline pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted">A</div>
          <Link
            href={`/history/${a.id}`}
            className="font-medium hover:text-accent"
          >
            {formatSessionLabel(a.completedAt ?? a.startedAt, a.routineName)}
          </Link>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted">B</div>
          <Link
            href={`/history/${b.id}`}
            className="font-medium hover:text-accent"
          >
            {formatSessionLabel(b.completedAt ?? b.startedAt, b.routineName)}
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-3 gap-2 border border-hairline px-3 py-3 text-center">
        <div>
          <div className="text-[10px] uppercase text-muted">Vol. A</div>
          <Mono className="text-sm">
            {formatWeight(volA, unit)} {unit}
          </Mono>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted">Δ</div>
          <Mono
            className={`text-sm ${
              volB - volA > 0
                ? "text-accent"
                : volB - volA < 0
                  ? "text-muted"
                  : ""
            }`}
          >
            {volB - volA > 0 ? "+" : ""}
            {formatWeight(volB - volA, unit)}
          </Mono>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted">Vol. B</div>
          <Mono className="text-sm">
            {formatWeight(volB, unit)} {unit}
          </Mono>
        </div>
      </section>

      <ul className="divide-y divide-hairline">
        {rows.map((row) => {
          const maxA = row.a?.maxWeight;
          const maxB = row.b?.maxWeight;
          const delta =
            maxA !== undefined && maxB !== undefined
              ? (displayWeight(maxB, unit) ?? 0) -
                (displayWeight(maxA, unit) ?? 0)
              : null;
          return (
            <li key={row.exerciseId} className="py-3">
              <div className="mb-2 font-medium">{row.exerciseName}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SideCell
                  stats={row.a}
                  unit={unit}
                  label="A"
                />
                <SideCell
                  stats={row.b}
                  unit={unit}
                  label="B"
                  align="right"
                />
              </div>
              {delta !== null && delta !== 0 && (
                <p className="mt-1 text-xs text-muted">
                  Max carico{" "}
                  <span className={delta > 0 ? "text-accent" : ""}>
                    {delta > 0 ? "+" : ""}
                    {formatWeight(delta, unit)} {unit}
                  </span>{" "}
                  su B
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SideCell({
  stats,
  unit,
  label,
  align = "left",
}: {
  stats: ReturnType<typeof compareSessions>["rows"][0]["a"];
  unit: "kg" | "lb";
  label: string;
  align?: "left" | "right";
}) {
  if (!stats) {
    return (
      <div className={align === "right" ? "text-right text-muted" : "text-muted"}>
        <span className="text-[10px] uppercase">{label}</span>
        <div>—</div>
      </div>
    );
  }
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <span className="text-[10px] uppercase text-muted">{label}</span>
      <div>
        {stats.setsDone} set · {stats.reps} rip.
      </div>
      <div className="text-muted">
        max {formatSideWeight(stats.maxWeight, unit)}
        {stats.maxWeight !== undefined ? ` ${unit}` : ""}
        {stats.avgRpe !== null ? ` · RPE ${stats.avgRpe.toFixed(1)}` : ""}
      </div>
    </div>
  );
}
