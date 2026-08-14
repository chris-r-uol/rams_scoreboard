<script>
  /**
   * Public marketing page — the only screen a signed-out visitor sees.
   *
   * The hero runs a real scorebug on a live clock rather than showing a
   * screenshot. This product's entire question is "will this look right on my
   * stream", and the cheapest honest answer is to show the actual thing moving.
   */
  import { onDestroy } from 'svelte';

  const SPORTS = [
    { emoji: '🏒', name: 'Ice Hockey', detail: 'Period clock · Power plays · Penalty timers', free: true },
    { emoji: '🏈', name: 'American Football', detail: 'Play clock · Down & distance · Timeouts' },
    { emoji: '⚽', name: 'Soccer', detail: 'Match clock · Halves · Cards · Extra time' },
    { emoji: '🏀', name: 'Basketball', detail: 'Shot clock · Quarters · Team fouls' },
    { emoji: '⚾', name: 'Baseball', detail: 'Innings · Count · Base runners · R/H/E' },
    { emoji: '🏏', name: 'Cricket', detail: 'Overs · Wickets · Run rate · Target' },
    { emoji: '🃏', name: 'Magic: The Gathering', detail: 'Life · Poison · Commander damage' },
  ];

  // Live demo clock, counting down like a real period.
  let demoSeconds = $state(742);
  let homeScore = $state(2);
  let awayScore = $state(1);

  const ticker = setInterval(() => {
    demoSeconds = demoSeconds > 0 ? demoSeconds - 1 : 1200;
  }, 1000);
  onDestroy(() => clearInterval(ticker));

  const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
</script>

<div class="landing">

  <header class="nav">
    <div class="nav-inner">
      <div class="brand">
        <span class="brand-mark">SYS</span>
        <span class="brand-name">Stream Your Score</span>
      </div>
      <nav class="nav-links">
        <a href="#/subscribe" class="nav-link">Pricing</a>
        <a href="#/login" class="btn-primary btn-sm">Start free</a>
      </nav>
    </div>
  </header>

  <!-- ═════ HERO ═════ -->
  <section class="hero">
    <span class="pill">Free forever on ice hockey · No card required</span>
    <h1>A broadcast scoreboard<br />that lives in your browser.</h1>
    <p class="lede">
      Run the game from any browser. Drop one URL into OBS as a Browser Source and your
      scorebug appears — transparent, real-time, no software to install.
    </p>

    <div class="hero-cta">
      <a href="#/login" class="btn-primary">Start free with ice hockey</a>
      <a href="#/subscribe" class="btn-ghost">See all seven sports</a>
    </div>

    <!-- Live scorebug, not a screenshot -->
    <div class="demo">
      <span class="demo-label">Live — this is the actual overlay</span>
      <div class="scorebug">
        <div class="team team-home">
          <span class="team-name">HOME</span>
          <span class="team-score">{homeScore}</span>
        </div>
        <div class="centre">
          <span class="clock">{mmss(demoSeconds)}</span>
          <span class="period">2ND</span>
        </div>
        <div class="team team-away">
          <span class="team-score">{awayScore}</span>
          <span class="team-name">AWAY</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ═════ SPORTS ═════ -->
  <section class="section">
    <h2>Seven sports, each with controls built for it</h2>
    <p class="section-lede">
      Not one generic scoreboard with the labels swapped. Every sport gets the clocks,
      counters and states that sport actually needs.
    </p>

    <div class="sport-grid">
      {#each SPORTS as sport}
        <div class="sport" class:sport-free={sport.free}>
          <span class="sport-emoji">{sport.emoji}</span>
          <div class="sport-text">
            <span class="sport-name">
              {sport.name}
              {#if sport.free}<span class="free-tag">Free</span>{/if}
            </span>
            <span class="sport-detail">{sport.detail}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- ═════ HOW ═════ -->
  <section class="section">
    <h2>Three steps to on-air</h2>
    <div class="steps">
      <div class="step">
        <span class="step-n">1</span>
        <h3>Pick your sport</h3>
        <p>You get a controller tailored to it — the right clocks, the right counters.</p>
      </div>
      <div class="step">
        <span class="step-n">2</span>
        <h3>Copy your overlay URL</h3>
        <p>One click. Paste it into OBS as a Browser Source. It never changes, so you set it up once.</p>
      </div>
      <div class="step">
        <span class="step-n">3</span>
        <h3>Run the game</h3>
        <p>Every change appears on stream instantly. A connection light tells you the link is live.</p>
      </div>
    </div>
  </section>

  <!-- ═════ PRICING ═════ -->
  <section class="section">
    <h2>Start free. Upgrade when you need more.</h2>

    <div class="plans">
      <div class="plan">
        <span class="plan-name">Free</span>
        <span class="plan-price">£0<span class="plan-per">forever</span></span>
        <ul class="plan-list">
          <li class="yes">Ice hockey scoreboard, in full</li>
          <li class="yes">OBS browser-source overlay</li>
          <li class="yes">Real-time sync</li>
          <li class="yes">Team names and colours</li>
          <li class="no">Small watermark on the overlay</li>
          <li class="no">Other six sports locked</li>
        </ul>
        <a href="#/login" class="btn-ghost btn-block">Start free — no card</a>
      </div>

      <div class="plan plan-featured">
        <span class="plan-badge">Everything unlocked</span>
        <span class="plan-name">Pro</span>
        <span class="plan-price">£8<span class="plan-per">/month</span></span>
        <ul class="plan-list">
          <li class="yes">All seven sports</li>
          <li class="yes">No watermark</li>
          <li class="yes">Real-time sync</li>
          <li class="yes">Team names and colours</li>
          <li class="yes">Priority support</li>
          <li class="yes">Cancel anytime</li>
        </ul>
        <a href="#/subscribe" class="btn-primary btn-block">See Pro pricing</a>
      </div>
    </div>
    <p class="plan-note">Annual billing available at £55/year — around £4.58 a month.</p>
  </section>

  <footer class="footer">
    <div class="footer-links">
      <a href="#/login">Sign in</a>
      <span>·</span>
      <a href="#/privacy">Privacy Policy</a>
      <span>·</span>
      <a href="#/terms">Terms &amp; Conditions</a>
    </div>
    <p class="footer-note">Stream Your Score — broadcast scoreboards for people who stream sport.</p>
  </footer>
</div>

<style>
  .landing {
    --ink:      #f8fafc;
    --ink-soft: #94a3b8;
    --ink-mute: #64748b;
    --ground:   #050813;
    --panel:    #0d1424;
    --line:     #1e293b;
    --ice:      #38bdf8;
    --ice-deep: #0284c7;

    background: var(--ground);
    color: var(--ink);
    min-height: 100vh;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  /* ── Nav ── */
  .nav {
    position: sticky; top: 0; z-index: 50;
    background: rgba(5, 8, 19, 0.85);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--line);
  }
  .nav-inner {
    max-width: 1120px; margin: 0 auto; padding: 14px 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .brand-mark {
    background: var(--ice); color: #04121c;
    font-weight: 900; font-size: 12px; letter-spacing: 0.05em;
    padding: 4px 7px; border-radius: 6px;
  }
  .brand-name { font-weight: 700; font-size: 15px; letter-spacing: -0.01em; }
  .nav-links { display: flex; align-items: center; gap: 8px; }
  .nav-link {
    color: var(--ink-soft); text-decoration: none; font-size: 14px; font-weight: 500;
    padding: 8px 12px; border-radius: 8px; transition: color .15s ease;
  }
  .nav-link:hover { color: var(--ink); }

  /* ── Buttons ── */
  .btn-primary {
    background: var(--ice); color: #04121c;
    font-weight: 700; font-size: 15px; text-decoration: none;
    padding: 13px 24px; border-radius: 11px;
    display: inline-block; transition: transform .15s ease, background .15s ease;
  }
  .btn-primary:hover { background: #7dd3fc; }
  .btn-primary:active { transform: scale(.98); }
  .btn-sm { padding: 8px 15px; font-size: 14px; border-radius: 9px; }

  .btn-ghost {
    color: var(--ink); background: transparent;
    border: 1px solid #334155;
    font-weight: 600; font-size: 15px; text-decoration: none;
    padding: 12px 23px; border-radius: 11px;
    display: inline-block; transition: border-color .15s ease, background .15s ease;
  }
  .btn-ghost:hover { border-color: var(--ice); background: rgba(56, 189, 248, .07); }
  .btn-block { display: block; text-align: center; margin-top: auto; }

  /* ── Hero ── */
  .hero {
    max-width: 880px; margin: 0 auto;
    padding: 76px 24px 48px; text-align: center;
  }
  .pill {
    display: inline-block;
    background: rgba(56, 189, 248, .12);
    border: 1px solid rgba(56, 189, 248, .3);
    color: var(--ice);
    font-size: 12px; font-weight: 700; letter-spacing: .04em;
    padding: 7px 15px; border-radius: 999px; margin-bottom: 26px;
  }
  .hero h1 {
    font-size: clamp(34px, 6vw, 56px);
    line-height: 1.06; letter-spacing: -.035em; font-weight: 800;
    margin: 0 0 20px; text-wrap: balance;
  }
  .lede {
    color: var(--ink-soft); font-size: 18px; line-height: 1.65;
    max-width: 60ch; margin: 0 auto 32px;
  }
  .hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 56px; }

  /* ── Live demo scorebug ── */
  .demo { display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .demo-label {
    font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-mute);
    display: flex; align-items: center; gap: 7px;
  }
  .demo-label::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e; box-shadow: 0 0 8px #22c55e;
  }
  .scorebug {
    display: flex; align-items: stretch;
    border-radius: 10px; overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,.55);
    font-variant-numeric: tabular-nums;
  }
  .team { display: flex; align-items: center; gap: 14px; padding: 14px 22px; }
  .team-home { background: linear-gradient(100deg, #0c2340, #1e4d7b); }
  .team-away { background: linear-gradient(260deg, #7a0d16, #c8102e); }
  .team-name { font-size: 14px; font-weight: 800; letter-spacing: .12em; }
  .team-score { font-size: 30px; font-weight: 900; line-height: 1; }
  .centre {
    background: #05070d; padding: 12px 22px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  }
  .clock { font-size: 25px; font-weight: 800; letter-spacing: -.02em; line-height: 1; }
  .period { font-size: 10px; font-weight: 800; letter-spacing: .16em; color: var(--ink-mute); }

  /* ── Sections ── */
  .section { max-width: 1000px; margin: 0 auto; padding: 56px 24px; }
  .section h2 {
    font-size: clamp(24px, 3.6vw, 34px); font-weight: 800;
    letter-spacing: -.025em; text-align: center; margin: 0 0 14px; text-wrap: balance;
  }
  .section-lede {
    color: var(--ink-soft); text-align: center; font-size: 16px;
    max-width: 58ch; margin: 0 auto 40px; line-height: 1.65;
  }

  /* ── Sports ── */
  .sport-grid {
    display: grid; gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(268px, 1fr));
  }
  .sport {
    display: flex; align-items: center; gap: 15px;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 13px; padding: 17px 19px;
  }
  .sport-free { border-color: rgba(56, 189, 248, .45); background: rgba(56, 189, 248, .06); }
  .sport-emoji { font-size: 27px; line-height: 1; flex-shrink: 0; }
  .sport-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .sport-name { font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .free-tag {
    background: var(--ice); color: #04121c;
    font-size: 10px; font-weight: 800; letter-spacing: .06em;
    padding: 2px 7px; border-radius: 5px; text-transform: uppercase;
  }
  .sport-detail { font-size: 12.5px; color: var(--ink-mute); line-height: 1.5; }

  /* ── Steps ── */
  .steps { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(258px, 1fr)); }
  .step {
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 15px; padding: 24px;
  }
  .step-n {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border-radius: 9px;
    background: rgba(56, 189, 248, .14); color: var(--ice);
    font-weight: 800; font-size: 14px; margin-bottom: 14px;
  }
  .step h3 { margin: 0 0 8px; font-size: 16.5px; font-weight: 700; letter-spacing: -.01em; }
  .step p { margin: 0; color: var(--ink-soft); font-size: 14px; line-height: 1.65; }

  /* ── Plans ── */
  .plans {
    display: grid; gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(288px, 1fr));
    max-width: 760px; margin: 0 auto;
  }
  .plan {
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 17px; padding: 28px;
    display: flex; flex-direction: column; position: relative;
  }
  .plan-featured { border-color: var(--ice); box-shadow: 0 0 0 1px var(--ice), 0 18px 44px rgba(2,132,199,.18); }
  .plan-badge {
    position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
    background: var(--ice); color: #04121c;
    font-size: 10.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
    padding: 4px 12px; border-radius: 999px; white-space: nowrap;
  }
  .plan-name {
    font-size: 12px; font-weight: 800; letter-spacing: .13em;
    text-transform: uppercase; color: var(--ink-mute); margin-bottom: 10px;
  }
  .plan-price { font-size: 40px; font-weight: 900; letter-spacing: -.035em; line-height: 1; }
  .plan-per { font-size: 14px; font-weight: 600; color: var(--ink-mute); margin-left: 7px; letter-spacing: 0; }
  .plan-list { list-style: none; padding: 0; margin: 22px 0 26px; display: flex; flex-direction: column; gap: 11px; }
  .plan-list li {
    font-size: 14px; color: var(--ink-soft); line-height: 1.45;
    padding-left: 26px; position: relative;
  }
  .plan-list li::before {
    position: absolute; left: 0; top: 0; font-weight: 800;
  }
  .plan-list .yes::before { content: '✓'; color: #4ade80; }
  .plan-list .no::before  { content: '·'; color: var(--ink-mute); font-size: 20px; line-height: 1; }
  .plan-list .no { color: var(--ink-mute); }
  .plan-note { text-align: center; color: var(--ink-mute); font-size: 13px; margin: 22px 0 0; }

  /* ── Footer ── */
  .footer { border-top: 1px solid var(--line); padding: 34px 24px 44px; text-align: center; }
  .footer-links {
    display: flex; align-items: center; justify-content: center;
    gap: 12px; font-size: 13px; color: var(--ink-mute); flex-wrap: wrap;
  }
  .footer-links a { color: var(--ink-soft); text-decoration: none; }
  .footer-links a:hover { color: var(--ink); }
  .footer-note { color: var(--ink-mute); font-size: 12.5px; margin: 14px 0 0; }

  @media (max-width: 560px) {
    .hero { padding-top: 52px; }
    .team { padding: 12px 15px; gap: 10px; }
    .team-score { font-size: 24px; }
    .clock { font-size: 21px; }
    .centre { padding: 10px 15px; }
  }
</style>
