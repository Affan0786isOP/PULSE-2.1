const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');
console.log(code.substring(0, 1000));
