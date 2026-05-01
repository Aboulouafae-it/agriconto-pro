/**
 * Documents API — list, upload, download.
 */
import { api } from './client';
import type { Page, DocumentOut } from '../types';

export const documentsApi = {
  list: (farmId: string, page = 1, size = 20) =>
    api.get<Page<DocumentOut>>(`/api/v1/farms/${farmId}/documents?page=${page}&size=${size}`),

  upload: (farmId: string, formData: FormData) =>
    api.upload<DocumentOut>(`/api/v1/farms/${farmId}/documents/upload`, formData),

  get: (farmId: string, documentId: string) =>
    api.get<DocumentOut>(`/api/v1/farms/${farmId}/documents/${documentId}`),
};
