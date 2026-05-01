/**
 * Index route — redirects based on auth state.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../src/auth/useAuth';
import { LoadingState } from '../src/components';

export default function Index() {
  const { isLoading, isAuthenticated, activeFarmId } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!activeFarmId) {
      router.replace('/farm-select');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, isAuthenticated, activeFarmId]);

  return <LoadingState message="AgriConto Pro" />;
}
