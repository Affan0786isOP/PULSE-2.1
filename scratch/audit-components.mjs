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

const componentFiles = walk('src/components');
const allCodeFiles = walk('src').concat(walk('tests'));

console.log('=== AUDIT OF SRC/COMPONENTS ===');
componentFiles.forEach(comp => {
  const baseName = path.basename(comp, path.extname(comp));
  if (baseName === 'index') return;

  let usages = [];
  allCodeFiles.forEach(f => {
    if (path.resolve(f) === path.resolve(comp)) return;
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes(baseName)) {
      usages.push(f);
    }
  });
  console.log(`${baseName} (${comp}): ${usages.length} references`);
  if (usages.length === 0) {
    console.log(`   --> [DEAD/UNUSED] NO REFERENCES ANYWHERE!`);
  } else if (usages.length <= 2) {
    console.log(`   references:`, usages);
  }
});
