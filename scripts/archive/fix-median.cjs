const fs = require('fs');

function processFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Insert computeMedian at the top, after imports
  if (!content.includes('function computeMedian')) {
    content = content.replace(
      /(import .*?;?\n)+/s,
      match => match + `\nfunction computeMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}\n\n`
    );
  }

  content = content.replace(/publicRTs\[Math\.floor\(publicRTs\.length \/ 2\)\]/g, 'computeMedian(publicRTs)');
  content = content.replace(/validRTs\[Math\.floor\(validRTs\.length \/ 2\)\]/g, 'computeMedian(validRTs)');
  content = content.replace(/allRTs\[Math\.floor\(allRTs\.length \/ 2\)\]/g, 'computeMedian(allRTs)');
  content = content.replace(/desktopRTs\[Math\.floor\(desktopRTs\.length \/ 2\)\]/g, 'computeMedian(desktopRTs)');
  content = content.replace(/mobileRTs\[Math\.floor\(mobileRTs\.length \/ 2\)\]/g, 'computeMedian(mobileRTs)');
  content = content.replace(/rts\[Math\.floor\(rts\.length \/ 2\)\]/g, 'computeMedian(rts)');

  fs.writeFileSync(path, content, 'utf8');
}

processFile('src/components/Dataset.tsx');
processFile('mobile/src/components/Dataset.tsx');
