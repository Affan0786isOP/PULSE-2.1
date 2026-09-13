const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/import fs from 'fs';/g, "import * as fs from 'fs';");
code = code.replace(/import crypto from 'crypto';/g, "import * as crypto from 'crypto';");
code = code.replace(/import path from 'path';/g, "import * as path from 'path';");

fs.writeFileSync('server.ts', code);
