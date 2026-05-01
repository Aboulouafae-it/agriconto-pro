/**
 * Auth API — login, me, logout.
 */
import { api } from './client';
import type { LoginRequest, TokenResponse, UserRead } from '../types';

export const authApi = {
  login: (data: LoginRequest) => api.post<TokenResponse>('/api/v1/auth/login', data),

  me: () => api.get<UserRead>('/api/v1/auth/me'),

  logout: () => api.post<{ detail: string }>('/api/v1/auth/logout'),
};
