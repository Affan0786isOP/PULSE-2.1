const fs = require('fs');

function patch(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(
        "completedAtTimestamp: d.completedAtTimestamp || 0,",
        "completedAtTimestamp: Number(d.completedAtTimestamp) || 0,"
    );

    content = content.replace(
        "successfulTrials: succTrials,",
        "successfulTrials: succTrials !== undefined ? Number(succTrials) : undefined,"
    );

    content = content.replace(
        "falseStarts: fStarts,",
        "falseStarts: fStarts !== undefined ? Number(fStarts) : undefined,"
    );

    content = content.replace(
        "overallAccuracy: acc,",
        "overallAccuracy: acc !== undefined ? Number(acc) : undefined,"
    );

    content = content.replace(
        "deviceCategory: d.deviceCategory || d.device || ''",
        "deviceCategory: String(d.deviceCategory || d.device || '')"
    );

    fs.writeFileSync(filePath, content);
}

patch('src/lib/trialStore.ts');
patch('mobile/src/lib/trialStore.ts');
console.log('Fixed trialstore numbers');
