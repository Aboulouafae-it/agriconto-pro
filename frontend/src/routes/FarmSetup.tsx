import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "../components/design-system";
import { useFarm } from "../features/useFarm";
import type { Farm } from "../types";

const farmSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio").max(255),
  legal_name: z.string().max(255).optional(),
  partita_iva: z.string().max(32).optional(),
  codice_fiscale: z.string().max(32).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(120).optional(),
  province: z.string().max(2).optional(),
  region: z.string().max(120).optional(),
  fiscal_profile: z.enum(["REGIME_SPECIALE_AGRICOLO", "REGIME_ORDINARIO", "REGIME_ESONERO"])
});

type FarmForm = z.infer<typeof farmSchema>;

export function FarmSetup() {
  const farm = useFarm();
  const queryClient = useQueryClient();
  const form = useForm<FarmForm>({
    resolver: zodResolver(farmSchema),
    values: {
      name: farm.currentFarm?.name ?? "",
      legal_name: farm.currentFarm?.legal_name ?? "",
      partita_iva: farm.currentFarm?.partita_iva ?? "",
      codice_fiscale: farm.currentFarm?.codice_fiscale ?? "",
      address: farm.currentFarm?.address ?? "",
      city: farm.currentFarm?.city ?? "",
      province: farm.currentFarm?.province ?? "",
      region: farm.currentFarm?.region ?? "",
      fiscal_profile: farm.currentFarm?.fiscal_profile ?? "REGIME_SPECIALE_AGRICOLO"
    }
  });

  const createFarm = useMutation({
    mutationFn: (values: FarmForm) => apiClient.createFarm(clean(values)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["farms"] })
  });

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Profilo farm"
        title="Configurazione azienda"
        subtitle="Identita aziendale, profilo fiscale come metadato e base per isolamento multi-tenant."
        actions={<StatusBadge tone="info">Metadati fiscali</StatusBadge>}
      />
      {farm.isLoading && <LoadingState label="Caricamento profilo azienda..." />}
      {farm.error && <ErrorState detail="Non e stato possibile caricare le aziende associate all'utente." />}
      {!farm.currentFarm && !farm.isLoading && (
        <EmptyState title="Nessuna azienda" detail="Crea la prima azienda per iniziare a registrare dati farm-scoped." />
      )}
      <form onSubmit={form.handleSubmit((values) => createFarm.mutate(values))} className="card grid gap-4 p-5 sm:grid-cols-2">
        <Input label="Nome azienda" error={form.formState.errors.name?.message} {...form.register("name")} />
        <Input label="Ragione sociale" {...form.register("legal_name")} />
        <Input label="Partita IVA" {...form.register("partita_iva")} />
        <Input label="Codice fiscale" {...form.register("codice_fiscale")} />
        <Input label="Indirizzo" {...form.register("address")} />
        <Input label="Comune" {...form.register("city")} />
        <Input label="Provincia" maxLength={2} {...form.register("province")} />
        <Input label="Regione" {...form.register("region")} />
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold text-stone-700">Profilo fiscale</span>
          <select className="input mt-1" {...form.register("fiscal_profile")}>
            <option value="REGIME_SPECIALE_AGRICOLO">Regime speciale agricolo</option>
            <option value="REGIME_ORDINARIO">Regime ordinario</option>
            <option value="REGIME_ESONERO">Regime esonero</option>
          </select>
        </label>
        {createFarm.isError && <div className="sm:col-span-2"><ErrorState detail="Salvataggio non riuscito. Verifica i dati e i permessi." /></div>}
        <div className="sm:col-span-2">
          <button className="btn-primary" disabled={createFarm.isPending}>
            <Save size={17} />
            {farm.currentFarm ? "Salva nuova azienda" : "Crea azienda"}
          </button>
        </div>
      </form>
    </section>
  );
}

function clean(values: FarmForm) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? null : value])) as Omit<Farm, "id">;
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const { label, error, ...inputProps } = props;
  return (
    <label className="block text-sm">
      <span className="font-semibold text-stone-700">{label}</span>
      <input className="input mt-1" {...inputProps} />
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}
