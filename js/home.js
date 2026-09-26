document.addEventListener('DOMContentLoaded', () => {
    const gridNegocios = document.getElementById('grid-negocios');
    const inputBusca = document.getElementById('input-busca');
    const selectCategoria = document.getElementById('select-categoria');

    let todosOsNegocios = [];

    // Busca dados no backend
    async function carregarNegocios() {
        try {
            const res = await fetch('/api/negocios');
            if (!res.ok) throw new Error('Erro na requisição');

            todosOsNegocios = await res.json();
            renderizarCards(todosOsNegocios);
        } catch (err) {
            console.error('Erro:', err);
            gridNegocios.innerHTML = `<div class="sem-resultados">Não foi possível carregar as empresas no momento.</div>`;
        }
    }

    // Renderiza a lista de cards na tela
    function renderizarCards(lista) {
        gridNegocios.innerHTML = '';

        if (lista.length === 0) {
            gridNegocios.innerHTML = `<div class="sem-resultados">Nenhuma empresa encontrada.</div>`;
            return;
        }

        lista.forEach(item => {
            const card = document.createElement('article');
            card.className = 'card';

            const icone = item.icone || 'fa-briefcase';
            const categoria = item.categoria || 'Geral';

            card.innerHTML = `
                <div>
                    <div class="card-top">
                        <div class="card-icon">
                            <i class="fa-solid ${icone}"></i>
                        </div>
                        <span class="card-badge">${categoria}</span>
                    </div>
                    <h3>${item.nome}</h3>
                    <p>${item.descricao}</p>
                </div>
                <a href="${item.url}" target="_blank" class="btn">Acessar Sistema</a>
            `;

            gridNegocios.appendChild(card);
        });
    }

    // Filtragem dinâmica
    function aplicarFiltros() {
        const termo = inputBusca.value.toLowerCase();
        const categoriaSelecionada = selectCategoria.value;

        const resultado = todosOsNegocios.filter(item => {
            const bateTexto = item.nome.toLowerCase().includes(termo) || 
                             item.descricao.toLowerCase().includes(termo);
            const bateCategoria = categoriaSelecionada === '' || item.categoria === categoriaSelecionada;

            return bateTexto && bateCategoria;
        });

        renderizarCards(resultado);
    }

    // Escuta eventos de digitação e seleção
    inputBusca.addEventListener('input', aplicarFiltros);
    selectCategoria.addEventListener('change', aplicarFiltros);

    // Inicialização
    carregarNegocios();
});