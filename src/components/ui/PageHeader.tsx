import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Indietro",
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span aria-hidden>←</span>
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function ListRow({
  href,
  title,
  subtitle,
  trailing,
}: {
  href?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-muted">{subtitle}</div>
        )}
      </div>
      {trailing}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 py-3 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {body}
      </Link>
    );
  }

  return <div className="flex min-h-14 items-center gap-3 py-3">{body}</div>;
}
