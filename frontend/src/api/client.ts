import type { AnalyticsResponse, Crop, Document, Expense, Farm, Field, Page, ReportResponse, Sale, User, Workday, WorkdayEntry, Worker } from "../types";
import { getToken, clearToken } from "../auth/tokenStore";

export const API_URL =
  import.meta.env.VITE_API_URL ?? window.agricontoDesktop?.apiUrl ?? "http://localhost:8001/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  isFormData?: boolean;
  suppressUnauthorizedEvent?: boolean;
};

function unwrapPage<T>(response: Page<T> | T[]): T[] {
  return Array.isArray(response) ? response : response.items;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token ?? getToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  if (!options.isFormData) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body
        ? options.isFormData
          ? (options.body as BodyInit)
          : JSON.stringify(options.body)
        : undefined
    });
  } catch {
    throw new ApiError(0, `Backend non raggiungibile. Verifica che l'API sia avviata su ${API_URL}.`);
  }

  if (response.status === 401 && !options.suppressUnauthorizedEvent) {
    clearToken();
    window.dispatchEvent(new Event("agriconto:unauthorized"));
  }

  if (!response.ok) {
    throw new ApiError(response.status, safeErrorMessage(response.status));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function safeErrorMessage(status: number): string {
  if (status === 401) return "Sessione scaduta. Accedi di nuovo.";
  if (status === 403) return "Non hai i permessi per questa operazione.";
  if (status >= 500) return "Servizio non disponibile. Riprova piu tardi.";
  return "Richiesta non riuscita. Controlla i dati inseriti.";
}

export const apiClient = {
  me: () => api<User>("/auth/me"),
  login: async (payload: { email: string; password: string }) => {
    try {
      return await api<{ access_token: string; token_type: string; expires_in: number }>("/auth/login", {
        method: "POST",
        body: payload,
        suppressUnauthorizedEvent: true
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError(401, "Credenziali non valide. Verifica email e password.");
      }
      if (error instanceof ApiError && error.status === 422) {
        throw new ApiError(422, "Email o password non validi. Controlla il formato dei dati inseriti.");
      }
      throw error;
    }
  },
  register: (payload: { email: string; full_name: string; password: string }) =>
    api<User>("/auth/register", { method: "POST", body: payload }),
  farms: () => api<Farm[]>("/farms"),
  createFarm: (payload: Omit<Farm, "id">) => api<Farm>("/farms", { method: "POST", body: payload }),
  updateFarm: (farmId: string, payload: Partial<Omit<Farm, "id">>) => api<Farm>(`/farms/${farmId}`, { method: "PATCH", body: payload }),
  workers: async (farmId: string) => unwrapPage(await api<Page<Worker> | Worker[]>(`/farms/${farmId}/workers`)),
  createWorker: (farmId: string, payload: Omit<Worker, "id">) => api<Worker>(`/farms/${farmId}/workers`, { method: "POST", body: payload }),
  updateWorker: (farmId: string, workerId: string, payload: Partial<Omit<Worker, "id">>) => api<Worker>(`/farms/${farmId}/workers/${workerId}`, { method: "PATCH", body: payload }),
  deleteWorker: (farmId: string, workerId: string) => api<void>(`/farms/${farmId}/workers/${workerId}`, { method: "DELETE" }),
  fields: async (farmId: string) => unwrapPage(await api<Page<Field> | Field[]>(`/farms/${farmId}/fields`)),
  createField: (farmId: string, payload: Omit<Field, "id">) => api<Field>(`/farms/${farmId}/fields`, { method: "POST", body: payload }),
  updateField: (farmId: string, fieldId: string, payload: Partial<Omit<Field, "id">>) => api<Field>(`/farms/${farmId}/fields/${fieldId}`, { method: "PATCH", body: payload }),
  deleteField: (farmId: string, fieldId: string) => api<void>(`/farms/${farmId}/fields/${fieldId}`, { method: "DELETE" }),
  crops: async (farmId: string) => unwrapPage(await api<Page<Crop> | Crop[]>(`/farms/${farmId}/crops`)),
  createCrop: (farmId: string, payload: Omit<Crop, "id">) => api<Crop>(`/farms/${farmId}/crops`, { method: "POST", body: payload }),
  updateCrop: (farmId: string, cropId: string, payload: Partial<Omit<Crop, "id">>) => api<Crop>(`/farms/${farmId}/crops/${cropId}`, { method: "PATCH", body: payload }),
  deleteCrop: (farmId: string, cropId: string) => api<void>(`/farms/${farmId}/crops/${cropId}`, { method: "DELETE" }),
  workdays: async (farmId: string) => unwrapPage(await api<Page<Workday> | Workday[]>(`/farms/${farmId}/workdays`)),
  createWorkday: (farmId: string, payload: Omit<Workday, "id" | "is_closed">) => api<Workday>(`/farms/${farmId}/workdays`, { method: "POST", body: payload }),
  updateWorkday: (farmId: string, workdayId: string, payload: Partial<Omit<Workday, "id">>) => api<Workday>(`/farms/${farmId}/workdays/${workdayId}`, { method: "PATCH", body: payload }),
  deleteWorkday: (farmId: string, workdayId: string) => api<void>(`/farms/${farmId}/workdays/${workdayId}`, { method: "DELETE" }),
  addWorkdayEntry: (farmId: string, workdayId: string, payload: Omit<WorkdayEntry, "id">) =>
    api<WorkdayEntry>(`/farms/${farmId}/workdays/${workdayId}/entries`, { method: "POST", body: payload }),
  closeWorkday: (farmId: string, workdayId: string) => api<Workday>(`/farms/${farmId}/workdays/${workdayId}/close`, { method: "POST" }),
  expenses: async (farmId: string) => unwrapPage(await api<Page<Expense> | Expense[]>(`/farms/${farmId}/expenses`)),
  createExpense: (farmId: string, payload: Omit<Expense, "id">) => api<Expense>(`/farms/${farmId}/expenses`, { method: "POST", body: payload }),
  updateExpense: (farmId: string, expenseId: string, payload: Partial<Omit<Expense, "id">>) => api<Expense>(`/farms/${farmId}/expenses/${expenseId}`, { method: "PATCH", body: payload }),
  deleteExpense: (farmId: string, expenseId: string) => api<void>(`/farms/${farmId}/expenses/${expenseId}`, { method: "DELETE" }),
  sales: async (farmId: string) => unwrapPage(await api<Page<Sale> | Sale[]>(`/farms/${farmId}/sales`)),
  createSale: (farmId: string, payload: Omit<Sale, "id">) => api<Sale>(`/farms/${farmId}/sales`, { method: "POST", body: payload }),
  updateSale: (farmId: string, saleId: string, payload: Partial<Omit<Sale, "id">>) => api<Sale>(`/farms/${farmId}/sales/${saleId}`, { method: "PATCH", body: payload }),
  deleteSale: (farmId: string, saleId: string) => api<void>(`/farms/${farmId}/sales/${saleId}`, { method: "DELETE" }),
  documents: async (farmId: string) => unwrapPage(await api<Page<Document> | Document[]>(`/farms/${farmId}/documents`)),
  deleteDocument: (farmId: string, documentId: string) => api<void>(`/farms/${farmId}/documents/${documentId}`, { method: "DELETE" }),
  documentRequests: async (farmId: string) => unwrapPage(await api<Page<{ id: string; title: string; status: string; due_date?: string | null; requested_from?: string | null }> | Array<{ id: string; title: string; status: string; due_date?: string | null; requested_from?: string | null }>>(`/farms/${farmId}/document-requests`)),
  report: <T = Record<string, unknown>>(farmId: string, name: string, query = "") =>
    api<ReportResponse<T>>(`/farms/${farmId}/reports/${name}${query}`),
  analytics: <T = Record<string, unknown>>(farmId: string, section: string, query = "") =>
    api<AnalyticsResponse<T>>(`/farms/${farmId}/analytics/${section}${query}`),
  reportPdf: async (farmId: string, name: string, query = "") => {
    const token = getToken();
    const response = await fetch(`${API_URL}/farms/${farmId}/reports/${name}/pdf${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      throw new ApiError(response.status, safeErrorMessage(response.status));
    }
    return response.blob();
  },
  uploadDocument: (farmId: string, formData: FormData) =>
    api(`/farms/${farmId}/documents/upload`, {
      method: "POST",
      body: formData,
      isFormData: true
    })
};
