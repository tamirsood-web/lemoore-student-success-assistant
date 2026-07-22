# Source Link

A pill-shaped hyperlink that references an external source associated with an assistant response.

Source: [Figma DS-course · node 234:790](https://www.figma.com/design/3VxuDMd9Wva3mjoG7FBgj3/%F0%9F%91%A9%F0%9F%8F%BB%E2%80%8D%F0%9F%92%BBDS-course?node-id=234-790)

---

## Files

| File | Purpose |
|---|---|
| `source-link.css` | Component styles — consumes `--source-link-*` tokens only |
| `source-link-demo.html` | Visual reference showing all states and contextual usage |

No JavaScript required.

---

## Required load order

```html
<link rel="stylesheet" href="../../tokens/primitives.css" />
<link rel="stylesheet" href="../../tokens/semantic.css" />
<link rel="stylesheet" href="../../tokens/components.css" />
<link rel="stylesheet" href="source-link.css" />
```

---

## HTML structure

```html
<a
  class="source-link"
  href="https://example.com/article"
  target="_blank"
  rel="noopener noreferrer"
>
  Article Title
</a>
```

**Required attributes:**

- `href` — the destination URL (configurable, not hardcoded)
- `target="_blank"` — opens in a new tab
- `rel="noopener noreferrer"` — security best practice

---

## States

All states are handled by CSS pseudo-classes — no JavaScript, no extra classes.

| State | Background | Border | Mechanism |
|---|---|---|---|
| Default | transparent | transparent | Base styles |
| Hover | `#dedede` | `#dedede` | `:hover` |
| Focus | transparent | `#335183` (blue) | `:focus-visible` |
| Active | `#bebebe` | `#bebebe` | `:active` |

Text color (`#121212`) remains constant across all states.

---

## Disabled appearance

If the link must appear disabled (e.g. source is unavailable):

```html
<a class="source-link" aria-disabled="true" tabindex="-1">
  Unavailable source
</a>
```

- Remove `href` to prevent navigation
- Set `aria-disabled="true"` for assistive tech
- Set `tabindex="-1"` to remove from tab order
- CSS applies `opacity: 0.5` and `pointer-events: none`

No disabled state exists in the Figma component — this is a minimal implementation addition for real-world usage.

---

## Typical context

Source links appear below an assistant's response:

```html
<div class="message-bubble message-bubble--agent">
  <div class="message-bubble__content">
    <p>Response text…</p>
  </div>
</div>

<div class="sources-row">
  <a class="source-link" href="…" target="_blank" rel="noopener noreferrer">Source 1</a>
  <a class="source-link" href="…" target="_blank" rel="noopener noreferrer">Source 2</a>
</div>
```

Layout of the sources row (gap, alignment) is the application's responsibility.

---

## Design tokens

| Token | Value | Source |
|---|---|---|
| `--source-link-padding-x` | `8px` | `Sources/Padding/X` |
| `--source-link-padding-y` | `4px` | `Sources/Padding/Y` |
| `--source-link-radius` | `100px` (pill) | `Sources/Border/Corner` |
| `--source-link-font-size` | `12px` | `copy/regular` |
| `--source-link-font-family` | Inter | `copy/regular` |
| `--source-link-font-weight` | 400 | `copy/regular` |
| `--source-link-color` | `#121212` | `Sources/Text/Default` |
| `--source-link-bg` | transparent | `Sources/BG/Default` |
| `--source-link-bg-hover` | `#dedede` | `Sources/BG/Hover` |
| `--source-link-bg-active` | `#bebebe` | `Sources/BG/Active` |
| `--source-link-border-focus` | `#335183` | `Sources/Border/Focus` |

---

## Accessibility

- Uses semantic `<a>` element — not a `<button>` or `<div>`
- Visible text serves as the accessible name
- Focus state has a visible blue border (`:focus-visible`)
- `target="_blank"` opens a new tab — screen readers announce this natively
- `rel="noopener noreferrer"` prevents reverse tab-napping
- Text contrast: `#121212` on transparent/light gray backgrounds passes WCAG AA
- Keyboard accessible: Tab to focus, Enter to activate

---

## Sizing

- Width: hug-content (grows with text)
- Height: hug-content (padding + 1 line of 12px text + borders ≈ 23px)
- No min-width or max-width constraints
