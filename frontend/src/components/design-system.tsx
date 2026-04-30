import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileUp,
  Filter,
  Loader2,
  Search,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ElementType, type ReactNode } from "react";
import type { Role } from "../types";
import { roleLabel } from "../lib/permissions";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  neutral: "border-stone-200 bg-stone-50 text-stone-700"
};

export function MoneyValue({ value, className = "" }: { value: unknown; className?: string }) {
  const number = Number(value ?? 0);
  return (
    <span className={`tabular-nums ${className}`}>
      {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(number)}
    </span>
  );
}

export function DateDisplay({ value }: { value?: string | Date | null }) {
  if (!value) return <span>-</span>;
  const date = typeof value === "string" ? new Date(value) : value;
  return <span>{new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(date)}</span>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <StatusBadge tone={role === "OWNER" ? "success" : role === "ACCOUNTANT" ? "info" : role === "LABOR_CONSULTANT" ? "warning" : "neutral"}>
      <ShieldCheck size={13} />
      {roleLabel(role)}
    </StatusBadge>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  detail
}: {
  label: string;
  value: ReactNode;
  icon: ElementType;
  tone?: StatusTone;
  detail?: string;
}) {
  const iconTone = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
    neutral: "bg-stone-100 text-stone-700"
  }[tone];

  return (
    <div className="card p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconTone}`}>
          <Icon size={20} />
        </div>
      </div>
      {detail && <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
  search = ""
}: {
  columns: readonly string[];
  rows: Array<{ id: string; cells: ReactNode[] }>;
  empty: ReactNode;
  search?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] border-b border-line bg-stone-50/80 px-4 py-3 text-xs font-bold uppercase text-stone-500" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((column) => <span key={column}>{column}</span>)}
        </div>
        {rows.length === 0 ? (
          <div className="p-6">{empty}</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="grid min-w-[760px] border-b border-stone-100 px-4 py-4 text-sm text-stone-700 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
              {row.cells.map((cell, index) => <span key={`${row.id}-${index}`} className="min-w-0 truncate pr-3">{cell}</span>)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FilterBar({
  placeholder = "Cerca",
  value,
  onChange,
  onFilters
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFilters?: () => void;
}) {
  const [notice, setNotice] = useState(false);
  return (
    <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
        <input className="input pl-9" placeholder={placeholder} value={value ?? ""} onChange={(event) => onChange?.(event.target.value)} />
      </label>
      <button className="btn-secondary" type="button" onClick={onFilters ?? (() => setNotice(true))}>
        <Filter size={17} />
        Filtri
      </button>
      {notice && <ToastMessage tone="info" title="Funzione in sviluppo" detail="I filtri avanzati saranno disponibili nelle prossime viste salvate." onClose={() => setNotice(false)} />}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  actionLabel,
  icon: Icon = FileUp,
  onAction
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  icon?: ElementType;
  onAction?: () => void;
}) {
  const [notice, setNotice] = useState(false);
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-finance-light text-finance">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">{detail}</p>
      {actionLabel && <button className="btn-primary mt-5" type="button" onClick={onAction ?? (() => setNotice(true))}>{actionLabel}</button>}
      {notice && <ToastMessage tone="info" title="Funzione in sviluppo" detail="Questa azione non è ancora collegata al flusso operativo." onClose={() => setNotice(false)} />}
    </div>
  );
}

export function LoadingState({ label = "Caricamento dati..." }: { label?: string }) {
  return (
    <div className="card flex items-center gap-3 p-4 text-sm text-stone-600">
      <Loader2 className="animate-spin text-field" size={18} />
      {label}
    </div>
  );
}

export function ErrorState({ title = "Serve attenzione", detail }: { title?: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <XCircle className="mt-0.5" size={18} />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1">{detail ?? "Non è stato possibile completare l'operazione. Riprova tra poco."}</p>
        </div>
      </div>
    </div>
  );
}

export function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="group inline-flex min-h-12 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-0.5 hover:border-field hover:text-field disabled:cursor-not-allowed disabled:opacity-50">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-field/10 text-field transition group-hover:bg-field group-hover:text-white">
        <Icon size={18} />
      </span>
      {label}
    </button>
  );
}

export function ReportCard({
  title,
  description,
  icon: Icon,
  action = "Apri report",
  onAction,
  children
}: {
  title: string;
  description: string;
  icon: ElementType;
  action?: string;
  onAction: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="card p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-finance-light text-finance">
          <Icon size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
      <button className="btn-secondary mt-5 w-full" type="button" onClick={onAction}>{action}</button>
    </div>
  );
}

export function FileUploadCard({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-field/40 bg-field/5 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-field shadow-sm">
          <FileUp size={22} />
        </div>
        <div>
          <p className="font-semibold text-ink">Carica documento</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">PDF, foto o ricevute. La validazione sicura resta lato server.</p>
          <button className="btn-primary mt-4" type="button" onClick={onSelect}>Seleziona file</button>
        </div>
      </div>
    </div>
  );
}

export function ActionButton({
  children,
  className = "btn-secondary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={className} {...props}>
      {children}
    </button>
  );
}

export function ToastMessage({ tone = "info", title, detail, onClose }: { tone?: StatusTone; title: string; detail?: string; onClose: () => void }) {
  return (
    <div className={`fixed right-4 top-4 z-50 max-w-sm rounded-2xl border p-4 text-sm shadow-soft ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">{title}</p>
          {detail && <p className="mt-1 leading-5">{detail}</p>}
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 font-bold hover:bg-white/60" aria-label="Chiudi notifica">×</button>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex gap-3">
        <AlertTriangle size={18} className="mt-0.5" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 leading-6">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function TimelineItem({ title, detail, tone = "success" }: { title: string; detail: string; tone?: StatusTone }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? Clock3 : AlertTriangle;
  return (
    <div className="flex gap-3">
      <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${toneClasses[tone]}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-stone-500">{detail}</p>
      </div>
    </div>
  );
}
