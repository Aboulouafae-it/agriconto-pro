import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CheckCircle2, FileWarning, Landmark, Leaf, Receipt, Upload, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MoneyValue,
  QuickActionButton,
  StatCard,
  TimelineItem
} from "../components/design-system";
import { useFarm } from "../features/useFarm";

const quickActions = [
  { label: "Nuova spesa", icon: Receipt, to: "/spese?action=new" },
  { label: "Nuova giornata", icon: WalletCards, to: "/giornate?action=new" },
  { label: "Carica documento", icon: Upload, to: "/documenti?action=new" },
  { label: "Nuova vendita", icon: Landmark, to: "/vendite?action=new" }
];

export function Dashboard() {
  const farm = useFarm();
  const navigate = useNavigate();
  const month = new Date();

  const report = useQuery({
    queryKey: ["report", farm.currentFarmId, "monthly"],
    queryFn: () =>
      apiClient.report(farm.currentFarmId!, "monthly", `?year=${month.getFullYear()}&month=${month.getMonth() + 1}`),
    enabled: Boolean(farm.currentFarmId)
  });

  const cropReport = useQuery({
    queryKey: ["report", farm.currentFarmId, "crops"],
    queryFn: () => apiClient.report(farm.currentFarmId!, "crops"),
    enabled: Boolean(farm.currentFarmId)
  });

  const missingReport = useQuery({
    queryKey: ["report", farm.currentFarmId, "missing-documents"],
    queryFn: () => apiClient.report(farm.currentFarmId!, "missing-documents"),
    enabled: Boolean(farm.currentFarmId)
  });

  const data = report.data?.data ?? {};

  // Top crop by estimated profit — computed from real crop profitability data
  const crops = (cropReport.data?.data as { crops?: Array<{ crop_name: string; estimated_profit: number }> })?.crops ?? [];
  const topCrop =
    crops.length === 0
      ? null
      : crops.reduce((best, c) => (c.estimated_profit > best.estimated_profit ? c : best), crops[0]);

  // Readiness: compute from missing-documents report (lower missing count = higher readiness)
  const missingData = missingReport.data?.data as { total_count?: number } | undefined;
  const missingCount = Number(missingData?.total_count ?? 0);
  const reportsLoaded = !missingReport.isLoading && missingReport.data != null;
  const readiness = reportsLoaded ? Math.max(0, Math.min(100, 100 - missingCount * 8)) : null;

  // Checklist items
  const checklist: Array<[string, "success" | "warning"]> = [
    ["Azienda configurata", farm.currentFarm ? "success" : "warning"],
    ["Documenti mancanti verificati", missingCount === 0 ? "success" : "warning"],
    ["Colture e campi registrati", crops.length > 0 ? "success" : "warning"],
    ["Dati catastali da verificare", "warning"]
  ];

  return (
    <section className="space-y-7">
      <PageHeader
        eyebrow="Cruscotto aziendale"
        title={farm.currentFarm?.name ?? "Dashboard"}
        subtitle="Una vista rapida su ricavi, spese, lavoro, documenti e priorità operative."
        actions={<span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">Dati verificabili</span>}
      />

      {farm.isLoading && <LoadingState label="Caricamento azienda..." />}
      {farm.error && <ErrorState title="Azienda non disponibile" detail="Non siamo riusciti a caricare l'azienda. Riprova tra poco o verifica la sessione." />}
      {!farm.currentFarmId && !farm.isLoading && (
        <EmptyState title="Configura un'azienda" detail="Crea o seleziona una farm per vedere il riepilogo operativo." actionLabel="Configura azienda" onAction={() => navigate("/azienda")} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => <QuickActionButton key={action.label} icon={action.icon} label={action.label} onClick={() => navigate(action.to)} disabled={!farm.currentFarmId} />)}
      </div>

      {report.isLoading && <LoadingState label="Calcolo riepilogo mensile..." />}
      {report.isError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Riepilogo in preparazione</p>
          <p className="mt-1">Mostriamo una vista parziale finché il report mensile non è disponibile per il ruolo corrente.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ricavi" value={<MoneyValue value={data.total_sales} />} icon={Landmark} tone="success" detail="Vendite registrate nel mese corrente." />
        <StatCard label="Spese" value={<MoneyValue value={data.total_expenses} />} icon={Receipt} tone="warning" detail="Costi aziendali collegati al periodo." />
        <StatCard label="Risultato netto" value={<MoneyValue value={data.net_result} />} icon={BarChart3} tone="info" detail="Ricavi meno spese, senza calcoli fiscali ufficiali." />
        <StatCard label="Salari da pagare" value={<MoneyValue value={data.unpaid_worker_balances} />} icon={WalletCards} tone="neutral" detail="Saldo operativo da riepilogo lavoratori." />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="section-title">Andamento mensile</h3>
              <p className="helper-text">Confronto semplice tra ricavi, spese e risultato netto.</p>
            </div>
            <span className="text-xs font-semibold text-stone-500">EUR</span>
          </div>
          <div className="mt-6 grid h-56 items-end gap-4 sm:grid-cols-3">
            {[
              ["Ricavi", Number(data.total_sales ?? 0), "bg-field"],
              ["Spese", Number(data.total_expenses ?? 0), "bg-warning"],
              ["Netto", Math.max(Number(data.net_result ?? 0), 0), "bg-finance"]
            ].map(([label, value, color]) => {
              const max = Math.max(Number(data.total_sales ?? 0), Number(data.total_expenses ?? 0), Math.abs(Number(data.net_result ?? 0)), 1);
              const height = Math.max(12, (Number(value) / max) * 100);
              return (
                <div key={label as string} className="flex h-full flex-col justify-end">
                  <div className="flex flex-1 items-end rounded-xl bg-stone-100 px-3 pb-3">
                    <div className={`w-full rounded-lg ${color as string}`} style={{ height: `${height}%` }} aria-label={`${label}: ${value}`} />
                  </div>
                  <p className="mt-2 text-center text-sm font-semibold text-stone-700">{label as string}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          <StatCard label="Documenti mancanti" value={String(data.missing_documents_count ?? 0)} icon={FileWarning} tone="danger" detail="Priorità per commercialista e tracciabilità." />
          <StatCard
            label="Vendite non incassate"
            value="Non tracciato"
            icon={Landmark}
            tone="warning"
            detail="Tracciamento pagamenti previsto in una prossima versione."
          />
          <StatCard
            label="Coltura più redditizia"
            value={
              cropReport.isLoading
                ? "..."
                : topCrop
                ? topCrop.crop_name
                : "Da calcolare"
            }
            icon={Leaf}
            tone="success"
            detail={
              topCrop
                ? `Margine stimato: ${new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(topCrop.estimated_profit)}`
                : crops.length === 0
                ? "Aggiungi colture per vedere il calcolo."
                : "Dati insufficienti."
            }
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="section-title">Attività recente</h3>
          <div className="mt-5 space-y-4">
            <TimelineItem title="Report mensile disponibile" detail="Riepilogo dati aggiornato con controlli permessi lato server." />
            {missingCount > 0 ? (
              <TimelineItem title={`${missingCount} documento${missingCount === 1 ? "" : "i"} da completare`} detail="Verifica le richieste aperte prima dell'invio al commercialista." tone="warning" />
            ) : (
              <TimelineItem title="Nessun documento mancante" detail="Tutti i documenti risultano completi per il periodo corrente." />
            )}
            <TimelineItem title="Audit trail attivo" detail="Creazioni, modifiche ed export vengono registrati." tone="info" />
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="section-title">Avanzamento configurazione</h3>
              <p className="helper-text">Completezza documentale stimata in base ai dati mancanti.</p>
            </div>
            {readiness !== null ? (
              <span className="rounded-full bg-field px-3 py-1 text-xs font-bold text-white">{readiness}%</span>
            ) : (
              <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-stone-500">—</span>
            )}
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-field transition-all duration-500"
              style={{ width: readiness !== null ? `${readiness}%` : "0%" }}
            />
          </div>
          <div className="mt-5 grid gap-3">
            {checklist.map(([label, tone]) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-line bg-stone-50 px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{label}</span>
                {tone === "success" ? <CheckCircle2 className="text-field" size={18} /> : <AlertTriangle className="text-amber-600" size={18} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="section-title">Azioni consigliate</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["Completa documenti mancanti", "Evita richieste successive dal commercialista.", FileWarning],
            ["Registra la giornata di oggi", "Aggiorna costi lavoro e saldi lavoratori.", WalletCards],
            ["Esporta report mensile", "Genera un documento gestionale verificabile.", BarChart3]
          ].map(([title, detail, Icon]) => (
            <div key={title as string} className="rounded-2xl border border-line bg-stone-50 p-4">
              <Icon className="text-field" size={22} />
              <p className="mt-3 font-semibold text-ink">{title as string}</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">{detail as string}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
