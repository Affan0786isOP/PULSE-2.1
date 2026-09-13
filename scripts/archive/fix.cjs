const fs = require('fs');
function fix(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Completely remove all computeMedian declarations
    content = content.replace(/function computeMedian\(arr: number\[\]\): number \{[\s\S]*?\}/g, '');
    
    // Add it exactly once after imports
    const target = "import React, { useEffect, useState, useMemo } from 'react';";
    const insertion = `
function computeMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}
`;
    content = content.replace(target, target + insertion);
    fs.writeFileSync(file, content);
}
fix('src/components/Dataset.tsx');
fix('mobile/src/components/Dataset.tsx');
