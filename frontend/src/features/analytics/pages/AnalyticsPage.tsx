import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BarChart3, Brain, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { ErrorState, LoadingState, EmptyState, StatusBadge, ToastMessage } from "../../../components/design-system";
import { useAuth } from "../../../auth/AuthProvider";
import { useFarm } from "../../useFarm";
import { AnalyticsFiltersState, fetchAnalyticsOverview, fetchAnalyticsSection } from "../api/analyticsApi";
import { AnalyticsFilters } from "../components/AnalyticsFilters";
import { AnalyticsHeader } from "../components/AnalyticsHeader";
import {
  AdvancedInsightsSection,
  ComparisonAnalyticsSection,
  CropAnalyticsSection,
  DetailTablesSection,
  DocumentAnalyticsSection,
  ExpenseAnalyticsSection,
  FieldAnalyticsSection,
  FinancialOverviewSection,
  LaborAnalyticsSection,
  SalesAnalyticsSection
} from "../components/AnalyticsSections";
import { KPIGrid } from "../components/KPIGrid";
import type { AnalyticsDataset, Insight } from "../types";

const defaultFilters: AnalyticsFiltersState = {
  preset: "anno-corrente",
  startDate: "",
  endDate: "",
  cropId: "",
  fieldId: "",
  workerId: "",
  supplierId: "",
  customerId: "",
  expenseCategory: "",
  documentStatus: "",
  comparePrevious: true
};

const sections = [
  "financial",
  "crops",
  "fields",
  "labor",
  "expenses",
  "sales",
  "documents",
  "comparison",
  "advanced-metrics",
  "tables"
] as const;

const financialSections = ["financial", "crops", "fields", "expenses", "sales", "documents", "comparison", "advanced-metrics", "tables"] as const;
const laborSections = ["labor"] as const;

export function AnalyticsPage() {
  const farm = useFarm();
  const auth = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const visibleSections = auth.role === "LABOR_CONSULTANT" ? laborSections : auth.role === "WORKER" ? [] : sections;
  const overview = useQuery({
    queryKey: ["analytics", farm.currentFarmId, "overview", filters],
    queryFn: () => fetchAnalyticsOverview(farm.currentFarmId!, filters),
    enabled: Boolean(farm.currentFarmId)
  });
  const sectionQueries = useQueries({
    queries: visibleSections.map((section) => ({
      queryKey: ["analytics", farm.currentFarmId, section, filters],
      queryFn: () => fetchAnalyticsSection(farm.currentFarmId!, section, filters),
      enabled: Boolean(farm.currentFarmId)
    }))
  });

  const dataBySection = useMemo(() => {
    return visibleSections.reduce<Record<string, AnalyticsDataset>>((accumulator, section, index) => {
      accumulator[section] = sectionQueries[index].data?.data ?? {};
      return accumulator;
    }, {});
  }, [sectionQueries, visibleSections]);

  const isLoadingSections = sectionQueries.some((query) => query.isLoading);
  const hasSectionError = sectionQueries.some((query) => query.isError);
  const overviewData = overview.data?.data;
  const overviewInsights = (overviewData?.top_insights ?? []) as Insight[];

  function exportSummary() {
    const payload = {
      farm: farm.currentFarm?.name,
      generated_at: new Date().toISOString(),
      filters,
      overview: overviewData,
      note: "Export locale del centro analitico. I report ufficiali devono essere verificati da professionisti qualificati."
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agriconto-analisi.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast({ title: "Dati esportati", detail: "Il file JSON con i dati analitici è stato scaricato sul tuo dispositivo." });
  }

  function saveView() {
    const savedViews = JSON.parse(localStorage.getItem("agriconto.analytics.views") ?? "[]") as unknown[];
    const view = {
      id: crypto.randomUUID(),
      name: `Vista ${new Date().toLocaleString("it-IT")}`,
      farm_id: farm.currentFarmId,
      farm: farm.currentFarm?.name,
      filters,
      created_at: new Date().toISOString()
    };
    localStorage.setItem("agriconto.analytics.views", JSON.stringify([view, ...savedViews].slice(0, 10)));
    setToast({ title: "Vista salvata", detail: "La configurazione dei filtri è stata salvata localmente su questo dispositivo." });
  }

  return (
    <section className="space-y-8">
      {toast && <ToastMessage tone="success" title={toast.title} detail={toast.detail} onClose={() => setToast(null)} />}
      <AnalyticsHeader onExport={exportSummary} onSaveView={saveView} />
      <AnalyticsFilters filters={filters} onChange={setFilters} onReset={() => setFilters(defaultFilters)} />

      {farm.isLoading && <LoadingState label="Caricamento azienda..." />}
      {!farm.currentFarmId && !farm.isLoading && (
        <EmptyState
          title="Configura un'azienda"
          detail="Il centro analitico richiede una farm attiva e permessi validi."
          actionLabel="Configura azienda"
        />
      )}
      {overview.isError && <ErrorState detail="Non hai accesso al centro analitico per questa azienda o i filtri non sono validi." />}
      {overview.isLoading && <LoadingState label="Calcolo KPI analitici..." />}

      {overviewData && (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <div className="flex flex-wrap gap-2">
                {["Economia", "Colture", "Campi", "Lavoro", "Spese", "Vendite", "Documenti", "Confronti", "Indicatori"].map((label) => (
                  <span key={label} className="rounded-full border border-line bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-600">
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="success"><ShieldCheck size={13} />Permessi verificati</StatusBadge>
              <StatusBadge tone="info"><BarChart3 size={13} />JSON aggregato</StatusBadge>
              <StatusBadge tone="warning"><FileCheck2 size={13} />Export locale</StatusBadge>
            </div>
          </div>

          <KPIGrid kpis={overviewData.kpis ?? {}} />
          {overviewInsights.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-finance-light text-finance">
                  <Brain size={21} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-ink">Sintesi intelligente</h2>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {overviewInsights.map((insight) => (
                      <div key={insight.title} className="rounded-xl border border-line bg-stone-50 p-3">
                        <p className="text-sm font-bold text-ink">{insight.title}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-600">{insight.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {isLoadingSections && (
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-center gap-3 text-sm font-semibold text-stone-600">
                <Loader2 className="animate-spin text-field" size={18} />
                Caricamento sezioni avanzate e aggregazioni...
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-stone-100" />)}
              </div>
            </div>
          )}
          {hasSectionError && <ErrorState detail="Alcune sezioni non sono disponibili per il tuo ruolo o per il periodo selezionato." />}

          {financialSections.includes("financial") && dataBySection.financial && <FinancialOverviewSection data={dataBySection.financial} />}
          {dataBySection.crops && <CropAnalyticsSection data={dataBySection.crops} />}
          {dataBySection.fields && <FieldAnalyticsSection data={dataBySection.fields} />}
          <LaborAnalyticsSection data={dataBySection.labor} />
          {dataBySection.expenses && <ExpenseAnalyticsSection data={dataBySection.expenses} />}
          {dataBySection.sales && <SalesAnalyticsSection data={dataBySection.sales} />}
          {dataBySection.documents && <DocumentAnalyticsSection data={dataBySection.documents} />}
          {dataBySection.comparison && <ComparisonAnalyticsSection data={dataBySection.comparison} />}
          {dataBySection["advanced-metrics"] && <AdvancedInsightsSection data={dataBySection["advanced-metrics"]} overviewInsights={overviewInsights} />}
          {dataBySection.tables && <DetailTablesSection data={dataBySection.tables} />}

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900 shadow-sm">
            <strong>Nota professionale.</strong> Il Centro Statistiche e Analisi supporta decisioni gestionali e preparazione dati.
            Non sostituisce commercialista, consulente del lavoro, INPS, INAIL, Agenzia delle Entrate o sistemi ufficiali.
          </div>
        </>
      )}
    </section>
  );
}
