"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Exercise } from "@/lib/types";
import { exerciseImageUrl, getExerciseById } from "@/lib/exercises";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/primitives";

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
      <div>
        <p>Esercizio non trovato.</p>
        <Link href="/catalog" className="text-accent underline">
          Torna al catalogo
        </Link>
      </div>
    );
  }

  const isFav = favorites.includes(exercise.id);
  const img = exercise.images[0];

  return (
    <div className="space-y-6">
      <Link href="/catalog" className="text-sm text-muted hover:text-ink">
        ← Catalogo
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {exercise.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {exercise.level} · {exercise.category}
            {exercise.equipment ? ` · ${exercise.equipment}` : ""}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={() => toggleFavorite(exercise.id)}>
          {isFav ? "★ Preferito" : "☆ Preferito"}
        </Button>
      </div>

      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={exerciseImageUrl(img)}
          alt={exercise.name}
          className="w-full max-w-md border border-hairline object-cover"
        />
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <MetaBlock
          title="Muscoli primari"
          items={exercise.primaryMuscles}
        />
        <MetaBlock
          title="Muscoli secondari"
          items={exercise.secondaryMuscles}
        />
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
      <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">—</p>
      ) : (
        <p className="text-sm">{items.join(", ")}</p>
      )}
    </div>
  );
}
