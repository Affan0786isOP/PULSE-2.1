const fs = require('fs');

function patch(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace Date conversions
    content = content.replace(
        "const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;\n        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;",
        `const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val === 'string' || typeof val === 'number') return new Date(val).getTime();
          if (typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') return val.toDate().getTime();
          if (typeof val === 'object' && 'seconds' in val && typeof val.seconds === 'number') return val.seconds * 1000;
          return 0;
        };
        const tA = getTime(a.createdAt);
        const tB = getTime(b.createdAt);`
    );

    content = content.replace(
        "{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString(undefined, {",
        `{entry.createdAt ? new Date(typeof entry.createdAt === 'object' && 'toDate' in (entry.createdAt as any) ? (entry.createdAt as any).toDate() : entry.createdAt as any).toLocaleDateString(undefined, {`
    );

    fs.writeFileSync(filePath, content);
}

patch('src/components/admin/LeaderboardModeration.tsx');
patch('mobile/src/components/admin/LeaderboardModeration.tsx');
