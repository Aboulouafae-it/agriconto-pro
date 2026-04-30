import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileWarning,
  History,
  Leaf,
  Lock,
  Printer,
  QrCode,
  ShieldCheck,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "../components/design-system";
import { useFarm } from "../features/useFarm";

type ReportDefinition = {
  name: string;
  title: string;
  description: string;
  icon: ElementType;
  roles: string;
  tone: "standard" | "flagship" | "labor" | "warning";
  sections: string[];
};

const reports: ReportDefinition[] = [
  {
    name: "monthly",
    title: "Report Gestionale Mensile",
    icon: BarChart3,
    roles: "Titolare, Commercialista",
    tone: "standard",
    description: "Sintesi mensile di ricavi, spese, risultato netto, saldi e documenti mancanti.",
    sections: ["Sintesi", "Ricavi", "Spese", "Saldi", "Documenti"]
  },
  {
    name: "workers",
    title: "Report Lavoratori e Compensi",
    icon: Users,
    roles: "Titolare, Consulente del lavoro",
    tone: "labor",
    description: "Giornate, compensi maturati, anticipi, pagamenti e saldi residui.",
    sections: ["Lavoratori", "Compensi", "Anticipi", "Pagamenti"]
  },
  {
    name: "crops",
    title: "Report Redditività Colture",
    icon: Leaf,
    roles: "Titolare, Commercialista",
    tone: "standard",
    description: "Margine stimato per coltura con ricavi, costi e costo del lavoro collegato.",
    sections: ["Colture", "Ricavi", "Costi", "Margini"]
  },
  {
    name: "expenses",
    title: "Report Spese",
    icon: FileSpreadsheet,
    roles: "Titolare, Commercialista",
    tone: "standard",
    description: "Elenco amministrativo delle spese per categoria, fornitore e documento.",
    sections: ["Categorie", "Fornitori", "Documenti", "Movimenti"]
  },
  {
    name: "sales",
    title: "Report Vendite e Incassi",
    icon: FileText,
    roles: "Titolare, Commercialista",
    tone: "standard",
    description: "Vendite, clienti, importi, riferimenti fattura e incassi gestionali.",
    sections: ["Vendite", "Clienti", "Incassi", "Movimenti"]
  },
  {
    name: "missing-documents",
    title: "Report Documenti Mancanti",
    icon: FileWarning,
    roles: "Titolare, Commercialista",
    tone: "warning",
    description: "Spese senza documento, richieste aperte e dati lavoratori incompleti.",
    sections: ["Criticità", "Spese", "Lavoratori", "Richieste"]
  },
  {
    name: "accountant-pack",
    title: "Pacchetto Commercialista",
    icon: BriefcaseBusiness,
    roles: "Titolare, Commercialista",
    tone: "flagship",
    description: "Export premium con riepiloghi, movimenti, documenti, audit e checklist finale.",
    sections: ["Copertina", "Sintesi", "Spese", "Vendite", "Lavoratori", "Audit"]
  },
  {
    name: "annual",
    title: "Riepilogo Annuale",
    icon: CalendarDays,
    roles: "Titolare, Commercialista",
    tone: "standard",
    description: "Vista annuale per analisi interna e confronto con il professionista.",
    sections: ["Anno", "Trend", "Colture", "Documenti"]
  },
  {
    name: "document-index",
    title: "Indice Documenti",
    icon: FileArchive,
    roles: "Titolare, Commercialista",
    tone: "standard",
    description: "Indice archivistico dei documenti caricati e dei riferimenti collegati.",
    sections: ["Archivio", "Collegamenti", "Formati", "Note"]
  },
  {
    name: "audit-summary",
    title: "Riepilogo Log di Audit",
    icon: History,
    roles: "Titolare, Commercialista",
    tone: "standard",
    description: "Eventi rilevanti, esportazioni e riferimenti per la tracciabilità.",
    sections: ["Eventi", "Utenti", "Entità", "Export"]
  }
];

function isValidYear(value: string) {
  const n = Number(value);
  return /^\d{4}$/.test(value.trim()) && n >= 2000 && n <= 2100;
}

export function Reports() {
  const farm = useFarm();
  const auth = useAuth();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [yearError, setYearError] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const query = useMemo(() => `?year=${year}&month=${month}`, [month, year]);

  function handleYearChange(value: string) {
    setYear(value);
    if (!value.trim()) {
      setYearError("L'anno è obbligatorio.");
    } else if (!isValidYear(value)) {
      setYearError("Inserisci un anno valido (2000–2100).");
    } else {
      setYearError("");
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Centro report"
        title="Report amministrativi e PDF professionali"
        subtitle="Documenti gestionali con copertina, QR di verifica, checksum, audit log e layout A4 pronto per stampa o salvataggio PDF."
        actions={<StatusBadge tone="success">Accesso sicuro</StatusBadge>}
      />

      <div className="card overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="info">Documento gestionale</StatusBadge>
              <StatusBadge tone="success">QR verifica</StatusBadge>
              <StatusBadge tone="warning">Non sostituisce adempimenti ufficiali</StatusBadge>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-ink">Esportazioni professionali per azienda e consulenti</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Ogni esportazione viene generata lato server dopo i controlli di permesso, crea uno storico export e registra un evento audit.
              I file non espongono percorsi interni o dati sensibili nel QR.
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-line bg-stone-50 p-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="report-year">
                Anno
              </label>
              <input
                id="report-year"
                className={`input mt-2 ${yearError ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                value={year}
                onChange={(event) => handleYearChange(event.target.value)}
                inputMode="numeric"
                maxLength={4}
                placeholder="Es. 2026"
              />
              {yearError && <p className="mt-1 text-xs font-medium text-red-700">{yearError}</p>}
            </div>
            <label className="text-sm font-semibold text-ink">
              Mese
              <select className="input mt-2" value={month} onChange={(event) => setMonth(event.target.value)}>
                {Array.from({ length: 12 }, (_, index) => (
                  <option value={index + 1} key={index + 1}>
                    {new Date(2026, index, 1).toLocaleDateString("it-IT", { month: "long" })}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {!farm.currentFarmId && !farm.isLoading && <EmptyState title="Nessuna azienda" detail="Seleziona o crea una farm per generare report." />}

      <div className="grid gap-4 xl:grid-cols-2">
        {reports.map((report) => (
          <ReportTile
            key={report.name}
            report={report}
            farmId={farm.currentFarmId}
            farmName={farm.currentFarm?.name}
            userName={auth.user?.full_name}
            query={report.name === "monthly" || report.name === "annual" ? query : ""}
            yearError={yearError}
          />
        ))}
      </div>
    </section>
  );
}

function ReportTile({
  report,
  farmId,
  farmName,
  userName,
  query,
  yearError
}: {
  report: ReportDefinition;
  farmId: string | null;
  farmName?: string;
  userName?: string;
  query: string;
  yearError?: string;
}) {
  const usesYear = report.name === "monthly" || report.name === "annual";
  const isDisabledByYear = usesYear && Boolean(yearError);

  const preview = useQuery({
    queryKey: ["report", farmId, report.name, query],
    queryFn: () => apiClient.report(farmId!, report.name, query),
    enabled: Boolean(farmId) && !isDisabledByYear
  });

  const exportPdf = useMutation({
    mutationFn: () => apiClient.reportPdf(farmId!, report.name, query),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename);
    }
  });

  const Icon = report.icon;
  const isFlagship = report.tone === "flagship";

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-soft ${
        isFlagship ? "border-field/40 ring-1 ring-field/20" : "border-line"
      }`}
    >
      <div className={`h-1.5 ${isFlagship ? "bg-field" : report.tone === "warning" ? "bg-amber-500" : "bg-finance"}`} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${isFlagship ? "bg-field text-white" : "bg-finance-light text-finance"}`}>
            <Icon size={23} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-ink">{report.title}</h3>
              {isFlagship && <StatusBadge tone="success">Export principale</StatusBadge>}
            </div>
            <p className="mt-1 text-sm leading-6 text-stone-600">{report.description}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-line bg-stone-50 p-4 text-sm md:grid-cols-3">
          <InfoPill icon={Lock} label="Permessi" value={report.roles} />
          <InfoPill icon={BadgeCheck} label="Azienda" value={farmName ?? "Non selezionata"} />
          <InfoPill icon={QrCode} label="Verifica" value="Checksum + QR" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {report.sections.map((section) => (
            <span key={section} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-stone-600">
              {section}
            </span>
          ))}
        </div>

        {isDisabledByYear && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Anno non valido. Correggi il campo anno per generare questo report.
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">Anteprima dati</p>
            <StatusBadge tone="info">Dati verificati dal server</StatusBadge>
          </div>
          {preview.isLoading && <LoadingState label="Preparazione anteprima..." />}
          {preview.isError && <ErrorState detail="Report non disponibile per il ruolo corrente o per questa azienda." />}
          {preview.data && (
            <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
              <PreviewMetric label="Tipo" value={preview.data.report} />
              <PreviewMetric label="Generato da" value={userName ?? "Utente corrente"} />
              <PreviewMetric label="Farm" value={farmName ?? preview.data.farm_id} />
              <PreviewMetric label="Stato" value="Pronto per export" />
            </div>
          )}
        </div>

        {exportPdf.isError && <div className="mt-4"><ErrorState detail="Non è stato possibile generare il PDF. Riprova." /></div>}
        {exportPdf.isSuccess && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            PDF generato correttamente.
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button className="btn-secondary" onClick={() => preview.refetch()} disabled={!farmId || preview.isFetching || isDisabledByYear}>
            <Printer size={17} />
            Anteprima
          </button>
          <button className="btn-primary" onClick={() => exportPdf.mutate()} disabled={!farmId || exportPdf.isPending || isDisabledByYear}>
            <Download size={17} />
            {exportPdf.isPending ? "Generazione PDF..." : "Esporta PDF"}
          </button>
        </div>
      </div>
    </article>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function InfoPill({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 text-field" size={16} />
      <div>
        <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
        <p className="mt-0.5 font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-1 truncate font-semibold text-ink">{value}</p>
    </div>
  );
}
