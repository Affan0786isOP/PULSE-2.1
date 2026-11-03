import "dotenv/config";
import { getApps } from "firebase-admin/app";
import { FieldPath } from "firebase-admin/firestore";
import { getAdminDb } from "./server/config/firebaseAdmin.ts";

async function main() {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin initialization failed.");

  const projectId = getApps()[0]?.options.projectId ?? "unknown";
  const databaseId =
    process.env.FIREBASE_DATABASE_ID ||
    process.env.VITE_FIREBASE_DATABASE_ID ||
    "(default)";

  const [publicSnap, resultsSnap] = await Promise.all([
    db.collection("publicDataset").select(FieldPath.documentId()).get(),
    db.collection("assessmentResults").select(FieldPath.documentId()).get()
  ]);

  const publicIds = new Set(publicSnap.docs.map(doc => doc.id));
  const resultIds = new Set(resultsSnap.docs.map(doc => doc.id));

  let overlap = 0;
  for (const id of publicIds) {
    if (resultIds.has(id)) overlap++;
  }

  console.log(JSON.stringify({
    projectId,
    databaseId,
    publicDataset: publicIds.size,
    assessmentResults: resultIds.size,
    presentInBoth: overlap,
    publicDatasetOnly: publicIds.size - overlap,
    assessmentResultsOnly: resultIds.size - overlap
  }, null, 2));
}

main().catch(error => {
  console.error("Reconciliation failed:", error.message);
  process.exitCode = 1;
});
