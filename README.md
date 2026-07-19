# GYMA — Workout Tracker

Web app di allenamento con Next.js 14 (App Router), TypeScript e Tailwind CSS. Persistenza **solo in localStorage** — nessun backend, nessun account. Deploy target: Vercel.

## Stack

- Next.js 14 + TypeScript + Tailwind
- Dataset [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (873 esercizi, pubblico dominio)
- Fuzzy matching con `fuse.js` per import AI

## Avvio locale

```bash
npm install
npm run index-exercises   # rigenera public/data/exercises-index.json
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Deploy su Vercel

```bash
npm i -g vercel
vercel
```

Oppure collega il repo su [vercel.com](https://vercel.com) — build command `next build`, output di default Next.js.

## Funzionalità

- **Catalogo** — ricerca, filtri, preferiti, recenti, scheda esercizio
- **Routine** — builder serie/reps o circuiti a tempo, duplica/modifica/elimina
- **Sessione live** — log serie, sostituzione esercizio, wake lock, note
- **Timer recupero** — barra orizzontale che si accorcia + suono/vibrazione
- **Storico** — calendario/streak, ripeti sessione, PR automatici
- **Progressi** — grafici peso/volume + log peso corporeo
- **Impostazioni** — kg/lb, export/import JSON, riepilogo per Claude.ai
- **AI manuale** — copia prompt, importa JSON routine con fuzzy match

## Dati (localStorage)

| Chiave | Contenuto |
|--------|-----------|
| `gyma:routines` | Routine |
| `gyma:sessions` | Storico sessioni |
| `gyma:bodyweightLog` | Peso corporeo |
| `gyma:favorites` | Preferiti |
| `gyma:recentExerciseIds` | Recenti |
| `gyma:settings` | Preferenze |

## Design

Palette chalk `#FAFAF8` / ink `#161614` / accent `#E1442C` / muted `#8A8880`. Tipografia: Archivo (condensed stretch), Inter, IBM Plex Mono.
