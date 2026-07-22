# Chat Window

A floating, non-modal chat interface panel with expand/collapse support.

Source: [Figma DS-course · node 234:760](https://www.figma.com/design/3VxuDMd9Wva3mjoG7FBgj3/%F0%9F%91%A9%F0%9F%8F%BB%E2%80%8D%F0%9F%92%BBDS-course?node-id=234-760)

---

## Files

| File | Purpose |
|---|---|
| `chat-window.css` | Component styles — default + expanded states |
| `chat-window.js` | Expand/collapse toggle behavior |
| `chat-window-demo.html` | Visual reference (inline and floating demos) |

---

## Non-modal behavior

- No backdrop or page dimming
- No page interaction blocked
- No focus trap
- No `aria-modal`
- Page remains fully scrollable and interactive
- Position determined by the application

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

## HTML structure

```html
<div class="chat-window">

  <!-- Header -->
  <div class="chat-window__header">
    <h2 class="chat-window__title">Chat-bot Name</h2>
    <div class="chat-window__actions" role="group" aria-label="Window controls">
      <button type="button" class="btn btn--icon" aria-label="Open in new tab">…</button>
      <button
        type="button"
        class="btn btn--icon"
        aria-label="Expand chat window"
        aria-expanded="false"
        data-chat-window-expand
      >…</button>
      <button type="button" class="btn btn--icon" aria-label="Minimize">…</button>
    </div>
  </div>

  <!-- Body — scrolls, accepts any HTML -->
  <div class="chat-window__body">
    <div class="chat-window__content">
      <!-- application content here -->
    </div>
  </div>

  <!-- Footer — reused Chat Input + Button -->
  <div class="chat-window__footer">
    <div class="chat-input">
      <label class="chat-input__label" for="msg-input">Message</label>
      <textarea class="chat-input__textarea" id="msg-input" placeholder="Placeholder text" rows="1" data-chat-input></textarea>
    </div>
    <button type="button" class="btn btn--primary">
      Send
      <svg class="btn__icon" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 14l12-6L2 2v5l8 1-8 1v5z"/>
      </svg>
    </button>
  </div>

</div>
```

---

## Expand / Collapse

The middle header button toggles `.chat-window--expanded` on the panel.

| State | Size | Position |
|---|---|---|
| Default (compact) | 451px × 469px | Determined by application |
| Expanded | 75vw × 75vh | `position: fixed`, centered in viewport |

### Attributes on the toggle button:

- `data-chat-window-expand` — triggers auto-init by `chat-window.js`
- `aria-expanded="false"` / `"true"` — updated by JS on toggle
- `aria-label` — switches between "Expand chat window" and "Collapse chat window"

The transition between states is animated (250ms ease on width + height).

---

## Layout behavior

| Region | Behavior |
|---|---|
| `.chat-window` | Flex column, fixed size or expanded |
| `.chat-window__header` | `flex-shrink: 0` — always visible |
| `.chat-window__body` | `flex: 1 1 0; overflow-y: auto` — fills and scrolls |
| `.chat-window__footer` | `flex-shrink: 0` — always visible |

---

## Accessibility

- The expand toggle must have `aria-expanded` and a descriptive `aria-label`
- All header icon buttons need `aria-label`
- Footer textarea requires a `<label>` (visually hidden inside the component)
- No `role="dialog"` — this is not a dialog
- Keyboard users can Tab into and out of the chat window freely

---

## What this component does NOT include

- Backdrop or overlay
- Focus trapping
- Open/close animation (expand only — not show/hide)
- Loading or error states
- Message list or conversation logic
- Chatbot business logic
