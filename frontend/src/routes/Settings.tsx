import { BriefcaseBusiness, ExternalLink, KeyRound, Leaf, Lock, ShieldCheck, Tags, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { PageHeader } from "../components/PageHeader";
import { ConfirmDialog, RoleBadge, StatusBadge, ToastMessage } from "../components/design-system";
import { roleLabel } from "../lib/permissions";
import { useState } from "react";
import type { Role } from "../types";

const roles: Role[] = ["OWNER", "ACCOUNTANT", "LABOR_CONSULTANT", "WORKER"];

type SettingCard = {
  title: string;
  detail: string;
  Icon: React.ElementType;
  action: "navigate" | "toast";
  to?: string;
};

const sections: SettingCard[] = [
  {
    title: "Profilo azienda",
    detail: "Dati anagrafici e indirizzo farm.",
    Icon: BriefcaseBusiness,
    action: "navigate",
    to: "/azienda"
  },
  {
    title: "Profilo fiscale",
    detail: "Metadato informativo configurato nel profilo azienda.",
    Icon: Leaf,
    action: "navigate",
    to: "/azienda"
  },
  {
    title: "Utenti e ruoli",
    detail: "Inviti, accessi e permessi server-side.",
    Icon: Users,
    action: "toast"
  },
  {
    title: "Categorie",
    detail: "Classificazione spese, vendite e documenti.",
    Icon: Tags,
    action: "toast"
  },
  {
    title: "Sicurezza",
    detail: "Token, sessione, audit trail e accessi.",
    Icon: Lock,
    action: "toast"
  },
  {
    title: "Disclaimer legale",
    detail: "Ruolo di supporto, non sostituzione professionale.",
    Icon: ShieldCheck,
    action: "toast"
  }
] as const;

export function Settings() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  function handleCard(card: SettingCard) {
    if (card.action === "navigate" && card.to) {
      navigate(card.to);
    } else {
      setToast(card.title);
    }
  }

  return (
    <section className="space-y-6">
      {toast && (
        <ToastMessage
          tone="info"
          title="Funzione in sviluppo"
          detail={`"${toast}" sarà disponibile in una prossima versione.`}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeader
        eyebrow="Configurazione"
        title="Impostazioni"
        subtitle="Account, azienda, ruoli, categorie e note di sicurezza. I permessi reali sono sempre verificati lato server."
        actions={<RoleBadge role={auth.role} />}
      />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card p-5">
          <h3 className="section-title">Account</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Nome</dt><dd className="font-semibold">{auth.user?.full_name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Email</dt><dd className="font-semibold">{auth.user?.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Sessione</dt><dd><StatusBadge tone="success">Attiva</StatusBadge></dd></div>
          </dl>
        </div>

        <div className="card p-5">
          <h3 className="section-title">Ruolo UI demo</h3>
          <p className="helper-text mt-1">Questo selettore mostra solo come cambia l'interfaccia. Non concede permessi reali.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => auth.setRole(role)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${auth.role === role ? "border-field bg-field text-white" : "border-line bg-white text-stone-700 hover:border-field"}`}
              >
                {roleLabel(role)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((card) => {
          const { Icon } = card;
          const isNavigable = card.action === "navigate";
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => handleCard(card)}
              className="card p-5 text-left transition hover:-translate-y-0.5 hover:border-field hover:shadow-soft focus-visible:outline-2 focus-visible:outline-field"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-finance-light text-finance">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink">{card.title}</h3>
                    {isNavigable && <ExternalLink size={13} className="text-stone-400" />}
                    {!isNavigable && <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500">In sviluppo</span>}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{card.detail}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <ConfirmDialog
        title="Nota sulla sicurezza frontend"
        detail="Il token è salvato in localStorage nella fondazione di sviluppo. Questa scelta è documentata e non sostituisce i controlli server-side."
      />

      <div className="card p-5">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-field" />
          <h3 className="section-title">Accessi sensibili</h3>
        </div>
        <p className="helper-text mt-2">
          Azioni distruttive, inviti e gestione ruoli richiederanno conferme dedicate quando le funzioni saranno abilitate.
        </p>
      </div>
    </section>
  );
}
