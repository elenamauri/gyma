"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Exercise } from "@/lib/types";
import { getExerciseById } from "@/lib/exercises";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { MuscleMap } from "@/components/exercises/MuscleMap";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";

export default function ExerciseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const { favorites, toggleFavorite, markRecent } = useAppStore();

  useEffect(() => {
    let cancelled = false;
    getExerciseById(id).then((ex) => {
      if (cancelled) return;
      setExercise(ex ?? null);
      setLoading(false);
      if (ex) markRecent(ex.id);
    });
    return () => {
      cancelled = true;
    };
  }, [id, markRecent]);

  if (loading) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  if (!exercise) {
    return (
      <div className="space-y-3">
        <p>Esercizio non trovato.</p>
        <Link href="/catalog" className="text-accent underline">
          Torna al catalogo
        </Link>
      </div>
    );
  }

  const isFav = favorites.includes(exercise.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title={exercise.name}
        description={`${exercise.level} · ${exercise.category}${
          exercise.equipment ? ` · ${exercise.equipment}` : ""
        }`}
        action={
          <Button
            type="button"
            variant="ghost"
            onClick={() => toggleFavorite(exercise.id)}
            aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
          >
            {isFav ? "★" : "☆"}
          </Button>
        }
      />

      <ExerciseThumb
        eager
        size="lg"
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        imagePath={exercise.images[0]}
        primaryMuscles={exercise.primaryMuscles}
        secondaryMuscles={exercise.secondaryMuscles}
      />
      <p className="text-center text-[10px] text-muted">
        Demo GIF:{" "}
        <a
          href="https://github.com/ExerciseDB/exercisedb-api"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          ExerciseDB / AscendAPI
        </a>
      </p>

      <section className="border-y border-hairline py-4">
        <h2 className="mb-3 text-center text-xs uppercase tracking-wide text-muted">
          Muscoli coinvolti
        </h2>
        <MuscleMap
          primaryMuscles={exercise.primaryMuscles}
          secondaryMuscles={exercise.secondaryMuscles}
        />
      </section>

      <div className="space-y-4">
        <MetaBlock title="Muscoli primari" items={exercise.primaryMuscles} />
        <MetaBlock title="Muscoli secondari" items={exercise.secondaryMuscles} />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold border-b border-hairline pb-2">
          Istruzioni
        </h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
          {exercise.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function MetaBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="mb-1 text-xs uppercase tracking-wide text-muted">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">—</p>
      ) : (
        <p className="text-sm">{items.join(", ")}</p>
      )}
    </div>
  );
}
