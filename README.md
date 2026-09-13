# PULSE — Precision User Latency & Stimulus Evaluator

**PULSE** is a high-precision cognitive assessment platform, research data engine, and benchmark suite designed for sub-millisecond visual reaction timing, executive function evaluation, and spatial memory analysis across demographic age cohorts.

---

## 🏛️ System Architecture

PULSE is architected as a full-stack, cloud-native web application supporting both desktop and mobile/PWA interfaces.

```
                  +-----------------------------------+
                  |           Client Layer            |
                  |  React 19 / Vite / PWA / Tailwind |
                  +-----------------+-----------------+
                                    |
                        HTTPS / REST| / API Routes
                                    v
                  +-----------------------------------+
                  |           Express Server          |
                  |  Server-Side Provenance Engine    |
                  |  Rate Limiting / Audit Logging    |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |          Firebase Engine          |
                  |  Firestore (Dataset/Leaderboard)  |
                  |  Anonymous Firebase Auth          |
                  +-----------------------------------+
```

### Key Modules
* **Assessment Battery:**
  * **Visual Reaction:** High-frequency timer measuring motor response latency & false starts.
  * **Direction Discriminability:** Flanker task evaluating attentional conflict and selective focus.
  * **Color Recognition:** Stroop-type interference test measuring cognitive flexibility.
  * **Spatial Block Memory:** Corsi block-tapping task measuring visuospatial working memory span.
  * **Number Memory Span:** Forward/Backward digit span assessing short-term verbal/numerical capacity.
* **Research Dataset Explorer:** Interactive dataset analysis with demographic filters, distribution curves, and CSV/JSON research exports.
* **Leaderboards:** Firestore-authoritative global leaderboard with verified server-attested cloud records.
* **Admin Console:** Moderation dashboard for dataset audit, anomaly flagged entries, and protocol compliance inspection.

---

## 🔐 Cryptographic Provenance & Security Model

To prevent automated bot submissions and metric tampering, PULSE employs a multi-tiered cryptographic provenance model:

1. **Server-Side HMAC Attestation:** Assessment payloads must submit raw per-trial observations (timestamps, stimulus deltas, response inputs). The backend validates physiological plausibility thresholds (e.g. $80\text{ms} \le \text{RT} \le 3600000\text{ms}$) and generates a 64-character SHA-256 HMAC token.
2. **Chronological Trial Verification:** Trial timestamps are verified for monotonic forward progression to prevent simulated or replayed observation arrays.
3. **Rate Limiting:** Express API endpoints apply IP-based rate limiting (`express-rate-limit`) to prevent automated flooding.
4. **Firestore Security Rules:** Access rules enforce schema validation v1, anonymous authentication requirements, and strict read/write boundaries for public dataset records.

---

## ⚙️ Environment Variables & Configuration

Configure the following variables in `.env` or your deployment container environment:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `PULSE_PROVENANCE_SECRET` | **Yes** | 32+ char secret key used for server-side HMAC token generation. |
| `VITE_FIREBASE_API_KEY` | Optional | Firebase Web API key for persistent cloud synchronization. |
| `VITE_FIREBASE_PROJECT_ID` | Optional | Firebase Project ID. |
| `VITE_ADMIN_PASSCODE` | Optional | Passcode for Admin Console authentication. |

---

## 🚀 Development & Deployment

### Development
```bash
# Install dependencies
npm install

# Launch full-stack development server (Express + Vite on port 3000)
npm run dev
```

### Type Checking & Validation
```bash
npm run lint
```

### Production Build & Launch
```bash
# Build desktop SPA, mobile PWA, and bundle CJS Express server
npm run build

# Start production server
npm run start
```

---

## ⚖️ Research Privacy & Ethics

PULSE adheres to strict data minimization principles:
* **No PII:** Identifiable attributes (names, emails, IP addresses) are never attached to public research observations.
* **Age Cohort Categorization:** Participants select broad age brackets rather than exact birthdates. Minors' metrics receive additional statistical bucket obfuscation.
