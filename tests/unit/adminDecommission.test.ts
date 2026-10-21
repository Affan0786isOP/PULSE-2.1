import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relPath: string) =>
  readFileSync(resolve(process.cwd(), relPath), 'utf8');

describe('Web Admin Surface Decommissioning & Invariant Alignment', () => {
  it('confirms all client admin components and actions are deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/admin/AdminPage.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/components/admin/AdminPasscodeModal.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/components/admin/AdminEditAliasModal.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/lib/adminActions.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/lib/useAdminAuth.ts'))).toBe(false);
  });

  it('confirms /admin route is deleted from App.tsx and Leaderboard trigger is removed', () => {
    const appSource = readSource('src/App.tsx');
    expect(appSource).not.toContain('AdminPage');
    expect(appSource).not.toContain('path="/admin"');

    const leaderboardSource = readSource('src/components/Leaderboard.tsx');
    expect(leaderboardSource).not.toContain('AdminPasscodeModal');
    expect(leaderboardSource).not.toContain("onNavigate('admin')");
    expect(leaderboardSource).not.toContain("window.location.assign('/admin')");

    const mobileLeaderboardSource = readSource('mobile/src/components/Leaderboard.tsx');
    expect(mobileLeaderboardSource).not.toContain('AdminPasscodeModal');
  });

  it('confirms server admin routes and middleware are deleted and unregistered', () => {
    expect(existsSync(resolve(process.cwd(), 'server/routes/adminRoutes.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'server/middleware/adminAuth.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'server/services/adminService.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'server/models/adminModels.ts'))).toBe(false);

    const serverIndex = readSource('server/index.ts');
    expect(serverIndex).not.toContain('registerAdminRoutes');
    expect(serverIndex).not.toContain('adminRoutes');
  });
});
