/* app.js */
const App = (() => {
  const state = {
    page: 'market', loading: true, coins: [], fng: {value:50,label:'Neutral'},
    tf: '4h', screenerFilter: 'oversold', signalsTab: 'sniper',
    detailCoin: null, lastUpdate: null,
  };

  const tg = window.Telegram?.WebApp;
  if(tg){ tg.ready(); tg.expand(); tg.setBackgroundColor('#090912'); tg.setHeaderColor('#090912'); }

  const $main    = document.getElementById('main-content');
  const $title   = document.getElementById('page-title');
  const $sub     = document.getElementById('page-sub');
  const $refresh = document.getElementById('btn-refresh');
  const $tabs    = document.querySelectorAll('.tab');

  function render(){
    const titles={market:'Сканер',screener:'Скринер',signals:'Сигналы',search:'Монета'};
    $title.textContent = state.detailCoin ? state.detailCoin.symbol.replace('USDT','')+'/USDT' : (titles[state.page]||'Сканер');
    $sub.textContent   = state.loading ? 'Загружаю...' : `${state.coins.length} монет · ${state.tf.toUpperCase()} · ${state.lastUpdate||''}`;
    $tabs.forEach(t=>t.classList.toggle('active', !state.detailCoin && t.dataset.page===state.page));

    let html='';
    if(state.detailCoin) html=Pages.renderCoinDetail(state.detailCoin,state.fng);
    else switch(state.page){
      case 'market':   html=Pages.renderMarket(state); break;
      case 'screener': html=Pages.renderScreener(state,state.screenerFilter); break;
      case 'signals':  html=Pages.renderSignals(state,state.signalsTab); break;
      case 'search':   html=Pages.renderSearch(state); break;
    }
    $main.innerHTML=html;
    $main.scrollTop=0;
    bindEvents();
    if(tg) state.detailCoin?tg.BackButton.show():tg.BackButton.hide();
  }

  function bindEvents(){
    // Монета
    $main.querySelectorAll('[data-action="open-coin"]').forEach(el=>{
      el.addEventListener('click',()=>openCoin(el.dataset.symbol));
    });
    // Назад
    const back=$main.querySelector('[data-action="back"]');
    if(back) back.addEventListener('click',()=>{state.detailCoin=null;render();});
    // Фильтры скринера
    $main.querySelectorAll('.ftab[data-filter]').forEach(b=>{
      b.addEventListener('click',()=>{state.screenerFilter=b.dataset.filter;render();});
    });
    // Сигналы табы
    $main.querySelectorAll('.ftab[data-sigtab]').forEach(b=>{
      b.addEventListener('click',()=>{state.signalsTab=b.dataset.sigtab;render();});
    });
    // Поиск
    const inp=document.getElementById('ticker-input');
    if(inp){
      inp.addEventListener('keydown',async e=>{if(e.key==='Enter'){const s=inp.value.trim().toUpperCase();if(s)await searchCoin(s);}});
      inp.addEventListener('input',e=>{if(!e.target.value){const r=document.getElementById('search-result');if(r)r.innerHTML='';}});
      setTimeout(()=>inp.focus(),120);
    }
  }

  async function openCoin(symbol){
    const cached=state.coins.find(c=>c.symbol===symbol);
    if(cached){state.detailCoin=cached;render();return;}
    $main.innerHTML=Pages.renderCoinLoading(symbol);
    const coin=await API.fetchOne(symbol,state.tf,state.fng.value);
    if(coin){state.detailCoin=coin;render();}
    else $main.innerHTML=`<div class="empty"><p>Монета <b>${symbol}</b> не найдена</p></div>`;
  }

  async function searchCoin(input){
    const symbol=input.endsWith('USDT')?input:input+'USDT';
    const res=document.getElementById('search-result');
    if(res) res.innerHTML=Pages.loader(`Ищу ${symbol}...`);
    const coin=await API.fetchOne(symbol,state.tf,state.fng.value);
    if(!coin){if(res)res.innerHTML=`<div class="empty"><p>${symbol} не найдена</p></div>`;return;}
    state.detailCoin=coin;render();
  }

  async function loadData(showLoader=true){
    if(showLoader){state.loading=true;render();}
    $refresh.classList.add('spinning');
    try{
      const{coins,fng}=await API.fetchAll(state.tf,(done,total)=>{$sub.textContent=`Загружаю ${done}/${total}...`;});
      state.coins=coins; state.fng=fng; state.loading=false;
      state.lastUpdate=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
      render();
    }catch(e){
      console.error(e); state.loading=false;
      $main.innerHTML=`<div class="empty"><p>Ошибка загрузки. Проверь соединение.</p></div>`;
    }
    $refresh.classList.remove('spinning');
  }

  // Таббар
  $tabs.forEach(tab=>tab.addEventListener('click',()=>{
    if(state.detailCoin)state.detailCoin=null;
    state.page=tab.dataset.page; render();
  }));

  // Обновить
  $refresh.addEventListener('click',()=>loadData(false));

  // TF switcher (delegated)
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.tf-btn');
    if(btn&&btn.dataset.tf){
      state.tf=btn.dataset.tf;
      document.querySelectorAll('.tf-btn').forEach(b=>b.classList.toggle('active',b.dataset.tf===state.tf));
      loadData(false);
    }
  });

  // Telegram back button
  if(tg) tg.BackButton.onClick(()=>{if(state.detailCoin){state.detailCoin=null;render();}});

  // Init
  render();
  loadData();
  setInterval(()=>loadData(false), 15*60*1000);
})();
