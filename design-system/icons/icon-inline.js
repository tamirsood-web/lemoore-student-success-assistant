/**
 * icon-inline.js
 *
 * Replaces <img data-icon> elements with inline SVG fetched from their src.
 * This allows SVG stroke/fill="currentColor" to inherit from the parent CSS color.
 *
 * Usage:
 *   <img data-icon class="btn__icon" src="../../icons/sent.svg" alt="" aria-hidden="true" />
 *
 * After this script runs, the <img> is replaced with the inline <svg> element.
 * The SVG inherits all classes and aria attributes from the original <img>.
 *
 * Attributes preserved: class, aria-hidden, aria-label, role, style, width, height.
 * Attributes removed: src, data-icon (no longer needed on inline SVG).
 */

'use strict';

(function () {
  var cache = {};

  function inlineIcon(img) {
    var src = img.getAttribute('src');
    if (!src) return;

    var promise = cache[src] || (cache[src] = fetch(src).then(function (r) { return r.text(); }));

    promise.then(function (svgText) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(svgText, 'image/svg+xml');
      var svg = doc.querySelector('svg');
      if (!svg) return;

      // Transfer classes
      if (img.className) {
        svg.setAttribute('class', img.className);
      }

      // Transfer accessibility attributes
      var ariaHidden = img.getAttribute('aria-hidden');
      if (ariaHidden) svg.setAttribute('aria-hidden', ariaHidden);

      var ariaLabel = img.getAttribute('aria-label');
      if (ariaLabel) svg.setAttribute('aria-label', ariaLabel);

      var role = img.getAttribute('role');
      if (role) svg.setAttribute('role', role);

      // Transfer inline style (if any)
      var style = img.getAttribute('style');
      if (style) svg.setAttribute('style', style);

      // Remove fixed width/height attributes so CSS sizing takes over
      svg.removeAttribute('width');
      svg.removeAttribute('height');

      // Replace the img with the inline SVG
      img.parentNode.replaceChild(svg, img);
    }).catch(function () {
      // Silently fail — img remains visible as fallback
    });
  }

  function init() {
    document.querySelectorAll('img[data-icon]').forEach(inlineIcon);
  }

  // Observe for dynamically added icons
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('img[data-icon]')) {
            inlineIcon(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('img[data-icon]').forEach(inlineIcon);
          }
        });
      });
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        init();
        observer.observe(document.body, { childList: true, subtree: true });
      });
    } else {
      init();
      observer.observe(document.body, { childList: true, subtree: true });
    }
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
