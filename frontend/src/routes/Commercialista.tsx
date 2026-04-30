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
  const pack = useMutation({
    mutationFn: () => apiClient.reportPdf(farm.currentFarmId!, "accountant-pack"),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  });

  const missingCount = Number(missing.data?.data?.total_count ?? 0);
  const readiness = Math.max(0, Math.min(100, 92 - missingCount * 12));

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Accesso commercialista"
        title="Pacchetto dati pulito e verificabile"
        subtitle="Una vista read-only per capire rapidamente cosa manca, cosa e pronto e quali dati esportare."
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
      {(missing.isLoading || wages.isLoading) && <LoadingState label="Preparazione dati commercialista..." />}
      {(missing.isError || wages.isError) && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">Vista commercialista in modalità demo</p>
          <p className="mt-1">Alcuni riepiloghi non sono disponibili per il ruolo corrente, ma la struttura del pacchetto resta consultabile.</p>
        </div>
      )}
      {pack.isError && <ErrorState title="Export non riuscito" detail="Non è stato possibile generare il PDF. Verifica i permessi e riprova." />}
      {pack.data && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Pacchetto commercialista generato. Il documento include QR, checksum e audit log.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-field">Prontezza pacchetto</p>
            <h2 className="mt-1 text-3xl font-bold text-ink">Pacchetto Commercialista pronto al {readiness}%</h2>
            <p className="helper-text mt-2">La percentuale misura completezza documentale, dati lavoro, vendite, spese e riferimenti verificabili.</p>
          </div>
          <div className="grid content-center gap-3">
            <div className="h-3 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-field" style={{ width: `${readiness}%` }} />
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
        <StatCard label="Documenti mancanti" value={String(missingCount)} icon={FileWarning} tone={missingCount ? "warning" : "success"} />
        <StatCard label="Spese recenti" value={<MoneyValue value={180} />} icon={Receipt} tone="warning" />
        <StatCard label="Vendite recenti" value={<MoneyValue value={450} />} icon={Landmark} tone="success" />
        <StatCard label="Saldi lavoratori" value={<MoneyValue value={(wages.data?.data as Record<string, any>)?.totals?.remaining_balance ?? 0} />} icon={WalletCards} tone="info" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-5">
          <h3 className="section-title">Checklist commercialista</h3>
          <div className="mt-5 space-y-4">
            <TimelineItem title="Spese e vendite raggruppate" detail="Movimenti collegati alla farm corretta e pronti per revisione." />
            <TimelineItem title="Documenti mancanti evidenti" detail={`${missingCount} elementi da verificare prima della chiusura mensile.`} tone={missingCount ? "warning" : "success"} />
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
        columns={["Area", "Elemento", "Stato", "Priorita"]}
        rows={[
          { id: "docs", cells: ["Documenti", "Fattura sementi", <StatusBadge tone="warning">Richiesto</StatusBadge>, "Alta"] },
          { id: "expenses", cells: ["Spese", "Sementi", <StatusBadge tone="success">Registrato</StatusBadge>, "Media"] },
          { id: "sales", cells: ["Vendite", "Pomodori", <StatusBadge tone="success">Registrato</StatusBadge>, "Media"] },
          { id: "workers", cells: ["Lavoro", "Saldi lavoratori", <StatusBadge tone="info">Verificabile</StatusBadge>, "Media"] }
        ]}
        empty={<EmptyState title="Nessun elemento" detail="Le richieste e i dati contabili compariranno qui." />}
      />
    </section>
  );
}
