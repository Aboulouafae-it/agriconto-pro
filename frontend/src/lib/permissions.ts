import type { ModuleKey, Role } from "../types";

const READABLE_MODULES: Record<Role, ModuleKey[]> = {
  OWNER: [
    "dashboard",
    "analytics",
    "farm",
    "workers",
    "workdays",
    "crops",
    "fields",
    "expenses",
    "sales",
    "documents",
    "commercialista",
    "reports",
    "settings"
  ],
  ACCOUNTANT: ["dashboard", "analytics", "expenses", "sales", "documents", "commercialista", "reports", "settings"],
  LABOR_CONSULTANT: ["dashboard", "analytics", "workers", "workdays", "reports", "settings"],
  WORKER: ["dashboard", "workdays", "settings"]
};

const WRITE_MODULES: Record<Role, ModuleKey[]> = {
  OWNER: ["farm", "workers", "workdays", "crops", "fields", "expenses", "sales", "documents"],
  ACCOUNTANT: ["documents"],
  LABOR_CONSULTANT: [],
  WORKER: []
};

export function canView(role: Role, module: ModuleKey): boolean {
  return READABLE_MODULES[role].includes(module);
}

export function canWrite(role: Role, module: ModuleKey): boolean {
  return WRITE_MODULES[role].includes(module);
}

export function roleLabel(role: Role): string {
  return {
    OWNER: "Titolare",
    ACCOUNTANT: "Commercialista",
    LABOR_CONSULTANT: "Consulente del lavoro",
    WORKER: "Lavoratore"
  }[role];
}
