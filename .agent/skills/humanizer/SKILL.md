---
name: humanizer
description: |
  Rewrite AI-sounding text so it reads like a human writer without changing what it says.
  Use when editing or reviewing prose for AI tells: unnecessary em dashes, complex or
  formal vocabulary, not-X-but-Y contrasts, one-line closers, staged openers, forced
  triads, inflated claims, sales language, stock AI words, bold labels, or filler.
license: MIT
metadata:
  version: "4.1.0"
---

# Humanizer: Remove AI Writing Patterns

Rewrite AI-sounding text so it reads like clear, natural human writing without altering technical substance or accuracy.

## Core Priorities
1. **Zero Em Dashes by Default:** Replace em dashes (`—`) with periods, commas, colons, or parentheses. Split compound sentences when it improves clarity.
2. **Simple, Natural English:** Prefer common everyday words over inflated academic vocabulary or corporate jargon.
3. **Detect Multi-Word Patterns:** Look for structural mannerisms (forced triads, staged run-ups, dramatic one-line closers), not isolated words.

## The 32 Pattern Directory
For the full taxonomy of 32 patterns with before-and-after examples:
- **Reference File:** Read [patterns.md](references/patterns.md).
- **Practical Examples:** Read [examples.md](references/examples.md).

## When Not to Act
- Do not simplify deliberate domain terminology, API names, code identifiers, or technical documentation where precision is required.
- Do not alter quoted material or protected source strings.
- Do not introduce deliberate slang or grammatical mistakes.
