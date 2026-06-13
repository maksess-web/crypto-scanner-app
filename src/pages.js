/* pages.js */
const Pages = (() => {
  const fmtPrice = p => p >= 1000 ? `$${p.toLocaleString('en',{maximumFractionDigits:1})}` : p >= 1 ? `$${p.toFixed(3)}` : `$${p.toFixed(6)}`;
  const fmtOI = (oi, price) => { const v=oi*price; return v>=1e9?`$${(v/1e9).toFixed(2)}B`:v>=1e6?`$${(v/1e6).toFixed(1)}M`:`$${(v/1e3).toFixed(0)}K`; };
  const scoreColor = s => s>=70?'var(--green)':s>=50?'var(--yellow)':s>=30?'#f97316':'var(--red)';
  const scoreClass = s => s>=70?'pill-green':s>=50?'pill-yellow':'pill-red';
  const AVATARS = {BTC:'#f7931a',ETH:'#627eea',BNB:'#f3ba2f',SOL:'#9945ff',XRP:'#00aae4',DOGE:'#c2a633',ADA:'#0033ad',AVAX:'#e84142',LINK:'#2a5ada',DOT:'#e6007a',MATIC:'#8247e5',UNI:'#ff007a',LTC:'#bfbbbb',ATOM:'#2e3148',NEAR:'#000000',ARB:'#12aaff',OP:'#ff0420',APT:'#00bcd4',SUI:'#4da2ff',INJ:'#00f2fe',DEFAULT:'#6c63ff'};
  const avatarBg = sym => AVATARS[sym.replace('USDT','')] || AVATARS.DEFAULT;
  const avatar = (sym, sz=38) => `<div class="coin-avatar" style="width:${sz}px;height:${sz}px;background:${avatarBg(sym)};">${sym.replace('USDT','')[0]}</div>`;

  const scoreBar = (s,c) => `<div class="bar-wrap"><div class="bar-bg"><div class="bar-fill" style="width:${s}%;background:${c};"></div></div><div class="bar-pct" style="color:${c};">${s}%</div></div>`;

  const sigLabel = (b,bull,t,bear) => {
    if(b>=70&&bull) return {txt:'LONG', cls:'c-green', pill:'pill-green'};
    if(b>=55)       return {txt:'WATCH',cls:'c-yellow',pill:'pill-yellow'};
    if(t>=70&&bear) return {txt:'SHORT',cls:'c-red',   pill:'pill-red'};
    if(t>=55)       return {txt:'WATCH',cls:'c-yellow',pill:'pill-yellow'};
    return                 {txt:'WAIT', cls:'c-dim',   pill:''};
  };

  const tags = c => {
    const a=[];
    if(c.rsi<30)  a.push(`<span class="tag tag-rsi">RSI ${c.rsi}</span>`);
    if(c.rsi>70)  a.push(`<span class="tag tag-rsi">RSI ${c.rsi}</span>`);
    if(c.div.bull) a.push(`<span class="tag tag-div">Bull Div</span>`);
    if(c.div.bear) a.push(`<span class="tag tag-div">Bear Div</span>`);
    if(c.scores.bottom.bb) a.push(`<span class="tag tag-bb">BB Low</span>`);
    if(c.scores.top.bb)    a.push(`<span class="tag tag-bb">BB High</span>`);
    if(c.funding<-0.03) a.push(`<span class="tag tag-fund">Fund ${c.funding}%</span>`);
    if(c.rvol>=2) a.push(`<span class="tag tag-vol">Vol ${c.rvol}x</span>`);
    if(Math.abs(c.zscore)>2) a.push(`<span class="tag tag-zscore">Z ${c.zscore}</span>`);
    return a.join('');
  };

  const fngRing = v => {
    const r=28,circ=2*Math.PI*r,offset=circ*(1-v/100);
    const color=v<=25?'var(--red)':v<=40?'#f97316':v<=60?'var(--yellow)':'var(--green)';
    return `<svg width="68" height="68" viewBox="0 0 72 72"><circle cx="36" cy="36" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="5"/><circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" transform="rotate(-90 36 36)"/><text x="36" y="40" text-anchor="middle" fill="${color}" font-size="13" font-weight="600" font-family="-apple-system,sans-serif">${v}</text></svg>`;
  };

  const loader = (msg='Загружаю...') => `<div class="loader"><div class="loader-ring"></div><p>${msg}</p></div>`;

  /* ── Sparkline ───────────────────────────── */
  function sparklineSVG(prices, color, w=100, h=28) {
    if (!prices || prices.length < 2) return '';
    const mn = Math.min(...prices), mx = Math.max(...prices);
    const range = mx - mn || 1;
    const pts = prices.map((p,i) => {
      const x = (i/(prices.length-1))*w;
      const y = h - ((p-mn)/range)*(h-4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/></svg>`;
  }

  /* ══════════════════════════════════════════
     PAGE: MARKET
  ══════════════════════════════════════════ */
  function renderMarket(state) {
    if(state.loading) return loader('Загружаю рынок...');
    const {coins,fng} = state;
    if(!coins.length) return loader('Нет данных...');
    const fv=fng.value;
    const fc=fv<=25?'var(--red)':fv<=40?'#f97316':fv<=60?'var(--yellow)':'var(--green)';
    const oversold=coins.filter(c=>c.rsi<30).length;
    const overbought=coins.filter(c=>c.rsi>70).length;
    const negFund=coins.filter(c=>c.funding<-0.03).length;
    const longSig=coins.filter(c=>c.scores.bottom.total>=70).length;
    const topL=[...coins].sort((a,b)=>b.scores.bottom.total-a.scores.bottom.total).slice(0,3);
    const topS=[...coins].sort((a,b)=>b.scores.top.total-a.scores.top.total).filter(c=>c.scores.top.total>=50).slice(0,2);

    const coinRow = (c,mode) => {
      const s=mode==='long'?c.scores.bottom.total:c.scores.top.total;
      const col=scoreColor(s);
      const sig=sigLabel(c.scores.bottom.total,c.div.bull,c.scores.top.total,c.div.bear);
      const sym=c.symbol.replace('USDT','');
      const spark = c.closes ? sparklineSVG(c.closes.slice(-40), col) : '';
      return `<div class="coin-row card-strong" data-symbol="${c.symbol}" data-action="open-coin">
        ${avatar(c.symbol)}
        <div class="coin-info">
          <div class="coin-name">${sym} / USDT</div>
          <div class="coin-meta">RSI ${c.rsi} · ${c.funding>0?'+':''}${c.funding}% · Z ${c.zscore}</div>
          ${spark || scoreBar(s,col)}
        </div>
        <div class="coin-right"><div class="pill ${scoreClass(s)}">${s}/100</div><div class="sig-label ${sig.cls}">${sig.txt}</div></div>
      </div>`;
    };

    return `
      <div class="fng-card card" style="margin-bottom:11px;">
        <div><div class="fng-label">Fear & Greed Index</div><div class="fng-value" style="color:${fc};">${fv}</div><div class="fng-sub" style="color:${fc};">${fng.label}</div></div>
        ${fngRing(fv)}
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Перепроданных</div><div class="stat-value c-green">${oversold}</div><div class="stat-desc c-green">RSI &lt; 30</div></div>
        <div class="stat-card"><div class="stat-label">Перекупленных</div><div class="stat-value c-red">${overbought}</div><div class="stat-desc c-red">RSI &gt; 70</div></div>
        <div class="stat-card"><div class="stat-label">Фандинг (−)</div><div class="stat-value c-green">${negFund}</div><div class="stat-desc c-dim">монет</div></div>
        <div class="stat-card"><div class="stat-label">LONG сигналы</div><div class="stat-value c-purple">${longSig}</div><div class="stat-desc c-purple">скор ≥ 70</div></div>
      </div>
      <div class="section-label">Топ LONG</div>
      ${topL.map(c=>coinRow(c,'long')).join('')}
      ${topS.length?`<div class="section-label" style="margin-top:8px;">Топ SHORT</div>${topS.map(c=>coinRow(c,'short')).join('')}`:''}
    `;
  }

  /* ══════════════════════════════════════════
     PAGE: SCREENER (with heatmap)
  ══════════════════════════════════════════ */
  function renderScreener(state, filter='oversold') {
    if(state.loading) return loader('Загружаю...');
    const {coins} = state;
    const filters=[
      {key:'heatmap',   label:'🔥 Heatmap'},
      {key:'oversold',  label:'RSI < 30'},
      {key:'overbought',label:'RSI > 70'},
      {key:'fund_neg',  label:'Fund (−)'},
      {key:'fund_pos',  label:'Fund (+)'},
      {key:'volume',    label:'Объём'},
      {key:'score',     label:'Скор > 60'},
    ];
    const ftabs = filters.map(f=>`<button class="ftab${f.key===filter?' active':''}" data-filter="${f.key}">${f.label}</button>`).join('');

    if(filter==='heatmap') {
      const cells = [...coins].sort((a,b)=>b.scores.bottom.total-a.scores.bottom.total).map(c=>{
        const s=c.scores.bottom.total;
        const alpha=0.15+s/100*0.55;
        const col=s>=70?`rgba(62,207,142,${alpha})`:s>=50?`rgba(240,180,41,${alpha})`:s>=30?`rgba(249,115,22,${alpha})`:`rgba(255,107,107,${alpha})`;
        const sym=c.symbol.replace('USDT','');
        return `<div class="hm-cell" style="background:${col};" data-symbol="${c.symbol}" data-action="open-coin"><div class="hm-sym">${sym}</div><div class="hm-scr">${s}</div></div>`;
      }).join('');
      return `<div class="filter-tabs">${ftabs}</div><div class="section-label">LONG скор — все монеты</div><div class="heatmap">${cells}</div>`;
    }

    let list=[];
    switch(filter){
      case 'oversold':   list=[...coins].filter(c=>c.rsi<30).sort((a,b)=>a.rsi-b.rsi); break;
      case 'overbought': list=[...coins].filter(c=>c.rsi>70).sort((a,b)=>b.rsi-a.rsi); break;
      case 'fund_neg':   list=[...coins].filter(c=>c.funding<0).sort((a,b)=>a.funding-b.funding); break;
      case 'fund_pos':   list=[...coins].filter(c=>c.funding>0).sort((a,b)=>b.funding-a.funding); break;
      case 'volume':     list=[...coins].filter(c=>c.rvol>=2).sort((a,b)=>b.rvol-a.rvol); break;
      case 'score':      list=[...coins].filter(c=>Math.max(c.scores.bottom.total,c.scores.top.total)>=60).sort((a,b)=>Math.max(b.scores.bottom.total,b.scores.top.total)-Math.max(a.scores.bottom.total,a.scores.top.total)); break;
    }

    const rows = list.slice(0,20).map(c=>{
      const isL=filter==='oversold'||filter==='fund_neg';
      const s=isL?c.scores.bottom.total:c.scores.top.total;
      const col=scoreColor(s);
      const sig=sigLabel(c.scores.bottom.total,c.div.bull,c.scores.top.total,c.div.bear);
      const sym=c.symbol.replace('USDT','');
      let meta='';
      if(filter==='fund_neg'||filter==='fund_pos') meta=`${c.funding>0?'+':''}${c.funding}% · L/S ${c.longShort} · ${fmtOI(c.oi,c.close)}`;
      else if(filter==='volume') meta=`Vol ${c.rvol}x · RSI ${c.rsi} · LONG ${c.scores.bottom.total}`;
      else if(filter==='score') meta=`LONG ${c.scores.bottom.total} · SHORT ${c.scores.top.total}`;
      else meta=`RSI ${c.rsi} · ${c.funding>0?'+':''}${c.funding}% · Z ${c.zscore}`;
      const spark = c.closes ? sparklineSVG(c.closes.slice(-40), col) : scoreBar(s,col);
      return `<div class="coin-row card-strong" data-symbol="${c.symbol}" data-action="open-coin">
        ${avatar(c.symbol)}
        <div class="coin-info"><div class="coin-name">${sym} / USDT</div><div class="coin-meta">${meta}</div>${spark}</div>
        <div class="coin-right"><div class="pill ${scoreClass(s)}">${s}/100</div><div class="sig-label ${sig.cls}">${sig.txt}</div></div>
      </div>`;
    }).join('')||`<div class="empty"><p>Нет монет по этому фильтру</p></div>`;

    return `<div class="filter-tabs">${ftabs}</div>${rows}`;
  }

  /* ══════════════════════════════════════════
     PAGE: SIGNALS (sniper + watch + correlation)
  ══════════════════════════════════════════ */
  function renderSignals(state, tab='sniper') {
    if(state.loading) return loader('Анализирую...');
    const {coins} = state;
    const tabs=[{key:'sniper',label:'🎯 Снайпер'},{key:'active',label:'Активные'},{key:'corr',label:'Корреляция'}];
    const tabsHTML=tabs.map(t=>`<button class="ftab${t.key===tab?' active':''}" data-sigtab="${t.key}">${t.label}</button>`).join('');

    if(tab==='sniper') {
      const best = [...coins].sort((a,b)=>b.scores.bottom.total-a.scores.bottom.total)[0];
      if(!best) return `<div class="filter-tabs">${tabsHTML}</div><div class="empty"><p>Нет данных</p></div>`;
      const b=best.scores.bottom;
      const sym=best.symbol.replace('USDT','');
      const factors=[
        ['RSI',         b.rsi,     best.rsi<30?`RSI ${best.rsi} — перепродан`:'—'],
        ['Дивергенция', b.div,     b.div?'Бычья дивергенция найдена':'—'],
        ['EMA200',      b.ema,     b.ema?`Цена ниже EMA на ${best.emaDist.toFixed(1)}%`:'—'],
        ['BB Band',     b.bb,      b.bb?'Закрылся ниже нижней полосы':'—'],
        ['Z-Score',     b.zscore,  b.zscore?`Z = ${best.zscore} — экстремум`:'—'],
        ['ATR Spike',   b.atr,     b.atr?'Волатильность выше нормы на 50%+':'—'],
        ['Объём',       b.rvol,    b.rvol?`Объём ${best.rvol}x от среднего`:'—'],
        ['Паттерн',     b.candle,  b.candle?best.pattern.replace('_',' '):'—'],
        ['Фандинг',     b.funding, b.funding?`${best.funding}% — шорты платят`:'—'],
        ['L/S Ratio',   b.ls,      b.ls?`${best.longShort} — шортов больше`:'—'],
        ['Fear&Greed',  b.fng,     b.fng?`Индекс ${state.fng.value} — Extreme Fear`:'—'],
      ].filter(f=>f[1]>0);

      const factorRows=factors.map(([name,pts,desc])=>`
        <div class="factor-row">
          <div><div class="factor-name">${name}</div><div style="font-size:10px;color:var(--text-3);margin-top:1px;">${desc}</div></div>
          <div class="factor-pts c-green">+${pts}</div>
        </div>`).join('');

      return `
        <div class="filter-tabs">${tabsHTML}</div>
        <div class="sniper-card card">
          <div class="sniper-badge">🎯 Лучший сигнал прямо сейчас</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
              ${avatar(best.symbol,42)}
              <div><div style="font-size:17px;font-weight:600;">${sym}/USDT</div><div style="font-size:12px;color:var(--text-3);">${fmtPrice(best.close)}</div></div>
            </div>
            <div style="text-align:right;"><div class="pill pill-green" style="font-size:12px;padding:5px 12px;">${b.total}/100</div><div class="sig-label c-green">LONG</div></div>
          </div>
          ${best.closes?sparklineSVG(best.closes.slice(-60),'var(--green)',260,36):''}
          <div class="sniper-factors">${factorRows}</div>
        </div>`;
    }

    if(tab==='active') {
      const active=[...coins].filter(c=>Math.max(c.scores.bottom.total,c.scores.top.total)>=60)
        .sort((a,b)=>Math.max(b.scores.bottom.total,b.scores.top.total)-Math.max(a.scores.bottom.total,a.scores.top.total)).slice(0,8);
      const watching=[...coins].filter(c=>{const mx=Math.max(c.scores.bottom.total,c.scores.top.total);return mx>=42&&mx<60;})
        .sort((a,b)=>Math.max(b.scores.bottom.total,b.scores.top.total)-Math.max(a.scores.bottom.total,a.scores.top.total)).slice(0,5);

      const card=(c,mode)=>{
        const s=mode==='long'?c.scores.bottom.total:mode==='short'?c.scores.top.total:Math.max(c.scores.bottom.total,c.scores.top.total);
        const isL=c.scores.bottom.total>=c.scores.top.total;
        const col=mode==='long'?'var(--green)':mode==='short'?'var(--red)':'var(--yellow)';
        const cls=mode==='long'?'long':mode==='short'?'short':'watch';
        const lbl=mode==='long'?'LONG':mode==='short'?'SHORT':'WATCH';
        const sym=c.symbol.replace('USDT','');
        return `<div class="signal-card card ${cls}" data-symbol="${c.symbol}" data-action="open-coin">
          <div class="signal-top">
            <div style="display:flex;align-items:center;gap:9px;">${avatar(c.symbol,34)}<div><div class="signal-sym">${sym}/USDT</div><div class="c-dim" style="font-size:11px;">${fmtPrice(c.close)}</div></div></div>
            <div style="text-align:right;"><div class="pill ${scoreClass(s)}">${s}/100</div><div class="sig-label" style="color:${col};">${lbl}</div></div>
          </div>
          <div style="height:2px;background:rgba(255,255,255,0.05);border-radius:1px;overflow:hidden;margin-bottom:7px;"><div style="width:${s}%;height:100%;background:${col};border-radius:1px;"></div></div>
          <div class="signal-tags">${tags(c)}</div>
        </div>`;
      };

      const activeHTML=active.map(c=>{const isL=c.scores.bottom.total>=c.scores.top.total;return card(c,isL?'long':'short');}).join('')||`<div class="empty"><p>Активных сигналов нет</p></div>`;
      const watchHTML=watching.map(c=>card(c,'watch')).join('');

      return `<div class="filter-tabs">${tabsHTML}</div>
        <div class="section-label">Активные (${active.length})</div>${activeHTML}
        ${watching.length?`<div class="section-label" style="margin-top:6px;">На подходе (${watching.length})</div>${watchHTML}`:''}`;
    }

    if(tab==='corr') {
      const btc=coins.find(c=>c.symbol==='BTCUSDT');
      if(!btc||!btc.closes) return `<div class="filter-tabs">${tabsHTML}</div><div class="empty"><p>Нет данных для корреляции</p></div>`;

      const pearson=(a,b)=>{
        const n=Math.min(a.length,b.length);
        const ax=a.slice(-n),bx=b.slice(-n);
        const ma=ax.reduce((s,v)=>s+v,0)/n, mb=bx.reduce((s,v)=>s+v,0)/n;
        let num=0,da=0,db=0;
        for(let i=0;i<n;i++){const ad=ax[i]-ma,bd=bx[i]-mb;num+=ad*bd;da+=ad*ad;db+=bd*bd;}
        return da&&db?parseFloat((num/Math.sqrt(da*db)).toFixed(2)):0;
      };

      const rows=coins.filter(c=>c.symbol!=='BTCUSDT'&&c.closes&&c.closes.length>=30)
        .map(c=>({sym:c.symbol,corr:pearson(btc.closes,c.closes),close:c.close}))
        .sort((a,b)=>Math.abs(b.corr)-Math.abs(a.corr)).slice(0,15);

      const corrRows=rows.map(r=>{
        const sym=r.sym.replace('USDT','');
        const pct=Math.abs(r.corr)*100;
        const col=r.corr>=0.7?'var(--green)':r.corr>=0.4?'var(--yellow)':r.corr<0?'var(--red)':'var(--text-3)';
        const label=r.corr>=0.8?'Высокая':r.corr>=0.5?'Средняя':r.corr>=0?'Слабая':'Обратная';
        return `<div class="corr-row">
          ${avatar(r.sym,28)}
          <div style="width:44px;font-size:12px;font-weight:500;">${sym}</div>
          <div class="corr-bar-wrap"><div class="corr-bar" style="width:${pct}%;background:${col};"></div></div>
          <div style="width:36px;text-align:right;font-size:11px;font-weight:600;color:${col};">${r.corr}</div>
          <div style="width:52px;text-align:right;font-size:10px;color:var(--text-3);">${label}</div>
        </div>`;
      }).join('');

      return `<div class="filter-tabs">${tabsHTML}</div>
        <div class="card" style="margin-bottom:10px;"><div style="font-size:12px;color:var(--text-2);line-height:1.5;">Корреляция с BTC за последние 30 свечей.<br><span class="c-green">Зелёный</span> = двигаются вместе · <span class="c-red">Красный</span> = обратно</div></div>
        <div class="card-strong">${corrRows}</div>`;
    }
  }

  /* ══════════════════════════════════════════
     PAGE: SEARCH
  ══════════════════════════════════════════ */
  function renderSearch(state) {
    const top=[...state.coins].sort((a,b)=>b.scores.bottom.total-a.scores.bottom.total).slice(0,15).map(c=>{
      const sym=c.symbol.replace('USDT','');
      const sig=sigLabel(c.scores.bottom.total,c.div.bull,c.scores.top.total,c.div.bear);
      return `<div class="coin-row card-strong" data-symbol="${c.symbol}" data-action="open-coin" style="margin-bottom:5px;">
        ${avatar(c.symbol)}
        <div class="coin-info"><div class="coin-name">${sym} / USDT</div><div class="coin-meta">${fmtPrice(c.close)} · RSI ${c.rsi}</div></div>
        <div class="coin-right"><div class="sig-label ${sig.cls}">${sig.txt}</div></div>
      </div>`;
    }).join('');
    return `
      <div class="search-wrap">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input class="search-input" id="ticker-input" placeholder="BTC, SOL, PEPE..." autocomplete="off" autocapitalize="characters"/>
      </div>
      <div id="search-result"></div>
      <div class="section-label">Топ по скору</div>${top}`;
  }

  /* ══════════════════════════════════════════
     COIN DETAIL
  ══════════════════════════════════════════ */
  function renderCoinDetail(coin, fng) {
    const sym=coin.symbol.replace('USDT','');
    const b=coin.scores.bottom, t=coin.scores.top;
    const sig=sigLabel(b.total,coin.div.bull,t.total,coin.div.bear);
    const fv=fng?fng.value:50;
    const pats={hammer:'Hammer',bull_engulf:'Bull Engulfing',dragonfly:'Dragonfly Doji',shooting_star:'Shooting Star',bear_engulf:'Bear Engulfing',gravestone:'Gravestone Doji',none:'—'};
    const spark=coin.closes?sparklineSVG(coin.closes.slice(-60),b.total>=t.total?'var(--green)':'var(--red)',280,44):'';

    const rows=[
      ['RSI (14)',   `<span class="${coin.rsi<30?'c-green':coin.rsi>70?'c-red':'c-muted'}">${coin.rsi}</span>`],
      ['EMA200',     `<span class="${coin.emaDist>0?'c-green':coin.emaDist<-15?'c-red':'c-muted'}">${coin.emaDist>0?'+':''}${coin.emaDist}%</span>`],
      ['BB Band',    coin.close<coin.bbLower?'<span class="c-green">Ниже нижней</span>':coin.close>coin.bbUpper?'<span class="c-red">Выше верхней</span>':'<span class="c-muted">В канале</span>'],
      ['Z-Score',    `<span class="${coin.zscore<-2?'c-green':coin.zscore>2?'c-red':'c-muted'}">${coin.zscore}</span>`],
      ['Rel.Volume', `<span class="${coin.rvol>=2?'c-yellow':'c-muted'}">${coin.rvol}x</span>`],
      ['Bull Div',   coin.div.bull?'<span class="c-green">✓ Есть</span>':'<span class="c-dim">—</span>'],
      ['Bear Div',   coin.div.bear?'<span class="c-red">✓ Есть</span>':'<span class="c-dim">—</span>'],
      ['Паттерн',    `<span class="c-muted">${pats[coin.pattern]||'—'}</span>`],
      ['Funding',    `<span class="${coin.funding<-0.03?'c-green':coin.funding>0.03?'c-red':'c-muted'}">${coin.funding>0?'+':''}${coin.funding}%</span>`],
      ['OI',         `<span class="c-muted">${fmtOI(coin.oi,coin.close)}</span>`],
      ['Long/Short', `<span class="${coin.longShort<0.9?'c-green':coin.longShort>1.1?'c-red':'c-muted'}">${coin.longShort}</span>`],
      ['Fear&Greed', `<span class="${fv<=25?'c-red':fv<=40?'c-yellow':'c-green'}">${fv}</span>`],
    ].map(([k,v])=>`<div class="detail-row"><span class="key">${k}</span><span class="val">${v}</span></div>`).join('');

    return `
      <button class="back-btn" data-action="back">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>Назад
      </button>
      <div class="card-strong" style="margin-bottom:9px;">
        <div class="detail-header">
          ${avatar(coin.symbol,44)}
          <div><div class="detail-name">${sym}/USDT</div><div class="detail-price">${fmtPrice(coin.close)} · ${coin.updatedAt}</div></div>
          <div style="margin-left:auto;"><div class="pill ${sig.pill||scoreClass(b.total)}" style="font-size:12px;padding:5px 12px;">${sig.txt}</div></div>
        </div>
        ${spark}
        ${rows}
        <div class="score-block">
          <div class="score-line"><div class="score-line-label c-green">LONG</div><div class="score-line-bar"><div class="score-line-fill" style="width:${b.total}%;background:var(--green);"></div></div><div class="score-line-num c-green">${b.total}/100</div></div>
          <div class="score-line"><div class="score-line-label c-red">SHORT</div><div class="score-line-bar"><div class="score-line-fill" style="width:${t.total}%;background:var(--red);"></div></div><div class="score-line-num c-red">${t.total}/100</div></div>
        </div>
      </div>`;
  }

  function renderCoinLoading(sym) { return `<div class="loader"><div class="loader-ring"></div><p>Загружаю ${sym}...</p></div>`; }

  return { renderMarket, renderScreener, renderSignals, renderSearch, renderCoinDetail, renderCoinLoading, loader };
})();
