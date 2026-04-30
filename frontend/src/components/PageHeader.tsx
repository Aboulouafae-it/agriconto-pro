import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-wide text-field">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{subtitle}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
