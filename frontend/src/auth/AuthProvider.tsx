import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiClient } from "../api/client";
import type { Role, User } from "../types";
import { clearToken, getToken, setToken } from "./tokenStore";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  role: Role;
  setRole: (role: Role) => void;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const ROLE_KEY = "agriconto_demo_role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState(getToken());
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem(ROLE_KEY) as Role) || "OWNER");
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ["me", token],
    queryFn: apiClient.me,
    enabled: Boolean(token),
    retry: false
  });

  useEffect(() => {
    function onUnauthorized() {
      setTokenState(null);
      queryClient.clear();
    }
    window.addEventListener("agriconto:unauthorized", onUnauthorized);
    return () => window.removeEventListener("agriconto:unauthorized", onUnauthorized);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data ?? null,
      token,
      role,
      setRole: (nextRole) => {
        localStorage.setItem(ROLE_KEY, nextRole);
        setRoleState(nextRole);
      },
      isLoading: Boolean(token) && me.isLoading,
      login: (nextToken) => {
        setToken(nextToken);
        setTokenState(nextToken);
        queryClient.invalidateQueries({ queryKey: ["me"] });
      },
      logout: () => {
        clearToken();
        setTokenState(null);
        queryClient.clear();
      }
    }),
    [me.data, me.isLoading, queryClient, role, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
