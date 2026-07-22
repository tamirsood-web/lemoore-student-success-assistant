/**
 * chat-window.js
 *
 * Behaviour for the Chat Window component.
 *
 * Responsibilities:
 *   1. Expand/collapse toggle via the middle header control.
 *   2. Update aria-expanded and aria-label on the toggle button.
 *
 * No modal behavior. No backdrop. No focus trap. No page blocking.
 *
 * Usage — automatic init via data attribute:
 *   <button class="btn btn--icon" data-chat-window-expand aria-label="Expand chat window" aria-expanded="false">
 *     …
 *   </button>
 *
 *   The button must be inside a .chat-window element.
 *
 * Usage — manual:
 *   import { initChatWindowExpand } from './chat-window.js';
 *   initChatWindowExpand(button);
 */

'use strict';

var EXPANDED_CLASS = 'chat-window--expanded';
var LABEL_EXPAND   = 'Expand chat window';
var LABEL_COLLAPSE = 'Collapse chat window';

/**
 * Toggles the expanded state on the closest .chat-window ancestor.
 *
 * @param {HTMLButtonElement} button — the expand/collapse toggle button
 */
function toggleExpand(button) {
  var chatWindow = button.closest('.chat-window');
  if (!chatWindow) return;

  var isExpanded = chatWindow.classList.toggle(EXPANDED_CLASS);

  button.setAttribute('aria-expanded', String(isExpanded));
  button.setAttribute('aria-label', isExpanded ? LABEL_COLLAPSE : LABEL_EXPAND);
}

/**
 * Attaches expand/collapse behavior to a single button.
 *
 * @param {HTMLButtonElement} button
 */
function initChatWindowExpand(button) {
  if (!(button instanceof HTMLElement)) {
    console.warn('chat-window.js: initChatWindowExpand() requires an HTMLElement.', button);
    return;
  }

  button.addEventListener('click', function () {
    toggleExpand(this);
  });
}

/**
 * Auto-initialises all buttons that carry [data-chat-window-expand].
 */
function autoInit() {
  document
    .querySelectorAll('[data-chat-window-expand]')
    .forEach(initChatWindowExpand);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initChatWindowExpand };
}
