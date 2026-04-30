import { BarChart3, CalendarRange, Download, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { StatusBadge } from "../../../components/design-system";

export function AnalyticsHeader({ onExport, onSaveView }: { onExport: () => void; onSaveView: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden bg-finance p-6 text-white md:p-8">
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                <Sparkles size={14} />
                Centro Analitico
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                <CalendarRange size={14} />
                Business intelligence agricola
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
              Statistiche e Analisi
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78 md:text-base">
              Analizza in profondità ricavi, costi, lavoratori, colture, documenti e andamento aziendale con viste gestionali pronte per titolare e commercialista.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">KPI direzionali</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">Drill-down operativo</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">Export verificabile</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-5 bg-stone-50 p-6 md:p-8">
          <div className="space-y-2">
            <StatusBadge tone="success"><ShieldCheck size={13} />Accesso sicuro</StatusBadge>
            <StatusBadge tone="info"><FileText size={13} />Dati verificabili</StatusBadge>
            <p className="pt-2 text-sm leading-6 text-stone-600">
              I permessi restano verificati lato server. La UI mostra solo viste coerenti con il ruolo.
            </p>
          </div>
          <div className="grid gap-2">
            <button onClick={onExport} className="btn-primary w-full" title="Esporta i dati del pannello analitico in formato JSON">
              <Download size={17} />Esporta dati (JSON)
            </button>
            <button type="button" onClick={onSaveView} className="btn-secondary w-full"><BarChart3 size={17} />Salva vista</button>
            <p className="text-center text-xs text-stone-500">Export PDF analitico in sviluppo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
