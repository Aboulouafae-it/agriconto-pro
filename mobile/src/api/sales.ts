/**
 * Sales API
 */
import { api } from './client';
import type { Page, SaleIn, SaleOut } from '../types';

export const salesApi = {
  list: (farmId: string, page = 1, size = 20) =>
    api.get<Page<SaleOut>>(`/api/v1/farms/${farmId}/sales?page=${page}&size=${size}`),

  create: (farmId: string, data: SaleIn) =>
    api.post<SaleOut>(`/api/v1/farms/${farmId}/sales`, data),

  get: (farmId: string, saleId: string) =>
    api.get<SaleOut>(`/api/v1/farms/${farmId}/sales/${saleId}`),
};
