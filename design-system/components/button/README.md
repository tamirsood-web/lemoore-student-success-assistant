# Button

A framework-neutral button component with four variants and five interactive states, implemented in plain HTML and CSS.

Source: [Figma DS-course · node 5:2418](https://www.figma.com/design/3VxuDMd9Wva3mjoG7FBgj3/%F0%9F%91%A9%F0%9F%8F%BB%E2%80%8D%F0%9F%92%BBDS-course?node-id=5-2418)

---

## Files

| File | Purpose |
|---|---|
| `button.css` | Component styles — consumes `--btn-*` tokens only |
| `button-demo.html` | Visual reference for all variants and states |

---

## Required load order

All three token layers must be loaded before `button.css`:

```html
<link rel="stylesheet" href="../../tokens/primitives.css" />
<link rel="stylesheet" href="../../tokens/semantic.css" />
<link rel="stylesheet" href="../../tokens/components.css" />
<link rel="stylesheet" href="button.css" />
```

---

## Variants

### Primary
Solid filled button. Use for the single primary action on a page.

```html
<button type="button" class="btn btn--primary">Label</button>
```

### Secondary
Subtle surface button. Use for secondary or supporting actions.

```html
<button type="button" class="btn btn--secondary">Label</button>
```

### Clean
Transparent background with no visible border. Use for low-emphasis or inline actions. Text and icon are black.

```html
<button type="button" class="btn btn--clean">Label</button>
```

### Icon (icon-only)
Circular icon button with no label. `aria-label` is **required**.

```html
<button type="button" class="btn btn--icon" aria-label="Describe the action">
  <svg class="btn__icon" aria-hidden="true" viewBox="0 0 16 16">…</svg>
</button>
```

---

## Icons alongside labels

Any variant except `btn--icon` accepts an optional icon on either or both sides. Icons must carry `aria-hidden="true"`.

```html
<!-- Start icon -->
<button type="button" class="btn btn--primary">
  <svg class="btn__icon" aria-hidden="true" viewBox="0 0 16 16">…</svg>
  Label
</button>

<!-- End icon -->
<button type="button" class="btn btn--secondary">
  Label
  <svg class="btn__icon" aria-hidden="true" viewBox="0 0 16 16">…</svg>
</button>

<!-- Both sides -->
<button type="button" class="btn btn--clean">
  <svg class="btn__icon" aria-hidden="true" viewBox="0 0 16 16">…</svg>
  Label
  <svg class="btn__icon" aria-hidden="true" viewBox="0 0 16 16">…</svg>
</button>
```

---

## States

All states are handled by CSS — no extra classes or JavaScript required.

| State | Mechanism |
|---|---|
| Default | Base styles |
| Hover | `:hover` |
| Focus | `:focus-visible` (keyboard only — not triggered by mouse click) |
| Active | `:active` |
| Disabled | Native `disabled` attribute |

```html
<!-- Disabled — any variant -->
<button type="button" class="btn btn--primary" disabled>Label</button>
```

Do not use `pointer-events: none` alone to disable a button — always use the native `disabled` attribute so assistive technologies report the correct state.

---

## Accessibility

- Always use a native `<button>` element, not `<div>` or `<span>`.
- Always set `type="button"` explicitly to prevent accidental form submission.
- Icon-only buttons (`btn--icon`) **must** have a descriptive `aria-label`.
- Icons are presentational — always set `aria-hidden="true"` on them.
- The focus ring uses `:focus-visible`, which appears on keyboard navigation and is suppressed on mouse click. Do not remove it.
- For text variants, `aria-label` may be used to provide additional context when the visible label is ambiguous (e.g. "Delete" → `aria-label="Delete document"`).

---

## Design tokens

All visual values come from `../../tokens/components.css` via `--btn-*` custom properties. To change a value, update the token in the appropriate layer:

- Raw value change → `tokens/primitives.css`
- Role reassignment → `tokens/semantic.css`
- Button-specific override → `tokens/components.css`

Never hard-code values in `button.css`.
