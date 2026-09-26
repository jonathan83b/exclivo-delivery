/* ==========================================================================
   0. APLICAÇÃO DE CONFIGURAÇÕES GLOBAIS DO DEV (GARCOM.JS)
   ========================================================================== */

const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbwRXuS52NHt-pdTNYzjBH9nCBbAoMrr_7SnBaqQJz6imznMSCUxscYy1Bj-5pChfh7gtg/exec";

document.addEventListener('DOMContentLoaded', () => {
  aplicarConfiguracoesVisuaisDEV();
});

function aplicarConfiguracoesVisuaisDEV() {
  const savedDev = localStorage.getItem('gs_config_dev') || localStorage.getItem('gs_config_loja');
  if (savedDev) {
    try {
      const cfg = JSON.parse(savedDev);
      const elLoja = document.getElementById('garcom-nome-loja') || document.getElementById('header-nome-loja');
      if (elLoja && cfg.nomeLoja) {
        elLoja.textContent = cfg.nomeLoja + ' - Garçom';
      }
    } catch (e) {
      console.error("Erro ao aplicar configs visuais do DEV no garçom:", e);
    }
  }
}

/* ==========================================================================
   1. INITIAL STATE & SINCRONIZAÇÃO NUVEM (GOOGLE SHEETS) + LOCAL
   ========================================================================== */

const syncChannel = new BroadcastChannel('Restaurante_realtime_channel');

const TOTAL_MESAS = 12;
let appTables = {};
let appOrders = [];
let mesaSelecionadaComanda = null;

document.addEventListener('DOMContentLoaded', () => {
  carregarDadosServidor();
  sincronizarPedidosComNuvem();
  configurarEventos();

  // Sincroniza automaticamente a cada 5 segundos com a nuvem do Google Sheets
  setInterval(sincronizarPedidosComNuvem, 5000);

  // Escuta chamados e novos pedidos das mesas em tempo real (abas/locais)
  syncChannel.onmessage = (e) => {
    if (e.data && e.data.type === 'STATE_UPDATE') {
      carregarDadosServidor();
      aplicarConfiguracoesVisuaisDEV();
    }
  };

  // Escuta alterações diretas no LocalStorage
  window.addEventListener('storage', (e) => {
    if (['gs_tables', 'gs_orders', 'gs_config_dev', 'gs_config_loja'].includes(e.key)) {
      carregarDadosServidor();
      aplicarConfiguracoesVisuaisDEV();
    }
  });
});

function carregarDadosServidor() {
  const savedTables = localStorage.getItem('gs_tables');
  const savedOrders = localStorage.getItem('gs_orders');

  appOrders = savedOrders ? JSON.parse(savedOrders) : [];

  if (savedTables) {
    appTables = JSON.parse(savedTables);
  } else {
    for (let i = 1; i <= TOTAL_MESAS; i++) {
      appTables[i] = { customerName: '', customerPhone: '', callWaiter: false, requestBill: false, paymentMethod: '' };
    }
  }

  renderizarGridMesas();

  if (mesaSelecionadaComanda) {
    renderizarDetalhesComanda(mesaSelecionadaComanda);
  }
}

// Busca os pedidos diretamente da planilha do Google Sheets para unificar com o telemóvel
function sincronizarPedidosComNuvem() {
  fetch(URL_GOOGLE_SHEETS)
    .then(response => response.json())
    .then(dadosPlanilha => {
      if (!Array.isArray(dadosPlanilha) || dadosPlanilha.length === 0) return;

      let houveMudanca = false;

      dadosPlanilha.forEach((row, index) => {
        const pedidoId = Number(row.id) || (Date.now() + index);
        const mesaNum = parseInt(row.mesa) || 1;

        // Verifica se o pedido já existe no appOrders local
        const existe = appOrders.some(o => Number(o.id) === pedidoId);

        if (!existe) {
          houveMudanca = true;
          appOrders.push({
            id: pedidoId,
            tableNum: mesaNum,
            customerName: row.cliente || 'Cliente',
            customerPhone: row.telefone || '',
            items: [
              {
                quantity: 1,
                item: { name: row.itens || 'Item Diversos', price: 0 }
              }
            ],
            status: 'Pendente',
            timestamp: row.dataHora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          // Se a mesa estava vazia, marca-a como ocupada automaticamente pelo pedido da nuvem
          if (!appTables[mesaNum]) {
            appTables[mesaNum] = { customerName: '', customerPhone: '', callWaiter: false, requestBill: false, paymentMethod: '' };
          }
          if (!appTables[mesaNum].customerName) {
            appTables[mesaNum].customerName = row.cliente || 'Cliente Telemóvel';
            appTables[mesaNum].customerPhone = row.telefone || '';
          }
        }
      });

      if (houveMudanca) {
        salvarAlteracoes(false); // Salva localmente sem disparar loop de canal
        renderizarGridMesas();
        if (mesaSelecionadaComanda) {
          renderizarDetalhesComanda(mesaSelecionadaComanda);
        }
      }
    })
    .catch(err => {
      console.error("Erro ao sincronizar com a nuvem do Google Sheets:", err);
    });
}

function salvarAlteracoes(notificar = true, msgToast = null) {
  localStorage.setItem('gs_tables', JSON.stringify(appTables));
  localStorage.setItem('gs_orders', JSON.stringify(appOrders));

  if (notificar) {
    syncChannel.postMessage({ type: 'STATE_UPDATE', toast: msgToast });
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

function renderizarGridMesas() {
  const grid = document.getElementById('grid-mesas');
  if (!grid) return;
  grid.innerHTML = '';

  let contadores = { livres: 0, ocupadas: 0, chamando: 0, conta: 0 };

  for (let num = 1; num <= TOTAL_MESAS; num++) {
    const tableData = appTables[num] || {};
    const pedidosMesa = appOrders.filter(o => o.tableNum === num);
    const possuiCliente = !!(tableData.customerName && tableData.customerPhone);

    let pratosProntosCount = 0;
    let pedidosAtivosCount = 0;

    pedidosMesa.forEach(ped => {
      let pedAtivo = false;
      ped.items.forEach(item => {
        const itemStatus = item.status || ped.status;
        if (itemStatus !== 'Entregue' && itemStatus !== 'Cancelado') {
          pedAtivo = true;
        }
        if (itemStatus === 'Pronto') {
          pratosProntosCount++;
        }
      });
      if (pedAtivo) pedidosAtivosCount++;
    });

    let statusCor = 'border-slate-800 bg-slate-900/80';
    let statusBadge = '<span class="text-emerald-400 font-bold text-[10px]">Livre</span>';
    let animacaoPulse = '';

    if (possuiCliente) {
      statusCor = 'border-blue-500/40 bg-slate-900';
      statusBadge = '<span class="text-blue-400 font-bold text-[10px]">Ocupada</span>';
      contadores.ocupadas++;
    } else {
      contadores.livres++;
    }

    if (tableData.callWaiter) {
      statusCor = 'border-amber-500 bg-amber-950/20';
      statusBadge = '<span class="text-amber-400 font-extrabold text-[10px] animate-pulse"><i class="fa-solid fa-bell mr-1"></i>Garçom!</span>';
      animacaoPulse = 'animate-bounce';
      contadores.chamando++;
    }

    if (tableData.requestBill) {
      statusCor = 'border-emerald-500 bg-emerald-950/20';
      statusBadge = `<span class="text-emerald-400 font-extrabold text-[10px]"><i class="fa-solid fa-receipt mr-1"></i>Conta (${tableData.paymentMethod || 'PIX'})</span>`;
      contadores.conta++;
    }

    let alertaProntoHTML = '';
    if (pratosProntosCount > 0) {
      alertaProntoHTML = `
        <div class="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center justify-between animate-pulse">
          <span><i class="fa-solid fa-bell mr-1"></i>${pratosProntosCount} Item(ns) PRONTO(S)!</span>
        </div>
      `;
    }

    const card = document.createElement('div');
    card.className = `border ${statusCor} rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3 relative transition-all hover:border-slate-700`;

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <span class="text-lg font-black text-white">Mesa ${num < 10 ? '0' + num : num}</span>
          <p class="text-xs text-slate-400 line-clamp-1 mt-0.5 font-medium">${possuiCliente ? tableData.customerName : 'Mesa Vazia'}</p>
        </div>
        <div class="${animacaoPulse}">
          ${statusBadge}
        </div>
      </div>

      ${alertaProntoHTML}

      <div class="space-y-1 pt-1 border-t border-slate-800/80">
        <div class="flex justify-between text-[11px] text-slate-400">
          <span>Pedidos ativos:</span>
          <span class="font-bold text-white">${pedidosAtivosCount}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-1">
        <button onclick="abrirModalComanda(${num})" class="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition">
          <i class="fa-solid fa-receipt text-amber-400 mr-1"></i> Comanda
        </button>
        ${possuiCliente ? `
          <button onclick="darBaixaMesa(${num})" class="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 py-2 rounded-xl text-xs font-bold transition">
            <i class="fa-solid fa-user-xmark mr-1"></i> Baixa
          </button>
        ` : `
          <button onclick="ocuparMesaManual(${num})" class="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1">
            <i class="fa-solid fa-user-plus"></i> Ocupar
          </button>
        `}
      </div>
    `;

    grid.appendChild(card);
  }

  const elLivres = document.getElementById('dash-livres');
  const elOcupadas = document.getElementById('dash-ocupadas');
  const elChamando = document.getElementById('dash-chamando');
  const elConta = document.getElementById('dash-conta');

  if (elLivres) elLivres.textContent = contadores.livres;
  if (elOcupadas) elOcupadas.textContent = contadores.ocupadas;
  if (elChamando) elChamando.textContent = contadores.chamando;
  if (elConta) elConta.textContent = contadores.conta;
}

function ocuparMesaManual(num) {
  const nomeCliente = prompt(`Confirmar presença na Mesa ${num}\nDigite o nome do cliente / responsável:`, "Cliente Presencial");
  if (!nomeCliente) return;

  appTables[num] = {
    ...appTables[num],
    customerName: nomeCliente.trim(),
    customerPhone: "(00) 00000-0000"
  };

  salvarAlteracoes(true, {
    message: `Mesa ${num} ocupada manualmente para ${nomeCliente}!`,
    type: 'success',
    tableNum: num
  });

  renderizarGridMesas();
}

function abrirModalComanda(mesaNum) {
  mesaSelecionadaComanda = mesaNum;
  renderizarDetalhesComanda(mesaNum);
  const modal = document.getElementById('modal-comanda-garcom');
  if (modal) modal.classList.remove('hidden');
}

function fecharModalComanda() {
  mesaSelecionadaComanda = null;
  const modal = document.getElementById('modal-comanda-garcom');
  if (modal) modal.classList.add('hidden');
}

function renderizarDetalhesComanda(num) {
  const tableData = appTables[num] || {};
  const pedidosMesa = appOrders.filter(o => o.tableNum === num);

  const elTitle = document.getElementById('comanda-mesa-title');
  const elNome = document.getElementById('comanda-cliente-nome');
  const elPhone = document.getElementById('comanda-cliente-phone');

  if (elTitle) elTitle.textContent = `Comanda - Mesa ${num < 10 ? '0' + num : num}`;
  if (elNome) elNome.textContent = tableData.customerName || 'Sem Cliente Registrado';
  if (elPhone) elPhone.textContent = tableData.customerPhone || 'Sem Contato';

  const btnAtender = document.getElementById('btn-atender-chamado');
  if (btnAtender) {
    if (tableData.callWaiter) {
      btnAtender.classList.remove('hidden');
      btnAtender.onclick = () => atenderChamadoGarcom(num);
    } else {
      btnAtender.classList.add('hidden');
    }
  }

  const containerItens = document.getElementById('comanda-itens-lista');
  if (!containerItens) return;
  containerItens.innerHTML = '';

  let totalAcumulado = 0;

  if (pedidosMesa.length === 0) {
    containerItens.innerHTML = `<p class="text-center text-xs text-slate-500 py-6">Nenhum pedido feito nesta mesa ainda.</p>`;
  } else {
    pedidosMesa.forEach(ped => {
      ped.items.forEach((itemCart, itemIndex) => {
        const itemStatus = itemCart.status || ped.status;

        if (itemStatus === 'Cancelado') {
          const el = document.createElement('div');
          el.className = 'bg-rose-950/20 p-3 rounded-xl border border-rose-500/30 space-y-1 text-xs';
          el.innerHTML = `
            <div class="flex justify-between items-start">
              <div>
                <span class="font-bold text-rose-300"><span class="font-black">${itemCart.quantity}x</span> ${itemCart.item.name}</span>
                <p class="text-[10px] text-rose-400 mt-0.5">Motivo: ${itemCart.motivoCancelamento || ped.motivoCancelamento || 'Indisponível'}</p>
              </div>
              <span class="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded">Cancelado</span>
            </div>
          `;
          containerItens.appendChild(el);
          return;
        }

        const subtotal = (itemCart.item.price || 0) * itemCart.quantity;
        totalAcumulado += subtotal;

        let statusBadgeHTML = '';
        let acaoEntregueHTML = '';

        if (itemStatus === 'Pendente') {
          statusBadgeHTML = `<span class="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-clock mr-1"></i>Pendente</span>`;
        } else if (itemStatus === 'Em Preparo') {
          statusBadgeHTML = `<span class="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-fire-burner mr-1"></i>Em Preparo</span>`;
        } else if (itemStatus === 'Pronto') {
          statusBadgeHTML = `<span class="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-extrabold animate-pulse"><i class="fa-solid fa-bell mr-1"></i>PRONTO!</span>`;
          acaoEntregueHTML = `
            <button onclick="marcarItemEntregue(${ped.id}, ${itemIndex})" class="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 rounded-lg shadow transition flex items-center justify-center gap-1">
              <i class="fa-solid fa-check-double"></i> Entregar Apenas Este Item
            </button>
          `;
        } else if (itemStatus === 'Entregue') {
          statusBadgeHTML = `<span class="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold"><i class="fa-solid fa-check mr-1"></i>Entregue</span>`;
        }

        const el = document.createElement('div');
        el.className = 'bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs';
        el.innerHTML = `
          <div class="flex justify-between items-start">
            <div>
              <span class="font-bold text-white"><span class="text-brand-400 font-black">${itemCart.quantity}x</span> ${itemCart.item.name}</span>
              ${itemCart.notes ? `<p class="text-[10px] text-amber-400 italic">Obs: ${itemCart.notes}</p>` : ''}
            </div>
            <span class="font-extrabold text-emerald-400">R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="flex justify-between items-center pt-1 border-t border-slate-900">
            <span class="text-[10px] text-slate-500">${ped.timestamp}</span>
            ${statusBadgeHTML}
          </div>
          ${acaoEntregueHTML}
        `;
        containerItens.appendChild(el);
      });
    });
  }

  const elTotal = document.getElementById('comanda-total-valor');
  if (elTotal) elTotal.textContent = `R$ ${totalAcumulado.toFixed(2).replace('.', ',')}`;

  const btnWhatsapp = document.getElementById('btn-whatsapp-comanda');
  if (btnWhatsapp) {
    btnWhatsapp.onclick = () => enviarComandaWhatsApp(num, totalAcumulado);
  }
}

function marcarItemEntregue(pedidoId, itemIndex) {
  const pedido = appOrders.find(o => Number(o.id) === Number(pedidoId));
  if (!pedido || !pedido.items[itemIndex]) return;

  pedido.items[itemIndex].status = 'Entregue';

  const todosEntregues = pedido.items.every(i => (i.status || pedido.status) === 'Entregue' || (i.status || pedido.status) === 'Cancelado');
  if (todosEntregues) {
    pedido.status = 'Entregue';
  }

  salvarAlteracoes(true, {
    message: `Item "${pedido.items[itemIndex].item.name}" entregue na Mesa ${pedido.tableNum}!`,
    type: 'success',
    tableNum: pedido.tableNum
  });

  renderizarGridMesas();
  if (mesaSelecionadaComanda) {
    renderizarDetalhesComanda(mesaSelecionadaComanda);
  }
}

function enviarComandaWhatsApp(numMesa, totalAcumulado) {
  const tableData = appTables[numMesa] || {};
  let phone = tableData.customerPhone ? tableData.customerPhone.replace(/\D/g, '') : '';

  if (!phone || phone.length < 10) {
    const inputPhone = prompt(
      `A Mesa ${numMesa} não possui um telemóvel/WhatsApp cadastrado.\nDigite o número com DDD para enviar a comanda:`,
      ""
    );

    if (!inputPhone) return;

    phone = inputPhone.replace(/\D/g, '');
    if (phone.length < 10) {
      alert("Número de telefone inválido!");
      return;
    }
  }

  if (!phone.startsWith('55') && (phone.length === 10 || phone.length === 11)) {
    phone = '55' + phone;
  }

  const pedidosMesa = appOrders.filter(o => o.tableNum === numMesa);
  const clienteNome = tableData.customerName || 'Cliente';

  let mensagem = `* Resumo da Comanda - Restaurante *\n`;
  mensagem += `*Mesa:* ${numMesa < 10 ? '0' + numMesa : numMesa}\n`;
  mensagem += `*Cliente:* ${clienteNome}\n`;
  mensagem += `------------------------------------\n\n`;

  let totalValido = 0;

  pedidosMesa.forEach(ped => {
    ped.items.forEach(itemCart => {
      const itemStatus = itemCart.status || ped.status;
      if (itemStatus !== 'Cancelado') {
        const subtotal = (itemCart.item.price || 0) * itemCart.quantity;
        totalValido += subtotal;
        mensagem += `• ${itemCart.quantity}x ${itemCart.item.name} - R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
      }
    });
  });

  mensagem += `\n------------------------------------\n`;
  mensagem += `*TOTAL A PAGAR:* R$ ${totalValido.toFixed(2).replace('.', ',')}\n\n`;
  mensagem += `Obrigado pela preferência! Bom apetite! 🍽️`;

  const urlWhatsApp = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensagem)}`;
  window.open(urlWhatsApp, '_blank');
}

function atenderChamadoGarcom(num) {
  if (appTables[num]) {
    appTables[num].callWaiter = false;
    salvarAlteracoes(true);
    renderizarGridMesas();
    if (mesaSelecionadaComanda === num) renderizarDetalhesComanda(num);
    alert(`Chamado da Mesa ${num} marcado como atendido!`);
  }
}

function darBaixaMesa(num) {
  const tableData = appTables[num];
  const nomeCliente = tableData.customerName || `Mesa ${num}`;

  if (!confirm(`Deseja realmente dar baixa na Mesa ${num} (${nomeCliente})? Isso limpará a comanda e liberará a mesa.`)) {
    return;
  }

  appTables[num] = {
    customerName: '',
    customerPhone: '',
    callWaiter: false,
    requestBill: false,
    paymentMethod: ''
  };

  appOrders = appOrders.filter(o => o.tableNum !== num);

  salvarAlteracoes(true, {
    message: `Mesa ${num} liberada com sucesso!`,
    type: 'info',
    tableNum: num
  });

  fecharModalComanda();
  renderizarGridMesas();
  alert(`Mesa ${num} foi baixada e liberada!`);
}