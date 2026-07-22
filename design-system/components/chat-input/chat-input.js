/**
 * chat-input.js
 *
 * Behaviour for the Chat Input component.
 *
 * Responsibilities:
 *   1. Auto-expand the textarea as text wraps onto new lines.
 *   2. Stop expanding at --chat-input-max-height; scroll internally after that.
 *   3. Enter  → submit (only when value contains non-whitespace text).
 *   4. Shift+Enter → insert newline (no submit).
 *   5. Dispatch a custom "chat-input:submit" event on the textarea element
 *      carrying { value } so the host application can handle the message.
 *      No chatbot logic is implemented here.
 *
 * Usage — automatic init via data attribute:
 *   <div class="chat-input">
 *     <textarea class="chat-input__textarea" data-chat-input></textarea>
 *   </div>
 *
 * Usage — manual init:
 *   import { initChatInput } from './chat-input.js';
 *   const textarea = document.querySelector('.chat-input__textarea');
 *   initChatInput(textarea);
 *
 * Usage — listening for submit:
 *   textarea.addEventListener('chat-input:submit', (e) => {
 *     console.log(e.detail.value); // trimmed message text
 *   });
 */

'use strict';

/**
 * Reads --chat-input-max-height from the computed style of the textarea
 * and returns it as a pixel number. Falls back to 200 if the token is
 * not found or cannot be parsed.
 *
 * @param {HTMLTextAreaElement} textarea
 * @returns {number}
 */
function getMaxHeight(textarea) {
  const raw = getComputedStyle(textarea)
    .getPropertyValue('--chat-input-max-height')
    .trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 200;
}

/**
 * Recalculates the height of the textarea to fit its content.
 * Switches overflow-y between 'hidden' and 'auto' at max-height.
 *
 * @param {HTMLTextAreaElement} textarea
 */
function resize(textarea) {
  const maxHeight = getMaxHeight(textarea);

  // Collapse to auto so scrollHeight reflects actual content height
  textarea.style.height = 'auto';

  if (textarea.scrollHeight >= maxHeight) {
    textarea.style.height = maxHeight + 'px';
    textarea.style.overflowY = 'auto';
  } else {
    textarea.style.height = textarea.scrollHeight + 'px';
    textarea.style.overflowY = 'hidden';
  }
}

/**
 * Dispatches a "chat-input:submit" custom event on the textarea element.
 * The event bubbles so parent containers can listen at any level.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {string} value  — trimmed message text
 */
function dispatchSubmit(textarea, value) {
  const event = new CustomEvent('chat-input:submit', {
    bubbles:    true,
    cancelable: true,
    detail:     { value },
  });
  textarea.dispatchEvent(event);
}

/**
 * Clears the textarea and resets its height to the CSS minimum.
 *
 * @param {HTMLTextAreaElement} textarea
 */
function clear(textarea) {
  textarea.value = '';
  textarea.style.height = 'auto';
  textarea.style.overflowY = 'hidden';
}

/**
 * Attaches all behaviour to a single textarea element.
 *
 * @param {HTMLTextAreaElement} textarea
 */
function initChatInput(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement)) {
    console.warn('chat-input.js: initChatInput() requires an HTMLTextAreaElement.', textarea);
    return;
  }

  // Set initial height from content (handles pre-filled values on page load)
  resize(textarea);

  // ── Auto-expand on input ──────────────────────────────────────
  textarea.addEventListener('input', function () {
    resize(this);
  });

  // ── Keyboard submit / newline ─────────────────────────────────
  textarea.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;

    if (event.shiftKey) {
      // Shift+Enter: let the browser insert a newline, then resize
      // No preventDefault — browser handles the newline insertion
      requestAnimationFrame(() => resize(this));
      return;
    }

    // Enter without Shift: attempt submit
    event.preventDefault();

    const value = this.value.trim();

    // Do not submit empty or whitespace-only content
    if (!value) return;

    dispatchSubmit(this, value);
    clear(this);
  });
}

/**
 * Auto-initialises all textarea elements that carry [data-chat-input].
 * Runs after DOMContentLoaded so the script can be placed in <head>.
 */
function autoInit() {
  document
    .querySelectorAll('textarea[data-chat-input]')
    .forEach(initChatInput);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  // DOMContentLoaded already fired (script loaded with defer or at end of body)
  autoInit();
}

// Named export for manual usage in module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initChatInput };
}
