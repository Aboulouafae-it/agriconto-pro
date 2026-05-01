/**
 * Sync Service — processes pending drafts against the backend.
 *
 * Respects authentication. If backend rejects, draft is kept with error message.
 * No complex conflict resolution in MVP.
 */
import { expensesApi } from '../api/expenses';
import { salesApi } from '../api/sales';
import { workdaysApi } from '../api/workdays';
import { getDrafts, updateDraftStatus } from './draftQueue';
import type { OfflineDraft, ExpenseIn, SaleIn, WorkdayIn, WorkdayEntryIn } from '../types';

let syncInProgress = false;

async function syncSingleDraft(draft: OfflineDraft): Promise<boolean> {
  await updateDraftStatus(draft.id, 'syncing');

  let result: { error: string | null };

  try {
    switch (draft.type) {
      case 'expense':
        result = await expensesApi.create(draft.farmId, draft.data as unknown as ExpenseIn);
        break;
      case 'sale':
        result = await salesApi.create(draft.farmId, draft.data as unknown as SaleIn);
        break;
      case 'workday':
        result = await workdaysApi.create(draft.farmId, draft.data as unknown as WorkdayIn);
        break;
      case 'workday_entry': {
        const entryData = draft.data as unknown as WorkdayEntryIn & { _workdayId?: string };
        let workdayId = entryData._workdayId || entryData.workday_id;
        if (!workdayId && typeof draft.data.work_date === 'string') {
          const workdayResult = await workdaysApi.create(draft.farmId, {
            work_date: draft.data.work_date,
            description: typeof draft.data.activity === 'string' ? draft.data.activity : undefined,
          });
          if (workdayResult.error || !workdayResult.data) {
            await updateDraftStatus(draft.id, 'error', workdayResult.error || 'Non è stato possibile completare l\'operazione.');
            return false;
          }
          workdayId = workdayResult.data.id;
        }
        if (!workdayId) {
          await updateDraftStatus(draft.id, 'error', 'Bozza incompleta. Controlla i dati della giornata.');
          return false;
        }
        const { worker_name: _workerName, work_date: _workDate, ...payload } = draft.data as Record<string, unknown>;
        result = await workdaysApi.addEntry(draft.farmId, workdayId, {
          ...payload,
          workday_id: workdayId,
        } as unknown as WorkdayEntryIn);
        break;
      }
      default:
        await updateDraftStatus(draft.id, 'error', 'Tipo bozza non supportato.');
        return false;
    }

    if (result.error) {
      await updateDraftStatus(draft.id, 'error', result.error);
      return false;
    }

    await updateDraftStatus(draft.id, 'synced');
    return true;
  } catch {
    await updateDraftStatus(
      draft.id,
      'error',
      'Non è stato possibile completare l\'operazione. Riprova tra poco.',
    );
    return false;
  }
}

export async function syncAllDrafts(farmId: string): Promise<{ synced: number; failed: number }> {
  if (syncInProgress) {
    return { synced: 0, failed: 0 };
  }
  syncInProgress = true;
  const drafts = await getDrafts(farmId);
  const pending = drafts.filter((d) => d.status === 'pending' || d.status === 'error');

  let synced = 0;
  let failed = 0;

  try {
    for (const draft of pending) {
      const success = await syncSingleDraft(draft);
      if (success) {
        synced++;
      } else {
        failed++;
      }
    }
  } finally {
    syncInProgress = false;
  }

  return { synced, failed };
}

export async function syncDraft(farmId: string, draftId: string): Promise<boolean> {
  if (syncInProgress) {
    return false;
  }
  syncInProgress = true;
  try {
    const draft = (await getDrafts(farmId)).find((item) => item.id === draftId);
    if (!draft || draft.status === 'synced' || draft.status === 'syncing') {
      return false;
    }
    return await syncSingleDraft(draft);
  } finally {
    syncInProgress = false;
  }
}
