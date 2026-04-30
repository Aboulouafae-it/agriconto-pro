import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  Clock3,
  FileWarning,
  Leaf,
  MapPin,
  Plus,
  Receipt,
  Users,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { PageHeader } from "../components/PageHeader";
import {
  DataTable,
  DateDisplay,
  EmptyState,
  ErrorState,
  FileUploadCard,
  FilterBar,
  LoadingState,
  MoneyValue,
  StatusBadge,
  StatCard
} from "../components/design-system";
import { useFarm } from "../features/useFarm";
import { canWrite } from "../lib/permissions";
import type { ModuleKey } from "../types";

type Module = Exclude<ModuleKey, "dashboard" | "analytics" | "farm" | "commercialista" | "reports" | "settings">;

type Props = {
  module: Module;
  title: string;
  subtitle: string;
  columns: readonly string[];
};

const emptyCopy: Record<Module, { title: string; detail: string; action: string }> = {
  workers: {
    title: "Non hai ancora aggiunto lavoratori.",
    detail: "Crea il primo profilo lavoratore per iniziare a registrare le giornate.",
    action: "Aggiungi lavoratore"
  },
  workdays: {
    title: "Nessuna giornata registrata.",
    detail: "Registra ore, coltura e attivita con pochi tocchi dal campo.",
    action: "Nuova giornata"
  },
  crops: {
    title: "Nessuna coltura configurata.",
    detail: "Collega colture, campi, costi e vendite per leggere la redditivita.",
    action: "Aggiungi coltura"
  },
  fields: {
    title: "Nessun campo registrato.",
    detail: "Crea il registro dei terreni con superfici, riferimenti e colture collegate.",
    action: "Aggiungi campo"
  },
  expenses: {
    title: "Nessuna spesa registrata.",
    detail: "Inizia aggiungendo una spesa o caricando una fattura.",
    action: "Nuova spesa"
  },
  sales: {
    title: "Nessuna vendita registrata.",
    detail: "Registra prodotti, clienti, quantita e stato incasso.",
    action: "Nuova vendita"
  },
  documents: {
    title: "Nessun documento caricato.",
    detail: "Carica fatture, ricevute, contratti o documenti richiesti dal commercialista.",
    action: "Carica documento"
  }
};

export function ModulePage({ module, title, subtitle, columns }: Props) {
  const auth = useAuth();
  const farm = useFarm();
  const canCreate = canWrite(auth.role, module);
  const data = useModuleData(module, farm.currentFarmId);
  const rows = data.data ?? demoRows(module);
  const usingDemo = Boolean(farm.currentFarmId) && (!data.data || data.isError);
  const empty = emptyCopy[module];

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={moduleEyebrow(module)}
        title={title}
        subtitle={subtitle}
        actions={
          canCreate ? (
            <button className="btn-primary">
              <Plus size={18} />
              {empty.action}
            </button>
          ) : (
            <StatusBadge tone="info">Solo lettura</StatusBadge>
          )
        }
      />

      {moduleHero(module)}

      {!farm.currentFarmId && !farm.isLoading && (
        <EmptyState title="Configura un'azienda" detail="Crea o seleziona una farm prima di usare questo modulo." actionLabel="Configura azienda" />
      )}
      {data.isLoading && <LoadingState label="Caricamento dati..." />}
      {usingDemo && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">Anteprima operativa disponibile</p>
          <p className="mt-1 leading-6">
            Questo modulo usa dati demo realistici finché tutte le funzioni operative non sono collegate. I controlli reali di sicurezza restano attivi lato server.
          </p>
        </div>
      )}

      <FilterBar placeholder={`Cerca in ${title.toLowerCase()}`} />

      <DataTable
        columns={columns}
        rows={rows}
        empty={<EmptyState title={empty.title} detail={empty.detail} actionLabel={canCreate ? empty.action : undefined} icon={emptyIcon(module)} />}
      />
    </section>
  );
}

function moduleEyebrow(module: Module) {
  return {
    workers: "Gestione lavoro",
    workdays: "Operativita quotidiana",
    crops: "Redditivita agricola",
    fields: "Registro terreni",
    expenses: "Controllo costi",
    sales: "Ricavi e incassi",
    documents: "Archivio sicuro"
  }[module];
}

function moduleHero(module: Module) {
  if (module === "workdays") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm"><span className="font-semibold">Data</span><input className="input mt-1.5" type="date" /></label>
          <label className="block text-sm"><span className="font-semibold">Lavoratore</span><select className="input mt-1.5"><option>Seleziona</option></select></label>
          <label className="block text-sm"><span className="font-semibold">Coltura / campo</span><select className="input mt-1.5"><option>Pomodoro - Campo Nord</option></select></label>
          <label className="block text-sm"><span className="font-semibold">Ore</span><input className="input mt-1.5" type="number" min="0" step="0.25" placeholder="6,5" /></label>
          <label className="block text-sm sm:col-span-2"><span className="font-semibold">Attivita</span><input className="input mt-1.5" placeholder="Raccolta, potatura, irrigazione..." /></label>
          <button className="btn-primary sm:col-span-2">Registra giornata</button>
        </div>
        <div className="card p-5">
          <h3 className="section-title">Riepilogo giorno</h3>
          <div className="mt-4 grid gap-3">
            <StatusBadge tone="success"><Clock3 size={13} /> 6,5 ore registrate</StatusBadge>
            <StatusBadge tone="warning"><WalletCards size={13} /> Chiusura giornata da confermare</StatusBadge>
          </div>
          <button className="btn-secondary mt-5 w-full">Chiudi giornata</button>
        </div>
      </div>
    );
  }
  if (module === "documents") {
    return <FileUploadCard />;
  }
  if (module === "expenses") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Spese mese" value={<MoneyValue value={180} />} icon={Receipt} tone="warning" />
        <StatCard label="Documenti mancanti" value="1" icon={FileWarning} tone="danger" />
        <StatCard label="Carica da fotocamera" value={<Camera size={26} />} icon={Camera} tone="info" detail="Pensato per fatture e ricevute dal campo." />
      </div>
    );
  }
  if (module === "sales") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Vendite mese" value={<MoneyValue value={450} />} icon={WalletCards} tone="success" />
        <StatCard label="Non incassate" value={<MoneyValue value={0} />} icon={Clock3} tone="warning" />
        <StatCard label="Fatture da completare" value="0" icon={FileWarning} tone="neutral" />
      </div>
    );
  }
  if (module === "workers") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Lavoratori attivi" value="1" icon={Users} tone="info" />
        <StatCard label="Salari da pagare" value={<MoneyValue value={0} />} icon={WalletCards} tone="success" />
        <StatCard label="Codici fiscali mancanti" value="0" icon={FileWarning} tone="neutral" />
      </div>
    );
  }
  if (module === "crops") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Coltura piu redditizia" value="Pomodoro" icon={Leaf} tone="success" />
        <StatCard label="Costi collegati" value={<MoneyValue value={180} />} icon={Receipt} tone="warning" />
        <StatCard label="Margine stimato" value={<MoneyValue value={188.75} />} icon={WalletCards} tone="info" />
      </div>
    );
  }
  if (module === "fields") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Superficie registrata" value="3,5 ha" icon={MapPin} tone="success" />
        <StatCard label="Campi con colture" value="1" icon={Leaf} tone="info" />
        <StatCard label="Dati catastali" value="Da completare" icon={FileWarning} tone="warning" />
      </div>
    );
  }
  return null;
}

function useModuleData(module: Module, farmId: string | null) {
  return useQuery({
    queryKey: ["module", module, farmId],
    enabled: Boolean(farmId) && ["workers", "expenses", "sales", "documents"].includes(module),
    queryFn: async () => {
      if (!farmId) return [];
      if (module === "workers") {
        const rows = await apiClient.workers(farmId);
        return rows.map((row) => ({
          id: row.id,
          cells: [
            <span className="font-semibold text-ink">{row.first_name} {row.last_name}</span>,
            row.contract_type ?? "Contratto da completare",
            row.hourly_rate ? <MoneyValue value={row.hourly_rate} /> : "-",
            <StatusBadge tone={row.fiscal_code ? "success" : "warning"}>{row.fiscal_code ? "Completo" : "CF mancante"}</StatusBadge>
          ]
        }));
      }
      if (module === "expenses") {
        const rows = await apiClient.expenses(farmId);
        return rows.map((row) => ({
          id: row.id,
          cells: [
            <DateDisplay value={row.expense_date} />,
            row.category,
            row.description ?? "-",
            <MoneyValue value={row.amount} />
          ]
        }));
      }
      if (module === "sales") {
        const rows = await apiClient.sales(farmId);
        return rows.map((row) => ({
          id: row.id,
          cells: [
            <DateDisplay value={row.sale_date} />,
            row.description ?? "Vendita",
            row.crop_id ? "Coltura collegata" : "-",
            <MoneyValue value={row.amount} />
          ]
        }));
      }
      const rows = await apiClient.documentRequests(farmId) as Array<{ id: string; title: string; status: string; due_date?: string | null; requested_from?: string | null }>;
      return rows.map((row) => ({
        id: row.id,
        cells: [
          <span className="font-semibold text-ink">{row.title}</span>,
          row.requested_from ?? "Richiesta",
          <StatusBadge tone={row.status === "RECEIVED" ? "success" : "warning"}>{row.status}</StatusBadge>,
          row.due_date ? <DateDisplay value={row.due_date} /> : "-"
        ]
      }));
    },
    retry: false,
    placeholderData: undefined
  });
}

function emptyIcon(module: Module) {
  return {
    workers: Users,
    workdays: CalendarDays,
    crops: Leaf,
    fields: MapPin,
    expenses: Receipt,
    sales: WalletCards,
    documents: FileWarning
  }[module];
}

function demoRows(module: Module): Array<{ id: string; cells: ReactNode[] }> {
  const rows: Record<Module, Array<{ id: string; cells: ReactNode[] }>> = {
    workers: [
      {
        id: "demo-worker-1",
        cells: [
          <span className="font-semibold text-ink">Luigi Bianchi</span>,
          "Stagionale agricolo",
          <MoneyValue value={12.5} />,
          <StatusBadge tone="success">Completo</StatusBadge>
        ]
      },
      {
        id: "demo-worker-2",
        cells: [
          <span className="font-semibold text-ink">Anna Verdi</span>,
          "Collaborazione occasionale",
          <MoneyValue value={11.8} />,
          <StatusBadge tone="warning">Documento da verificare</StatusBadge>
        ]
      }
    ],
    workdays: [
      {
        id: "demo-workday-1",
        cells: [
          <DateDisplay value={new Date().toISOString()} />,
          "Luigi Bianchi, Anna Verdi",
          "Raccolta",
          "Pomodoro / Campo Nord",
          "13,0",
          <MoneyValue value={158.6} />
        ]
      },
      {
        id: "demo-workday-2",
        cells: [
          <DateDisplay value={new Date(Date.now() - 86400000).toISOString()} />,
          "Luigi Bianchi",
          "Irrigazione",
          "Pomodoro / Campo Nord",
          "4,0",
          <MoneyValue value={50} />
        ]
      }
    ],
    crops: [
      {
        id: "demo-crop-1",
        cells: ["Pomodoro", "2026", "Campo Nord", <MoneyValue value={180} />, <MoneyValue value={450} />, <StatusBadge tone="success">+188,75 EUR</StatusBadge>]
      },
      {
        id: "demo-crop-2",
        cells: ["Zucchina", "Primavera 2026", "Campo Sud", <MoneyValue value={95} />, <MoneyValue value={0} />, <StatusBadge tone="warning">Da monitorare</StatusBadge>]
      }
    ],
    fields: [
      { id: "demo-field-1", cells: ["Campo Nord", "3,5 ha", "Foglio 12 / Part. 45", "Pomodoro"] },
      { id: "demo-field-2", cells: ["Campo Sud", "2,1 ha", "Da completare", "Zucchina"] }
    ],
    expenses: [
      {
        id: "demo-expense-1",
        cells: [<DateDisplay value={new Date().toISOString()} />, "Sementi", "Acquisto sementi pomodoro", <MoneyValue value={180} />]
      }
    ],
    sales: [
      {
        id: "demo-sale-1",
        cells: [<DateDisplay value={new Date().toISOString()} />, "Vendita cassette pomodoro", "Pomodoro", <MoneyValue value={450} />]
      }
    ],
    documents: [
      {
        id: "demo-document-1",
        cells: ["Fattura sementi", "Fattura acquisto", <StatusBadge tone="warning">Richiesto</StatusBadge>, <DateDisplay value={new Date(Date.now() + 604800000).toISOString()} />]
      },
      {
        id: "demo-document-2",
        cells: ["Contratto lavoratore", "Documento lavoro", <StatusBadge tone="success">Presente</StatusBadge>, "-"]
      }
    ]
  };
  return rows[module];
}
