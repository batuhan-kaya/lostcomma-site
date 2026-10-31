import { raw, type Safe } from '../../html';

/**
 * Drawings for the sample case study (the sailing club). They stand in for real images:
 *   SAIL_COVER  the hero cover (sun · swaying sail · moving sea)
 *   SAIL_MOCK   the club website inside the history frame. Its look follows the frame's
 *               .vs-0 … .vs-5 class: sketch · wireframe · look and motion · built · live · app.
 * They draw a client's site, so their words stay as the client wrote them and they are hidden
 * from screen readers (the frame carries a label). Positions are classes: the CSP allows no style="".
 */
export const SAIL_COVER: Safe = raw(
  '<span class="sailcover" aria-hidden="true"><i class="sun"></i><i class="sea"></i><span class="cboat"><i></i><i></i><i></i></span></span>',
);

export const SAIL_MOCK: Safe = raw(`<div class="mock" aria-hidden="true">
<div class="chrome"><i></i><i></i><i></i><span class="bar"><svg viewBox="0 0 12 12"><rect x="2.5" y="5.5" width="7" height="5" rx="1"></rect><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"></path></svg><span>sailing club</span></span><span class="live">Live · v1.0</span></div>
<div class="site">
<div class="snav blk"><span class="slogo"><i></i><span class="tx">Sailing club</span></span><span class="slinks"><span class="tx">Regattas</span><span class="tx">School</span><span class="tx">Boats</span><span class="tx">Club</span></span><span class="sbtn blk2"><span class="tx">Book a boat</span></span></div>
<div class="shero">
<div class="scopy blk"><span class="sh1 tx">Wind is up.</span><span class="sp tx">Book a boat in three taps and be on the water by ten.</span><span class="sbtn2 blk2"><span class="tx">Book now</span></span></div>
<div class="simg blk"><i></i><i></i><i></i><span class="wind blk2"><svg viewBox="0 0 20 20"><path d="M10 17V3M5 8l5-5 5 5"></path></svg><span class="tx">NE 14 kn</span></span></div>
</div>
<div class="sreg">
<div class="scard blk"><span class="k tx">12 Apr</span><b class="tx">Spring cup</b><span class="tx2 tx">48 boats · Moda</span></div>
<div class="scard blk"><span class="k tx">03 May</span><b class="tx">Night race</b><span class="tx2 tx">Lights on · 21:00</span></div>
<div class="scard blk"><span class="k tx">01 Jun</span><b class="tx">Bosphorus run</b><span class="tx2 tx">Two continents</span></div>
</div>
</div>
<div class="ov ov-sk">
<svg viewBox="0 0 1000 625" preserveAspectRatio="none"><path d="M330 150 C 360 120 400 118 430 140"></path><path d="M420 130 L432 142 L414 146"></path><path d="M760 70 C 800 40 840 44 860 62"></path><path d="M852 50 L862 64 L846 66"></path><path d="M200 560 C 260 600 340 600 380 575"></path></svg>
<span class="hn n1">big sunset hero</span><span class="hn n2">book button!!</span><span class="hn n3">races · always visible</span><span class="hn n4">real wind?</span>
</div>
<div class="ov ov-x"><svg viewBox="0 0 1000 625" preserveAspectRatio="none"><path d="M418 127 L960 417 M960 127 L418 417"></path></svg></div>
<div class="ov ov-mo">
<svg viewBox="0 0 1000 625" preserveAspectRatio="none"><path d="M560 300 C 600 250 660 250 700 300"></path><path class="k" d="M692 290 L702 302 L688 306"></path><path d="M90 520 C 300 470 520 470 920 520"></path><path d="M440 410 C 470 360 520 360 545 400"></path></svg>
<span class="mt m1">sail · sway 5s · ease in out</span><span class="mt m2">arrow follows real wind</span><span class="mt m3">cards rise · 80ms apart</span>
</div>
<div class="ov ov-co">
<i class="cbox b1"></i><span class="ct t1">&lt;Nav /&gt;</span>
<i class="cbox b2"></i><span class="ct t2">&lt;Hero /&gt;</span>
<i class="cbox b3"></i><span class="ct t3">&lt;Picture /&gt;</span>
<i class="cbox b4"></i><span class="ct t4">&lt;RegattaList /&gt;</span>
<span class="build"><i class="caret"></i>build passed</span>
</div>
<div class="phone"><div class="pscr"><span class="k">Book a boat</span><b>Pick a boat</b><span class="boat on"><i></i>J/70<em>4 crew</em></span><span class="boat"><i></i>Laser<em>1 crew</em></span><span class="boat"><i></i>RS Feva<em>2 crew</em></span><span class="pbtn">Sat 10:00 · Book</span></div></div>
</div>`);
