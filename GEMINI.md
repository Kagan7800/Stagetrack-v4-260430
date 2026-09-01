# GEMINI.md — Output Contract (Highest Precedence)

This file outranks `AGENTS.md` and `.agents/rules/`. Where anything below conflicts with this, **this wins**. Substance lives in `AGENTS.md`; this file is the gate that makes it get read.

---

## 1. Mandatory Preflight

Before producing **any** review, audit, repair, or readiness output, emit this block first, filled in. No preflight, no output.

```
PREFLIGHT
Task:            <what was asked>
Artifacts held:  <files/screenshots/logs actually received — or NONE>
Artifacts cited but absent: <list — or NONE>
Rules read:      AGENTS.md §<n> · <other rule files>
Risk tier:       T<0-3>  (AGENTS.md §9)
Stages in scope: <list>
Baseline:        CAPTURED <numbers> | NOT CAPTURED
```

If **Artifacts cited but absent** is non-empty, stop and ask. Do not reason from an assumed artifact.

If **Baseline: NOT CAPTURED**, Stage 11 is unsatisfiable. Say so; do not claim verification.

## 2. Hard Stops

Stop and ask rather than proceed when:

- A referenced screenshot, log, trace, or file was not actually received
- The root cause you would state is not mechanically addressed by the fix you would propose
- A fix requires changes outside the declared scope
- A change cannot be verified by anything you can run

## 3. Banned Output

Never emit, in any form:

- A self-score of any kind — `10/10`, `complete`, `fully verified`, `all stages accounted for`
- Readiness language from a review pass — `production ready`, `battle-tested`, `ready to ship`, `submission ready`. These require `/launch-readiness` and a human.
- A stage silently omitted. Every in-scope stage is reported evidenced or `NOT RUN`.
- A check reported as passed that you did not run and read.

## 4. Disposition Vocabulary — Exactly One Per Finding

| Value | Meaning |
|---|---|
| `Fixed` | Applied **and** verified |
| `Proposed` | Diff written, not applied, not verified |
| `Deferred` | Out of scope; needs its own task |
| `Accepted` | Risk knowingly retained; **names the accepting person** |
| `OPEN` | Symptom confirmed, cause not isolated |

Combined values are invalid. "Fixed (patch required)" is `Proposed`. "Accepted for a later pass" is `Deferred`.

## 5. Deliverable Format — In This Order

1. **Coverage line** — `Stages evidenced: N of M`, naming each skipped stage and why
2. **Findings table** — `Severity | file:line | Evidence | Disposition`
   - `file:line` means real line numbers. A bare filename, `(Live Viewport)`, or `(various)` is invalid.
   - The file cited must be the file the diff changes.
   - Evidence names a runnable artifact: test, trace, tool output, or quoted source lines.
3. **Unified diff** — git-applicable: `--- a/path`, `+++ b/path`, `@@` hunks. Full file only under ~100 lines.
4. **Baseline comparison** — before/after numbers, or `NOT CAPTURED`
5. **Deferred list** — out-of-scope, unevidenced, and accepted risks

## 6. Precondition Rule

Every rule in `AGENTS.md` and `.agents/rules/` states a precondition. **Verify the precondition before applying the rule.** A rule applied where it does not apply is a new bug carrying a citation. Quoting a rule is not evidence that it fits.
