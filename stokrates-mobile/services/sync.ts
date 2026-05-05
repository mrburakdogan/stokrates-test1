import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

// ============================================================
// DIRTY-FLAG SYNC ENGINE
//
// Instead of queuing individual item mutations (which causes
// race conditions and unbounded queue growth), we track which
// collections/settings have been modified locally ("dirty").
// When online, we sync the latest local snapshot once per key.
//
// Flow:
//   saveCollection() -> markDirty('collection', key)
//                    -> scheduleFlush(key)  [debounced 500ms]
//                    -> flushKey(key)       [syncs latest state]
//
// Benefits:
//   - 10 rapid saves = 1 sync (debounced)
//   - Offline: dirty flags persist, flush all on reconnect
//   - No stale intermediate states in queue
//   - No race between concurrent syncs of same collection
// ============================================================

const DIRTY_SET_KEY = '__dirty_collections';
const DIRTY_SETTINGS_KEY = '__dirty_settings';

// In-flight sync locks per key -- prevents concurrent syncs
const _syncing = new Set<string>();

// Debounce timers per key
const _timers = new Map<string, ReturnType<typeof setTimeout>>();

// Debounce delay in ms
const DEBOUNCE_MS = 500;

// ============================================================
// DIRTY FLAG MANAGEMENT
// ============================================================

async function getDirtySet(metaKey: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(metaKey);
  return raw ? new Set(JSON.parse(raw)) : new Set();
}

async function addDirty(metaKey: string, key: string): Promise<void> {
  const set = await getDirtySet(metaKey);
  set.add(key);
  await AsyncStorage.setItem(metaKey, JSON.stringify([...set]));
}

async function removeDirty(metaKey: string, key: string): Promise<void> {
  const set = await getDirtySet(metaKey);
  set.delete(key);
  if (set.size === 0) {
    await AsyncStorage.removeItem(metaKey);
  } else {
    await AsyncStorage.setItem(metaKey, JSON.stringify([...set]));
  }
}

// ============================================================
// PUBLIC API — called from db.ts
// ============================================================

/**
 * Mark a collection as dirty and schedule a debounced sync.
 * Called by saveCollection() in db.ts on every write.
 */
export async function markCollectionDirty(key: string): Promise<void> {
  await addDirty(DIRTY_SET_KEY, key);
  scheduleFlush('col:' + key, () => flushCollection(key));
}

/**
 * Mark a setting as dirty and schedule a debounced sync.
 * Called by saveSetting() in db.ts on every write.
 */
export async function markSettingDirty(key: string): Promise<void> {
  await addDirty(DIRTY_SETTINGS_KEY, key);
  scheduleFlush('set:' + key, () => flushSetting(key));
}

/**
 * Flush all dirty keys. Called on reconnect and app foreground.
 */
export async function flushAllDirty(): Promise<void> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  const dirtyCollections = await getDirtySet(DIRTY_SET_KEY);
  const dirtySettings = await getDirtySet(DIRTY_SETTINGS_KEY);

  const promises: Promise<void>[] = [];
  for (const key of dirtyCollections) {
    promises.push(flushCollection(key));
  }
  for (const key of dirtySettings) {
    promises.push(flushSetting(key));
  }

  await Promise.allSettled(promises);
}

// ============================================================
// DEBOUNCE SCHEDULER
// ============================================================

function scheduleFlush(timerKey: string, fn: () => Promise<void>): void {
  // Cancel any pending flush for this key
  const existing = _timers.get(timerKey);
  if (existing) clearTimeout(existing);

  _timers.set(
    timerKey,
    setTimeout(async () => {
      _timers.delete(timerKey);
      try {
        await fn();
      } catch (err) {
        console.warn(`[Sync] Scheduled flush failed (${timerKey}):`, err);
      }
    }, DEBOUNCE_MS),
  );
}

// ============================================================
// COLLECTION FLUSH — syncs latest local snapshot to Supabase
// ============================================================

async function flushCollection(key: string): Promise<void> {
  const lockKey = 'col:' + key;

  // Skip if already syncing this collection (prevents race condition)
  if (_syncing.has(lockKey)) return;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  _syncing.add(lockKey);
  try {
    // Read the LATEST local state at flush time (not a stale snapshot)
    const raw = await AsyncStorage.getItem(key);
    const items: any[] = raw ? JSON.parse(raw) : [];

    // 1. Get current remote item_ids for this collection
    const { data: remote, error: fetchError } = await supabase
      .from('app_data')
      .select('item_id')
      .eq('collection', key);

    if (fetchError) throw fetchError;

    // 2. Delete remote items that no longer exist locally
    if (remote && remote.length > 0) {
      const localIds = new Set(items.map((i: any) => i.id ?? key));
      const toDelete = remote
        .map(r => r.item_id)
        .filter(id => !localIds.has(id));

      if (toDelete.length > 0) {
        await supabase
          .from('app_data')
          .delete()
          .eq('collection', key)
          .in('item_id', toDelete);
      }
    }

    // 3. Upsert all current items in batches of 50
    if (items.length > 0) {
      const now = new Date().toISOString();
      const rows = items.map((item: any) => ({
        collection: key,
        item_id: item.id ?? key,
        data: item,
        updated_at: now,
      }));

      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from('app_data').upsert(batch);
        if (error) throw error;
      }
    }

    // 4. Success — remove dirty flag
    await removeDirty(DIRTY_SET_KEY, key);
  } catch (err) {
    // Keep the dirty flag so it retries on next flush
    console.warn(`[Sync] Collection flush failed (${key}), will retry:`, err);
  } finally {
    _syncing.delete(lockKey);
  }
}

// ============================================================
// SETTING FLUSH
// ============================================================

async function flushSetting(key: string): Promise<void> {
  const lockKey = 'set:' + key;
  if (_syncing.has(lockKey)) return;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  _syncing.add(lockKey);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    const value = JSON.parse(raw);
    const { error } = await supabase.from('app_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    await removeDirty(DIRTY_SETTINGS_KEY, key);
  } catch (err) {
    console.warn(`[Sync] Setting flush failed (${key}), will retry:`, err);
  } finally {
    _syncing.delete(lockKey);
  }
}

// ============================================================
// CONNECTIVITY LISTENER
// ============================================================

let _unsubscribe: (() => void) | null = null;

export function startSyncListener(): void {
  if (_unsubscribe) return;
  _unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      // Flush all dirty keys when we come back online
      flushAllDirty();
    }
  });
}

export function stopSyncListener(): void {
  _unsubscribe?.();
  _unsubscribe = null;
}
