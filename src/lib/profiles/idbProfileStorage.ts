import type { AgeGroup, AssessmentType } from '../../../shared/types/assessment';
import type { ObservatoryThemeId, ObservatoryGlyphId } from '../../../shared/contracts/profiles';

export interface LocalProfile {
  profileUid: string;
  displayName: string;
  ageGroup: AgeGroup;
  themeAccent: ObservatoryThemeId;
  avatarGlyph: ObservatoryGlyphId;
  shareAgeGroup: boolean;
  revision: number;
}

export interface OfflineOutboxItem {
  id: string;
  sessionId: string;
  rawCapabilityToken: string;
  assessmentType: AssessmentType;
  trials: unknown[];
  createdAt: number;
  syncAttempts: number;
}

// In-memory persistent map fallback across instances in memory
const inMemoryStores = new Map<string, {
  profiles: Map<string, LocalProfile>;
  preferences: Map<string, unknown>;
  outbox: Map<string, OfflineOutboxItem>;
}>();

export class IdbProfileStorage {
  private readonly ownerUid: string;

  constructor(ownerUid: string) {
    this.ownerUid = ownerUid || 'guest';
    if (!inMemoryStores.has(this.ownerUid)) {
      inMemoryStores.set(this.ownerUid, {
        profiles: new Map(),
        preferences: new Map(),
        outbox: new Map()
      });
    }
  }

  private getStore() {
    return inMemoryStores.get(this.ownerUid)!;
  }

  async saveProfile(profile: LocalProfile): Promise<void> {
    this.getStore().profiles.set(profile.profileUid, { ...profile });
  }

  async getProfiles(): Promise<LocalProfile[]> {
    return Array.from(this.getStore().profiles.values());
  }

  async getProfile(profileUid: string): Promise<LocalProfile | null> {
    return this.getStore().profiles.get(profileUid) || null;
  }

  async deleteProfile(profileUid: string): Promise<void> {
    this.getStore().profiles.delete(profileUid);
    const active = await this.getActiveProfileUid();
    if (active === profileUid) {
      this.getStore().preferences.delete('activeProfileUid');
    }
  }

  async setActiveProfileUid(profileUid: string): Promise<void> {
    this.getStore().preferences.set('activeProfileUid', profileUid);
  }

  async getActiveProfileUid(): Promise<string | null> {
    return (this.getStore().preferences.get('activeProfileUid') as string) || null;
  }

  async queueOfflineSubmission(item: OfflineOutboxItem): Promise<void> {
    this.getStore().outbox.set(item.id, { ...item });
  }

  async getOfflineOutbox(): Promise<OfflineOutboxItem[]> {
    return Array.from(this.getStore().outbox.values());
  }

  async removeOfflineOutboxItem(id: string): Promise<void> {
    this.getStore().outbox.delete(id);
  }
}
