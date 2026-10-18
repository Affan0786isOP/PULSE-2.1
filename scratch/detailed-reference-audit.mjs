import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'audit', '.gemini'].includes(file)) {
        results = results.concat(walk(fullPath));
      }
    } else if (/\.(tsx|ts|json|html|css|md)$/.test(file)) {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = walk('.');
const candidateTargets = [
  { path: 'src/components/AnimatedBackground.tsx', identifier: 'AnimatedBackground' },
  { path: 'mobile/src/components/AnimatedBackground.tsx', identifier: 'AnimatedBackground' },
  { path: 'src/components/Dataset.tsx', identifier: 'Dataset' },
  { path: 'mobile/src/components/Dataset.tsx', identifier: 'Dataset' },
  { path: 'src/components/dataset/DatasetHeader.tsx', identifier: 'DatasetHeader' },
  { path: 'src/components/dataset/DatasetFilterBar.tsx', identifier: 'DatasetFilterBar' },
  { path: 'src/components/dataset/DatasetContentSlot.tsx', identifier: 'DatasetContentSlot' },
  { path: 'src/lib/dataset/index.ts', identifier: 'useDatasetPipeline' },
  { path: 'src/lib/dataset/normalization.ts', identifier: 'normalizeProtocolType' },
  { path: 'src/lib/dataset/types.ts', identifier: 'DatasetSession' },
  { path: 'src/lib/dataset/useDatasetPipeline.ts', identifier: 'useDatasetPipeline' },
  { path: 'src/components/brand/StimulusReticle.tsx', identifier: 'StimulusReticle' },
  { path: 'src/lib/fullscreen.ts', identifier: 'requestFullscreen' },
  { path: 'mobile/src/lib/fullscreen.ts', identifier: 'requestFullscreen' }
];

console.log('=== EXACT IMPORT & CODE REFERENCE AUDIT ===\n');

candidateTargets.forEach(target => {
  const normTarget = path.normalize(target.path);
  const importRefs = [];
  const symbolRefs = [];

  allFiles.forEach(file => {
    const normFile = path.normalize(file);
    if (normFile === normTarget) return;
    if (normFile.startsWith('docs\\superpowers\\plans')) return;
    if (normFile.startsWith('scratch\\')) return;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    // 1. Direct path imports
    const fileBase = path.basename(target.path, path.extname(target.path));
    const importRegex = new RegExp(`from\\s+['"][^'"]*${fileBase}['"]|import\\s*\\(['"][^'"]*${fileBase}['"]\\)`);
    
    // 2. Exact word boundary symbol matches
    const symbolRegex = new RegExp(`\\b${target.identifier}\\b`);

    lines.forEach((line, idx) => {
      if (importRegex.test(line)) {
        importRefs.push({ file: normFile, line: idx + 1, text: line.trim() });
      }
      if (symbolRegex.test(line) && !importRegex.test(line)) {
        symbolRefs.push({ file: normFile, line: idx + 1, text: line.trim() });
      }
    });
  });

  console.log(`Target: ${target.path}`);
  console.log(`  Imports found (${importRefs.length}):`);
  importRefs.forEach(r => console.log(`     [${r.file}:${r.line}] ${r.text}`));
  console.log(`  Symbol '${target.identifier}' found (${symbolRefs.length}):`);
  symbolRefs.slice(0, 5).forEach(r => console.log(`     [${r.file}:${r.line}] ${r.text}`));
  if (symbolRefs.length > 5) console.log(`     ... and ${symbolRefs.length - 5} more`);
  console.log('--------------------------------------------------\n');
});
