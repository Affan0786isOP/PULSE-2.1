---
name: bug-hunt
description: Run adversarial bug hunting and systematic root-cause debugging on your codebase. Combines a 3-agent adversarial pipeline (Hunter, Skeptic, Referee) with the 4-phase root-cause debugging discipline. Rates bugs on frequency and impact (leaves bugs alone if frequency x impact < 5; skips unasked rare/future cases). Invoke with /bug-hunt, /bug-hunt [path], /bug-hunt -b <branch>, or when diagnosing unexpected failures.
argument-hint: "[path | -b <branch> [--base <base-branch>]]"
disable-model-invocation: true
---

# Bug Hunt - Adversarial Bug Finding

Run a 3-agent adversarial bug hunt on your codebase. Each agent runs in isolation.

## Usage

```
/bug-hunt              # Scan entire project
/bug-hunt src/         # Scan specific directory
/bug-hunt lib/auth.ts  # Scan specific file
/bug-hunt -b feature-xyz              # Scan files changed in feature-xyz vs main
/bug-hunt -b feature-xyz --base dev   # Scan files changed in feature-xyz vs dev
```

## Target

The raw arguments are: $ARGUMENTS

**Parse the arguments as follows:**

1. If arguments contain `-b <branch>`: this is a **branch diff mode**.
   - Extract the branch name after `-b`.
   - If `--base <base-branch>` is also present, use that as the base branch. Otherwise default to `main`.
   - Run `git diff --name-only <base>...<branch>` using the Bash tool to get the list of changed files.
   - If the command fails (e.g. branch not found), report the error to the user and stop.
   - If no files changed, tell the user there are no changes to scan and stop.
   - The scan target is the list of changed files (scan their full contents, not just the diff).
2. If arguments do NOT contain `-b`: treat the entire argument string as a **path target** (file or directory). If empty, scan the current working directory.

## Bug Triage & Prioritization Rule

To avoid noisy reports and unnecessary over-engineering:
- **Rate Frequency & Severity (1 to 10):** Every bug is evaluated on:
  1. **Frequency (1-10):** How often it would actually occur in realistic production usage.
  2. **Impact/Severity (1-10):** How bad the failure is when it occurs.
- **The `< 5` Threshold (Leave it alone):** If `Frequency × Impact < 5`, **just leave it alone**. Do not report it as an actionable defect or propose fixes for it.
- **No Speculative or Future Design:** **Do NOT design for rare or future cases nobody asked about.** If a scenario requires improbable preconditions, theoretical edge cases, or unused future paths, discard it.

## Execution Steps

You MUST follow these steps in exact order. Each agent runs as a separate subagent via the Agent tool to ensure context isolation.

### Step 1: Parse arguments and resolve target

Follow the rules in the **Target** section above to determine the scan target. If in branch diff mode, run the git diff command now and collect the file list.

### Step 2: Read the prompt files

Read these files using the skill directory variable:
- ${CLAUDE_SKILL_DIR}/prompts/hunter.md
- ${CLAUDE_SKILL_DIR}/prompts/skeptic.md
- ${CLAUDE_SKILL_DIR}/prompts/referee.md

### Step 3: Run the Hunter Agent

Launch a general-purpose subagent with the hunter prompt. Include the scan target in the agent's task. If in branch diff mode, pass the explicit file list so the Hunter only scans those files (full contents). The Hunter must use tools (Read, Glob, Grep) to examine the actual code. Remind the Hunter to ignore rare/speculative cases where `Frequency × Impact < 5`.

Wait for the Hunter to complete and capture its full output.

### Step 3b: Check for findings

If the Hunter reported TOTAL FINDINGS: 0, skip Steps 4-5 and go directly to Step 6 with a clean report. No need to run Skeptic and Referee on zero findings.

### Step 4: Run the Skeptic Agent

Launch a NEW general-purpose subagent with the skeptic prompt. Inject the Hunter's structured bug list (BUG-IDs, files, lines, claims, evidence, severity, points, estimated frequency/impact). Do NOT include any narrative or methodology text outside the structured findings.

The Skeptic must independently read the code to verify each claim, challenging false positives and highlighting if an issue is an unasked speculative/future edge case.

Wait for the Skeptic to complete and capture its full output.

### Step 5: Run the Referee Agent

Launch a NEW general-purpose subagent with the referee prompt. Inject BOTH:
- The Hunter's full bug report
- The Skeptic's full challenge report

The Referee must independently read the code to make final judgments, assign definitive Frequency (1-10) and Impact (1-10) scores, calculate Risk Score (`Frequency × Impact`), and dismiss any findings with a score `< 5`.

Wait for the Referee to complete and capture its full output.

### Step 6: Present the Final Report

Display the Referee's final verified bug report to the user. Include:
1. The summary stats (reported, dismissed false positives, dismissed below threshold `< 5`, confirmed actionable bugs).
2. The confirmed actionable bugs table (sorted by Risk Score descending, then severity).
3. Low-confidence items flagged for manual review.
4. A collapsed section with dismissed bugs (both false positives and items `< 5` left alone per YAGNI) for transparency.

If zero bugs were confirmed, say so clearly — a clean report is a good result.

---

## Systematic Debugging Discipline (Root Cause Before Fixes)

# Systematic Debugging

## Overview

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)
- Manager wants it fixed NOW (systematic is faster than thrashing)

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI → build → signing, API → service → database):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer system):**
   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **This reveals:** Which layer fails (secrets → workflow ✓, workflow → build ✗)

5. **Trace Data Flow**

   **WHEN error is deep in call stack:**

   See `root-cause-tracing.md` in this directory for the complete backward tracing technique.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in same codebase
   - What works that's similar to what's broken?

2. **Compare Against References**
   - If implementing pattern, read reference implementation COMPLETELY
   - Don't skim - read every line
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
   - Don't fix multiple things at once

3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

4. **When You Don't Know**
   - Say "I don't understand X"
   - Don't pretend to know
   - Ask for help
   - Research more

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**
   - Simplest possible reproduction
   - Automated test if possible
   - One-off test script if no framework
   - MUST have before fixing
   - Use the `superpowers:test-driven-development` skill for writing proper failing tests

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - Test passes now?
   - No other tests broken?
   - Issue actually resolved?
   - Use the `superpowers:verification-before-completion` skill before claiming success

4. **If Fix Doesn't Work**
   - STOP
   - Count: How many fixes have you tried?
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If ≥ 3: STOP and question the architecture (step 5 below)**
   - DON'T attempt Fix #4 without architectural discussion

5. **If 3+ Fixes Failed: Question Architecture**

   **Pattern indicating architectural problem:**
   - Each fix reveals new shared state/coupling/problem in different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere

   **STOP and question fundamentals:**
   - Is this pattern fundamentally sound?
   - Are we "sticking with it through sheer inertia"?
   - Should we refactor architecture vs. continue fixing symptoms?

   **Discuss with your human partner before attempting more fixes**

   This is NOT a failed hypothesis - this is a wrong architecture.

## Red Flags - STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes failed:** Question the architecture (see Phase 4.5)

## your human partner's Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" - You assumed without verifying
- "Will it show us...?" - You should have added evidence gathering
- "Stop guessing" - You're proposing fixes without understanding
- "Ultra-think this" - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - Your approach isn't working

**When you see these:** STOP. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question pattern, don't fix again. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

## Supporting Techniques

These techniques are part of systematic debugging and available in this directory:

- **`root-cause-tracing.md`** - Trace bugs backward through call stack to find original trigger
- **`defense-in-depth.md`** - Add validation at multiple layers after finding root cause
- **`condition-based-waiting.md`** - Replace arbitrary timeouts with condition polling