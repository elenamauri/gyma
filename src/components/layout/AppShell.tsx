"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { findActiveSession } from "@/lib/session-active";
import { ActiveWorkoutBar } from "@/components/session/ActiveWorkoutBar";
import { Button, Input } from "@/components/ui/primitives";

const TABS = [
  {
    href: "/",
    label: "Home",
    match: (path: string) =>
      path === "/" ||
      path.startsWith("/catalog") ||
      path.startsWith("/history") ||
      path.startsWith("/progress"),
    icon: IconDashboard,
  },
  {
    href: "/routines",
    label: "Programmi",
    match: (path: string) => path.startsWith("/routines"),
    icon: IconRoutine,
  },
  {
    href: "/settings",
    label: "Utente",
    match: (path: string) =>
      path.startsWith("/settings") || path.startsWith("/auth"),
    icon: IconUser,
  },
] as const;

function resolveChrome(
  pathname: string,
  returnTo: string | null,
  programId: string | null = null,
): {
  title: string;
  backHref?: string;
  rightHref?: string;
  rightLabel?: string;
  rightIcon?: "settings" | "import" | "edit";
} {
  if (pathname === "/") return { title: "" };
  if (pathname === "/routines") {
    return {
      title: "Programmi",
      rightHref: "/routines/import",
      rightLabel: "Import da Claude",
      rightIcon: "import",
    };
  }
  if (pathname === "/routines/programs/new") {
    return { title: "Nuovo programma", backHref: "/routines" };
  }
  if (/^\/routines\/programs\/[^/]+$/.test(pathname)) {
    return {
      title: "Programma",
      backHref: "/routines",
      rightIcon: "edit",
      rightLabel: "Rinomina programma",
    };
  }
  if (pathname === "/routines/import") {
    return { title: "Import AI", backHref: "/routines" };
  }
  if (pathname === "/routines/import/pick") {
    return {
      title: "Catalogo",
      backHref: returnTo || "/routines/import",
    };
  }
  if (pathname === "/routines/new") {
    return {
      title: "Nuova routine",
      backHref: programId
        ? `/routines/programs/${programId}`
        : "/routines",
    };
  }
  if (pathname === "/routines/pick") {
    return {
      title: "Aggiungi esercizi",
      backHref: returnTo || "/routines/new",
    };
  }
  if (/^\/routines\/[^/]+\/edit$/.test(pathname)) {
    const id = pathname.split("/")[2];
    return { title: "Modifica", backHref: `/routines/${id}` };
  }
  if (/^\/routines\/[^/]+$/.test(pathname)) {
    return { title: "Routine", backHref: "/routines" };
  }
  if (pathname === "/catalog") return { title: "Catalogo", backHref: "/" };
  if (/^\/catalog\//.test(pathname)) {
    return {
      title: "Esercizio",
      backHref: returnTo && returnTo.startsWith("/") ? returnTo : "/catalog",
    };
  }
  if (pathname === "/session/start") {
    return { title: "Inizia allenamento", backHref: "/" };
  }
  if (pathname === "/history") return { title: "Storico", backHref: "/" };
  if (/^\/history\//.test(pathname)) {
    return { title: "Riepilogo", backHref: "/history" };
  }
  if (pathname === "/progress") return { title: "Progressi", backHref: "/" };
  if (pathname === "/settings/preferences") {
    return { title: "Impostazioni", backHref: "/settings" };
  }
  if (pathname === "/settings") {
    return {
      title: "Utente",
      rightHref: "/settings/preferences",
      rightLabel: "Impostazioni",
      rightIcon: "settings",
    };
  }
  if (pathname.startsWith("/auth")) {
    return { title: "Accesso", backHref: "/settings" };
  }
  return { title: "GYMA" };
}

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const pathname = usePathname();
  const { sessions } = useAppStore();
  const isLive = pathname.startsWith("/session/live");
  const isHome = pathname === "/";
  const showNav = !hideNav && !isLive;
  const showTopBar = showNav && !isHome;
  const hasActiveWorkout =
    !isLive && Boolean(findActiveSession(sessions));
  const mainBottomPad = showNav
    ? hasActiveWorkout
      ? "pb-[calc(8.25rem+env(safe-area-inset-bottom))]"
      : "pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
    : "pb-[env(safe-area-inset-bottom)]";

  return (
    <div className="min-h-dvh bg-chalk text-ink">
      {showTopBar && (
        <Suspense fallback={<TopBarFallback />}>
          <AppTopBar />
        </Suspense>
      )}

      <main
        className={
          isLive
            ? ""
            : `mx-auto max-w-lg px-4 py-4 ${mainBottomPad} ${
                isHome ? "pt-[max(1rem,env(safe-area-inset-top))]" : ""
              }`
        }
      >
        {children}
      </main>

      {showNav && <ActiveWorkoutBar />}

      {showNav && (
        <nav
          className="fixed bottom-0 inset-x-0 z-40 border-t border-hairline bg-chalk/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
          aria-label="Navigazione principale"
        >
          <div className="mx-auto grid h-14 max-w-lg grid-cols-3">
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[10px] uppercase tracking-wider touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  <Icon active={active} />
                  <span className="font-medium">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function TopBarFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-chalk/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-lg items-center px-2" />
    </header>
  );
}

function AppTopBar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useAuth();
  const { programs, routines, upsertProgram } = useAppStore();
  const chrome = resolveChrome(
    pathname,
    params.get("return"),
    params.get("programId"),
  );
  const programMatch = pathname.match(/^\/routines\/programs\/([^/]+)$/);
  const programId = programMatch?.[1];
  const program = programId
    ? programs.find((p) => p.id === programId)
    : undefined;

  const routineMatch = pathname.match(/^\/routines\/([^/]+)$/);
  const routineId = routineMatch?.[1];
  const routine = routineId
    ? routines.find((r) => r.id === routineId)
    : undefined;
  const routineProgram = routine
    ? programs.find((p) => p.id === routine.programId)
    : undefined;

  const title =
    programMatch && program
      ? program.name
      : routine && routine.name
        ? routine.name
        : chrome.title;
  const backHref =
    routine && routineProgram
      ? `/routines/programs/${routineProgram.id}`
      : chrome.backHref;

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const showSettingsGear =
    chrome.rightIcon === "settings" ? Boolean(user) : Boolean(chrome.rightHref);
  const rightHref = showSettingsGear ? chrome.rightHref : undefined;
  const { rightLabel, rightIcon } = chrome;
  const showEdit = rightIcon === "edit" && Boolean(program);

  function openRename() {
    if (!program) return;
    setRenameValue(program.name);
    setRenameOpen(true);
  }

  function saveRename() {
    if (!program) return;
    const name = renameValue.trim();
    if (!name) return;
    upsertProgram({
      ...program,
      name,
      updatedAt: new Date().toISOString(),
    });
    setRenameOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-chalk/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto grid h-12 max-w-lg grid-cols-[2.75rem_1fr_2.75rem] items-center px-2">
          {backHref ? (
            <Link
              href={backHref}
              className="flex h-11 w-11 items-center justify-center text-lg touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Indietro"
            >
              ←
            </Link>
          ) : (
            <span aria-hidden />
          )}
          <h1 className="truncate text-center font-display text-base font-bold tracking-tight">
            {title}
          </h1>
          {showEdit ? (
            <button
              type="button"
              onClick={openRename}
              className="flex h-11 w-11 items-center justify-center text-muted touch-manipulation hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label={rightLabel ?? "Rinomina"}
            >
              <IconPencil />
            </button>
          ) : rightHref ? (
            <Link
              href={rightHref}
              className="flex h-11 w-11 items-center justify-center text-muted touch-manipulation hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label={rightLabel ?? "Azione"}
            >
              {rightIcon === "import" ? <IconImport /> : <IconSettings />}
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </div>
      </header>

      {renameOpen && program && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:items-center sm:justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Chiudi"
            onClick={() => setRenameOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-program-title"
            className="relative mx-auto w-full max-w-lg border-t border-hairline bg-chalk px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-xl sm:border sm:pb-4"
          >
            <h2
              id="rename-program-title"
              className="font-display text-xl font-bold"
            >
              Rinomina programma
            </h2>
            <div className="mt-4">
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                }}
                placeholder="Nome programma"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="accent"
                className="flex-1"
                disabled={!renameValue.trim()}
                onClick={saveRename}
              >
                Salva
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setRenameOpen(false)}
              >
                Annulla
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function IconPencil() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="stroke-current"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function IconImport() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="stroke-current"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="stroke-current"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 21V14" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M2 14h4" />
      <path d="M10 8h4" />
      <path d="M18 16h4" />
    </svg>
  );
}

function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={active ? "stroke-accent" : "stroke-current"}
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}

function IconRoutine({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={active ? "stroke-accent" : "stroke-current"}
      strokeWidth="1.5"
    >
      <path d="M4 7h16M4 12h16M4 17h10" />
      <circle cx="18" cy="17" r="2.5" />
    </svg>
  );
}

function IconUser({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={active ? "stroke-accent" : "stroke-current"}
      strokeWidth="1.5"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" />
    </svg>
  );
}
