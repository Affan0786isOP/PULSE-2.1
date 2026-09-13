const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

// There is still where('hidden', '==', false) at line 590! The previous replace failed because of indentation or different spacing.
code = code.replace(/where\('hidden', '==', false\),\n\s*/g, '');

fs.writeFileSync('src/lib/firestore.ts', code);
