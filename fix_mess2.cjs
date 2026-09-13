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

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, 'utf8');

  // Remove the entire overlay block, no matter how many times it appears or where
  const overlayRegex = /\s*\{engineState === 'STARTING' && statusMessage\.match\(\/Starting in \(\\\\d\)\/\).*?GET READY.*?<\/div>\s*<\/div>\s*\)\}/gs;
  code = code.replace(overlayRegex, '');

  fs.writeFileSync(file, code);
}
