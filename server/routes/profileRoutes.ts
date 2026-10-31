import type express from 'express';
import type { Express } from 'express';
import { verifyFirebaseUserToken } from '../middleware/auth';
import type { ProfileRegistryService } from '../services/profileRegistryService';
import { AppError } from '../models/replayContracts';

export function registerProfileRoutes(
  app: Express,
  profileService: ProfileRegistryService
): void {
  // Check display name availability
  app.post('/api/profiles/check-name', async (req: express.Request, res: express.Response) => {
    try {
      const { displayName } = req.body || {};
      if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({ success: false, error: 'displayName is required' });
      }

      const result = await profileService.checkNameAvailability(displayName);
      return res.json({ success: true, ...result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  // Reserve a new profile under authenticated account
  app.post('/api/profiles/reserve', async (req: express.Request, res: express.Response) => {
    try {
      const user = await verifyFirebaseUserToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { displayName, ageGroup, shareAgeGroupOnLeaderboard } = req.body || {};
      if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({ success: false, error: 'displayName is required' });
      }
      if (!ageGroup || typeof ageGroup !== 'string') {
        return res.status(400).json({ success: false, error: 'ageGroup is required' });
      }

      const result = await profileService.reserveProfile({
        ownerUid: user.uid,
        displayName,
        ageGroup,
        shareAgeGroupOnLeaderboard
      });

      return res.status(201).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  // Retrieve all profiles belonging to the authenticated account
  app.get('/api/profiles/my-profiles', async (req: express.Request, res: express.Response) => {
    try {
      const user = await verifyFirebaseUserToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const profiles = await profileService.getMyProfiles(user.uid);
      return res.json({ success: true, profiles });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  // Delete an owned profile
  app.delete('/api/profiles/:profileUid', async (req: express.Request, res: express.Response) => {
    try {
      const user = await verifyFirebaseUserToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const profileUid = req.params.profileUid;
      if (!profileUid || typeof profileUid !== 'string') {
        return res.status(400).json({ success: false, error: 'profileUid is required' });
      }

      const result = await profileService.deleteProfile(user.uid, profileUid);
      return res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });
}
