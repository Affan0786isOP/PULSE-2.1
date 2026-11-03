---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

Architecture and quality standards for designing, testing, and maintaining Antigravity skills.

## When to Use & Routing

Load specialized reference files based on the development phase:

1. **Skill Discovery Optimization (SDO)**
   - Description field engineering, keyword coverage, descriptive naming, token-efficient examples, and trigger formatting.
   - **Reference File:** Read [skill-discovery-optimization.md](references/skill-discovery-optimization.md).

2. **Skill Testing & Anti-Patterns**
   - Testing discipline-enforcing vs technique skills, closing rationalization loopholes, micro-testing, and common anti-patterns.
   - **Reference File:** Read [testing-and-anti-patterns.md](references/testing-and-anti-patterns.md).

## Core Universal Invariants
1. **Trigger Clarity in Frontmatter:** The `description` field must state exact activation conditions ("Use when...") and avoid workflow summaries.
2. **Progressive Disclosure:** Keep `SKILL.md` under 1,500 tokens. Move heavy catalogs, recipes, and edge cases into `references/`.
3. **Verification Before Claiming Complete:** Every new or edited skill must pass automated structural and relative link checks.
