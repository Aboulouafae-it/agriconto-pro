import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Edit3,
  FileWarning,
  Leaf,
  MapPin,
  Plus,
  Receipt,
  Trash2,
  Upload,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { FormEvent, ReactNode, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
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
  StatCard,
  StatusBadge,
  ToastMessage
} from "../components/design-system";
import { useFarm } from "../features/useFarm";
import { canWrite } from "../lib/permissions";
import type { Crop, Document, Expense, Field, ModuleKey, Sale, Workday, Worker } from "../types";

type Module = Exclude<ModuleKey, "dashboard" | "analytics" | "farm" | "commercialista" | "reports" | "settings">;
type RecordItem = Worker | Field | Crop | Workday | Expense | Sale | Document;
type Toast = { tone: "success" | "warning" | "danger" | "info"; title: string; detail?: string };

type Props = {
  module: Module;
  title: string;
  subtitle: string;
  columns: readonly string[];
};

const emptyCopy: Record<Module, { title: string; detail: string; action: string }> = {
  workers: { title: "Non hai ancora aggiunto lavoratori.", detail: "Crea il primo profilo lavoratore per iniziare a registrare le giornate.", action: "Aggiungi lavoratore" },
  workdays: { title: "Nessuna giornata registrata.", detail: "Registra ore, coltura e attivita con pochi tocchi dal campo.", action: "Nuova giornata" },
  crops: { title: "Nessuna coltura configurata.", detail: "Collega colture, campi, costi e vendite per leggere la redditivita.", action: "Aggiungi coltura" },
  fields: { title: "Nessun campo registrato.", detail: "Crea il registro dei terreni con superfici, riferimenti e colture collegate.", action: "Aggiungi campo" },
  expenses: { title: "Nessuna spesa registrata.", detail: "Inizia aggiungendo una spesa o caricando una fattura.", action: "Nuova spesa" },
  sales: { title: "Nessuna vendita registrata.", detail: "Registra prodotti, clienti, quantita e stato incasso.", action: "Nuova vendita" },
  documents: { title: "Nessun documento caricato.", detail: "Carica fatture, ricevute, contratti o documenti richiesti dal commercialista.", action: "Carica documento" }
};

const today = () => new Date().toISOString().slice(0, 10);

export function ModulePage({ module, title, subtitle, columns }: Props) {
  const auth = useAuth();
  const farm = useFarm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = canWrite(auth.role, module);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RecordItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(module));
  const [file, setFile] = useState<File | null>(null);

  const records = useModuleRecords(module, farm.currentFarmId);
  const workers = useQuery({ queryKey: ["module", "workers", farm.currentFarmId], queryFn: () => apiClient.workers(farm.currentFarmId!), enabled: Boolean(farm.currentFarmId) && module === "workdays" });
  const fields = useQuery({ queryKey: ["module", "fields", farm.currentFarmId], queryFn: () => apiClient.fields(farm.currentFarmId!), enabled: Boolean(farm.currentFarmId) && module === "crops" });
  const crops = useQuery({ queryKey: ["module", "crops", farm.currentFarmId], queryFn: () => apiClient.crops(farm.currentFarmId!), enabled: Boolean(farm.currentFarmId) && ["workdays", "expenses", "sales"].includes(module) });
  const empty = emptyCopy[module];

  useEffect(() => {
    if (searchParams.get("action") === "new" && canCreate) {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [canCreate, searchParams, setSearchParams]);

  const saveMutation = useMutation({
    mutationFn: () => saveRecord(module, farm.currentFarmId!, form, file, editing),
    onSuccess: async () => {
      setToast({ tone: "success", title: editing ? "Modifica salvata" : "Elemento creato", detail: "I dati sono stati aggiornati e saranno riflessi in dashboard, report e statistiche." });
      closeForm();
      await invalidateRelated(queryClient, farm.currentFarmId);
    },
    onError: (error) => setToast({ tone: "danger", title: "Operazione non riuscita", detail: userError(error) })
  });

  const deleteMutation = useMutation({
    mutationFn: (item: RecordItem) => deleteRecord(module, farm.currentFarmId!, item.id),
    onSuccess: async () => {
      setToast({ tone: "success", title: "Elemento eliminato", detail: "La vista è stata aggiornata." });
      setConfirmDelete(null);
      await invalidateRelated(queryClient, farm.currentFarmId);
    },
    onError: (error) => setToast({ tone: "danger", title: "Eliminazione non riuscita", detail: userError(error) })
  });

  const closeMutation = useMutation({
    mutationFn: (workdayId: string) => apiClient.closeWorkday(farm.currentFarmId!, workdayId),
    onSuccess: async () => {
      setToast({ tone: "success", title: "Giornata chiusa", detail: "La giornata è stata marcata come chiusa." });
      await invalidateRelated(queryClient, farm.currentFarmId);
    },
    onError: (error) => setToast({ tone: "danger", title: "Chiusura non riuscita", detail: userError(error) })
  });

  const rows = useMemo(() => {
    const items = records.data ?? [];
    const filtered = filterRecords(items, search);
    return filtered.map((item) => toRow(module, item, {
      onEdit: () => openEdit(item),
      onDelete: () => setConfirmDelete(item),
      onClose: module === "workdays" ? () => closeMutation.mutate(item.id) : undefined
    }));
  }, [closeMutation, module, records.data, search]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm(module));
    setFile(null);
    setIsFormOpen(true);
  }

  function openEdit(item: RecordItem) {
    if (module === "documents") {
      setToast({ tone: "info", title: "Funzione in sviluppo", detail: "La modifica dei metadati documento sarà disponibile nella prossima iterazione. Puoi eliminare e ricaricare il documento." });
      return;
    }
    setEditing(item);
    setForm(formFromRecord(module, item));
    setFile(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
    setForm(initialForm(module));
    setFile(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateForm(module, form, file, Boolean(editing));
    if (validation) {
      setToast({ tone: "warning", title: "Controlla i dati", detail: validation });
      return;
    }
    saveMutation.mutate();
  }

  return (
    <section className="space-y-6">
      {toast && <ToastMessage {...toast} onClose={() => setToast(null)} />}
      <PageHeader
        eyebrow={moduleEyebrow(module)}
        title={title}
        subtitle={subtitle}
        actions={
          canCreate ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus size={18} />
              {empty.action}
            </button>
          ) : (
            <StatusBadge tone="info">Solo lettura</StatusBadge>
          )
        }
      />

      {moduleHero(module, { openCreate, setToast, fileInputRef })}

      {!farm.currentFarmId && !farm.isLoading && (
        <EmptyState title="Configura un'azienda" detail="Crea o seleziona una farm prima di usare questo modulo." actionLabel="Configura azienda" onAction={() => navigate("/azienda")} />
      )}
      {records.isLoading && <LoadingState label="Caricamento dati..." />}
      {records.isError && <ErrorState detail="Non è stato possibile caricare questo modulo. Verifica i permessi o riprova tra poco." />}

      <FilterBar
        placeholder={`Cerca in ${title.toLowerCase()}`}
        value={search}
        onChange={setSearch}
        onFilters={() => setToast({ tone: "info", title: "Filtri avanzati in sviluppo", detail: "La ricerca testuale è già attiva; i filtri avanzati arriveranno con le viste salvate." })}
      />

      <DataTable
        columns={[...columns, "Azioni"]}
        rows={rows}
        empty={<EmptyState title={empty.title} detail={empty.detail} actionLabel={canCreate ? empty.action : undefined} onAction={canCreate ? openCreate : undefined} icon={emptyIcon(module)} />}
      />

      {isFormOpen && (
        <FormModal
          module={module}
          title={editing ? `Modifica ${singularLabel(module)}` : empty.action}
          form={form}
          setForm={setForm}
          onClose={closeForm}
          onSubmit={submit}
          isPending={saveMutation.isPending}
          workers={workers.data ?? []}
          fields={fields.data ?? []}
          crops={crops.data ?? []}
          file={file}
          onFile={setFile}
          isEdit={Boolean(editing)}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          label={recordLabel(module, confirmDelete)}
          isPending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete)}
        />
      )}
    </section>
  );
}

function useModuleRecords(module: Module, farmId: string | null) {
  return useQuery({
    queryKey: ["module", module, farmId],
    enabled: Boolean(farmId),
    queryFn: async () => {
      if (!farmId) return [];
      if (module === "workers") return apiClient.workers(farmId);
      if (module === "fields") return apiClient.fields(farmId);
      if (module === "crops") return apiClient.crops(farmId);
      if (module === "workdays") return apiClient.workdays(farmId);
      if (module === "expenses") return apiClient.expenses(farmId);
      if (module === "sales") return apiClient.sales(farmId);
      return apiClient.documents(farmId);
    },
    retry: false
  });
}

async function invalidateRelated(queryClient: ReturnType<typeof useQueryClient>, farmId: string | null) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["module"] }),
    queryClient.invalidateQueries({ queryKey: ["report", farmId] }),
    queryClient.invalidateQueries({ queryKey: ["analytics", farmId] })
  ]);
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

function moduleHero(module: Module, helpers: { openCreate: () => void; setToast: (toast: Toast) => void; fileInputRef: RefObject<HTMLInputElement> }) {
  if (module === "workdays") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5">
          <h3 className="section-title">Registro giornaliero rapido</h3>
          <p className="helper-text mt-2">Usa “Nuova giornata” per scegliere lavoratore, coltura, ore e attività. L'importo viene calcolato dalla tariffa inserita.</p>
          <button type="button" className="btn-primary mt-5" onClick={helpers.openCreate}><Plus size={17} />Nuova giornata</button>
        </div>
        <div className="card p-5">
          <h3 className="section-title">Flusso giornata</h3>
          <div className="mt-4 grid gap-3">
            <StatusBadge tone="info"><Clock3 size={13} /> Registra ore e attività</StatusBadge>
            <StatusBadge tone="warning"><WalletCards size={13} /> Chiudi giornata dopo verifica</StatusBadge>
          </div>
        </div>
      </div>
    );
  }
  if (module === "documents") return <FileUploadCard onSelect={helpers.openCreate} />;
  if (module === "expenses") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Inserimento rapido" value="Spesa" icon={Receipt} tone="warning" detail="Data, categoria, importo e descrizione sono validati prima del salvataggio." />
        <StatCard label="Documento" value={<Upload size={26} />} icon={FileWarning} tone="info" detail="Carica la fattura dal modulo Documenti." />
        <StatCard label="Fotocamera" value={<Camera size={26} />} icon={Camera} tone="neutral" detail="Supporto camera diretto in sviluppo." />
      </div>
    );
  }
  if (module === "sales") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Nuova vendita" value="Ricavo" icon={WalletCards} tone="success" detail="Registra descrizione, importo, coltura e data vendita." />
        <StatCard label="Incassi" value="Tracciabili" icon={Clock3} tone="warning" detail="Stato incasso avanzato in sviluppo." />
        <StatCard label="Report" value="Aggiornati" icon={CheckCircle2} tone="info" detail="Dashboard e report vengono invalidati dopo ogni modifica." />
      </div>
    );
  }
  if (module === "workers") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Anagrafica" value="Validata" icon={Users} tone="info" />
        <StatCard label="Tariffe" value="€/ora" icon={WalletCards} tone="success" />
        <StatCard label="Dati mancanti" value="Evidenti" icon={FileWarning} tone="warning" />
      </div>
    );
  }
  if (module === "crops") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Colture" value="Stagionali" icon={Leaf} tone="success" />
        <StatCard label="Campi" value="Collegabili" icon={MapPin} tone="info" />
        <StatCard label="Redditività" value="Report" icon={WalletCards} tone="warning" />
      </div>
    );
  }
  if (module === "fields") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Superfici" value="ha" icon={MapPin} tone="success" />
        <StatCard label="Catasto" value="Metadata" icon={Leaf} tone="info" />
        <StatCard label="Colture" value="Collegate" icon={FileWarning} tone="warning" />
      </div>
    );
  }
  return null;
}

function FormModal(props: {
  module: Module;
  title: string;
  form: Record<string, string>;
  setForm: (form: Record<string, string>) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
  workers: Worker[];
  fields: Field[];
  crops: Crop[];
  file: File | null;
  onFile: (file: File | null) => void;
  isEdit: boolean;
}) {
  const set = (key: string, value: string) => props.setForm({ ...props.form, [key]: value });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
      <form onSubmit={props.onSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="text-xl font-bold text-ink">{props.title}</h2>
            <p className="helper-text mt-1">I campi obbligatori sono validati prima del salvataggio.</p>
          </div>
          <button type="button" onClick={props.onClose} className="rounded-xl border border-line p-2 text-stone-600 hover:text-danger" aria-label="Chiudi"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {renderFields(props.module, props.form, set, props.workers, props.fields, props.crops, props.file, props.onFile, props.isEdit)}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={props.onClose}>Annulla</button>
          <button type="submit" className="btn-primary" disabled={props.isPending}>{props.isPending ? "Salvataggio..." : "Salva"}</button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDeleteModal({ label, isPending, onCancel, onConfirm }: { label: string; isPending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">Conferma eliminazione</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">Vuoi eliminare “{label}”? L'azione verrà registrata nell'audit log e aggiornerà report e statistiche.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>Annulla</button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={isPending}><Trash2 size={16} />Elimina</button>
        </div>
      </div>
    </div>
  );
}

function renderFields(module: Module, form: Record<string, string>, set: (key: string, value: string) => void, workers: Worker[], fields: Field[], crops: Crop[], file: File | null, onFile: (file: File | null) => void, isEdit: boolean) {
  const input = (key: string, label: string, type = "text", props: Record<string, string | number> = {}) => (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <input className="input mt-1.5" type={type} value={form[key] ?? ""} onChange={(event) => set(key, event.target.value)} {...props} />
    </label>
  );
  const select = (key: string, label: string, options: Array<{ value: string; label: string }>) => (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <select className="input mt-1.5" value={form[key] ?? ""} onChange={(event) => set(key, event.target.value)}>
        <option value="">Nessun collegamento</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );

  if (module === "workers") return [input("first_name", "Nome"), input("last_name", "Cognome"), input("fiscal_code", "Codice fiscale"), input("contract_type", "Contratto"), input("hourly_rate", "Tariffa oraria", "number", { min: 0, step: "0.01" }), input("notes", "Note")];
  if (module === "fields") return [input("name", "Nome campo"), input("area_hectares", "Superficie ettari", "number", { min: 0, step: "0.0001" }), input("cadastral_reference", "Riferimento catastale")];
  if (module === "crops") return [input("name", "Nome coltura"), input("season", "Stagione"), select("field_id", "Campo collegato", fields.map((field) => ({ value: field.id, label: field.name })))];
  if (module === "workdays") return [input("work_date", "Data", "date"), input("description", "Descrizione attività"), select("worker_id", "Lavoratore", workers.map((worker) => ({ value: worker.id, label: `${worker.first_name} ${worker.last_name}` }))), select("crop_id", "Coltura", crops.map((crop) => ({ value: crop.id, label: crop.name }))), input("hours", "Ore", "number", { min: 0.25, max: 24, step: "0.25" }), input("hourly_rate", "Tariffa oraria", "number", { min: 0, step: "0.01" })];
  if (module === "expenses") return [input("expense_date", "Data spesa", "date"), input("category", "Categoria"), input("amount", "Importo", "number", { min: 0.01, step: "0.01" }), input("description", "Descrizione"), select("crop_id", "Coltura", crops.map((crop) => ({ value: crop.id, label: crop.name })))];
  if (module === "sales") return [input("sale_date", "Data vendita", "date"), input("amount", "Importo", "number", { min: 0.01, step: "0.01" }), input("description", "Descrizione"), select("crop_id", "Coltura", crops.map((crop) => ({ value: crop.id, label: crop.name })))];
  return [
    input("title", "Titolo documento"),
    input("document_type", "Tipo documento"),
    <label key="file" className="block text-sm font-semibold text-ink sm:col-span-2">
      File
      <input className="input mt-1.5" type="file" disabled={isEdit} onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
      <span className="mt-1 block text-xs font-normal text-stone-500">{file ? file.name : "PDF, PNG, JPG o TXT. Max 10 MB."}</span>
    </label>,
    input("notes", "Note")
  ];
}

function initialForm(module: Module): Record<string, string> {
  if (module === "workers") return { first_name: "", last_name: "", fiscal_code: "", contract_type: "", hourly_rate: "", notes: "" };
  if (module === "fields") return { name: "", area_hectares: "", cadastral_reference: "" };
  if (module === "crops") return { name: "", season: "", field_id: "" };
  if (module === "workdays") return { work_date: today(), description: "", worker_id: "", crop_id: "", hours: "", hourly_rate: "" };
  if (module === "expenses") return { expense_date: today(), category: "", amount: "", description: "", crop_id: "" };
  if (module === "sales") return { sale_date: today(), amount: "", description: "", crop_id: "" };
  return { title: "", document_type: "Fattura", notes: "" };
}

function formFromRecord(module: Module, item: RecordItem): Record<string, string> {
  const base = initialForm(module);
  for (const key of Object.keys(base)) {
    const value = (item as Record<string, unknown>)[key];
    base[key] = value == null ? "" : String(value);
  }
  return base;
}

function validateForm(module: Module, form: Record<string, string>, file: File | null, isEdit: boolean) {
  const required: Record<Module, string[]> = {
    workers: ["first_name", "last_name"],
    fields: ["name"],
    crops: ["name"],
    workdays: ["work_date"],
    expenses: ["expense_date", "category", "amount"],
    sales: ["sale_date", "amount"],
    documents: ["title", "document_type"]
  };
  const missing = required[module].find((key) => !String(form[key] ?? "").trim());
  if (missing) return "Compila tutti i campi obbligatori.";
  for (const key of ["amount", "hourly_rate", "hours", "area_hectares"]) {
    if (form[key] && Number(form[key]) <= 0) return "I valori numerici devono essere maggiori di zero.";
  }
  if (module === "documents" && !isEdit && !file) return "Seleziona un file da caricare.";
  if (file && file.size > 10 * 1024 * 1024) return "Il file supera il limite di 10 MB.";
  return "";
}

async function saveRecord(module: Module, farmId: string, form: Record<string, string>, file: File | null, editing: RecordItem | null) {
  const clean = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === "" ? null : value]));
  if (module === "workers") return editing ? apiClient.updateWorker(farmId, editing.id, clean) : apiClient.createWorker(farmId, clean as Omit<Worker, "id">);
  if (module === "fields") return editing ? apiClient.updateField(farmId, editing.id, clean) : apiClient.createField(farmId, clean as Omit<Field, "id">);
  if (module === "crops") return editing ? apiClient.updateCrop(farmId, editing.id, clean) : apiClient.createCrop(farmId, clean as Omit<Crop, "id">);
  if (module === "expenses") return editing ? apiClient.updateExpense(farmId, editing.id, clean) : apiClient.createExpense(farmId, clean as Omit<Expense, "id">);
  if (module === "sales") return editing ? apiClient.updateSale(farmId, editing.id, clean) : apiClient.createSale(farmId, clean as Omit<Sale, "id">);
  if (module === "workdays") {
    const payload = { work_date: form.work_date, description: form.description || null };
    const workday = editing ? await apiClient.updateWorkday(farmId, editing.id, payload) : await apiClient.createWorkday(farmId, payload);
    if (!editing && form.worker_id && form.hours) {
      await apiClient.addWorkdayEntry(farmId, workday.id, {
        workday_id: workday.id,
        worker_id: form.worker_id,
        crop_id: form.crop_id || null,
        hours: form.hours,
        hourly_rate: form.hourly_rate || null,
        activity: form.description || null
      });
    }
    return workday;
  }
  const data = new FormData();
  data.append("title", form.title);
  data.append("document_type", form.document_type);
  if (form.notes) data.append("notes", form.notes);
  if (file) data.append("file", file);
  return apiClient.uploadDocument(farmId, data);
}

function deleteRecord(module: Module, farmId: string, id: string) {
  if (module === "workers") return apiClient.deleteWorker(farmId, id);
  if (module === "fields") return apiClient.deleteField(farmId, id);
  if (module === "crops") return apiClient.deleteCrop(farmId, id);
  if (module === "workdays") return apiClient.deleteWorkday(farmId, id);
  if (module === "expenses") return apiClient.deleteExpense(farmId, id);
  if (module === "sales") return apiClient.deleteSale(farmId, id);
  return apiClient.deleteDocument(farmId, id);
}

function toRow(module: Module, item: RecordItem, handlers: { onEdit: () => void; onDelete: () => void; onClose?: () => void }) {
  const actionCells = (
    <div className="flex items-center gap-2">
      {module === "workdays" && !(item as Workday).is_closed && <button type="button" onClick={handlers.onClose} className="rounded-lg border border-line px-2 py-1 text-xs font-bold text-field hover:border-field">Chiudi</button>}
      <button type="button" onClick={handlers.onEdit} className="rounded-lg border border-line p-1.5 text-stone-600 hover:text-field" aria-label="Modifica"><Edit3 size={14} /></button>
      <button type="button" onClick={handlers.onDelete} className="rounded-lg border border-line p-1.5 text-stone-600 hover:text-danger" aria-label="Elimina"><Trash2 size={14} /></button>
    </div>
  );
  if (module === "workers") {
    const row = item as Worker;
    return { id: row.id, cells: [<span className="font-semibold text-ink">{row.first_name} {row.last_name}</span>, row.contract_type ?? "Da completare", row.hourly_rate ? <MoneyValue value={row.hourly_rate} /> : "-", <StatusBadge tone={row.fiscal_code ? "success" : "warning"}>{row.fiscal_code ? "Completo" : "CF mancante"}</StatusBadge>, actionCells] };
  }
  if (module === "fields") {
    const row = item as Field;
    return { id: row.id, cells: [row.name, row.area_hectares ? `${row.area_hectares} ha` : "-", row.cadastral_reference ?? "-", "-", actionCells] };
  }
  if (module === "crops") {
    const row = item as Crop;
    return { id: row.id, cells: [row.name, row.season ?? "-", row.field_id ? "Campo collegato" : "-", "-", "-", <StatusBadge tone="info">Da calcolare</StatusBadge>, actionCells] };
  }
  if (module === "workdays") {
    const row = item as Workday;
    return { id: row.id, cells: [<DateDisplay value={row.work_date} />, "-", row.description ?? "-", "-", "-", <StatusBadge tone={row.is_closed ? "success" : "warning"}>{row.is_closed ? "Chiusa" : "Aperta"}</StatusBadge>, actionCells] };
  }
  if (module === "expenses") {
    const row = item as Expense;
    return { id: row.id, cells: [<DateDisplay value={row.expense_date} />, row.category, row.description ?? "-", <MoneyValue value={row.amount} />, actionCells] };
  }
  if (module === "sales") {
    const row = item as Sale;
    return { id: row.id, cells: [<DateDisplay value={row.sale_date} />, row.description ?? "Vendita", row.crop_id ? "Coltura collegata" : "-", <MoneyValue value={row.amount} />, actionCells] };
  }
  const row = item as Document;
  return { id: row.id, cells: [row.title, row.document_type, <StatusBadge tone={row.status === "RECEIVED" ? "success" : "warning"}>{row.status}</StatusBadge>, row.original_file_name ?? "-", actionCells] };
}

function filterRecords(items: RecordItem[], search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(term));
}

function recordLabel(module: Module, item: RecordItem) {
  if (module === "workers") return `${(item as Worker).first_name} ${(item as Worker).last_name}`;
  if ("name" in item) return String(item.name);
  if ("title" in item) return String(item.title);
  if ("description" in item && item.description) return String(item.description);
  return singularLabel(module);
}

function singularLabel(module: Module) {
  return {
    workers: "lavoratore",
    workdays: "giornata",
    crops: "coltura",
    fields: "campo",
    expenses: "spesa",
    sales: "vendita",
    documents: "documento"
  }[module];
}

function emptyIcon(module: Module) {
  return { workers: Users, workdays: CalendarDays, crops: Leaf, fields: MapPin, expenses: Receipt, sales: WalletCards, documents: FileWarning }[module];
}

function userError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Riprova tra poco. I dettagli tecnici sono disponibili solo nei log di sviluppo.";
}
