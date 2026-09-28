const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : process.cwd();`;

const replacement = `    let currentDir = process.cwd();
    try { if (typeof __dirname !== 'undefined') currentDir = __dirname; } catch (e) {}
    const distPath = fs.existsSync(path.join(currentDir, 'index.html'))
      ? currentDir
      : fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : process.cwd();`;

code = code.replace(target, replacement);

fs.writeFileSync('server.ts', code);
