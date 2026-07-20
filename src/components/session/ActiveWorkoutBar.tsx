"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  findActiveSession,
  formatSessionElapsed,
  completeSession,
  getSessionElapsedSeconds,
  isSessionPaused,
  setActiveSessionId,
} from "@/lib/session-active";
import { Button, Mono } from "@/components/ui/primitives";
import { FinishWorkoutModal } from "@/components/session/FinishWorkoutModal";

export function ActiveWorkoutBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sessions, upsertSession } = useAppStore();
  const [finishOpen, setFinishOpen] = useState(false);
  const [, setTick] = useState(0);

  const onLivePage = pathname.startsWith("/session/live");
  const session = useMemo(() => findActiveSession(sessions), [sessions]);
  const paused = session ? isSessionPaused(session) : true;
  const elapsed = session ? getSessionElapsedSeconds(session) : 0;

  useEffect(() => {
    if (!session || onLivePage || paused) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [session, onLivePage, paused]);

  if (!session || onLivePage) return null;

  function finish() {
    if (!session) return;
    const completed = completeSession(session, sessions);
    upsertSession(completed);
    setActiveSessionId(null);
    setFinishOpen(false);
    router.push(`/history/${completed.id}?done=1`);
  }

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[45] border-t border-hairline bg-chalk/98 shadow-[0_-4px_16px_rgba(22,22,20,0.06)] backdrop-blur-sm"
        role="region"
        aria-label="Allenamento in corso"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {session.routineName ?? "Allenamento"}
            </div>
            <div className="text-xs text-muted">
              In pausa ·{" "}
              <Mono className="text-ink">{formatSessionElapsed(elapsed)}</Mono>
              {session.exercises.length > 0 && (
                <>
                  {" "}
                  · esercizio{" "}
                  {Math.min(
                    (session.activeExerciseIndex ?? 0) + 1,
                    session.exercises.length,
                  )}
                  /{session.exercises.length}
                </>
              )}
            </div>
          </div>
          <Link
            href={`/session/live?id=${session.id}`}
            className="shrink-0"
          >
            <Button type="button" variant="accent" className="min-h-10 px-4">
              Riprendi
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            className="min-h-10 shrink-0 px-3 text-sm"
            onClick={() => setFinishOpen(true)}
          >
            Termina
          </Button>
        </div>
      </div>

      <FinishWorkoutModal
        open={finishOpen}
        sessionName={session.routineName}
        onClose={() => setFinishOpen(false)}
        onConfirm={finish}
      />
    </>
  );
}
