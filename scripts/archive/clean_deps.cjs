const fs = require('fs');

function cleanPackage(path) {
    if (!fs.existsSync(path)) return;
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    let modified = false;
    
    if (pkg.dependencies && pkg.dependencies['@google/genai']) {
        delete pkg.dependencies['@google/genai'];
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`Cleaned ${path}`);
    }
}

cleanPackage('package.json');
cleanPackage('mobile/package.json');
