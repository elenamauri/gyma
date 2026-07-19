"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/storage";
import type { Program } from "@/lib/types";
import { Button, Input, Label } from "@/components/ui/primitives";

export default function NewProgramPage() {
  const router = useRouter();
  const { upsertProgram } = useAppStore();
  const [name, setName] = useState("");

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const program: Program = {
      id: uid(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    upsertProgram(program);
    router.replace(`/routines/programs/${program.id}`);
  }

  return (
    <div className="space-y-6 pb-28">
      <div>
        <p className="text-sm text-muted">
          Un programma raggruppa più routine (es. tre varianti di Abs).
        </p>
      </div>

      <div>
        <Label htmlFor="pname">Nome programma</Label>
        <Input
          id="pname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es. Abs, Full body, Push…"
          autoFocus
        />
      </div>

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-0 z-30 border-t border-hairline bg-chalk/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Button
            type="button"
            variant="accent"
            className="w-full"
            disabled={!name.trim()}
            onClick={save}
          >
            Crea programma
          </Button>
        </div>
      </div>
    </div>
  );
}
