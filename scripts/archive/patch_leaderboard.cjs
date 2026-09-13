const fs = require('fs');

function patchLeaderboard(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the fallback chain in getLeaderboardResults
    const regex = /let snapshot;\s+try\s+\{[\s\S]*?\}\s+catch\s+\(serverErr:\s+any\)\s+\{[\s\S]*?\}\s+if\s+\(snapshot\)/;
    
    const replacement = `let snapshot;
      try {
        const q = isSpeed
          ? query(colRef, where('assessmentType', '==', assessmentType), where('hidden', '==', false), orderBy('scoreMetric', 'asc'), limit(100))
          : query(colRef, where('assessmentType', '==', assessmentType), where('hidden', '==', false), orderBy('scoreMetric', 'desc'), limit(100));
        
        snapshot = await getDocsFromServer(q);
      } catch (serverErr: any) {
        console.warn("Cloud leaderboard unreachable or rejected by rules:", serverErr);
        // Do not attempt broader queries that violate security rules
      }

      if (snapshot)`;
      
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
}

patchLeaderboard('src/lib/firestore.ts');
patchLeaderboard('mobile/src/lib/firestore.ts');
