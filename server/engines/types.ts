export interface DerivationContext {
  trials: any[];
  ageGroup: string;
  session?: any;
  sessionId: string;
}

export type DerivationResult = { success: boolean; error?: string; derivedMetrics?: Record<string, any> };
