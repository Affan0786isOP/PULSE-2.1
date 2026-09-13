const fs = require('fs');

function patch(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(
        "totalTrials: totalT,",
        "totalTrials: totalT !== undefined ? Number(totalT) : undefined,"
    );

    fs.writeFileSync(filePath, content);
}

patch('src/lib/trialStore.ts');
patch('mobile/src/lib/trialStore.ts');
