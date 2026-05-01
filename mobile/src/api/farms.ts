/**
 * Farms API — list, get.
 */
import { api } from './client';
import type { FarmRead } from '../types';

export const farmsApi = {
  list: () => api.get<FarmRead[]>('/api/v1/farms'),

  get: (farmId: string) => api.get<FarmRead>(`/api/v1/farms/${farmId}`),
};
