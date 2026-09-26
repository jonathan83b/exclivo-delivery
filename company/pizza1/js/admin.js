// VERIFICAÇÃO DE SEGURANÇA: Redireciona se não estiver autenticado
if (sessionStorage.getItem('exclivo_autenticado') !== 'true') {
    window.location.href = 'login.html';
}

const TELEFONE_RESTAURANTE = "5585987608107";
let somPermitido = false;
let qtdPendentesAnterior = null;

// Alterna a permissão de áudio do navegador
window.toggleSom = function() {
    somPermitido = !somPermitido;
    const btn = document.getElementById('btn-som');
    if (btn) {
        if (somPermitido) {
            btn.style.background = '#10b981';
            btn.textContent = '🔔 Som Ativado';
            tocarCampainha();
        } else {
            btn.style.background = '#f59e0b';
            btn.textContent = '🔕 Som Desativado';
        }
    }
};

function tocarCampainha() {
    if (!somPermitido) return;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
        gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.2);
        osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
        console.error("Erro ao tocar áudio:", e);
    }
}

window.fazerLogout = function() {
    sessionStorage.removeItem('exclivo_autenticado');
    window.location.href = 'login.html';
};

window.confirmarPedido = function(index) {
    const pedidos = JSON.parse(localStorage.getItem('exclivo_pedidos') || '[]');
    if (pedidos[index]) {
        pedidos[index].status = 'preparo';
        localStorage.setItem('exclivo_pedidos', JSON.stringify(pedidos));
        carregarPedidos();
    }
};

window.recusarPedido = function(index) {
    const motivo = prompt("Motivo do cancelamento/recusa do pedido (opcional):");
    if (motivo !== null) {
        const pedidos = JSON.parse(localStorage.getItem('exclivo_pedidos') || '[]');
        if (pedidos[index]) {
            pedidos[index].status = 'cancelado';
            pedidos[index].motivoCancelamento = motivo || 'Indisponível no momento';
            localStorage.setItem('exclivo_pedidos', JSON.stringify(pedidos));
            carregarPedidos();
        }
    }
};

window.enviarNotificacaoWhatsApp = function(index) {
    const pedidos = JSON.parse(localStorage.getItem('exclivo_pedidos') || '[]');
    const pedido = pedidos[index];
    if (!pedido) return;

    let mensagem = `*ATUALIZAÇÃO DO PEDIDO ${pedido.id} - EXCLIVO DELIVERY*\n\n`;

    if (pedido.status === 'preparo') {
        mensagem += `✅ *Seu pedido foi CONFIRMADO e já está em preparo!*\n\n`;
        mensagem += `• Tempo estimado de entrega: 40 a 60 min.\n`;
        mensagem += `• Bairro: ${pedido.bairro}\n`;
        if (pedido.rua) {
            mensagem += `• Endereço: ${pedido.rua}, Nº ${pedido.numero}\n`;
        }
        mensagem += `• Total: R$ ${pedido.total.toFixed(2).replace('.', ',')}\n\n`;
        mensagem += `Muito obrigado pela preferência! 🍕`;
    } else if (pedido.status === 'entrega') {
        mensagem += `🛵 *Seu pedido SAIU PARA ENTREGA!*\n\nO entregador já está a caminho do seu endereço no bairro *${pedido.bairro}*.`;
    } else if (pedido.status === 'concluido') {
        mensagem += `🎉 *Pedido CONCLUÍDO!*\n\nEsperamos que aproveite sua refeição! Bom apetite! 🍕`;
    } else if (pedido.status === 'cancelado') {
        mensagem += `❌ *Seu pedido foi CANCELADO.*\n\nMotivo: ${pedido.motivoCancelamento || 'Não especificado'}. Pedimos desculpas pelo inconveniente.`;
    } else {
        mensagem += `Recebemos seu pedido ${pedido.id} e estamos analisando!`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
};

window.alterarStatus = function(index, novoStatus) {
    const pedidos = JSON.parse(localStorage.getItem('exclivo_pedidos') || '[]');
    if (pedidos[index]) {
        pedidos[index].status = novoStatus;
        localStorage.setItem('exclivo_pedidos', JSON.stringify(pedidos));
        carregarPedidos();
    }
};

window.limparHistorico = function() {
    if (confirm('Tem certeza que deseja apagar todo o histórico de pedidos?')) {
        localStorage.removeItem('exclivo_pedidos');
        qtdPendentesAnterior = 0;
        carregarPedidos();
    }
};

function carregarPedidos() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    const pedidos = JSON.parse(localStorage.getItem('exclivo_pedidos') || '[]');

    const pendentesAtuais = pedidos.filter(p => p.status === 'pendente').length;
    
    if (qtdPendentesAnterior !== null && pendentesAtuais > qtdPendentesAnterior) {
        tocarCampainha();
    }
    qtdPendentesAnterior = pendentesAtuais;

    atualizarEstatisticas(pedidos);

    if (pedidos.length === 0) {
        container.innerHTML = '<p class="no-orders">Nenhum pedido recebido ainda.</p>';
        return;
    }

    container.innerHTML = '';

    pedidos.forEach((pedido, index) => {
        const card = document.createElement('div');
        const statusAtual = pedido.status || 'pendente';
        card.className = `order-card ${statusAtual}`;

        let listaItensHTML = '';
        if (pedido.itens && Array.isArray(pedido.itens)) {
            pedido.itens.forEach(item => {
                const subtotal = item.subtotal || (item.precoUnitario * item.quantidade) || 0;
                let nomeExibicao = item.nome;
                
                if (nomeExibicao.includes('[') || nomeExibicao.includes('(')) {
                    nomeExibicao = nomeExibicao
                        .replace('[', '<span style="color: #d97706; font-weight: bold;">[')
                        .replace(']', ']</span>')
                        .replace('(', '<span style="color: #d97706; font-weight: bold;">(')
                        .replace(')', ')</span>');
                }

                listaItensHTML += `
                    <li style="margin-bottom: 4px;">
                        <strong>• ${item.quantidade}x</strong> ${nomeExibicao} 
                        <span style="color: #22c55e; font-weight: bold; margin-left: 6px;">(R$ ${subtotal.toFixed(2).replace('.', ',')})</span>
                    </li>`;
            });
        }

        const totalExibicao = (pedido.total || 0).toFixed(2).replace('.', ',');

        let acoesConfirmacaoHTML = '';
        if (statusAtual === 'pendente') {
            acoesConfirmacaoHTML = `
                <div class="confirm-box">
                    <span class="badge-pendente">⚠️ NOVO PEDIDO - CONFIRMAÇÃO PENDENTE</span>
                    <div class="confirm-buttons">
                        <button type="button" class="btn-confirm" onclick="window.confirmarPedido(${index})">✅ Confirmar Pedido</button>
                        <button type="button" class="btn-reject" onclick="window.recusarPedido(${index})">❌ Recusar</button>
                    </div>
                </div>
            `;
        } else {
            acoesConfirmacaoHTML = `
                <button type="button" class="btn-notify-wa" onclick="window.enviarNotificacaoWhatsApp(${index})">
                    💬 Notificar Cliente via Whats
                </button>
            `;
        }

        card.innerHTML = `
            <div class="order-header">
                <div>
                    <span class="order-id">${pedido.id || '#0000'}</span>
                    <span class="order-time">• ${pedido.dataHora || ''}</span>
                </div>
                <small>
                    <strong>Bairro:</strong> ${pedido.bairro || 'Não informado'}<br>
                    ${pedido.rua ? `<strong>Rua:</strong> ${pedido.rua}, Nº ${pedido.numero}<br>` : ''}
                    ${pedido.referencia ? `<strong>Ref:</strong> ${pedido.referencia}<br>` : ''}
                    ${!pedido.rua ? `<strong>Endereço:</strong> ${pedido.endereco || 'Retirada no local'}` : ''}
                </small>
            </div>

            ${acoesConfirmacaoHTML}

            <div class="order-body">
                <strong>Itens do Pedido:</strong>
                <ul style="margin-top: 6px; padding-left: 10px;">${listaItensHTML}</ul>
            </div>

            <div class="order-footer">
                <div class="order-total">
                    Total: R$ ${totalExibicao}
                </div>
                <div>
                    <select class="order-status-select" onchange="window.alterarStatus(${index}, this.value)">
                        <option value="pendente" ${statusAtual === 'pendente' ? 'selected' : ''}>🟡 Pendente</option>
                        <option value="preparo" ${statusAtual === 'preparo' ? 'selected' : ''}>🔵 Em Preparo (Confirmado)</option>
                        <option value="entrega" ${statusAtual === 'entrega' ? 'selected' : ''}>🟣 Saiu para Entrega</option>
                        <option value="concluido" ${statusAtual === 'concluido' ? 'selected' : ''}>🟢 Concluído</option>
                        <option value="cancelado" ${statusAtual === 'cancelado' ? 'selected' : ''}>🔴 Cancelado</option>
                    </select>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function atualizarEstatisticas(pedidos) {
    const totalPedidos = pedidos.length;
    const pendentes = pedidos.filter(p => p.status === 'pendente').length;
    const preparo = pedidos.filter(p => p.status === 'preparo').length;
    
    const faturamento = pedidos
        .filter(p => p.status !== 'cancelado' && p.status !== 'pendente')
        .reduce((acc, p) => acc + (p.total || 0), 0);

    const elTotal = document.getElementById('stat-total-pedidos');
    const elPendentes = document.getElementById('stat-pendentes');
    const elPreparo = document.getElementById('stat-preparo');
    const elFaturamento = document.getElementById('stat-faturamento');

    if (elTotal) elTotal.textContent = totalPedidos;
    if (elPendentes) elPendentes.textContent = pendentes;
    if (elPreparo) elPreparo.textContent = preparo;
    if (elFaturamento) elFaturamento.textContent = `R$ ${faturamento.toFixed(2).replace('.', ',')}`;
}

// ESCUTA EVENTO DE STORAGE EM TEMPO REAL
window.addEventListener('storage', (e) => {
    if (e.key === 'exclivo_pedidos') {
        carregarPedidos();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    carregarPedidos();
    setInterval(carregarPedidos, 2000);
});