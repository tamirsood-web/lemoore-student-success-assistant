# Chat Input

A labeled, auto-expanding textarea for composing chat messages.

Source: [Figma DS-course · node 34:218](https://www.figma.com/design/3VxuDMd9Wva3mjoG7FBgj3/%F0%9F%91%A9%F0%9F%8F%BB%E2%80%8D%F0%9F%92%BBDS-course?node-id=34-218)

---

## Files

| File | Purpose |
|---|---|
| `chat-input.css` | Component styles — consumes `--chat-input-*` tokens only |
| `chat-input.js` | Auto-expand, submit, and newline behaviour |
| `chat-input-demo.html` | Visual reference for all variants and states |

---

## Required load order

```html
<link rel="stylesheet" href="../../tokens/primitives.css" />
<link rel="stylesheet" href="../../tokens/semantic.css" />
<link rel="stylesheet" href="../../tokens/components.css" />
<link rel="stylesheet" href="chat-input.css" />
<!-- JS at end of body or with defer -->
<script src="chat-input.js"></script>
```

---

## HTML structure

```html
<div class="chat-input">
  <label class="chat-input__label" for="my-input">Label</label>
  <textarea
    class="chat-input__textarea"
    id="my-input"
    placeholder="Placeholder text"
    rows="1"
    data-chat-input
  ></textarea>
</div>
```

The `data-chat-input` attribute triggers automatic initialisation. No additional JavaScript call is needed.

---

## Variants (from Figma)

| Variant | Visual |
|---|---|
| Default | White background, gray border (`#9d9d9d`) |
| Hover | Gray background (`#dedede`), gray border |
| Active / Focus | White background, blue border (`#335183`) |
| Disabled | White background, light gray border (`#dedede`), near-white text |

---

## States

All visual states are handled by CSS pseudo-classes. No extra classes or props required.

| State | Mechanism |
|---|---|
| Default | Base styles |
| Hover | `:hover:not(:disabled):not(:focus)` |
| Focus / Active | `:focus` — blue border, white background |
| Disabled | Native `disabled` attribute |

---

## Behaviour

### Auto-expand

The textarea starts at its minimum height (one line of text + padding + border = 50px). On each keystroke, JavaScript recalculates the height from `scrollHeight`. When content exceeds `--chat-input-max-height` (200px), the height is clamped and `overflow-y` switches to `auto` enabling internal scrolling.

### Keyboard submit

| Key | Action |
|---|---|
| `Enter` | Submit — fires `chat-input:submit` event, then clears the field |
| `Shift+Enter` | Insert a new line — no submit |
| `Enter` (empty) | No action — whitespace-only content is blocked |

### Submit event

On submit, a `chat-input:submit` CustomEvent is dispatched on the `<textarea>` element. It bubbles so any ancestor can listen.

```js
textarea.addEventListener('chat-input:submit', function (event) {
  console.log(event.detail.value); // trimmed message text
  // send to your API, add to message list, etc.
});
```

No chatbot logic is included in this component.

---

## Without visible label

When the label must be hidden visually, use `.chat-input__label--hidden`. The label remains in the DOM for screen readers — never omit it entirely.

```html
<div class="chat-input">
  <label class="chat-input__label chat-input__label--hidden" for="my-input">
    Chat message
  </label>
  <textarea
    class="chat-input__textarea"
    id="my-input"
    placeholder="Type a message…"
    rows="1"
    data-chat-input
  ></textarea>
</div>
```

---

## Manual initialisation

If you cannot use `data-chat-input` (e.g. the element is rendered after page load):

```js
const textarea = document.querySelector('.chat-input__textarea');
initChatInput(textarea); // exported by chat-input.js via module.exports
```

---

## Accessibility

- Always use a `<label>` element associated via `for`/`id` — not just a visual heading.
- If the label must be hidden, use `.chat-input__label--hidden` (visually hidden, accessible).
- The `disabled` attribute must be used for disabled state — CSS alone is not sufficient.
- The `::placeholder` color (`#5c5c5c` on `#ffffff`) meets WCAG AA contrast for normal text.
- The `disabled` placeholder color (`#ebebeb` on `#ffffff`) does not meet WCAG contrast — this is a known design system issue; disabled fields are conventionally exempt.
- `resize: none` prevents unintended layout disruption while still allowing keyboard accessibility.

---

## Design tokens

All visual values come from `../../tokens/components.css` via `--chat-input-*` custom properties.

To change a value:
- Raw value change → `tokens/primitives.css`
- Role reassignment → `tokens/semantic.css`
- Component-specific override → `tokens/components.css`

Never write raw values in `chat-input.css`.
