import type { Session } from "./types";
import { exerciseMaxWeight, exerciseVolume } from "./pr";
import { formatWeightWithUnit } from "./units";
import type { WeightUnit } from "./types";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function sessionDate(s: Session): Date {
  return new Date(s.completedAt ?? s.startedAt);
}

export function buildAiSummary(
  sessions: Session[],
  unit: WeightUnit,
  weeks = 4,
): string {
  const since = daysAgo(weeks * 7);
  const recent = sessions
    .filter((s) => s.status === "completed")
    .filter((s) => sessionDate(s) >= since)
    .sort((a, b) => sessionDate(b).getTime() - sessionDate(a).getTime());

  const lines: string[] = [];
  lines.push(`# Riepilogo allenamenti — ultime ${weeks} settimane`);
  lines.push(`Unità: ${unit}`);
  lines.push(`Sessioni completate: ${recent.length}`);
  lines.push("");

  if (recent.length === 0) {
    lines.push("Nessuna sessione completata nel periodo.");
    return lines.join("\n");
  }

  // Calendar coverage: which days had workouts
  const daySet = new Set(
    recent.map((s) => sessionDate(s).toISOString().slice(0, 10)),
  );
  const totalDays = weeks * 7;
  lines.push(`Giorni allenati: ${daySet.size} / ${totalDays}`);
  lines.push("");

  lines.push("## Sessioni");
  for (const s of recent) {
    const date = sessionDate(s).toLocaleDateString("it-IT");
    lines.push(`### ${date} — ${s.routineName ?? "Sessione libera"}`);
    if (s.notes) lines.push(`Note sessione: ${s.notes}`);
    for (const ex of s.exercises) {
      const sets = ex.sets
        .filter((x) => x.completed)
        .map((x) => {
          const w =
            x.weight !== undefined
              ? formatWeightWithUnit(x.weight, unit)
              : "bw";
          const rpe = x.rpe !== undefined ? ` @RPE${x.rpe}` : "";
          return `${x.reps}×${w}${rpe}`;
        })
        .join(", ");
      const vol = exerciseVolume(ex);
      const maxW = exerciseMaxWeight(ex);
      lines.push(
        `- ${ex.exerciseName}: ${sets || "nessuna serie"} | max ${formatWeightWithUnit(maxW || undefined, unit)} | vol ${formatWeightWithUnit(vol || undefined, unit)}`,
      );
      if (ex.notes) lines.push(`  Nota: ${ex.notes}`);
    }
    if (s.prs?.length) {
      lines.push(
        `  PR: ${s.prs.map((p) => `${p.exerciseName} ${p.kind} ${formatWeightWithUnit(p.value, unit)}`).join("; ")}`,
      );
    }
    lines.push("");
  }

  // Progression snapshot per exercise
  const byEx = new Map<
    string,
    { name: string; weights: number[]; volumes: number[] }
  >();
  for (const s of [...recent].reverse()) {
    for (const ex of s.exercises) {
      const entry = byEx.get(ex.exerciseId) ?? {
        name: ex.exerciseName,
        weights: [],
        volumes: [],
      };
      entry.weights.push(exerciseMaxWeight(ex));
      entry.volumes.push(exerciseVolume(ex));
      byEx.set(ex.exerciseId, entry);
    }
  }

  lines.push("## Progressione carichi (per esercizio)");
  Array.from(byEx.values()).forEach((data) => {
    const first = data.weights.find((w) => w > 0);
    const last = [...data.weights].reverse().find((w) => w > 0);
    if (!first || !last) return;
    const delta = last - first;
    const sign = delta > 0 ? "+" : "";
    lines.push(
      `- ${data.name}: ${formatWeightWithUnit(first, unit)} → ${formatWeightWithUnit(last, unit)} (${sign}${formatWeightWithUnit(Math.abs(delta), unit)})`,
    );
  });

  lines.push("");
  lines.push(
    "Chiedimi consigli su programmazione, recupero e progressione basati su questi dati.",
  );

  return lines.join("\n");
}

export const AI_ROUTINE_PROMPT = `Rispondi SOLO con JSON in questo formato, senza testo aggiuntivo:
{
  "name": "Nome routine",
  "type": "reps",
  "exercises": [
    { "name": "Nome esercizio in inglese (es. Barbell Bench Press)", "sets": 4, "reps": 8, "restSeconds": 90, "targetWeight": 60 }
  ]
}

Per routine a tempo (circuiti/HIIT/stretching) usa:
{
  "name": "Nome circuito",
  "type": "timed",
  "exercises": [
    { "name": "Nome esercizio", "durationSeconds": 40, "restSeconds": 20 }
  ]
}

Regole:
- Usa nomi esercizi in inglese, tipici delle palestre
- type deve essere "reps" oppure "timed"
- Per type "reps": sets, reps, restSeconds obbligatori; targetWeight opzionale (kg)
- Per type "timed": durationSeconds e restSeconds obbligatori
- Nessun markdown, nessun commento, solo JSON valido`;
