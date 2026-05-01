/**
 * Network status hook — detects online/offline state.
 */
import { useEffect, useState, useCallback } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    } catch {
      setIsOnline(false);
    }
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return { isOnline, isChecking, refresh: checkConnection };
}
