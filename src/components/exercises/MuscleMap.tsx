"use client";

import { Component, useMemo, useState, type ReactNode } from "react";
import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";

type MuscleSlug =
  | "abs"
  | "adductors"
  | "biceps"
  | "calves"
  | "chest"
  | "deltoids"
  | "forearm"
  | "gluteal"
  | "hamstring"
  | "lower-back"
  | "neck"
  | "quadriceps"
  | "trapezius"
  | "triceps"
  | "upper-back";

/** free-exercise-db → highlighter slug */
const MUSCLE_MAP: Record<string, MuscleSlug> = {
  abdominals: "abs",
  abductors: "gluteal",
  adductors: "adductors",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  forearms: "forearm",
  glutes: "gluteal",
  hamstrings: "hamstring",
  lats: "upper-back",
  "lower back": "lower-back",
  "middle back": "upper-back",
  neck: "neck",
  quadriceps: "quadriceps",
  shoulders: "deltoids",
  traps: "trapezius",
  triceps: "triceps",
};

const BACK_SLUGS = new Set<MuscleSlug>([
  "upper-back",
  "lower-back",
  "trapezius",
  "gluteal",
  "hamstring",
  "calves",
  "triceps",
]);

function toSlug(name: string): MuscleSlug | null {
  return MUSCLE_MAP[name.toLowerCase()] ?? null;
}

function preferBack(primary: string[], secondary: string[]): boolean {
  const all = [...primary, ...secondary]
    .map(toSlug)
    .filter((s): s is MuscleSlug => Boolean(s));
  if (!all.length) return false;
  const backHits = all.filter((s) => BACK_SLUGS.has(s)).length;
  return backHits > all.length / 2;
}

class MapErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <p className="text-center text-xs text-muted">Mappa non disponibile</p>
      );
    }
    return this.props.children;
  }
}

export function MuscleMap({
  primaryMuscles,
  secondaryMuscles = [],
  className = "",
  compact = false,
  compactScale = 0.35,
}: {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  className?: string;
  compact?: boolean;
  /** Body SVG scale when compact (default 0.35) */
  compactScale?: number;
}) {
  const defaultSide = preferBack(primaryMuscles, secondaryMuscles)
    ? "back"
    : "front";
  const [side, setSide] = useState<"front" | "back">(defaultSide);

  const data = useMemo(() => {
    const parts: ExtendedBodyPart[] = [];
    const seen = new Set<string>();

    for (const name of primaryMuscles) {
      const slug = toSlug(name);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      parts.push({ slug, color: "#E1442C", intensity: 2 });
    }

    for (const name of secondaryMuscles) {
      const slug = toSlug(name);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      parts.push({ slug, color: "#8A8880", intensity: 1 });
    }
    return parts;
  }, [primaryMuscles, secondaryMuscles]);

  if (data.length === 0) {
    if (compact) return null;
    return (
      <p className="text-center text-xs text-muted">Nessun muscolo mappato</p>
    );
  }

  return (
    <MapErrorBoundary>
      <div
        className={`flex flex-col items-center ${compact ? "gap-0" : "gap-3"} ${className}`}
      >
        {!compact && (
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSide("front")}
              className={`min-h-9 px-3 touch-manipulation ${
                side === "front"
                  ? "text-accent underline underline-offset-4"
                  : "text-muted"
              }`}
            >
              Fronte
            </button>
            <button
              type="button"
              onClick={() => setSide("back")}
              className={`min-h-9 px-3 touch-manipulation ${
                side === "back"
                  ? "text-accent underline underline-offset-4"
                  : "text-muted"
              }`}
            >
              Retro
            </button>
          </div>
        )}
        <div
          className={
            compact
              ? "flex items-center justify-center overflow-hidden [&_svg]:max-h-full [&_svg]:w-auto"
              : "w-full max-w-[200px] overflow-hidden [&_svg]:h-auto [&_svg]:max-w-full"
          }
        >
          <Body
            data={data}
            side={compact ? defaultSide : side}
            gender="male"
            scale={compact ? compactScale : 1}
            border="#161614"
            defaultFill="#E8E6E0"
            defaultStroke="none"
            colors={["#8A8880", "#E1442C"]}
          />
        </div>
        {!compact && (
          <div className="flex flex-wrap justify-center gap-3 text-[10px] uppercase tracking-wide text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 bg-accent" aria-hidden />
              Primari
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 bg-muted" aria-hidden />
              Secondari
            </span>
          </div>
        )}
      </div>
    </MapErrorBoundary>
  );
}
