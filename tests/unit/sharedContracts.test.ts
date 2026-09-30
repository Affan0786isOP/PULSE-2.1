import { describe, it, expect } from 'vitest';
import {
  CANONICAL_ASSESSMENT_IDS,
  VALID_AGE_GROUPS,
  type AssessmentId,
  type AgeGroup,
  type DeviceCategory,
  type MetricDirection,
  type DomainName,
} from '@shared/contracts/common';
import type { AssessmentDefinition } from '@shared/contracts/assessment';
import type { DatasetFilters, DatasetQuery } from '@shared/contracts/dataset';
import type { LeaderboardQuery } from '@shared/contracts/leaderboard';
import type { ApiError, PaginationRequest, PageInfo, PaginationResponse } from '@shared/contracts/api';

describe('Shared Contracts & Primitives', () => {
  it('contains exactly five canonical assessment IDs without duplicates', () => {
    expect(CANONICAL_ASSESSMENT_IDS).toHaveLength(5);
    const uniqueIds = new Set(CANONICAL_ASSESSMENT_IDS);
    expect(uniqueIds.size).toBe(5);

    expect(CANONICAL_ASSESSMENT_IDS).toEqual([
      'visual-reaction',
      'direction',
      'color-recognition',
      'block-memory',
      'number-memory',
    ]);
  });

  it('contains exactly seven demographic age groups with preserved en-dashes', () => {
    expect(VALID_AGE_GROUPS).toHaveLength(7);
    const uniqueGroups = new Set(VALID_AGE_GROUPS);
    expect(uniqueGroups.size).toBe(7);

    expect(VALID_AGE_GROUPS).toEqual([
      'Children (8–12)',
      'Adolescents (13–17)',
      'Young adults (18–25)',
      'Adults (26–40)',
      'Middle-aged adults (41–60)',
      'Older adults (61–75)',
      'Seniors (76+)',
    ]);
  });

  it('validates compile-time types for core primitives', () => {
    const assessmentId: AssessmentId = 'visual-reaction';
    const ageGroup: AgeGroup = 'Adults (26–40)';
    const device: DeviceCategory = 'desktop';
    const direction: MetricDirection = 'lower-is-better';
    const domain: DomainName = 'assessment';

    expect(assessmentId).toBe('visual-reaction');
    expect(ageGroup).toBe('Adults (26–40)');
    expect(device).toBe('desktop');
    expect(direction).toBe('lower-is-better');
    expect(domain).toBe('assessment');
  });

  it('supports minimal dataset filter and query contracts', () => {
    const filters: DatasetFilters = {
      assessmentType: 'visual-reaction',
      ageGroup: 'Young adults (18–25)',
      device: 'mobile',
      month: '2026-03',
    };

    const query: DatasetQuery = {
      ...filters,
      limit: 50,
      cursor: 'cur-123',
    };

    expect(query.limit).toBe(50);
    expect(query.assessmentType).toBe('visual-reaction');
  });

  it('supports minimal leaderboard query contract', () => {
    const query: LeaderboardQuery = {
      assessmentId: 'direction',
      limit: 25,
    };

    expect(query.assessmentId).toBe('direction');
    expect(query.limit).toBe(25);
  });

  it('supports generic api transport contracts', () => {
    const apiError: ApiError = {
      success: false,
      error: 'Not found',
      status: 404,
    };
    expect(apiError.success).toBe(false);

    const pageInfo: PageInfo = {
      hasMore: false,
      nextCursor: null,
      totalCount: 1,
    };

    const paginationResponse: PaginationResponse<string> = {
      success: true,
      records: ['record-1'],
      pageInfo,
    };

    expect(paginationResponse.success).toBe(true);
    expect(paginationResponse.records).toEqual(['record-1']);
  });
});
