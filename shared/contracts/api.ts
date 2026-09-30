export interface ApiError {
  success: false;
  error: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export interface PaginationRequest {
  limit?: number;
  cursor?: string | null;
}

export interface PageInfo {
  hasMore: boolean;
  nextCursor?: string | null;
  totalCount?: number;
}

export interface PaginationResponse<T> {
  success: boolean;
  records: T[];
  pageInfo: PageInfo;
}
