/* pages.js — рендер всех страниц */

const Pages = (() => {

  /* ── Helpers ─────────────────────────────── */
  const fmtPrice = p => p >= 1000 ? `$${p.toLocaleString('en',{maximumFractionDigits:1})}` :
                        p >= 1    ? `$${p.toFixed(3)}` : `$${p.toFixed(6)}`;

  const fmtOI = (oi, price) => {
    const v = oi * price;
    return v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`;
  };

  const scoreColor = s => s >= 70 ? 'var(--green)' : s >= 50 ? 'var(--yellow)' : s >= 30 ? '#f97316' : 'var(--red)';
  const scoreClass = s => s >= 70 ? 'pill-green' : s >= 50 ? 'pill-yellow' : 'pill-red';

  const AVATARS = {
    BTC:'#f7931a',ETH:'#627eea',BNB:'#f3ba2f',SOL:'#9945ff',
    XRP:'#00aae4',DOGE:'#c2a633',ADA:'#0033ad',AVAX:'#e84142',
    LINK:'#2a5ada',DOT:'#e6007a',MATIC:'#8247e5',UNI:'#ff007a',
    LTC:'#bfbbbb',ATOM:'#2e3148',NEAR:'#000000',ARB:'#12aaff',
    OP:'#ff0420',APT:'#00bcd4',SUI:'#4da2ff',INJ:'#00f2fe',
    DEFAULT:'#6c63ff',
  };

  function avatarColor(symbol) {
    const sym = symbol.replace('USDT','');
    return AVATARS[sym] || AVATARS.DEFAULT;
  }

  function coinAvatar(symbol, size = 38) {
    const sym = symbol.replace('USDT','');
    const bg  = avatarColor(symbol);
    return `<div class="coin-avatar" style="width:${size}px;height:${size}px;background:${bg};">${sym[0]}</div>`;
  }

  function scoreBar(score, color) {
    return `
      <div class="bar-wrap">
        <div class="bar-bg"><div class="bar-fill" style="width:${score}%;background:${color};"></div></div>
        <div class="bar-pct" style="color:${color};">${score}%</div>
      </div>`;
  }

  function signalLabel(bScore, bull, tScore, bear) {
    if (bScore >= 70 && bull) return { txt: 'LONG',  cls: 'c-green',  pill: 'pill-green'  };
    if (bScore >= 55)         return { txt: 'WATCH', cls: 'c-yellow', pill: 'pill-yellow' };
    if (tScore >= 70 && bear) return { txt: 'SHORT', cls: 'c-red',    pill: 'pill-red'    };
    if (tScore >= 55)         return { txt: 'WATCH', cls: 'c-yellow', pill: 'pill-yellow' };
    return                           { txt: 'WAIT',  cls: 'c-dim',    pill: ''            };
  }

  function tags(coin) {
    const b = coin.scores.bottom, t = coin.scores.top;
    const arr = [];
    if (coin.rsi < 30)             arr.push(`<span class="tag tag-rsi">RSI ${coin.rsi}</span>`);
    if (coin.rsi > 70)             arr.push(`<span class="tag tag-rsi">RSI ${coin.rsi}</span>`);
    if (coin.div.bull)             arr.push(`<span class="tag tag-div">Bull Div</span>`);
    if (coin.div.bear)             arr.push(`<span class="tag tag-div">Bear Div</span>`);
    if (coin.scores.bottom.bb)     arr.push(`<span class="tag tag-bb">BB Low</span>`);
    if (coin.scores.top.bb)        arr.push(`<span class="tag tag-bb">BB High</span>`);
    if (coin.funding < -0.03)      arr.push(`<span class="tag tag-fund">Fund ${coin.funding}%</span>`);
    if (coin.rvol >= 2)            arr.push(`<span class="tag tag-vol">Vol ${coin.rvol}x</span>`);
    if (coin.zscore < -2 || coin.zscore > 2) arr.push(`<span class="tag tag-zscore">Z ${coin.zscore}</span>`);
    return arr.join('');
  }

  /* ── Loader ──────────────────────────────── */
  function loader(msg = 'Загружаю данные...') {
    return `<div class="loader"><div class="loader-ring"></div><p>${msg}</p></div>`;
  }

  /* ── FNG Ring ────────────────────────────── */
  function fngRing(value) {
    const r = 28, circ = 2 * Math.PI * r;
    const pct = value / 100;
    const offset = circ * (1 - pct);
    const color = value <= 25 ? 'var(--red)' : value <= 40 ? '#f97316' : value <= 60 ? 'var(--yellow)' : value <= 75 ? 'var(--green)' : '#22c55e';
    return `
      <svg width="72" height="72" viewBox="0 0 72 72" class="fng-ring">
        <circle cx="36" cy="36" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="5"/>
        <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="5"
          stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
          transform="rotate(-90 36 36)"/>
        <text x="36" y="40" text-anchor="middle" fill="${color}" font-size="14" font-weight="600" font-family="-apple-system,sans-serif">${value}</text>
      </svg>`;
  }

  /* ════════════════════════════════════════════
     PAGE: MARKET
  ════════════════════════════════════════════ */
  function renderMarket(state) {
    if (state.loading) return loader('Загружаю рынок...');
    const { coins, fng, tf } = state;
    if (!coins.length) return loader('Нет данных...');

    const fngValue = fng.value;
    const fngLabel = fng.label;
    const fngColor = fngValue <= 25 ? 'var(--red)' : fngValue <= 40 ? '#f97316' : fngValue <= 60 ? 'var(--yellow)' : 'var(--green)';

    const oversold   = coins.filter(c => c.rsi < 30).length;
    const overbought = coins.filter(c => c.rsi > 70).length;
    const negFund    = coins.filter(c => c.funding < -0.03).length;
    const longSignals= coins.filter(c => c.scores.bottom.total >= 70).length;

    const topLong  = [...coins].sort((a,b) => b.scores.bottom.total - a.scores.bottom.total).slice(0,3);
    const topShort = [...coins].sort((a,b) => b.scores.top.total - a.scores.top.total).slice(0,3)
                              .filter(c => c.scores.top.total >= 50);

    const coinRows = (list, mode) => list.map(c => {
      const sym = c.symbol.replace('USDT','');
      const score = mode === 'long' ? c.scores.bottom.total : c.scores.top.total;
      const color = scoreColor(score);
      const sig   = signalLabel(c.scores.bottom.total, c.div.bull, c.scores.top.total, c.div.bear);
      return `
        <div class="coin-row card-strong" data-symbol="${c.symbol}" data-action="open-coin">
          ${coinAvatar(c.symbol)}
          <div class="coin-info">
            <div class="coin-name">${sym} / USDT</div>
            <div class="coin-meta">RSI ${c.rsi} · Fund ${c.funding > 0 ? '+' : ''}${c.funding}% · Z ${c.zscore}</div>
            ${scoreBar(score, color)}
          </div>
          <div class="coin-right">
            <div class="pill ${scoreClass(score)}">${score} / 100</div>
            <div class="sig-label ${sig.cls}">${sig.txt}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="fng-card card" style="margin-bottom:12px;">
        <div>
          <div class="fng-label">Fear & Greed Index</div>
          <div class="fng-value" style="color:${fngColor};">${fngValue}</div>
          <div class="fng-sub" style="color:${fngColor};">${fngLabel}</div>
        </div>
        ${fngRing(fngValue)}
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Перепроданных</div>
          <div class="stat-value c-green">${oversold}</div>
          <div class="stat-desc c-green">RSI &lt; 30</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Перекупленных</div>
          <div class="stat-value c-red">${overbought}</div>
          <div class="stat-desc c-red">RSI &gt; 70</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Фандинг (−)</div>
          <div class="stat-value c-green">${negFund}</div>
          <div class="stat-desc c-dim">монет</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">LONG сигналы</div>
          <div class="stat-value c-purple">${longSignals}</div>
          <div class="stat-desc c-purple">скор ≥ 70</div>
        </div>
      </div>

      <div class="section-label">Топ LONG сигналы</div>
      ${coinRows(topLong, 'long')}

      ${topShort.length ? `<div class="section-label" style="margin-top:10px;">Топ SHORT сигналы</div>${coinRows(topShort, 'short')}` : ''}
    `;
  }

  /* ════════════════════════════════════════════
     PAGE: SCREENER
  ════════════════════════════════════════════ */
  function renderScreener(state, filter = 'oversold') {
    if (state.loading) return loader('Загружаю скринер...');
    const { coins } = state;

    const filters = [
      { key:'oversold',   label:'RSI < 30'     },
      { key:'overbought', label:'RSI > 70'      },
      { key:'fund_neg',   label:'Фандинг (−)'   },
      { key:'fund_pos',   label:'Фандинг (+)'   },
      { key:'volume',     label:'Объём 🔥'       },
      { key:'score',      label:'Скор > 60'     },
    ];

    let list = [];
    switch (filter) {
      case 'oversold':   list = [...coins].filter(c=>c.rsi<30).sort((a,b)=>a.rsi-b.rsi); break;
      case 'overbought': list = [...coins].filter(c=>c.rsi>70).sort((a,b)=>b.rsi-a.rsi); break;
      case 'fund_neg':   list = [...coins].filter(c=>c.funding<0).sort((a,b)=>a.funding-b.funding); break;
      case 'fund_pos':   list = [...coins].filter(c=>c.funding>0).sort((a,b)=>b.funding-a.funding); break;
      case 'volume':     list = [...coins].filter(c=>c.rvol>=2).sort((a,b)=>b.rvol-a.rvol); break;
      case 'score':      list = [...coins].filter(c=>Math.max(c.scores.bottom.total,c.scores.top.total)>=60)
                                          .sort((a,b)=>Math.max(b.scores.bottom.total,b.scores.top.total)-Math.max(a.scores.bottom.total,a.scores.top.total)); break;
    }

    const ftabs = filters.map(f =>
      `<button class="ftab${f.key===filter?' active':''}" data-filter="${f.key}">${f.label}</button>`
    ).join('');

    const rows = list.slice(0,20).map(c => {
      const sym = c.symbol.replace('USDT','');
      const isLong = filter === 'oversold' || filter === 'fund_neg';
      const score = isLong ? c.scores.bottom.total : c.scores.top.total;
      const color = scoreColor(score);
      const sig   = signalLabel(c.scores.bottom.total, c.div.bull, c.scores.top.total, c.div.bear);

      let meta = '';
      if (filter === 'fund_neg' || filter === 'fund_pos') meta = `Funding ${c.funding > 0 ? '+' : ''}${c.funding}% · L/S ${c.longShort} · OI ${fmtOI(c.oi, c.close)}`;
      else if (filter === 'volume') meta = `Vol ${c.rvol}x · RSI ${c.rsi} · LONG ${c.scores.bottom.total}/100`;
      else if (filter === 'score') meta = `LONG ${c.scores.bottom.total}/100 · SHORT ${c.scores.top.total}/100`;
      else meta = `RSI ${c.rsi} · Fund ${c.funding}% · Z ${c.zscore}`;

      return `
        <div class="coin-row card-strong" data-symbol="${c.symbol}" data-action="open-coin">
          ${coinAvatar(c.symbol)}
          <div class="coin-info">
            <div class="coin-name">${sym} / USDT</div>
            <div class="coin-meta">${meta}</div>
            ${scoreBar(score, color)}
          </div>
          <div class="coin-right">
            <div class="pill ${scoreClass(score)}">${score}/100</div>
            <div class="sig-label ${sig.cls}">${sig.txt}</div>
          </div>
        </div>`;
    }).join('') || `<div class="empty"><p>Нет монет по этому фильтру</p></div>`;

    return `
      <div class="filter-tabs">${ftabs}</div>
      ${rows}
    `;
  }

  /* ════════════════════════════════════════════
     PAGE: SIGNALS
  ════════════════════════════════════════════ */
  function renderSignals(state) {
    if (state.loading) return loader('Анализирую сигналы...');
    const { coins } = state;

    const active = [...coins]
      .filter(c => c.scores.bottom.total >= 65 || c.scores.top.total >= 65)
      .sort((a,b) => Math.max(b.scores.bottom.total,b.scores.top.total) - Math.max(a.scores.bottom.total,a.scores.top.total))
      .slice(0,10);

    const watching = [...coins]
      .filter(c => {
        const max = Math.max(c.scores.bottom.total, c.scores.top.total);
        return max >= 45 && max < 65;
      })
      .sort((a,b) => Math.max(b.scores.bottom.total,b.scores.top.total) - Math.max(a.scores.bottom.total,a.scores.top.total))
      .slice(0,6);

    const renderCard = (c, mode) => {
      const sym = c.symbol.replace('USDT','');
      const score = mode === 'long' ? c.scores.bottom.total : mode === 'short' ? c.scores.top.total : Math.max(c.scores.bottom.total, c.scores.top.total);
      const isLong = c.scores.bottom.total >= c.scores.top.total;
      const color = mode === 'long' ? 'var(--green)' : mode === 'short' ? 'var(--red)' : 'var(--yellow)';
      const cls   = mode === 'long' ? 'long' : mode === 'short' ? 'short' : 'watch';
      const label = mode === 'long' ? 'LONG' : mode === 'short' ? 'SHORT' : 'WATCH';
      const pillCls = mode === 'long' ? 'pill-green' : mode === 'short' ? 'pill-red' : 'pill-yellow';

      return `
        <div class="signal-card card ${cls}" data-symbol="${c.symbol}" data-action="open-coin">
          <div class="signal-top">
            <div style="display:flex;align-items:center;gap:10px;">
              ${coinAvatar(c.symbol, 36)}
              <div>
                <div class="signal-sym">${sym} / USDT</div>
                <div class="c-dim" style="font-size:11px;">${fmtPrice(c.close)}</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div class="pill ${pillCls}">${score} / 100</div>
              <div class="sig-label" style="color:${color};">${label}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="flex:1;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
              <div style="width:${score}%;height:100%;background:${color};border-radius:2px;"></div>
            </div>
          </div>
          <div class="signal-tags">${tags(c)}</div>
        </div>`;
    };

    const activeHTML = active.map(c => {
      const isLong = c.scores.bottom.total >= c.scores.top.total;
      return renderCard(c, isLong ? 'long' : 'short');
    }).join('') || `<div class="empty"><p>Активных сигналов нет</p></div>`;

    const watchHTML = watching.map(c => renderCard(c, 'watch')).join('');

    return `
      <div class="section-label">Активные сигналы (${active.length})</div>
      ${activeHTML}
      ${watching.length ? `<div class="section-label" style="margin-top:4px;">На подходе — присмотреться</div>${watchHTML}` : ''}
    `;
  }

  /* ════════════════════════════════════════════
     PAGE: SEARCH / COIN DETAIL
  ════════════════════════════════════════════ */
  function renderSearch(state) {
    const topCoins = state.coins.slice(0,20).map(c => {
      const sym = c.symbol.replace('USDT','');
      const b   = c.scores.bottom.total;
      const t   = c.scores.top.total;
      const sig = signalLabel(b, c.div.bull, t, c.div.bear);
      return `
        <div class="coin-row card-strong" data-symbol="${c.symbol}" data-action="open-coin" style="margin-bottom:6px;">
          ${coinAvatar(c.symbol)}
          <div class="coin-info">
            <div class="coin-name">${sym} / USDT</div>
            <div class="coin-meta">${fmtPrice(c.close)} · RSI ${c.rsi}</div>
          </div>
          <div class="coin-right">
            <div class="sig-label ${sig.cls}">${sig.txt}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="search-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input class="search-input" id="ticker-input" placeholder="BTC, SOL, PEPE..." autocomplete="off" autocapitalize="characters" />
      </div>
      <div id="search-result"></div>
      <div class="section-label">Топ монеты</div>
      ${topCoins}
    `;
  }

  function renderCoinDetail(coin, fng) {
    const sym   = coin.symbol.replace('USDT','');
    const b     = coin.scores.bottom;
    const t     = coin.scores.top;
    const sig   = signalLabel(b.total, coin.div.bull, t.total, coin.div.bear);
    const fngV  = fng ? fng.value : 50;

    const patternLabels = {
      hammer:'Hammer', bull_engulf:'Bull Engulfing', dragonfly:'Dragonfly Doji',
      shooting_star:'Shooting Star', bear_engulf:'Bear Engulfing', gravestone:'Gravestone Doji', none:'—',
    };

    const rows = [
      ['RSI (14)',    `<span class="${coin.rsi<30?'c-green':coin.rsi>70?'c-red':'c-muted'}">${coin.rsi}</span>`],
      ['EMA200 dist', `<span class="${coin.emaDist>0?'c-green':coin.emaDist<-15?'c-red':'c-muted'}">${coin.emaDist>0?'+':''}${coin.emaDist}%</span>`],
      ['BB Band',     coin.close < coin.bbLower ? '<span class="c-green">Ниже нижней</span>' : coin.close > coin.bbUpper ? '<span class="c-red">Выше верхней</span>' : '<span class="c-muted">В канале</span>'],
      ['Z-Score',     `<span class="${coin.zscore<-2?'c-green':coin.zscore>2?'c-red':'c-muted'}">${coin.zscore}</span>`],
      ['Rel.Volume',  `<span class="${coin.rvol>=2?'c-yellow':'c-muted'}">${coin.rvol}x</span>`],
      ['Bull Div',    coin.div.bull ? '<span class="c-green">✓ Есть</span>' : '<span class="c-dim">—</span>'],
      ['Bear Div',    coin.div.bear ? '<span class="c-red">✓ Есть</span>' : '<span class="c-dim">—</span>'],
      ['Паттерн',     `<span class="c-muted">${patternLabels[coin.pattern]||'—'}</span>`],
      ['Funding',     `<span class="${coin.funding<-0.03?'c-green':coin.funding>0.03?'c-red':'c-muted'}">${coin.funding>0?'+':''}${coin.funding}%</span>`],
      ['OI',          `<span class="c-muted">${fmtOI(coin.oi, coin.close)}</span>`],
      ['Long/Short',  `<span class="${coin.longShort<0.9?'c-green':coin.longShort>1.1?'c-red':'c-muted'}">${coin.longShort}</span>`],
      ['Fear & Greed',`<span class="${fngV<=25?'c-red':fngV<=40?'c-yellow':'c-green'}">${fngV}</span>`],
    ].map(([k,v]) => `<div class="detail-row"><span class="key">${k}</span><span class="val">${v}</span></div>`).join('');

    return `
      <button class="icon-btn" data-action="back" style="margin-bottom:14px;width:auto;padding:0 14px;border-radius:20px;gap:6px;font-size:13px;font-family:var(--font);color:var(--text-2);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Назад
      </button>

      <div class="card-strong" style="margin-bottom:10px;">
        <div class="detail-header">
          ${coinAvatar(coin.symbol, 48)}
          <div>
            <div class="detail-name">${sym} / USDT</div>
            <div class="detail-price">${fmtPrice(coin.close)} · ${coin.updatedAt}</div>
          </div>
          <div style="margin-left:auto;">
            <div class="pill ${sig.cls.replace('c-','pill-') || ''}" style="font-size:12px;padding:5px 12px;">${sig.txt}</div>
          </div>
        </div>
        ${rows}

        <div class="score-block">
          <div class="score-line">
            <div class="score-line-label c-green">LONG</div>
            <div class="score-line-bar"><div class="score-line-fill" style="width:${b.total}%;background:var(--green);"></div></div>
            <div class="score-line-num c-green">${b.total}/100</div>
          </div>
          <div class="score-line">
            <div class="score-line-label c-red">SHORT</div>
            <div class="score-line-bar"><div class="score-line-fill" style="width:${t.total}%;background:var(--red);"></div></div>
            <div class="score-line-num c-red">${t.total}/100</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCoinLoading(symbol) {
    return `<div class="loader"><div class="loader-ring"></div><p>Загружаю ${symbol}...</p></div>`;
  }

  return { renderMarket, renderScreener, renderSignals, renderSearch, renderCoinDetail, renderCoinLoading, loader };
})();
