# FAB (Floating Action Button)

A 56×56px circular elevated button displaying the eagle chatbot artwork.

Source: [Figma DS-course · node 286:610](https://www.figma.com/design/3VxuDMd9Wva3mjoG7FBgj3/%F0%9F%91%A9%F0%9F%8F%BB%E2%80%8D%F0%9F%92%BBDS-course?node-id=286-610)

---

## Files

| File | Purpose |
|---|---|
| `fab.css` | Component styles — consumes `--fab-*` tokens |
| `fab.js` | Placeholder for future behavior (component is fully functional via HTML + CSS) |
| `fab-demo.html` | Visual reference showing all states |

---

## Eagle artwork

The FAB uses the eagle chatbot logo from:

```
design-system/icons/eagle-headset.svg
```

- **viewBox:** `0 0 48 48`
- **Fill:** `white` (intentionally white — NOT currentColor)
- **The eagle is a brand asset**, not a generic icon
- Do NOT convert to `currentColor` — the white-on-blue appearance is intentional

---

## Required load order

```html
<link rel="stylesheet" href="../../tokens/primitives.css" />
<link rel="stylesheet" href="../../tokens/semantic.css" />
<link rel="stylesheet" href="../../tokens/components.css" />
<link rel="stylesheet" href="fab.css" />
```

---

## HTML structure

```html
<button type="button" class="fab" aria-label="Open chat assistant" title="Open chat assistant">
  <img class="fab__icon" src="../../icons/eagle-headset.svg" alt="" aria-hidden="true" />
</button>
```

---

## States

| State | Background | CSS mechanism |
|---|---|---|
| Default | `#02196e` (blue-900) | Base styles |
| Hover | `#163abf` (blue-700) | `:hover:not(:disabled)` |
| Focus | `#02196e` + white border | `:focus-visible` |
| Active | `#011248` (blue-800) | `:active:not(:disabled)` |
| Disabled | 40% opacity, no shadow | `:disabled` / `[aria-disabled]` |

---

## Design tokens

| Token | Value | Source |
|---|---|---|
| `--fab-size` | `56px` | Figma frame size |
| `--fab-radius` | `100px` (circular) | `Button/Border/Round` |
| `--fab-padding` | `4px` | `Button/FAB/Padding/X,Y` |
| `--fab-bg` | `#02196e` | `Button/FAB/BG/Default` |
| `--fab-bg-hover` | `#163abf` | `Button/FAB/BG/Hover` |
| `--fab-bg-active` | `#011248` | `Button/FAB/BG/Active` |
| `--fab-bg-focus` | `#02196e` | `Button/FAB/BG/Focus` |
| `--fab-border-focus` | `#ffffff` | `Button/FAB/Border/Focus` |
| `--fab-icon-color` | `#ffffff` | `Button/FAB/Text/Default` |
| `--fab-shadow` | two-layer | `Color/shadow-3` + `Color/shadow-4` |

---

## Rendering

The eagle artwork is loaded via `<img>` since it uses `fill="white"` (not `currentColor`). This is correct — the eagle is always white on the blue FAB background. The `<img>` approach works because the icon color is fixed white, not inherited.

For icons that need to inherit `currentColor`, use inline `<svg>` instead.

---

## Accessibility

- Use `<button>` element — native keyboard support (Enter, Space)
- `aria-label` is **required** — the FAB has no visible text
- `title` recommended for tooltip on hover
- Focus ring: 2px solid white with 2px offset
- `disabled` attribute removes from tab order and suppresses events
- `prefers-reduced-motion`: transitions disabled

---

## Positioning

The FAB CSS does not include `position: fixed`. Positioning is the application's responsibility:

```css
.my-fab-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 50;
}
```
