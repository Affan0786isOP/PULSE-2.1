const fs = require('fs');

const file = 'src/components/ReactionTest.tsx';
let code = fs.readFileSync(file, 'utf8');

const overlayCode = `
            {engineState === 'STARTING' && statusMessage.match(/Starting in (\\d)/) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-[inherit] z-50 overflow-hidden pointer-events-none">
                <div key={statusMessage} className="animate-[ping_1s_ease-in-out_infinite] absolute w-64 h-64 bg-[var(--cyan-primary)]/20 rounded-full blur-3xl"></div>
                <div key={"text-"+statusMessage} className="animate-[pulse_1s_ease-in-out_infinite] flex flex-col items-center justify-center z-10">
                  <div className="text-[120px] sm:text-[150px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-[var(--cyan-primary)] to-blue-600 drop-shadow-[0_0_40px_rgba(0,240,255,0.6)]">
                    {statusMessage.match(/Starting in (\\d)/)[1]}
                  </div>
                  <div className="text-[var(--cyan-primary)] font-mono tracking-[8px] uppercase text-xl mt-2 font-bold drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                    GET READY
                  </div>
                </div>
              </div>
            )}`;

// We need to inject this right inside the apparatusClass div.
// In ReactionTest: `<div className={apparatusClass} onPointerDown={(e) => { e.preventDefault(); executeTrigger(e.nativeEvent); }}>`
// Let's use a regex that matches `<div[^>]*className=\{apparatusClass\}[^>]*>` or similar.
// Since we know the exact line for some, we can do:

code = code.replace(/(className=\{apparatusClass\}[^>]*>)/g, "$1" + overlayCode);

fs.writeFileSync(file, code);
