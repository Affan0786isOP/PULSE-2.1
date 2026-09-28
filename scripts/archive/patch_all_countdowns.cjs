const fs = require('fs');

const overlayCode = `            {engineState === 'STARTING' && statusMessage.match(/Starting in (\\d)/) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-[inherit] z-50 overflow-hidden pointer-events-none">
                <div key={statusMessage} className="animate-[ping_1s_ease-in-out_infinite] absolute w-64 h-64 bg-[var(--cyan-primary)]/20 rounded-full blur-3xl"></div>
                <div key={"text-"+statusMessage} className="animate-[pulse_1s_ease-in-out_infinite] flex flex-col items-center justify-center z-10">
                  <div className="text-[120px] sm:text-[150px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-[var(--cyan-primary)] to-blue-600 drop-shadow-[0_0_40px_rgba(0,240,255,0.6)]">
                    {statusMessage.match(/Starting in (\\d)/)?.[1]}
                  </div>
                  <div className="text-[var(--cyan-primary)] font-mono tracking-[8px] uppercase text-xl mt-2 font-bold drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                    GET READY
                  </div>
                </div>
              </div>
            )}
`;

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
  
  // Clean up if we already injected (for ReactionTest)
  const regexClean = /\s*\{engineState === 'STARTING' && statusMessage\.match[^]*GET READY[^]*?<\/div>\s*\}\s*<\/div>\s*\)\}\s*/g;
  code = code.replace(regexClean, '\n');

  // Regex to find className={apparatusClass} ... > 
  // It's the first occurrence of className={apparatusClass} that has a closing bracket
  // Note: some have multiline props.
  // Actually, we know exactly where they are. Let's find the specific block.
  
  const injectRegex = /(className=\{apparatusClass\}[^>]*>)/;
  code = code.replace(injectRegex, "$1\n" + overlayCode);

  fs.writeFileSync(file, code);
}
