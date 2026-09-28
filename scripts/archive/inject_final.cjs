const fs = require('fs');

const overlayCode = `
            {engineState === 'STARTING' && statusMessage.match(/Starting in (\\d)/) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md rounded-[inherit] z-[100] overflow-hidden pointer-events-none">
                <div className="animate-pulse absolute w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"></div>
                <div key={statusMessage} className="animate-pulse flex flex-col items-center justify-center z-10 scale-110">
                  <div className="text-[140px] sm:text-[180px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-[0_0_60px_rgba(245,158,11,0.8)]">
                    {statusMessage.match(/Starting in (\\d)/)?.[1]}
                  </div>
                  <div className="text-amber-400 font-mono tracking-[10px] uppercase text-2xl mt-4 font-bold drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                    GET READY
                  </div>
                </div>
              </div>
            )}`;

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

const regex = /(className=\{apparatusClass\}[\s\S]*?\}\s*>)/;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, 'utf8');

  if (code.includes('GET READY')) {
    console.log(`Skipping ${file} - already injected`);
    continue;
  }

  code = code.replace(regex, `$1${overlayCode}`);
  fs.writeFileSync(file, code);
}
