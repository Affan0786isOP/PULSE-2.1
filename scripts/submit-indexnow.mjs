#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const metadataPath = path.join(rootDir, 'shared', 'seoMetadata.json');
const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

const INDEXNOW_KEY = '425e11679eaa4998a863c5fc45cfbcc1';
const HOST = 'pulse-lab.in';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const indexableUrls = Object.entries(metadata.routes)
  .filter(([_, route]) => route.indexable)
  .map(([pathname]) => pathname === '/' ? `https://${HOST}/` : `https://${HOST}${pathname}`);

const payload = {
  host: HOST,
  key: INDEXNOW_KEY,
  keyLocation: KEY_LOCATION,
  urlList: indexableUrls,
};

console.log(`[IndexNow] Preparing submission for ${indexableUrls.length} canonical URLs on ${HOST}`);
console.log(`[IndexNow] Key Location: ${KEY_LOCATION}`);

const isDryRun = process.argv.includes('--dry-run') || process.env.INDEXNOW_DRY_RUN === 'true';

if (isDryRun) {
  console.log('[IndexNow] Dry-run enabled. Payload:');
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

try {
  console.log('[IndexNow] Submitting to https://api.indexnow.org/indexnow ...');
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    console.log(`[IndexNow] Successfully submitted ${indexableUrls.length} URLs (Status: ${response.status} ${response.statusText})`);
  } else {
    const errorText = await response.text();
    console.warn(`[IndexNow] API returned status ${response.status}: ${errorText}`);
  }
} catch (err) {
  console.warn(`[IndexNow] Network submission could not be completed (${err.message}). Payload is valid.`);
}
