import type { Express, Request, Response } from 'express';
import { ITelegramNotifierService } from '../services/interfaces/ITelegramNotifierService';
import { isTrackedPageRoute, isActivitySurface, PageViewRequest } from '../../shared/types/telemetry';
import { isValidDeviceId } from '../../shared/telemetry/deviceId';

export interface TelemetryRouteDependencies {
  telegramService: ITelegramNotifierService;
}

export function registerTelemetryRoutes(
  app: Express,
  deps: TelemetryRouteDependencies
): void {
  app.post('/api/telemetry/page-view', async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;

      if (!body || typeof body !== 'object') {
        res.status(400).json({ success: false, error: 'Invalid request body' });
        return;
      }

      const { eventId, route, surface, deviceId, clientTimestampMs } = body;

      // Validate eventId (must be a valid UUID string 20-50 chars)
      if (typeof eventId !== 'string' || eventId.length < 20 || eventId.length > 50) {
        res.status(400).json({ success: false, error: 'Invalid eventId' });
        return;
      }

      // Validate allowlisted route
      if (!isTrackedPageRoute(route)) {
        res.status(400).json({ success: false, error: 'Route is not an approved tracked page' });
        return;
      }

      // Validate surface
      if (!isActivitySurface(surface)) {
        res.status(400).json({ success: false, error: 'Invalid surface' });
        return;
      }

      // Validate deviceId if provided
      let validDeviceId: string | undefined;
      if (deviceId !== undefined && deviceId !== null) {
        if (!isValidDeviceId(deviceId)) {
          res.status(400).json({ success: false, error: 'Invalid deviceId format' });
          return;
        }
        validDeviceId = deviceId;
      }

      const payload: PageViewRequest = {
        eventId,
        route,
        surface,
        deviceId: validDeviceId,
        clientTimestampMs: typeof clientTimestampMs === 'number' ? clientTimestampMs : undefined
      };

      const result = await deps.telegramService.enqueuePageView(payload);

      res.status(200).json({
        success: true,
        queued: true,
        deduplicated: result.deduplicated ?? false
      });
    } catch (err: unknown) {
      console.error('[Telemetry Route Error]:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'Internal server error processing telemetry' });
    }
  });
}
