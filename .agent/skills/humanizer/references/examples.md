# Humanizer Examples: Before and After Patterns

This document provides concrete before-and-after transformations and negative test cases showing when writing choices should be preserved.

---

## 1. Em Dash Replacement and Splitting

### Example 1A: Split into two clear sentences
- **Before:** The deployment was delayed — three servers failed their health checks simultaneously — leaving the release team scrambling.
- **After:** The deployment was delayed because three servers failed their health checks simultaneously. The release team had to scramble to fix it.

### Example 1B: Natural punctuation replacement (parentheses or commas)
- **Before:** The database query — which takes over four seconds on unindexed tables — was causing request timeouts.
- **After:** The database query, which takes over four seconds on unindexed tables, was causing request timeouts.

### Example 1C: Colon for direct consequence
- **Before:** Only one metric truly mattered for the launch — latency at the 99th percentile.
- **After:** Only one metric mattered for the launch: 99th-percentile latency.

### Negative Test 1D: Preserving dashes inside direct quotations
- **Input:** The CEO stated, "Our objective — regardless of market noise — is long-term stability."
- **Expected:** Keep the quote unchanged. The CEO stated, "Our objective — regardless of market noise — is long-term stability."

### Negative Test 1E: Preserving hyphens/dashes in code and commands
- **Input:** Run `git checkout --track origin/feature-branch` or inspect `--max-connections`.
- **Expected:** Never modify dashes inside backticks, commands, code blocks, or URLs.

---

## 2. Simple, Natural English vs Overly Complex English

### Example 2A: Plain words over formal Latinate synonyms
- **Before:** The committee will commence the evaluation to ascertain whether the applicant possesses the requisite qualifications to facilitate project completion.
- **After:** The committee will start reviewing the application to see if the applicant has the skills needed to finish the project.

### Example 2B: Unwinding wordy nominalizations and filler
- **Before:** Due to the fact that there was a failure in the utilization of proper caching mechanisms, degradation of system performance transpired.
- **After:** Because the system did not use caching properly, performance degraded.

### Example 2C: Trimming pompous phrases
- **Before:** The aforementioned methodology demonstrates considerable efficacy in terms of mitigating latency.
- **After:** This method works well to reduce latency.

### Negative Test 2D: Preserving technical precision in engineering prose
- **Input:** The transaction isolation level was set to Serializable to prevent phantom reads during concurrent updates.
- **Bad rewrite (oversimplified):** We changed a database setting so people don't see ghosts when typing at the same time.
- **Correct humanized rewrite:** The transaction isolation level was set to Serializable to prevent phantom reads during concurrent updates. *(Preserve standard technical terms)*

---

## 3. Broader AI Writing Patterns (WP:AISIGNS)

### Example 3A: False ranges
- **Before:** Our engineering team solves problems ranging from distributed consensus to creative UI interactions.
- **After:** Our engineering team works on distributed systems and front-end interface design.

### Example 3B: Compulsive summaries and wrap-ups
- **Before:** In conclusion, taking all of these factors into account, caching remains a critical component of high-throughput systems.
- **After:** Caching keeps response times low when system traffic spikes. *(Cut the canned conclusion opener; end on the factual point)*

### Example 3C: Superficial balance
- **Before:** While some developers believe that TypeScript slows down initial prototyping, others maintain that it prevents runtime bugs, and both perspectives possess inherent validity.
- **After:** TypeScript adds setup time during early prototyping, but catches type mismatches before runtime.

### Example 3D: Chatbot residue
- **Before:** Sure! I'd be happy to explain how database indexes work. Indexes speed up searches by creating lookup trees. Let me know if you want me to delve deeper into B-trees!
- **After:** Indexes speed up searches by creating lookup trees.

---

## 4. Preserving Already Good Writing

### Negative Test 4A: Clean, authentic human writing
- **Input:** We shipped the new billing page on Tuesday. It broke in Safari for about twenty minutes because of an unescaped regex character, but Sarah pushed a hotfix and refunds went out without a fuss.
- **Evaluation:** No AI tells, no unnecessary dashes, no inflated vocabulary, concrete names and events.
- **Action:** Leave unchanged.
