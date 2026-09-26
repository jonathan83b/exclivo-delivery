/* ==========================================================================
   1. INITIAL STATE & CONFIGURAÇÃO DA NUVEM (GOOGLE SHEETS)
   ========================================================================== */

// ⚠️ COLE AQUI A SUA URL DA APLICAÇÃO WEB DO GOOGLE SHEETS
const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbwRXuS52NHt-pdTNYzjBH9nCBbAoMrr_7SnBaqQJz6imznMSCUxscYy1Bj-5pChfh7gtg/exec";
const INITIAL_MENU = [
  { id: 1, name: "Hambúrguer Artesanal Gourmet", category: "Pratos Principais", price: 38.90, desc: "Pão brioche, 180g de blend bovino, queijo cheddar, bacon crocante e maionese da casa.", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60" },
  { id: 2, name: "Pizza Margherita Especial", category: "Pratos Principais", price: 54.00, desc: "Molho de tomate italiano, muçarela de búfala, manjericão fresco e azeite trufado.", image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&auto=format&fit=crop&q=60" },
  { id: 3, name: "Batata Frita Suprema", category: "Entradas", price: 26.50, desc: "Batatas rústicas com cheddar cremoso e bacon em cubos.", image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&auto=format&fit=crop&q=60" },
  { id: 4, name: "Iscas de Peixe Empanadas", category: "Entradas", price: 34.00, desc: "Acompanha molho tártaro artesanal e limão siciliano.", image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=60" },
  { id: 5, name: "Sucos Naturais 500ml", category: "Bebidas", price: 12.00, desc: "Laranja, Abacaxi com Hortelã, ou Frutas Vermelhas.", image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=60" },
  { id: 6, name: "Refrigerante Lata 350ml", category: "Bebidas", price: 7.50, desc: "Coca-Cola, Guaraná Antarctica ou Fanta.", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=60" },
  { id: 7, name: "Petit Gâteau com Sorvete", category: "Sobremesas", price: 24.90, desc: "Bolo quente de chocolate com recheio cremoso e sorvete de baunilha.", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&auto=format&fit=crop&q=60" }
];

const TOTAL_TABLES = 12;

let appState = {
  currentTable: 1,
  customerName: '',
  customerPhone: '',
  activeCategory: 'todos',
  searchQuery: '',
  cart: [],
  selectedDetailItem: null,
  detailQty: 1,
  menu: [],
  orders: [],
  tables: {}
};

const syncChannel = new BroadcastChannel('Restaurante_realtime_channel');

/* ==========================================================================
   2. APP INITIALIZATION & GLOBAL CONFIGS
   ========================================================================== */

window.onload = function() {
  detectTableFromURL();
  initDataStore();
  checkCustomerSession();
  aplicarConfiguracoesVisuaisDEV();
  renderCustomerUI();

  syncChannel.onmessage = (e) => {
    if (e.data && e.data.type === 'STATE_UPDATE') {
      loadFromLocalStorage();
      aplicarConfiguracoesVisuaisDEV();
      renderCustomerUI();
      if (e.data.toast && e.data.toast.tableNum === appState.currentTable) {
        showToast(e.data.toast.message, e.data.toast.type);
      }
    }
  };

  window.addEventListener('storage', (e) => {
    if (['gs_orders', 'gs_menu', 'gs_tables', 'gs_config_dev', 'gs_config_loja'].includes(e.key)) {
      loadFromLocalStorage();
      aplicarConfiguracoesVisuaisDEV();
      renderCustomerUI();
    }
  });
};

function detectTableFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const mesaParam = urlParams.get('mesa');
  if (mesaParam && !isNaN(mesaParam) && parseInt(mesaParam) > 0) {
    appState.currentTable = parseInt(mesaParam);
  } else {
    appState.currentTable = 1;
  }
}

function initDataStore() {
  const savedMenu = localStorage.getItem('gs_menu');
  const savedOrders = localStorage.getItem('gs_orders');
  const savedTables = localStorage.getItem('gs_tables');

  appState.menu = savedMenu ? JSON.parse(savedMenu) : INITIAL_MENU;
  appState.orders = savedOrders ? JSON.parse(savedOrders) : [];

  if (savedTables) {
    appState.tables = JSON.parse(savedTables);
  } else {
    for(let i = 1; i <= TOTAL_TABLES; i++) {
      appState.tables[i] = { customerName: '', customerPhone: '', callWaiter: false, requestBill: false, paymentMethod: '' };
    }
  }
}

function saveToLocalStorage(notify = true, toastInfo = null) {
  localStorage.setItem('gs_menu', JSON.stringify(appState.menu));
  localStorage.setItem('gs_orders', JSON.stringify(appState.orders));
  localStorage.setItem('gs_tables', JSON.stringify(appState.tables));

  if (notify) {
    syncChannel.postMessage({ type: 'STATE_UPDATE', toast: toastInfo });
  }
}

function loadFromLocalStorage() {
  const savedMenu = localStorage.getItem('gs_menu');
  const savedOrders = localStorage.getItem('gs_orders');
  const savedTables = localStorage.getItem('gs_tables');

  if (savedMenu) appState.menu = JSON.parse(savedMenu);
  if (savedOrders) appState.orders = JSON.parse(savedOrders);
  if (savedTables) appState.tables = JSON.parse(savedTables);

  const tableData = appState.tables[appState.currentTable];
  if (tableData && tableData.customerName && tableData.customerPhone) {
    appState.customerName = tableData.customerName;
    appState.customerPhone = tableData.customerPhone;
  }
}

function checkCustomerSession() {
  const tableData = appState.tables[appState.currentTable];
  if (tableData && tableData.customerName && tableData.customerPhone) {
    appState.customerName = tableData.customerName;
    appState.customerPhone = tableData.customerPhone;
  }
}

function aplicarConfiguracoesVisuaisDEV() {
  const savedDev = localStorage.getItem('gs_config_dev') || localStorage.getItem('gs_config_loja');
  if (savedDev) {
    try {
      const cfg = JSON.parse(savedDev);
      const elLoja = document.getElementById('header-nome-loja');
      const elLateralLoja = document.getElementById('lateral-nome-loja');
      
      if (elLoja && cfg.nomeLoja) elLoja.textContent = cfg.nomeLoja;
      if (elLateralLoja && cfg.nomeLoja) elLateralLoja.textContent = cfg.nomeLoja;
    } catch (e) {
      console.error("Erro ao aplicar configs visuais do DEV:", e);
    }
  }
}

/* ==========================================================================
   3. AUTHENTICATION & TABLE SELECTION
   ========================================================================== */

function openAuthModal() {
  const modal = document.getElementById('modal-customer-auth');
  if (!modal) return;
  document.getElementById('auth-modal-table-display').value = `Mesa ${appState.currentTable < 10 ? '0' + appState.currentTable : appState.currentTable}`;
  document.getElementById('auth-customer-name').value = appState.customerName || '';
  document.getElementById('auth-customer-phone').value = appState.customerPhone || '';
  modal.classList.remove('hidden');
}

function saveCustomerCheckIn(e) {
  e.preventDefault();
  const name = document.getElementById('auth-customer-name').value.trim();
  const phone = document.getElementById('auth-customer-phone').value.trim();

  if (!name || !phone) return;

  appState.customerName = name;
  appState.customerPhone = phone;

  appState.tables[appState.currentTable] = {
    ...appState.tables[appState.currentTable],
    customerName: name,
    customerPhone: phone
  };

  saveToLocalStorage(true);
  document.getElementById('modal-customer-auth').classList.add('hidden');
  renderCustomerUI();
  showToast(`Identificação salva, ${name}! Enviando pedido...`, 'success');

  enviarPedidoAposCheckIn();
}

function maskPhone(input) {
  let v = input.value.replace(/\D/g, '');
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
  v = v.replace(/(\d)(\d{4})$/, '$1-$2');
  input.value = v;
}

/* ==========================================================================
   4. MENU RENDERING & INTERACTIONS
   ========================================================================== */

function renderCustomerUI() {
  const headerTable = document.getElementById('header-table-number');
  const custName = document.getElementById('customer-name-display');
  const custPhone = document.getElementById('customer-phone-display');
  const custAvatar = document.getElementById('customer-avatar');

  if (headerTable) headerTable.textContent = `Mesa ${appState.currentTable < 10 ? '0' + appState.currentTable : appState.currentTable}`;
  if (custName) custName.textContent = appState.customerName || 'Cliente da Mesa';
  if (custPhone) custPhone.innerHTML = `<i class="fa-brands fa-whatsapp text-emerald-400"></i> <span>${appState.customerPhone || '(00) 00000-0000'}</span>`;
  if (custAvatar) custAvatar.textContent = appState.customerName ? appState.customerName.charAt(0).toUpperCase() : 'C';

  const tableData = appState.tables[appState.currentTable] || {};
  const waiterBtn = document.getElementById('btn-call-waiter');
  const billBtn = document.getElementById('btn-request-bill');

  if (waiterBtn) {
    if (tableData.callWaiter) {
      waiterBtn.className = "w-full bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center space-x-2 animate-pulse";
      document.getElementById('text-call-waiter').textContent = "Garçom Chamado!";
    } else {
      waiterBtn.className = "w-full bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center space-x-2";
      document.getElementById('text-call-waiter').textContent = "Chamar Garçom";
    }
  }

  if (billBtn) {
    if (tableData.requestBill) {
      billBtn.className = "w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center space-x-2 animate-pulse";
      document.getElementById('text-request-bill').textContent = "Conta Solicitada!";
    } else {
      billBtn.className = "w-full bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center space-x-2";
      document.getElementById('text-request-bill').textContent = "Pedir a Conta";
    }
  }

  renderMenuList();
  renderActiveOrders();
  updateCartUI();
}

function filterCategory(cat) {
  appState.activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    if (btn.textContent.trim().toLowerCase() === cat.toLowerCase() || (cat === 'todos' && btn.textContent.includes('Todos'))) {
      btn.className = "cat-btn active bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl text-xs whitespace-nowrap shadow-md";
    } else {
      btn.className = "cat-btn bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs whitespace-nowrap";
    }
  });
  renderMenuList();
}

function handleSearch(query) {
  appState.searchQuery = query.toLowerCase().trim();
  renderMenuList();
}

function renderMenuList() {
  const grid = document.getElementById('menu-items-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = appState.menu.filter(item => {
    if (item.esgotado) return false;

    const matchesCat = appState.activeCategory === 'todos' || item.category === appState.activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(appState.searchQuery) || item.desc.toLowerCase().includes(appState.searchQuery);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="text-center text-slate-500 py-10 text-xs col-span-full">Nenhum prato disponível encontrado com esses critérios.</div>`;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-slate-900 border border-slate-800/80 rounded-2xl p-3 flex space-x-3 transition-all hover:border-slate-700 cursor-pointer shadow-md";
    card.onclick = () => openProductDetailModal(item.id);

    card.innerHTML = `
      <div class="w-24 h-24 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 relative">
        <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200x200/1e293b/fff?text=Prato'">
      </div>
      <div class="flex flex-col justify-between flex-grow">
        <div>
          <div class="flex justify-between items-start">
            <h3 class="font-bold text-white text-sm leading-snug line-clamp-1">${item.name}</h3>
          </div>
          <p class="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal">${item.desc}</p>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="text-sm font-extrabold text-emerald-400">R$ ${item.price.toFixed(2).replace('.', ',')}</span>
          <span class="bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1">
            <i class="fa-solid fa-plus"></i>
            <span>Ver Prato</span>
          </span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ==========================================================================
   5. ITEM DETAIL & CART SYSTEM
   ========================================================================== */

function openProductDetailModal(itemId) {
  const item = appState.menu.find(i => i.id === itemId);
  if (!item || item.esgotado) return;

  appState.selectedDetailItem = item;
  appState.detailQty = 1;

  document.getElementById('detail-item-image').src = item.image;
  document.getElementById('detail-item-name').textContent = item.name;
  document.getElementById('detail-item-price').textContent = `R$ ${item.price.toFixed(2).replace('.', ',')}`;
  document.getElementById('detail-item-desc').textContent = item.desc;
  document.getElementById('detail-item-notes').value = '';
  document.getElementById('detail-item-qty').textContent = appState.detailQty;

  document.getElementById('modal-product-detail').classList.remove('hidden');
}

function closeProductDetailModal() {
  document.getElementById('modal-product-detail').classList.add('hidden');
}

function adjustDetailQty(delta) {
  appState.detailQty += delta;
  if (appState.detailQty < 1) appState.detailQty = 1;
  document.getElementById('detail-item-qty').textContent = appState.detailQty;
}

function addCurrentDetailToCart() {
  if (!appState.selectedDetailItem) return;

  const notes = document.getElementById('detail-item-notes').value.trim();
  const existing = appState.cart.find(c => c.item.id === appState.selectedDetailItem.id && c.notes === notes);

  if (existing) {
    existing.quantity += appState.detailQty;
  } else {
    appState.cart.push({
      item: appState.selectedDetailItem,
      quantity: appState.detailQty,
      notes: notes
    });
  }

  closeProductDetailModal();
  updateCartUI();
  showToast(`${appState.selectedDetailItem.name} adicionado ao carrinho!`, 'success');
}

function updateCartQuantity(index, delta) {
  appState.cart[index].quantity += delta;
  if (appState.cart[index].quantity <= 0) {
    appState.cart.splice(index, 1);
  }
  updateCartUI();
}

function updateCartUI() {
  const totalItems = appState.cart.reduce((acc, i) => acc + i.quantity, 0);
  const totalPrice = appState.cart.reduce((acc, i) => acc + (i.item.price * i.quantity), 0);

  const cartBadge = document.getElementById('cart-badge-count');
  const cartTotal = document.getElementById('cart-total-display');
  const cartSub = document.getElementById('cart-summary-subtotal');
  const cartSumTotal = document.getElementById('cart-summary-total');

  if (cartBadge) cartBadge.textContent = totalItems;
  if (cartTotal) cartTotal.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
  if (cartSub) cartSub.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
  if (cartSumTotal) cartSumTotal.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;

  const list = document.getElementById('cart-items-list');
  if (!list) return;
  list.innerHTML = '';

  if (appState.cart.length === 0) {
    list.innerHTML = `<div class="text-center text-slate-500 py-12 text-xs">Seu carrinho está vazio.</div>`;
    return;
  }

  appState.cart.forEach((c, idx) => {
    const el = document.createElement('div');
    el.className = "bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2";
    el.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-white">${c.item.name}</span>
        <span class="font-bold text-emerald-400">R$ ${(c.item.price * c.quantity).toFixed(2).replace('.', ',')}</span>
      </div>
      ${c.notes ? `<p class="text-[10px] text-amber-400 italic">Obs: ${c.notes}</p>` : ''}
      <div class="flex items-center justify-between pt-1">
        <button onclick="updateCartQuantity(${idx}, -99)" class="text-[10px] text-rose-400 hover:underline">Remover</button>
        <div class="flex items-center space-x-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button onclick="updateCartQuantity(${idx}, -1)" class="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center font-bold text-xs">-</button>
          <span class="font-bold text-white text-xs px-1">${c.quantity}</span>
          <button onclick="updateCartQuantity(${idx}, 1)" class="w-5 h-5 bg-brand-500 text-white rounded flex items-center justify-center font-bold text-xs">+</button>
        </div>
      </div>
    `;
    list.appendChild(el);
  });
}

function toggleCartDrawer() {
  const drawer = document.getElementById('drawer-cart');
  if (drawer) drawer.classList.toggle('hidden');
}

function submitCustomerOrder() {
  if (appState.cart.length === 0) {
    showToast('Seu carrinho está vazio!', 'error');
    return;
  }

  if (!appState.customerName || !appState.customerPhone) {
    toggleCartDrawer();
    openAuthModal();
    showToast('Informe seu nome e WhatsApp para concluir o envio.', 'warning');
    return;
  }

  enviarPedidoAposCheckIn();
}

function enviarPedidoAposCheckIn() {
  if (appState.cart.length === 0) return;

  const totalPedido = appState.cart.reduce((acc, i) => acc + (i.item.price * i.quantity), 0);
  const itensStr = appState.cart.map(i => `${i.quantity}x ${i.item.name}`).join(', ');

  const newOrder = {
    id: Date.now(),
    tableNum: appState.currentTable,
    customerName: appState.customerName,
    customerPhone: appState.customerPhone,
    items: [...appState.cart],
    status: 'Pendente',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  appState.orders.push(newOrder);
  appState.cart = [];

  saveToLocalStorage(true, { message: `Novo pedido da Mesa ${appState.currentTable}!`, type: 'info', tableNum: appState.currentTable });

  // Sincronização automática para a Nuvem (Google Sheets)
  const dadosEnvio = {
    id: newOrder.id,
    mesa: newOrder.tableNum,
    cliente: newOrder.customerName,
    telefone: newOrder.customerPhone,
    itens: itensStr,
    total: `R$ ${totalPedido.toFixed(2).replace('.', ',')}`,
    dataHora: new Date().toLocaleString()
  };

  fetch(URL_GOOGLE_SHEETS, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dadosEnvio)
  }).catch(err => console.error("Erro ao enviar pedido para a nuvem:", err));

  renderCustomerUI();
  showToast('Pedido enviado para a cozinha com sucesso!', 'success');
}

/* ==========================================================================
   6. REAL-TIME ORDERS TRACKING & QUICK ACTIONS
   ========================================================================== */

function renderActiveOrders() {
  const tableOrders = appState.orders.filter(o => o.tableNum === appState.currentTable);
  const container = document.getElementById('customer-orders-list');
  const badge = document.getElementById('customer-order-count');

  if (!container || !badge) return;

  badge.textContent = `${tableOrders.length} Pedido(s)`;
  container.innerHTML = '';

  if (tableOrders.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 italic py-3 text-center">Você ainda não fez nenhum pedido nesta mesa.</div>`;
    return;
  }

  tableOrders.forEach(o => {
    let statusHTML = '';
    let classeCard = "bg-slate-950 border-slate-800";
    let botaoCancelarHTML = '';

    if (o.status === 'Cancelado') {
      classeCard = "bg-rose-950/20 border-rose-500/30";
      statusHTML = `<span class="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1"><i class="fa-solid fa-ban"></i> <span>CANCELADO</span></span>`;
    } else if (o.status === 'Pendente') {
      statusHTML = `<span class="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1"><i class="fa-solid fa-clock"></i> <span>Pendente</span></span>`;
      
      botaoCancelarHTML = `
        <button onclick="clienteCancelarPedido(${o.id})" class="bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-[10px] font-bold px-2 py-1 rounded-lg transition flex items-center gap-1 shadow" title="Cancelar pedido">
          <i class="fa-solid fa-xmark"></i> <span>Desistir / Cancelar</span>
        </button>
      `;
    } else if (o.status === 'Em Preparo') {
      statusHTML = `<span class="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1"><i class="fa-solid fa-fire-burner"></i> <span>Em Preparo...</span></span>`;
    } else if (o.status === 'Pronto') {
      statusHTML = `<span class="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold animate-bounce flex items-center space-x-1"><i class="fa-solid fa-bell"></i> <span>PRONTO!</span></span>`;
    } else if (o.status === 'Entregue') {
      statusHTML = `<span class="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1"><i class="fa-solid fa-check"></i> <span>Entregue</span></span>`;
    }

    const itensHTML = o.items.map(i => {
      const itemStatus = i.status || o.status;
      
      if (itemStatus === 'Cancelado') {
        return `
          <div class="flex flex-col py-1 border-b border-slate-800/50 last:border-0">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-rose-400 font-semibold">${i.quantity}x ${i.item.name}</span>
              <span class="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold">Item Cancelado</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0 text-[11px] text-slate-300">
          <span>${i.quantity}x ${i.item.name}</span>
        </div>
      `;
    }).join('');

    const card = document.createElement('div');
    card.className = `${classeCard} p-3.5 rounded-2xl border space-y-2 shadow-md`;
    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <span class="text-xs font-bold text-white">Pedido #${o.id.toString().slice(-4)} (${o.timestamp})</span>
        ${statusHTML}
      </div>
      <div class="space-y-0.5">
        ${itensHTML}
      </div>
      ${botaoCancelarHTML ? `<div class="pt-2 flex justify-end">${botaoCancelarHTML}</div>` : ''}
    `;
    container.appendChild(card);
  });
}

function clienteCancelarPedido(pedidoId) {
  const pedido = appState.orders.find(o => o.id === pedidoId);
  if (!pedido || pedido.status !== 'Pendente') return;

  if (confirm("Tem certeza de que deseja cancelar este pedido?")) {
    pedido.status = 'Cancelado';
    pedido.motivoCancelamento = 'Cancelado pelo cliente';
    
    pedido.items.forEach(i => {
      i.status = 'Cancelado';
    });

    saveToLocalStorage(true, {
      message: `O cliente da Mesa ${appState.currentTable} cancelou o pedido #${pedido.id.toString().slice(-4)}`,
      type: 'error',
      tableNum: appState.currentTable
    });

    renderCustomerUI();
    showToast('Pedido cancelado com sucesso.', 'warning');
  }
}

function triggerCustomerCall(type) {
  const tableData = appState.tables[appState.currentTable];

  if (type === 'waiter') {
    tableData.callWaiter = !tableData.callWaiter;
    const msg = tableData.callWaiter ? `Garçom solicitado para a Mesa ${appState.currentTable}!` : `Chamado cancelado.`;
    saveToLocalStorage(true, { message: msg, type: 'warning', tableNum: appState.currentTable });
    showToast(msg, 'info');
  }

  renderCustomerUI();
}

function openBillPaymentModal() {
  const modal = document.getElementById('modal-bill-payment');
  if (modal) modal.classList.remove('hidden');
}

function closeBillPaymentModal() {
  const modal = document.getElementById('modal-bill-payment');
  if (modal) modal.classList.add('hidden');
}

function confirmRequestBill() {
  const selectedRadio = document.querySelector('input[name="pay-method"]:checked');
  const selectedMethod = selectedRadio ? selectedRadio.value : 'PIX';
  
  appState.tables[appState.currentTable].requestBill = true;
  appState.tables[appState.currentTable].paymentMethod = selectedMethod;

  saveToLocalStorage(true, { message: `Mesa ${appState.currentTable} solicitou a conta via ${selectedMethod}!`, type: 'warning', tableNum: appState.currentTable });
  closeBillPaymentModal();
  renderCustomerUI();
  showToast(`Conta solicitada com sucesso (${selectedMethod})! O garçom já está a caminho.`, 'success');
}

/* ==========================================================================
   7. MAPA DE MESAS VISÍVEL PARA O CLIENTE
   ========================================================================== */

function abrirMapaMesasCliente() {
  renderizarMapaMesasClienteModal();
  const modal = document.getElementById('modal-mapa-mesas-cliente');
  if (modal) modal.classList.remove('hidden');
}

function fecharMapaMesasCliente() {
  const modal = document.getElementById('modal-mapa-mesas-cliente');
  if (modal) modal.classList.add('hidden');
}

function renderizarMapaMesasClienteModal() {
  const container = document.getElementById('grid-mapa-mesas-cliente');
  if (!container) return;
  container.innerHTML = '';

  for (let num = 1; num <= TOTAL_TABLES; num++) {
    const tableData = appState.tables[num] || {};
    const possuiCliente = !!(tableData.customerName && tableData.customerPhone);
    const ehMesaAtual = num === appState.currentTable;

    let corCard = "bg-slate-950 border-slate-800 text-slate-400";
    let textoStatus = "Disponível";

    if (ehMesaAtual) {
      corCard = "bg-brand-500/20 border-brand-500 text-brand-300 ring-2 ring-brand-500/50";
      textoStatus = "Sua Mesa";
    } else if (possuiCliente) {
      corCard = "bg-blue-950/30 border-blue-500/30 text-blue-300";
      textoStatus = "Ocupada";
    } else {
      corCard = "bg-emerald-950/20 border-emerald-500/30 text-emerald-400";
      textoStatus = "Livre";
    }

    const card = document.createElement('div');
    card.className = `border rounded-2xl p-3 flex flex-col items-center justify-center text-center space-y-1 shadow ${corCard}`;
    card.innerHTML = `
      <span class="text-xs font-extrabold text-white">Mesa ${num < 10 ? '0' + num : num}</span>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800">${textoStatus}</span>
      ${ehMesaAtual ? '<span class="text-[9px] text-amber-400 font-semibold mt-0.5">(Você está aqui)</span>' : ''}
    `;
    container.appendChild(card);
  }
}

/* ==========================================================================
   8. TOAST NOTIFICATIONS
   ========================================================================== */

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  let icon = 'fa-circle-info';
  let colors = 'bg-slate-900 border-slate-800 text-white';

  if (type === 'success') {
    icon = 'fa-circle-check';
    colors = 'bg-emerald-950 border-emerald-500/50 text-emerald-200';
  } else if (type === 'warning') {
    icon = 'fa-triangle-exclamation';
    colors = 'bg-amber-950 border-amber-500/50 text-amber-200';
  } else if (type === 'error') {
    icon = 'fa-circle-xmark';
    colors = 'bg-rose-950 border-rose-500/50 text-rose-200';
  }

  toast.className = `p-3 rounded-xl border ${colors} shadow-2xl flex items-center space-x-3 text-xs transition-all transform duration-300 pointer-events-auto`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-base flex-shrink-0"></i>
    <span class="font-medium flex-grow">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}