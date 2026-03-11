import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES = 5;
const MAX_QUEUE_SIZE = 100;

type QueuedOperation = {
  id: string;
  table: string;
  operation: 'upsert' | 'insert' | 'update';
  data: Record<string, unknown>;
  filter?: { column: string; value: string };
  onConflict?: string;
  timestamp: number;
  retryCount: number;
};

let queue: QueuedOperation[] = [];
let queueLoaded = false;

async function loadQueue(): Promise<void> {
  if (queueLoaded) return;
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) {
      queue = JSON.parse(stored);
    }
  } catch {
    queue = [];
  }
  queueLoaded = true;
}

async function saveQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[OfflineQueue] Failed to persist queue:', err);
  }
}

export async function enqueue(op: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  if (!queueLoaded) await loadQueue();

  // Evict oldest operations if queue is full
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue = queue.slice(-MAX_QUEUE_SIZE + 1);
  }

  queue.push({
    ...op,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    retryCount: 0,
  });

  await saveQueue();
}

export async function processQueue(): Promise<void> {
  if (!queueLoaded) await loadQueue();
  if (queue.length === 0) return;

  const now = Date.now();
  const toProcess = [...queue];
  const failed: QueuedOperation[] = [];

  for (const op of toProcess) {
    // Exponential backoff: wait 2^retryCount seconds before retrying
    const backoffMs = Math.pow(2, op.retryCount) * 1000;
    if (now - op.timestamp < backoffMs) {
      // Not ready to retry yet, keep in queue
      failed.push(op);
      continue;
    }

    try {
      // Use `as any` because queue operations are dynamically typed
      const table = supabase.from(op.table as 'profiles');
      if (op.operation === 'upsert') {
        const { error } = await (table as any).upsert(
          op.data,
          op.onConflict ? { onConflict: op.onConflict } : undefined
        );
        if (error) throw error;
      } else if (op.operation === 'insert') {
        const { error } = await (table as any).insert(op.data);
        if (error) throw error;
      } else if (op.operation === 'update' && op.filter) {
        const { error } = await (table as any)
          .update(op.data)
          .eq(op.filter.column, op.filter.value);
        if (error) throw error;
      }
    } catch (err) {
      console.warn('[OfflineQueue] Failed to process op:', err);
      if (op.retryCount < MAX_RETRIES) {
        failed.push({
          ...op,
          retryCount: op.retryCount + 1,
          timestamp: Date.now(), // Reset so backoff is measured from last attempt
        });
      }
    }
  }

  queue = failed;
  await saveQueue();
}

export function getQueueSize(): number {
  return queue.length;
}

export async function clearQueue(): Promise<void> {
  queue = [];
  queueLoaded = true;
  await saveQueue();
}

// Load queue on module init
loadQueue().catch(() => {});
