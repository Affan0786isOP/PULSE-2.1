const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

// We need to change the rule to just allow read so we don't need the strict `.where('hidden', '==', false)` in the query, since existing data doesn't have it.
code = code.replace(/allow read: if resource\.data\.get\('hidden', false\) == false \|\|/g, 'allow read: if true ||');
code = code.replace(/allow read: if resource\.data\.hidden == false/g, 'allow read: if true');

fs.writeFileSync('firestore.rules', code);
