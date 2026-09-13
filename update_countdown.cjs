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

const renderHelper = `
  const renderStatusMessage = () => {
    const isConnecting = typeof isSessionLoading !== 'undefined' && isSessionLoading;
    if (isConnecting) return 'Connecting...';
    const match = statusMessage.match(/Starting in (\\d)/);
    if (match && engineState === 'STARTING') {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-[inherit] z-[100] overflow-hidden pointer-events-none">
          <div key={statusMessage} className="animate-[ping_1s_ease-in-out_infinite] absolute w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"></div>
          <div key={"text-"+statusMessage} className="animate-[zoomIn_0.3s_ease-out_forwards] flex flex-col items-center justify-center z-10">
            <div className="text-[120px] sm:text-[150px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-[0_0_40px_rgba(245,158,11,0.6)] scale-110">
              {match[1]}
            </div>
            <div className="text-amber-400 font-mono tracking-[8px] uppercase text-xl mt-2 font-bold drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              GET READY
            </div>
          </div>
        </div>
      );
    }
    return statusMessage;
  };
`;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, 'utf8');

  if (code.includes('renderStatusMessage')) continue;

  const returnIndex = code.lastIndexOf('  return (');
  if (returnIndex !== -1) {
    code = code.substring(0, returnIndex) + renderHelper + code.substring(returnIndex);
    
    // Replace `{statusMessage}`
    code = code.replace(/>\{statusMessage\}</g, '>{renderStatusMessage()}<');
    
    // Replace `{isSessionLoading ? 'Connecting...' : statusMessage}`
    code = code.replace(/>\{isSessionLoading \? 'Connecting\.\.\.' : statusMessage\}</g, '>{renderStatusMessage()}<');
    
    // Some formats have newline padding around statusMessage
    code = code.replace(/\{\s*statusMessage\s*\}/g, '{renderStatusMessage()}');
    
    fs.writeFileSync(file, code);
  }
}
