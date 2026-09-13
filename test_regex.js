const fs = require('fs');

const file = 'src/components/ReactionTest.tsx';
let code = fs.readFileSync(file, 'utf8');

// Insert the regex logic at the top of the component render, near the end of hooks
// Wait, we can just insert it before the return statement of the component.
const returnIndex = code.lastIndexOf('return (');
if (returnIndex !== -1) {
  const overlayCode = `
  const countdownMatch = statusMessage.match(/Starting in (\\d)/);
  const renderCountdownOverlay = () => {
    if (!countdownMatch) return null;
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-[inherit] z-50 overflow-hidden">
        <div key={countdownMatch[1]} className="animate-[ping_1s_ease-in-out_infinite] absolute w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"></div>
        <div key={"text-"+countdownMatch[1]} className="animate-[zoomIn_0.3s_ease-out_forwards] flex flex-col items-center justify-center z-10 scale-50 opacity-0">
          <div className="text-[150px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-[0_0_50px_rgba(245,158,11,0.8)]">
            {countdownMatch[1]}
          </div>
          <div className="text-amber-400 font-mono tracking-[8px] uppercase text-xl mt-2 font-bold drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
            GET READY
          </div>
        </div>
      </div>
    );
  };
`;
  
  // also add zoomIn animation to global css? we can use tailwind arbitrary values instead or just add it to styles
}
