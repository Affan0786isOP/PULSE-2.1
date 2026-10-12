import * as crypto from 'crypto';
import type { Store } from 'express-rate-limit';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * A shared Firestore counter store for serverless deployments. Counter document
 * IDs are hashes, so participant UIDs and client IP addresses are not persisted
 * in plaintext. Each key reuses one document across fixed windows.
 */
export class FirestoreRateLimitStore implements Store {
  private windowMs = 15 * 60 * 1000;

  constructor(private readonly getDb: () => Firestore | null) {}

  init(options: any): void {
    if (Number.isFinite(options?.windowMs) && options.windowMs > 0) {
      this.windowMs = Number(options.windowMs);
    }
  }

  private getCounterRef(key: string) {
    const db = this.getDb();
    if (!db) throw new Error('RATE_LIMIT_STORE_UNAVAILABLE');
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    return db.collection('_rateLimitCounters').doc(keyHash);
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const ref = this.getCounterRef(key);
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    let totalHits = 0;

    await ref.firestore.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.data();
      const previousCount = data?.windowStart === windowStart ? Number(data.count) || 0 : 0;
      totalHits = previousCount + 1;
      tx.set(ref, {
        count: totalHits,
        windowStart,
        resetAt: new Date(windowStart + this.windowMs),
        updatedAt: now
      });
    });

    return { totalHits, resetTime: new Date(windowStart + this.windowMs) };
  }

  decrement(key: string): void {
    try {
      const ref = this.getCounterRef(key);
      void ref.firestore.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const data = snap.data();
        const now = Date.now();
        const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
        if (data?.windowStart !== windowStart) return;
        const count = Math.max(0, (Number(data.count) || 0) - 1);
        tx.set(ref, { ...data, count, updatedAt: now });
      }).catch(err => {
        console.warn('[Rate limit store] Failed to decrement shared counter:', err instanceof Error ? err.message : String(err));
      });
    } catch (err) {
      console.warn('[Rate limit store] Shared counter is unavailable during decrement:', err instanceof Error ? err.message : String(err));
    }
  }

  resetKey(key: string): void {
    try {
      const ref = this.getCounterRef(key);
      void ref.delete().catch(err => {
        console.warn('[Rate limit store] Failed to reset shared counter:', err instanceof Error ? err.message : String(err));
      });
    } catch (err) {
      console.warn('[Rate limit store] Shared counter is unavailable during reset:', err instanceof Error ? err.message : String(err));
    }
  }
}
