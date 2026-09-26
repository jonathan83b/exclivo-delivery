/* ==========================================================================
   0. APLICAÇÃO DE CONFIGURAÇÕES GLOBAIS DO DEV (COZINHA.JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  aplicarConfiguracoesVisuaisDEV();
});

function aplicarConfiguracoesVisuaisDEV() {
  const savedDev = localStorage.getItem('gs_config_dev') || localStorage.getItem('gs_config_loja');
  if (savedDev) {
    try {
      const cfg = JSON.parse(savedDev);
      const elLoja = document.getElementById('cozinha-nome-loja') || document.getElementById('header-nome-loja');
      if (elLoja && cfg.nomeLoja) {
        elLoja.textContent = cfg.nomeLoja + ' - Cozinha';
      }
    } catch (e) {
      console.error("Erro ao aplicar configs visuais do DEV na cozinha:", e);
    }
  }
}

/* ==========================================================================
   1. INITIAL STATE & MOCK DATA
   ========================================================================== */

const syncChannel = new BroadcastChannel('Restaurante_realtime_channel');

let appOrders = [];
let appMenu = [];

document.addEventListener('DOMContentLoaded', () => {
  carregarDados();
  configurarEventos();

  // 1. Escuta alterações enviadas via BroadcastChannel (mesmo navegador/abas)
  syncChannel.onmessage = (e) => {
    if (e.data && e.data.type === 'STATE_UPDATE') {
      carregarDados();
      aplicarConfiguracoesVisuaisDEV();
      if (e.data.toast && e.data.toast.type === 'info') {
        tocarSomAlerta();
      }
    }
  };

  // 2. Escuta alterações diretas no LocalStorage (fallback de tempo real nativo)
  window.addEventListener('storage', (e) => {
    if (['gs_orders', 'gs_menu', 'gs_config_dev', 'gs_config_loja'].includes(e.key)) {
      carregarDados();
      aplicarConfiguracoesVisuaisDEV();
    }
  });
});

function carregarDados() {
  const savedOrders = localStorage.getItem('gs_orders');
  const savedMenu = localStorage.getItem('gs_menu');
  
  appOrders = savedOrders ? JSON.parse(savedOrders) : [];
  appMenu = savedMenu ? JSON.parse(savedMenu) : [];
  
  renderizarKDS();
  renderizarGestaoEstoque();
}

function salvarAlteracoes(notificar = true, mesaAfetada = null) {
  localStorage.setItem('gs_orders', JSON.stringify(appOrders));
  localStorage.setItem('gs_menu', JSON.stringify(appMenu));

  if (notificar) {
    syncChannel.postMessage({
      type: 'STATE_UPDATE',
      toast: mesaAfetada ? { message: 'Status do seu pedido atualizado!', type: 'success', tableNum: mesaAfetada } : null
    });
  }
}

function configurarEventos() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('gs_equipe_sessao');
      window.location.href = 'login.html';
    });
  }
}

/* ==========================================================================
   2. GESTÃO DO PAINEL KDS (KANBAN DA COZINHA)
   ========================================================================== */

function renderizarKDS() {
  const containerPendentes = document.getElementById('col-pendentes');
  const containerPreparo = document.getElementById('col-preparo');
  const containerProntos = document.getElementById('col-prontos');

  if (!containerPendentes) return;

  containerPendentes.innerHTML = '';
  containerPreparo.innerHTML = '';
  containerProntos.innerHTML = '';

  // Filtra apenas pedidos ativos (ignora totalmente entregues ou cancelados)
  const pedidosAtivos = appOrders.filter(o => {
    const todosFinalizados = o.items.every(i => i.status === 'Entregue' || i.status === 'Cancelado');
    return !todosFinalizados && o.status !== 'Entregue' && o.status !== 'Cancelado';
  });

  const countPendentes = document.getElementById('count-pendentes');
  const countPreparo = document.getElementById('count-preparo');
  const countProntos = document.getElementById('count-prontos');

  if (countPendentes) countPendentes.textContent = pedidosAtivos.filter(o => o.status === 'Pendente').length;
  if (countPreparo) countPreparo.textContent = pedidosAtivos.filter(o => o.status === 'Em Preparo').length;
  if (countProntos) countProntos.textContent = pedidosAtivos.filter(o => o.status === 'Pronto').length;

  if (pedidosAtivos.length === 0) {
    containerPendentes.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-8">Nenhum pedido pendente.</p>`;
  }

  pedidosAtivos.forEach(pedido => {
    const card = criarCardPedido(pedido);

    if (pedido.status === 'Pendente') {
      containerPendentes.appendChild(card);
    } else if (pedido.status === 'Em Preparo') {
      containerPreparo.appendChild(card);
    } else if (pedido.status === 'Pronto') {
      containerProntos.appendChild(card);
    }
  });
}

function criarCardPedido(pedido) {
  const card = document.createElement('div');
  
  let bordaCor = 'border-amber-500/50';
  if (pedido.status === 'Em Preparo') bordaCor = 'border-blue-500/50';
  if (pedido.status === 'Pronto') bordaCor = 'border-emerald-500/50';

  card.className = `bg-slate-900 border ${bordaCor} rounded-2xl p-4 shadow-xl space-y-3 transition-all`;

  // Renderiza cada item individualmente permitindo o cancelamento do item específico
  const itensHTML = pedido.items.map((i, idx) => {
    const itemStatus = i.status || pedido.status;

    if (itemStatus === 'Cancelado') {
      return `
        <div class="border-b border-slate-800/80 pb-2 opacity-50">
          <div class="flex justify-between items-center text-xs">
            <span class="text-rose-400 font-bold"><span class="font-black">${i.quantity}x</span> ${i.item.name}</span>
            <span class="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">Item Cancelado</span>
          </div>
          ${i.motivoCancelamento ? `<p class="text-[10px] text-rose-400 italic mt-0.5">Motivo: ${i.motivoCancelamento}</p>` : ''}
        </div>
      `;
    }

    return `
      <div class="border-b border-slate-800/80 pb-2">
        <div class="flex justify-between items-center text-xs">
          <span class="font-extrabold text-white"><span class="text-brand-400 font-black">${i.quantity}x</span> ${i.item.name}</span>
          <button onclick="cancelarItemEspecifico(${pedido.id}, ${idx})" class="text-slate-500 hover:text-rose-400 p-1 transition" title="Cancelar apenas este item">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
        ${i.notes ? `<p class="text-[11px] text-amber-400 italic mt-0.5"><i class="fa-solid fa-triangle-exclamation text-[9px] mr-1"></i>Obs: ${i.notes}</p>` : ''}
      </div>
    `;
  }).join('');

  let acaoBotao = '';
  if (pedido.status === 'Pendente') {
    acaoBotao = `
      <div class="grid grid-cols-4 gap-2">
        <button onclick="mudarStatusPedido(${pedido.id}, 'Em Preparo')" class="col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 shadow">
          <i class="fa-solid fa-fire-burner"></i>
          <span>Iniciar Preparo</span>
        </button>
        <button onclick="cancelarPedidoInteiro(${pedido.id})" class="col-span-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center transition shadow" title="Cancelar Pedido Todo">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
  } else if (pedido.status === 'Em Preparo') {
    acaoBotao = `
      <div class="grid grid-cols-4 gap-2">
        <button onclick="mudarStatusPedido(${pedido.id}, 'Pronto')" class="col-span-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 shadow">
          <i class="fa-solid fa-bell"></i>
          <span>Marcar como PRONTO!</span>
        </button>
        <button onclick="cancelarPedidoInteiro(${pedido.id})" class="col-span-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center transition shadow" title="Cancelar Pedido Todo">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
  } else if (pedido.status === 'Pronto') {
    acaoBotao = `
      <div class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-center py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1">
        <i class="fa-solid fa-check-double"></i>
        <span>Aguardando Garçom Levar</span>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="flex justify-between items-center border-b border-slate-800 pb-2">
      <div class="flex items-center space-x-2">
        <span class="bg-brand-500 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow">Mesa ${pedido.tableNum < 10 ? '0' + pedido.tableNum : pedido.tableNum}</span>
        <span class="text-xs font-bold text-white">${pedido.customerName}</span>
      </div>
      <span class="text-[10px] text-slate-400 font-semibold"><i class="fa-regular fa-clock mr-1"></i>${pedido.timestamp}</span>
    </div>

    <div class="space-y-2 max-h-48 overflow-y-auto">
      ${itensHTML}
    </div>

    <div class="pt-1">
      ${acaoBotao}
    </div>
  `;

  return card;
}

function mudarStatusPedido(pedidoId, novoStatus) {
  const pedido = appOrders.find(o => o.id === pedidoId);
  if (!pedido) return;

  pedido.status = novoStatus;
  
  pedido.items.forEach(i => {
    if (i.status !== 'Cancelado' && i.status !== 'Entregue') {
      i.status = novoStatus;
    }
  });

  salvarAlteracoes(true, pedido.tableNum);
  renderizarKDS();
}

function cancelarItemEspecifico(pedidoId, itemIndex) {
  const pedido = appOrders.find(o => o.id === pedidoId);
  if (!pedido || !pedido.items[itemIndex]) return;

  const item = pedido.items[itemIndex];
  const motivo = prompt(`Digite o motivo do cancelamento do item "${item.item.name}" (Mesa ${pedido.tableNum}):`, "Ingrediente indisponível");
  
  if (motivo === null) return;

  item.status = 'Cancelado';
  item.motivoCancelamento = motivo;

  const todosCancelados = pedido.items.every(i => i.status === 'Cancelado');
  if (todosCancelados) {
    pedido.status = 'Cancelado';
  }

  localStorage.setItem('gs_orders', JSON.stringify(appOrders));
  syncChannel.postMessage({
    type: 'STATE_UPDATE',
    toast: {
      message: `Item "${item.item.name}" da Mesa ${pedido.tableNum} foi cancelado. Motivo: ${motivo}`,
      type: 'error',
      tableNum: pedido.tableNum
    }
  });

  renderizarKDS();
}

function cancelarPedidoInteiro(pedidoId) {
  const pedido = appOrders.find(o => o.id === pedidoId);
  if (!pedido) return;

  const motivo = prompt(`Digite o motivo do cancelamento do pedido todo para a Mesa ${pedido.tableNum}:`, "Indisponível na cozinha");
  if (motivo === null) return;

  pedido.status = 'Cancelado';
  pedido.items.forEach(i => {
    i.status = 'Cancelado';
    i.motivoCancelamento = motivo;
  });

  localStorage.setItem('gs_orders', JSON.stringify(appOrders));
  syncChannel.postMessage({
    type: 'STATE_UPDATE',
    toast: {
      message: `Pedido #${pedido.id.toString().slice(-4)} da Mesa ${pedido.tableNum} foi totalmente cancelado. Motivo: ${motivo}`,
      type: 'error',
      tableNum: pedido.tableNum
    }
  });

  renderizarKDS();
}

/* ==========================================================================
   3. GESTÃO DE ESTOQUE / PRODUTOS ESGOTADOS (COZINHA)
   ========================================================================== */

function renderizarGestaoEstoque() {
  const containerEstoque = document.getElementById('lista-gestao-estoque');
  if (!containerEstoque) return;

  containerEstoque.innerHTML = '';

  appMenu.forEach(item => {
    const esgotado = !!item.esgotado;

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs';
    row.innerHTML = `
      <div class="flex items-center space-x-3">
        <img src="${item.image}" class="w-10 h-10 object-cover rounded-lg" alt="${item.name}" onerror="this.src='https://placehold.co/100x100/1e293b/fff?text=Prato'">
        <div>
          <p class="font-bold text-white">${item.name}</p>
          <p class="text-[10px] text-slate-400">${item.category} • R$ ${item.price.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>
      
      <button onclick="alternarEstoqueProduto(${item.id})" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${esgotado ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'}">
        <i class="fa-solid ${esgotado ? 'fa-ban' : 'fa-check'}"></i>
        <span>${esgotado ? 'ESGOTADO' : 'Disponível'}</span>
      </button>
    `;

    containerEstoque.appendChild(row);
  });
}

function alternarEstoqueProduto(itemId) {
  const item = appMenu.find(m => m.id === itemId);
  if (!item) return;

  item.esgotado = !item.esgotado;
  
  salvarAlteracoes(true);
  renderizarGestaoEstoque();
}

function abrirModalEstoque() {
  const modal = document.getElementById('modal-gestao-estoque');
  if (modal) modal.classList.remove('hidden');
}

function fecharModalEstoque() {
  const modal = document.getElementById('modal-gestao-estoque');
  if (modal) modal.classList.add('hidden');
}

/* ==========================================================================
   4. NOTIFICAÇÃO SONORA DE NOVOS PEDIDOS
   ========================================================================== */

function tocarSomAlerta() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.log("Áudio indisponível antes da interação do usuário.");
  }
}