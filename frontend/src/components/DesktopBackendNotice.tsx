import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { API_URL } from "../api/client";

function healthUrl() {
  return API_URL.replace(/\/api\/v1\/?$/, "/health");
}

export function DesktopBackendNotice() {
  const health = useQuery({
    queryKey: ["backend-health", API_URL],
    queryFn: async () => {
      try {
        const response = await fetch(healthUrl());
        if (!response.ok) throw new Error("healthcheck failed");
        return true;
      } catch (error) {
        if (import.meta.env.DEV) console.warn("AgriConto backend health check failed", error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  if (!health.isError) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={18} />
        <div>
          <p className="font-semibold">Servizio dati non raggiungibile</p>
          <p className="mt-0.5 leading-6">
            L'applicazione desktop è aperta, ma il servizio locale AgriConto Pro non risponde. Avvia il backend locale o Docker Compose e riprova.
          </p>
        </div>
      </div>
    </div>
  );
}

