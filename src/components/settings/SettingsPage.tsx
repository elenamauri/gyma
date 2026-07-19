"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { buildAiSummary } from "@/lib/ai";
import type { AppData } from "@/lib/types";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/primitives";

export function SettingsPage() {
  const {
    settings,
    updateSettings,
    exportData,
    importData,
    sessions,
  } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [copied, setCopied] = useState(false);

  function downloadExport() {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gyma-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup scaricato.");
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<AppData>;
      if (
        !parsed.routines &&
        !parsed.sessions &&
        !parsed.bodyweightLog &&
        !parsed.settings
      ) {
        setMessage("File non riconosciuto come backup GYMA.");
        return;
      }
      importData(parsed);
      setMessage("Dati importati con successo.");
    } catch {
      setMessage("Impossibile leggere il file JSON.");
    }
  }

  function generateSummary() {
    const text = buildAiSummary(sessions, settings.unit, 4);
    setAiSummary(text);
  }

  async function copySummary() {
    await navigator.clipboard.writeText(aiSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Impostazioni
        </h1>
        <p className="mt-1 text-sm text-muted">
          Unità, notifiche e backup dei dati locali.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
          Preferenze
        </h2>
        <div>
          <Label htmlFor="unit">Unità di misura</Label>
          <Select
            id="unit"
            value={settings.unit}
            onChange={(e) =>
              updateSettings({ unit: e.target.value as "kg" | "lb" })
            }
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="rest">Recupero predefinito (secondi)</Label>
          <Input
            id="rest"
            type="number"
            min={0}
            value={settings.defaultRestSeconds}
            onChange={(e) =>
              updateSettings({ defaultRestSeconds: Number(e.target.value) || 0 })
            }
            className="font-mono"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            className="accent-accent"
          />
          Suono a fine recupero
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.vibrationEnabled}
            onChange={(e) =>
              updateSettings({ vibrationEnabled: e.target.checked })
            }
            className="accent-accent"
          />
          Vibrazione a fine recupero
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
          Backup dati
        </h2>
        <p className="text-sm text-muted">
          Tutti i dati sono nel localStorage di questo browser. Esporta un JSON
          per non perderli cambiando dispositivo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={downloadExport}>
            Esporta JSON
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
          >
            Importa JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
            }}
          />
        </div>
        {message && <p className="text-sm text-muted">{message}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
          Export riepilogo per AI
        </h2>
        <p className="text-sm text-muted">
          Genera un testo delle ultime 4 settimane da incollare in Claude.ai per
          chiedere consigli (nessuna API, gratis).
        </p>
        <Button type="button" variant="ghost" onClick={generateSummary}>
          Genera riepilogo
        </Button>
        {aiSummary && (
          <>
            <Textarea
              readOnly
              rows={14}
              value={aiSummary}
              className="font-mono text-xs"
            />
            <Button type="button" onClick={copySummary}>
              {copied ? "Copiato" : "Copia negli appunti"}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
