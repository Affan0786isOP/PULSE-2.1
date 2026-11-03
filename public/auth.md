# Authentication & Authorization Architecture | PULSE

> Architectural disclosure of authentication requirements, identity boundaries, and programmatic access policies for the PULSE platform.

- Canonical Origin: https://pulse-lab.in
- Machine Discovery: RFC 9727 API Catalog at `/.well-known/api-catalog`
- Specification Reference: Fastlook Agent-Readiness & Web Bot Discovery

---

## 1. Overview & Architectural Role

PULSE (Precision User Latency & Stimulus Evaluator) is an open scientific cognitive benchmarking laboratory and psychophysics research platform. It measures human visual response latency, choice reaction time, selective attention, and working memory capacity with millisecond-resolution display refresh calibration.

Because PULSE is a human psychophysics measurement platform rather than an autonomous bot-hosted execution API:
- It **does not** act as an OAuth 2.0 Authorization Server (`RFC 8414`).
- It **does not** provide programmable multi-tenant OAuth Protected Resource delegation.
- It **does not** require API keys, bearer tokens, or client credentials to access public research content, empirical benchmarks, or methodological guides.

---

## 2. Access Tiers & Protocol Governance

### Tier 1: Public Read-Only Content & Empirical Benchmarks
- **Access Level**: Fully Public & Anonymous
- **Authentication**: None required (`No Auth`)
- **Permitted Methods**: `GET`, `HEAD`, `OPTIONS`
- **Rate Limiting**: IP-based rate limiting (60 requests/minute)
- **Scope**:
  - Educational guides (`/guides/*`)
  - Empirical distribution benchmarks (`/benchmarks/cognitive-percentiles`)
  - Scientific metadata & schemas (`/llms.txt`, `/sitemap.xml`, `/robots.txt`, `/.well-known/api-catalog`)
  - Markdown content negotiation (`Accept: text/markdown`)

### Tier 2: Public Interactive Benchmarks & Telemetry Ingestion
- **Access Level**: Client-side Anonymous Session Authentication
- **Authentication**: Firebase Authentication (Anonymous User Session)
- **Mechanism**: The web client initializes an ephemeral Firebase Auth session to sign telemetry payload envelopes submitted to Cloud Firestore.
- **Security Invariant**: Assessment submissions are cryptographically bound to the client session. Unauthenticated or spoofed external API posts to assessment submission pipelines are rejected at the Firestore Security Rules boundary.
- **External Agents**: Autonomous AI bots and web crawlers are **prohibited** from submitting synthetic benchmark sessions to prevent skewing empirical research distributions.

### Tier 3: Internal Moderation & Administration
- **Access Level**: Private Restricted
- **Authentication**: Server-side passcode / session cookie
- **Scope**: `/admin`, `/api/admin/*`
- **Robots / Agent Directive**: `Disallow: /admin` across all user agents. These endpoints are strictly internal and non-public.

---

## 3. Machine-Readable Agent Guidelines

1. **Content Retrieval**: AI answer engines, researcher agents, and search indexers are welcome to index and cite public guides and benchmark distributions.
2. **Markdown Representation**: Request any indexable route with the HTTP header `Accept: text/markdown` or fetch `https://pulse-lab.in/llms.txt` for clean, unbloated markdown text.
3. **Usage Restrictions**: Automated training crawls are restricted per `Content-Signal: search=yes, ai-input=yes, ai-train=no` in `robots.txt`.
