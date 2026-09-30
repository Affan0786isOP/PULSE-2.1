import { MAX_IDEMPOTENCY_KEY_LENGTH, MAX_IDEMPOTENCY_ENTRIES } from '../config/constants';

// Process-local idempotency store serves as a best-effort, bounded LRU cache for high-frequency retries within a single instance.
// Hard bounded to MAX_IDEMPOTENCY_ENTRIES (5000) to prevent memory growth under unique keys.
const idempotencyStore = new Map<string, { result: Record<string, unknown>; expiresAt: number }>();
export function setIdempotency<T extends Record<string, unknown>>(key: string, result: T, ttlMs: number = 24 * 60 * 60 * 1000) {
  if (!key || typeof key !== "string" || key.length > MAX_IDEMPOTENCY_KEY_LENGTH + 16) return;
  if (idempotencyStore.size >= MAX_IDEMPOTENCY_ENTRIES) {
    const oldestKey = idempotencyStore.keys().next().value;
    if (oldestKey) idempotencyStore.delete(oldestKey);
  }
  idempotencyStore.set(key, { result: result as Record<string, unknown>, expiresAt: Date.now() + ttlMs });
}

export function getIdempotency<T = Record<string, unknown>>(key: string): T | null {
  if (!key) return null;
  const item = idempotencyStore.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    idempotencyStore.delete(key);
    return null;
  }
  // Refresh position for LRU
  idempotencyStore.delete(key);
  idempotencyStore.set(key, item);
  return item.result as T;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, item] of idempotencyStore.entries()) {
    if (item.expiresAt <= now) {
      idempotencyStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function isValidIdempotencyKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_IDEMPOTENCY_KEY_LENGTH;
}
