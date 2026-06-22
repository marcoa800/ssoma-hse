import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase.js";

// CSS y markup portados 1:1 desde el diseño original (Medicloud Safety).
// Se rellenan mediante scripts/gen_login.cjs a partir de LoginScreen.html.
const LOGIN_CSS = `:root {
  --bg: #04112b;
  --navy: #0a2455;
  --accent: #1ca5dc;
  --accent2: #0a6cb8;
  --text: #dce8f4;
  --dim: #3a597e;
  --card: rgba(8,24,52,0.94);
  --border: rgba(28,165,220,0.22);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:var(--bg);font-family:'Courier New',monospace}
body::before{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
  background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.07) 3px,rgba(0,0,0,.07) 4px)
}

/* ── CANVASES ── */
#canvas-matrix,#canvas-atmos{position:fixed;inset:0;width:100%;height:100%}
#canvas-matrix{z-index:0;transition:opacity 1.8s,filter 1.8s}
#canvas-matrix.dimmed{opacity:.1;filter:blur(4px) brightness(.4)}
#canvas-atmos{z-index:1;pointer-events:none}

/* ── INTRO ── */
#intro{
  position:fixed;inset:0;z-index:10;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:clamp(.8rem,2vh,1.5rem);
  transition:opacity .9s ease
}
#intro.out{opacity:0;pointer-events:none}

/* corners */
.crn{position:absolute;width:48px;height:48px;border-style:solid;border-color:rgba(255,255,255,.14)}
.crn.tl{top:1.2rem;left:1.2rem;border-width:2px 0 0 2px}
.crn.tr{top:1.2rem;right:1.2rem;border-width:2px 2px 0 0}
.crn.bl{bottom:2.8rem;left:1.2rem;border-width:0 0 2px 2px}
.crn.br{bottom:2.8rem;right:1.2rem;border-width:0 2px 2px 0}

/* badge */
.badge{
  position:absolute;top:clamp(.9rem,3vh,1.6rem);left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:.45rem;
  padding:.32rem 1rem;border-radius:100px;
  border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);
  font-size:clamp(.54rem,1.3vw,.64rem);letter-spacing:.2em;text-transform:uppercase;
  color:rgba(255,255,255,.65);white-space:nowrap
}
.bdot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:blink 1.2s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}

/* era label */
.era-lbl{
  position:absolute;top:clamp(3.2rem,7vh,4.5rem);left:50%;transform:translateX(-50%);
  font-size:clamp(.58rem,1.4vw,.72rem);letter-spacing:.28em;text-transform:uppercase;
  color:rgba(255,255,255,.35);white-space:nowrap;transition:color 1s
}

/* gear stage */
#gear-stage{
  position:relative;
  width:clamp(130px,20vw,220px);height:clamp(130px,20vw,220px);
  flex-shrink:0;
}
#gear-stage::before{
  content:'';position:absolute;inset:-18px;border-radius:50%;
  background:radial-gradient(circle,rgba(78,205,196,.1) 0%,transparent 70%);
  animation:halo 3s ease-in-out infinite
}
@keyframes halo{0%,100%{transform:scale(.95);opacity:.6}50%{transform:scale(1.05);opacity:1}}

#gear-svg{
  width:100%;height:100%;
  animation:spinCW 16s linear infinite;
  transition:filter 1.2s ease
}
@keyframes spinCW{to{transform:rotate(360deg)}}

/* story text */
.story-box{
  position:relative;width:min(88vw,560px);
  height:clamp(3rem,7vh,4.2rem);
  display:flex;align-items:center;justify-content:center
}
.phrase{
  position:absolute;text-align:center;
  font-size:clamp(.7rem,1.8vw,.92rem);
  letter-spacing:.05em;line-height:1.6;padding:0 .8rem;
  opacity:0;transform:translateY(7px);
  transition:opacity .55s,transform .55s
}
.phrase.on{opacity:1;transform:translateY(0)}
.chip{
  display:inline-block;padding:.08em .4em;border-radius:4px;
  font-size:.78em;margin-right:.35em;font-weight:700;letter-spacing:.1em
}
/* per-phase phrase colors */
.ph1{color:#c79a5a}.ph1 .chip{background:rgba(160,110,50,.18);border:1px solid rgba(160,110,50,.4);color:#d8a860}
.ph2{color:#6fb4dc}.ph2 .chip{background:rgba(40,120,180,.18);border:1px solid rgba(40,120,180,.4);color:#5ba5d8}
.ph3{color:#5bd0f5}.ph3 .chip{background:rgba(28,165,220,.14);border:1px solid rgba(28,165,220,.4);color:#3ec0f0}

/* version */
.ver{
  position:absolute;bottom:clamp(.7rem,2vh,1.3rem);left:50%;transform:translateX(-50%);
  font-size:.56rem;letter-spacing:.16em;color:var(--dim);text-transform:uppercase;white-space:nowrap
}

/* ── SCENE OBJECTS ── */
.obj{
  position:absolute;opacity:0;transform:scale(.84);
  transition:opacity .75s,transform .75s;pointer-events:none
}
.obj.on{opacity:1;transform:scale(1)}

/* phase-1 positions */
.p1-chimneys {top:3%;left:2%}
.p1-engine   {top:34%;left:1%}
.p1-anvil    {bottom:12%;left:4%}
.p1-sign     {top:4%;right:4%}
.p1-lamp     {bottom:16%;right:7%}

/* phase-2 positions */
.p2-monitor  {top:4%;left:3%}
.p2-binder   {bottom:14%;left:3%}
.p2-floppy   {top:6%;right:5%}
.p2-mainframe{bottom:6%;right:2%}

/* phase-3 positions */
.p3-robot   {top:4%;left:2%}
.p3-drone   {top:6%;right:3%}
.p3-phone   {bottom:10%;left:4%}
.p3-servers {bottom:4%;right:2%}
.p3-holo    {top:32%;right:2%}

/* ── SKIP BUTTON ── */
#skip-btn{
  position:fixed;z-index:58;display:none;
  bottom:clamp(1.6rem,4vh,2.4rem);right:clamp(1.2rem,4vw,2rem);
  padding:.5rem 1.15rem;border-radius:100px;
  border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.7);font-family:'Courier New',monospace;
  font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  transition:background .2s,border-color .2s,color .2s,transform .15s
}
#skip-btn:hover{background:rgba(28,165,220,.16);border-color:rgba(28,165,220,.55);color:#fff;transform:translateY(-1px)}
#skip-btn:active{transform:translateY(0)}

/* ── PORTAL (cheap GPU-composited expand) ── */
#portal{
  position:fixed;width:240px;height:240px;border-radius:50%;
  z-index:60;pointer-events:none;opacity:0;
  transform:translate(-50%,-50%) scale(.4);
  background:radial-gradient(circle,rgba(120,230,255,.9) 0%,rgba(43,192,245,.6) 28%,rgba(28,165,220,.25) 55%,transparent 72%);
  will-change:transform,opacity
}

/* ── PROGRESS ── */
#prog-wrap{position:fixed;bottom:0;left:0;right:0;height:2px;background:rgba(255,255,255,.04);z-index:50;transition:opacity .8s}
#prog-wrap.out{opacity:0}
#prog-fill{height:100%;width:0%;background:linear-gradient(90deg,#a0703a,#3a90c8,#1ca5dc);box-shadow:0 0 8px currentColor;transition:width .12s linear}

/* ── LOGIN ── */
#login{
  position:fixed;inset:0;z-index:100;
  display:flex;align-items:center;justify-content:center;padding:1.5rem 1rem;
  overflow-y:auto;
  opacity:0;pointer-events:none;transition:opacity .9s .15s
}
#login.in{opacity:1;pointer-events:all}

.card{
  width:100%;max-width:400px;
  background:var(--card);
  backdrop-filter:blur(28px) saturate(160%);
  -webkit-backdrop-filter:blur(28px) saturate(160%);
  border:1px solid var(--border);border-radius:20px;
  padding:clamp(1.8rem,5vw,2.8rem);
  position:relative;overflow:hidden;
  box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 30px 80px rgba(0,0,0,.8),0 0 100px rgba(78,205,196,.06);
  transform:translateY(32px) scale(.97);
  transition:transform 1s cubic-bezier(.16,1,.3,1)
}
#login.in .card{transform:translateY(0) scale(1)}
.card::before{
  content:'';position:absolute;top:0;left:15%;right:15%;height:1px;
  background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.45
}

.c-head{display:flex;flex-direction:column;align-items:center;gap:.55rem;margin-bottom:.35rem}
.mc-logo{width:clamp(96px,26vw,124px);height:auto;filter:drop-shadow(0 6px 20px rgba(0,0,0,.55))}
.c-prod{font-size:clamp(.95rem,3vw,1.15rem);font-weight:800;letter-spacing:.42em;color:#fff;text-indent:.42em;line-height:1}
.c-prod em{color:var(--accent);font-style:normal}
.c-sub{font-size:.6rem;letter-spacing:.17em;color:var(--dim);text-transform:uppercase;margin-bottom:1.6rem;text-align:center}
.divid{height:1px;margin-bottom:1.6rem;background:linear-gradient(90deg,transparent,rgba(78,205,196,.22),transparent)}

.fld{margin-bottom:1rem}
.flbl{display:flex;align-items:center;gap:.38rem;font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:.4rem}
.finp{
  width:100%;padding:.8rem 1rem;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;
  font-size:16px;font-family:'Courier New',monospace;color:var(--text);outline:none;
  transition:border-color .25s,background .25s,box-shadow .25s;-webkit-appearance:none
}
.finp::placeholder{color:rgba(255,255,255,.17);font-size:.84rem}
.finp:focus{border-color:rgba(78,205,196,.5);background:rgba(78,205,196,.04);box-shadow:0 0 0 3px rgba(78,205,196,.1)}

.btn{
  width:100%;margin-top:1.4rem;padding:.88rem;
  border:none;border-radius:10px;
  background:linear-gradient(135deg,var(--accent) 0%,var(--accent2) 100%);
  color:#fff;font-family:'Courier New',monospace;font-size:.76rem;font-weight:700;
  letter-spacing:.2em;text-transform:uppercase;cursor:pointer;
  position:relative;overflow:hidden;
  box-shadow:0 4px 24px rgba(78,205,196,.25);
  transition:transform .15s,box-shadow .15s,filter .15s
}
.btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.16) 0%,transparent 55%)}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(78,205,196,.4);filter:brightness(1.06)}
.btn:active{transform:translateY(0)}

.fgt{display:block;text-align:center;margin-top:1rem;font-size:.67rem;color:var(--dim);text-decoration:none;letter-spacing:.05em;transition:color .2s}
.fgt:hover{color:var(--accent)}
.sec{display:flex;align-items:center;justify-content:center;gap:.42rem;margin-top:1.4rem;padding-top:1.1rem;border-top:1px solid rgba(255,255,255,.05);font-size:.57rem;color:var(--dim);letter-spacing:.1em;opacity:.75}

/* ── LOGIN AMBIENT + HERO (continúa la historia) ── */
.login-wrap{display:flex;align-items:center;justify-content:center;gap:clamp(2rem,5vw,4.5rem);width:100%;max-width:1010px}

/* rotating gear watermark behind login */
#login-gear{position:fixed;right:-170px;bottom:-180px;width:560px;height:560px;z-index:101;opacity:0;pointer-events:none;animation:spinCW 70s linear infinite;transition:opacity 1.4s .3s}
#login.in #login-gear{opacity:.06}
#login-gear svg{width:100%;height:100%}

/* corner HUD brackets */
.lc{position:fixed;width:44px;height:44px;border-style:solid;border-color:rgba(28,165,220,.3);opacity:0;transition:opacity 1s .45s;z-index:102;pointer-events:none}
#login.in .lc{opacity:.65}
.lc.tl{top:1.5rem;left:1.5rem;border-width:2px 0 0 2px}
.lc.tr{top:1.5rem;right:1.5rem;border-width:2px 2px 0 0}
.lc.bl{bottom:1.5rem;left:1.5rem;border-width:0 0 2px 2px}
.lc.br{bottom:1.5rem;right:1.5rem;border-width:0 2px 2px 0}

/* hero left column */
.hero{flex:1;max-width:430px;opacity:0;transform:translateX(-22px);transition:opacity .9s .35s,transform .9s .35s}
#login.in .hero{opacity:1;transform:none}
.hero-kicker{display:inline-flex;align-items:center;gap:.5rem;padding:.32rem .9rem;border:1px solid var(--border);border-radius:100px;background:rgba(28,165,220,.06);font-size:.58rem;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:1.3rem}
.hero-kicker .bdot{background:var(--accent)}
.hero-title{font-size:clamp(1.55rem,3.2vw,2.3rem);font-weight:900;line-height:1.14;letter-spacing:-.01em;color:#fff;margin-bottom:.9rem}
.hero-title em{color:var(--accent);font-style:normal}
.hero-lead{font-size:.8rem;line-height:1.7;color:#9fb4cc;margin-bottom:1.7rem;max-width:31em}

/* mini timeline (la historia) */
.tl-line{position:relative;padding-left:1.45rem;margin-bottom:1.7rem}
.tl-line::before{content:'';position:absolute;left:4px;top:8px;bottom:8px;width:2px;background:linear-gradient(180deg,#e0683a,#cdb15e,#9a7048,#7a8090,#3a9fd0,#1ca5dc)}
.tl-item{position:relative;padding:.26rem 0;font-size:.7rem;color:#9fb4cc;letter-spacing:.01em;line-height:1.3}
.tl-item b{color:#cfe0f0;font-weight:700}
.tl-item::before{content:'';position:absolute;left:-1.45rem;top:.5rem;width:9px;height:9px;border-radius:50%;background:var(--bg);border:2px solid var(--accent)}
.tl-item:nth-child(1)::before{border-color:#e0683a;box-shadow:0 0 8px rgba(224,104,58,.6)}
.tl-item:nth-child(2)::before{border-color:#c98a3e}
.tl-item:nth-child(3)::before{border-color:#cdb15e}
.tl-item:nth-child(4)::before{border-color:#9a7048}
.tl-item:nth-child(5)::before{border-color:#7a8090}
.tl-item:nth-child(6)::before{border-color:#5a92b8}
.tl-item:nth-child(7)::before{border-color:#3a9fd0}
.tl-item:nth-child(8)::before{border-color:#28b0e2}
.tl-item:nth-child(9)::before{border-color:#1ca5dc;box-shadow:0 0 9px rgba(28,165,220,.85)}

/* HSEQ pillars */
.pillars{display:grid;grid-template-columns:repeat(2,1fr);gap:.65rem;margin-bottom:1.5rem}
.pillar{display:flex;align-items:center;gap:.55rem;padding:.6rem .65rem;border:1px solid rgba(255,255,255,.06);border-radius:10px;background:rgba(255,255,255,.02);transition:border-color .2s,background .2s}
.pillar:hover{border-color:rgba(28,165,220,.35);background:rgba(28,165,220,.05)}
.pillar svg{flex-shrink:0;color:var(--accent)}
.pillar span{font-size:.63rem;color:#9fb4cc;line-height:1.25}
.pillar b{display:block;color:#fff;font-size:.7rem;letter-spacing:.05em;text-transform:uppercase;margin-bottom:.05rem}

/* ISO badges */
.iso-row{display:flex;gap:.5rem;flex-wrap:wrap}
.iso{font-size:.57rem;letter-spacing:.1em;color:var(--dim);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:.3rem .58rem}
.iso b{color:var(--accent);font-weight:700}

/* hide hero on narrow screens — keep login clean & centered */
@media(max-width:900px){
  .hero{display:none}
  .login-wrap{max-width:400px}
  #login-gear{width:380px;right:-130px;bottom:-140px}
}

/* responsive */
@media(max-width:600px){
  .p1-chimneys,.p2-mainframe,.p3-servers{display:none}
  #gear-stage{width:120px;height:120px}
  .crn{width:34px;height:34px}
}
@media(max-height:580px){
  #gear-stage{width:100px;height:100px}
  .obj{display:none}
}
.login-msg{display:none;margin-top:.9rem;padding:.55rem .8rem;border-radius:8px;background:rgba(220,40,40,.12);border:1px solid rgba(220,40,40,.42);color:#ff9a9a;font-size:.62rem;letter-spacing:.04em;text-align:center;font-family:'Courier New',monospace}.login-msg.show{display:block}`;
const LOGIN_HTML = `<canvas id="canvas-matrix"></canvas>
<canvas id="canvas-atmos"></canvas>

<div id="intro">
  <div class="crn tl"></div><div class="crn tr"></div>
  <div class="crn bl"></div><div class="crn br"></div>

  <div class="badge"><span class="bdot"></span>Medicloud Safety &nbsp;·&nbsp; Sistema de Gestión SGI</div>
  <div class="era-lbl" id="era-lbl">Iniciando...</div>

  <!-- ═══ PHASE 1: INDUSTRIAL ═══ -->
  <div class="obj p1-chimneys" id="o-chimneys">
    <svg width="108" height="128" viewBox="0 0 108 128" fill="none">
      <rect x="8"  y="48" width="18" height="80" fill="#4a2800" rx="1"/>
      <rect x="6"  y="44" width="22" height="8"  fill="#381c00" rx="2"/>
      <rect x="38" y="28" width="22" height="100" fill="#5a3200" rx="1"/>
      <rect x="36" y="24" width="26" height="8"   fill="#481e00" rx="2"/>
      <rect x="72" y="40" width="16" height="88"  fill="#4a2800" rx="1"/>
      <rect x="70" y="36" width="20" height="8"   fill="#381c00" rx="2"/>
      <circle cx="17" cy="34" r="11" fill="rgba(80,58,32,.55)"/>
      <circle cx="49" cy="14" r="15" fill="rgba(70,48,26,.45)"/>
      <circle cx="80" cy="26" r="9"  fill="rgba(80,58,32,.55)"/>
      <circle cx="28" cy="22" r="8"  fill="rgba(65,44,20,.4)"/>
      <rect x="0" y="116" width="108" height="12" fill="#3a1e00" rx="1"/>
    </svg>
  </div>

  <div class="obj p1-engine" id="o-engine">
    <svg width="105" height="78" viewBox="0 0 105 78" fill="none">
      <rect x="10" y="20" width="56" height="28" rx="13" fill="#5a3500"/>
      <rect x="10" y="24" width="56" height="10" rx="0"  fill="#6a4500" opacity=".45"/>
      <rect x="52" y="4"  width="10" height="22" fill="#4a2800" rx="2"/>
      <rect x="49" y="2"  width="16" height="6"  fill="#381c00" rx="1"/>
      <circle cx="26" cy="56" r="17" stroke="#7a4a20" stroke-width="3" fill="none"/>
      <circle cx="26" cy="56" r="4"  fill="#8a5a30"/>
      <line x1="26" y1="39" x2="26" y2="73" stroke="#7a4a20" stroke-width="1.5"/>
      <line x1="9"  y1="56" x2="43" y2="56" stroke="#7a4a20" stroke-width="1.5"/>
      <circle cx="72" cy="60" r="11" stroke="#7a4a20" stroke-width="2.5" fill="none"/>
      <circle cx="72" cy="60" r="3"  fill="#8a5a30"/>
      <line x1="26" y1="56" x2="72" y2="60" stroke="#8a5a30" stroke-width="3" stroke-linecap="round"/>
      <line x1="66" y1="22" x2="88" y2="17" stroke="#6a4500" stroke-width="3" stroke-linecap="round"/>
      <line x1="5"  y1="74" x2="100" y2="74" stroke="#5a3500" stroke-width="2"/>
      <line x1="5"  y1="77" x2="100" y2="77" stroke="#5a3500" stroke-width="2"/>
    </svg>
  </div>

  <div class="obj p1-anvil" id="o-anvil">
    <svg width="85" height="65" viewBox="0 0 85 65" fill="none">
      <path d="M8 32 Q8 16 24 16 L62 16 Q78 16 75 30 L70 38 Q72 46 66 48 L18 48 Q10 45 8 38 Z" fill="#4a3520"/>
      <rect x="16" y="45" width="52" height="12" rx="2" fill="#3a2510"/>
      <path d="M62 20 Q82 22 82 27 Q82 30 62 30 Z" fill="#5a4530"/>
      <path d="M16 22 Q35 18 58 22" stroke="#7a6050" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <rect x="57" y="4"  width="20" height="12" rx="2" fill="#3a2510"/>
      <line x1="67" y1="16" x2="67" y2="30" stroke="#5a3a20" stroke-width="3.5" stroke-linecap="round"/>
    </svg>
  </div>

  <div class="obj p1-sign" id="o-sign">
    <svg width="92" height="105" viewBox="0 0 92 105" fill="none">
      <rect x="42" y="58" width="8" height="47" fill="#5a3a1a" rx="2"/>
      <rect x="2"  y="4"  width="88" height="58" rx="3" fill="#6b3a14"/>
      <rect x="5"  y="7"  width="82" height="52" rx="2" fill="#7a4518"/>
      <circle cx="10" cy="13" r="2.2" fill="#4a2a08"/>
      <circle cx="82" cy="13" r="2.2" fill="#4a2a08"/>
      <circle cx="10" cy="55" r="2.2" fill="#4a2a08"/>
      <circle cx="82" cy="55" r="2.2" fill="#4a2a08"/>
      <!-- red cross -->
      <rect x="9"  y="18" width="13" height="32" rx="2" fill="#cc2200"/>
      <rect x="5"  y="29" width="21" height="10" rx="2" fill="#cc2200"/>
      <!-- text -->
      <text x="28" y="29" font-size="7"   fill="#f0c060" font-family="serif" font-weight="bold" letter-spacing=".8">SEGURIDAD</text>
      <text x="30" y="40" font-size="6.5" fill="#e8b050" font-family="serif" font-weight="bold" letter-spacing=".5">PRIMERO</text>
      <text x="28" y="52" font-size="5"   fill="#c89030" font-family="serif" opacity=".7">SGI · HSE · 1900</text>
    </svg>
  </div>

  <div class="obj p1-lamp" id="o-lamp">
    <svg width="52" height="72" viewBox="0 0 52 72" fill="none">
      <rect x="13" y="20" width="26" height="30" rx="3" fill="#5a4020"/>
      <rect x="15" y="22" width="22" height="26" rx="2" fill="#4a3015" opacity=".8"/>
      <rect x="16" y="23" width="20" height="22" rx="2" fill="#ffd060" opacity=".75"/>
      <rect x="16" y="23" width="20" height="22" rx="2" fill="#ffb020" opacity=".25"/>
      <path d="M19 20 Q26 7 33 20" stroke="#6a5030" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="7" r="4" stroke="#6a5030" stroke-width="2" fill="none"/>
      <rect x="10" y="50" width="32" height="9"  rx="2" fill="#4a3015"/>
      <rect x="12" y="19" width="28" height="34" rx="4" fill="#ffd060" opacity=".08"/>
    </svg>
  </div>

  <!-- ═══ PHASE 2: COMPUTING ═══ -->
  <div class="obj p2-monitor" id="o-monitor">
    <svg width="98" height="96" viewBox="0 0 98 96" fill="none">
      <rect x="4" y="4" width="90" height="68" rx="5" fill="#253040"/>
      <rect x="7" y="7" width="84" height="62" rx="4" fill="#1a2030"/>
      <rect x="11" y="11" width="76" height="52" rx="3" fill="#060c14"/>
      <!-- phosphor lines -->
      <rect x="16" y="18" width="58" height="2" rx="1" fill="#00cc44" opacity=".9"/>
      <rect x="16" y="23" width="44" height="2" rx="1" fill="#00cc44" opacity=".7"/>
      <rect x="16" y="28" width="52" height="2" rx="1" fill="#00cc44" opacity=".8"/>
      <rect x="16" y="33" width="36" height="2" rx="1" fill="#00cc44" opacity=".6"/>
      <rect x="16" y="38" width="50" height="2" rx="1" fill="#00cc44" opacity=".7"/>
      <rect x="16" y="43" width="28" height="2" rx="1" fill="#00cc44" opacity=".5"/>
      <rect x="16" y="48" width="42" height="2" rx="1" fill="#00cc44" opacity=".65"/>
      <rect x="16" y="53" width="20" height="2" rx="1" fill="#00cc44" opacity=".8"/>
      <rect x="38" y="53" width="8" height="8"  rx="1" fill="#00ff55" opacity=".9"/>
      <!-- stand -->
      <rect x="39" y="72" width="20" height="8"  rx="1" fill="#253040"/>
      <rect x="28" y="80" width="42" height="6"  rx="2" fill="#1e2838"/>
      <!-- knobs -->
      <circle cx="80" cy="37" r="3.5" fill="#354050"/>
      <circle cx="80" cy="48" r="3.5" fill="#354050"/>
    </svg>
  </div>

  <div class="obj p2-binder" id="o-binder">
    <svg width="78" height="92" viewBox="0 0 78 92" fill="none">
      <rect x="4" y="4" width="70" height="84" rx="4" fill="#c0392b"/>
      <rect x="7" y="7" width="64" height="78" rx="3" fill="#e74c3c"/>
      <rect x="11" y="14" width="56" height="32" rx="2" fill="#fff" opacity=".96"/>
      <text x="39" y="27" font-size="5.5" fill="#1a2030" font-family="sans-serif" font-weight="bold" text-anchor="middle" letter-spacing=".6">PLAN DE GESTIÓN</text>
      <text x="39" y="36" font-size="5"   fill="#c0392b" font-family="sans-serif" text-anchor="middle" letter-spacing=".4">ISO 45001 · HSEQ</text>
      <text x="39" y="44" font-size="4.5" fill="#666"    font-family="sans-serif" text-anchor="middle">Revisión 2.0</text>
      <circle cx="20" cy="62" r="6" stroke="#8b0000" stroke-width="2" fill="none"/>
      <circle cx="39" cy="62" r="6" stroke="#8b0000" stroke-width="2" fill="none"/>
      <circle cx="58" cy="62" r="6" stroke="#8b0000" stroke-width="2" fill="none"/>
      <rect x="4" y="4" width="8" height="84" rx="4" fill="#96281b" opacity=".6"/>
    </svg>
  </div>

  <div class="obj p2-floppy" id="o-floppy">
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="4" y="4" width="64" height="64" rx="4" fill="#2a3040"/>
      <rect x="9" y="9" width="54" height="30" rx="2" fill="#3a4858"/>
      <rect x="13" y="13" width="40" height="4"  rx="1" fill="#586070" opacity=".7"/>
      <rect x="13" y="20" width="32" height="2"  rx="1" fill="#586070" opacity=".5"/>
      <rect x="13" y="25" width="38" height="2"  rx="1" fill="#586070" opacity=".4"/>
      <!-- shutter -->
      <rect x="20" y="43" width="32" height="14" rx="1" fill="#1a2028"/>
      <rect x="28" y="43" width="14" height="14" rx="0" fill="#0a1018"/>
      <!-- write protect -->
      <rect x="4"  y="53" width="9" height="9" rx="1" fill="#1a2028"/>
      <circle cx="14" cy="62" r="2.5" fill="#1a2028"/>
      <circle cx="58" cy="62" r="2.5" fill="#1a2028"/>
    </svg>
  </div>

  <div class="obj p2-mainframe" id="o-mainframe">
    <svg width="88" height="114" viewBox="0 0 88 114" fill="none">
      <rect x="4" y="4" width="80" height="106" rx="4" fill="#232838"/>
      <rect x="7" y="7" width="74" height="100" rx="3" fill="#1a2030"/>
      <!-- tape reels -->
      <rect x="10" y="10" width="68" height="38" rx="2" fill="#141c28"/>
      <circle cx="28" cy="30" r="13" stroke="#3a4858" stroke-width="2.5" fill="#0e1620"/>
      <circle cx="28" cy="30" r="6"  stroke="#2a3848" stroke-width="1.5" fill="none"/>
      <circle cx="28" cy="30" r="2"  fill="#4a5870"/>
      <circle cx="60" cy="30" r="13" stroke="#3a4858" stroke-width="2.5" fill="#0e1620"/>
      <circle cx="60" cy="30" r="6"  stroke="#2a3848" stroke-width="1.5" fill="none"/>
      <circle cx="60" cy="30" r="2"  fill="#4a5870"/>
      <!-- control panel -->
      <rect x="10" y="52" width="68" height="44" rx="2" fill="#141c28"/>
      <!-- LED grid -->
      <circle cx="22" cy="63" r="2.8" fill="#00ff66" opacity=".9"/>
      <circle cx="32" cy="63" r="2.8" fill="#ff4400" opacity=".85"/>
      <circle cx="42" cy="63" r="2.8" fill="#ffaa00" opacity=".9"/>
      <circle cx="52" cy="63" r="2.8" fill="#00ff66" opacity=".75"/>
      <circle cx="62" cy="63" r="2.8" fill="#00ff66" opacity=".85"/>
      <circle cx="72" cy="63" r="2.8" fill="#00bbff" opacity=".8"/>
      <circle cx="22" cy="73" r="2.8" fill="#ffaa00" opacity=".7"/>
      <circle cx="32" cy="73" r="2.8" fill="#00ff66" opacity=".9"/>
      <circle cx="42" cy="73" r="2.8" fill="#00bbff" opacity=".85"/>
      <circle cx="52" cy="73" r="2.8" fill="#ff4400" opacity=".75"/>
      <circle cx="62" cy="73" r="2.8" fill="#00ff66" opacity=".9"/>
      <circle cx="72" cy="73" r="2.8" fill="#ffaa00" opacity=".85"/>
      <!-- switch row -->
      <rect x="14" y="83" width="60" height="5"  rx="1.5" fill="#253040"/>
      <!-- vents -->
      <rect x="10" y="100" width="68" height="2" rx="1" fill="#141c28"/>
      <rect x="10" y="104" width="68" height="2" rx="1" fill="#141c28"/>
      <rect x="10" y="108" width="68" height="2" rx="1" fill="#141c28"/>
    </svg>
  </div>

  <!-- ═══ PHASE 3: AI ═══ -->
  <div class="obj p3-robot" id="o-robot">
    <svg width="92" height="104" viewBox="0 0 92 104" fill="none">
      <rect x="26" y="88" width="40" height="12" rx="3" fill="#081820"/>
      <rect x="31" y="80" width="30" height="10" rx="2" fill="#0a2030"/>
      <rect x="34" y="56" width="22" height="30" rx="4" fill="#0a2a40"/>
      <rect x="35" y="57" width="20" height="3"  rx="1" fill="#1a4060" opacity=".7"/>
      <circle cx="45" cy="54" r="8" fill="#0c3050" stroke="#00ccff" stroke-width="1.5" stroke-opacity=".85"/>
      <circle cx="45" cy="54" r="3.5" fill="#00ccff" opacity=".6"/>
      <!-- upper arm rotated -->
      <g transform="rotate(-18,45,40)">
        <rect x="34" y="26" width="22" height="28" rx="4" fill="#0a2a40"/>
      </g>
      <circle cx="52" cy="27" r="6.5" fill="#0c3050" stroke="#00ccff" stroke-width="1.5" stroke-opacity=".85"/>
      <circle cx="52" cy="27" r="2.8" fill="#00ccff" opacity=".6"/>
      <!-- forearm -->
      <g transform="rotate(22,52,16)">
        <rect x="40" y="4" width="18" height="24" rx="3" fill="#0a2a40"/>
      </g>
      <!-- gripper fingers -->
      <rect x="63" y="7"  width="5" height="13" rx="2" fill="#0a2a40" transform="rotate(22,65,13)"/>
      <rect x="71" y="12" width="5" height="11" rx="2" fill="#0a2a40" transform="rotate(22,73,17)"/>
      <!-- LED strip -->
      <rect x="35" y="40" width="2" height="12" rx="1" fill="#00ffff" opacity=".8"/>
      <circle cx="45" cy="54" r="16" fill="rgba(0,200,255,.05)"/>
    </svg>
  </div>

  <div class="obj p3-drone" id="o-drone">
    <svg width="94" height="78" viewBox="0 0 94 78" fill="none">
      <line x1="47" y1="40" x2="14" y2="18" stroke="#0a3050" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="47" y1="40" x2="80" y2="18" stroke="#0a3050" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="47" y1="40" x2="14" y2="62" stroke="#0a3050" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="47" y1="40" x2="80" y2="62" stroke="#0a3050" stroke-width="3.5" stroke-linecap="round"/>
      <!-- motor pods -->
      <circle cx="14" cy="18" r="9" fill="#0c2840" stroke="#00ccff" stroke-width="1.2" stroke-opacity=".7"/>
      <circle cx="80" cy="18" r="9" fill="#0c2840" stroke="#00ccff" stroke-width="1.2" stroke-opacity=".7"/>
      <circle cx="14" cy="62" r="9" fill="#0c2840" stroke="#00ccff" stroke-width="1.2" stroke-opacity=".7"/>
      <circle cx="80" cy="62" r="9" fill="#0c2840" stroke="#00ccff" stroke-width="1.2" stroke-opacity=".7"/>
      <!-- prop discs -->
      <ellipse cx="14" cy="18" rx="15" ry="3" fill="#00ccff" opacity=".22" transform="rotate(-22 14 18)"/>
      <ellipse cx="80" cy="18" rx="15" ry="3" fill="#00ccff" opacity=".22" transform="rotate(22 80 18)"/>
      <ellipse cx="14" cy="62" rx="15" ry="3" fill="#00ccff" opacity=".22" transform="rotate(22 14 62)"/>
      <ellipse cx="80" cy="62" rx="15" ry="3" fill="#00ccff" opacity=".22" transform="rotate(-22 80 62)"/>
      <!-- body -->
      <rect x="33" y="30" width="28" height="20" rx="5" fill="#081e30"/>
      <rect x="35" y="32" width="24" height="16" rx="4" fill="#0c2840"/>
      <!-- camera -->
      <circle cx="47" cy="54" r="6.5" fill="#060f1e" stroke="#00ccff" stroke-width="1" stroke-opacity=".65"/>
      <circle cx="47" cy="54" r="3.5" fill="#0044aa" opacity=".45"/>
      <!-- LEDs -->
      <circle cx="39" cy="38" r="2.2" fill="#00ff88" opacity=".9"/>
      <circle cx="55" cy="38" r="2.2" fill="#ff4400" opacity=".85"/>
    </svg>
  </div>

  <div class="obj p3-phone" id="o-phone">
    <svg width="66" height="112" viewBox="0 0 66 112" fill="none">
      <rect x="4" y="4" width="58" height="104" rx="9" fill="#09192a"/>
      <rect x="6" y="6" width="54" height="100" rx="8" fill="#0c2038"/>
      <rect x="9"  y="14" width="48" height="80" rx="5" fill="#040e18"/>
      <!-- neural net nodes -->
      <circle cx="18" cy="35" r="4" fill="#00ccff" opacity=".9"/>
      <circle cx="18" cy="54" r="4" fill="#00ccff" opacity=".9"/>
      <circle cx="18" cy="73" r="4" fill="#00ccff" opacity=".9"/>
      <circle cx="33" cy="26" r="4" fill="#4ecdc4" opacity=".9"/>
      <circle cx="33" cy="45" r="4" fill="#4ecdc4" opacity=".9"/>
      <circle cx="33" cy="63" r="4" fill="#4ecdc4" opacity=".9"/>
      <circle cx="33" cy="82" r="4" fill="#4ecdc4" opacity=".9"/>
      <circle cx="48" cy="40" r="4" fill="#2196f3" opacity=".9"/>
      <circle cx="48" cy="64" r="4" fill="#2196f3" opacity=".9"/>
      <!-- connections -->
      <g stroke="#00ccff" stroke-width=".7" opacity=".35">
        <line x1="18" y1="35" x2="33" y2="26"/>
        <line x1="18" y1="35" x2="33" y2="45"/>
        <line x1="18" y1="54" x2="33" y2="45"/>
        <line x1="18" y1="54" x2="33" y2="63"/>
        <line x1="18" y1="73" x2="33" y2="63"/>
        <line x1="18" y1="73" x2="33" y2="82"/>
      </g>
      <g stroke="#4ecdc4" stroke-width=".7" opacity=".35">
        <line x1="33" y1="26" x2="48" y2="40"/>
        <line x1="33" y1="45" x2="48" y2="40"/>
        <line x1="33" y1="63" x2="48" y2="40"/>
        <line x1="33" y1="45" x2="48" y2="64"/>
        <line x1="33" y1="63" x2="48" y2="64"/>
        <line x1="33" y1="82" x2="48" y2="64"/>
      </g>
      <text x="33" y="92" font-size="5.5" fill="#00ccff" font-family="monospace" text-anchor="middle" letter-spacing="1" opacity=".9">HSEQ · AI</text>
      <rect x="24" y="8"  width="18" height="4"  rx="2" fill="#05101e"/>
      <circle cx="46" cy="10" r="2"  fill="#05101e"/>
      <rect x="22" y="107" width="22" height="2.5" rx="1.5" fill="#1a3050"/>
    </svg>
  </div>

  <div class="obj p3-servers" id="o-servers">
    <svg width="82" height="112" viewBox="0 0 82 112" fill="none">
      <rect x="4" y="4" width="74" height="104" rx="4" fill="#060d18"/>
      <rect x="7" y="7" width="68" height="98"  rx="3" fill="#091828"/>
      <!-- 5 server units -->
      <rect x="10" y="11" width="62" height="13" rx="2" fill="#0c2038"/>
      <rect x="13" y="14" width="30" height="7"  rx="1" fill="#08121e"/>
      <circle cx="55" cy="18" r="2.5" fill="#00ff88" opacity=".9"/>
      <circle cx="62" cy="18" r="2.5" fill="#00ff88" opacity=".75"/>
      <circle cx="69" cy="18" r="2.5" fill="#ffaa00" opacity=".8"/>

      <rect x="10" y="27" width="62" height="13" rx="2" fill="#0c2038"/>
      <rect x="13" y="30" width="30" height="7"  rx="1" fill="#08121e"/>
      <circle cx="55" cy="34" r="2.5" fill="#00ff88" opacity=".85"/>
      <circle cx="62" cy="34" r="2.5" fill="#00ccff" opacity=".9"/>
      <circle cx="69" cy="34" r="2.5" fill="#00ff88" opacity=".7"/>

      <rect x="10" y="43" width="62" height="13" rx="2" fill="#0c2038"/>
      <rect x="13" y="46" width="30" height="7"  rx="1" fill="#08121e"/>
      <circle cx="55" cy="50" r="2.5" fill="#00ccff" opacity=".9"/>
      <circle cx="62" cy="50" r="2.5" fill="#00ff88" opacity=".85"/>
      <circle cx="69" cy="50" r="2.5" fill="#00ff88" opacity=".9"/>

      <rect x="10" y="59" width="62" height="13" rx="2" fill="#0c2038"/>
      <rect x="13" y="62" width="30" height="7"  rx="1" fill="#08121e"/>
      <circle cx="55" cy="66" r="2.5" fill="#ff4400" opacity=".7"/>
      <circle cx="62" cy="66" r="2.5" fill="#00ff88" opacity=".9"/>
      <circle cx="69" cy="66" r="2.5" fill="#00ccff" opacity=".85"/>

      <rect x="10" y="75" width="62" height="13" rx="2" fill="#0c2038"/>
      <rect x="13" y="78" width="30" height="7"  rx="1" fill="#08121e"/>
      <circle cx="55" cy="82" r="2.5" fill="#00ff88" opacity=".9"/>
      <circle cx="62" cy="82" r="2.5" fill="#00ff88" opacity=".8"/>
      <circle cx="69" cy="82" r="2.5" fill="#ffaa00" opacity=".75"/>

      <!-- data flow -->
      <rect x="48" y="11" width="1.5" height="77" rx="1" fill="#00ccff" opacity=".12"/>
      <!-- vents -->
      <rect x="10" y="92"  width="62" height="2" rx="1" fill="#060d18"/>
      <rect x="10" y="97"  width="62" height="2" rx="1" fill="#060d18"/>
      <rect x="10" y="102" width="62" height="2" rx="1" fill="#060d18"/>
    </svg>
  </div>

  <div class="obj p3-holo" id="o-holo">
    <svg width="98" height="92" viewBox="0 0 98 92" fill="none">
      <rect x="2" y="2" width="94" height="88" rx="6" fill="rgba(0,200,255,.04)" stroke="#00ccff" stroke-width=".8" stroke-opacity=".45"/>
      <rect x="4" y="4" width="90" height="13" rx="3" fill="rgba(0,150,200,.13)"/>
      <text x="10" y="14" font-size="5" fill="#00ccff" font-family="monospace" letter-spacing=".5" opacity=".9">HSEQ · REAL-TIME SGI</text>
      <!-- bar 1 -->
      <text x="8" y="30" font-size="4.5" fill="#80ffff" font-family="monospace" opacity=".85">CALIDAD</text>
      <rect x="8"  y="32" width="72" height="6" rx="2" fill="rgba(0,255,200,.08)"/>
      <rect x="8"  y="32" width="60" height="6" rx="2" fill="rgba(0,255,180,.55)"/>
      <text x="72" y="37" font-size="3.8" fill="#00ffcc" font-family="monospace">83%</text>
      <!-- bar 2 -->
      <text x="8" y="51" font-size="4.5" fill="#80ffff" font-family="monospace" opacity=".85">EMISIONES CO₂</text>
      <rect x="8"  y="53" width="72" height="6" rx="2" fill="rgba(0,200,255,.08)"/>
      <rect x="8"  y="53" width="34" height="6" rx="2" fill="rgba(0,200,255,.5)"/>
      <text x="72" y="58" font-size="3.8" fill="#00ccff" font-family="monospace">46%</text>
      <!-- bar 3 -->
      <text x="8" y="72" font-size="4.5" fill="#80ffff" font-family="monospace" opacity=".85">RIESGO IA</text>
      <rect x="8"  y="74" width="72" height="6" rx="2" fill="rgba(0,255,100,.08)"/>
      <rect x="8"  y="74" width="16" height="6" rx="2" fill="rgba(0,255,100,.65)"/>
      <text x="72" y="79" font-size="3.8" fill="#00ff88" font-family="monospace">21%</text>
      <!-- corner brackets -->
      <polyline points="2,8 2,2 8,2"   stroke="#00ccff" stroke-width="1.4" fill="none" opacity=".8"/>
      <polyline points="90,2 96,2 96,8" stroke="#00ccff" stroke-width="1.4" fill="none" opacity=".8"/>
      <polyline points="2,84 2,90 8,90" stroke="#00ccff" stroke-width="1.4" fill="none" opacity=".8"/>
      <polyline points="90,90 96,90 96,84" stroke="#00ccff" stroke-width="1.4" fill="none" opacity=".8"/>
    </svg>
  </div>

  <!-- ═══ CENTRAL GEAR ═══ -->
  <div id="gear-stage">
    <svg id="gear-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gWood" cx="38%" cy="28%" r="78%">
          <stop offset="0%"   stop-color="#b5854e"/>
          <stop offset="48%"  stop-color="#8a5e30"/>
          <stop offset="100%" stop-color="#4e3318"/>
        </radialGradient>
        <pattern id="woodGrain" patternUnits="userSpaceOnUse" width="200" height="200">
          <rect width="200" height="200" fill="url(#gWood)"/>
          <g stroke="#5e3e1c" stroke-opacity=".35" fill="none" stroke-width="1">
            <ellipse cx="100" cy="100" rx="22" ry="26"/>
            <ellipse cx="100" cy="100" rx="38" ry="44"/>
            <ellipse cx="100" cy="100" rx="56" ry="64"/>
            <ellipse cx="100" cy="100" rx="74" ry="84"/>
          </g>
          <g stroke="#3e2810" stroke-opacity=".25" stroke-width=".6">
            <line x1="20" y1="40" x2="180" y2="34"/>
            <line x1="18" y1="150" x2="182" y2="158"/>
          </g>
        </pattern>
        <radialGradient id="gSteel" cx="38%" cy="28%" r="72%">
          <stop offset="0%"   stop-color="#d8e0f0"/>
          <stop offset="50%"  stop-color="#8090a8"/>
          <stop offset="100%" stop-color="#404858"/>
        </radialGradient>
        <radialGradient id="gCrystal" cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stop-color="rgba(43,192,245,.34)"/>
          <stop offset="60%"  stop-color="rgba(28,165,220,.17)"/>
          <stop offset="100%" stop-color="rgba(10,108,184,.08)"/>
        </radialGradient>
        <radialGradient id="gHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#a0703a" stop-opacity=".22"/>
          <stop offset="100%" stop-color="#a0703a" stop-opacity="0"/>
        </radialGradient>
        <filter id="gGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <circle cx="100" cy="100" r="96" fill="url(#gHalo)" id="g-halo"/>
      <path   id="g-path" fill="url(#woodGrain)" stroke="#5e3e1c" stroke-width="1.2" stroke-opacity=".7" filter="url(#gGlow)"/>

      <!-- structural rings -->
      <circle cx="100" cy="100" r="50" id="g-r1" fill="#3a2510" stroke="#5e3e1c" stroke-width="1.4" stroke-opacity=".7"/>
      <circle cx="100" cy="100" r="40" fill="none" id="g-r2" stroke="#6e4a22" stroke-width=".6" stroke-opacity=".4"/>
      <circle cx="100" cy="100" r="30" fill="none" id="g-r3" stroke="#6e4a22" stroke-width=".5" stroke-opacity=".3" stroke-dasharray="4 3"/>

      <!-- spokes -->
      <g id="g-spokes" stroke="#6e4a22" stroke-width="1.8" stroke-opacity=".5" stroke-linecap="round">
        <line x1="100" y1="68"  x2="100" y2="52"/>
        <line x1="124" y1="81"  x2="138" y2="73"/>
        <line x1="124" y1="119" x2="138" y2="127"/>
        <line x1="100" y1="132" x2="100" y2="148"/>
        <line x1="76"  y1="119" x2="62"  y2="127"/>
        <line x1="76"  y1="81"  x2="62"  y2="73"/>
      </g>

      <!-- bolt holes -->
      <g id="g-bolts" fill="#2e1d0c" stroke="#7a5428" stroke-width="1" stroke-opacity=".7">
        <circle cx="100" cy="60"  r="4.5"/>
        <circle cx="138" cy="80"  r="4.5"/>
        <circle cx="138" cy="120" r="4.5"/>
        <circle cx="100" cy="140" r="4.5"/>
        <circle cx="62"  cy="120" r="4.5"/>
        <circle cx="62"  cy="80"  r="4.5"/>
      </g>

      <!-- hub -->
      <circle cx="100" cy="100" r="18" id="g-hub" fill="url(#gWood)" stroke="#7a5428" stroke-width="2" stroke-opacity=".9"/>
      <circle cx="100" cy="100" r="8"  id="g-dot" fill="#8a5e30" opacity=".95"/>
      <circle cx="100" cy="100" r="3"  fill="#fff" opacity=".45"/>
    </svg>
  </div>

  <!-- story phrases -->
  <div class="story-box">
    <span class="phrase ph1 on"  id="ph0"><span class="chip">1700</span>Los primeros engranajes de madera mueven el trabajo...</span>
    <span class="phrase ph1"     id="ph1"><span class="chip">1900</span>Nacen las primeras normas de seguridad laboral</span>
    <span class="phrase ph2"     id="ph2"><span class="chip">1970</span>Computadoras llegan a la gestión industrial</span>
    <span class="phrase ph2"     id="ph3"><span class="chip">1990</span>Digitalización de los procesos HSEQ</span>
    <span class="phrase ph3"     id="ph4"><span class="chip">2024</span>Inteligencia Artificial transforma la gestión</span>
    <span class="phrase ph3"     id="ph5"><span class="chip">HOY</span>Medicloud Safety · Tu plataforma SGI inteligente ✦</span>
  </div>

  <div class="ver">v1.0 &nbsp;·&nbsp; ISO 9001 &nbsp;·&nbsp; ISO 14001 &nbsp;·&nbsp; ISO 45001</div>
</div>

<div id="portal"></div>

<button id="skip-btn">Saltar intro &nbsp;→</button>

<div id="prog-wrap"><div id="prog-fill"></div></div>

<!-- ═══ LOGIN ═══ -->
<div id="login">

  <!-- rotating gear watermark -->
  <div id="login-gear">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path id="login-gear-path" fill="none" stroke="#1ca5dc" stroke-width="2"/>
      <circle cx="100" cy="100" r="50" fill="none" stroke="#1ca5dc" stroke-width="1.5"/>
      <circle cx="100" cy="100" r="30" fill="none" stroke="#1ca5dc" stroke-width="1"/>
    </svg>
  </div>

  <!-- corner HUD brackets -->
  <div class="lc tl"></div><div class="lc tr"></div>
  <div class="lc bl"></div><div class="lc br"></div>

  <div class="login-wrap">

    <!-- HERO — la historia continúa -->
    <aside class="hero">
      <span class="hero-kicker"><span class="bdot"></span>Gestión Inteligente HSEQ</span>
      <h1 class="hero-title">La seguridad que <em>evoluciona</em> con tu empresa</h1>
      <p class="hero-lead">Más de un millón de años de progreso humano — del fuego a la inteligencia artificial — al servicio de tu salud, seguridad, calidad y medio ambiente.</p>

      <div class="tl-line">
        <div class="tl-item"><b>~1 M años ·</b> Dominio del fuego: el inicio de todo</div>
        <div class="tl-item"><b>~3500 a.C. ·</b> Invención de la rueda (Mesopotamia)</div>
        <div class="tl-item"><b>~105 d.C. ·</b> Invención del papel (China)</div>
        <div class="tl-item"><b>1765 ·</b> 1.ª Revolución Industrial: el vapor</div>
        <div class="tl-item"><b>1870 ·</b> 2.ª Revolución Industrial: la electricidad</div>
        <div class="tl-item"><b>1969 ·</b> 3.ª Revolución Industrial: la informática</div>
        <div class="tl-item"><b>1987–2018 ·</b> Normas ISO de gestión (9001 · 14001 · 45001)</div>
        <div class="tl-item"><b>2011 ·</b> 4.ª Revolución Industrial: Industria 4.0</div>
        <div class="tl-item"><b>Hoy &nbsp;·</b> Medicloud Safety: gestión HSEQ con IA</div>
      </div>

      <div class="pillars">
        <div class="pillar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
          </svg>
          <span><b>Protege</b>la salud</span>
        </div>
        <div class="pillar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
          <span><b>Previene</b>riesgos</span>
        </div>
        <div class="pillar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6"/><path d="M9 11l1.5 1.5L13 10"/><path d="M9 16h4"/>
          </svg>
          <span><b>Cumple</b>la norma</span>
        </div>
        <div class="pillar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 4-6"/><path d="M17 7h2v2"/>
          </svg>
          <span><b>Mejora</b>la productividad</span>
        </div>
      </div>

      <div class="iso-row">
        <span class="iso"><b>ISO</b> 9001</span>
        <span class="iso"><b>ISO</b> 14001</span>
        <span class="iso"><b>ISO</b> 45001</span>
      </div>
    </aside>

    <!-- LOGIN CARD -->
    <div class="card">
    <div class="c-head">
      <svg class="mc-logo" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mcDiamond" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stop-color="#3f86b3"/>
            <stop offset="38%"  stop-color="#1c5e92"/>
            <stop offset="100%" stop-color="#0b2347"/>
          </linearGradient>
          <linearGradient id="mcBevel" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stop-color="#5aa0c8"/>
            <stop offset="100%" stop-color="#0e2c52"/>
          </linearGradient>
          <linearGradient id="mcCyan" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stop-color="#34c6e0"/>
            <stop offset="100%" stop-color="#1ba0c8"/>
          </linearGradient>
        </defs>

        <!-- diamond body -->
        <path fill="url(#mcBevel)" d="M60 4
          C71 15 80 19 88 27 C98 38 106 48 113 56 C115 58 115 62 113 64
          C106 73 98 83 88 93 C80 101 71 105 60 116
          C49 105 40 101 32 93 C22 83 14 73 7 64 C5 62 5 58 7 56
          C14 48 22 38 32 27 C40 19 49 15 60 4 Z"/>
        <path fill="url(#mcDiamond)" d="M60 8
          C70.5 18.5 79 22 86.5 29.5 C96 40 103.5 49.5 110 57 C111.6 58.6 111.6 61.4 110 63
          C103.5 71.5 96 81 86.5 90.5 C79 98 70.5 101.5 60 112
          C49.5 101.5 41 98 33.5 90.5 C24 81 16.5 71.5 10 63 C8.4 61.4 8.4 58.6 10 57
          C16.5 49.5 24 40 33.5 29.5 C41 22 49.5 18.5 60 8 Z"/>

        <!-- silver ring + white face -->
        <circle cx="60" cy="60" r="43" fill="#dde4ea"/>
        <circle cx="60" cy="60" r="40" fill="#ffffff"/>

        <!-- M -->
        <path fill="url(#mcCyan)" d="M32 70 L32 44 L38.5 44 L47 60 L55.5 44 L62 44 L62 70 L56 70 L56 55 L49.5 67 L44.5 67 L38 55 L38 70 Z"/>
        <!-- thin accent line in M -->
        <rect x="40.2" y="46" width="1.1" height="22" fill="#ffffff" opacity=".85"/>
        <rect x="52.7" y="46" width="1.1" height="22" fill="#ffffff" opacity=".85"/>
        <!-- water droplet in M valley -->
        <path fill="url(#mcCyan)" d="M47 56 C50.4 60 50.4 63.6 47 65.4 C43.6 63.6 43.6 60 47 56 Z"/>
        <ellipse cx="47" cy="62" rx="1.5" ry="1.9" fill="#ffffff" opacity=".9"/>

        <!-- C (stylized open ring with circuit cut) -->
        <path fill="none" stroke="url(#mcCyan)" stroke-width="6.4" stroke-linecap="round"
              d="M84 47.5 A13 13 0 1 0 84 72.5"/>
        <rect x="62" y="55.5" width="11" height="6.4" fill="#ffffff"/>
        <rect x="64.5" y="55.5" width="8.5" height="6.4" rx="1" fill="url(#mcCyan)"/>

        <!-- MEDICLOUD wordmark -->
        <text x="60" y="86" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
              font-weight="800" font-size="11" letter-spacing=".5" fill="#0e2c52">MEDICLOUD</text>
      </svg>
      <div class="c-prod">SAFETY</div>
    </div>
    <p class="c-sub">Sistema de Gestión Inteligente</p>
    <div class="divid"></div>

    <div class="fld">
      <label class="flbl" for="email">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        Correo electrónico
      </label>
      <input class="finp" type="email" id="email" placeholder="usuario@empresa.com"
             autocomplete="email" autocapitalize="none"/>
    </div>
    <div class="fld">
      <label class="flbl" for="pass">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Contraseña
      </label>
      <input class="finp" type="password" id="pass" placeholder="••••••••" autocomplete="current-password"/>
    </div>

    <div id="login-msg" class="login-msg"></div>
    <button class="btn" id="login-btn">Iniciar Sesión &nbsp;→</button>

    <div class="sec">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Conexión SSL segura &nbsp;·&nbsp; ISO 45001 &nbsp;·&nbsp; ISO 14001 &nbsp;·&nbsp; ISO 9001
    </div>
    </div><!-- /card -->

  </div><!-- /login-wrap -->
</div>`;

export default function Login() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let killed = false;
    const timers = [];
    const resizers = [];
    const q = (s) => root.querySelector(s);

    // ── GEAR PATH ──
    function gPath(cx, cy, R, r, n, tw) {
      const tau = Math.PI * 2, s = tau / n; let d = "";
      for (let i = 0; i < n; i++) {
        const p = (a, rad) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
        const a0 = i * s - s * tw * .5, a1 = i * s - s * tw * .18, a2 = i * s + s * tw * .18, a3 = i * s + s * tw * .5, a4 = i * s + s * (1 - tw * .5);
        const [x0, y0] = p(a0, r), [x1, y1] = p(a1, R), [x2, y2] = p(a2, R), [x3, y3] = p(a3, r), [x4, y4] = p(a4, r);
        d += (i ? "L" : "M") + ` ${x0} ${y0} L ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 0 1 ${x4} ${y4} `;
      }
      return d + "Z";
    }
    const gp = q("#g-path"); if (gp) gp.setAttribute("d", gPath(100, 100, 96, 72, 12, .55));
    const lgp = q("#login-gear-path"); if (lgp) lgp.setAttribute("d", gPath(100, 100, 96, 72, 12, .55));

    // ── MATRIX RAIN ──
    const mc = q("#canvas-matrix"), mctx = mc && mc.getContext("2d");
    const POOL = "01ABCDEFabcdef0xA30xFF%HSEQISO9001ISO14001±∑≈Δ".split("");
    let mCols = [], mW = 0, mH = 0, mFS = 13, mRGB = [0, 168, 40];
    function mResize() { mW = mc.width = window.innerWidth; mH = mc.height = window.innerHeight; mFS = mW < 500 ? 11 : 13; mCols = Array.from({ length: Math.floor(mW / mFS) }, () => -Math.random() * 35); }
    if (mc) { mResize(); window.addEventListener("resize", mResize); resizers.push(mResize); }
    function drawMatrix() {
      if (!mctx) return;
      mctx.fillStyle = "rgba(7,9,14,.06)"; mctx.fillRect(0, 0, mW, mH);
      mctx.font = `${mFS}px 'Courier New',monospace`;
      const [r, g, b] = mRGB;
      mCols.forEach((y, i) => {
        const ch = POOL[Math.random() * POOL.length | 0], yPx = y * mFS, head = y >= 0 && y < 2;
        const al = head ? .95 : Math.random() > .96 ? .65 : .22;
        mctx.fillStyle = head ? `rgba(${r + 55},${g + 55},${b + 55},${al})` : `rgba(${r},${g},${b},${al})`;
        if (yPx > -mFS && yPx < mH + mFS) mctx.fillText(ch, i * mFS, yPx);
        mCols[i] += .55;
        if (yPx > mH + 20 && Math.random() > .977) mCols[i] = -Math.floor(Math.random() * 28);
      });
    }
    const matrixTimer = setInterval(drawMatrix, 50);

    // ── ATMOSPHERE PARTICLES ──
    const ac = q("#canvas-atmos"), actx = ac && ac.getContext("2d");
    let aW = 0, aH = 0, parts = [], curPhase = 1;
    function aResize() { if (!ac) return; aW = ac.width = window.innerWidth; aH = ac.height = window.innerHeight; }
    if (ac) { aResize(); window.addEventListener("resize", aResize); resizers.push(aResize); }
    function spawnPart() {
      if (curPhase === 1) {
        parts.push({ x: Math.random() * aW * .3 + 10, y: aH * .4 + Math.random() * 40, r: 10 + Math.random() * 18, vx: (Math.random() - .3) * .4, vy: -(0.5 + Math.random() * .7), life: 1, dec: .004 + Math.random() * .004, t: "smoke", c: `rgba(${80 + Math.random() * 35 | 0},${55 + Math.random() * 18 | 0},${28 + Math.random() * 12 | 0}` });
      } else if (curPhase === 2) {
        const lft = Math.random() < .5;
        parts.push({ x: lft ? 0 : aW, y: Math.random() * aH, r: 2 + Math.random() * 3, vx: (lft ? 1 : -1) * (1.2 + Math.random() * 2), vy: (Math.random() - .5) * .5, life: 1, dec: .009 + Math.random() * .007, t: "pkt", c: "rgba(74,144,184" });
      } else {
        const a = Math.random() * Math.PI * 2, sp = .6 + Math.random() * 2.2;
        parts.push({ x: aW * .5, y: aH * .44, r: 1 + Math.random() * 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, dec: .016 + Math.random() * .018, t: "spark", c: `rgba(0,${200 + Math.random() * 55 | 0},${200 + Math.random() * 55 | 0}` });
      }
    }
    function drawAtmos() {
      if (!actx) return;
      actx.clearRect(0, 0, aW, aH);
      if (Math.random() < .4) spawnPart();
      parts = parts.filter(p => p.life > 0);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life -= p.dec;
        if (p.t === "smoke") {
          p.r += .12;
          actx.beginPath(); actx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          actx.fillStyle = `${p.c},${p.life * .16})`; actx.fill();
        } else if (p.t === "pkt") {
          actx.fillStyle = `${p.c},${p.life * .55})`;
          actx.fillRect(p.x - p.r, p.y - p.r * .5, p.r * 2, p.r);
          actx.beginPath(); actx.moveTo(p.x, p.y); actx.lineTo(p.x - p.vx * 10, p.y);
          actx.strokeStyle = `${p.c},${p.life * .2})`; actx.lineWidth = 1; actx.stroke();
        } else {
          actx.beginPath(); actx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          actx.fillStyle = `${p.c},${p.life * .85})`; actx.fill();
          actx.beginPath(); actx.moveTo(p.x, p.y); actx.lineTo(p.x - p.vx * 7, p.y - p.vy * 7);
          actx.strokeStyle = `${p.c},${p.life * .28})`; actx.lineWidth = p.r * .7; actx.stroke();
        }
      });
    }
    const atmosTimer = setInterval(drawAtmos, 42);

    // ── GEAR PHASE SWITCH ──
    function setGearPhase(p) {
      curPhase = p;
      const path = q("#g-path"), hub = q("#g-hub"), dot = q("#g-dot");
      const spk = q("#g-spokes"), blt = q("#g-bolts");
      const r1 = q("#g-r1"), r2 = q("#g-r2"), r3 = q("#g-r3");
      const halo = q("#g-halo"), svg = q("#gear-svg"), lbl = q("#era-lbl");
      if (!path || !svg) return;
      if (p === 1) {
        path.setAttribute("fill", "url(#woodGrain)"); path.setAttribute("stroke", "#5e3e1c"); path.setAttribute("stroke-opacity", ".7");
        hub.setAttribute("fill", "url(#gWood)"); hub.setAttribute("stroke", "#7a5428"); dot.setAttribute("fill", "#8a5e30");
        spk.setAttribute("stroke", "#6e4a22"); blt.setAttribute("stroke", "#7a5428"); blt.setAttribute("fill", "#2e1d0c");
        r1.setAttribute("stroke", "#5e3e1c"); r1.setAttribute("fill", "#3a2510"); r2.setAttribute("stroke", "#6e4a22"); r3.setAttribute("stroke", "#6e4a22");
        if (halo) halo.setAttribute("fill", "url(#gHalo)");
        svg.style.animationDuration = "18s";
        svg.style.filter = "drop-shadow(0 0 8px rgba(160,110,55,.55)) drop-shadow(0 0 24px rgba(120,80,40,.18))";
        mRGB = [80, 120, 70];
        if (lbl) { lbl.textContent = "— Era Artesanal —"; lbl.style.color = "rgba(180,130,70,.65)"; }
      } else if (p === 2) {
        path.setAttribute("fill", "url(#gSteel)"); path.setAttribute("stroke", "#90aac8"); path.setAttribute("stroke-opacity", ".7");
        hub.setAttribute("fill", "url(#gSteel)"); hub.setAttribute("stroke", "#90aac8"); dot.setAttribute("fill", "#b0c8e0");
        spk.setAttribute("stroke", "#90aac8"); blt.setAttribute("stroke", "#90aac8"); blt.setAttribute("fill", "#0a1828");
        r1.setAttribute("stroke", "#6a8aaa"); r1.setAttribute("fill", "#0a1828"); r2.setAttribute("stroke", "#6a8aaa"); r3.setAttribute("stroke", "#6a8aaa");
        svg.style.animationDuration = "10s";
        svg.style.filter = "drop-shadow(0 0 10px rgba(144,170,200,.7)) drop-shadow(0 0 30px rgba(100,140,190,.25))";
        mRGB = [60, 130, 200];
        if (lbl) { lbl.textContent = "— Era Digital —"; lbl.style.color = "rgba(74,144,184,.7)"; }
      } else {
        path.setAttribute("fill", "url(#gCrystal)"); path.setAttribute("stroke", "#2bc0f5"); path.setAttribute("stroke-opacity", ".9");
        hub.setAttribute("fill", "rgba(28,165,220,.16)"); hub.setAttribute("stroke", "#2bc0f5"); dot.setAttribute("fill", "#3ec8f8");
        spk.setAttribute("stroke", "#2bc0f5"); blt.setAttribute("stroke", "#2bc0f5"); blt.setAttribute("fill", "rgba(8,40,80,.5)");
        r1.setAttribute("stroke", "#1ca5dc"); r1.setAttribute("fill", "rgba(6,20,45,.75)"); r2.setAttribute("stroke", "#1ca5dc"); r3.setAttribute("stroke", "#1ca5dc");
        svg.style.animationDuration = "5.5s";
        svg.style.filter = "drop-shadow(0 0 14px rgba(43,192,245,.95)) drop-shadow(0 0 50px rgba(28,165,220,.5)) drop-shadow(0 0 90px rgba(10,108,184,.22))";
        mRGB = [28, 165, 220];
        if (lbl) { lbl.textContent = "— Era IA & Datos —"; lbl.style.color = "rgba(43,192,245,.8)"; }
      }
    }
    function showObjs(p) {
      root.querySelectorAll(".obj").forEach(e => e.classList.remove("on"));
      const ids = p === 1 ? ["o-chimneys", "o-engine", "o-anvil", "o-sign", "o-lamp"]
        : p === 2 ? ["o-monitor", "o-binder", "o-floppy", "o-mainframe"]
          : ["o-robot", "o-drone", "o-phone", "o-servers", "o-holo"];
      ids.forEach((id, i) => { const t = setTimeout(() => { const e = q("#" + id); if (e) e.classList.add("on"); }, i * 180); timers.push(t); });
    }

    // ── INTRO SEQUENCE ──
    const INTRO_KEY = "mc_intro_seen";
    const introEl = q("#intro"), pwEl = q("#prog-wrap"), loginEl = q("#login"), matCanvas = q("#canvas-matrix"), portalEl = q("#portal"), skipBtn = q("#skip-btn");
    const phrases = root.querySelectorAll(".phrase");
    let introDone = false, phraseTimer = null;

    // ── LLUVIA DE FONDO (capa propia detrás de la tarjeta de login) ──
    let rainRAF = null, rainCanvas = null, rainPointer = null;
    const mouse = { x: -9999, y: -9999, active: false };
    const RAIN_R = 130; // radio de influencia del cursor
    function startRain() {
      if (rainCanvas) return;
      const c = document.createElement("canvas");
      c.id = "canvas-rain";
      c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;opacity:0;transition:opacity 1.4s ease";
      root.appendChild(c);
      rainCanvas = c;
      const ctx = c.getContext("2d");
      let w = 0, h = 0, drops = [];
      function size() {
        w = c.width = window.innerWidth; h = c.height = window.innerHeight;
        const n = Math.max(40, Math.floor(w / 7));
        drops = Array.from({ length: n }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          len: 12 + Math.random() * 26, sp: 5 + Math.random() * 8,
          op: .14 + Math.random() * .34, wob: .5 + Math.random() * 1.1,
          vx: 0,
        }));
      }
      size(); window.addEventListener("resize", size); resizers.push(size);
      // El cursor "abre" la lluvia: las gotas cercanas se apartan y brillan.
      rainPointer = (ev) => { mouse.x = ev.clientX; mouse.y = ev.clientY; mouse.active = true; };
      window.addEventListener("pointermove", rainPointer, { passive: true });
      requestAnimationFrame(() => { c.style.opacity = "1"; });
      function draw() {
        if (killed) return;
        ctx.clearRect(0, 0, w, h);
        ctx.lineCap = "round";
        for (const d of drops) {
          let op = d.op, lw = 1.3;
          if (mouse.active) {
            const dx = d.x - mouse.x, dy = d.y - mouse.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < RAIN_R * RAIN_R) {
              const dist = Math.sqrt(dist2) || 1;
              const force = 1 - dist / RAIN_R;
              d.vx += (dx / dist) * force * 1.6;     // empuje horizontal alejándose del cursor
              op = Math.min(.9, d.op + force * .55);  // brillo
              lw = 1.3 + force * 1.1;                 // gotas más marcadas cerca
            }
          }
          d.vx *= 0.9; // fricción → vuelven a caer recto
          d.x += d.vx;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.wob, d.y + d.len);
          ctx.strokeStyle = `rgba(140,212,248,${op})`;
          ctx.lineWidth = lw;
          ctx.stroke();
          d.y += d.sp;
          if (d.y > h) { d.y = -d.len - Math.random() * 140; d.x = Math.random() * w; d.vx = 0; }
          else if (d.x < -40) d.x = w + 20;
          else if (d.x > w + 40) d.x = -20;
        }
        rainRAF = requestAnimationFrame(draw);
      }
      draw();
    }

    function revealLogin(animated) {
      if (introDone) return;
      introDone = true;
      timers.forEach(clearTimeout);
      if (phraseTimer) clearInterval(phraseTimer);
      clearInterval(atmosTimer);
      if (actx) actx.clearRect(0, 0, aW, aH);
      if (skipBtn) skipBtn.style.display = "none";
      try { localStorage.setItem(INTRO_KEY, "1"); } catch (e) { /* noop */ }
      if (!animated) {
        if (introEl) introEl.style.display = "none";
        if (pwEl) pwEl.style.display = "none";
        if (matCanvas) matCanvas.classList.add("dimmed");
        if (loginEl) loginEl.classList.add("in");
        startRain();
        return;
      }
      const gs = q("#gear-stage"), sv = q("#gear-svg");
      if (sv) sv.style.filter = "drop-shadow(0 0 40px rgba(43,192,245,1)) drop-shadow(0 0 100px rgba(28,165,220,.9))";
      const t = setTimeout(() => {
        if (killed || !gs || !portalEl) return;
        const r = gs.getBoundingClientRect();
        portalEl.style.left = (r.left + r.width / 2) + "px";
        portalEl.style.top = (r.top + r.height / 2) + "px";
        if (sv) sv.style.animation = "none";
        gs.style.transition = "opacity .4s ease, transform .4s ease";
        gs.style.opacity = "0"; gs.style.transform = "scale(1.15)";
        portalEl.style.opacity = "1";
        requestAnimationFrame(() => {
          portalEl.style.transition = "transform .6s cubic-bezier(.5,0,.2,1), opacity .6s ease .15s";
          portalEl.style.transform = "translate(-50%,-50%) scale(11)";
          portalEl.style.opacity = "0";
        });
        const t2 = setTimeout(() => {
          if (killed) return;
          if (introEl) introEl.classList.add("out");
          if (pwEl) pwEl.classList.add("out");
          if (matCanvas) matCanvas.classList.add("dimmed");
          const t3 = setTimeout(() => { if (loginEl) loginEl.classList.add("in"); startRain(); }, 160);
          timers.push(t3);
        }, 420);
        timers.push(t2);
      }, 150);
      timers.push(t);
    }

    let alreadySeen = false;
    try { alreadySeen = !!localStorage.getItem(INTRO_KEY); } catch (e) { /* noop */ }
    if (alreadySeen) {
      revealLogin(false);
    } else {
      if (skipBtn) { skipBtn.style.display = "block"; skipBtn.addEventListener("click", () => revealLogin(true)); }
      setGearPhase(1); showObjs(1);
      timers.push(setTimeout(() => { if (killed) return; setGearPhase(2); showObjs(2); }, 3500));
      timers.push(setTimeout(() => { if (killed) return; setGearPhase(3); showObjs(3); }, 7000));
      let pi = 0;
      phraseTimer = setInterval(() => {
        if (!phrases.length) return;
        phrases[pi].classList.remove("on");
        pi = (pi + 1) % phrases.length;
        phrases[pi].classList.add("on");
      }, 1650);
      const pfill = q("#prog-fill");
      const T0 = performance.now(), DUR = 10000;
      (function tick(now) {
        if (introDone || killed) return;
        if (pfill) pfill.style.width = Math.min((now - T0) / DUR * 100, 100) + "%";
        if (now - T0 < DUR) requestAnimationFrame(tick);
      })(performance.now());
      timers.push(setTimeout(() => revealLogin(true), 8800));
    }

    // ── LOGIN (Supabase) ──
    const emailEl = q("#email"), passEl = q("#pass"), btn = q("#login-btn"), msg = q("#login-msg");
    function shake() {
      const card = root.querySelector(".card");
      if (!card) return;
      card.style.transition = "transform .07s"; card.style.transform = "translateX(-10px)";
      setTimeout(() => { card.style.transition = "transform .4s cubic-bezier(.36,.07,.19,.97)"; card.style.transform = ""; }, 75);
    }
    async function doLogin() {
      const e = (emailEl && emailEl.value || "").trim();
      const p = (passEl && passEl.value) || "";
      if (!e || !p) { shake(); if (msg) { msg.textContent = "Ingresa correo y contraseña"; msg.classList.add("show"); } return; }
      if (btn) { btn.disabled = true; if (!btn.dataset.label) btn.dataset.label = btn.innerHTML; btn.innerHTML = "Ingresando…"; }
      if (msg) { msg.classList.remove("show"); msg.textContent = ""; }
      const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (killed) return;
      if (error) {
        if (msg) { msg.textContent = "Credenciales incorrectas"; msg.classList.add("show"); }
        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.label; }
        shake();
        return;
      }
      // éxito → App detecta la sesión y desmonta este componente
    }
    if (btn) btn.addEventListener("click", doLogin);
    [emailEl, passEl].forEach(el => { if (el) el.addEventListener("keydown", ev => { if (ev.key === "Enter") doLogin(); }); });

    return () => {
      killed = true;
      timers.forEach(clearTimeout);
      clearInterval(matrixTimer);
      clearInterval(atmosTimer);
      if (phraseTimer) clearInterval(phraseTimer);
      if (rainRAF) cancelAnimationFrame(rainRAF);
      if (rainPointer) window.removeEventListener("pointermove", rainPointer);
      if (rainCanvas) rainCanvas.remove();
      resizers.forEach(fn => window.removeEventListener("resize", fn));
    };
  }, []);

  return (
    <div ref={rootRef} className="mc-login-root">
      <style>{LOGIN_CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: LOGIN_HTML }} />
    </div>
  );
}
