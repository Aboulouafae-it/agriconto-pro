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
  Receipt,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  WalletCards
} from "lucide-react";
import type { ElementType } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { BrandMark } from "../components/brand/BrandMark";
import { DesktopBackendNotice } from "../components/DesktopBackendNotice";
import { RoleBadge, StatusBadge } from "../components/design-system";
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

const quickActions = [
  ["Nuova spesa", Receipt],
  ["Nuova giornata", WalletCards],
  ["Carica documento", Upload],
  ["Nuova vendita", Landmark]
] as const;

export function Layout() {
  const auth = useAuth();
  const farm = useFarm();
  const visibleSections = sections
    .map((section) => ({ ...section, items: section.items.filter((item) => canView(auth.role, item.key)) }))
    .filter((section) => section.items.length > 0);
  const currentPeriod = new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-mist text-ink">
      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 shadow-soft backdrop-blur md:inset-y-0 md:left-0 md:right-auto md:w-72 md:border-r md:border-t-0">
        <div className="hidden h-24 items-center px-6 md:flex">
          <div className="flex items-center gap-3">
            <BrandMark className="h-11 w-11 rounded-2xl shadow-sm" />
            <div>
              <p className="text-lg font-bold tracking-tight">AgriConto Pro</p>
              <p className="text-xs text-stone-500">Contabilità agricola sicura</p>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-2 md:block md:space-y-5 md:px-4 md:py-0">
          {visibleSections.map((section) => (
            <div key={section.title} className="contents md:block">
              <p className="mb-2 hidden px-3 text-[11px] font-bold uppercase tracking-wide text-stone-400 md:block">{section.title}</p>
              <div className="flex gap-1 md:block md:space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.key}
                      to={item.to}
                      end={item.to === "/"}
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
        <div className="mx-4 mt-6 hidden rounded-2xl border border-line bg-finance-light p-4 md:block">
          <div className="flex items-center gap-2 text-finance">
            <ShieldCheck size={17} />
            <p className="text-sm font-bold">Accesso sicuro</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-600">Permessi e isolamento azienda sono verificati lato server.</p>
        </div>
      </aside>

      <main className="pb-28 md:ml-72 md:pb-0">
        <DesktopBackendNotice />
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Menu className="text-stone-500 md:hidden" size={20} />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-stone-500">{currentPeriod}</p>
                <h1 className="truncate text-lg font-bold tracking-tight">{farm.currentFarm?.name ?? "AgriConto Pro"}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone="success">Sistema operativo</StatusBadge>
              <RoleBadge role={auth.role} />
              <button className="hidden rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-field shadow-sm transition hover:border-field md:inline-flex">
                Azioni rapide
              </button>
              <button onClick={auth.logout} className="rounded-xl border border-line bg-white p-2.5 text-stone-600 transition hover:border-danger hover:text-danger" title="Esci" aria-label="Esci">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>

        <div className="fixed bottom-20 right-4 z-20 flex flex-col gap-2 md:hidden">
          {quickActions.map(([label, Icon]) => (
            <button key={label} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-field px-3.5 py-2 text-xs font-bold text-white shadow-soft">
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
