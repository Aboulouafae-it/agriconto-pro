import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export function useFarm() {
  const farms = useQuery({
    queryKey: ["farms"],
    queryFn: apiClient.farms
  });

  const currentFarmId = farms.data?.[0]?.id ?? null;

  return {
    farms: farms.data ?? [],
    currentFarm: farms.data?.[0] ?? null,
    currentFarmId,
    isLoading: farms.isLoading,
    error: farms.error
  };
}
