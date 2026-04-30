export type ChartPoint = {
  label?: string;
  period?: string;
  date?: string;
  value?: number;
  revenue?: number;
  expenses?: number;
  net_result?: number;
  [key: string]: unknown;
};

export type Insight = {
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  title: string;
  detail: string;
};

export type AnalyticsOverview = {
  role_scope: string;
  allowed_sections: string[];
  kpis: Record<string, unknown>;
  timeline?: ChartPoint[];
  top_insights?: Insight[];
};

export type AnalyticsDataset = Record<string, unknown>;
