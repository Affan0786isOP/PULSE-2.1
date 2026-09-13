const fs = require('fs');

function fixLeaderboardOptIn(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/idempotencyKey,\s*displayName: trimmed,\s*assessmentType,\s*scoreMetric,\s*idempotencyKey,/g, "displayName: trimmed,\n      assessmentType,\n      scoreMetric,\n      idempotencyKey,");
    fs.writeFileSync(file, content);
}

fixLeaderboardOptIn('src/components/LeaderboardOptIn.tsx');
fixLeaderboardOptIn('mobile/src/components/LeaderboardOptIn.tsx');

function fixTrialStore(file) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes("import { doc, collection, getDocsFromServer, query, where,")) {
        content = content.replace(
            "import { doc, collection, getDocsFromServer, query, orderBy, limit as firestoreLimit, writeBatch, startAfter } from 'firebase/firestore';",
            "import { doc, collection, getDocsFromServer, query, where, orderBy, limit as firestoreLimit, writeBatch, startAfter } from 'firebase/firestore';"
        );
        content = content.replace(
            "import { doc, collection, writeBatch, query, getDocsFromServer, orderBy, limit as firestoreLimit, startAfter } from 'firebase/firestore';",
            "import { doc, collection, writeBatch, query, getDocsFromServer, where, orderBy, limit as firestoreLimit, startAfter } from 'firebase/firestore';"
        );
        content = content.replace(
            "import { collection, query, getDocsFromServer, orderBy, limit as firestoreLimit, writeBatch, doc, startAfter } from 'firebase/firestore';",
            "import { collection, query, getDocsFromServer, where, orderBy, limit as firestoreLimit, writeBatch, doc, startAfter } from 'firebase/firestore';"
        );
        content = content.replace(
            "import { doc, collection, query, getDocsFromServer, orderBy, limit as firestoreLimit, writeBatch, startAfter } from 'firebase/firestore';",
            "import { doc, collection, query, where, getDocsFromServer, orderBy, limit as firestoreLimit, writeBatch, startAfter } from 'firebase/firestore';"
        );
        // just blindly add it if not already imported
        if (!content.includes('where,')) {
             content = content.replace(
                 "import { doc, collection,",
                 "import { doc, collection, where,"
             );
        }
    }
    fs.writeFileSync(file, content);
}

fixTrialStore('src/lib/trialStore.ts');
fixTrialStore('mobile/src/lib/trialStore.ts');
