"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

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
    label: "Routine",
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
): { title: string; backHref?: string } {
  if (pathname === "/") return { title: "" };
  if (pathname === "/routines") return { title: "Routine" };
  if (pathname === "/routines/new") {
    return { title: "Nuova routine", backHref: "/routines" };
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
    return { title: "Esercizio", backHref: "/catalog" };
  }
  if (pathname === "/history") return { title: "Storico", backHref: "/" };
  if (/^\/history\//.test(pathname)) {
    return { title: "Sessione", backHref: "/history" };
  }
  if (pathname === "/progress") return { title: "Progressi", backHref: "/" };
  if (pathname === "/settings") return { title: "Utente" };
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
  const isLive = pathname.startsWith("/session/live");
  const isHome = pathname === "/";
  const showNav = !hideNav && !isLive;
  const showTopBar = showNav && !isHome;

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
            : `mx-auto max-w-lg px-4 py-4 ${
                showNav
                  ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
                  : "pb-[env(safe-area-inset-bottom)]"
              } ${isHome ? "pt-[max(1rem,env(safe-area-inset-top))]" : ""}`
        }
      >
        {children}
      </main>

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
  const { title, backHref } = resolveChrome(pathname, params.get("return"));

  return (
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
        <span aria-hidden />
      </div>
    </header>
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
