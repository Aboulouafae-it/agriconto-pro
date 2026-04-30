import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthPage } from "../auth/AuthPage";
import { RequireAuth } from "../auth/RequireAuth";
import { Layout } from "../layouts/AppLayout";
import { Commercialista } from "../routes/Commercialista";
import { Dashboard } from "../routes/Dashboard";
import { FarmSetup } from "../routes/FarmSetup";
import { AnalyticsPage } from "../features/analytics/pages/AnalyticsPage";
import { ModulePage } from "../routes/ModulePage";
import { Reports } from "../routes/Reports";
import { Settings } from "../routes/Settings";

const modulePages = {
  workers: {
    module: "workers",
    title: "Lavoratori",
    subtitle: "Anagrafica, contratti, tariffe e note operative.",
    columns: ["Nome", "Contratto", "Tariffa", "Stato"]
  },
  workdays: {
    module: "workdays",
    title: "Giornate",
    subtitle: "Registrazione veloce delle giornate, delle ore e delle attività svolte in campo.",
    columns: ["Data", "Lavoratori", "Attività", "Coltura/Campo", "Ore", "Importo"]
  },
  crops: {
    module: "crops",
    title: "Colture",
    subtitle: "Stagioni produttive collegate a campi, costi e vendite.",
    columns: ["Coltura", "Stagione", "Campo", "Costi", "Ricavi", "Margine"]
  },
  fields: {
    module: "fields",
    title: "Campi",
    subtitle: "Superfici, riferimenti catastali e collegamento alle colture.",
    columns: ["Nome", "Ettari", "Catasto", "Colture"]
  },
  expenses: {
    module: "expenses",
    title: "Spese",
    subtitle: "Inserimento rapido dei costi, stato pagamento e documenti da consegnare al commercialista.",
    columns: ["Data", "Categoria", "Descrizione", "Importo"]
  },
  sales: {
    module: "sales",
    title: "Vendite",
    subtitle: "Ricavi per prodotto, cliente, coltura, fattura e stato incasso.",
    columns: ["Data", "Descrizione", "Coltura", "Importo"]
  },
  documents: {
    module: "documents",
    title: "Documenti",
    subtitle: "Archivio ordinato, richieste documentali, filtri e avvisi sui documenti mancanti.",
    columns: ["Titolo", "Tipo", "Stato", "Scadenza"]
  }
} as const;

const router = createBrowserRouter([
  { path: "/login", element: <AuthPage mode="login" /> },
  { path: "/register", element: <AuthPage mode="register" /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "statistiche", element: <AnalyticsPage /> },
          { path: "azienda", element: <FarmSetup /> },
          { path: "lavoratori", element: <ModulePage {...modulePages.workers} /> },
          { path: "giornate", element: <ModulePage {...modulePages.workdays} /> },
          { path: "colture", element: <ModulePage {...modulePages.crops} /> },
          { path: "campi", element: <ModulePage {...modulePages.fields} /> },
          { path: "spese", element: <ModulePage {...modulePages.expenses} /> },
          { path: "vendite", element: <ModulePage {...modulePages.sales} /> },
          { path: "documenti", element: <ModulePage {...modulePages.documents} /> },
          { path: "commercialista", element: <Commercialista /> },
          { path: "report", element: <Reports /> },
          { path: "impostazioni", element: <Settings /> }
        ]
      }
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

export function App() {
  return <RouterProvider router={router} />;
}
