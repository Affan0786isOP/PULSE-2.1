const fs = require('fs');

function patch(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(
        "experimentId: data.experimentId || `exp-${Date.now()}`,",
        "experimentId: (data.experimentId as string) || `exp-${Date.now()}`,"
    );

    content = content.replace(
        "condition: data.condition || 'standard',",
        "condition: (data.condition as string) || 'standard',"
    );

    content = content.replace(
        "test: data.test,",
        "test: (data.test as string) || 'visual-reaction',"
    );

    content = content.replace(
        "trialNumber: Math.max(1, Math.round(data.trialNumber || 1)),",
        "trialNumber: Math.max(1, Math.round(Number(data.trialNumber) || 1)),"
    );

    content = content.replace(
        "const docId = d.id;",
        "const docId = String(d.id || '');"
    );

    content = content.replace(
        "if (sessionMap.has(docId)) return;",
        "if (!docId || sessionMap.has(docId)) return;"
    );

    content = content.replace(
        "completedAtMonth: String(d.completedAtMonth || (d.completedAtTimestamp ? new Date(Number(d.completedAtTimestamp)).toISOString().substring(0, 7) : '')),",
        "completedAtMonth: String(d.completedAtMonth || (d.completedAtTimestamp ? new Date(Number(d.completedAtTimestamp) || Date.now()).toISOString().substring(0, 7) : '')),"
    );

    fs.writeFileSync(filePath, content);
}

patch('src/lib/trialStore.ts');
patch('mobile/src/lib/trialStore.ts');
console.log('Fixed trialstore strict');
