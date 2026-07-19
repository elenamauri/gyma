"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { Button, Input, Label } from "@/components/ui/primitives";

export function AccountPanel({ loginOnly = false }: { loginOnly?: boolean }) {
  const { configured, ready, user, signIn, signUp, signOut } = useAuth();
  const { syncStatus, syncError, lastSyncedAt, syncNow } = useAppStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <p className="text-sm text-muted">
        Account cloud non configurato. Aggiungi le variabili Supabase su Vercel
        (vedi README).
      </p>
    );
  }

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento account…</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const result =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(
      mode === "signup"
        ? "Account creato. Controlla l’email se richiesto, poi accedi."
        : "Accesso effettuato.",
    );
    setPassword("");
  }

  if (!user) {
    return (
      <form onSubmit={submit} className="space-y-4">
        {!loginOnly && (
          <p className="text-sm text-muted">
            Accedi per sincronizzare i tuoi allenamenti sul cloud.
          </p>
        )}
        <div className="flex gap-4 text-sm">
          <button
            type="button"
            className={
              mode === "signin"
                ? "text-accent underline underline-offset-4"
                : "text-muted"
            }
            onClick={() => setMode("signin")}
          >
            Accedi
          </button>
          <button
            type="button"
            className={
              mode === "signup"
                ? "text-accent underline underline-offset-4"
                : "text-muted"
            }
            onClick={() => setMode("signup")}
          >
            Crea account
          </button>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Password (min. 6 caratteri)</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Attendi…" : mode === "signin" ? "Accedi" : "Registrati"}
        </Button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </form>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
        Account
      </h2>
      <p className="text-sm">
        Collegata come <span className="font-mono text-xs">{user.email}</span>
      </p>
      <p className="text-xs text-muted">
        Sync:{" "}
        {syncStatus === "synced"
          ? "ok"
          : syncStatus === "syncing"
            ? "in corso…"
            : syncStatus === "error"
              ? "errore"
              : syncStatus}
        {lastSyncedAt
          ? ` · ultimo aggiornamento ${new Date(lastSyncedAt).toLocaleString("it-IT")}`
          : ""}
      </p>
      {syncError && <p className="text-sm text-accent">{syncError}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={() => syncNow()}>
          Sincronizza ora
        </Button>
        <Button type="button" variant="danger" onClick={() => signOut()}>
          Esci
        </Button>
      </div>
    </section>
  );
}
