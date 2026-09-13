const fs = require('fs');

function patch(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(
        "valid: data.valid !== undefined ? Boolean(data.valid) : (!data.falseStart && !data.timedOut && (Number(data.reactionTime) >= 80 || data.test.includes('memory'))),",
        "valid: data.valid !== undefined ? Boolean(data.valid) : (!data.falseStart && !data.timedOut && (Number(data.reactionTime) >= 80 || String(data.test || '').includes('memory'))),"
    );

    content = content.replace(
        "ageGroup: data.ageGroup,",
        "ageGroup: typeof data.ageGroup === 'string' ? data.ageGroup : undefined,"
    );

    content = content.replace(
        "notes: data.notes",
        "notes: typeof data.notes === 'string' ? data.notes : undefined"
    );

    content = content.replace(
        "const expId = t.experimentId || t.sessionId || t.id;",
        "const expId = String(t.experimentId || (t as any).sessionId || t.id || '');"
    );

    content = content.replace(
        "participantId: d.participantId || '',",
        "participantId: String(d.participantId || ''),"
    );

    content = content.replace(
        "assessmentType: d.assessmentType || 'visual-reaction',",
        "assessmentType: (d.assessmentType as any) || 'visual-reaction',"
    );

    content = content.replace(
        "ageGroup: d.ageGroup || 'Unspecified',",
        "ageGroup: String(d.ageGroup || 'Unspecified'),"
    );

    content = content.replace(
        "completedAtMonth: d.completedAtMonth || (d.completedAtTimestamp ? new Date(d.completedAtTimestamp).toISOString().substring(0, 7) : ''),",
        "completedAtMonth: String(d.completedAtMonth || (d.completedAtTimestamp ? new Date(Number(d.completedAtTimestamp)).toISOString().substring(0, 7) : '')),"
    );

    fs.writeFileSync(filePath, content);
}

patch('src/lib/trialStore.ts');
patch('mobile/src/lib/trialStore.ts');
console.log('Patched trialStore ts');
