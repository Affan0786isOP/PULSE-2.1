export type AssessmentId =
  | 'visual-reaction'
  | 'direction'
  | 'colour-recognition'
  | 'color-recognition'
  | 'block-memory'
  | 'number-memory';

export type DatasetMode = 'assessment' | 'data-explorer';

export interface DatasetFilters {
  assessmentType: string;
  ageGroup?: string;
  device?: string;
  month?: string;
  [key: string]: any;
}

export interface ObservationRecord {
  id: string;
  sessionId?: string;
  assessmentType: string;
  scoreMetric: number;
  isValid: boolean;
  ageGroup?: string;
  deviceType?: string;
  timestamp: number | string;
  foreperiodMs?: number;
  rt?: number;
  [key: string]: any;
}
