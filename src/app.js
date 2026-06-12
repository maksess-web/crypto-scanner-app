/* app.js — главный контроллер */

const App = (() => {

  /* ── State ───────────────────────────────── */
  const state = {
    page:        'market',
    loading:     true,
    coins:       [],
    fng:         { value: 50, label: 'Neutral' },
    tf:          '4h',
    screenerFilter: 'oversold',
    detailCoin:  null,
    prevPage:    null,
    lastUpdate:  null,
  };

  /* ── Telegram WebApp ─────────────────────── */
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setBackgroundColor('#090912');
    tg.setHeaderColor('#090912');
  }

  /* ── DOM refs ────────────────────────────── */
  const $main    = document.getElementById('main-content');
  const $title   = document.getElementById('page-title');
  const $sub     = document.getElementById('page-sub');
  const $refresh = document.getElementById('btn-refresh');
  const $tabs    = document.querySelectorAll('.tab');

  /* ── Render ──────────────────────────────── */
  function render() {
    const { page, screenerFilter } = state;

    // Обновить заголовок
    const titles = { market:'Сканер', screener:'Скринер', signals:'Сигналы', search:'Монета' };
    $title.textContent = titles[page] || 'Сканер';

    const count = state.coins.length;
    const upd   = state.lastUpdate ? `обновлено ${state.lastUpdate}` : 'загрузка...';
    $sub.textContent = state.loading ? 'Загружаю...' : `${count} монет · ${state.tf.toUpperCase()} · ${upd}`;

    // Обновить табы
    $tabs.forEach(t => t.classList.toggle('active', t.dataset.page === page));

    // Рендер страницы
    let html = '';
    if (state.detailCoin) {
      html = Pages.renderCoinDetail(state.detailCoin, state.fng);
    } else {
      switch (page) {
        case 'market':   html = Pages.renderMarket(state);   break;
        case 'screener': html = Pages.renderScreener(state, screenerFilter); break;
        case 'signals':  html = Pages.renderSignals(state);  break;
        case 'search':   html = Pages.renderSearch(state);   break;
      }
    }

    $main.innerHTML = html;
    $main.scrollTop = 0;

    // Навесить события после рендера
    bindPageEvents();
  }

  /* ── Bind events ─────────────────────────── */
  function bindPageEvents() {
    // Клик по монете
    $main.querySelectorAll('[data-action="open-coin"]').forEach(el => {
      el.addEventListener('click', () => {
        const sym = el.dataset.symbol;
        openCoinDetail(sym);
      });
    });

    // Кнопка назад в детальной карточке
    const backBtn = $main.querySelector('[data-action="back"]');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        state.detailCoin = null;
        render();
      });
    }

    // Фильтры скринера
    $main.querySelectorAll('.ftab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.screenerFilter = btn.dataset.filter;
        render();
      });
    });

    // Поиск по тикеру
    const input = document.getElementById('ticker-input');
    if (input) {
      input.addEventListener('keydown', async e => {
        if (e.key === 'Enter') {
          const sym = input.value.trim().toUpperCase();
          if (!sym) return;
          await searchCoin(sym);
        }
      });
      input.addEventListener('input', e => {
        if (!e.target.value) {
          document.getElementById('search-result').innerHTML = '';
        }
      });
      // Фокус сразу
      setTimeout(() => input.focus(), 100);
    }
  }

  /* ── Open coin detail ────────────────────── */
  async function openCoinDetail(symbol) {
    // Сначала ищем в кэше
    const cached = state.coins.find(c => c.symbol === symbol);
    if (cached) {
      state.detailCoin = cached;
      state.prevPage   = state.page;
      render();
      return;
    }

    // Иначе — грузим
    state.detailCoin = null;
    $main.innerHTML  = Pages.renderCoinLoading(symbol);

    const coin = await API.fetchOne(symbol, state.tf, state.fng.value);
    if (coin) {
      state.detailCoin = coin;
    } else {
      $main.innerHTML = `<div class="empty"><p>Монета <b>${symbol}</b> не найдена.<br>Проверь тикер.</p></div>`;
      return;
    }
    render();
  }

  /* ── Search coin ─────────────────────────── */
  async function searchCoin(input) {
    const symbol = input.endsWith('USDT') ? input : input + 'USDT';
    const result = document.getElementById('search-result');
    if (!result) return;

    result.innerHTML = Pages.loader(`Ищу ${symbol}...`);

    const coin = await API.fetchOne(symbol, state.tf, state.fng.value);
    if (!coin) {
      result.innerHTML = `<div class="empty"><p>Монета <b>${symbol}</b> не найдена</p></div>`;
      return;
    }

    state.detailCoin = coin;
    render();
  }

  /* ── Load data ───────────────────────────── */
  async function loadData(showLoader = true) {
    if (showLoader) {
      state.loading = true;
      render();
    }

    $refresh.classList.add('spinning');

    try {
      const { coins, fng } = await API.fetchAll(state.tf, (done, total) => {
        $sub.textContent = `Загружаю ${done}/${total}...`;
      });

      state.coins    = coins;
      state.fng      = fng;
      state.loading  = false;
      state.lastUpdate = new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });

      render();
    } catch (e) {
      console.error('Load error:', e);
      state.loading = false;
      $main.innerHTML = `<div class="empty"><p>Ошибка загрузки.<br>Проверь соединение.</p></div>`;
    }

    $refresh.classList.remove('spinning');
  }

  /* ── Navigate ────────────────────────────── */
  function navigate(page) {
    if (state.detailCoin) state.detailCoin = null;
    state.page = page;
    render();
  }

  /* ── Events ──────────────────────────────── */

  // Таб-бар
  $tabs.forEach(tab => {
    tab.addEventListener('click', () => navigate(tab.dataset.page));
  });

  // Кнопка обновить
  $refresh.addEventListener('click', () => loadData(false));

  // Кнопка назад в Telegram
  if (tg) {
    tg.BackButton.onClick(() => {
      if (state.detailCoin) {
        state.detailCoin = null;
        render();
        tg.BackButton.hide();
      }
    });
  }

  // Авто-скрывать/показывать BackButton
  const origRender = render;
  function renderWithBack() {
    origRender();
    if (tg) {
      if (state.detailCoin) tg.BackButton.show();
      else tg.BackButton.hide();
    }
  }

  /* ── Init ────────────────────────────────── */
  function init() {
    render();
    loadData();

    // Авто-обновление каждые 15 мин
    setInterval(() => loadData(false), 15 * 60 * 1000);
  }

  // Переопределяем render на версию с BackButton
  window.renderWithBack = renderWithBack;

  init();

})();
