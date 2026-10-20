import {
  PageViewRequest,
  AssessmentResultNotification,
  LeaderboardNotification,
} from '../../shared/types/telemetry';

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
  topicVisits?: number;
  topicResults?: number;
  topicLeaderboard?: number;
  allowGeneralFallback?: boolean;
  mode: 'live' | 'dry-run' | 'disabled';
}

export interface ITelegramNotifierService {
  readonly config: TelegramConfig;
  enqueuePageView(event: PageViewRequest): Promise<{ success: boolean; deduplicated?: boolean }>;
  enqueueAssessmentResult(event: AssessmentResultNotification): Promise<{ success: boolean }>;
  enqueueLeaderboardUpload(event: LeaderboardNotification): Promise<{ success: boolean }>;
  processOutbox(): Promise<{ processed: number; failed: number }>;
  stopWorker(): void;
}
