import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import {
  RESEARCH_LEDGER_ENTRIES,
  PREPARATION_HABITS,
  PHYSIOLOGICAL_FACTORS,
  CHECKLIST_STORAGE_KEY,
  getRandomizedFacts,
  getRandomizedResearchEntries,
  loadPersistedChecklist,
  savePersistedChecklist,
  clearPersistedChecklist,
} from '../data/facts';

class MockStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

const mockStorage = new MockStorage();

beforeAll(() => {
  vi.stubGlobal('localStorage', mockStorage);
  vi.stubGlobal('window', {});
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('Improve Page Research Data & Ledger Validation', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('validates that all research ledger entries contain structured citations and evidence types', () => {
    expect(RESEARCH_LEDGER_ENTRIES.length).toBeGreaterThanOrEqual(10);

    const validEvidenceTypes = new Set(['established', 'association', 'interpretation', 'practical_protocol']);

    RESEARCH_LEDGER_ENTRIES.forEach((entry) => {
      expect(entry.id).toBeTruthy();
      expect(entry.statement).toBeTruthy();
      expect(entry.domain).toBeTruthy();
      expect(validEvidenceTypes.has(entry.evidenceType)).toBe(true);

      // Citation checks
      expect(entry.citation).toBeDefined();
      expect(entry.citation.source).toBeTruthy();
      expect(entry.citation.year).toBeGreaterThanOrEqual(1900);
      expect(entry.citation.reference).toBeTruthy();
    });
  });

  it('validates that physiological factors have accurate schemas and valid impacts', () => {
    expect(PHYSIOLOGICAL_FACTORS.length).toBe(10);

    const validImpacts = new Set(['associated_increase', 'supports_consistency', 'variable']);

    PHYSIOLOGICAL_FACTORS.forEach((factor) => {
      expect(factor.id).toBeTruthy();
      expect(factor.title).toBeTruthy();
      expect(factor.desc).toBeTruthy();
      expect(validImpacts.has(factor.impact)).toBe(true);
      expect(typeof factor.reduces).toBe('boolean');
      expect(factor.iconName).toBeTruthy();
    });
  });

  it('validates that preparation habits have valid categories and clear non-causal descriptions', () => {
    expect(PREPARATION_HABITS.length).toBe(10);

    const validCategories = new Set(['sleep', 'physical', 'hydration', 'protocol', 'environment']);

    PREPARATION_HABITS.forEach((habit) => {
      expect(habit.id).toBeTruthy();
      expect(habit.title).toBeTruthy();
      expect(habit.desc).toBeTruthy();
      expect(validCategories.has(habit.category)).toBe(true);
    });
  });

  it('generates randomized fact and research entry arrays with preserved elements', () => {
    const facts = getRandomizedFacts();
    expect(facts.length).toBe(RESEARCH_LEDGER_ENTRIES.length);

    const entries = getRandomizedResearchEntries();
    expect(entries.length).toBe(RESEARCH_LEDGER_ENTRIES.length);
    expect(entries.map(e => e.id).sort()).toEqual(RESEARCH_LEDGER_ENTRIES.map(e => e.id).sort());
  });

  it('correctly loads empty checklist on first use', () => {
    const loaded = loadPersistedChecklist();
    expect(loaded.size).toBe(0);
  });

  it('persists and reloads checked habit indices', () => {
    const set = new Set([0, 2, 4]);
    savePersistedChecklist(set);

    const raw = mockStorage.getItem(CHECKLIST_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual([0, 2, 4]);

    const loaded = loadPersistedChecklist();
    expect(loaded.size).toBe(3);
    expect(loaded.has(0)).toBe(true);
    expect(loaded.has(2)).toBe(true);
    expect(loaded.has(4)).toBe(true);
    expect(loaded.has(1)).toBe(false);
  });

  it('gracefully handles malformed localStorage data', () => {
    mockStorage.setItem(CHECKLIST_STORAGE_KEY, 'not-valid-json{{{');
    const loaded = loadPersistedChecklist();
    expect(loaded.size).toBe(0);
  });

  it('sanitizes and filters out-of-bounds or non-numeric indices', () => {
    mockStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([-1, 0, 'invalid', 999, 3]));
    const loaded = loadPersistedChecklist();
    expect(loaded.size).toBe(2);
    expect(loaded.has(0)).toBe(true);
    expect(loaded.has(3)).toBe(true);
    expect(loaded.has(-1)).toBe(false);
    expect(loaded.has(999)).toBe(false);
  });

  it('clears persisted checklist correctly', () => {
    savePersistedChecklist(new Set([1, 3, 5]));
    expect(mockStorage.getItem(CHECKLIST_STORAGE_KEY)).toBeTruthy();

    clearPersistedChecklist();
    expect(mockStorage.getItem(CHECKLIST_STORAGE_KEY)).toBeNull();
    expect(loadPersistedChecklist().size).toBe(0);
  });
});
