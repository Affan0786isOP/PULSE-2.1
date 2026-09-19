import { db, auth } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { LeaderboardEntry } from './firestore';

export interface AdminAuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string | number;
  note?: string;
}

export async function fetchAdminAuditLogs(): Promise<AdminAuditLog[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'adminAuditLogs'));
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as AdminAuditLog[];
  } catch (err) {
    console.warn('Failed to fetch admin audit logs:', err);
    return [];
  }
}

export async function hideLeaderboardEntry(id: string, reason: string, adminEmail: string): Promise<void> {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
  try {
    const res = await fetch('/api/admin/leaderboard/hide', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id, reason }),
    });
    if (res.ok) return;
  } catch {}

  if (db) {
    const ref = doc(db, 'leaderboardResults', id);
    await updateDoc(ref, { hidden: true, hideReason: reason });
  }
}

export async function deleteLeaderboardEntryPermanently(id: string, reason: string, adminEmail: string): Promise<void> {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
  try {
    const res = await fetch('/api/admin/leaderboard/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id, reason }),
    });
    if (res.ok) return;
  } catch {}

  if (db) {
    const ref = doc(db, 'leaderboardResults', id);
    await deleteDoc(ref);
  }
}

export async function fetchAllAdminLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'leaderboardResults'));
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as LeaderboardEntry[];
  } catch (err) {
    console.warn('Failed to fetch all leaderboard entries for admin:', err);
    return [];
  }
}
