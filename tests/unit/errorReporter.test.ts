import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportError } from '../../src/lib/errorReporter';

describe('errorReporter', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock date to ensure consistent timestamp in tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('EXPECTED_OPTIONAL_FAILURE', () => {
    it('logs debug message when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('test error');

      reportError(error, 'EXPECTED_OPTIONAL_FAILURE');

      expect(console.debug).toHaveBeenCalledWith(
        '[PULSE Debug] Optional feature unavailable (Global:Unknown):',
        'test error'
      );
    });

    it('does not log when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('test error');

      reportError(error, 'EXPECTED_OPTIONAL_FAILURE');

      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('RECOVERABLE_FAILURE', () => {
    it('logs warning message', () => {
      const error = new Error('network glitch');

      reportError(error, 'RECOVERABLE_FAILURE');

      expect(console.warn).toHaveBeenCalledWith(
        '[PULSE Warning] Recoverable error (Global:Unknown):',
        'network glitch'
      );
    });
  });

  describe('USER_ACTION_REQUIRED', () => {
    it('logs info message', () => {
      const error = new Error('auth required');

      reportError(error, 'USER_ACTION_REQUIRED');

      expect(console.info).toHaveBeenCalledWith(
        '[PULSE Info] User action required (Global:Unknown):',
        'auth required'
      );
    });
  });

  describe('CRITICAL_FAILURE', () => {
    it('logs error message with formatted log including stack', () => {
      const error = new Error('database corruption');
      // Set a fake stack trace so we can test it reliably
      error.stack = 'Error: database corruption\n    at Object.<anonymous> (/test.js:1:1)';

      reportError(error, 'CRITICAL_FAILURE');

      expect(console.error).toHaveBeenCalledWith(
        '[PULSE Critical] System failure (Global:Unknown):',
        'database corruption',
        expect.objectContaining({
          timestamp: '2024-01-01T00:00:00.000Z',
          severity: 'CRITICAL_FAILURE',
          component: 'Global',
          action: 'Unknown',
          message: 'database corruption',
          stack: error.stack
        })
      );
    });
  });

  describe('Error payload formatting', () => {
    it('handles string errors', () => {
      reportError('string error', 'RECOVERABLE_FAILURE');

      expect(console.warn).toHaveBeenCalledWith(
        '[PULSE Warning] Recoverable error (Global:Unknown):',
        'string error'
      );
    });

    it('includes custom context information', () => {
      const error = new Error('custom context');

      reportError(error, 'CRITICAL_FAILURE', {
        component: 'AuthService',
        action: 'login',
        metadata: { userId: '123' }
      });

      expect(console.error).toHaveBeenCalledWith(
        '[PULSE Critical] System failure (AuthService:login):',
        'custom context',
        expect.objectContaining({
          component: 'AuthService',
          action: 'login',
          metadata: { userId: '123' }
        })
      );
    });
  });
});
