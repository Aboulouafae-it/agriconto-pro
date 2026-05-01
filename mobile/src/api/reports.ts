/**
 * Reports API — monthly summary for dashboard.
 */
import { api } from './client';
import type { ReportOut } from '../types';

export const reportsApi = {
  monthly: (farmId: string, year: number, month: number) =>
    api.get<ReportOut>(`/api/v1/farms/${farmId}/reports/monthly?year=${year}&month=${month}`),

  workers: (farmId: string) =>
    api.get<ReportOut>(`/api/v1/farms/${farmId}/reports/workers`),

  missingDocuments: (farmId: string) =>
    api.get<ReportOut>(`/api/v1/farms/${farmId}/reports/missing-documents`),
};

export const healthApi = {
  check: () => api.get<{ status: string }>('/health'),
};
