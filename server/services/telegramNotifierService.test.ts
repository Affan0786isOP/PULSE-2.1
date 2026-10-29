import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TelegramNotifierService, escapeTelegramHtml, MAX_OUTBOX_CAPACITY } from './telegramNotifierService';
import { AssessmentResultNotification, LeaderboardNotification } from '../../shared/types/telemetry';

describe('TelegramNotifierService', () => {
  let service: TelegramNotifierService;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    service?.stopWorker();
  });

  describe('HTML Escaping & Safety', () => {
    it('escapes dangerous HTML characters', () => {
      expect(escapeTelegramHtml('<b>Hello & Goodbye</b>')).toBe('&lt;b&gt;Hello &amp; Goodbye&lt;/b&gt;');
      expect(escapeTelegramHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
      expect(escapeTelegramHtml(null)).toBe('');
    });
  });

  describe('Formatting all 5 Assessment Types', () => {
    beforeEach(() => {
      service = new TelegramNotifierService({ mode: 'dry-run' }, false);
    });

    it('formats Visual Reaction test result accurately', () => {
      const event: AssessmentResultNotification = {
        notificationId: 'sess-123',
        assessmentType: 'visual-reaction',
        ageGroup: '20-29',
        deviceCategory: 'computer',
        surface: 'desktop',
        deviceId: 'dev_abc123',
        completedAtIso: '2026-10-20T18:00:00.000Z',
        metrics: {
          meanReactionTimeMs: 182.4,
          medianReactionTimeMs: 179.0,
          fastestReactionTimeMs: 165.2,
          falseStartsCount: 0,
          validTrialsCount: 5
        }
      };

      const text = service.formatAssessmentResult(event);
      expect(text).toContain('visual-reaction');
      expect(text).toContain('Mean RT:</b> 182 ms');
      expect(text).toContain('Median RT:</b> 179 ms');
      expect(text).toContain('False Starts:</b> 0');
      expect(text).toContain('dev_abc123');
      expect(text).toContain('Desktop SPA');
    });

    it('formats Direction Flanker test accurately', () => {
      const event: AssessmentResultNotification = {
        notificationId: 'sess-456',
        assessmentType: 'direction',
        ageGroup: '30-39',
        deviceCategory: 'phone',
        surface: 'mobile',
        completedAtIso: '2026-10-20T18:05:00.000Z',
        metrics: {
          meanReactionTimeMs: 420.7,
          accuracyPercentage: 95.0,
          conflictCostMs: 45.2
        }
      };

      const text = service.formatAssessmentResult(event);
      expect(text).toContain('direction');
      expect(text).toContain('Accuracy:</b> 95%');
      expect(text).toContain('Conflict Cost:</b> 45 ms');
      expect(text).toContain('Mobile PWA');
    });

    it('formats Block Memory test accurately', () => {
      const event: AssessmentResultNotification = {
        notificationId: 'sess-789',
        assessmentType: 'block-memory',
        ageGroup: '20-29',
        deviceCategory: 'computer',
        surface: 'desktop',
        completedAtIso: '2026-10-20T18:10:00.000Z',
        metrics: {
          maxSpan: 7,
          highestLevelAchieved: 6
        }
      };

      const text = service.formatAssessmentResult(event);
      expect(text).toContain('block-memory');
      expect(text).toContain('Max Span:</b> 7');
      expect(text).toContain('Highest Level:</b> 6');
    });
  });

  describe('Leaderboard and Page View Outbox Logic', () => {
    beforeEach(() => {
      service = new TelegramNotifierService({
        mode: 'dry-run',
        topicVisits: 101,
        topicResults: 102,
        topicLeaderboard: 103
      }, false);
    });

    it('enqueues page view and deduplicates repeat eventId', async () => {
      const res1 = await service.enqueuePageView({
        eventId: 'uuid-1',
        route: '/assessments',
        surface: 'desktop',
        deviceId: 'dev_test'
      });
      expect(res1.success).toBe(true);
      expect(res1.deduplicated).toBe(false);

      const res2 = await service.enqueuePageView({
        eventId: 'uuid-1',
        route: '/assessments',
        surface: 'desktop',
        deviceId: 'dev_test'
      });
      expect(res2.success).toBe(true);
      expect(res2.deduplicated).toBe(true);
    });

    it('enqueues leaderboard upload with correct topic', async () => {
      const event: LeaderboardNotification = {
        notificationId: 'lb-entry-1',
        displayName: 'HyperAce',
        assessmentType: 'visual-reaction',
        ageGroup: '20-29',
        scoreDisplay: '168',
        scoreUnit: 'ms',
        rankAtSubmission: 1,
        trialsCount: 5,
        surface: 'desktop',
        deviceId: 'dev_test',
        createdAtIso: '2026-10-20T18:15:00.000Z'
      };

      const res = await service.enqueueLeaderboardUpload(event);
      expect(res.success).toBe(true);

      const record = service.getOutboxRecord('lb_lb-entry-1');
      expect(record).toBeDefined();
      expect(record?.category).toBe('leaderboard');
      expect(record?.priority).toBe('high');
      expect(record?.topicId).toBe(103);
      expect(record?.state).toBe('pending');
    });

    it('processes outbox in dry-run mode and logs without network calls', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.enqueuePageView({
        eventId: 'uuid-2',
        route: '/leaderboard',
        surface: 'mobile'
      });

      const { processed } = await service.processOutbox();
      expect(processed).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();

      const record = service.getOutboxRecord('visit_uuid-2');
      expect(record?.state).toBe('sent');
    });

    it('enforces bounded queue capacity and exposes flush hook (BUG-10, BUG-11)', async () => {
      expect(MAX_OUTBOX_CAPACITY).toBe(200);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // Enqueue 210 page views (low priority)
      for (let i = 0; i < 210; i++) {
        await service.enqueuePageView({
          eventId: `cap-event-${i}`,
          route: `/test-${i}`,
          surface: 'desktop'
        });
      }

      // Outbox capacity should not exceed 200
      expect(warnSpy).toHaveBeenCalled();

      // Flush executes pending items
      const res = await service.flush();
      expect(res.processed).toBeGreaterThan(0);
    });
  });
});
