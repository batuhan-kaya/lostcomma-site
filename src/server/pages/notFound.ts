import { html } from '../html';
import type { Page } from '../page';
import { href } from '../routes';

/** Phase 0 version. The undo history and site search arrive in phase 10. */
export const notFound: Page = {
  id: 'notFound',
  theme: 'paper',
  bare: true,
  noindex: true,
  title: (t) => t('Sayfa bulunamadı'),
  description: (t) => t('Bu adreste bir sayfa yok.'),
  body: (ctx) => html`<section class="stub nf" data-sec="hero">
<div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>404</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="h1">${ctx.t('Bu sayfa silindi.')}</h1>
<p class="lede">${ctx.t('Ya da hiç var olmadı. Her iki durumda da bu adreste bir şey yok.')}</p>
<p><a class="cta" href="${href(ctx.lang, 'home')}">${ctx.t('Ana sayfaya dön')}</a></p>
</div>
</section>`,
};
