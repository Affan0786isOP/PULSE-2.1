import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DatasetObservation,
  DatasetFilters,
  ResearchSessionRecord,
  AssessmentId,
  DatasetMode
} from './types';
import { DEFAULT_DATASET_FILTERS, applyDatasetFilters, isFilterActive, countActiveFilters } from './filters';
import { fetchResearchDataset } from './service';
import { selectObservationsForSection } from './selectors';

export interface DatasetPipelineState {
  // Raw unmutated observations from authoritative research records
  records: ResearchSessionRecord[];
  observations: DatasetObservation[];
  availableMonths: string[];
  totalObservationsCount: number;
  totalSessionsCount: number;

  // Global shared filter state
  filters: DatasetFilters;
  setFilters: React.Dispatch<React.SetStateAction<DatasetFilters>>;
  resetFilters: () => void;
  activeFilterCount: number;
  isFiltered: boolean;

  // Filtered observations derived through the single shared pipeline
  filteredObservations: DatasetObservation[];
  filteredObservationsCount: number;
  filteredSessionsCount: number;

  // Active section and section-specific slice
  activeAssessment: AssessmentId;
  setActiveAssessment: (assessment: AssessmentId) => void;
  datasetMode: DatasetMode;
  setDatasetMode: (mode: DatasetMode) => void;
  
  // The observations for the current assessment (or explorer)
  sectionObservations: DatasetObservation[];

  // Lifecycle states
  loading: boolean;
  error: string | null;
  isEmptyDataset: boolean;
  isEmptyAfterFilters: boolean;

  // Actions
  refresh: () => Promise<void>;
}

export function useDatasetPipeline(initialAssessment: AssessmentId = 'visual-reaction'): DatasetPipelineState {
  const [records, setRecords] = useState<ResearchSessionRecord[]>([]);
  const [observations, setObservations] = useState<DatasetObservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Request generation counter & component mount state to guard against race conditions
  const activeFetchIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Central Shared Filter State
  const [filters, setFilters] = useState<DatasetFilters>(DEFAULT_DATASET_FILTERS);

  // Central Section Navigation State
  const [activeAssessment, setActiveAssessment] = useState<AssessmentId>(initialAssessment);
  const [datasetMode, setDatasetMode] = useState<DatasetMode>('assessment');

  // Fetch normalized research dataset with request-generation guard
  const loadData = useCallback(async () => {
    const fetchId = ++activeFetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { records: recs, observations: obs } = await fetchResearchDataset();
      // Drop stale responses if a newer fetch was initiated or if component unmounted
      if (fetchId !== activeFetchIdRef.current || !isMountedRef.current) {
        return;
      }
      setRecords(recs);
      setObservations(obs);
    } catch (err: unknown) {
      if (fetchId !== activeFetchIdRef.current || !isMountedRef.current) {
        return;
      }
      console.error('[PULSE Dataset Pipeline] Failed to load research dataset:', err);
      const msg = err instanceof Error ? err.message : 'Failed to retrieve research observations.';
      setError(msg);
    } finally {
      if (fetchId === activeFetchIdRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    return () => {
      isMountedRef.current = false;
      activeFetchIdRef.current++;
    };
  }, [loadData]);

  // Derived available calendar months from dataset
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    observations.forEach(o => {
      if (o.completedAtMonth && o.completedAtMonth.length === 7) {
        months.add(o.completedAtMonth);
      }
    });
    records.forEach(r => {
      if (r.completedAtMonth && r.completedAtMonth.length === 7) {
        months.add(r.completedAtMonth);
      }
    });
    return Array.from(months).sort().reverse();
  }, [observations, records]);

  // Reset all filters to canonical defaults
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_DATASET_FILTERS);
  }, []);

  // Filter pipeline: Derives filtered observations non-mutatingly from shared filters
  const filteredObservations = useMemo(() => {
    return applyDatasetFilters(observations, filters);
  }, [observations, filters]);

  // Section-specific selector: operates strictly on the ALREADY-FILTERED observations
  const sectionObservations = useMemo(() => {
    if (datasetMode === 'data-explorer') {
      return selectObservationsForSection(filteredObservations, 'data-explorer');
    }
    return selectObservationsForSection(filteredObservations, activeAssessment);
  }, [filteredObservations, activeAssessment, datasetMode]);

  // Telemetry metrics derived from filtered observations
  const filteredSessionsCount = useMemo(() => {
    const sessionIds = new Set<string>();
    filteredObservations.forEach(o => sessionIds.add(o.sessionId));
    return sessionIds.size;
  }, [filteredObservations]);

  const totalSessionsCount = useMemo(() => {
    // Unique observations.sessionId to prevent overcounting sessions with no observations
    return new Set(observations.map(o => o.sessionId)).size;
  }, [observations]);

  // Active filter state calculations
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const isFiltered = useMemo(() => isFilterActive(filters), [filters]);

  // State flags
  const isEmptyDataset = !loading && !error && observations.length === 0;
  const isEmptyAfterFilters = !loading && !error && observations.length > 0 && filteredObservations.length === 0;

  return {
    records,
    observations,
    availableMonths,
    totalObservationsCount: observations.length,
    totalSessionsCount,

    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    isFiltered,

    filteredObservations,
    filteredObservationsCount: filteredObservations.length,
    filteredSessionsCount,

    activeAssessment,
    setActiveAssessment,
    datasetMode,
    setDatasetMode,
    sectionObservations,

    loading,
    error,
    isEmptyDataset,
    isEmptyAfterFilters,

    refresh: loadData
  };
}

const DatasetPipelineContext = createContext<DatasetPipelineState | null>(null);

export interface DatasetPipelineProviderProps {
  children: React.ReactNode;
  initialAssessment?: AssessmentId;
}

export function DatasetPipelineProvider({
  children,
  initialAssessment = 'visual-reaction'
}: DatasetPipelineProviderProps) {
  const pipeline = useDatasetPipeline(initialAssessment);
  return (
    <DatasetPipelineContext.Provider value={pipeline}>
      {children}
    </DatasetPipelineContext.Provider>
  );
}

export function useDatasetPipelineContext(): DatasetPipelineState {
  const ctx = useContext(DatasetPipelineContext);
  if (!ctx) {
    throw new Error('useDatasetPipelineContext must be used within a DatasetPipelineProvider');
  }
  return ctx;
}
