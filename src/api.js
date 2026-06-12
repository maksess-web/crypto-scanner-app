/* api.js — загрузка данных с Binance + Fear&Greed */

const API = (() => {

  const BINANCE  = 'https://fapi.binance.com';
  const FNG_URL  = 'https://api.alternative.me/fng/?limit=1';

  const SYMBOLS = [
    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT',
    'DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','DOTUSDT',
    'MATICUSDT','UNIUSDT','LTCUSDT','ATOMUSDT','NEARUSDT',
    'ARBUSDT','OPUSDT','APTUSDT','SUIUSDT','INJUSDT',
    'TIAUSDT','STXUSDT','RUNEUSDT','FTMUSDT','SEIUSDT',
    'XLMUSDT','ETCUSDT','FILUSDT','AAVEUSDT','LDOUSDT',
    'CRVUSDT','MKRUSDT','SNXUSDT','COMPUSDT','KSMUSDT',
    'ALGOUSDT','VETUSDT','ICPUSDT','SANDUSDT','MANAUSDT',
    'AXSUSDT','THETAUSDT','EGLDUSDT','XTZUSDT','EOSUSDT',
    'DASHUSDT','ZECUSDT','HBARUSDT','FLOWUSDT','BCHUSDT',
  ];

  /* ── RSI ────────────────────────────────── */
  function calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const avgG = gains / period;
    const avgL = losses / period;
    if (avgL === 0) return 100;
    return parseFloat((100 - 100 / (1 + avgG / avgL)).toFixed(2));
  }

  /* ── EMA ────────────────────────────────── */
  function calcEMA(closes, period = 200) {
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
    return ema;
  }

  /* ── BB ─────────────────────────────────── */
  function calcBB(closes, period = 20, std = 2) {
    const slice = closes.slice(-period);
    const mid = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
    const sigma = Math.sqrt(variance);
    return { upper: mid + std * sigma, mid, lower: mid - std * sigma };
  }

  /* ── Z-Score ────────────────────────────── */
  function calcZScore(closes, period = 100) {
    const slice = closes.slice(-period);
    const mean  = slice.reduce((a, b) => a + b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    if (std === 0) return 0;
    return parseFloat(((closes[closes.length - 1] - mean) / std).toFixed(2));
  }

  /* ── RelVol ─────────────────────────────── */
  function calcRelVol(volumes, period = 20) {
    const sma = volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
    return sma > 0 ? parseFloat((volumes[volumes.length - 1] / sma).toFixed(2)) : 0;
  }

  /* ── Divergence ─────────────────────────── */
  function calcDivergence(lows, highs, rsiValues, lookback = 5) {
    const n = lows.length - 1;
    const priceLowCurr  = lows[n];
    const priceLowPrev  = Math.min(...lows.slice(n - lookback, n));
    const rsiLowCurr    = rsiValues[n];
    const rsiLowPrev    = Math.min(...rsiValues.slice(n - lookback, n));
    const priceHighCurr = highs[n];
    const priceHighPrev = Math.max(...highs.slice(n - lookback, n));
    const rsiHighCurr   = rsiValues[n];
    const rsiHighPrev   = Math.max(...rsiValues.slice(n - lookback, n));
    return {
      bull: priceLowCurr < priceLowPrev && rsiLowCurr > rsiLowPrev,
      bear: priceHighCurr > priceHighPrev && rsiHighCurr < rsiHighPrev,
    };
  }

  /* ── Pattern ─────────────────────────────── */
  function detectPattern(candles) {
    const { o, h, l, c } = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const body = Math.abs(c - o), range = h - l;
    const lower = Math.min(c, o) - l, upper = h - Math.max(c, o);
    if (range === 0) return 'none';
    if (lower >= body * 2 && upper <= body * 0.5 && body <= range * 0.4) return 'hammer';
    if (c > o && prev.c < prev.o && c > prev.o && o < prev.c) return 'bull_engulf';
    if (body <= range * 0.1 && lower >= range * 0.65) return 'dragonfly';
    if (upper >= body * 2 && lower <= body * 0.5 && body <= range * 0.4) return 'shooting_star';
    if (c < o && prev.c > prev.o && c < prev.o && o > prev.c) return 'bear_engulf';
    if (body <= range * 0.1 && upper >= range * 0.65) return 'gravestone';
    return 'none';
  }

  /* ── Score ───────────────────────────────── */
  function calcScores(ind) {
    const { rsi, ema200, close, bbUpper, bbLower, zscore, rvol, atr, atrSma, div, pattern, funding, longShort, fng } = ind;
    const emaDist = ema200 > 0 ? (ema200 - close) / ema200 * 100 : 0;

    const b = {};
    b.rsi      = rsi < 20 ? 20 : rsi < 25 ? 15 : rsi < 30 ? 10 : 0;
    b.div      = div.bull ? 20 : 0;
    b.ema      = emaDist >= 35 ? 15 : emaDist >= 25 ? 10 : emaDist >= 15 ? 5 : 0;
    b.bb       = close < bbLower ? 10 : 0;
    b.zscore   = zscore < -3 ? 15 : zscore < -2 ? 10 : 0;
    b.atr      = atrSma > 0 && atr > atrSma * 1.5 ? 10 : 0;
    b.rvol     = rvol >= 3 ? 15 : rvol >= 2 ? 10 : 0;
    b.candle   = ['hammer','bull_engulf','dragonfly'].includes(pattern) ? 10 : 0;
    b.funding  = funding <= -0.07 ? 15 : funding <= -0.03 ? 10 : 0;
    b.ls       = longShort < 0.8 ? 10 : 0;
    b.fng      = fng <= 25 ? 10 : 0;
    b.total    = Math.min(Object.values(b).reduce((a, v) => a + v, 0), 100);

    const t = {};
    t.rsi      = rsi > 80 ? 20 : rsi > 75 ? 15 : rsi > 70 ? 10 : 0;
    t.div      = div.bear ? 20 : 0;
    t.ema      = -emaDist >= 35 ? 15 : -emaDist >= 25 ? 10 : -emaDist >= 15 ? 5 : 0;
    t.bb       = close > bbUpper ? 10 : 0;
    t.zscore   = zscore > 3 ? 15 : zscore > 2 ? 10 : 0;
    t.atr      = atrSma > 0 && atr > atrSma * 1.5 ? 10 : 0;
    t.rvol     = rvol >= 3 ? 15 : rvol >= 2 ? 10 : 0;
    t.candle   = ['shooting_star','bear_engulf','gravestone'].includes(pattern) ? 10 : 0;
    t.funding  = funding >= 0.07 ? 15 : funding >= 0.03 ? 10 : 0;
    t.ls       = longShort > 1.2 ? 10 : 0;
    t.fng      = fng >= 75 ? 10 : 0;
    t.total    = Math.min(Object.values(t).reduce((a, v) => a + v, 0), 100);

    return { bottom: b, top: t, emaDist: parseFloat(emaDist.toFixed(2)) };
  }

  /* ── Fetch klines ────────────────────────── */
  async function fetchKlines(symbol, interval = '4h', limit = 220) {
    const url = `${BINANCE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const r   = await fetch(url);
    if (!r.ok) return null;
    return r.json();
  }

  /* ── Fetch funding ───────────────────────── */
  async function fetchFunding(symbol) {
    try {
      const r = await fetch(`${BINANCE}/fapi/v1/premiumIndex?symbol=${symbol}`);
      if (!r.ok) return 0;
      const d = await r.json();
      return parseFloat((parseFloat(d.lastFundingRate || 0) * 100).toFixed(4));
    } catch { return 0; }
  }

  /* ── Fetch L/S ratio ─────────────────────── */
  async function fetchLS(symbol) {
    try {
      const r = await fetch(`${BINANCE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=4h&limit=1`);
      if (!r.ok) return 1;
      const d = await r.json();
      return d.length ? parseFloat(parseFloat(d[0].longShortRatio).toFixed(3)) : 1;
    } catch { return 1; }
  }

  /* ── Fetch OI ────────────────────────────── */
  async function fetchOI(symbol) {
    try {
      const r = await fetch(`${BINANCE}/fapi/v1/openInterest?symbol=${symbol}`);
      if (!r.ok) return 0;
      const d = await r.json();
      return parseFloat(d.openInterest || 0);
    } catch { return 0; }
  }

  /* ── Fetch Fear & Greed ──────────────────── */
  async function fetchFNG() {
    try {
      const r = await fetch(FNG_URL);
      if (!r.ok) return { value: 50, label: 'Neutral' };
      const d = await r.json();
      return { value: parseInt(d.data[0].value), label: d.data[0].value_classification };
    } catch { return { value: 50, label: 'Neutral' }; }
  }

  /* ── Build single coin ───────────────────── */
  async function buildCoin(symbol, interval, fngValue) {
    const raw = await fetchKlines(symbol, interval, 220);
    if (!raw || raw.length < 50) return null;

    const closes  = raw.map(k => parseFloat(k[4]));
    const highs   = raw.map(k => parseFloat(k[2]));
    const lows    = raw.map(k => parseFloat(k[3]));
    const volumes = raw.map(k => parseFloat(k[5]));
    const opens   = raw.map(k => parseFloat(k[1]));

    const close   = closes[closes.length - 1];
    const rsi     = calcRSI(closes);
    const ema200  = calcEMA(closes, 200);
    const bb      = calcBB(closes);
    const zscore  = calcZScore(closes);
    const rvol    = calcRelVol(volumes);

    // ATR
    const trs = raw.slice(1).map((k, i) => {
      const h = parseFloat(k[2]), l = parseFloat(k[3]), pc = closes[i];
      return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    });
    const atr    = trs.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const atrSma = trs.slice(-50).reduce((a, b) => a + b, 0) / 50;

    // RSI series for divergence
    const rsiSeries = closes.map((_, i) => i < 15 ? 50 : calcRSI(closes.slice(0, i + 1)));
    const div = calcDivergence(lows, highs, rsiSeries);

    const candles = raw.map(k => ({
      o: parseFloat(k[1]), h: parseFloat(k[2]),
      l: parseFloat(k[3]), c: parseFloat(k[4]),
    }));
    const pattern = detectPattern(candles);

    // Fetch derivatives in parallel
    const [funding, longShort, oi] = await Promise.all([
      fetchFunding(symbol), fetchLS(symbol), fetchOI(symbol)
    ]);

    const scores = calcScores({
      rsi, ema200, close, bbUpper: bb.upper, bbLower: bb.lower,
      zscore, rvol, atr, atrSma, div, pattern, funding, longShort, fng: fngValue,
    });

    return {
      symbol, interval, close, rsi,
      ema200, emaDist: scores.emaDist,
      bbUpper: bb.upper, bbLower: bb.lower,
      zscore, rvol, atr, pattern, div,
      funding, longShort, oi, scores,
      updatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  /* ── Fetch all coins ─────────────────────── */
  async function fetchAll(interval = '4h', onProgress) {
    const fng   = await fetchFNG();
    const coins = [];
    const batch = 5;

    for (let i = 0; i < SYMBOLS.length; i += batch) {
      const chunk = SYMBOLS.slice(i, i + batch);
      const results = await Promise.allSettled(
        chunk.map(sym => buildCoin(sym, interval, fng.value))
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) coins.push(r.value);
      }
      if (onProgress) onProgress(Math.min(i + batch, SYMBOLS.length), SYMBOLS.length);
    }

    return { coins, fng };
  }

  /* ── Fetch single coin ───────────────────── */
  async function fetchOne(symbol, interval = '4h', fngValue = 50) {
    return buildCoin(symbol.toUpperCase(), interval, fngValue);
  }

  return { fetchAll, fetchOne, fetchFNG, SYMBOLS };
})();
