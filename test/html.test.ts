import { describe, expect, it } from 'vitest';
import { cx, esc, html, raw, Safe } from '../src/server/html';

describe('html', () => {
  it('escapes interpolated strings', () => {
    expect(html`<p>${'<script>"x" & \'y\'</script>'}</p>`.value).toBe('<p>&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;</p>');
  });

  it('keeps nested templates and raw() as they are', () => {
    const inner = html`<b>${'a<b'}</b>`;
    expect(html`<p>${inner}${raw('<i>ok</i>')}</p>`.value).toBe('<p><b>a&lt;b</b><i>ok</i></p>');
  });

  it('joins arrays and drops null · undefined · booleans', () => {
    expect(html`${[1, 'two', null, undefined, false, true, html`<br>`]}`.value).toBe('1two<br>');
  });

  it('returns Safe', () => {
    expect(html`x`).toBeInstanceOf(Safe);
    expect(String(html`x${1}`)).toBe('x1');
  });

  it('escapes attribute breakers', () => {
    expect(esc('" onload="x')).toBe('&quot; onload=&quot;x');
  });

  it('cx skips falsy class names', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });
});
