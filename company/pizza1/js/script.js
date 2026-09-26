import { criarPedido } from '../firebase/pedidos.js';

// CONFIGURAÇÕES DO RESTAURANTE
const CONFIG = {
    telefoneWhatsApp: "5585987608107", 
    horarios: {
        horaAbertura: 17.0,   // 17:00
        horaFechamento: 23.5, // 23:30
        abreSegunda: false
    }
};

let carrinho = [];

window.adicionarProduto = function(nome, preco) {
    const precoNum = Number(preco);
    const itemExistente = carrinho.find(item => item.nome === nome);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({
            nome: nome,
            preco: precoNum,
            quantidade: 1
        });
    }

    window.atualizarCarrinho();
};

window.adicionarPizza = function(nomeBase, precoBase, idSelectBorda) {
    const select = document.getElementById(idSelectBorda);
    if (!select) {
        window.adicionarProduto(nomeBase, precoBase);
        return;
    }

    const opcaoSelecionada = select.options[select.selectedIndex];
    const valorAdicional = parseFloat(select.value) || 0;
    const nomeBorda = opcaoSelecionada.getAttribute('data-nome') || '';

    let nomeFinal = nomeBase;
    if (nomeBorda && nomeBorda.trim() !== '') {
        nomeFinal = `${nomeBase} [${nomeBorda}]`;
    }

    const precoTotal = Number(precoBase) + valorAdicional;
    window.adicionarProduto(nomeFinal, precoTotal);

    select.selectedIndex = 0;
};

window.adicionarComOpcao = function(nomeBase, precoBase, idCheckbox, textoOpcao, precoAdicional = 0) {
    const checkbox = document.getElementById(idCheckbox);
    const estaMarcado = checkbox ? checkbox.checked : false;

    let nomeFinal = nomeBase;
    let precoFinal = Number(precoBase);

    if (estaMarcado) {
        nomeFinal = `${nomeBase} [${textoOpcao}]`;
        precoFinal += Number(precoAdicional);
    }

    window.adicionarProduto(nomeFinal, precoFinal);

    if (checkbox) checkbox.checked = false;
};

window.removerProduto = function(nome) {
    const index = carrinho.findIndex(item => item.nome === nome);

    if (index !== -1) {
        if (carrinho[index].quantidade > 1) {
            carrinho[index].quantidade -= 1;
        } else {
            carrinho.splice(index, 1);
        }
    }

    window.atualizarCarrinho();
};

window.atualizarCarrinho = function() {
    const containerItens = document.getElementById('cart-items');
    const elementoTotal = document.getElementById('total');
    const selectTaxa = document.getElementById('taxa-entrega');
    const containerEndereco = document.getElementById('container-endereco');

    if (!containerItens || !elementoTotal) return;

    const valorTaxa = selectTaxa ? parseFloat(selectTaxa.value) || 0 : 0;
    const opcaoSelecionada = selectTaxa ? selectTaxa.options[selectTaxa.selectedIndex] : null;
    const nomeBairro = opcaoSelecionada ? (opcaoSelecionada.getAttribute('data-nome') || opcaoSelecionada.text) : '';
    const precisaEntrega = valorTaxa > 0 || (nomeBairro !== 'Retirar no local');

    if (containerEndereco) {
        containerEndereco.style.display = precisaEntrega ? 'block' : 'none';
    }

    if (carrinho.length === 0) {
        containerItens.innerHTML = '<p class="cart-empty">Nenhum produto adicionado.</p>';
        elementoTotal.textContent = '0,00';
        return;
    }

    containerItens.innerHTML = '';
    let subtotalProdutos = 0;

    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        subtotalProdutos += subtotal;

        const divItem = document.createElement('div');
        divItem.className = 'cart-item';
        divItem.style.display = 'flex';
        divItem.style.justifyContent = 'space-between';
        divItem.style.alignItems = 'center';
        divItem.style.marginBottom = '8px';

        const nomeEscapado = item.nome.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        divItem.innerHTML = `
            <div>
                <strong>${item.nome}</strong><br>
                <small>${item.quantidade}x R$ ${item.preco.toFixed(2).replace('.', ',')}</small>
            </div>
            <div>
                <button type="button" style="padding: 2px 8px; cursor: pointer;" onclick="window.removerProduto('${nomeEscapado}')">-</button>
                <span style="margin: 0 4px;">${item.quantidade}</span>
                <button type="button" style="padding: 2px 8px; cursor: pointer;" onclick="window.adicionarProduto('${nomeEscapado}', ${item.preco})">+</button>
            </div>
        `;

        containerItens.appendChild(divItem);
    });

    const totalGeral = subtotalProdutos + valorTaxa;
    elementoTotal.textContent = totalGeral.toFixed(2).replace('.', ',');
};

window.fazerPedido = async function() {
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio. Adicione pelo menos um item!');
        return;
    }

    const selectTaxa = document.getElementById('taxa-entrega');
    const opcaoSelecionada = selectTaxa ? selectTaxa.options[selectTaxa.selectedIndex] : null;
    const valorTaxa = selectTaxa ? parseFloat(selectTaxa.value) || 0 : 0;
    const nomeBairro = opcaoSelecionada ? (opcaoSelecionada.getAttribute('data-nome') || opcaoSelecionada.text) : 'Não informado';
    
    const inputRua = document.getElementById('rua-cliente');
    const inputNumero = document.getElementById('numero-cliente');
    const inputReferencia = document.getElementById('referencia-cliente');

    const rua = inputRua ? inputRua.value.trim() : '';
    const numero = inputNumero ? inputNumero.value.trim() : '';
    const referencia = inputReferencia ? inputReferencia.value.trim() : '';

    const precisaEntrega = valorTaxa > 0 || nomeBairro !== 'Retirar no local';

    if (precisaEntrega) {
        if (!rua) {
            alert('Por favor, informe a Rua/Avenida para entrega!');
            if (inputRua) inputRua.focus();
            return;
        }
        if (!numero) {
            alert('Por favor, informe o Número da residência!');
            if (inputNumero) inputNumero.focus();
            return;
        }
    }

    let subtotalProdutos = 0;
    const itensFormatados = carrinho.map(item => {
        const subtotal = item.preco * item.quantidade;
        subtotalProdutos += subtotal;
        return {
            nome: item.nome,
            quantidade: item.quantidade,
            precoUnitario: item.preco,
            subtotal: subtotal
        };
    });

    const totalGeral = subtotalProdutos + valorTaxa;

    let enderecoFormatado = 'Retirada no local';
    if (precisaEntrega) {
        enderecoFormatado = `${rua}, Nº ${numero}`;
        if (referencia) {
            enderecoFormatado += ` (${referencia})`;
        }
    }

    const novoPedido = {
        id: "#" + Math.floor(1000 + Math.random() * 9000),
        dataHora: new Date().toLocaleString('pt-BR'),
        dataCriacao: Date.now(),
        itens: itensFormatados,
        subtotal: subtotalProdutos,
        taxaEntrega: valorTaxa,
        bairro: nomeBairro,
        rua: rua,
        numero: numero,
        referencia: referencia,
        endereco: enderecoFormatado,
        total: totalGeral,
        status: "pendente"
    };

    try {
        await criarPedido(novoPedido);
    } catch (e) {
        console.error("Erro ao enviar pedido para o Firestore:", e);
    }

    let mensagem = `*NOVO PEDIDO ${novoPedido.id} - EXCLIVO DELIVERY*\n\n`;
    mensagem += "*Itens do Pedido:*\n";

    carrinho.forEach(item => {
        mensagem += `• ${item.quantidade}x ${item.nome} - R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}\n`;
    });

    mensagem += `\n*Subtotal:* R$ ${subtotalProdutos.toFixed(2).replace('.', ',')}\n`;
    mensagem += `*Entrega (${nomeBairro}):* R$ ${valorTaxa.toFixed(2).replace('.', ',')}\n`;
    
    if (precisaEntrega) {
        mensagem += `📍 *Rua:* ${rua}\n`;
        mensagem += `🏠 *Número:* ${numero}\n`;
        if (referencia) {
            mensagem += `🚩 *Ref/Comp:* ${referencia}\n`;
        }
    } else {
        mensagem += `📍 *Opção:* Retirada no local\n`;
    }

    mensagem += `*TOTAL FINAL:* R$ ${totalGeral.toFixed(2).replace('.', ',')}`;

    const url = `https://wa.me/${CONFIG.telefoneWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');

    carrinho = [];
    if (inputRua) inputRua.value = '';
    if (inputNumero) inputNumero.value = '';
    if (inputReferencia) inputReferencia.value = '';
    window.atualizarCarrinho();
};

function verificarHorarioFuncionamento() {
    const statusElemento = document.getElementById('status-loja');
    if (!statusElemento) return;

    const agora = new Date();
    const diaSemana = agora.getDay();
    const horaAtual = agora.getHours() + (agora.getMinutes() / 60);

    const { horaAbertura, horaFechamento, abreSegunda } = CONFIG.horarios;

    if (diaSemana === 1 && !abreSegunda) {
        statusElemento.textContent = '● Fechado (Abre terça às 17:00)';
        statusElemento.className = 'status fechado';
        return;
    }

    if (horaAtual >= horaAbertura && horaAtual < horaFechamento) {
        statusElemento.textContent = '● Aberto agora';
        statusElemento.className = 'status aberto';
    } else {
        statusElemento.textContent = '● Fechado no momento';
        statusElemento.className = 'status fechado';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarHorarioFuncionamento();
    setInterval(verificarHorarioFuncionamento, 60000);
});

window.filtrarCategoria = function(categoria, elementoBtn) {
    const botoes = document.querySelectorAll('.category-btn');
    botoes.forEach(btn => btn.classList.remove('active'));
    if (elementoBtn) elementoBtn.classList.add('active');

    const produtos = document.querySelectorAll('.product');
    produtos.forEach(prod => {
        const catProduto = prod.getAttribute('data-categoria');
        if (categoria === 'todas' || catProduto === categoria) {
            prod.style.display = 'flex';
        } else {
            prod.style.display = 'none';
        }
    });
};

function carregarProdutosDoCardapio() {
    const salvo = localStorage.getItem('exclivo_cardapio');
    if (!salvo) return;

    const cardapio = JSON.parse(salvo);
    const containerProdutos = document.querySelector('.products');
    if (!containerProdutos) return;

    containerProdutos.innerHTML = '';

    cardapio.forEach(p => {
        if (p.status === 'inativo') return;

        const div = document.createElement('div');
        div.className = 'product';
        div.setAttribute('data-categoria', p.categoria);

        let opcaoHTML = '';
        if (p.tipoOpcao === 'borda') {
            opcaoHTML = `
                <div class="product-option">
                    <label for="borda-${p.id}"><strong>Borda:</strong></label>
                    <select id="borda-${p.id}">
                        <option value="0" data-nome="">Sem Borda Recheada</option>
                        <option value="8" data-nome="Borda Catupiry">Borda Catupiry (+ R$ 8,00)</option>
                        <option value="8" data-nome="Borda Cheddar">Borda Cheddar (+ R$ 8,00)</option>
                        <option value="10" data-nome="Borda Chocolate">Borda Chocolate (+ R$ 10,00)</option>
                    </select>
                </div>
                <div class="price">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</div>
                <button type="button" onclick="window.adicionarPizza('${p.nome}', ${p.preco}, 'borda-${p.id}')">Adicionar</button>
            `;
        } else if (p.tipoOpcao === 'copos') {
            opcaoHTML = `
                <div class="product-option">
                    <label><input type="checkbox" id="copos-${p.id}"> Enviar copos descartáveis</label>
                </div>
                <div class="price">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</div>
                <button type="button" onclick="window.adicionarComOpcao('${p.nome}', ${p.preco}, 'copos-${p.id}', 'Com copos descartáveis', 0)">Adicionar</button>
            `;
        } else {
            opcaoHTML = `
                <div class="price" style="margin-top: 15px;">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</div>
                <button type="button" onclick="window.adicionarProduto('${p.nome}', ${p.preco})">Adicionar</button>
            `;
        }

        div.innerHTML = `
            <h3>${p.nome}</h3>
            <p>${p.descricao || ''}</p>
            ${opcaoHTML}
        `;

        containerProdutos.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutosDoCardapio();
});

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
};