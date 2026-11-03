import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { IdbProfileStorage, type LocalProfile } from './idbProfileStorage';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, type User } from 'firebase/auth';
import { ensureAuthenticatedUser } from '../firestore';

interface ProfileContextValue {
  profiles: LocalProfile[];
  activeProfile: LocalProfile | null;
  loading: boolean;
  user: User | null;
  isGoogleUser: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
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
  const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser || null);

  const isGoogleUser = Boolean(currentUser && !currentUser.isAnonymous && currentUser.email);

  useEffect(() => {
    if (!auth) return;
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  const getStorage = useCallback(() => {
    const ownerUid = currentUser && !currentUser.isAnonymous ? currentUser.uid : 'guest';
    return new IdbProfileStorage(ownerUid);
  }, [currentUser]);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Auth not configured');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    if (!auth) return;
    await fbSignOut(auth);
    setActiveProfileUidState(null);
    setProfiles([]);
    await ensureAuthenticatedUser(); // seamlessly restores anonymous auth for guest trials
  };

  const refreshProfiles = useCallback(async () => {
    try {
      setLoading(true);
      await ensureAuthenticatedUser();
      const storage = getStorage();

      // If signed in with Google, pull server profiles and cache locally
      if (auth?.currentUser && !auth.currentUser.isAnonymous) {
        try {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch('/api/profiles/my-profiles', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.profiles)) {
              for (const p of data.profiles) {
                await storage.saveProfile({
                  profileUid: p.profileUid,
                  displayName: p.displayName,
                  discriminator: p.discriminator,
                  leaderboardDisplayName: p.leaderboardDisplayName,
                  ageGroup: p.ageGroup,
                  themeAccent: p.themeAccent || 'cyan',
                  avatarGlyph: p.avatarGlyph || 'reticle',
                  shareAgeGroup: p.shareAgeGroupOnLeaderboard ?? true,
                  revision: p.revision || 1
                });
              }
            }
          }
        } catch (_) {}
      }

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
  }, [refreshProfiles, currentUser]);

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
      discriminator: profileRecord.discriminator,
      leaderboardDisplayName: profileRecord.leaderboardDisplayName,
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
        user: currentUser,
        isGoogleUser,
        signInWithGoogle,
        signOut,
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
    return {
      profiles: [],
      activeProfile: null,
      loading: false,
      user: null,
      isGoogleUser: false,
      signInWithGoogle: async () => {},
      signOut: async () => {},
      setActiveProfile: async () => {},
      createProfile: async (p) => ({ ...p, profileUid: 'guest', revision: 1 }),
      deleteProfile: async () => {},
      refreshProfiles: async () => {}
    };
  }
  return ctx;
}
