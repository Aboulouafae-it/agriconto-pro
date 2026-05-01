/**
 * Utility functions — formatting, dates, money.
 */

/** Format a number as Euro currency. */
export function formatEuro(amount: number | null | undefined): string {
  if (amount == null) return '€ 0,00';
  return `€ ${amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Get today's date as YYYY-MM-DD. */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Format an ISO date to Italian format DD/MM/YYYY. */
export function formatDateIT(isoDate: string | null | undefined): string {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

/** Get month name in Italian. */
export function monthNameIT(month: number): string {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ];
  return months[month - 1] || '';
}

/** Parse comma-separated decimal to number. */
export function parseCommaDecimal(value: string): number {
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Format number for display in input (Italian comma separator). */
export function formatDecimalInput(value: number | undefined | null): string {
  if (value == null || value === 0) return '';
  return value.toString().replace('.', ',');
}

/** Get current year and month. */
export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Truncate text. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}
