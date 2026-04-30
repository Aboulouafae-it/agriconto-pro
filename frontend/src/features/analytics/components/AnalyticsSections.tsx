import { ArrowDownRight, ArrowUpRight, Download, ExternalLink, MapPinned, TableProperties } from "lucide-react";
import { DataTable, MoneyValue, StatusBadge } from "../../../components/design-system";
import type { ChartPoint } from "../types";
import { BarChart, ChartCard, DonutChart, Funnel, Heatmap, InsightList, MultiLineChart, NoChartData, Treemap, Waterfall } from "./AnalyticsCharts";

function list(value: unknown): ChartPoint[] {
  return Array.isArray(value) ? (value as ChartPoint[]) : [];
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function SectionShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border border-line bg-white/55 p-4 shadow-sm md:p-5">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-field">Modulo analitico</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{subtitle}</p>
        </div>
        <button className="btn-secondary"><Download size={16} />Esporta sezione</button>
      </div>
      {children}
    </section>
  );
}

export function FinancialOverviewSection({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionShell title="Panoramica Economica" subtitle="Ricavi, spese, risultato netto e andamento cumulativo nel periodo selezionato.">
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Ricavi vs spese vs netto" subtitle="Trend mensile comparato">
          <MultiLineChart data={list(data.timeline)} keys={[{ key: "revenue", label: "Ricavi", className: "bg-field" }, { key: "expenses", label: "Spese", className: "bg-warning" }, { key: "net_result", label: "Netto", className: "bg-finance" }]} />
        </ChartCard>
        <ChartCard title="Waterfall gestionale" subtitle="Dal fatturato al risultato netto">
          <Waterfall data={list(data.waterfall)} />
        </ChartCard>
        <ChartCard title="Ricavi mensili" subtitle="Concentrazione ricavi per mese">
          <BarChart data={list(data.monthly_revenues)} />
        </ChartCard>
        <ChartCard title="Spese mensili" subtitle="Concentrazione costi per mese">
          <BarChart data={list(data.monthly_expenses)} />
        </ChartCard>
      </div>
    </SectionShell>
  );
}

export function CropAnalyticsSection({ data }: { data: Record<string, unknown> }) {
  const rows = list(data.ranking);
  return (
    <SectionShell title="Analisi Redditivita Colture" subtitle="Capisci quali colture generano valore e quali richiedono attenzione.">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Profitto per coltura" subtitle="Ricavi meno spese e costo lavoro">
          <BarChart data={list(data.profit_by_crop)} />
        </ChartCard>
        <ChartCard title="Contributo ricavi" subtitle="Treemap delle colture sul fatturato">
          <Treemap data={list(data.revenue_contribution)} />
        </ChartCard>
      </div>
      <DataTable
        columns={["Coltura", "Ricavi", "Costi", "Lavoro", "Profitto", "Stato"]}
        rows={rows.map((row) => ({
          id: String(row.id),
          cells: [
            <button className="inline-flex items-center gap-1 font-bold text-field">{String(row.name)}<ExternalLink size={13} /></button>,
            <MoneyValue value={row.linked_sales} />,
            <MoneyValue value={row.linked_expenses} />,
            <MoneyValue value={row.linked_labor_cost} />,
            <MoneyValue value={row.estimated_profit} />,
            <StatusBadge tone={String(row.status) === "Critica" ? "danger" : String(row.status) === "Da monitorare" ? "warning" : "success"}>{String(row.status)}</StatusBadge>
          ]
        }))}
        empty={<NoChartData label="Nessuna coltura disponibile nel periodo." />}
      />
    </SectionShell>
  );
}

export function FieldAnalyticsSection({ data }: { data: Record<string, unknown> }) {
  const rows = list(data.ranking);
  return (
    <SectionShell title="Analisi Campi" subtitle="Prestazioni economiche per superficie, colture collegate e produttivita per ettaro.">
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Profitto per campo"><BarChart data={list(data.profit_by_field)} /></ChartCard>
        <ChartCard title="Mappa campi" subtitle="Geografia operativa e redditivita per appezzamento">
          <MapPanel note={String(data.map_note ?? "Coordinate non disponibili: la vista mappa si attivera quando saranno presenti dati geografici.")} />
        </ChartCard>
      </div>
      <DataTable
        columns={["Campo", "Ettari", "Colture", "Ricavi", "Costi", "Netto"]}
        rows={rows.map((row) => ({
          id: String(row.id),
          cells: [String(row.name), String(row.area_hectares ?? "-"), list(row.linked_crops).join(", ") || "-", <MoneyValue value={row.total_revenue} />, <MoneyValue value={row.total_cost} />, <MoneyValue value={row.net_result} />]
        }))}
        empty={<NoChartData label="Nessun campo presente." />}
      />
    </SectionShell>
  );
}

export function LaborAnalyticsSection({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionShell title="Analisi Lavoratori e Manodopera" subtitle="Costo del lavoro, saldi, distribuzione attivita e stagionalita operativa.">
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Compensi per lavoratore"><BarChart data={list(data.earnings_by_worker)} /></ChartCard>
        <ChartCard title="Distribuzione attivita"><Funnel data={list(data.task_distribution)} /></ChartCard>
        <ChartCard title="Heatmap giornate"><Heatmap data={list(data.workday_heatmap)} /></ChartCard>
      </div>
      <DataTable
        columns={["Lavoratore", "Ore", "Maturato", "Acconti", "Pagamenti", "Saldo"]}
        rows={list(data.worker_ranking).map((row) => ({
          id: String(row.id),
          cells: [String(row.name), String(row.total_hours), <MoneyValue value={row.total_earned} />, <MoneyValue value={row.advances} />, <MoneyValue value={row.payments} />, <MoneyValue value={row.remaining_balance} />]
        }))}
        empty={<NoChartData label="Nessun dato manodopera nel periodo." />}
      />
    </SectionShell>
  );
}

export function ExpenseAnalyticsSection({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionShell title="Analisi Spese" subtitle="Categorie, fornitori, trend, intensita e concentrazione dei costi.">
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Spese per categoria"><DonutChart data={list(data.by_category)} /></ChartCard>
        <ChartCard title="Spese per fornitore"><Treemap data={list(data.by_supplier)} /></ChartCard>
        <ChartCard title="Pareto fornitori"><Funnel data={list(object(data.pareto).items)} /></ChartCard>
      </div>
      <ChartCard title="Trend spese"><BarChart data={list(data.trend)} /></ChartCard>
    </SectionShell>
  );
}

export function SalesAnalyticsSection({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionShell title="Analisi Vendite e Incassi" subtitle="Clienti, colture/prodotti, incassi e segnali sui crediti commerciali.">
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Vendite per cliente"><BarChart data={list(data.by_customer)} /></ChartCard>
        <ChartCard title="Pagate vs non incassate"><DonutChart data={list(data.paid_vs_unpaid)} /></ChartCard>
        <ChartCard title="Vendite per coltura"><DonutChart data={list(data.by_crop)} /></ChartCard>
      </div>
    </SectionShell>
  );
}

export function DocumentAnalyticsSection({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionShell title="Analisi Documentale" subtitle="Completezza documenti, richieste aperte e priorita per titolare e commercialista.">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <ChartCard title="Tasso completezza"><DonutChart data={list(data.completeness_donut)} /></ChartCard>
        <DataTable
          columns={["Tipo", "Elemento", "Stato", "Priorita"]}
          rows={list(data.missing_items).map((row, index) => ({
            id: `${row.type}-${index}`,
            cells: [String(row.type), String(row.label), <StatusBadge tone="warning">{String(row.status)}</StatusBadge>, String(row.priority)]
          }))}
          empty={<NoChartData label="Nessun documento mancante nel periodo." />}
        />
      </div>
    </SectionShell>
  );
}

export function ComparisonAnalyticsSection({ data }: { data: Record<string, unknown> }) {
  const current = object(data.current_period);
  const previous = object(data.previous_period);
  return (
    <SectionShell title="Confronti Periodici" subtitle="Lettura comparativa tra periodo corrente e precedente, pronta per estensioni stagionali.">
      <div className="grid gap-4 md:grid-cols-2">
        {[["Periodo corrente", current], ["Periodo precedente", previous]].map(([label, values]) => (
          <div key={String(label)} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="border-b border-line bg-stone-50 px-5 py-4">
              <h3 className="section-title">{String(label)}</h3>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <Metric label="Ricavi" value={<MoneyValue value={object(values).total_revenue} />} />
              <Metric label="Spese" value={<MoneyValue value={object(values).total_expenses} />} />
              <Metric label="Netto" value={<MoneyValue value={object(values).net_result} />} />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function AdvancedInsightsSection({ data, overviewInsights }: { data: Record<string, unknown>; overviewInsights: Array<{ title: string; detail: string; tone?: "success" | "warning" | "danger" | "info" | "neutral" }> }) {
  return (
    <SectionShell title="Indicatori Avanzati" subtitle="Rapporti gestionali e avvisi intelligenti senza logica fiscale o payroll ufficiale.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {list(data.indicators).map((indicator) => (
          <Metric key={String(indicator.label)} label={String(indicator.label)} value={`${indicator.value ?? "-"} ${indicator.unit ?? ""}`} />
        ))}
      </div>
      <InsightList insights={[...overviewInsights, ...list(data.alerts).map((item) => ({ title: String(item.title), detail: String(item.detail), tone: item.tone as "success" | "warning" | "danger" | "info" | "neutral" }))]} />
    </SectionShell>
  );
}

export function DetailTablesSection({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionShell title="Tabelle di Dettaglio" subtitle="Tabelle operative leggibili, filtrabili ed esportabili per analisi contabile.">
      <div className="rounded-2xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-stone-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <TableProperties size={18} className="text-field" />
            <h3 className="section-title">Spese analitiche</h3>
          </div>
          <span className="text-xs font-semibold text-stone-500">Ordinamento, CSV e PDF pronti per estensione</span>
        </div>
        <DataTable
          columns={["Categoria", "Data/Voce", "Importo", "Dettaglio"]}
          rows={list(data.expense_table).map((row) => ({
            id: String(row.id),
            cells: [String(row.category), String(row.date), <MoneyValue value={row.amount} />, String(row.description ?? "-")]
          }))}
          empty={<NoChartData label="Nessuna riga disponibile." />}
        />
      </div>
    </SectionShell>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
        {String(value).startsWith("-") ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
        Valore gestionale
      </p>
    </div>
  );
}

function MapPanel({ note }: { note: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[linear-gradient(135deg,#eef4ea,#f8faf7)] p-5">
      <div className="absolute inset-0 opacity-60">
        <div className="h-full w-full bg-[linear-gradient(90deg,rgba(47,111,83,0.10)_1px,transparent_1px),linear-gradient(rgba(47,111,83,0.10)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>
      <div className="relative grid min-h-64 place-items-center rounded-2xl border border-white/70 bg-white/55 p-6 text-center shadow-inner">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-field text-white shadow-soft">
            <MapPinned size={26} />
          </div>
          <h3 className="mt-4 text-base font-bold text-ink">Mappa pronta per coordinate campo</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">{note}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <StatusBadge tone="info">Redditivita</StatusBadge>
            <StatusBadge tone="success">Produzione</StatusBadge>
            <StatusBadge tone="warning">Costo per ettaro</StatusBadge>
          </div>
        </div>
      </div>
    </div>
  );
}
