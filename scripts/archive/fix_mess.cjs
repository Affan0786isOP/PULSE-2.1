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
  
  // The overlay starts with `            {engineState === 'STARTING' && statusMessage.match(/Starting in (\d)/) && (`
  // and ends with `            )}\n`
  // Because I injected it after `=>`, it might look like `=>\n            {engineState...`
  
  // We can just use a regex to match the exact overlay block and remove it.
  const badInjectionRegex = /\n\s*\{engineState === 'STARTING' && statusMessage\.match\(\/Starting in \(\\\\d\)\/\) && \([\s\S]*?GET READY[\s\S]*?<\/div>\s*<\/div>\s*\)\}/g;
  
  code = code.replace(badInjectionRegex, '');

  fs.writeFileSync(file, code);
}
