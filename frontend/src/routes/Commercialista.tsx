import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, FileWarning, Landmark, Receipt, ShieldCheck, Users, WalletCards } from "lucide-react";
import { apiClient } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  MoneyValue,
  StatCard,
  StatusBadge,
  TimelineItem
} from "../components/design-system";
import { useFarm } from "../features/useFarm";

export function Commercialista() {
  const farm = useFarm();
  const enabled = Boolean(farm.currentFarmId);

  const missing = useQuery({
    queryKey: ["report", farm.currentFarmId, "missing-documents"],
    queryFn: () => apiClient.report(farm.currentFarmId!, "missing-documents"),
    enabled
  });

  const wages = useQuery({
    queryKey: ["report", farm.currentFarmId, "workers"],
    queryFn: () => apiClient.report(farm.currentFarmId!, "workers"),
    enabled
  });

  const expensesReport = useQuery({
    queryKey: ["report", farm.currentFarmId, "expenses"],
    queryFn: () => apiClient.report(farm.currentFarmId!, "expenses"),
    enabled
  });

  const salesReport = useQuery({
    queryKey: ["report", farm.currentFarmId, "sales"],
    queryFn: () => apiClient.report(farm.currentFarmId!, "sales"),
    enabled
  });

  const pack = useMutation({
    mutationFn: () => apiClient.reportPdf(farm.currentFarmId!, "accountant-pack"),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
  });

  const missingData = missing.data?.data as { total_count?: number; expenses_without_documents?: unknown[]; workers_missing_codice_fiscale?: unknown[]; open_document_requests?: unknown[] } | undefined;
  const wagesData = wages.data?.data as { totals?: { remaining_balance?: number } } | undefined;
  const expensesData = expensesReport.data?.data as { summary?: { total_expenses?: number } } | undefined;
  const salesData = salesReport.data?.data as { summary?: { total_sales?: number } } | undefined;

  const missingCount = Number(missingData?.total_count ?? 0);

  // Readiness: decremented by open issues, capped 0–100
  const reportsReady = !missing.isLoading && missing.data != null;
  const readiness = reportsReady ? Math.max(0, Math.min(100, 100 - missingCount * 8)) : null;

  // Checklist rows from real data
  const expensesMissingCount = missingData?.expenses_without_documents?.length ?? 0;
  const workersMissingCfCount = missingData?.workers_missing_codice_fiscale?.length ?? 0;
  const openRequestsCount = missingData?.open_document_requests?.length ?? 0;

  const checklistRows: Array<{ id: string; cells: React.ReactNode[] }> = [
    {
      id: "expenses-docs",
      cells: [
        "Spese",
        "Documenti mancanti",
        expensesReport.isLoading
          ? <StatusBadge tone="neutral">Caricamento…</StatusBadge>
          : expensesMissingCount === 0
          ? <StatusBadge tone="success">Completo</StatusBadge>
          : <StatusBadge tone="warning">{expensesMissingCount} mancanti</StatusBadge>,
        expensesMissingCount > 0 ? "Alta" : "Bassa"
      ]
    },
    {
      id: "workers-cf",
      cells: [
        "Lavoratori",
        "Codice fiscale",
        wages.isLoading
          ? <StatusBadge tone="neutral">Caricamento…</StatusBadge>
          : workersMissingCfCount === 0
          ? <StatusBadge tone="success">Completo</StatusBadge>
          : <StatusBadge tone="warning">{workersMissingCfCount} mancanti</StatusBadge>,
        workersMissingCfCount > 0 ? "Alta" : "Bassa"
      ]
    },
    {
      id: "open-requests",
      cells: [
        "Documenti",
        "Richieste aperte",
        missing.isLoading
          ? <StatusBadge tone="neutral">Caricamento…</StatusBadge>
          : openRequestsCount === 0
          ? <StatusBadge tone="success">Nessuna</StatusBadge>
          : <StatusBadge tone="warning">{openRequestsCount} aperte</StatusBadge>,
        openRequestsCount > 0 ? "Media" : "Bassa"
      ]
    },
    {
      id: "wages",
      cells: [
        "Lavoro",
        "Saldi lavoratori",
        wagesData
          ? <StatusBadge tone="info">Verificabile</StatusBadge>
          : <StatusBadge tone="neutral">Da caricare</StatusBadge>,
        "Media"
      ]
    }
  ];

  const isLoading = missing.isLoading || wages.isLoading || expensesReport.isLoading || salesReport.isLoading;
  const hasError = missing.isError || wages.isError;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Accesso commercialista"
        title="Pacchetto dati pulito e verificabile"
        subtitle="Una vista read-only per capire rapidamente cosa manca, cosa è pronto e quali dati esportare."
        actions={
          <>
            <StatusBadge tone="info"><ShieldCheck size={13} /> Solo lettura</StatusBadge>
            <button onClick={() => pack.mutate()} disabled={!farm.currentFarmId || pack.isPending} className="btn-primary">
              <Download size={17} />
              {pack.isPending ? "Esportazione..." : "Esporta Pacchetto Commercialista"}
            </button>
          </>
        }
      />

      {!farm.currentFarmId && !farm.isLoading && <EmptyState title="Nessuna azienda" detail="Serve una farm attiva per preparare il pacchetto commercialista." />}
      {isLoading && <LoadingState label="Preparazione dati commercialista..." />}
      {hasError && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">Vista commercialista in modalità parziale</p>
          <p className="mt-1">Alcuni riepiloghi non sono disponibili per il ruolo corrente, ma la struttura del pacchetto resta consultabile.</p>
        </div>
      )}
      {pack.isError && <ErrorState title="Export non riuscito" detail="Non è stato possibile generare il PDF. Riprova." />}
      {pack.data && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Pacchetto commercialista generato. Il documento include QR, checksum e audit log.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-field">Prontezza pacchetto</p>
            {readiness !== null ? (
              <h2 className="mt-1 text-3xl font-bold text-ink">Pacchetto Commercialista pronto al {readiness}%</h2>
            ) : (
              <h2 className="mt-1 text-3xl font-bold text-ink">Calcolo prontezza in corso…</h2>
            )}
            <p className="helper-text mt-2">La percentuale misura la completezza documentale in base agli elementi mancanti rilevati.</p>
          </div>
          <div className="grid content-center gap-3">
            <div className="h-3 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-field transition-all duration-500"
                style={{ width: readiness !== null ? `${readiness}%` : "0%" }}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {["Solo lettura", "Dati verificabili", "Audit attivo"].map((label) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-line bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700">
                  <CheckCircle2 className="text-field" size={16} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documenti mancanti"
          value={missing.isLoading ? "…" : String(missingCount)}
          icon={FileWarning}
          tone={missingCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Spese (periodo)"
          value={expensesReport.isLoading ? <span className="text-stone-400">…</span> : <MoneyValue value={expensesData?.summary?.total_expenses ?? 0} />}
          icon={Receipt}
          tone="warning"
          detail="Totale spese registrate per questa azienda."
        />
        <StatCard
          label="Vendite (periodo)"
          value={salesReport.isLoading ? <span className="text-stone-400">…</span> : <MoneyValue value={salesData?.summary?.total_sales ?? 0} />}
          icon={Landmark}
          tone="success"
          detail="Totale vendite registrate per questa azienda."
        />
        <StatCard
          label="Saldi lavoratori"
          value={wages.isLoading ? <span className="text-stone-400">…</span> : <MoneyValue value={(wagesData?.totals?.remaining_balance) ?? 0} />}
          icon={WalletCards}
          tone="info"
          detail="Saldo operativo residuo da riepilogo lavoratori."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-5">
          <h3 className="section-title">Checklist commercialista</h3>
          <div className="mt-5 space-y-4">
            <TimelineItem
              title="Spese e vendite raggruppate"
              detail="Movimenti collegati alla farm corretta e pronti per revisione."
            />
            <TimelineItem
              title={missingCount > 0 ? `${missingCount} elemento${missingCount === 1 ? "" : "i"} da verificare` : "Documentazione completa"}
              detail={missingCount > 0 ? "Completa prima della chiusura mensile." : "Nessun elemento critico rilevato nel periodo corrente."}
              tone={missingCount > 0 ? "warning" : "success"}
            />
            <TimelineItem title="Audit trail disponibile" detail="Export e modifiche importanti sono registrati in modo verificabile." tone="info" />
          </div>
        </div>
        <div className="card p-5">
          <h3 className="section-title">Riepilogo azienda</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Azienda</dt><dd className="font-semibold">{farm.currentFarm?.name ?? "-"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Regime</dt><dd className="font-semibold">{farm.currentFarm?.fiscal_profile ?? "-"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Partita IVA</dt><dd className="font-semibold">{farm.currentFarm?.partita_iva ?? "-"}</dd></div>
          </dl>
        </div>
      </div>

      <DataTable
        columns={["Area", "Elemento", "Stato", "Priorità"]}
        rows={checklistRows}
        empty={<EmptyState title="Nessun elemento" detail="Le richieste e i dati contabili compariranno qui." />}
      />
    </section>
  );
}
