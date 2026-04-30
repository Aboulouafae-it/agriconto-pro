import { apiClient } from "../../../api/client";
import type { AnalyticsDataset, AnalyticsOverview } from "../types";

export type AnalyticsFiltersState = {
  preset: string;
  startDate: string;
  endDate: string;
  cropId: string;
  fieldId: string;
  workerId: string;
  supplierId: string;
  customerId: string;
  expenseCategory: string;
  documentStatus: string;
  comparePrevious: boolean;
};

export function analyticsQuery(filters: AnalyticsFiltersState) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.cropId) params.set("crop_id", filters.cropId);
  if (filters.fieldId) params.set("field_id", filters.fieldId);
  if (filters.workerId) params.set("worker_id", filters.workerId);
  if (filters.supplierId) params.set("supplier_id", filters.supplierId);
  if (filters.customerId) params.set("customer_id", filters.customerId);
  if (filters.expenseCategory) params.set("expense_category", filters.expenseCategory);
  if (filters.documentStatus) params.set("document_status", filters.documentStatus);
  if (filters.comparePrevious) params.set("compare_previous", "true");
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function fetchAnalyticsOverview(farmId: string, filters: AnalyticsFiltersState) {
  return apiClient.analytics<AnalyticsOverview>(farmId, "overview", analyticsQuery(filters));
}

export function fetchAnalyticsSection(farmId: string, section: string, filters: AnalyticsFiltersState) {
  return apiClient.analytics<AnalyticsDataset>(farmId, section, analyticsQuery(filters));
}
