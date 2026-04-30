import type { AnalyticsResponse, Expense, Farm, ReportResponse, Sale, User, Worker } from "../types";
import { getToken, clearToken } from "../auth/tokenStore";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8001/api/v1";

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
  workers: (farmId: string) => api<Worker[]>(`/farms/${farmId}/workers`),
  expenses: (farmId: string) => api<Expense[]>(`/farms/${farmId}/expenses`),
  sales: (farmId: string) => api<Sale[]>(`/farms/${farmId}/sales`),
  documentRequests: (farmId: string) => api(`/farms/${farmId}/document-requests`),
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
