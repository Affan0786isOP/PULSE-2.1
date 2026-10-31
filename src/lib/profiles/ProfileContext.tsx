import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { IdbProfileStorage, type LocalProfile } from './idbProfileStorage';
import { auth } from '../firebase';
import { ensureAuthenticatedUser } from '../firestore';

interface ProfileContextValue {
  profiles: LocalProfile[];
  activeProfile: LocalProfile | null;
  loading: boolean;
  setActiveProfile: (uid: string) => Promise<void>;
  createProfile: (profile: Omit<LocalProfile, 'profileUid' | 'revision'>) => Promise<LocalProfile>;
  deleteProfile: (uid: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [activeProfileUid, setActiveProfileUidState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getStorage = useCallback(() => {
    const ownerUid = auth?.currentUser?.uid || 'guest';
    return new IdbProfileStorage(ownerUid);
  }, []);

  const refreshProfiles = useCallback(async () => {
    try {
      setLoading(true);
      await ensureAuthenticatedUser();
      const storage = getStorage();
      const local = await storage.getProfiles();
      setProfiles(local);

      const activeUid = await storage.getActiveProfileUid();
      if (activeUid && local.some(p => p.profileUid === activeUid)) {
        setActiveProfileUidState(activeUid);
      } else if (local.length > 0) {
        setActiveProfileUidState(local[0].profileUid);
        await storage.setActiveProfileUid(local[0].profileUid);
      } else {
        setActiveProfileUidState(null);
      }
    } finally {
      setLoading(false);
    }
  }, [getStorage]);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const setActiveProfile = async (uid: string) => {
    const storage = getStorage();
    await storage.setActiveProfileUid(uid);
    setActiveProfileUidState(uid);
  };

  const createProfile = async (data: Omit<LocalProfile, 'profileUid' | 'revision'>): Promise<LocalProfile> => {
    await ensureAuthenticatedUser();
    const token = await auth?.currentUser?.getIdToken();

    // Call server API to reserve name and enforce 5-profile cap
    const res = await fetch('/api/profiles/reserve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        displayName: data.displayName,
        ageGroup: data.ageGroup,
        shareAgeGroupOnLeaderboard: data.shareAgeGroup
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to reserve profile: HTTP ${res.status}`);
    }

    const payload = await res.json();
    const profileRecord = payload.profile;

    const localProfile: LocalProfile = {
      profileUid: profileRecord.profileUid,
      displayName: profileRecord.displayName,
      ageGroup: profileRecord.ageGroup,
      themeAccent: data.themeAccent,
      avatarGlyph: data.avatarGlyph,
      shareAgeGroup: data.shareAgeGroup,
      revision: profileRecord.revision || 1
    };

    const storage = getStorage();
    await storage.saveProfile(localProfile);
    await storage.setActiveProfileUid(localProfile.profileUid);

    await refreshProfiles();
    return localProfile;
  };

  const deleteProfile = async (uid: string) => {
    await ensureAuthenticatedUser();
    const token = await auth?.currentUser?.getIdToken();

    const res = await fetch(`/api/profiles/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete profile: HTTP ${res.status}`);
    }

    const storage = getStorage();
    await storage.deleteProfile(uid);
    await refreshProfiles();
  };

  const activeProfile = profiles.find(p => p.profileUid === activeProfileUid) || null;

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        loading,
        setActiveProfile,
        createProfile,
        deleteProfile,
        refreshProfiles
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfiles(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfiles must be used within a ProfileProvider');
  }
  return ctx;
}
