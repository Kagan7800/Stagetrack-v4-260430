# AGENTS.md — Engineering Standing Rules

Always-on constraints for every agent in this workspace.

`GEMINI.md` outranks this file and holds the output contract and mandatory preflight — emit the preflight before any review output. This file holds the substance those rules enforce.

Procedures live in workflows: `/code-review-repair` for review and repair passes, `/launch-readiness` before any production release. Layout, animation, and containment rules live in `.agents/rules/layout-performance.md` — read that file before touching CSS or animation.

---

## 1. Operating Mode

- Work in **single, manageable stages**. Never refactor the whole codebase in one pass.
- **One stage, one commit.** Every commit builds, passes tests, and reverts cleanly in isolation. This is what makes `git bisect` work.
- **Removal and restructuring never share a pass.** Deleting code and adding abstraction in one diff is unreviewable and unrevertable.
- Note out-of-scope problems in a deferred list. Do not chase them.
- If a requirement is ambiguous, ask before writing code.

## 2. Safety — Stop and Request Approval

Auto-continue is on. These require explicit human approval, every time. Approval for one never carries to the next.

- Deleting files, directories, or exported symbols
- Any git history rewrite: `push --force`, `rebase` on shared branches, `reset --hard`, amending pushed commits
- Schema changes, data migrations, backfills
- Modifying auth, authorization, or security rules
- Modifying CI/CD config, deploy scripts, or infrastructure
- Installing or upgrading dependencies
- Any command against a production or shared environment
- Writes to a metered or paid API beyond a single test call

**Never, under any framing:** commit secrets or credentials — including in tests, fixtures, or comments; fabricate git history to look more incremental than the work was; disable, skip, or weaken a test to make a build pass; delete code you cannot prove is unused.

## 3. Evidence Standard

Every finding carries a **severity**, a **`file:line`**, and **evidence** — a failing test, a profile, tool output, or a linked spec.

- **No evidence, no change.** Unsupported findings ship as questions, never as edits.
- **Never report a check as passed unless you ran it and read the output.**
- A stage with no check run is reported `NOT RUN`, not omitted and not assumed clean.

## 4. Anti-Fabrication

The most expensive failure mode is a confident report of work that did not happen.

- **You may not score your own work.** No "10/10", "complete", "fully verified", "production ready", "battle-tested". Report what ran and what didn't; let a human judge.
- **Report stage coverage as `N of M evidenced`**, naming every stage skipped and why.
- **Never claim to have inspected an artifact you did not receive.** If a screenshot, log, file, or trace is referenced but absent, say so and stop. Do not reason from an assumed artifact.
- **Readiness claims require `/launch-readiness`.** A code review cannot conclude that anything is ready to ship.
- **`file:line` means real line numbers.** "(Live Viewport)", "(various)", or a bare filename is not a location.
- **The file cited must be the file changed.** A finding on a `.tsx` file paired with a CSS-only diff means the diagnosis is unlocated.

### Disposition vocabulary — never combine these

| Disposition | Meaning |
|---|---|
| `Fixed` | Change applied **and** verified |
| `Proposed` | Diff written, not applied, not verified |
| `Deferred` | Out of scope; needs its own task |
| `Accepted` | Risk knowingly retained; names the person accepting it |

"Fixed (patch required)" is not a disposition. It is `Proposed`.

## 5. Diagnosis Discipline

- **Root cause must be mechanically consistent with the fix.** If the proposed change would not address the stated cause, one of the two is wrong. Resolve that before writing code.
- **Read the actual DOM ancestry and computed styles before theorizing.** Verify, don't infer.
- **Prefer the simplest sufficient cause.** Check ancestor `overflow`, existing stacking contexts, and layout mode before inventing new layers or properties.
- **Never apply a rule from these documents as a reflex.** Every rule here names a precondition. Verify the precondition holds for this case. A rule applied where it doesn't apply is a new bug with a citation attached.

## 6. Severity Calibration

`BLOCKER` regardless of how small the fix looks: silent data loss, authorization bypass, secret exposure, crash on a critical path, corruption on retry.

A missing flush on a debounced write that carries user data is silent data loss. It is a `BLOCKER`, not a `SHOULD-FIX`.

## 7. Repair Discipline

Review finds; repair fixes. Repair is where reviews cause outages.

- **Minimal diff.** Change only what the finding names. No drive-by reformatting or renaming.
- **One finding class per commit.**
- **Regression test first for every `BLOCKER`.** Write it, watch it fail, fix, watch it pass. A fix with no prior failing test is an assumption.
- **Preserve public behavior** unless the behavior is the finding. Interface changes are separate, flagged commits.
- **If a fix needs changes outside scope, stop and report.** Do not expand scope mid-repair.
- **If a fix cannot be verified, do not apply it.** Propose it instead.

## 8. Deletion Requires Two Independent Signals

Grep alone is insufficient, and grep plus coverage are correlated — they miss the same things.

Run `knip` / `ts-prune` / `depcheck` / coverage and attach output. Then check these evader classes explicitly: **dynamic imports, string-based references, reflection, DI containers, framework file conventions (Next.js routing, decorators), config-driven registries, test-only fixtures, feature-flagged branches.**

**Exported symbols of a published package are never dead code.** Run `git blame` before deleting anything whose purpose isn't obvious.

## 9. Risk Tiers

| Tier | Examples | Required |
|---|---|---|
| **T0** | Copy, config values, styling tokens | CI gates only |
| **T1** | Isolated feature, no shared state | Review stages 1–7, 10–11 |
| **T2** | Shared module, new dependency, perf-sensitive path | Full review |
| **T3** | Schema, auth, payments, migration, external contract | Full review + `/launch-readiness` + named human reviewer |

When unsure, choose the higher tier.

## 10. Definition of "Working"

Numeric, not vibes. Fill these in before first launch:

- p95 latency on the critical path: `<TBD ms>`
- Error rate: `< TBD %`
- Crash-free sessions: `> TBD %`
- Journeys that must never break: `<list>`

The error budget derived from these is the rollback trigger — decided in advance, not argued about during an incident.

## 11. Standing Technical Constraints

**Types.** No `any` without an inline justification. Prefer `unknown` plus narrowing; watch for `as unknown as T` laundering. Runtime validation must agree with static types at every I/O boundary or the types are decoration.

**Errors.** Every `catch` handles, reports, or rethrows. Silent swallowing is a `BLOCKER`.

**State writes & telemetry.** Debounce for "user stopped"; throttle for continuous streams — debouncing a stream can mean the write never fires. Every debounced write flushes on `visibilitychange` and `pagehide`; never rely on `unload`. Idempotency keys bind to the **logical operation**, not the attempt — per-attempt keys plus retry produce the duplicates idempotency exists to prevent. Offline writes persist (IndexedDB) and replay on reconnect; an offline UI state is not durability. Live services process real requests, never mocked data.

**Security.** Authorization per handler: *this* user may act on *this* resource, including user A requesting user B's object by ID. Rotate exposed credentials — deleting from `HEAD` leaves them in git objects. Triage dependency vulnerabilities by reachability, not CVSS alone.

**Observability.** Structured logging at failure points, correlation IDs across services, error boundaries that report rather than just render a fallback.

**Time.** Inject the clock. Never call `Date.now()` inline in logic — untestable time means untestable DST, timezone, and idempotency-window bugs, and they surface months later.

**Accessibility.** Semantic HTML over `div` + click handler. Full keyboard path, visible focus, focus managed on route and modal changes, accessible names on all interactive elements.

**Documentation.** Behavior change updates README, JSDoc, env-var docs, and runbook in the same commit.

**Commits.** Atomic, revertable, refactors separated from behavior changes. Messages explain **why**. No concealed scaffolds — if a template was imported, the commit says so.

## 12. Enforced in CI — Do Not Re-check by Hand

Type coverage, lint, format · dead-code detection · dependency audit and secret scanning including history · bundle size budget · test suite and coverage floor · Lighthouse CI and a11y lint · every-commit-builds.

Anything automatable belongs here, not in a checklist a human must remember. A protocol too long to follow gets rubber-stamped, and a rubber stamp is worse than no protocol because it supplies false assurance.

## 13. Amendment Loop

After every production incident, the corrective action is a new CI gate or a new line in this file — not a resolution to be more careful. This document is edited by real failures, not by speculation.
