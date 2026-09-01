# Layout, Animation & Rendering Rules

Read before touching CSS, animation, or overlay positioning. Every rule here names a **precondition** — verify it holds before applying. A rule applied where it doesn't apply is a new bug with a citation attached.

---

## 1. Animation

**Animate compositor properties only: `transform` and `opacity`.** Animating `width`, `height`, `top`, `left`, `margin`, or `padding` forces layout every frame, and no containment rule saves it. This single rule outweighs everything else in this file.

Prefer `translate3d` / `will-change` sparingly and remove `will-change` after the animation — leaving it on permanently costs memory on every layer.

## 2. Forced Synchronous Layout

Reading a layout property after a style write forces the browser to flush layout to answer the query. Inside a loop, this flushes every iteration. **This is the most common real source of jank.**

Layout-forcing reads: `offsetTop/Left/Width/Height`, `clientWidth/Height`, `scrollTop/Left/Width/Height`, `getBoundingClientRect()`, `getComputedStyle()`, `focus()`.

**The fix is batching: perform all reads, then all writes.** Containment makes each flush cheaper but does **not** prevent the flush. Do not attribute this fix to containment.

## 3. CSS Containment — Preconditions Required

`contain` is a scoping hint, not a general performance switch. It does **nothing** for overlap, collision, or z-order problems.

**`contain: paint`** clips descendants to the padding box. Precondition: nothing inside ever renders outside its own box. Dropdowns, tooltips, popovers, flyout pickers, focus rings, and box shadows all break silently under it. Overlay and toolbar components are disproportionately the ones that overflow, so a blanket rule there is actively harmful.

**`contain: layout`** makes the element a containing block for absolutely positioned descendants. Precondition: nothing inside is anchored to an outer ancestor. Adding it can silently reposition existing absolute children.

**`contain: style`** only scopes counters and quotes. It does nothing for animation smoothness. Do not include it reflexively in a triplet.

**Required after applying any containment:** open every flyout, dropdown, and tooltip in the subtree and confirm nothing is clipped.

**Prefer `content-visibility: auto`** for long offscreen lists — it usually beats containment for scroll performance.

## 4. Stacking & Overlap

**Overlap is a space problem; z-index is an order problem.** If a floating element covers content, raising its z-index makes it cover the content harder. The fix is reserving space, not layering.

**`isolation: isolate` on a parent scopes its children's z-index.** A child's z-index can no longer compete with anything outside that container. Setting `isolation` on a wrapper and raising z-index on its child is self-cancelling — verify which of the two you actually need.

**Before adding layers, check the simpler causes:** `overflow: hidden` on an ancestor, an existing stacking context created by `transform` / `filter` / `opacity < 1` / `will-change`, or the element simply not being where you think it is in the DOM.

**Use z-index tokens, never magic numbers.** `z-index: 5` and `z-index: 20` scattered across files is an unmaintainable ordering. Define a scale (`--z-base`, `--z-sticky`, `--z-overlay`, `--z-modal`) and reference it.

## 5. Overlay Positioning

Reserve space on the container rather than stacking over content:

```css
.container {
  position: relative;
  padding-block-end: calc(var(--deck-height) + 16px + env(safe-area-inset-bottom, 0px));
}

.overlay {
  position: absolute;
  inset-inline: 0;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  margin-inline: auto;
  width: max-content;
  z-index: var(--z-overlay);
  pointer-events: none;      /* wrapper must not eat clicks */
}
.overlay > * { pointer-events: auto; }
```

- **Always include `env(safe-area-inset-bottom)`** for bottom-anchored elements. Without it, iOS home-indicator devices clip the control.
- **Prefer `inset-inline: 0` + `margin-inline: auto` over `left: 50%` + `translateX(-50%)`.** Transform-centering causes subpixel blur on odd-width elements and creates a stacking context you may not want.
- **Absolute positioning removes an element from flow.** It has no structural box to overflow, so flex/grid containment is not the cause of an absolute element's collision. Diagnoses that invoke it are misdiagnoses.
- **Never use fixed pixel offsets to dodge a collision.** A magic `bottom: 16px` will not hold across viewport heights.

## 6. Required Verification for Any Layout Change

No layout change ships without all four:

1. Visual regression snapshots at **360×640, 768×1024, 1440×900**
2. Every flyout, dropdown, and tooltip in the affected subtree opened and confirmed unclipped
3. Keyboard traversal of the affected region, with focus visible throughout
4. Before/after Performance trace on a **mid-tier device** for any change justified on performance grounds

## 7. Measurement

- **Profile first.** No performance change without a before/after number. Blanket `useMemo` / `useCallback` has real cost and frequently makes things slower.
- **Structural wins first:** N+1 queries, unbounded loops, redundant round-trips — before micro-optimization.
- **Identify long main-thread tasks.** Compositor hints are irrelevant while JS is blocking.
- **State which metric moved:** perceived (LCP, INP, CLS, bundle size) or raw execution time. They do not always move together.
- Benchmarks on a dev machine measure the dev machine. Verify on a mid-tier Android under throttled network and thermal load.
