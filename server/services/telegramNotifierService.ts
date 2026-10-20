import {
  ITelegramNotifierService,
  TelegramConfig,
} from './interfaces/ITelegramNotifierService';
import {
  PageViewRequest,
  AssessmentResultNotification,
  LeaderboardNotification,
} from '../../shared/types/telemetry';

export interface OutboxRecord {
  id: string; // Deterministic notification ID
  category: 'visit' | 'result' | 'leaderboard';
  priority: 'high' | 'low';
  text: string;
  topicId?: number;
  state: 'pending' | 'sending' | 'sent' | 'dead_letter' | 'blocked';
  attempts: number;
  nextRetryTime: number;
  createdAt: number;
  sentAt?: number;
  lastError?: string;
}

/**
 * Escapes HTML characters for Telegram Bot API HTML parse mode.
 */
export function escapeTelegramHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Truncates string safely to maximum characters.
 */
export function truncateSafe(str: string, maxLen: number = 64): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export class TelegramNotifierService implements ITelegramNotifierService {
  public readonly config: TelegramConfig;
  private readonly outbox: Map<string, OutboxRecord> = new Map();
  private readonly pageViewEventIds: Map<string, number> = new Map(); // eventId -> expiry epoch ms
  private isProcessing = false;
  private workerTimer: NodeJS.Timeout | null = null;
  private lastSendTime = 0;
  private readonly minSendIntervalMs = 3333; // ~18 msgs/minute rate limit target

  constructor(envConfig?: Partial<TelegramConfig>, autoStartWorker = true) {
    const rawMode = envConfig?.mode || process.env.TELEGRAM_MODE || 'dry-run';
    const mode = (['live', 'dry-run', 'disabled'].includes(rawMode) ? rawMode : 'dry-run') as 'live' | 'dry-run' | 'disabled';

    const parseTopic = (val?: string | number): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = Number(val);
      return Number.isInteger(num) && num > 0 ? num : undefined;
    };

    this.config = {
      botToken: envConfig?.botToken ?? process.env.TELEGRAM_BOT_TOKEN,
      chatId: envConfig?.chatId ?? process.env.TELEGRAM_CHAT_ID,
      topicVisits: parseTopic(envConfig?.topicVisits ?? process.env.TELEGRAM_TOPIC_VISITS),
      topicResults: parseTopic(envConfig?.topicResults ?? process.env.TELEGRAM_TOPIC_RESULTS),
      topicLeaderboard: parseTopic(envConfig?.topicLeaderboard ?? process.env.TELEGRAM_TOPIC_LEADERBOARD),
      allowGeneralFallback: envConfig?.allowGeneralFallback ?? (process.env.TELEGRAM_ALLOW_GENERAL_TOPIC_FALLBACK === 'true'),
      mode
    };

    if (autoStartWorker && this.config.mode !== 'disabled') {
      this.workerTimer = setInterval(() => {
        void this.processOutbox();
      }, 5000);
      if (typeof this.workerTimer.unref === 'function') {
        this.workerTimer.unref();
      }
    }
  }

  public stopWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }

  public formatPageView(event: PageViewRequest, receivedAtIso: string): string {
    const surfaceLabel = event.surface === 'mobile' ? 'Mobile PWA' : 'Desktop SPA';
    const deviceLine = event.deviceId
      ? `• <b>Device ID:</b> <code>${escapeTelegramHtml(event.deviceId)}</code>\n`
      : '';

    return (
      `🌐 <b>PULSE Page Visit</b>\n\n` +
      `• <b>Route:</b> <code>${escapeTelegramHtml(event.route)}</code>\n` +
      `• <b>Surface:</b> ${surfaceLabel}\n` +
      deviceLine +
      `• <b>Time:</b> <code>${escapeTelegramHtml(receivedAtIso)}</code>`
    );
  }

  public formatAssessmentResult(event: AssessmentResultNotification): string {
    const surfaceLabel = event.surface === 'mobile' ? 'Mobile PWA' : 'Desktop SPA';
    const deviceLine = event.deviceId
      ? `• <b>Device ID:</b> <code>${escapeTelegramHtml(event.deviceId)}</code>\n`
      : '';

    let metricsBlock = '';
    const m = event.metrics;

    if (event.assessmentType === 'visual-reaction') {
      const mean = typeof m.meanReactionTimeMs === 'number' ? `${Math.round(m.meanReactionTimeMs)} ms` : 'N/A';
      const median = typeof m.medianReactionTimeMs === 'number' ? `${Math.round(m.medianReactionTimeMs)} ms` : 'N/A';
      const fastest = typeof m.fastestReactionTimeMs === 'number' ? `${Math.round(m.fastestReactionTimeMs)} ms` : 'N/A';
      const falseStarts = typeof m.falseStartsCount === 'number' ? m.falseStartsCount : 0;
      const valid = typeof m.validTrialsCount === 'number' ? m.validTrialsCount : 5;
      metricsBlock =
        `• <b>Mean RT:</b> ${mean}\n` +
        `• <b>Median RT:</b> ${median}\n` +
        `• <b>Fastest:</b> ${fastest}\n` +
        `• <b>False Starts:</b> ${falseStarts}\n` +
        `• <b>Valid Trials:</b> ${valid}`;
    } else if (event.assessmentType === 'direction') {
      const mean = typeof m.meanReactionTimeMs === 'number' ? `${Math.round(m.meanReactionTimeMs)} ms` : 'N/A';
      const accuracy = typeof m.accuracyPercentage === 'number' ? `${Math.round(m.accuracyPercentage)}%` : 'N/A';
      const conflict = typeof m.conflictCostMs === 'number' ? `${Math.round(m.conflictCostMs)} ms` : 'N/A';
      metricsBlock =
        `• <b>Mean RT:</b> ${mean}\n` +
        `• <b>Accuracy:</b> ${accuracy}\n` +
        `• <b>Conflict Cost:</b> ${conflict}`;
    } else if (event.assessmentType === 'colour-recognition' || event.assessmentType === 'color-recognition') {
      const mean = typeof m.meanReactionTimeMs === 'number' ? `${Math.round(m.meanReactionTimeMs)} ms` : 'N/A';
      const accuracy = typeof m.accuracyPercentage === 'number' ? `${Math.round(m.accuracyPercentage)}%` : 'N/A';
      const interference = typeof m.interferenceCostMs === 'number' ? `${Math.round(m.interferenceCostMs)} ms` : 'N/A';
      metricsBlock =
        `• <b>Mean RT:</b> ${mean}\n` +
        `• <b>Accuracy:</b> ${accuracy}\n` +
        `• <b>Interference Cost:</b> ${interference}`;
    } else if (event.assessmentType === 'block-memory') {
      const span = typeof m.maxSpan === 'number' ? m.maxSpan : 'N/A';
      const level = typeof m.highestLevelAchieved === 'number' ? m.highestLevelAchieved : 'N/A';
      metricsBlock =
        `• <b>Max Span:</b> ${span}\n` +
        `• <b>Highest Level:</b> ${level}`;
    } else if (event.assessmentType === 'number-memory') {
      const span = typeof m.maxSpan === 'number' ? m.maxSpan : 'N/A';
      const level = typeof m.highestLevelAchieved === 'number' ? m.highestLevelAchieved : 'N/A';
      metricsBlock =
        `• <b>Max Span:</b> ${span}\n` +
        `• <b>Highest Level:</b> ${level}`;
    }

    return (
      `🎯 <b>Assessment Completed</b>\n\n` +
      `• <b>Protocol:</b> <code>${escapeTelegramHtml(event.assessmentType)}</code>\n` +
      `• <b>Age Group:</b> <code>${escapeTelegramHtml(event.ageGroup)}</code>\n` +
      `• <b>Surface:</b> ${surfaceLabel} (Estimated device: ${escapeTelegramHtml(event.deviceCategory)})\n` +
      deviceLine +
      metricsBlock + '\n' +
      `• <b>Completed At:</b> <code>${escapeTelegramHtml(event.completedAtIso)}</code>`
    );
  }

  public formatLeaderboardUpload(event: LeaderboardNotification): string {
    const surfaceLabel = event.surface === 'mobile' ? 'Mobile PWA' : 'Desktop SPA';
    const deviceLine = event.deviceId
      ? `• <b>Device ID:</b> <code>${escapeTelegramHtml(event.deviceId)}</code>\n`
      : '';
    const rankLine = typeof event.rankAtSubmission === 'number'
      ? `• <b>Rank at submission:</b> #${event.rankAtSubmission}\n`
      : '';
    const trialsLine = typeof event.trialsCount === 'number'
      ? `• <b>Trials:</b> ${event.trialsCount}\n`
      : '';

    return (
      `🏆 <b>New Leaderboard Submission</b>\n\n` +
      `• <b>Player:</b> <b>${escapeTelegramHtml(truncateSafe(event.displayName, 32))}</b>\n` +
      `• <b>Protocol:</b> <code>${escapeTelegramHtml(event.assessmentType)}</code>\n` +
      `• <b>Age Group:</b> <code>${escapeTelegramHtml(event.ageGroup)}</code>\n` +
      `• <b>Score:</b> <b>${escapeTelegramHtml(event.scoreDisplay)} ${escapeTelegramHtml(event.scoreUnit)}</b>\n` +
      rankLine +
      trialsLine +
      `• <b>Surface:</b> ${surfaceLabel}\n` +
      deviceLine +
      `• <b>Submitted At:</b> <code>${escapeTelegramHtml(event.createdAtIso)}</code>`
    );
  }

  private resolveTopic(category: 'visit' | 'result' | 'leaderboard'): { topicId?: number; blocked: boolean } {
    let topicId: number | undefined;
    if (category === 'visit') topicId = this.config.topicVisits;
    else if (category === 'result') topicId = this.config.topicResults;
    else if (category === 'leaderboard') topicId = this.config.topicLeaderboard;

    if (topicId !== undefined) {
      return { topicId, blocked: false };
    }

    if (this.config.allowGeneralFallback) {
      return { topicId: undefined, blocked: false };
    }

    // Blocked if topic is absent and general fallback is not allowed
    return { topicId: undefined, blocked: true };
  }

  public async enqueuePageView(event: PageViewRequest): Promise<{ success: boolean; deduplicated?: boolean }> {
    if (this.config.mode === 'disabled') {
      return { success: true };
    }

    const now = Date.now();
    // 48-hour eventId deduplication
    this.cleanExpiredDeduplicationKeys(now);
    if (this.pageViewEventIds.has(event.eventId)) {
      return { success: true, deduplicated: true };
    }
    this.pageViewEventIds.set(event.eventId, now + 48 * 60 * 60 * 1000);

    const receivedAtIso = new Date(now).toISOString();
    const text = this.formatPageView(event, receivedAtIso);
    const notificationId = `visit_${event.eventId}`;

    const { topicId, blocked } = this.resolveTopic('visit');

    const record: OutboxRecord = {
      id: notificationId,
      category: 'visit',
      priority: 'low',
      text,
      topicId,
      state: blocked ? 'blocked' : 'pending',
      attempts: 0,
      nextRetryTime: now,
      createdAt: now,
      lastError: blocked ? 'Configuration blocked: topic unconfigured and general fallback disabled' : undefined
    };

    this.outbox.set(notificationId, record);
    return { success: true, deduplicated: false };
  }

  public async enqueueAssessmentResult(event: AssessmentResultNotification): Promise<{ success: boolean }> {
    if (this.config.mode === 'disabled') {
      return { success: true };
    }

    const now = Date.now();
    const notificationId = `res_${event.notificationId}`;

    if (this.outbox.has(notificationId)) {
      return { success: true };
    }

    const text = this.formatAssessmentResult(event);
    const { topicId, blocked } = this.resolveTopic('result');

    const record: OutboxRecord = {
      id: notificationId,
      category: 'result',
      priority: 'high',
      text,
      topicId,
      state: blocked ? 'blocked' : 'pending',
      attempts: 0,
      nextRetryTime: now,
      createdAt: now,
      lastError: blocked ? 'Configuration blocked: topic unconfigured and general fallback disabled' : undefined
    };

    this.outbox.set(notificationId, record);
    return { success: true };
  }

  public async enqueueLeaderboardUpload(event: LeaderboardNotification): Promise<{ success: boolean }> {
    if (this.config.mode === 'disabled') {
      return { success: true };
    }

    const now = Date.now();
    const notificationId = `lb_${event.notificationId}`;

    if (this.outbox.has(notificationId)) {
      return { success: true };
    }

    const text = this.formatLeaderboardUpload(event);
    const { topicId, blocked } = this.resolveTopic('leaderboard');

    const record: OutboxRecord = {
      id: notificationId,
      category: 'leaderboard',
      priority: 'high',
      text,
      topicId,
      state: blocked ? 'blocked' : 'pending',
      attempts: 0,
      nextRetryTime: now,
      createdAt: now,
      lastError: blocked ? 'Configuration blocked: topic unconfigured and general fallback disabled' : undefined
    };

    this.outbox.set(notificationId, record);
    return { success: true };
  }

  private cleanExpiredDeduplicationKeys(now: number): void {
    if (this.pageViewEventIds.size > 2000) {
      for (const [key, expiry] of this.pageViewEventIds.entries()) {
        if (expiry <= now) {
          this.pageViewEventIds.delete(key);
        }
      }
    }
  }

  public async processOutbox(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing || this.config.mode === 'disabled') {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    try {
      const now = Date.now();
      // Prioritize high-priority items (results/leaderboard) over low-priority (page visits)
      const dueRecords = Array.from(this.outbox.values())
        .filter((r) => r.state === 'pending' && r.nextRetryTime <= now)
        .sort((a, b) => {
          if (a.priority === 'high' && b.priority !== 'high') return -1;
          if (b.priority === 'high' && a.priority !== 'high') return 1;
          return a.createdAt - b.createdAt;
        });

      for (const record of dueRecords) {
        // Enforce chat-wide rate limiting
        const timeSinceLast = Date.now() - this.lastSendTime;
        if (timeSinceLast < this.minSendIntervalMs) {
          break; // Yield to next loop iteration
        }

        record.state = 'sending';
        record.attempts += 1;

        try {
          await this.dispatchMessage(record);
          record.state = 'sent';
          record.sentAt = Date.now();
          this.lastSendTime = Date.now();
          processed += 1;
        } catch (err: unknown) {
          failed += 1;
          const errMsg = err instanceof Error ? err.message : String(err);
          record.lastError = errMsg;

          if (record.attempts >= 5) {
            record.state = 'dead_letter';
          } else {
            record.state = 'pending';
            // Exponential backoff
            record.nextRetryTime = Date.now() + Math.pow(2, record.attempts) * 2000;
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed };
  }

  private async dispatchMessage(record: OutboxRecord): Promise<void> {
    if (this.config.mode === 'dry-run') {
      // In dry-run mode, safely log to server console without sending network request
      console.log(`[Telegram Dry-Run Topic: ${record.topicId ?? 'General'}]\n${record.text}`);
      return;
    }

    if (this.config.mode === 'live') {
      if (!this.config.botToken || !this.config.chatId) {
        throw new Error('Telegram bot credentials unconfigured for live mode');
      }

      const body: Record<string, unknown> = {
        chat_id: this.config.chatId,
        text: record.text,
        parse_mode: 'HTML'
      };

      if (typeof record.topicId === 'number') {
        body.message_thread_id = record.topicId;
      }

      const res = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Telegram API responded with HTTP ${res.status}: ${errorText.slice(0, 150)}`);
      }
    }
  }

  // Diagnostics & tests helper
  public getOutboxRecord(id: string): OutboxRecord | undefined {
    return this.outbox.get(id);
  }
}
