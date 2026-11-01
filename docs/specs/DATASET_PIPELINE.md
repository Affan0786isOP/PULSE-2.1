# PULSE Research Record Pipeline

**Status (2026-11-01):** The public Dataset/Analytics explorer has been retired. This document now describes only the server-side research-record ingestion that remains active.

## 1. Active ingestion boundary

Assessment submissions still pass through `POST /api/research/submit`. The server validates trial structure and timing, derives metrics, creates provenance metadata, and writes the assessment result and anonymized `publicDataset` record through the submission repository.

The `publicDataset` collection is retained as a server-written research archive. It is not exposed to clients for direct reads, and no user-facing Dataset browser, Analytics explorer, CSV/JSON export UI, or `/api/research/dataset*` read endpoint is provided.

## 2. Data minimization

Research records continue to exclude direct participant identifiers and IP addresses. Completion time is represented using the coarse `completedAtMonth` value, and records retain schema/protocol version metadata for interpretation and provenance.

## 3. Removal boundary

The 2026-11-01 product removal deletes the Dataset/Analytics UI, desktop and mobile routes, navigation entry points, charting/normalization client modules, result-count reads, and the dedicated read-only API/repository layer.

It does **not** delete or migrate existing Firestore documents. It also does not disable the server-authoritative research submission pipeline or its `publicDataset` writes.

## 4. Related contracts

- [`server/services/researchService.ts`](../../server/services/researchService.ts): validates and prepares assessment submissions.
- [`server/repositories/firestore/firestoreResearchSubmissionRepository.ts`](../../server/repositories/firestore/firestoreResearchSubmissionRepository.ts): transactional persistence boundary.
- [`server/models/researchModels.ts`](../../server/models/researchModels.ts): retained record metadata types.
- [`docs/DATA_MODEL.md`](../DATA_MODEL.md): Firestore collection schema and retention details.
