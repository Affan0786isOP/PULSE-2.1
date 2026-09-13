const fs = require('fs');

let content = fs.readFileSync('src/lib/trialStore.ts', 'utf8');

// Update fetchCloudTrialObservations
content = content.replace(
  "const q = query(colRef, orderBy('timestamp', 'desc'), firestoreLimit(limitCount));",
  "const uid = auth?.currentUser?.uid;\n    if (!uid) throw new Error('Authentication required');\n    const q = query(colRef, where('participantId', '==', uid), orderBy('timestamp', 'desc'), firestoreLimit(limitCount));"
);

if (!content.includes("where('participantId'")) {
    content = content.replace(
      "import { doc, collection, getDocsFromServer, query, orderBy, limit as firestoreLimit, writeBatch, startAfter } from 'firebase/firestore';",
      "import { doc, collection, getDocsFromServer, query, where, orderBy, limit as firestoreLimit, writeBatch, startAfter } from 'firebase/firestore';"
    );
}

// Update fetchAllCloudTrialObservations
content = content.replace(
  "const constraints: any[] = [orderBy('timestamp', 'desc'), firestoreLimit(pageSize)];",
  "const uid = auth?.currentUser?.uid;\n      if (!uid) throw new Error('Authentication required');\n      const constraints: any[] = [where('participantId', '==', uid), orderBy('timestamp', 'desc'), firestoreLimit(pageSize)];"
);

fs.writeFileSync('src/lib/trialStore.ts', content);

let contentMobile = fs.readFileSync('mobile/src/lib/trialStore.ts', 'utf8');

contentMobile = contentMobile.replace(
  "const q = query(colRef, orderBy('timestamp', 'desc'), firestoreLimit(limitCount));",
  "const uid = auth?.currentUser?.uid;\n    if (!uid) throw new Error('Authentication required');\n    const q = query(colRef, where('participantId', '==', uid), orderBy('timestamp', 'desc'), firestoreLimit(limitCount));"
);

if (!contentMobile.includes("where('participantId'")) {
    contentMobile = contentMobile.replace(
      "import { doc, collection, getDocsFromServer, query, orderBy, limit as firestoreLimit, writeBatch, startAfter } from 'firebase/firestore';",
      "import { doc, collection, getDocsFromServer, query, where, orderBy, limit as firestoreLimit, writeBatch, startAfter } from 'firebase/firestore';"
    );
}

contentMobile = contentMobile.replace(
  "const constraints: any[] = [orderBy('timestamp', 'desc'), firestoreLimit(pageSize)];",
  "const uid = auth?.currentUser?.uid;\n      if (!uid) throw new Error('Authentication required');\n      const constraints: any[] = [where('participantId', '==', uid), orderBy('timestamp', 'desc'), firestoreLimit(pageSize)];"
);

fs.writeFileSync('mobile/src/lib/trialStore.ts', contentMobile);
