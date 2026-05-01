/**
 * Workers API
 */
import { api } from './client';
import type { Page, WorkerOut } from '../types';

export const workersApi = {
  list: (farmId: string, page = 1, size = 100) =>
    api.get<Page<WorkerOut>>(`/api/v1/farms/${farmId}/workers?page=${page}&size=${size}`),

  get: (farmId: string, workerId: string) =>
    api.get<WorkerOut>(`/api/v1/farms/${farmId}/workers/${workerId}`),
};
