import { CalendarDays, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { AnalyticsFiltersState } from "../api/analyticsApi";

const presets = [
  ["ultimo-mese", "Ultimo mese"],
  ["ultimo-trimestre", "Ultimo trimestre"],
  ["ultimi-6-mesi", "Ultimi 6 mesi"],
  ["anno-corrente", "Anno corrente"],
  ["anno-precedente", "Anno precedente"],
  ["stagione-corrente", "Stagione corrente"]
] as const;

export function AnalyticsFilters({
  filters,
  onChange,
  onReset
}: {
  filters: AnalyticsFiltersState;
  onChange: (filters: AnalyticsFiltersState) => void;
  onReset: () => void;
}) {
  const set = (key: keyof AnalyticsFiltersState, value: string | boolean) => onChange({ ...filters, [key]: value });
  return (
    <div className="sticky top-[73px] z-10 rounded-2xl border border-line bg-white/92 p-4 shadow-card backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-field/10 text-field">
              <SlidersHorizontal size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">Filtri analitici</h2>
              <p className="text-xs text-stone-500">Ogni filtro viene validato lato server.</p>
            </div>
          </div>
          <button onClick={onReset} className="btn-secondary"><RotateCcw size={16} />Reimposta filtri</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-sm font-semibold text-stone-700">
            Periodo
            <select className="input" value={filters.preset} onChange={(event) => set("preset", event.target.value)}>
              {presets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-stone-700">
            Da
            <span className="relative block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input className="input pl-9" type="date" value={filters.startDate} onChange={(event) => set("startDate", event.target.value)} />
            </span>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-stone-700">
            A
            <span className="relative block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input className="input pl-9" type="date" value={filters.endDate} onChange={(event) => set("endDate", event.target.value)} />
            </span>
          </label>
          <label className="flex min-h-[66px] items-center justify-between gap-3 rounded-xl border border-line bg-stone-50 px-3.5 py-3 text-sm font-semibold text-stone-700 transition hover:border-field/40">
            Confronta con periodo precedente
            <input className="h-5 w-5 accent-field" type="checkbox" checked={filters.comparePrevious} onChange={(event) => set("comparePrevious", event.target.checked)} />
          </label>
          <input className="input" placeholder="Coltura" value={filters.cropId} onChange={(event) => set("cropId", event.target.value)} />
          <input className="input" placeholder="Campo" value={filters.fieldId} onChange={(event) => set("fieldId", event.target.value)} />
          <input className="input" placeholder="Lavoratore" value={filters.workerId} onChange={(event) => set("workerId", event.target.value)} />
          <input className="input" placeholder="Categoria spesa" value={filters.expenseCategory} onChange={(event) => set("expenseCategory", event.target.value)} />
        </div>
      </div>
    </div>
  );
}
