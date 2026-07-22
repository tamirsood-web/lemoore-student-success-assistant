# Message Bubble

A layout container for chat messages. Provides background color, asymmetric border radius, and padding. Nothing else.

Source: [Figma DS-course · node 234:684](https://www.figma.com/design/3VxuDMd9Wva3mjoG7FBgj3/%F0%9F%91%A9%F0%9F%8F%BB%E2%80%8D%F0%9F%92%BBDS-course?node-id=234-684)

---

## Files

| File | Purpose |
|---|---|
| `message-bubble.css` | Component styles — consumes `--bubble-*` tokens only |
| `message-bubble-demo.html` | Visual reference with all variants and content examples |

---

## Required load order

```html
<link rel="stylesheet" href="../../tokens/primitives.css" />
<link rel="stylesheet" href="../../tokens/semantic.css" />
<link rel="stylesheet" href="../../tokens/components.css" />
<link rel="stylesheet" href="message-bubble.css" />
```

---

## HTML structure

```html
<div class="message-bubble message-bubble--agent">
  <div class="message-bubble__content">
    <!-- any HTML here -->
  </div>
</div>
```

```html
<div class="message-bubble message-bubble--user">
  <div class="message-bubble__content">
    <!-- any HTML here -->
  </div>
</div>
```

The `.message-bubble__content` slot is empty by default. The application is responsible for inserting content and applying its own typography, spacing, and layout.

---

## Variants

| Class | Background | Pointer corner | Use for |
|---|---|---|---|
| `message-bubble--agent` | `#dedede` (gray) | top-left = 4px | AI / assistant messages |
| `message-bubble--user` | `#e5e9ef` (blue-tinted) | bottom-right = 4px | Human user messages |

The "pointer corner" is the small-radius corner (4px) that creates the chat-bubble tail direction. All other corners use the default radius (16px).

---

## What this component does

- Sets background color per variant
- Sets asymmetric border radius per variant
- Sets padding (24px all sides)
- Sizes to fit content (`width: fit-content; max-width: 100%`)

## What this component does NOT do

- Apply typography (font, size, color, line-height)
- Render text
- Include an avatar
- Include a timestamp
- Include message actions (copy, delete, react)
- Handle attachments or file cards
- Execute JavaScript

All of the above are application-level concerns. Insert them as HTML content inside `.message-bubble__content`.

---

## Content examples

The content slot accepts anything:

```html
<!-- Plain text (typography applied by the application) -->
<div class="message-bubble message-bubble--agent">
  <div class="message-bubble__content">
    <p class="your-typography-class">Hello! How can I help?</p>
  </div>
</div>

<!-- Image -->
<div class="message-bubble message-bubble--user">
  <div class="message-bubble__content">
    <img src="photo.jpg" alt="Uploaded photo" />
  </div>
</div>

<!-- Custom component -->
<div class="message-bubble message-bubble--agent">
  <div class="message-bubble__content">
    <file-card name="report.pdf" size="1.2 MB"></file-card>
  </div>
</div>

<!-- Table -->
<div class="message-bubble message-bubble--agent">
  <div class="message-bubble__content">
    <table>…</table>
  </div>
</div>
```

---

## Conversation layout

Aligning bubbles left or right in a conversation is the application's responsibility, not this component's. A typical pattern:

```css
.conversation { display: flex; flex-direction: column; gap: 12px; }
.conversation .message-bubble--agent { align-self: flex-start; }
.conversation .message-bubble--user  { align-self: flex-end; }
```

---

## Design tokens

All values come from `../../tokens/components.css` via `--bubble-*` properties.

| Token | Value | Source |
|---|---|---|
| `--bubble-padding-x` | `24px` | `Bubble/Padding/X` |
| `--bubble-padding-y` | `24px` | `Bubble/Padding/Y` |
| `--bubble-radius-default` | `16px` | `Bubble/Border/Default` |
| `--bubble-radius-point` | `4px` | `Bubble/Border/Point` |
| `--bubble-bg-agent` | `#dedede` | `Bubble/Color/Agent` |
| `--bubble-bg-user` | `#e5e9ef` | `Bubble/Color/User` |

To change a value: edit the appropriate layer in `tokens/` — never write raw values in `message-bubble.css`.
