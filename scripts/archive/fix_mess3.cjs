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

  // We can see that the string to remove is literally the one with "Starting in (\d)"
  
  let changed = true;
  while(changed) {
    const startIndex = code.indexOf(`            {engineState === 'STARTING' && statusMessage.match(/Starting in (\\d)/) && (`);
    if (startIndex === -1) {
      changed = false;
      break;
    }
    const endStr = `            )}`;
    const endIndex = code.indexOf(endStr, startIndex);
    if (endIndex !== -1) {
      code = code.substring(0, startIndex) + code.substring(endIndex + endStr.length);
    } else {
      changed = false;
    }
  }

  // we also need to fix `) { e.preventDefault(); executeTrigger(e.nativeEvent); }>`
  // to be `) => { e.preventDefault(); executeTrigger(e.nativeEvent); }>`
  // because the `=>` was split!
  // wait, the split string was `<div className={apparatusClass} onPointerDown={(e) =>`
  // so the arrow is already there!
  // it looks like:
  // `<div className={apparatusClass} onPointerDown={(e) =>`
  // `<injection>`
  // ` { e.preventDefault(); executeTrigger(e.nativeEvent); }}>`
  // So when we remove the injection, we get `<div className={apparatusClass} onPointerDown={(e) => { e.preventDefault(); ...`
  // But let's check what ReactionTest actually looks like:
  // `<div className={apparatusClass} onPointerDown={(e) =>            {engineState === 'STARTING'... `
  // Yes! If we just remove the injection, the spaces will remain, but the syntax will be valid again!

  fs.writeFileSync(file, code);
}
