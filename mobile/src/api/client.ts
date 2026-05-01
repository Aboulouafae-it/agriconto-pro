/**
 * API Client — single source of truth for backend communication.
 *
 * - Attaches bearer token to every request.
 * - Handles 401 by clearing session (triggers logout).
 * - Returns friendly Italian error messages.
 * - Never exposes raw backend errors to users.
 * - Base URL configurable via EXPO_PUBLIC_API_URL.
 */
import Constants from 'expo-constants';
import { getToken, removeToken } from '../auth/tokenStorage';

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://10.0.2.2:8001'; // Android emulator -> host localhost:8001

const DEFAULT_ERROR = 'Non è stato possibile completare l\'operazione.';
const SERVER_UNREACHABLE = 'Server non raggiungibile. Controlla la connessione o l\'indirizzo API.';

/** Fired when 401 is received — app should redirect to login. */
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<ApiResponse<T>> {
  const token = await getToken();
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 && !path.includes('/auth/login')) {
      await removeToken();
      onUnauthorized?.();
      return { data: null, error: 'Sessione scaduta. Effettua di nuovo l\'accesso.', status: 401 };
    }

    if (response.status === 204) {
      return { data: null, error: null, status: 204 };
    }

    if (!response.ok) {
      const message = response.status === 401
        ? 'Credenziali non valide. Verifica email e password.'
        : response.status === 422
          ? 'Controlla i campi evidenziati.'
          : DEFAULT_ERROR;
      return { data: null, error: message, status: response.status };
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return { data: data as T, error: null, status: response.status };
    }

    return { data: null, error: null, status: response.status };
  } catch {
    return { data: null, error: SERVER_UNREACHABLE, status: 0 };
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => request<T>('POST', path, formData, true),
  health: () => request<{ status?: string }>('GET', '/health'),
};

export { BASE_URL, SERVER_UNREACHABLE };
