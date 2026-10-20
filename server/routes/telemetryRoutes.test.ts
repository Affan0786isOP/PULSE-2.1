import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import * as http from 'http';
import type * as net from 'net';
import { registerTelemetryRoutes } from './telemetryRoutes';
import { ITelegramNotifierService } from '../services/interfaces/ITelegramNotifierService';

function makeRequest(
  server: http.Server,
  method: string,
  pathUrl: string,
  body?: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as net.AddressInfo;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        method,
        path: pathUrl,
        headers: {
          'content-type': 'application/json'
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 500,
              body: JSON.parse(raw)
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              body: { raw }
            });
          }
        });
      }
    );

    req.on('error', reject);
    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('POST /api/telemetry/page-view', () => {
  let app: express.Express;
  let server: http.Server;
  let mockTelegramService: ITelegramNotifierService;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    mockTelegramService = {
      config: { mode: 'dry-run' },
      enqueuePageView: vi.fn().mockResolvedValue({ success: true, deduplicated: false }),
      enqueueAssessmentResult: vi.fn().mockResolvedValue({ success: true }),
      enqueueLeaderboardUpload: vi.fn().mockResolvedValue({ success: true }),
      processOutbox: vi.fn().mockResolvedValue({ processed: 1, failed: 0 }),
      stopWorker: vi.fn()
    };

    registerTelemetryRoutes(app, { telegramService: mockTelegramService });

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('accepts valid page view payload and returns queued: true', async () => {
    const res = await makeRequest(server, 'POST', '/api/telemetry/page-view', {
      eventId: '12345678-1234-1234-1234-123456789abc',
      route: '/assessments',
      surface: 'desktop',
      deviceId: 'dev_a1b2c3d4e5f6g7h8'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.queued).toBe(true);
    expect(mockTelegramService.enqueuePageView).toHaveBeenCalledWith(expect.objectContaining({
      route: '/assessments',
      surface: 'desktop',
      deviceId: 'dev_a1b2c3d4e5f6g7h8'
    }));
  });

  it('rejects unapproved routes with 400', async () => {
    const res = await makeRequest(server, 'POST', '/api/telemetry/page-view', {
      eventId: '12345678-1234-1234-1234-123456789abc',
      route: '/reaction-test',
      surface: 'desktop'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Route is not an approved tracked page');
    expect(mockTelegramService.enqueuePageView).not.toHaveBeenCalled();
  });

  it('rejects invalid surface with 400', async () => {
    const res = await makeRequest(server, 'POST', '/api/telemetry/page-view', {
      eventId: '12345678-1234-1234-1234-123456789abc',
      route: '/',
      surface: 'smart-tv'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid surface');
  });

  it('rejects invalid eventId format with 400', async () => {
    const res = await makeRequest(server, 'POST', '/api/telemetry/page-view', {
      eventId: 'short-id',
      route: '/',
      surface: 'desktop'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid eventId');
  });
});
