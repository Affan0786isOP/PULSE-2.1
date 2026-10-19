import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAdminAuth } from '../../src/lib/useAdminAuth';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

describe('useAdminAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state and null user', () => {
    // Prevent onAuthStateChanged from calling the callback immediately to test initial state
    (onAuthStateChanged as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => vi.fn());

    const { result } = renderHook(() => useAdminAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('sets user and isAdmin when user logs in with admin claims', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { admin: true } })
    };

    (onAuthStateChanged as unknown as ReturnType<typeof vi.fn>).mockImplementation((auth, callback) => {
      callback(mockUser);
      return vi.fn(); // Return mock unsubscribe
    });

    const { result } = renderHook(() => useAdminAuth());

    // Wait for the async getIdTokenResult to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toBe(mockUser);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('sets user but not isAdmin when user logs in without admin claims', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { admin: false } })
    };

    (onAuthStateChanged as unknown as ReturnType<typeof vi.fn>).mockImplementation((auth, callback) => {
      callback(mockUser);
      return vi.fn(); // Return mock unsubscribe
    });

    const { result } = renderHook(() => useAdminAuth());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toBe(mockUser);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('clears user and isAdmin when user logs out', async () => {
    (onAuthStateChanged as unknown as ReturnType<typeof vi.fn>).mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn(); // Return mock unsubscribe
    });

    const { result } = renderHook(() => useAdminAuth());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('handles error in getIdTokenResult gracefully', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockRejectedValue(new Error("Network Error"))
    };

    (onAuthStateChanged as unknown as ReturnType<typeof vi.fn>).mockImplementation((auth, callback) => {
      callback(mockUser);
      return vi.fn(); // Return mock unsubscribe
    });

    const { result } = renderHook(() => useAdminAuth());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toBe(mockUser);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const unsubscribeMock = vi.fn();
    (onAuthStateChanged as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => unsubscribeMock);

    const { unmount } = renderHook(() => useAdminAuth());

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
