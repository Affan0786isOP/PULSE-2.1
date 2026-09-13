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

  // Remove the definition
  const defRegex = /\s*const renderStatusMessage = \(\) => \{[\s\S]*?return statusMessage;\s*\};\s*/g;
  code = code.replace(defRegex, '\n');

  // Revert calls
  code = code.replace(/\{renderStatusMessage\(\)\}/g, '{statusMessage}');
  code = code.replace(/>\{statusMessage\}</g, '>{statusMessage}<'); // no-op

  fs.writeFileSync(file, code);
}
