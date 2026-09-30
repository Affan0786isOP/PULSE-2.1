import type { AssessmentId, AgeGroup, DeviceCategory } from './common';
import type { PaginationRequest } from './api';

export interface DatasetFilters {
  assessmentType?: AssessmentId | 'all';
  ageGroup?: AgeGroup | 'all';
  device?: DeviceCategory | 'all';
  month?: string;
}

export interface DatasetQuery extends DatasetFilters, PaginationRequest {}
