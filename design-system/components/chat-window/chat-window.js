/**
 * chat-window.js
 *
 * Behaviour for the Chat Window component.
 *
 * Responsibilities:
 *   1. Expand/collapse toggle via [data-chat-window-expand].
 *   2. Open with entrance animation via openChatWindow(element).
 *   3. Close with exit animation via closeChatWindow(element).
 *   4. Update aria-expanded and aria-label.
 *   5. Respect prefers-reduced-motion.
 *
 * No modal behavior. No backdrop. No focus trap. No page blocking.
 */

'use strict';

var EXPANDED_CLASS = 'chat-window--expanded';
var ENTERING_CLASS = 'chat-window--entering';
var EXITING_CLASS  = 'chat-window--exiting';

var LABEL_EXPAND   = 'Expand chat window';
var LABEL_COLLAPSE = 'Restore chat window';

/**
 * Returns true if reduced motion is preferred.
 */
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

var ANIMATING_CLASS = 'chat-window--animating';
var FLIP_DURATION = 500; // ms — matches CSS transition

/* ── Expand / Collapse (explicit geometry animation) ────────── */

var _flipLock = false; // prevents re-entry during animation

function toggleExpand(button) {
  var chatWindow = button.closest('.chat-window');
  if (!chatWindow) return;
  if (_flipLock) return; // ignore clicks during animation

  var isCurrentlyExpanded = chatWindow.classList.contains(EXPANDED_CLASS);

  // 1. Capture the CURRENT rendered rect (before any changes)
  var startRect = chatWindow.getBoundingClientRect();

  // 2. Determine the TARGET state
  var isExpanding = !isCurrentlyExpanded;

  // 3. Calculate target rect
  var targetTop, targetLeft, targetWidth, targetHeight;

  if (isExpanding) {
    // Target: 75vw × 75vh, centered (12.5vw, 12.5vh)
    targetWidth = window.innerWidth * 0.75;
    targetHeight = window.innerHeight * 0.75;
    targetTop = window.innerHeight * 0.125;
    targetLeft = window.innerWidth * 0.125;
  } else {
    // Target: compact size at its document-flow position
    // Temporarily remove expanded class to measure where it would land
    chatWindow.classList.remove(EXPANDED_CLASS);
    var compactRect = chatWindow.getBoundingClientRect();
    chatWindow.classList.add(EXPANDED_CLASS);
    targetWidth = compactRect.width;
    targetHeight = compactRect.height;
    targetTop = compactRect.top;
    targetLeft = compactRect.left;
  }

  // 4. Pin the element at its START position using fixed positioning + inline styles
  chatWindow.style.position = 'fixed';
  chatWindow.style.top = startRect.top + 'px';
  chatWindow.style.left = startRect.left + 'px';
  chatWindow.style.width = startRect.width + 'px';
  chatWindow.style.height = startRect.height + 'px';
  chatWindow.style.maxWidth = 'none';
  chatWindow.style.zIndex = '200';

  // Toggle the class now (this won't visually jump because inline styles override it)
  if (isExpanding) {
    chatWindow.classList.add(EXPANDED_CLASS);
  } else {
    chatWindow.classList.remove(EXPANDED_CLASS);
  }

  // Update ARIA and icons
  button.setAttribute('aria-expanded', String(isExpanding));
  button.setAttribute('aria-label', isExpanding ? LABEL_COLLAPSE : LABEL_EXPAND);
  button.setAttribute('title', isExpanding ? LABEL_COLLAPSE : LABEL_EXPAND);
  var expandIcon = button.querySelector('.chat-window__icon-expand');
  var restoreIcon = button.querySelector('.chat-window__icon-restore');
  if (expandIcon) expandIcon.style.display = isExpanding ? 'none' : '';
  if (restoreIcon) restoreIcon.style.display = isExpanding ? '' : 'none';

  // Reduced motion — jump to target immediately
  if (prefersReducedMotion()) {
    cleanupAfterAnimation(chatWindow, isExpanding);
    return;
  }

  // 5. Force reflow — commit the start position
  void chatWindow.offsetHeight;

  // 6. Add transition class and set TARGET values — animation begins
  _flipLock = true;
  chatWindow.classList.add(ANIMATING_CLASS);
  chatWindow.style.top = targetTop + 'px';
  chatWindow.style.left = targetLeft + 'px';
  chatWindow.style.width = targetWidth + 'px';
  chatWindow.style.height = targetHeight + 'px';

  function onEnd(e) {
    if (e && e.target !== chatWindow) return;
    chatWindow.removeEventListener('transitionend', onEnd);
    cleanupAfterAnimation(chatWindow, isExpanding);
    _flipLock = false;
  }

  chatWindow.addEventListener('transitionend', onEnd);

  // Safety timeout
  setTimeout(function () {
    if (_flipLock) {
      chatWindow.removeEventListener('transitionend', onEnd);
      cleanupAfterAnimation(chatWindow, isExpanding);
      _flipLock = false;
    }
  }, FLIP_DURATION + 100);
}

/**
 * Removes all temporary inline styles after the animation completes.
 * Leaves only the class-based layout in control.
 */
function cleanupAfterAnimation(chatWindow, isExpanded) {
  chatWindow.classList.remove(ANIMATING_CLASS);
  chatWindow.style.position = '';
  chatWindow.style.top = '';
  chatWindow.style.left = '';
  chatWindow.style.width = '';
  chatWindow.style.height = '';
  chatWindow.style.maxWidth = '';
  chatWindow.style.zIndex = '';
}

function initChatWindowExpand(button) {
  if (!(button instanceof HTMLElement)) return;
  button.addEventListener('click', function () {
    toggleExpand(this);
  });
}

/* ── Open / Close with animation ────────────────────────────── */

/**
 * Opens a chat window with entrance animation.
 * @param {HTMLElement} wrapper — the container that holds .chat-window (has [hidden])
 */
function openChatWindow(wrapper) {
  if (!wrapper) return;

  var chatWindow = wrapper.querySelector('.chat-window') || wrapper;

  wrapper.removeAttribute('hidden');
  wrapper.style.display = '';

  if (prefersReducedMotion()) return;

  chatWindow.classList.remove(EXITING_CLASS);
  chatWindow.classList.add(ENTERING_CLASS);

  chatWindow.addEventListener('animationend', function onEnd() {
    chatWindow.classList.remove(ENTERING_CLASS);
    chatWindow.removeEventListener('animationend', onEnd);
  });
}

/**
 * Closes a chat window with exit animation, then hides.
 * @param {HTMLElement} wrapper — the container that holds .chat-window (has [hidden])
 */
function closeChatWindow(wrapper) {
  if (!wrapper) return;

  var chatWindow = wrapper.querySelector('.chat-window') || wrapper;

  if (prefersReducedMotion()) {
    wrapper.setAttribute('hidden', '');
    return;
  }

  chatWindow.classList.remove(ENTERING_CLASS);
  chatWindow.classList.add(EXITING_CLASS);

  chatWindow.addEventListener('animationend', function onEnd() {
    chatWindow.classList.remove(EXITING_CLASS);
    wrapper.setAttribute('hidden', '');
    chatWindow.removeEventListener('animationend', onEnd);
  });
}

/* ── Auto-init ──────────────────────────────────────────────── */

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
  module.exports = { initChatWindowExpand, openChatWindow, closeChatWindow };
}
