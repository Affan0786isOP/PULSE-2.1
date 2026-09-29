import { useState, useEffect, useCallback } from 'react';
import { AssessmentId, DatasetFilters, ObservationRecord, DatasetMode } from './types';
import { fetchAllCloudTrialObservations } from '../trialStore';
import { normalizeProtocolType } from './normalization';

export * from './types';
export * from './normalization';

export function useDatasetPipeline(initialAssessment: AssessmentId = 'visual-reaction') {
  const [activeAssessment, setActiveAssessment] = useState<AssessmentId>(initialAssessment);
  const [datasetMode, setDatasetMode] = useState<DatasetMode>('assessment');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState<ObservationRecord[]>([]);
  const [filters, setFilters] = useState<DatasetFilters>({ assessmentType: 'all' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCloudTrialObservations();
      const mapped = (data || []).map((d: any, idx: number) => ({
        ...d,
        id: d.id || `obs-${idx}`,
        sessionId: d.sessionId || '',
        assessmentType: normalizeProtocolType(d.assessmentType || d.type || 'visual-reaction'),
        scoreMetric: d.scoreMetric ?? d.reactionTimeMs ?? d.reactionTime ?? d.level ?? 0,
        isValid: (d.isValid === true || d.valid === true || d.validity === 'VALID') && d.falseStart !== true && d.timedOut !== true,
        ageGroup: d.ageGroup || 'Unknown',
        deviceType: d.deviceType || 'desktop',
        timestamp: d.timestamp || d.createdAt || Date.now(),
      }));
      setObservations(mapped);
    } catch (err: any) {
      console.warn('Failed to load dataset:', err);
      setError(err?.message || 'Failed to fetch dataset');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = useCallback(() => {
    setFilters({ assessmentType: 'all' });
  }, []);

  const filteredObservations = observations.filter((o) => {
    if (filters.assessmentType && filters.assessmentType !== 'all') {
      if (normalizeProtocolType(o.assessmentType) !== normalizeProtocolType(filters.assessmentType)) return false;
    }
    return true;
  });

  const sectionObservations =
    datasetMode === 'data-explorer'
      ? filteredObservations
      : filteredObservations.filter((o) => normalizeProtocolType(o.assessmentType) === normalizeProtocolType(activeAssessment));

  const totalObservationsCount = observations.length;
  const totalSessionsCount =
    new Set(observations.map((o) => o.sessionId).filter(Boolean)).size ||
    Math.ceil(observations.length / 5);
  const filteredObservationsCount = filteredObservations.length;
  const activeFilterCount = filters.assessmentType !== 'all' ? 1 : 0;
  const isFiltered = activeFilterCount > 0;
  const isEmptyDataset = observations.length === 0;

  return {
    totalObservationsCount,
    totalSessionsCount,
    filteredObservationsCount,
    activeAssessment,
    setActiveAssessment,
    datasetMode,
    setDatasetMode,
    sectionObservations,
    loading,
    error,
    isEmptyDataset,
    refresh: loadData,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    isFiltered,
    availableMonths: [] as string[],
  };
}
