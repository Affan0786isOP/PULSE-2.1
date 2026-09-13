const fs = require('fs');

function patchApp(filePath, isMobile = false) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace static imports with React.lazy
    const importsToLazy = [
        { name: 'Dataset', path: './components/Dataset' },
        { name: 'Analytics', path: './components/Analytics' },
        { name: 'Improve', path: './components/Improve' },
        { name: 'ResearchPrivacyPolicy', path: './components/ResearchPrivacyPolicy' },
        { name: 'AdminLogin', path: './components/admin/AdminLogin' },
        { name: 'AdminRoute', path: './components/admin/AdminRoute' },
        { name: 'AdminLayout', path: './components/admin/AdminLayout' }
    ];

    let lazyDeclarations = [];

    importsToLazy.forEach(({ name, path }) => {
        const importRegex = new RegExp(`import\\s+\\{\\s*${name}\\s*\\}\\s+from\\s+['"]${path.replace('/', '\\/')}['"];`, 'g');
        if (content.match(importRegex)) {
            content = content.replace(importRegex, '');
            if (name === 'AdminRoute') {
                lazyDeclarations.push(`const ${name} = React.lazy(() => import('${path}').then(m => ({ default: m.${name} })));`);
            } else if (name === 'AdminLayout') {
                lazyDeclarations.push(`const ${name} = React.lazy(() => import('${path}').then(m => ({ default: m.${name} })));`);
            } else if (name === 'AdminLogin') {
                lazyDeclarations.push(`const ${name} = React.lazy(() => import('${path}').then(m => ({ default: m.${name} })));`);
            } else if (name === 'Dataset') {
                lazyDeclarations.push(`const ${name} = React.lazy(() => import('${path}').then(m => ({ default: m.${name} })));`);
            } else if (name === 'Analytics') {
                lazyDeclarations.push(`const ${name} = React.lazy(() => import('${path}').then(m => ({ default: m.${name} })));`);
            } else if (name === 'Improve') {
                lazyDeclarations.push(`const ${name} = React.lazy(() => import('${path}').then(m => ({ default: m.${name} })));`);
            } else if (name === 'ResearchPrivacyPolicy') {
                lazyDeclarations.push(`const ${name} = React.lazy(() => import('${path}').then(m => ({ default: m.${name} })));`);
            }
        }
    });

    if (lazyDeclarations.length > 0) {
        const lazyBlock = `\n// Code-split heavy routes & admin module\n` + lazyDeclarations.join('\n') + `\n\nconst RouteFallback = () => (\n  <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans">\n    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mb-3" />\n    <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest">Loading Module...</div>\n  </div>\n);\n`;
        content = content.replace("function App()", lazyBlock + "\nfunction App()");
    }

    // Wrap Routes or inner components with Suspense
    if (!content.includes('<React.Suspense') && !content.includes('<Suspense')) {
        content = content.replace(
            '<Routes location={location}>',
            '<React.Suspense fallback={<RouteFallback />}>\n              <Routes location={location}>'
        );
        content = content.replace(
            '</Routes>',
            '</Routes>\n              </React.Suspense>'
        );
    }

    fs.writeFileSync(filePath, content);
    console.log(`Successfully patched lazy loading in ${filePath}`);
}

patchApp('src/App.tsx');
patchApp('mobile/src/App.tsx', true);
