/**
 * Offline Draft Queue — stores unsent field entries locally.
 *
 * Drafts are NOT final records. They require backend acceptance.
 * Uses AsyncStorage for simplicity since draft data is not sensitive
 * (tokens remain in SecureStore).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineDraft, DraftType, DraftStatus } from '../types';

const DRAFTS_KEY = 'agriconto_offline_drafts';

function generateId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function loadDrafts(): Promise<OfflineDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveDrafts(drafts: OfflineDraft[]): Promise<void> {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export async function createDraft<T extends Record<string, unknown>>(
  type: DraftType,
  data: T,
  farmId: string,
): Promise<OfflineDraft<T>> {
  const draft: OfflineDraft<T> = {
    id: generateId(),
    type,
    status: 'pending',
    data,
    farmId,
    createdAt: new Date().toISOString(),
    lastAttempt: null,
    errorMessage: null,
    retryCount: 0,
  };

  const drafts = await loadDrafts();
  drafts.push(draft as OfflineDraft);
  await saveDrafts(drafts);
  return draft;
}

export async function getDrafts(farmId?: string): Promise<OfflineDraft[]> {
  const drafts = await loadDrafts();
  if (farmId) {
    return drafts.filter((d) => d.farmId === farmId);
  }
  return drafts;
}

export async function getPendingDrafts(farmId: string): Promise<OfflineDraft[]> {
  const drafts = await getDrafts(farmId);
  return drafts.filter((d) => d.status === 'pending' || d.status === 'error');
}

export async function updateDraftStatus(
  draftId: string,
  status: DraftStatus,
  errorMessage?: string,
): Promise<void> {
  const drafts = await loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);
  if (draft) {
    draft.status = status;
    draft.lastAttempt = new Date().toISOString();
    draft.errorMessage = errorMessage || null;
    if (status === 'error') {
      draft.retryCount += 1;
    }
    await saveDrafts(drafts);
  }
}

export async function removeDraft(draftId: string): Promise<void> {
  const drafts = await loadDrafts();
  await saveDrafts(drafts.filter((d) => d.id !== draftId));
}

export async function removeSyncedDrafts(): Promise<void> {
  const drafts = await loadDrafts();
  await saveDrafts(drafts.filter((d) => d.status !== 'synced'));
}
