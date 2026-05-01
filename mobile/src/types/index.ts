/**
 * AgriConto Pro Mobile — Type definitions.
 * Mirrors backend schemas for type-safe API integration.
 */

// ─── Auth ────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserRead {
  id: string;
  email: string;
  full_name: string;
}

// ─── Farm ────────────────────────────────────────────────────
export type FarmRole = 'OWNER' | 'ACCOUNTANT' | 'LABOR_CONSULTANT' | 'WORKER';

export interface FarmRead {
  id: string;
  name: string;
  legal_name: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  fiscal_profile: string;
  role?: FarmRole | null;
}

export interface FarmMemberRead {
  id: string;
  user_id: string;
  farm_id: string;
  role: FarmRole;
}

// ─── Worker ──────────────────────────────────────────────────
export interface WorkerOut {
  id: string;
  first_name: string;
  last_name: string;
  fiscal_code: string | null;
  contract_type: string | null;
  hourly_rate: number | null;
  notes: string | null;
}

// ─── Workday ─────────────────────────────────────────────────
export interface WorkdayIn {
  work_date: string; // YYYY-MM-DD
  description?: string | null;
}

export interface WorkdayOut {
  id: string;
  work_date: string;
  description: string | null;
  is_closed: boolean;
}

export interface WorkdayEntryIn {
  workday_id: string;
  worker_id: string;
  crop_id?: string | null;
  hours: number;
  hourly_rate?: number | null;
  activity?: string | null;
}

export interface WorkdayEntryOut extends WorkdayEntryIn {
  id: string;
}

// ─── Expense ─────────────────────────────────────────────────
export interface ExpenseIn {
  expense_date: string;
  supplier_id?: string | null;
  crop_id?: string | null;
  category: string;
  amount: number;
  description?: string | null;
}

export interface ExpenseOut extends ExpenseIn {
  id: string;
}

// ─── Sale ────────────────────────────────────────────────────
export interface SaleIn {
  sale_date: string;
  customer_id?: string | null;
  crop_id?: string | null;
  amount: number;
  description?: string | null;
}

export interface SaleOut extends SaleIn {
  id: string;
}

// ─── Document ────────────────────────────────────────────────
export type DocumentStatus = 'REQUESTED' | 'RECEIVED' | 'MISSING' | 'ARCHIVED';

export interface DocumentOut {
  id: string;
  title: string;
  document_type: string;
  original_file_name: string | null;
  stored_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  status: DocumentStatus;
  related_entity_type: string | null;
  related_entity_id: string | null;
  notes: string | null;
}

// ─── Crop ────────────────────────────────────────────────────
export interface CropOut {
  id: string;
  name: string;
  season: string | null;
  field_id: string | null;
}

// ─── Field ───────────────────────────────────────────────────
export interface FieldOut {
  id: string;
  name: string;
  cadastral_reference: string | null;
  area_hectares: number | null;
}

// ─── Paginated response ──────────────────────────────────────
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ─── Report ──────────────────────────────────────────────────
export interface ReportOut {
  farm_id: string;
  report: string;
  data: Record<string, unknown>;
}

// ─── Offline Draft ───────────────────────────────────────────
export type DraftType = 'expense' | 'sale' | 'workday' | 'workday_entry' | 'document';
export type DraftStatus = 'pending' | 'syncing' | 'error' | 'synced';

export interface OfflineDraft<T = Record<string, unknown>> {
  id: string;
  type: DraftType;
  status: DraftStatus;
  data: T;
  farmId: string;
  createdAt: string;
  lastAttempt: string | null;
  errorMessage: string | null;
  retryCount: number;
}

// ─── Role labels ─────────────────────────────────────────────
export const ROLE_LABELS: Record<FarmRole, string> = {
  OWNER: 'Titolare',
  ACCOUNTANT: 'Commercialista',
  LABOR_CONSULTANT: 'Consulente del lavoro',
  WORKER: 'Lavoratore',
};

// ─── Expense categories ──────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Carburante',
  'Concimi',
  'Semi',
  'Fitofarmaci',
  'Macchinari',
  'Affitto',
  'Acqua',
  'Elettricità',
  'Trasporto',
  'Commercialista',
  'Assicurazione',
  'Salari',
  'Altro',
] as const;

// ─── Task types ──────────────────────────────────────────────
export const TASK_TYPES = [
  'Raccolta',
  'Potatura',
  'Irrigazione',
  'Semina',
  'Concimazione',
  'Trasporto',
  'Pulizia',
  'Altro',
] as const;

// ─── Document types ──────────────────────────────────────────
export const DOCUMENT_TYPES = [
  'Fattura',
  'Ricevuta',
  'Contratto',
  'Documento lavoratore',
  'Foto',
  'Altro',
] as const;
