"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const pathname = usePathname();
  const isLive = pathname.startsWith("/session/live");
  const showNav = !hideNav && !isLive;

  return (
    <div className="min-h-dvh bg-chalk text-ink">
      {showNav && (
        <header className="sticky top-0 z-40 border-b border-hairline bg-chalk/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
          <div className="mx-auto flex h-12 max-w-lg items-center px-4">
            <Link
              href="/"
              className="font-display text-lg font-bold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              GYMA
            </Link>
          </div>
        </header>
      )}

      <main
        className={
          isLive
            ? ""
            : `mx-auto max-w-lg px-4 py-4 ${
                showNav
                  ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
                  : "pb-[env(safe-area-inset-bottom)]"
              }`
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
