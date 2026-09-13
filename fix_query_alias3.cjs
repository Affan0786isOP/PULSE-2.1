const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/} catch \(qErr: any\) {/, '} catch (qErr: any) {\n            return res.status(500).json({ success: false, error: "Primary Query Failed", detail: String(qErr) });');

fs.writeFileSync('server.ts', code);
