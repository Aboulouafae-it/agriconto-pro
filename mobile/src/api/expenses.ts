/**
 * Expenses API
 */
import { api } from './client';
import type { Page, ExpenseIn, ExpenseOut } from '../types';

export const expensesApi = {
  list: (farmId: string, page = 1, size = 20) =>
    api.get<Page<ExpenseOut>>(`/api/v1/farms/${farmId}/expenses?page=${page}&size=${size}`),

  create: (farmId: string, data: ExpenseIn) =>
    api.post<ExpenseOut>(`/api/v1/farms/${farmId}/expenses`, data),

  get: (farmId: string, expenseId: string) =>
    api.get<ExpenseOut>(`/api/v1/farms/${farmId}/expenses/${expenseId}`),
};
