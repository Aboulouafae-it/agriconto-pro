/**
 * Secure token storage using expo-secure-store.
 * Tokens are stored in the device's secure enclave / keystore.
 * Never stored in AsyncStorage or unencrypted storage.
 */
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'agriconto_access_token';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
