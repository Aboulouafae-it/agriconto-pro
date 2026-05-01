/**
 * Workdays API — CRUD + entries + close.
 */
import { api } from './client';
import type { Page, WorkdayIn, WorkdayOut, WorkdayEntryIn, WorkdayEntryOut } from '../types';

export const workdaysApi = {
  list: (farmId: string, page = 1, size = 20) =>
    api.get<Page<WorkdayOut>>(`/api/v1/farms/${farmId}/workdays?page=${page}&size=${size}`),

  create: (farmId: string, data: WorkdayIn) =>
    api.post<WorkdayOut>(`/api/v1/farms/${farmId}/workdays`, data),

  get: (farmId: string, workdayId: string) =>
    api.get<WorkdayOut>(`/api/v1/farms/${farmId}/workdays/${workdayId}`),

  addEntry: (farmId: string, workdayId: string, data: WorkdayEntryIn) =>
    api.post<WorkdayEntryOut>(`/api/v1/farms/${farmId}/workdays/${workdayId}/entries`, data),

  close: (farmId: string, workdayId: string) =>
    api.post<WorkdayOut>(`/api/v1/farms/${farmId}/workdays/${workdayId}/close`),
};
