const fs = require('fs');

function patch(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add source to LeaderboardEntry
    content = content.replace(
        "createdAt?: any;",
        "createdAt?: any;\n  source?: 'local' | 'cloud';"
    );
    
    // Update localEntry to include source: 'local'
    content = content.replace(
        "createdAt: new Date().toISOString()",
        "createdAt: new Date().toISOString(),\n    source: 'local'"
    );
    
    // Update cloudResults to include source: 'cloud'
    content = content.replace(
        "createdAt: data.createdAt",
        "createdAt: data.createdAt,\n            source: 'cloud'"
    );
    
    fs.writeFileSync(file, content);
}

patch('src/lib/firestore.ts');
patch('mobile/src/lib/firestore.ts');
