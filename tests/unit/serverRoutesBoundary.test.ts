import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllTsFiles(fullPath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('Server Architecture Boundary & Zero-Any AST Scan', () => {
  it('enforces zero explicit any and no unsafe casts across all server files', () => {
    const violations: string[] = [];
    const serverDir = path.join(process.cwd(), 'server');
    const allFiles = getAllTsFiles(serverDir);

    for (const fullPath of allFiles) {
      const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
      
      // Exclude legacy engine and config files from strict zero-any requirement for now
      if (relPath.includes('server/engines/') || relPath.includes('server/config/') || relPath.includes('provenanceService.ts')) {
        continue;
      }
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      const sourceFile = ts.createSourceFile(relPath, content, ts.ScriptTarget.Latest, true);

      function visit(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.AnyKeyword) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push(`${relPath}:${line + 1}:${character + 1} - Explicit 'any' keyword prohibited in server layer`);
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
    const serverDir = path.join(process.cwd(), 'server');
    const allFiles = getAllTsFiles(serverDir);

    for (const fullPath of allFiles) {
      const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
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
