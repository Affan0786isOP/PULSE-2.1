const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = "if (!process.env.VERCEL) {";
const idx = code.lastIndexOf(target);
if (idx > -1) {
  code = code.substring(0, idx) + `  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(\`Server running on port \$\{PORT\} (NODE_ENV: \$\{process.env.NODE_ENV || 'development'})\`);
    });
  }
}

startServer();
export default app;
`;
  fs.writeFileSync('server.ts', code);
}
