const fs = require('fs');

function patch(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('ResearchPrivacyPolicy')) {
        content = content.replace(
            "import { NotFound } from './components/NotFound';",
            "import { NotFound } from './components/NotFound';\nimport { ResearchPrivacyPolicy } from './components/ResearchPrivacyPolicy';"
        );
    }
    
    if (!content.includes('path="/privacy"')) {
        content = content.replace(
            "<Route path=\"/analytics\" element={<Analytics onNavigate={navigate} />} />",
            "<Route path=\"/analytics\" element={<Analytics onNavigate={navigate} />} />\n            <Route path=\"/privacy\" element={<ResearchPrivacyPolicy onNavigate={navigate} />} />"
        );
    }
    
    fs.writeFileSync(file, content);
}

patch('src/App.tsx');
patch('mobile/src/App.tsx');
