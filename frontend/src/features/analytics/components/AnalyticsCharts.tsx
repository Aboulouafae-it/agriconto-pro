import type { ReactNode } from "react";
import { MoneyValue, StatusBadge } from "../../../components/design-system";
import type { ChartPoint } from "../types";

function numeric(value: unknown) {
  return Number(value ?? 0);
}

function maxValue(points: ChartPoint[], keys: string[]) {
  return Math.max(...points.flatMap((point) => keys.map((key) => Math.abs(numeric(point[key])))), 1);
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-field/40 via-finance/30 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-1 text-sm leading-6 text-stone-600">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-500">BI</span>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function MultiLineChart({ data, keys }: { data: ChartPoint[]; keys: Array<{ key: string; label: string; className: string }> }) {
  const max = maxValue(data, keys.map((item) => item.key));
  if (!data.length) return <NoChartData />;
  return (
    <div>
      <div className="relative flex h-72 items-end gap-2 overflow-hidden rounded-2xl border border-line bg-[linear-gradient(to_bottom,#fbfcfa,#f3f6f1)] p-4">
        <div className="pointer-events-none absolute inset-4 rounded-xl bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_39px,rgba(24,33,29,0.07)_40px)]" />
        {data.map((point, index) => (
          <div key={`${point.period ?? point.label}-${index}`} className="relative z-[1] flex h-full flex-1 items-end gap-1">
            {keys.map((item) => (
              <div
                key={item.key}
                className={`min-h-2 flex-1 rounded-t-lg shadow-sm transition hover:opacity-80 ${item.className}`}
                style={{ height: `${Math.max(4, (numeric(point[item.key]) / max) * 100)}%` }}
                title={`${item.label}: ${numeric(point[item.key]).toLocaleString("it-IT")}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-stone-600">
        {keys.map((item) => <span key={item.key} className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />{item.label}</span>)}
      </div>
    </div>
  );
}

export function BarChart({ data, valueKey = "value" }: { data: ChartPoint[]; valueKey?: string }) {
  const max = maxValue(data, [valueKey]);
  if (!data.length) return <NoChartData />;
  return (
    <div className="space-y-3.5">
      {data.slice(0, 10).map((item, index) => {
        const value = numeric(item[valueKey]);
        return (
          <div key={`${item.label}-${index}`} className="grid grid-cols-[minmax(110px,0.8fr)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate font-semibold text-stone-700">{String(item.label ?? item.period ?? "Voce")}</span>
            <div className="h-3.5 rounded-full bg-stone-100 shadow-inner">
              <div className="h-3.5 rounded-full bg-gradient-to-r from-field to-finance shadow-sm" style={{ width: `${Math.max(3, (Math.abs(value) / max) * 100)}%` }} />
            </div>
            <MoneyValue value={value} className="text-xs font-bold text-ink" />
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({ data }: { data: ChartPoint[] }) {
  const total = data.reduce((sum, item) => sum + numeric(item.value), 0);
  const first = total ? (numeric(data[0]?.value) / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div
        className="h-40 w-40 shrink-0 rounded-full p-2 shadow-inner"
        style={{ background: `conic-gradient(#2f6f53 0 ${first}%, #1c4a6d ${first}% 78%, #d9a441 78% 100%)` }}
        aria-label="Grafico a ciambella"
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-white text-center shadow-sm">
          <span>
            <span className="block text-2xl font-bold text-ink">{Math.round(total)}</span>
            <span className="block text-xs font-semibold text-stone-500">totale</span>
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {data.map((item) => (
          <div key={String(item.label)} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-stone-50 px-3 py-2 text-sm">
            <span className="truncate font-semibold text-stone-700">{String(item.label)}</span>
            <span className="font-bold text-ink">{numeric(item.value).toLocaleString("it-IT")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Treemap({ data }: { data: ChartPoint[] }) {
  const max = maxValue(data, ["value"]);
  if (!data.length) return <NoChartData />;
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {data.slice(0, 8).map((item, index) => (
        <button
          key={`${item.label}-${index}`}
          className="rounded-xl border border-line bg-gradient-to-br from-field/10 to-finance/5 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-field hover:bg-field/15"
          style={{ minHeight: `${Math.max(72, 72 + (numeric(item.value) / max) * 70)}px` }}
        >
          <p className="text-sm font-bold text-ink">{String(item.label)}</p>
          <p className="mt-2 text-xs text-stone-600"><MoneyValue value={item.value} /></p>
        </button>
      ))}
    </div>
  );
}

export function Heatmap({ data }: { data: ChartPoint[] }) {
  const max = maxValue(data, ["value"]);
  if (!data.length) return <NoChartData />;
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 rounded-2xl border border-line bg-stone-50 p-3">
      {data.slice(0, 35).map((item, index) => {
        const opacity = Math.max(0.18, numeric(item.value) / max);
        return (
          <div key={`${item.date}-${index}`} className="aspect-square rounded-md border border-white shadow-sm" style={{ backgroundColor: `rgba(47, 111, 83, ${opacity})` }} title={`${item.date}: ${item.value}`} />
        );
      })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-stone-500">
        <span>Bassa intensita</span>
        <span>Alta intensita</span>
      </div>
    </div>
  );
}

export function Waterfall({ data }: { data: ChartPoint[] }) {
  const max = maxValue(data, ["value"]);
  return (
    <div className="grid h-56 grid-cols-3 items-end gap-4 rounded-2xl border border-line bg-[linear-gradient(to_bottom,#fbfcfa,#f2f5f0)] p-4">
      {data.map((item) => {
        const value = numeric(item.value);
        const tone = value >= 0 ? "bg-field" : "bg-danger";
        return (
          <div key={String(item.label)} className="flex h-full flex-col justify-end">
            <div className={`rounded-t-xl shadow-sm ${tone}`} style={{ height: `${Math.max(8, (Math.abs(value) / max) * 100)}%` }} />
            <p className="mt-2 text-center text-xs font-bold text-stone-700">{String(item.label)}</p>
          </div>
        );
      })}
    </div>
  );
}

export function Funnel({ data }: { data: ChartPoint[] }) {
  const max = maxValue(data, ["value"]);
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-stone-50 p-4">
      {data.slice(0, 6).map((item, index) => (
        <div key={`${item.label}-${index}`} className="mx-auto rounded-xl bg-finance px-4 py-3 text-center text-sm font-bold text-white shadow-sm" style={{ width: `${Math.max(44, (numeric(item.value) / max) * 100)}%` }}>
          {String(item.label)} · {numeric(item.value).toLocaleString("it-IT")}
        </div>
      ))}
    </div>
  );
}

export function InsightList({ insights }: { insights: Array<{ title: string; detail: string; tone?: "success" | "warning" | "danger" | "info" | "neutral" }> }) {
  if (!insights.length) return <NoChartData label="Nessun indicatore critico nel periodo selezionato." />;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {insights.map((item) => (
        <div key={item.title} className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <StatusBadge tone={item.tone ?? "info"}>{item.title}</StatusBadge>
          <p className="mt-3 text-sm leading-6 text-stone-600">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function NoChartData({ label = "Dati non ancora sufficienti per questa visualizzazione." }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-[linear-gradient(135deg,#fbfcfa,#f1f5ef)] p-6 text-sm leading-6 text-stone-600">
      <p className="font-semibold text-ink">Vista in attesa di dati</p>
      <p className="mt-1">{label}</p>
    </div>
  );
}
