import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

const wave2CreatedOrModifiedFiles = [
  'server/models/sessionModels.ts',
  'server/models/submissionModels.ts',
  'server/models/researchModels.ts',
  'server/models/leaderboardModels.ts',
  'server/models/adminModels.ts',
  'server/models/replayContracts.ts',
  'server/repositories/interfaces/ISessionRepository.ts',
  'server/repositories/interfaces/IResearchSubmissionRepository.ts',
  'server/repositories/interfaces/IResearchDatasetRepository.ts',
  'server/repositories/interfaces/ILeaderboardSubmissionRepository.ts',
  'server/repositories/interfaces/ILeaderboardRepository.ts',
  'server/repositories/interfaces/IAdminAuditRepository.ts',
  'server/repositories/firestore/firestoreSessionRepository.ts',
  'server/repositories/firestore/firestoreResearchSubmissionRepository.ts',
  'server/repositories/firestore/firestoreResearchDatasetRepository.ts',
  'server/repositories/firestore/firestoreLeaderboardSubmissionRepository.ts',
  'server/repositories/firestore/firestoreLeaderboardRepository.ts',
  'server/repositories/firestore/firestoreAdminAuditRepository.ts',
  'server/services/interfaces/ISessionService.ts',
  'server/services/interfaces/IPersonalBestService.ts',
  'server/services/interfaces/IResearchService.ts',
  'server/services/interfaces/ILeaderboardService.ts',
  'server/services/interfaces/IAdminService.ts',
  'server/services/sessionService.ts',
  'server/services/personalBestService.ts',
  'server/services/researchService.ts',
  'server/services/leaderboardAppService.ts',
  'server/services/adminService.ts',
  'server/container.ts',
  'server/routes/researchRoutes.ts',
  'server/routes/leaderboardRoutes.ts',
  'server/routes/adminRoutes.ts',
  'server/index.ts',
  'tests/unit/serverModels.test.ts',
  'tests/unit/serverRepositories.test.ts',
  'tests/unit/serverServices.test.ts',
  'tests/unit/serverRoutesDelegation.test.ts',
  'tests/unit/serverRoutesParity.test.ts',
  'tests/unit/serverRoutesBoundary.test.ts'
];

describe('Server Architecture Boundary & Zero-Any AST Scan', () => {
  it('enforces zero explicit any and no unsafe casts across all Wave 2 created/modified files', () => {
    const violations: string[] = [];

    for (const relPath of wave2CreatedOrModifiedFiles) {
      const fullPath = path.join(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const sourceFile = ts.createSourceFile(relPath, content, ts.ScriptTarget.Latest, true);

      function visit(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.AnyKeyword) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push(`${relPath}:${line + 1}:${character + 1} - Explicit 'any' keyword prohibited in Wave 2 files`);
        }
        if (ts.isAsExpression(node)) {
          const typeText = node.type.getText(sourceFile);
          if (typeText === 'any' || typeText === 'unknown') {
            const parent = node.parent;
            if (parent && ts.isAsExpression(parent)) {
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
              violations.push(`${relPath}:${line + 1}:${character + 1} - Unsafe double cast prohibited (as unknown as ...)`);
            }
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
    }

    expect(violations).toEqual([]);
  });

  it('enforces infrastructure layer boundary: Firestore access isolated behind repositories', () => {
    const boundaryViolations: string[] = [];

    for (const relPath of wave2CreatedOrModifiedFiles) {
      const fullPath = path.join(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');

      // Prohibit direct Firestore SDK imports in routes, models, and services
      const isRouteOrModelOrService =
        relPath.startsWith('server/routes/') ||
        relPath.startsWith('server/models/') ||
        relPath.startsWith('server/services/');

      if (isRouteOrModelOrService) {
        if (content.includes("from 'firebase-admin/firestore'") || content.includes('from "firebase-admin/firestore"')) {
          boundaryViolations.push(`${relPath}: Direct 'firebase-admin/firestore' import prohibited`);
        }
        if (content.includes("from '../config/firebaseAdmin'") && !relPath.includes('personalBestService') && !relPath.includes('leaderboardAppService') && !relPath.includes('researchRoutes')) {
          // getAdminDiagnosticMessage or safeLogWarning is fine, but getAdminDb is prohibited
          if (content.includes('getAdminDb')) {
            boundaryViolations.push(`${relPath}: Prohibited 'getAdminDb' import`);
          }
        }
        if (content.includes('.collection(') || content.includes('.runTransaction(')) {
          boundaryViolations.push(`${relPath}: Direct Firestore SDK method invocation prohibited`);
        }
      }

      // Prohibit routes from importing repositories
      if (relPath.startsWith('server/routes/')) {
        if (content.includes('../repositories/')) {
          boundaryViolations.push(`${relPath}: Routes must NOT import from repositories`);
        }
      }

      // Prohibit services from importing concrete firestore repository implementations
      if (relPath.startsWith('server/services/')) {
        if (content.includes('../repositories/firestore/')) {
          boundaryViolations.push(`${relPath}: Services must NOT import concrete Firestore repository implementations`);
        }
      }
    }

    expect(boundaryViolations).toEqual([]);
  });
});
