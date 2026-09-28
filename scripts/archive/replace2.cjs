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

  // Insert import if not exists
  if (!code.includes('CountdownOverlay')) {
    const lastImportIndex = code.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = code.indexOf('\n', lastImportIndex);
      // For mobile components, path is ../../components/CountdownOverlay 
      // or since CountdownOverlay is now copied to mobile/src/components/CountdownOverlay.tsx, we can just use './CountdownOverlay'
      // Wait, is the mobile file in `mobile/src/components/`? Yes.
      const importPath = './CountdownOverlay';
      code = code.substring(0, endOfLastImport) + `\nimport { CountdownOverlay } from '${importPath}';` + code.substring(endOfLastImport);
    }
  }

  // Use string methods to replace
  const startStr = `{engineState === 'STARTING' && statusMessage.match(/Starting in (\\d)/) && (`;
  let startIndex = code.indexOf(startStr);
  
  if (startIndex !== -1) {
    // find end
    const endStr = `</div>\n              </div>\n            )}`;
    const endStr2 = `</div>              </div>            )}`;
    
    // Let's just find the first `)}` after the startStr
    let currentIndex = startIndex + startStr.length;
    let openDivs = 0;
    let foundEnd = false;
    let endIndex = startIndex;

    // simple search for `GET READY` to ensure we are replacing the right thing
    const getReadyIndex = code.indexOf('GET READY', startIndex);
    if (getReadyIndex !== -1 && getReadyIndex - startIndex < 1500) {
       // Just find the `)}` that closes the block.
       const closeIndex = code.indexOf(')}', getReadyIndex);
       if (closeIndex !== -1) {
           code = code.substring(0, startIndex) + `{engineState === 'STARTING' && statusMessage.match(/Starting in (\\d)/) && (
              <CountdownOverlay count={parseInt(statusMessage.match(/Starting in (\\d)/)?.[1] || '3', 10)} />
            )}` + code.substring(closeIndex + 2);
       }
    }
  }

  fs.writeFileSync(file, code);
}
