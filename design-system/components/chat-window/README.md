# Chat Window

A floating, non-modal chat interface panel with open/close and expand/collapse animations.

Source: [Figma DS-course · node 234:760](https://www.figma.com/design/3VxuDMd9Wva3mjoG7FBgj3/%F0%9F%91%A9%F0%9F%8F%BB%E2%80%8D%F0%9F%92%BBDS-course?node-id=234-760)

---

## Files

| File | Purpose |
|---|---|
| `chat-window.css` | Component styles + animations |
| `chat-window.js` | Expand/collapse toggle + open/close with animation |
| `chat-window-demo.html` | Interactive demo with all transitions |

---

## Dependencies

```html
<link rel="stylesheet" href="../../tokens/primitives.css" />
<link rel="stylesheet" href="../../tokens/semantic.css" />
<link rel="stylesheet" href="../../tokens/components.css" />
<link rel="stylesheet" href="../button/button.css" />
<link rel="stylesheet" href="../chat-input/chat-input.css" />
<link rel="stylesheet" href="chat-window.css" />
<script src="../chat-input/chat-input.js"></script>
<script src="chat-window.js"></script>
```

---

## Icons

Header buttons use SVG assets from `design-system/icons/`:

| Action | File | aria-label |
|---|---|---|
| Open in new tab | `icons/external-link.svg` | "Open in new tab" |
| Expand / Collapse | `icons/arrow-expand.svg` | "Expand chat window" / "Collapse chat window" |
| Minimize (close) | `icons/remove.svg` | "Minimize" |

Icons are loaded via `<img>` with `aria-hidden="true"` — they are decorative. Accessible names come from `aria-label` on the button.

---

## HTML structure

```html
<div id="wrapper" hidden>
  <div class="chat-window">
    <div class="chat-window__header">
      <h2 class="chat-window__title">Title</h2>
      <div class="chat-window__actions" role="group" aria-label="Window controls">
        <button class="btn btn--icon" aria-label="Open in new tab">
          <img class="btn__icon" src="…/icons/external-link.svg" alt="" aria-hidden="true" />
        </button>
        <button class="btn btn--icon" aria-label="Expand chat window" aria-expanded="false" data-chat-window-expand>
          <img class="btn__icon" src="…/icons/arrow-expand.svg" alt="" aria-hidden="true" />
        </button>
        <button class="btn btn--icon" aria-label="Minimize">
          <img class="btn__icon" src="…/icons/remove.svg" alt="" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div class="chat-window__body">
      <div class="chat-window__content"><!-- content --></div>
    </div>
    <div class="chat-window__footer">
      <!-- Chat Input + Button (reused, not duplicated) -->
    </div>
  </div>
</div>
```

---

## Open / Close

```js
openChatWindow(wrapperElement);   // removes [hidden], plays entrance animation
closeChatWindow(wrapperElement);  // plays exit animation, then sets [hidden]
```

| Phase | Animation | Duration |
|---|---|---|
| Enter | opacity 0→1, translateY(16px)→0, scale(0.95)→1 | 200ms ease-out |
| Exit | opacity 1→0, translateY(0)→16px, scale(1)→0.95 | 150ms ease-in |

During exit, `pointer-events: none` prevents interaction. After `animationend`, the wrapper is hidden.

---

## Expand / Collapse

Toggled by clicking `[data-chat-window-expand]`:

| State | Size | Position |
|---|---|---|
| Default | 451px × 469px | Application-controlled |
| Expanded | 75vw × 75vh | `position: fixed`, centered |

Transition uses `250ms ease` on width, height, top, left, and transform.

The toggle button updates:
- `aria-expanded="true"` / `"false"`
- `aria-label` between "Expand chat window" and "Collapse chat window"

---

## Reduced motion

When `prefers-reduced-motion: reduce`:
- All transitions are disabled (`transition: none`)
- Enter/exit animations are suppressed — the window appears/disappears instantly
- All functionality and state changes are preserved

---

## Accessibility

- No `role="dialog"` or `aria-modal` — not a modal
- Icon buttons have descriptive `aria-label`
- Icons use `aria-hidden="true"` — purely decorative
- `aria-expanded` tracks expand state
- Keyboard users can Tab into and out freely
- Content area scrolls; header/footer remain fixed

---

## What this component does NOT include

- Backdrop or overlay
- Focus trapping
- Loading or error states
- Message list logic
- Chatbot business logic
