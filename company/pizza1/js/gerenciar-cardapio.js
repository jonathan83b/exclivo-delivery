// VERIFICAÇÃO DE SEGURANÇA
if (sessionStorage.getItem('exclivo_autenticado') !== 'true') {
    window.location.href = 'login.html';
}

window.fazerLogout = function() {
    sessionStorage.removeItem('exclivo_autenticado');
    window.location.href = 'login.html';
};

// ESTRUTURA INICIAL PADRÃO (Caso o localStorage esteja vazio)
const CARDAPIO_PADRAO = [
    { id: "1", nome: "Pizza Calabresa", categoria: "pizzas", preco: 35.00, tipoOpcao: "borda", descricao: "Molho de tomate, queijo e calabresa.", status: "ativo" },
    { id: "2", nome: "Pizza Frango", categoria: "pizzas", preco: 38.00, tipoOpcao: "borda", descricao: "Molho de tomate, queijo e frango.", status: "ativo" },
    { id: "3", nome: "Pizza Portuguesa", categoria: "pizzas", preco: 40.00, tipoOpcao: "borda", descricao: "Queijo, presunto, ovo, cebola e tomate.", status: "ativo" },
    { id: "4", nome: "Coca-Cola 2L", categoria: "bebidas", preco: 12.00, tipoOpcao: "copos", descricao: "Refrigerante Coca-Cola 2 litros.", status: "ativo" }
];

function obterCardapio() {
    const salvo = localStorage.getItem('exclivo_cardapio');
    if (!salvo) {
        localStorage.setItem('exclivo_cardapio', JSON.stringify(CARDAPIO_PADRAO));
        return CARDAPIO_PADRAO;
    }
    return JSON.parse(salvo);
}

function salvarCardapio(cardapio) {
    localStorage.setItem('exclivo_cardapio', JSON.stringify(cardapio));
    renderizarTabela();
}

function renderizarTabela() {
    const tbody = document.getElementById('lista-produtos-gerenciador');
    if (!tbody) return;

    const cardapio = obterCardapio();
    tbody.innerHTML = '';

    if (cardapio.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum produto cadastrado.</td></tr>';
        return;
    }

    cardapio.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        const catNome = item.categoria === 'pizzas' ? '🍕 Pizzas' : item.categoria === 'bebidas' ? '🥤 Bebidas' : item.categoria === 'sobremesas' ? '🍰 Sobremesas' : item.categoria === 'hamburgueres' ? '🍔 Hambúrgueres' : '';
        const statusHTML = item.status === 'ativo' 
            ? '<span class="badge-status-ativo">● Ativo</span>' 
            : '<span class="badge-status-inativo">○ Inativo</span>';

        tr.innerHTML = `
            <td>
                <button type="button" class="btn-action btn-move" onclick="window.moverItem(${index}, -1)">▲</button>
                <button type="button" class="btn-action btn-move" onclick="window.moverItem(${index}, 1)">▼</button>
            </td>
            <td><strong>${item.nome}</strong><br><small style="color:#64748b;">${item.descricao || ''}</small></td>
            <td><span class="badge-cat">${catNome}</span></td>
            <td>R$ ${Number(item.preco).toFixed(2).replace('.', ',')}</td>
            <td>${statusHTML}</td>
            <td>
                <button type="button" class="btn-action btn-edit" onclick="window.editarItem('${item.id}')">✏️ Editar</button>
                <button type="button" class="btn-action btn-toggle" onclick="window.alternarStatus('${item.id}')">👁️ Visibilidade</button>
                <button type="button" class="btn-action btn-delete" onclick="window.excluirItem('${item.id}')">🗑️ Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

window.salvarProduto = function(event) {
    event.preventDefault();

    const id = document.getElementById('prod-id').value;
    const nome = document.getElementById('prod-nome').value.trim();
    const categoria = document.getElementById('prod-categoria').value;
    const preco = parseFloat(document.getElementById('prod-preco').value) || 0;
    const tipoOpcao = document.getElementById('prod-opcao').value;
    const descricao = document.getElementById('prod-descricao').value.trim();

    let cardapio = obterCardapio();

    if (id) {
        const index = cardapio.findIndex(p => p.id === id);
        if (index !== -1) {
            cardapio[index] = { ...cardapio[index], nome, categoria, preco, tipoOpcao, descricao };
        }
    } else {
        const novoItem = {
            id: Date.now().toString(),
            nome,
            categoria,
            preco,
            tipoOpcao,
            descricao,
            status: "ativo"
        };
        cardapio.push(novoItem);
    }

    salvarCardapio(cardapio);
    window.cancelarEdicao();
};

window.editarItem = function(id) {
    const cardapio = obterCardapio();
    const item = cardapio.find(p => p.id === id);
    if (!item) return;

    document.getElementById('prod-id').value = item.id;
    document.getElementById('prod-nome').value = item.nome;
    document.getElementById('prod-categoria').value = item.categoria;
    document.getElementById('prod-preco').value = item.preco;
    document.getElementById('prod-opcao').value = item.tipoOpcao || 'nenhuma';
    document.getElementById('prod-descricao').value = item.descricao || '';

    document.getElementById('form-titulo').textContent = '✏️ Editar Produto';
    document.getElementById('btn-submit').textContent = 'Atualizar Produto';
    document.getElementById('btn-cancel').style.display = 'block';
};

window.cancelarEdicao = function() {
    document.getElementById('form-produto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('form-titulo').textContent = '➕ Cadastrar Novo Item';
    document.getElementById('btn-submit').textContent = 'Salvar Produto';
    document.getElementById('btn-cancel').style.display = 'none';
};

window.alternarStatus = function(id) {
    let cardapio = obterCardapio();
    const index = cardapio.findIndex(p => p.id === id);
    if (index !== -1) {
        cardapio[index].status = cardapio[index].status === 'ativo' ? 'inativo' : 'ativo';
        salvarCardapio(cardapio);
    }
};

window.excluirItem = function(id) {
    if (confirm('Tem certeza de que deseja remover este item do cardápio?')) {
        let cardapio = obterCardapio();
        cardapio = cardapio.filter(p => p.id !== id);
        salvarCardapio(cardapio);
    }
};

window.moverItem = function(index, direcao) {
    let cardapio = obterCardapio();
    const novoIndex = index + direcao;

    if (novoIndex >= 0 && novoIndex < cardapio.length) {
        const temp = cardapio[index];
        cardapio[index] = cardapio[novoIndex];
        cardapio[novoIndex] = temp;
        salvarCardapio(cardapio);
    }
};

document.addEventListener('DOMContentLoaded', renderizarTabela);