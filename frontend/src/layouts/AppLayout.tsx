import {
  BarChart3,
  BriefcaseBusiness,
  ChartSpline,
  FileText,
  Home,
  Landmark,
  Leaf,
  LogOut,
  Map,
  Menu,
  Plus,
  Receipt,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  WalletCards,
  X
} from "lucide-react";
import type { ElementType } from "react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { BrandMark } from "../components/brand/BrandMark";
import { DesktopBackendNotice } from "../components/DesktopBackendNotice";
import { RoleBadge, StatusBadge, ToastMessage } from "../components/design-system";
import { useFarm } from "../features/useFarm";
import { canView } from "../lib/permissions";
import type { ModuleKey } from "../types";

const sections: Array<{ title: string; items: Array<{ key: ModuleKey; to: string; label: string; icon: ElementType }> }> = [
  {
    title: "Gestione",
    items: [
      { key: "dashboard", to: "/", label: "Dashboard", icon: Home },
      { key: "analytics", to: "/statistiche", label: "Statistiche", icon: ChartSpline },
      { key: "farm", to: "/azienda", label: "Azienda", icon: BriefcaseBusiness },
      { key: "workers", to: "/lavoratori", label: "Lavoratori", icon: Users },
      { key: "workdays", to: "/giornate", label: "Giornate", icon: WalletCards },
      { key: "crops", to: "/colture", label: "Colture", icon: Leaf },
      { key: "fields", to: "/campi", label: "Campi", icon: Map }
    ]
  },
  {
    title: "Contabilità",
    items: [
      { key: "expenses", to: "/spese", label: "Spese", icon: Receipt },
      { key: "sales", to: "/vendite", label: "Vendite", icon: Landmark },
      { key: "reports", to: "/report", label: "Report", icon: BarChart3 }
    ]
  },
  {
    title: "Collaborazione",
    items: [
      { key: "documents", to: "/documenti", label: "Documenti", icon: FileText },
      { key: "commercialista", to: "/commercialista", label: "Commercialista", icon: Leaf }
    ]
  },
  {
    title: "Sistema",
    items: [{ key: "settings", to: "/impostazioni", label: "Impostazioni", icon: Settings }]
  }
];

type QuickAction = {
  label: string;
  icon: ElementType;
  to: string;
};

const quickActions: QuickAction[] = [
  { label: "Nuova spesa", icon: Receipt, to: "/spese?action=new" },
  { label: "Nuova vendita", icon: Landmark, to: "/vendite?action=new" },
  { label: "Nuova giornata", icon: WalletCards, to: "/giornate?action=new" },
  { label: "Carica documento", icon: Upload, to: "/documenti?action=new" },
  { label: "Aggiungi lavoratore", icon: Users, to: "/lavoratori?action=new" }
];

export function Layout() {
  const auth = useAuth();
  const farm = useFarm();
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [devToast, setDevToast] = useState<string | null>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  const visibleSections = sections
    .map((section) => ({ ...section, items: section.items.filter((item) => canView(auth.role, item.key)) }))
    .filter((section) => section.items.length > 0);

  const currentPeriod = new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  // Close quick-actions on click outside
  useEffect(() => {
    if (!quickOpen) return;
    function handleOutside(event: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(event.target as Node)) {
        setQuickOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [quickOpen]);

  // Close quick-actions on Escape
  useEffect(() => {
    if (!quickOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setQuickOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [quickOpen]);

  function handleQuickAction(action: QuickAction) {
    setQuickOpen(false);
    navigate(action.to);
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="hidden h-24 items-center px-6 md:flex">
        <div className="flex items-center gap-3">
          <BrandMark className="h-11 w-11 rounded-2xl shadow-sm" />
          <div>
            <p className="text-lg font-bold tracking-tight">AgriConto Pro</p>
            <p className="text-xs text-stone-500">Contabilità agricola sicura</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex gap-1 overflow-x-auto px-2 py-2 md:block md:space-y-5 md:px-4 md:py-0">
        {visibleSections.map((section) => (
          <div key={section.title} className="contents md:block">
            <p className="mb-2 hidden px-3 text-[11px] font-bold uppercase tracking-wide text-stone-400 md:block">
              {section.title}
            </p>
            <div className="flex gap-1 md:block md:space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `group flex min-w-20 flex-col items-center gap-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition md:w-full md:min-w-0 md:flex-row md:px-3.5 md:text-sm ${
                        isActive
                          ? "bg-field text-white shadow-sm"
                          : "text-stone-600 hover:bg-stone-100 hover:text-ink"
                      }`
                    }
                    title={item.label}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Security note */}
      <div className="mx-4 mt-6 hidden rounded-2xl border border-line bg-finance-light p-4 md:block">
        <div className="flex items-center gap-2 text-finance">
          <ShieldCheck size={17} />
          <p className="text-sm font-bold">Accesso sicuro</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-stone-600">
          Permessi e isolamento azienda sono verificati lato server.
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-mist text-ink">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-y-auto border-r border-line bg-white/95 shadow-soft backdrop-blur md:block">
        {sidebarContent}
      </aside>

      {/* Sidebar — mobile overlay */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white shadow-soft md:hidden">
            <div className="flex h-16 items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <BrandMark className="h-9 w-9 rounded-xl shadow-sm" />
                <p className="text-base font-bold">AgriConto Pro</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-line p-2 text-stone-500 hover:bg-stone-100"
                aria-label="Chiudi menu"
              >
                <X size={18} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden">
        <nav className="flex gap-1 overflow-x-auto px-2 py-2">
          {visibleSections.flatMap((s) => s.items).slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex min-w-16 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                    isActive ? "bg-field text-white" : "text-stone-600"
                  }`
                }
              >
                <Icon size={17} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <main className="pb-28 md:ml-72 md:pb-0">
        <DesktopBackendNotice />

        <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="rounded-xl border border-line p-2 text-stone-500 hover:bg-stone-100 md:hidden"
                aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
                aria-expanded={mobileOpen}
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-stone-500">{currentPeriod}</p>
                <h1 className="truncate text-lg font-bold tracking-tight">{farm.currentFarm?.name ?? "AgriConto Pro"}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge tone="success">Sistema operativo</StatusBadge>
              <RoleBadge role={auth.role} />

              {/* Quick actions dropdown */}
              <div ref={quickRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setQuickOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={quickOpen}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-field shadow-sm transition hover:border-field"
                >
                  <Plus size={16} />
                  Azioni rapide
                </button>

                {quickOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-soft"
                  >
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          role="menuitem"
                          type="button"
                          onClick={() => handleQuickAction(action)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-field"
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-field/10 text-field">
                            <Icon size={15} />
                          </span>
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={auth.logout}
                className="rounded-xl border border-line bg-white p-2.5 text-stone-600 transition hover:border-danger hover:text-danger"
                title="Esci"
                aria-label="Esci"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>

        {/* Mobile quick-action FABs */}
        <div className="fixed bottom-20 right-4 z-20 flex flex-col gap-2 md:hidden">
          {quickActions.slice(0, 4).map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.to)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-field px-3.5 py-2 text-xs font-bold text-white shadow-soft"
              >
                <Icon size={16} />
                {action.label}
              </button>
            );
          })}
        </div>
      </main>

      {devToast && (
        <ToastMessage
          tone="info"
          title="Funzione in sviluppo"
          detail={devToast}
          onClose={() => setDevToast(null)}
        />
      )}
    </div>
  );
}
