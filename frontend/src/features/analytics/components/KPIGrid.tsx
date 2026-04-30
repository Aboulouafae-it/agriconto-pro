import type { ElementType, ReactNode } from "react";
import { AlertTriangle, BadgeEuro, CirclePercent, FileWarning, Landmark, MapPinned, Receipt, Sprout, TrendingUp, Users, WalletCards } from "lucide-react";
import { MoneyValue } from "../../../components/design-system";

export function KPIGrid({ kpis }: { kpis: Record<string, unknown> }) {
  const crop = kpis.most_profitable_crop as { name?: string; estimated_profit?: number } | null | undefined;
  const field = kpis.most_profitable_field as { name?: string; net_result?: number } | null | undefined;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-4">
        <PremiumKpi label="Ricavi totali" value={<MoneyValue value={kpis.total_revenue} />} icon={Landmark} tone="success" detail="Vendite nel periodo filtrato." featured />
        <PremiumKpi label="Spese totali" value={<MoneyValue value={kpis.total_expenses} />} icon={Receipt} tone="warning" detail="Costi registrati e allocati." featured />
        <PremiumKpi label="Risultato netto" value={<MoneyValue value={kpis.net_result} />} icon={BadgeEuro} tone="info" detail="Indicatore gestionale, non fiscale." featured />
        <PremiumKpi label="Costo lavoro" value={<MoneyValue value={kpis.labor_cost} />} icon={Users} tone="neutral" detail="Ore lavorate per tariffa registrata." featured />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumKpi label="Vendite non incassate" value={<MoneyValue value={kpis.unpaid_sales} />} icon={WalletCards} tone="warning" detail="Stato incassi pronto per estensione." />
        <PremiumKpi label="Spese non pagate" value={<MoneyValue value={kpis.unpaid_expenses} />} icon={AlertTriangle} tone="warning" detail="Tracciamento pagamenti previsto." />
        <PremiumKpi label="Documenti mancanti" value={String(kpis.missing_documents ?? 0)} icon={FileWarning} tone="danger" detail="Priorita per controllo documentale." />
        <PremiumKpi label="Coltura piu redditizia" value={crop?.name ?? "-"} icon={Sprout} tone="success" detail={crop ? `Profitto stimato: EUR ${Number(crop.estimated_profit ?? 0).toLocaleString("it-IT")}` : "Nessuna coltura nel periodo."} />
        <PremiumKpi label="Campo piu redditizio" value={field?.name ?? "-"} icon={MapPinned} tone="success" detail={field ? `Netto stimato: EUR ${Number(field.net_result ?? 0).toLocaleString("it-IT")}` : "Nessun campo nel periodo."} />
        <PremiumKpi label="Margine medio" value={`${Number(kpis.average_margin ?? 0).toFixed(1)}%`} icon={CirclePercent} tone="info" detail="Risultato netto su ricavi." />
        <PremiumKpi label="Incidenza lavoro" value={`${Number(kpis.labor_cost_ratio ?? 0).toFixed(1)}%`} icon={Users} tone="warning" detail="Costo lavoro rispetto ai ricavi." />
        <PremiumKpi label="Completezza documentale" value={`${Number(kpis.document_completeness_rate ?? 0).toFixed(0)}%`} icon={FileWarning} tone="info" detail="Documenti presenti sul totale atteso." />
      </div>
    </div>
  );
}

function PremiumKpi({
  label,
  value,
  icon: Icon,
  tone,
  detail,
  featured = false
}: {
  label: string;
  value: ReactNode;
  icon: ElementType;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  detail: string;
  featured?: boolean;
}) {
  const toneClass = {
    success: "bg-field/10 text-field border-field/15",
    warning: "bg-amber-50 text-warning border-amber-200",
    danger: "bg-red-50 text-danger border-red-200",
    info: "bg-finance-light text-finance border-blue-100",
    neutral: "bg-stone-100 text-stone-700 border-stone-200"
  }[tone];
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft ${featured ? "min-h-[176px]" : "min-h-[154px]"}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-field via-finance to-harvest" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
          <p className={`${featured ? "text-3xl" : "text-2xl"} mt-3 truncate font-bold tracking-tight text-ink`}>{value}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${toneClass}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-stone-600">{detail}</p>
      {featured && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600">
          <TrendingUp size={13} />
          Indicatore chiave
        </div>
      )}
    </div>
  );
}
