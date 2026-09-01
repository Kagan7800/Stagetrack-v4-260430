---
name: code-review-repair
description: Sequential code review and repair of a specified file or module. Covers baseline capture, dead-code elimination, architecture, types, logic, performance, security, observability, accessibility, docs, commit hygiene, and verified rollback. Use before merging any non-trivial change.
---

# Code Review & Repair Protocol

Execute sequentially in single, manageable stages. Do not attempt to refactor the entire codebase at once.

`AGENTS.md` governs throughout — evidence standard (§3), anti-fabrication (§4), diagnosis discipline (§5), repair discipline (§7), approval gates (§2). Layout and animation work follows `.agents/rules/layout-performance.md`.

Check the risk tier (AGENTS.md §9) first and run only the stages that tier requires. **Report every stage as evidenced or `NOT RUN`. Never omit a stage silently.**

---

## Stage 1 — Scope & Baseline

- Review exclusively the specified file or module. Open a deferred list for out-of-scope findings.
- **Record baseline:** test results (pass/fail/skip), build success, bundle size, existing benchmarks.
- Read `git log`, open issues, and TODO/FIXME comments. `git blame` anything whose purpose isn't obvious — much "clearly wrong" code is a deliberate workaround not visible in the file.

Without a baseline you cannot prove the change was neutral, and Stage 11 has nothing to compare against.

## Stage 2 — Dead Code Elimination

Remove unused variables, functions, components, dead assets, and obsolete logic under the **two-signal rule** (AGENTS.md §8). Attach tool output as evidence. Check the evader classes explicitly.

**Verify and commit before starting Stage 3.**

## Stage 3 — Architecture & Design

- Structural alignment, modularity (DRY, SOLID), folder isolation.
- Raw markup, design mockups, and specification documents separated from production runtime code — verify the separation holds **at build time** via bundler/tsconfig excludes, not folder convention alone.
- Flag premature abstraction as readily as duplication. Two similar call sites are not yet a pattern.

## Stage 4 — Types & Contracts

- No `any` without inline justification; prefer `unknown` + narrowing; watch for `as unknown as T`.
- Runtime validation agrees with static types at every I/O boundary.
- Null/undefined handled at API boundaries; no non-null assertions on untrusted data.
- Public interface changes checked against downstream consumers.

## Stage 5 — Logic & Edge Cases

- Race conditions, stale closures, unawaited promises, concurrent writes, missing abort on unmount.
- Memory leaks: `useEffect` listeners, subscriptions, timers, observers — all cleaned up.
- Boundary inputs: empty, single-element, maximum-size, malformed, duplicate-request.
- Every `catch` handles, reports, or rethrows.

## Stage 6 — Performance & Rendering

Follow `.agents/rules/layout-performance.md` in full. Non-negotiable in this stage:

- **Profile before proposing.** Before/after numbers on a mid-tier device.
- Compositor-only animation; batch layout reads before style writes.
- Containment only where its precondition holds; verify nothing is clipped afterward.
- Overlap fixed by reserving space, not by raising z-index.
- Structural wins before micro-optimization.

## Stage 7 — Security, Telemetry & Resilience

- Injection risks, insecure data handling, hardcoded development secrets.
- **Authorization per handler**, including user A requesting user B's object by ID.
- Dependency audit triaged by reachability; exposed credentials **rotated**, not just deleted.
- Live services process real requests, never mocked data.
- Idempotency keys persisted and bound to the logical operation.
- Debounce vs throttle chosen correctly; debounced writes flush on `visibilitychange` and `pagehide`.
- Offline writes persisted and replayed on reconnect.
- Fallback paths **exercised by a test**, not merely present.

## Stage 8 — Observability & Accessibility

- Structured logging at failure points; correlation IDs across service boundaries.
- Error boundaries that report, not just render a fallback.
- Metrics or alerts on the paths this change touches.
- Semantic HTML; full keyboard path; visible focus; focus managed on route and modal changes; accessible names on all interactive elements.

## Stage 9 — Documentation Delta

README, JSDoc, env-var docs, and runbook updated to match behavior changes, in the same commit.

## Stage 10 — Commit Hygiene

- Commits atomic and revertable; **each builds and passes tests on its own.**
- Refactors separated from behavior changes.
- Messages explain **why**.
- No history rewritten to appear more incremental than the work was; no concealed scaffolds.

## Stage 11 — Verification & Rollback

- Re-run the Stage 1 baseline and **compare numbers.** Do not eyeball.
- Confirm each stage's commit reverts cleanly in isolation.
- Confirm no test was weakened, skipped, or deleted to reach green.
- If Stage 1 recorded no baseline, this stage is `NOT RUN`. It cannot be satisfied retroactively.

## Stage 12 — Reproducibility & Handoff *(conditional: competition, audit, or handoff only)*

- Clean clone builds and runs on a machine that has never seen the project, from documented steps alone.
- License compliance verified for every dependency.
- Demo path works without network access, or degrades visibly rather than hanging.
- Required submission artifacts present and current.

---

## Output Deliverables

**1. Coverage line.** `Stages evidenced: N of 12` — naming each skipped stage and why. No self-score, no readiness claim (AGENTS.md §4).

**2. Findings table.** Columns: `Severity | file:line | Evidence | Disposition`. Real line numbers. One disposition per row from the four defined values.

**3. Unified diff.** Git-applicable, with `--- a/path`, `+++ b/path`, and `@@` hunk headers. The path in the diff must match the file cited in the findings table. Full file contents only if under ~100 lines — a full dump of a large file hides what changed and permits silent rewrites of untouched code.

**4. Baseline comparison.** Tests, build, bundle size, benchmarks — before and after, as numbers.

**5. Deferred list.** Out-of-scope items, findings downgraded for lack of evidence, and risks knowingly accepted with the accepting person named.
