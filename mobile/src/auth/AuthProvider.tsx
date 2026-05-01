/**
 * AuthProvider — manages authentication state across the mobile app.
 *
 * - Checks for stored token on app launch.
 * - Provides login/logout actions.
 * - Fetches current user and available farms.
 * - Handles session expiry transparently.
 */
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import { farmsApi } from '../api/farms';
import { setOnUnauthorized } from '../api/client';
import { saveToken, getToken, removeToken } from './tokenStorage';
import type { UserRead, FarmRead } from '../types';

const ACTIVE_FARM_KEY = 'agriconto_active_farm_id';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: UserRead | null;
  farms: FarmRead[];
  activeFarmId: string | null;
  activeFarm: FarmRead | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  setActiveFarmId: (farmId: string) => void;
}

export const AuthContext = createContext<AuthState>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  farms: [],
  activeFarmId: null,
  activeFarm: null,
  login: async () => null,
  logout: async () => {},
  setActiveFarmId: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserRead | null>(null);
  const [farms, setFarms] = useState<FarmRead[]>([]);
  const [activeFarmId, setActiveFarmIdState] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    await removeToken();
    await AsyncStorage.removeItem(ACTIVE_FARM_KEY);
    setUser(null);
    setFarms([]);
    setActiveFarmIdState(null);
  }, []);

  // Register 401 handler
  useEffect(() => {
    setOnUnauthorized(() => {
      clearSession();
    });
  }, [clearSession]);

  // Try to restore session on mount
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const meRes = await authApi.me();
      if (!meRes.data) {
        await clearSession();
        setIsLoading(false);
        return;
      }

      setUser(meRes.data);

      const farmsRes = await farmsApi.list();
      if (farmsRes.data) {
        setFarms(farmsRes.data);
        const storedFarmId = await AsyncStorage.getItem(ACTIVE_FARM_KEY);
        const storedFarm = farmsRes.data.find((farm) => farm.id === storedFarmId);
        if (storedFarm) {
          setActiveFarmIdState(storedFarm.id);
        } else if (farmsRes.data.length === 1) {
          setActiveFarmIdState(farmsRes.data[0].id);
          await AsyncStorage.setItem(ACTIVE_FARM_KEY, farmsRes.data[0].id);
        }
      }

      setIsLoading(false);
    })();
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const res = await authApi.login({ email, password });
    if (res.error || !res.data) {
      return res.error || 'Credenziali non valide.';
    }

    await saveToken(res.data.access_token);

    const meRes = await authApi.me();
    if (!meRes.data) {
      await clearSession();
      return 'Errore nel recupero del profilo.';
    }
    setUser(meRes.data);

    const farmsRes = await farmsApi.list();
    if (farmsRes.data) {
      setFarms(farmsRes.data);
      if (farmsRes.data.length === 1) {
        setActiveFarmIdState(farmsRes.data[0].id);
        await AsyncStorage.setItem(ACTIVE_FARM_KEY, farmsRes.data[0].id);
      }
    }

    return null;
  }, [clearSession]);

  const logout = useCallback(async () => {
    await authApi.logout();
    await clearSession();
  }, [clearSession]);

  const setActiveFarmId = useCallback((farmId: string) => {
    setActiveFarmIdState(farmId);
    AsyncStorage.setItem(ACTIVE_FARM_KEY, farmId);
  }, []);

  const activeFarm = useMemo(
    () => farms.find((f) => f.id === activeFarmId) || null,
    [farms, activeFarmId],
  );

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      isAuthenticated: !!user,
      user,
      farms,
      activeFarmId,
      activeFarm,
      login,
      logout,
      setActiveFarmId,
    }),
    [isLoading, user, farms, activeFarmId, activeFarm, login, logout, setActiveFarmId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
