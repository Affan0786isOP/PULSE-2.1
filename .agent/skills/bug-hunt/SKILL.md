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

### Step 1: Parse arguments, resolve target, and confirm execution mode

1. **Resolve Scan Target:**
   Follow the rules in the **Target** section above to determine the scan target. If in branch diff mode, run the git diff command now and collect the file list.

2. **Execution Mode Selection (Interactive):**
   Prompt the user with `ask_question`:
   - `(Recommended) One-Time Pass`: Run a single 3-stage adversarial cycle (Hunter → Skeptic → Referee).
   - `Continuous Repeated Loop`: Run continuous cycles until stopped or token limit is reached.
     - Each cycle passes a ledger of previously audited files to the Hunter so it autonomously scopes unexplored areas.
     - Maximize efficiency by launching the next agent first before committing reports.
     - Save reports to `audit/bug-hunt/cycle-{N}/` and push to dedicated branch `audit/bug-hunt-reports`.

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
When debugging confirmed anomalies or unexpected behavior:
- **Reference File:** Read [systematic-debugging.md](references/systematic-debugging.md).
