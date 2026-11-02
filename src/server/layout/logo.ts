import { html, type Safe } from '../html';
import { MARK } from '../../shared/logo';

/**
 * The mark as inline SVG. Beside the name it is one size with it (.lc-mark in chrome.css: the corner is
 * as tall as the l · the comma hangs under the baseline). `draw` gives the paths a length of 1 so
 * CSS can draw them with a pen (the footer).
 */
export function mark(cls: string, o: { draw?: boolean } = {}): Safe {
  const len = o.draw ? html` pathLength="1"` : '';
  return html`<svg class="${cls}" viewBox="0 0 ${MARK.w} ${MARK.h}" aria-hidden="true" focusable="false"><path class="lc-t"${len} d="${MARK.top}"></path><path class="lc-c"${len} d="${MARK.comma}"></path></svg>`;
}

/** Mark and name in one line: the header logo · the panel uses its own text beside the same mark. */
export function lockup(): Safe {
  return html`<span class="lc-lock">${mark('lc-mark')}<span>lost</span><b class="lgc egg" aria-hidden="true">,</b><span class="caret"> </span><span>comma</span></span>`;
}
