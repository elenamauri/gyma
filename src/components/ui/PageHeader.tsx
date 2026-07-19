import Link from "next/link";
import type { ReactNode } from "react";

/** In-page header under the app top bar (title lives in AppShell). */
export function PageHeader({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  /** @deprecated back is handled by AppShell */
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  if (!title && !description && !action) return null;

  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {title ? (
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className={`text-sm text-muted ${title ? "mt-1" : ""}`}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
