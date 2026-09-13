const fs = require('fs');

const files = [
  'src/components/ReactionTest.tsx',
  'src/components/ColorTest.tsx',
  'src/components/DirectionTest.tsx'
];

const regex = /className=\{apparatusClass\}[\s\S]*?\}\s*>/;

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  const match = code.match(regex);
  console.log(`\n--- MATCH in ${file} ---`);
  if (match) {
    console.log(match[0]);
  } else {
    console.log("NO MATCH");
  }
}
