const fs = require('fs');

const files = [
  'src/components/ReactionTest.tsx',
  'src/components/ColorTest.tsx',
  'src/components/BlockMemoryTest.tsx',
  'src/components/NumberMemoryTest.tsx',
  'src/components/DirectionTest.tsx',
  'mobile/src/components/ReactionTest.tsx',
  'mobile/src/components/ColorTest.tsx',
  'mobile/src/components/BlockMemoryTest.tsx',
  'mobile/src/components/NumberMemoryTest.tsx',
  'mobile/src/components/DirectionTest.tsx',
];

// We need to match the previous overlay code exactly
const oldOverlayRegex = /\{engineState === 'STARTING' && statusMessage\.match\(\/Starting in \(\\\\\d\)\/\) && \([\s\S]*?GET READY[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, 'utf8');

  // Insert import if not exists
  if (!code.includes('CountdownOverlay')) {
    // Add after the last import statement
    const lastImportIndex = code.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = code.indexOf('\n', lastImportIndex);
      code = code.substring(0, endOfLastImport) + "\nimport { CountdownOverlay } from './CountdownOverlay';" + code.substring(endOfLastImport);
    }
  }

  // Replace old overlay with the new one
  const match = code.match(oldOverlayRegex);
  if (match) {
    code = code.replace(oldOverlayRegex, `{engineState === 'STARTING' && statusMessage.match(/Starting in (\\d)/) && (
              <CountdownOverlay count={parseInt(statusMessage.match(/Starting in (\\d)/)?.[1] || '3', 10)} />
            )}`);
  }

  fs.writeFileSync(file, code);
}
