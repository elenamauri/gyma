"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalogo" },
  { href: "/routines", label: "Routine" },
  { href: "/history", label: "Storico" },
  { href: "/progress", label: "Progressi" },
  { href: "/settings", label: "Impostazioni" },
];

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const pathname = usePathname();
  const isLive = pathname.startsWith("/session/live");

  return (
    <div className="min-h-dvh bg-chalk text-ink">
      {!hideNav && !isLive && (
        <header className="border-b border-hairline">
          <div className="mx-auto flex max-w-3xl items-baseline justify-between gap-4 px-4 py-4">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight">
              GYMA
            </Link>
            <nav className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "text-accent underline underline-offset-4"
                        : "text-muted hover:text-ink"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
      )}
      <main className={isLive ? "" : "mx-auto max-w-3xl px-4 py-6"}>{children}</main>
    </div>
  );
}
