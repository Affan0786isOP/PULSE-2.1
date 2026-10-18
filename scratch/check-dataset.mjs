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

const allCodeFiles = walk('src').concat(walk('tests'));
console.log('=== Checking exact imports of Dataset ===');
allCodeFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.match(/from\s+['"][^'"]*components\/Dataset['"]/)) {
    console.log(f);
  }
});
