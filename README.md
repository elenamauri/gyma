# GYMA — Workout Tracker

Web app di allenamento con Next.js 14 (App Router), TypeScript e Tailwind CSS. Cache locale in **localStorage** + sync cloud opzionale gratis con **Supabase**. Deploy: Vercel.

## Stack

- Next.js 14 + TypeScript + Tailwind
- Dataset [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (873 esercizi, pubblico dominio)
- Demo animate GIF da [ExerciseDB](https://github.com/ExerciseDB/exercisedb-api) / AscendAPI (**solo uso non commerciale** + attribuzione)
- Fuzzy matching con `fuse.js` per import AI
- Auth + sync: [Supabase](https://supabase.com) (piano free)

## Avvio locale

```bash
npm install
npm run index-exercises   # rigenera public/data/exercises-index.json
npm run index-gifs        # mappa GIF ExerciseDB → public/data/gif-map.json
cp .env.local.example .env.local   # poi inserisci le chiavi Supabase
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

> **GIF ExerciseDB:** matching **strict** (nome esatto / stessi token, niente fuzzy) — circa 30% degli esercizi ha una demo animata via CDN; gli altri usano foto free-exercise-db o muscle map. Meglio nessuna GIF che una sbagliata. Uso personale/non commerciale; crediti AscendAPI. Per uso commerciale serve un piano [RapidAPI](https://github.com/ExerciseDB/exercisedb-api).

## Account cloud gratis (Supabase)

1. Crea un progetto free su [supabase.com](https://supabase.com)
2. **SQL Editor** → incolla e esegui `supabase/schema.sql`
3. **Project Settings → API** → copia:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In locale: mettile in `.env.local`
5. Su Vercel: **Project → Settings → Environment Variables** → stesse due variabili → Redeploy
6. **Authentication → URL Configuration**:
   - Site URL: `https://TUO-DOMINIO.vercel.app` (e in locale `http://localhost:3000`)
   - Redirect URLs: `http://localhost:3000/auth/callback` e `https://TUO-DOMINIO.vercel.app/auth/callback`

Nell’app: **Impostazioni → Account cloud** → crea account / accedi. I dati si sincronizzano automaticamente.

## Deploy su Vercel

Collega il repo GitHub su [vercel.com](https://vercel.com), aggiungi le env vars Supabase, deploy.

## Funzionalità

- **Catalogo** — ricerca, filtri, preferiti, recenti, scheda esercizio
- **Routine** — builder serie/reps o circuiti a tempo, duplica/modifica/elimina
- **Sessione live** — log serie, sostituzione esercizio, wake lock, note
- **Timer recupero** — barra orizzontale che si accorcia + suono/vibrazione
- **Storico** — calendario/streak, ripeti sessione, PR automatici
- **Progressi** — grafici peso/volume + log peso corporeo
- **Account cloud** — sync gratis (Supabase), sopravvive alla cancellazione dati browser
- **Impostazioni** — kg/lb, export/import JSON, riepilogo per Claude.ai
- **AI manuale** — copia prompt, importa JSON routine con fuzzy match

## Dati

Locale (cache): chiavi `gyma:*` in localStorage.  
Cloud: tabella `user_data` (JSONB per utente, RLS).

## Design

Palette chalk `#FAFAF8` / ink `#161614` / accent `#E1442C` / muted `#8A8880`. Tipografia: Archivo (condensed stretch), Inter, IBM Plex Mono.
