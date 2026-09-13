import { DatasetObservation, DatasetFilters } from './types';
import { normalizeProtocolType, normalizeAgeGroupKey, normalizeInputModality } from './normalization';

export const DEFAULT_DATASET_FILTERS: DatasetFilters = {
  assessmentType: 'all',
  ageGroup: 'all',
  deviceCategory: 'all',
  inputModality: 'all',
  completedAtMonth: 'all',
  refreshRate: 'all'
};

/**
 * Determines whether any non-default filter is currently active.
 */
export function isFilterActive(filters: DatasetFilters): boolean {
  return (
    filters.assessmentType !== 'all' ||
    filters.ageGroup !== 'all' ||
    (Boolean(filters.deviceCategory) && filters.deviceCategory !== 'all') ||
    filters.inputModality !== 'all' ||
    (Boolean(filters.refreshRate) && filters.refreshRate !== 'all') ||
    (filters.completedAtMonth !== 'all' || (Boolean(filters.temporalBucket) && filters.temporalBucket !== 'all'))
  );
}

/**
 * Counts the number of active non-default filters.
 */
export function countActiveFilters(filters: DatasetFilters): number {
  let count = 0;
  if (filters.assessmentType !== 'all') count++;
  if (filters.ageGroup !== 'all') count++;
  if (filters.deviceCategory && filters.deviceCategory !== 'all') count++;
  if (filters.inputModality !== 'all') count++;
  if (filters.refreshRate && filters.refreshRate !== 'all') count++;
  if (filters.completedAtMonth !== 'all' || (filters.temporalBucket && filters.temporalBucket !== 'all')) count++;
  return count;
}

/**
 * Pure, non-mutating filter pipeline that applies all global filters to the observations collection.
 */
export function applyDatasetFilters(
  observations: DatasetObservation[],
  filters: DatasetFilters
): DatasetObservation[] {
  return observations.filter(obs => {
    // 1. Assessment filter
    if (filters.assessmentType !== 'all') {
      const targetType = normalizeProtocolType(filters.assessmentType);
      const obsType = normalizeProtocolType(obs.assessmentType);
      if (targetType !== obsType) return false;
    }

    // 2. Age Group filter
    if (filters.ageGroup !== 'all') {
      const targetAge = normalizeAgeGroupKey(filters.ageGroup);
      const obsAge = normalizeAgeGroupKey(obs.ageGroup);
      if (targetAge !== obsAge && obs.ageGroup !== filters.ageGroup) {
        return false;
      }
    }

    // 3. Device Category filter
    if (filters.deviceCategory && filters.deviceCategory !== 'all') {
      const obsCat = (obs.deviceCategory || '').toLowerCase().trim();
      const targetCat = filters.deviceCategory.toLowerCase().trim();
      if (obsCat !== targetCat) return false;
    }

    // 4. Monthly Bucket filter
    const targetMonth = filters.completedAtMonth !== 'all'
      ? filters.completedAtMonth
      : (filters.temporalBucket && filters.temporalBucket !== 'all' ? filters.temporalBucket : 'all');
    if (targetMonth !== 'all' && obs.completedAtMonth !== targetMonth) {
      return false;
    }

    // 5. Input Modality filter
    if (filters.inputModality !== 'all') {
      const targetMod = normalizeInputModality(filters.inputModality);
      const obsMod = normalizeInputModality(obs.inputModality);
      if (targetMod !== obsMod && obs.inputModality !== filters.inputModality) {
        return false;
      }
    }

    // 6. Display Refresh filter
    if (filters.refreshRate && filters.refreshRate !== 'all') {
      if (obs.refreshRateHz === null || obs.refreshRateHz === undefined) return false;
      const hz = obs.refreshRateHz;
      const roundedHz = Math.round(hz);
      if (filters.refreshRate === '60' && hz !== 60 && roundedHz !== 60) return false;
      if (filters.refreshRate === '120' && hz !== 120 && roundedHz !== 120) return false;
      if (filters.refreshRate === '144plus' && hz < 144 && roundedHz < 144) return false;
    }

    return true;
  });
}
