/**
 * Zod schemas for form validation.
 * All error messages in Italian.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Inserisci un indirizzo email valido.'),
  password: z.string().min(1, 'Inserisci la password.'),
});

export const expenseSchema = z.object({
  expense_date: z.string().min(1, 'Seleziona una data.'),
  category: z.string().min(1, 'Seleziona una categoria.'),
  amount: z.coerce.number().positive('L\'importo deve essere positivo.'),
  description: z.string().max(4000).optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  crop_id: z.string().uuid().optional().nullable(),
});

export const saleSchema = z.object({
  sale_date: z.string().min(1, 'Seleziona una data.'),
  amount: z.coerce.number().positive('L\'importo deve essere positivo.'),
  description: z.string().max(4000).optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  crop_id: z.string().uuid().optional().nullable(),
});

export const workdaySchema = z.object({
  work_date: z.string().min(1, 'Seleziona una data.'),
  description: z.string().max(4000).optional().nullable(),
});

export const workdayEntrySchema = z.object({
  worker_id: z.string().uuid('Seleziona un lavoratore.'),
  hours: z.coerce.number().positive('Le ore devono essere positive.').max(24, 'Massimo 24 ore.'),
  hourly_rate: z.number().nonnegative().optional().nullable(),
  activity: z.string().max(180).optional().nullable(),
  crop_id: z.string().uuid().optional().nullable(),
});

export const documentUploadSchema = z.object({
  title: z.string().min(1, 'Inserisci un titolo.').max(255),
  document_type: z.string().min(1, 'Seleziona il tipo di documento.'),
  notes: z.string().max(4000).optional().nullable(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type SaleFormData = z.infer<typeof saleSchema>;
export type WorkdayFormData = z.infer<typeof workdaySchema>;
export type WorkdayEntryFormData = z.infer<typeof workdayEntrySchema>;
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;
