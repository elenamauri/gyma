"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { exerciseGifUrl, exerciseImageUrl } from "@/lib/exercises";
import { MuscleMap } from "@/components/exercises/MuscleMap";

function useOnceInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return { ref, visible };
}

/**
 * Prefer animated ExerciseDB GIF → static photo → muscle map.
 * Tap opens catalog exercise page when `link` is true (default if id present).
 */
export const ExerciseThumb = memo(function ExerciseThumb({
  exerciseId,
  exerciseName,
  imagePath,
  primaryMuscles = [],
  secondaryMuscles = [],
  size = "md",
  className = "",
  eager = false,
  link,
}: {
  exerciseId?: string;
  exerciseName?: string;
  imagePath?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  size?: "sm" | "md" | "lg";
  className?: string;
  eager?: boolean;
  /** Open /catalog/[id] on tap. Defaults to true when exerciseId is set. */
  link?: boolean;
}) {
  const { ref, visible } = useOnceInView<HTMLDivElement>();
  const show = eager || visible;
  const [gif, setGif] = useState<string | null>(null);
  const [gifFailed, setGifFailed] = useState(false);
  const asLink = link ?? Boolean(exerciseId);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    setGifFailed(false);
    exerciseGifUrl(exerciseId, exerciseName).then((url) => {
      if (!cancelled) setGif(url || null);
    });
    return () => {
      cancelled = true;
    };
  }, [show, exerciseId, exerciseName]);

  const box =
    size === "sm"
      ? "h-14 w-14 shrink-0"
      : size === "lg"
        ? "mx-auto aspect-square w-full max-w-[280px]"
        : "aspect-square w-full";

  const photo = exerciseImageUrl(imagePath);

  const inner = (
    <>
      {!show ? (
        <span className="h-6 w-6 rounded-full bg-ink/10" aria-hidden />
      ) : gif && !gifFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={gif}
          alt={exerciseName ?? ""}
          className="h-full w-full object-contain"
          loading={eager ? "eager" : "lazy"}
          onError={() => setGifFailed(true)}
        />
      ) : photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={exerciseName ?? ""}
          className="h-full w-full object-cover"
          loading={eager ? "eager" : "lazy"}
        />
      ) : primaryMuscles.length > 0 ? (
        <MuscleMap
          compact
          compactScale={size === "sm" ? 0.32 : size === "lg" ? 0.85 : 0.55}
          primaryMuscles={primaryMuscles}
          secondaryMuscles={secondaryMuscles}
        />
      ) : (
        <span className="text-xs text-muted">—</span>
      )}
    </>
  );

  const sharedClass = `relative flex items-center justify-center overflow-hidden border border-hairline bg-ink/[0.03] ${box} ${className}`;

  return (
    <div ref={ref} className={sharedClass}>
      {asLink && exerciseId ? (
        <Link
          href={`/catalog/${exerciseId}`}
          className="absolute inset-0 z-10 touch-manipulation"
          aria-label={
            exerciseName ? `Info ${exerciseName}` : "Info esercizio"
          }
          onClick={(e) => e.stopPropagation()}
        />
      ) : null}
      {inner}
    </div>
  );
});
