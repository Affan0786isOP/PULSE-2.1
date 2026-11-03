# The 32 AI Writing Patterns & Transformations

## The 32 patterns

The patterns are numbered by strength and frequency. §1 through §5 justify an edit on one sighting; patterns marked *weak alone* require company from other tells before editing.

### A. Staging instead of stating

### 1. Not X but Y
- **Watch for:** Not X but Y; not just / not only X, but Y; it's not X, it's Y; Y rather than X; negative contrast split across sentences (*"This does not mean X. It means Y."*); clipped negative tails (*"..., no guessing"*).
- **Problem:** Sets up a phantom alternative no one claimed so the positive half sounds larger, or poses as clearing up misconceptions. State the point directly.
- **Before:** It's not just about managing state; it's about building an architecture that scales. It prioritizes empirical stability rather than ideological purity.
- **After:** The library manages state and keeps the architecture maintainable as the codebase grows. It prioritizes system stability over theoretical consistency.

### 2. One-line closers and dramatic fragments
- **Watch for:** A one-sentence paragraph that restates the previous point; "That is the real win."; "That distinction matters."; "Read that again."; "Let that sink in."; fragments separated by periods (*"No aesthetic prior. No nostalgia."*); spaced words for emphasis (*"every. single. day."*).
- **Problem:** Asks the reader to pause for theatrical effect instead of adding information. Merge or state the direct consequence.
- **Before:** AlphaEvolve had no preference for symmetry. No aesthetic prior. No nostalgia. The old rules were gone.
- **After:** AlphaEvolve did not favor symmetry or traditional conventions, which made earlier design assumptions obsolete.

### 3. Sayings that sound deep
- **Watch for:** The real question is; at its core; what really matters; fundamentally; the heart of the matter; X is the Y of Z; X becomes a trap; X is not a tool but a mirror; the language of; the currency of; the architecture of.
- **Problem:** An ordinary point is dressed as an aphorism. Replace the saying with the concrete claim.
- **Before:** At its core, symmetry is the currency of trust in UI design.
- **After:** Predictable, symmetric layouts tend to make interfaces feel familiar to users.

### 4. Staged run-up before the point
- **Watch for:** Let's dive in; let's explore; let's break this down; here's what you need to know; now let's look at; without further ado; Honestly?; Look,; Here's the thing; Real talk; *"one thing that bit me, so pay attention"*.
- **Problem:** Announces the point or stages artificial candor. Drop the run-up and start directly with the point.
- **Before:** Let's dive into how caching works in Next.js. Here's what you need to know.
- **After:** Next.js caches data across request memoization, the data cache, and the router cache.

### 5. Arguing with no one
- **Watch for:** This isn't (mainly) about; I'm not saying; To be clear; Don't get me wrong; This is not to say; Some might say... but; A tempting approach would be; One might think... but.
- **Problem:** Defends against an unvoiced objection that appears nowhere else. State the affirmative claim.
- **Before:** I'm not arguing that unit tests don't matter. But the integration test suite is what caught the bug.
- **After:** The integration test suite caught the bug.

---

### B. Rhythm and punctuation by rule

### 6. Forced triads
- **Watch for:** Groupings of three adjectives, nouns, or examples (*"innovation, inspiration, and insights"*); three parallel mini-scenarios followed by a moral.
- **Problem:** Ideas are forced into threes to sound complete or simulate thorough analysis. Use the exact number of items the meaning requires.
- **Before:** The system provides speed, reliability, and unparalleled performance.
- **After:** The system maintains low latency under high load.

### 7. Repeated sentence openings
- **Watch for:** Several sentences in a row starting with the same pronoun or noun (*"She opened...", "She saw...", "She realized..."*), or starting with *Additionally* or *Moreover*.
- **Problem:** Repetition handled mechanically. Merge sentences or lead with the action.

### 8. Dashes as the universal connector
- **Rule:** The final rewrite must contain **no em dashes (`—`)** unless explicitly quoted or requested. Replace them with periods, commas, colons, or parentheses, or split into two sentences.
- **Problem:** Em dashes let the author dodge choosing how clauses relate. They interrupt reading flow and create artificial breathlessness. Avoid the opposite extreme of uniform, staccato sentences.
- **Before:** The new rollout — announced without prior warning — affects thousands of users — and support is swamped.
- **After:** The new rollout, announced without warning, affects thousands of users. Support teams are already overloaded.

### 9. Stacked qualifiers
- **Watch for:** Could potentially possibly; might arguably; in some cases it may; it is worth noting that. (*weak alone*)
- **Problem:** Stacking defensive hedges strips clarity and confidence. Retain genuine technical caveats, but state them cleanly.
- **Before:** It could potentially possibly be argued that the update might affect performance.
- **After:** The update may affect performance.

### 10. Hyphenated pairs everywhere
- **Watch for:** High-quality, well-known, real-time, client-facing used after the noun they describe. (*weak alone*)
- **Problem:** Keep hyphens before the noun (*"a real-time feed"*); drop them after the noun (*"the feed updates in real time"*).

### 11. Passive voice and missing subjects
- **Watch for:** Sentences that hide who acts or drop the subject entirely (*"No configuration needed"*, *"Results are shown"*). (*weak alone*)
- **Problem:** Active voice clarifies responsibility and improves readability.
- **Before:** No configuration file needed. The database is updated automatically.
- **After:** You do not need a configuration file. The server updates the database automatically.

---

### C. Inflation and borrowed authority

### 12. Overused AI words
- **Watch for:** Actually, delve, tapestry, testament, pivotal, underscore, landscape (abstract), bolster, foster, beacon, paramount, intricate, showcase, vibrant, elevate, crucial, realm, holistic, revolutionize, align with, garner, multifaceted.
- **Problem:** Models overuse these words far more than human writers do. Replace them with plain, specific words.
- **Before:** We delve into the intricacies of this pivotal framework to showcase its robust capabilities.
- **After:** We examine how this framework handles state and errors.

### 13. Inflated significance and generic send-offs
- **Watch for:** Stands/serves as a testament to; marks a pivotal moment/shift; indelible mark; setting the stage for; reflects broader trends; deeply rooted; Challenges and Legacy; Future Outlook; the future looks bright; exciting times ahead.
- **Problem:** Routine facts are framed as historic turning points or situated in grandiose macro trends. End on the last concrete fact.
- **Before:** The release marks a pivotal moment in our evolving landscape. Exciting times lie ahead!
- **After:** Version 2.0 adds multi-region database support.

### 14. Vague connection or association
- **Watch for:** Associated with, in association with, connected to, in connection with, linked to, tied to, ventured into, identified as being associated with.
- **Problem:** States that two things are connected without specifying the actual relationship or role.
- **Before:** In 2021, sources identified John Doe as being associated with leadership of ExampleCorp.
- **After:** In 2021, John Doe became CEO of ExampleCorp.

### 15. Shallow -ing riders
- **Watch for:** ..., highlighting the importance of; ..., underscoring its value; ..., ensuring seamless operations; ..., fostering innovation; ..., reflecting its enduring impact.
- **Problem:** An *-ing* present-participle phrase tacked onto an ordinary fact to simulate analytical depth or synthesis. Cut the rider or make the causal link explicit.
- **Before:** The team deployed automated checks, ensuring seamless compliance across the fleet.
- **After:** The team deployed automated checks to enforce compliance policies.

### 16. Sales language and generic superlatives
- **Watch for:** Rich (figurative), profound, exemplifies, commitment to, nestled in, groundbreaking, renowned, breathtaking, stunning, world-class, boasts, features (meaning has).
- **Problem:** Reads like promotional copy or a travel brochure instead of factual writing.
- **Before:** Nestled in downtown Seattle, our world-class office exemplifies our commitment to innovation.
- **After:** Our downtown Seattle office houses our engineering and research teams.

### 17. Borrowed authority and vague attribution
- **Watch for:** Experts argue; observers note; studies show; industry leaders agree; critics point out; several publications cite (when only one or two exist).
- **Problem:** Leaning on anonymous authorities (weasel wording) to prop up an unverified assertion or overgeneralize single-source opinions. Name the specific source or state the observation directly.
- **Before:** Experts believe that microservices significantly improve developer velocity.
- **After:** Martin Fowler documented velocity improvements after migrating to microservices.

### 18. Avoiding is, are, and has
- **Watch for:** Serves as, stands as, functions as, operates as, represents [a]; boasts, features, offers, maintains [a]; refers to (when defining an entity).
- **Problem:** Replacing short verbs with bloated phrasing. Use *is*, *are*, and *has*.
- **Before:** The dashboard features five distinct widgets and serves as the command hub.
- **After:** The dashboard has five widgets and is the primary command screen.

### 19. False ranges
- **Watch for:** *"From [X] to [Y]"* or *"ranging from [X] to [Y]"* where no continuous, logical, or numerical scale exists.
- **Problem:** Fakes breadth by pairing two loosely related concepts.
- **Before:** We offer solutions ranging from technical architecture to creative storytelling.
- **After:** We design system architectures and produce marketing content.

### 20. Compulsive summaries and wrap-ups
- **Watch for:** In conclusion; In summary; Overall,; To sum up; Ultimately,; Taking all of this into account.
- **Problem:** Tacking on a predictable five-paragraph-essay summary that repeats earlier paragraphs. End cleanly on the final concrete observation.

### 21. Superficial balance
- **Watch for:** *"While some argue X, others believe Y, and each perspective has merit"*; *"The answer is not straightforward"*; *"Both sides present valid points."*
- **Problem:** Avoids taking an analytical stance by reciting platitudes. State the specific empirical differences or trade-offs.

### 22. Canned notability and media coverage emphasis
- **Watch for:** Independent coverage; local/regional/national media outlets; trade publications; cited/featured/profiled in; maintains an active social media presence; extensively covered by leading outlets.
- **Problem:** Hits the reader over the head with metadata about sources and coverage types rather than summarizing what the sources actually reported.
- **Before:** The project garnered independent coverage in regional and national tech publications, highlighting its notability.
- **After:** TechCrunch and Wired reported on the project's launch in October.

---

### D. Formatting and presentation by rule

### 23. Bold as decoration
- **Problem:** Unnecessary bold text sprayed across paragraphs, or vertical bullet lists where every item begins with an inline boldfaced label and colon (`- **Metric:** Value`). Convert into flowing prose when labels are redundant.
- **Before:**
  - **Latency:** Latency dropped by 40%.
  - **Throughput:** Throughput doubled under load.
- **After:** Latency dropped by 40%, and throughput doubled under load.

### 24. Decorative headings and emoji clutter
- **Problem:** Title-casing every word in headings (`## Strategic Planning And Deployment`), prefixing headings with emojis (`🚀 Deployment`, `💡 Key Insights`), repeating article titles in level-1 headings, skipping heading levels (jumping from H1 to H3), or inserting horizontal dividers between every paragraph. Use clean sentence case and remove emoji decoration.

### 25. Curly quotation marks
- **Problem:** Typographic curly quotes (`“ ”`, `‘ ’`) appearing in code or Markdown where straight quotes (`" '`) are expected. (*weak alone*)

### 26. Table and formatting misuse
- **Problem:** Constructing minimal 2-column markdown tables for content better served by prose or key-value pairs, or embedding raw markdown table syntax inside wikitext. Use clear prose or appropriate structured elements.

---

### E. Leftovers from chat, draft, and models

### 27. Chatbot residue
- **Watch for:** *Sure, I can help with that!; Certainly!; Great question!; As an AI...; I hope this helps!; Let me know if you need anything else; Happy editing!; Feel free to reach out.*
- **Problem:** Chat greetings, compliance confirmations, or closing pleasantries left in standalone documents. Delete completely.

### 28. Hedging disclaimers and speculative gap-filling
- **Watch for:** *As of my last training update; While specific details are not publicly available / scarce; based on available information; does not by itself establish; keeps personal details private; maintains a low profile.*
- **Problem:** Chatbot attempts to fill perceived data gaps by pointing out that information is missing, or invents speculative filler about a person's private life. State what is verified, or omit the gap entirely.

### 29. Self-conscious policy and procedural assurances
- **Watch for:** Reassurances in text, commit messages, or summaries that changes were made *"to ensure neutrality, improve clarity, and strictly comply with guidelines while preserving original technical details"*; excessive apologies for possible past mistakes; customer-service tone.
- **Problem:** Explaining what was avoided or reciting policy compliance rather than stating the factual change.
- **Before:** Revised the security section for clarity and neutral tone, ensuring compliance with standards while preserving core architecture.
- **After:** Updated security section with current OAuth 2.1 token refresh specifications.

### 30. Phrasal templates and placeholder tokens
- **Watch for:** Unreplaced template slots like *[Entertainer's Name]*, *[Your URL here]*, *2025-xx-xx*, or bot instructions like *Delete this section before submission*.
- **Problem:** Unfinished prompts or scaffolding leaked into final deliverables. Fill with verified facts or eliminate.

### 31. Exposed citations and tracker parameters
- **Watch for:** Internal citation tokens like `contentReference[oaicite:1]`, `[1, 2, 3]` tags, HTML `<mark>` tags, or URL tracker parameters like `?utm_source=chatgpt.com`, `utm_source=openai`, `utm_source=copilot.com`, or `referrer=grok.com`.
- **Problem:** Leaked internal retrieval metadata or tracking strings. Strip tracking parameters and repair malformed citation references.

### 32. Writing about the document instead of its subject
- **Watch for:** *"This function was added to replace..."*; *"The table below compares..."*; *"As outlined in the section above..."*.
- **Problem:** The text narrating its own formatting and authoring process. Describe the subject directly.

---
