/* ==========================================================================
   0. TRAVA DE SEGURANÇA E APLICAÇÃO DE CONFIGURAÇÕES DO DEV
   ========================================================================== */

function verificarAutenticacaoAdmin() {
  try {
    const sessaoJSON = localStorage.getItem('gs_equipe_sessao');

    if (!sessaoJSON) {
      console.warn("Sessão da equipa não encontrada. A redirecionar...");
      window.location.href = 'painel/login.html';
      return false;
    }

    const util = JSON.parse(sessaoJSON);

    if (util.cargo !== 'admin' && util.cargo !== 'gerente' && util.perfil !== 'admin' && util.perfil !== 'gerente') {
      console.warn("Utilizador sem permissão de administrador.");
      window.location.href = 'painel/login.html';
      return false;
    }

    return true;
  } catch (e) {
    console.error("Erro ao validar sessão:", e);
    localStorage.removeItem('gs_equipe_sessao');
    window.location.href = 'painel/login.html';
    return false;
  }
}

if (!verificarAutenticacaoAdmin()) {
  throw new Error("Acesso não autorizado ao painel administrativo.");
}

/* ==========================================================================
   1. INICIALIZAÇÃO & CANAL EM TEMPO REAL
   ========================================================================== */

const syncChannel = new BroadcastChannel('Restaurante_realtime_channel');

let appOrders = [];
let appMenu = [];
let appTables = {};
let base64ImageTemp = '';

document.addEventListener('DOMContentLoaded', () => {
  try {
    const sessaoJSON = localStorage.getItem('gs_equipe_sessao');
    if (sessaoJSON) {
      const util = JSON.parse(sessaoJSON);
      const elAdminNome = document.getElementById('admin-user-name');
      if (elAdminNome) elAdminNome.textContent = util.nome || 'Administrador';
    }

    carregarConfiguracoesVisuaisDEV();
    carregarDadosAdmin();
    configurarEventosAdmin();

    syncChannel.onmessage = (e) => {
      if (e.data && e.data.type === 'STATE_UPDATE') {
        carregarConfiguracoesVisuaisDEV();
        carregarDadosAdmin();
      }
    };

    window.addEventListener('storage', (e) => {
      if (['gs_orders', 'gs_menu', 'gs_tables', 'gs_config_dev', 'gs_config_loja'].includes(e.key)) {
        carregarConfiguracoesVisuaisDEV();
        carregarDadosAdmin();
      }
    });
  } catch (errInit) {
    console.error("Erro no carregamento do DOM do Admin:", errInit);
  }
});

function carregarConfiguracoesVisuaisDEV() {
  const savedDev = localStorage.getItem('gs_config_dev') || localStorage.getItem('gs_config_loja');
  if (savedDev) {
    try {
      const cfg = JSON.parse(savedDev);
      const elHeaderLoja = document.getElementById('header-nome-loja') || document.getElementById('admin-header-nome');
      if (elHeaderLoja && cfg.nomeLoja) {
        elHeaderLoja.textContent = cfg.nomeLoja;
      }
    } catch (e) {
      console.error("Erro ao carregar configs visuais:", e);
    }
  }
}

function carregarDadosAdmin() {
  try {
    const savedOrders = localStorage.getItem('gs_orders');
    const savedMenu = localStorage.getItem('gs_menu');
    const savedTables = localStorage.getItem('gs_tables');

    appOrders = savedOrders ? JSON.parse(savedOrders) : [];
    appMenu = savedMenu ? JSON.parse(savedMenu) : [];
    appTables = savedTables ? JSON.parse(savedTables) : {};

    renderizarDashboardGeral();
    renderizarCardapioAdmin();
    renderizarPastaClientesAdmin();
  } catch (e) {
    console.error("Erro ao carregar dados do admin:", e);
  }
}

function salvarDadosAdmin(notificar = true) {
  localStorage.setItem('gs_orders', JSON.stringify(appOrders));
  localStorage.setItem('gs_menu', JSON.stringify(appMenu));
  localStorage.setItem('gs_tables', JSON.stringify(appTables));

  if (notificar) {
    syncChannel.postMessage({ type: 'STATE_UPDATE' });
  }
}

function configurarEventosAdmin() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('gs_equipe_sessao');
      window.location.href = 'painel/login.html';
    });
  }
}

/* ==========================================================================
   2. DASHBOARD DE INTELIGÊNCIA FINANCEIRA E BI
   ========================================================================== */

function renderizarDashboardGeral() {
  let faturamentoTotal = 0;
  let totalPedidosValidos = 0;
  const contadorPratos = {};

  appOrders.forEach(pedido => {
    let subtotalPedido = 0;
    pedido.items.forEach(i => {
      const statusItem = i.status || pedido.status;
      if (statusItem !== 'Cancelado') {
        const valorItem = i.item.price * i.quantity;
        subtotalPedido += valorItem;

        contadorPratos[i.item.name] = (contadorPratos[i.item.name] || 0) + i.quantity;
      }
    });

    if (subtotalPedido > 0) {
      faturamentoTotal += subtotalPedido;
      totalPedidosValidos += 1;
    }
  });

  const ticketMedio = totalPedidosValidos > 0 ? (faturamentoTotal / totalPedidosValidos) : 0;

  let pratoMaisVendido = 'Sem vendas registadas';
  let maxVendas = 0;
  Object.entries(contadorPratos).forEach(([prato, qtd]) => {
    if (qtd > maxVendas) {
      maxVendas = qtd;
      pratoMaisVendido = `${prato} (${qtd}x)`;
    }
  });

  const elFaturamento = document.getElementById('dash-admin-faturamento');
  const elTotalPedidos = document.getElementById('dash-admin-pedidos');
  const elTicketMedio = document.getElementById('dash-admin-ticket-medio');
  const elPratoTop = document.getElementById('dash-admin-prato-top');

  if (elFaturamento) elFaturamento.textContent = `R$ ${faturamentoTotal.toFixed(2).replace('.', ',')}`;
  if (elTotalPedidos) elTotalPedidos.textContent = totalPedidosValidos;
  if (elTicketMedio) elTicketMedio.textContent = `R$ ${ticketMedio.toFixed(2).replace('.', ',')}`;
  if (elPratoTop) elPratoTop.textContent = pratoMaisVendido;
}

/* ==========================================================================
   3. GESTÃO DE CARDÁPIO & EFEITO ACORDEÃO
   ========================================================================== */

function toggleSecaoCardapio() {
  const conteudo = document.getElementById('conteudo-cardapio-colapsavel');
  const icone = document.getElementById('icone-toggle-cardapio');
  
  if (conteudo && icone) {
    conteudo.classList.toggle('hidden');
    icone.classList.toggle('rotate-180');
  }
}

function renderizarCardapioAdmin() {
  const container = document.getElementById('container-cardapio-admin');
  if (!container) return;

  container.innerHTML = '';

  if (!appMenu || appMenu.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center text-slate-500 py-8 text-xs italic">Nenhum prato registado no cardápio.</div>`;
    return;
  }

  const contagemVendas = {};
  appOrders.forEach(pedido => {
    pedido.items.forEach(i => {
      const statusItem = i.status || pedido.status;
      if (statusItem !== 'Cancelado') {
        contagemVendas[i.item.name] = (contagemVendas[i.item.name] || 0) + i.quantity;
      }
    });
  });

  const maxVendas = Math.max(...Object.values(contagemVendas), 0);

  appMenu.forEach(item => {
    const esgotado = !!item.esgotado;
    const totalVendido = contagemVendas[item.name] || 0;
    const eCampeaoVendas = totalVendido > 0 && totalVendido === maxVendas;

    const card = document.createElement('div');
    card.className = `cardapio-item-card relative bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between space-y-3 shadow-lg ${esgotado ? 'opacity-60' : ''}`;
    
    card.innerHTML = `
      <div class="space-y-3">
        <div class="w-full h-36 rounded-xl overflow-hidden bg-slate-900 relative">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/300x200/1e293b/fff?text=Sem+Foto'">
          
          <span class="absolute top-2 left-2 bg-slate-950/90 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-800 shadow">
            ${item.category}
          </span>

          ${eCampeaoVendas ? `
            <span class="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 animate-pulse">
              <i class="fa-solid fa-trophy text-slate-950"></i> #1 MAIS VENDIDO
            </span>
          ` : totalVendido > 0 ? `
            <span class="absolute top-2 right-2 bg-slate-900/90 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow flex items-center gap-1">
              <i class="fa-solid fa-fire text-amber-500"></i> ${totalVendido} vend.
            </span>
          ` : ''}

          ${esgotado ? `<span class="absolute bottom-2 right-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase shadow">Esgotado</span>` : ''}
        </div>

        <div>
          <h4 class="font-bold text-white text-sm line-clamp-1" title="${item.name}">${item.name}</h4>
          <p class="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed" title="${item.desc || ''}">${item.desc || 'Sem descrição registada.'}</p>
        </div>
      </div>

      <div class="space-y-2.5 pt-3 mt-3 border-t border-slate-900">
        <div class="flex items-center justify-between gap-2">
          <div>
            <span class="text-base font-black text-emerald-400">R$ ${parseFloat(item.price).toFixed(2).replace('.', ',')}</span>
            ${totalVendido > 0 ? `<p class="text-[9px] text-slate-500 font-semibold">${totalVendido} unidade(s) vendida(s)</p>` : ''}
          </div>
          <button onclick="alternarEsgotadoPrato(${item.id})" class="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${esgotado ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'}">
            ${esgotado ? 'Reativar' : 'Pausar'}
          </button>
        </div>

        <div class="flex gap-2">
          <button onclick="editarPrato(${item.id})" class="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold py-2 rounded-xl text-xs border border-slate-800 transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-pen-to-square text-brand-400"></i> Editar
          </button>
          <button onclick="excluirPrato(${item.id})" class="bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-bold px-3 py-2 rounded-xl text-xs border border-rose-500/20 transition flex items-center justify-center" title="Eliminar Prato">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function converterImagemBase64(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      base64ImageTemp = e.target.result;
      const elPreview = document.getElementById('prato-preview');
      const elContainer = document.getElementById('preview-container');
      if (elPreview) elPreview.src = base64ImageTemp;
      if (elContainer) elContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function abrirModalPrato() {
  const form = document.getElementById('form-prato');
  if (form) form.reset();
  const inputId = document.getElementById('prato-id');
  if (inputId) inputId.value = '';
  const titulo = document.getElementById('modal-prato-titulo');
  if (titulo) titulo.innerHTML = `<i class="fa-solid fa-plus text-brand-400"></i> Cadastrar Prato`;
  const previewContainer = document.getElementById('preview-container');
  if (previewContainer) previewContainer.classList.add('hidden');
  base64ImageTemp = '';
  const modal = document.getElementById('modal-prato');
  if (modal) modal.classList.remove('hidden');
}

function fecharModalPrato() {
  const modal = document.getElementById('modal-prato');
  if (modal) modal.classList.add('hidden');
}

function editarPrato(id) {
  const item = appMenu.find(p => p.id === id);
  if (!item) return;

  document.getElementById('prato-id').value = item.id;
  document.getElementById('prato-nome').value = item.name;
  document.getElementById('prato-categoria').value = item.category;
  document.getElementById('prato-preco').value = item.price;
  document.getElementById('prato-desc').value = item.desc || '';
  document.getElementById('prato-image').value = item.image.startsWith('data:') ? '' : item.image;

  base64ImageTemp = item.image;
  const elPreview = document.getElementById('prato-preview');
  if (elPreview) elPreview.src = item.image;
  const elContainer = document.getElementById('preview-container');
  if (elContainer) elContainer.classList.remove('hidden');

  const titulo = document.getElementById('modal-prato-titulo');
  if (titulo) titulo.innerHTML = `<i class="fa-solid fa-pen-to-square text-brand-400"></i> Editar Prato`;
  const modal = document.getElementById('modal-prato');
  if (modal) modal.classList.remove('hidden');
}

function salvarPrato(e) {
  e.preventDefault();

  const id = document.getElementById('prato-id').value;
  const nome = document.getElementById('prato-nome').value.trim();
  const categoria = document.getElementById('prato-categoria').value;
  const preco = parseFloat(document.getElementById('prato-preco').value);
  const desc = document.getElementById('prato-desc').value.trim();
  const urlImage = document.getElementById('prato-image').value.trim();

  const imagemFinal = base64ImageTemp || urlImage || 'https://placehold.co/300x200/1e293b/fff?text=Prato';

  if (id) {
    const index = appMenu.findIndex(p => p.id == id);
    if (index !== -1) {
      appMenu[index] = { ...appMenu[index], name: nome, category: categoria, price: preco, desc, image: imagemFinal };
    }
  } else {
    appMenu.push({
      id: Date.now(),
      name: nome,
      category: categoria,
      price: preco,
      desc: desc,
      image: imagemFinal,
      esgotado: false
    });
  }

  salvarDadosAdmin(true);
  fecharModalPrato();
  renderizarCardapioAdmin();
}

function alternarEsgotadoPrato(id) {
  const item = appMenu.find(p => p.id === id);
  if (item) {
    item.esgotado = !item.esgotado;
    salvarDadosAdmin(true);
    renderizarCardapioAdmin();
  }
}

function excluirPrato(id) {
  if (confirm("Tem a certeza de que deseja eliminar este prato do cardápio?")) {
    appMenu = appMenu.filter(p => p.id !== id);
    salvarDadosAdmin(true);
    renderizarCardapioAdmin();
  }
}

/* ==========================================================================
   4. PASTA DE CLIENTES (CRM)
   ========================================================================== */

function obterPastaClientes() {
  const clientesMap = {};

  appOrders.forEach(pedido => {
    const chave = pedido.customerPhone ? pedido.customerPhone.replace(/\D/g, '') : pedido.customerName;
    if (!chave) return;

    let dataFormatada = pedido.timestamp;
    let dataObjeto = pedido.id ? new Date(pedido.id) : new Date();

    if (!dataFormatada || !dataFormatada.includes('/')) {
      dataFormatada = dataObjeto.toLocaleDateString('pt-BR') + ' às ' + dataObjeto.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (!clientesMap[chave]) {
      clientesMap[chave] = {
        nome: pedido.customerName || 'Cliente Sem Nome',
        telefone: pedido.customerPhone || 'Sem Telemóvel',
        visitas: 0,
        totalGasto: 0,
        ultimaVisitaTexto: dataFormatada,
        historicoComandas: [],
        pratosConsumidos: {}
      };
    }

    clientesMap[chave].visitas += 1;
    clientesMap[chave].ultimaVisitaTexto = dataFormatada;

    let subtotalComanda = 0;
    const itensComandaValidos = [];

    pedido.items.forEach(i => {
      const statusItem = i.status || pedido.status;
      if (statusItem !== 'Cancelado') {
        const subtotal = i.item.price * i.quantity;
        subtotalComanda += subtotal;
        clientesMap[chave].totalGasto += subtotal;

        const nomePrato = i.item.name;
        clientesMap[chave].pratosConsumidos[nomePrato] = (clientesMap[chave].pratosConsumidos[nomePrato] || 0) + i.quantity;

        itensComandaValidos.push({
          qtd: i.quantity,
          nome: i.item.name,
          preco: subtotal
        });
      }
    });

    clientesMap[chave].historicoComandas.push({
      id: pedido.id,
      mesa: pedido.tableNum,
      dataHora: dataFormatada,
      total: subtotalComanda,
      itens: itensComandaValidos
    });
  });

  return Object.values(clientesMap);
}

function renderizarPastaClientesAdmin() {
  const clientes = obterPastaClientes();
  const container = document.getElementById('container-pasta-clientes-admin');
  if (!container) return;

  container.innerHTML = '';

  if (clientes.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center text-slate-500 py-10 text-xs italic">
        Nenhum histórico de cliente registado até ao momento.
      </div>
    `;
    return;
  }

  clientes.forEach(c => {
    const pratosFavoritosHTML = Object.entries(c.pratosConsumidos)
      .map(([prato, qtd]) => `<span class="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-medium">${qtd}x ${prato}</span>`)
      .join(' ');

    const comandasHTML = c.historicoComandas.map(com => `
      <div class="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 text-xs space-y-1.5">
        <div class="flex justify-between items-center border-b border-slate-800 pb-1">
          <span class="font-bold text-amber-400">Mesa ${com.mesa < 10 ? '0' + com.mesa : com.mesa}</span>
          <span class="text-[10px] text-slate-400 font-medium"><i class="fa-regular fa-calendar-days mr-1"></i>${com.dataHora}</span>
        </div>
        <div class="space-y-0.5 pt-0.5">
          ${com.itens.map(item => `
            <div class="flex justify-between text-[11px] text-slate-300">
              <span><strong class="text-brand-400 font-bold">${item.qtd}x</strong>${item.nome}</span>
              <span class="text-slate-400">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
            </div>
          `).join('')}
        </div>
        <div class="text-right pt-1 border-t border-slate-800/50">
          <span class="text-[10px] text-slate-400">Subtotal: </span>
          <span class="font-extrabold text-emerald-400 text-xs">R$ ${com.total.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>
    `).join('');

    let badgeClassificacao = '';
    if (c.visitas >= 3) {
      badgeClassificacao = `<span class="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1"><i class="fa-solid fa-crown text-[8px]"></i> VIP</span>`;
    }

    const card = document.createElement('div');
    card.className = 'bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg flex flex-col justify-between';
    card.innerHTML = `
      <div class="space-y-3">
        <div class="flex justify-between items-start border-b border-slate-900 pb-2">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-white text-sm">${c.nome}</h4>
              ${badgeClassificacao}
            </div>
            <p class="text-xs text-emerald-400 font-medium mt-0.5">
              <i class="fa-brands fa-whatsapp mr-1"></i>${c.telefone}
            </p>
          </div>
          <span class="bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-black px-2.5 py-1 rounded-xl">
            ${c.visitas} Visita(s)
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
          <div>
            <span class="text-[10px] text-slate-500 font-semibold block uppercase">Última Visita</span>
            <span class="font-bold text-slate-200 text-[11px]">${c.ultimaVisitaTexto}</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-slate-500 font-semibold block uppercase">Total Consumido</span>
            <span class="font-black text-emerald-400 text-sm">R$ ${c.totalGasto.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div>
          <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">Pratos Favoritos:</p>
          <div class="flex flex-wrap gap-1">
            ${pratosFavoritosHTML || '<span class="text-[10px] text-slate-600 italic">Sem consumo</span>'}
          </div>
        </div>

        <button onclick="enviarMensagemFidelizacao('${c.nome}', '${c.telefone}')" class="w-full bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-2">
          <i class="fa-brands fa-whatsapp"></i>
          <span>Enviar Convite / Cupom VIP</span>
        </button>

        <details class="group pt-2 border-t border-slate-900">
          <summary class="cursor-pointer text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center justify-between list-none">
            <span><i class="fa-solid fa-clock-rotate-left mr-1"></i> Ver Histórico de Comandas</span>
            <i class="fa-solid fa-chevron-down text-[10px] transition-transform group-open:rotate-180"></i>
          </summary>
          <div class="space-y-2 mt-3 max-h-60 overflow-y-auto pr-1">
            ${comandasHTML}
          </div>
        </details>
      </div>
    `;

    container.appendChild(card);
  });
}

function enviarMensagemFidelizacao(nome, telefone) {
  let phone = telefone.replace(/\D/g, '');
  if (!phone.startsWith('55') && (phone.length === 10 || phone.length === 11)) {
    phone = '55' + phone;
  }

  let mensagem = `Olá, *${nome}*! 🍽️\n\n`;
  mensagem += `Estávamos com saudades de si aqui no restaurante!\n`;
  mensagem += `Preparamos um presente especial para a sua próxima visita: *10% OFF* em qualquer prato do nosso cardápio.\n\n`;
  mensagem += `Venha visitar-nos esta semana! Aguardamos por si! ❤️`;

  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}

/* ==========================================================================
   5. EXPORTAÇÃO COMPLETA PARA EXCEL / CSV
   ========================================================================== */

function exportarPastaClientesCSV() {
  const clientes = obterPastaClientes();

  if (clientes.length === 0) {
    alert("Não há histórico de clientes registados para exportar!");
    return;
  }

  let csv = "\uFEFFNome do Cliente;WhatsApp / Telemóvel;Total de Visitas;Última Visita;Total Gasto (R$);Itens Consumidos\n";

  clientes.forEach(c => {
    const pratosStr = Object.entries(c.pratosConsumidos)
      .map(([p, q]) => `${q}x ${p}`)
      .join(' | ');

    csv += `"${c.nome}";"${c.telefone}";${c.visitas};"${c.ultimaVisitaTexto}";"R$ ${c.totalGasto.toFixed(2).replace('.', ',')}";"${pratosStr}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Pasta_de_Clientes_Restaurante_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
}