import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = walk('src').concat(walk('mobile/src'));
const activeEntryPoints = ['src/App.tsx', 'src/main.tsx', 'mobile/src/App.tsx', 'mobile/src/main.tsx'];

function getImports(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  const imports = [];
  const lines = code.split('\n');
  lines.forEach(l => {
    const m = l.match(/from\s+['"]([^'"]+)['"]/) || l.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m) {
      const impPath = m[1];
      if (impPath.startsWith('.')) {
        let resolved = path.resolve(dir, impPath);
        if (fs.existsSync(resolved + '.tsx')) resolved += '.tsx';
        else if (fs.existsSync(resolved + '.ts')) resolved += '.ts';
        else if (fs.existsSync(path.join(resolved, 'index.ts'))) resolved = path.join(resolved, 'index.ts');
        else if (fs.existsSync(path.join(resolved, 'index.tsx'))) resolved = path.join(resolved, 'index.tsx');
        imports.push(resolved);
      }
    }
  });
  return imports;
}

const reachable = new Set();
const queue = activeEntryPoints.map(p => path.resolve(p));
queue.forEach(p => reachable.add(p));

while (queue.length > 0) {
  const current = queue.shift();
  const imps = getImports(current);
  imps.forEach(imp => {
    if (!reachable.has(imp) && fs.existsSync(imp)) {
      reachable.add(imp);
      queue.push(imp);
    }
  });
}

console.log('Total files scanned:', allFiles.length);
console.log('Reachable from App/main:', reachable.size);

const unreachable = allFiles.filter(f => !reachable.has(path.resolve(f)));
console.log('\n=== UNREACHABLE FILES FROM APP ENTRY POINTS ===');
unreachable.forEach(f => console.log('-', f));
