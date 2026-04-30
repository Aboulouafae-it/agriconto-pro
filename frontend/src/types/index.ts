export type Role = "OWNER" | "ACCOUNTANT" | "LABOR_CONSULTANT" | "WORKER";

export type FiscalProfile =
  | "REGIME_SPECIALE_AGRICOLO"
  | "REGIME_ORDINARIO"
  | "REGIME_ESONERO";

export type User = {
  id: string;
  email: string;
  full_name: string;
};

export type Farm = {
  id: string;
  name: string;
  legal_name?: string | null;
  partita_iva?: string | null;
  codice_fiscale?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  fiscal_profile: FiscalProfile;
};

export type Worker = {
  id: string;
  first_name: string;
  last_name: string;
  fiscal_code?: string | null;
  contract_type?: string | null;
  hourly_rate?: string | number | null;
  notes?: string | null;
};

export type Expense = {
  id: string;
  expense_date: string;
  category: string;
  amount: string | number;
  description?: string | null;
  supplier_id?: string | null;
  crop_id?: string | null;
};

export type Sale = {
  id: string;
  sale_date: string;
  amount: string | number;
  description?: string | null;
  customer_id?: string | null;
  crop_id?: string | null;
};

export type DocumentRequest = {
  id: string;
  title: string;
  requested_from?: string | null;
  due_date?: string | null;
  status: "REQUESTED" | "RECEIVED" | "MISSING" | "ARCHIVED";
};

export type ReportResponse<T = Record<string, unknown>> = {
  farm_id: string;
  report: string;
  data: T;
};

export type AnalyticsResponse<T = Record<string, unknown>> = {
  farm_id: string;
  section: string;
  filters: Record<string, unknown>;
  data: T;
};

export type ModuleKey =
  | "dashboard"
  | "analytics"
  | "farm"
  | "workers"
  | "workdays"
  | "crops"
  | "fields"
  | "expenses"
  | "sales"
  | "documents"
  | "commercialista"
  | "reports"
  | "settings";
