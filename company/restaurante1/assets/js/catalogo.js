/* ==========================================================================
   LÓGICA DO CATÁLOGO DIGITAL (CATALOGO.JS)
   ========================================================================== */

const PRODUTOS_PADRAO = [
  { id: 1, name: "Hambúrguer Artesanal Gourmet", category: "Pratos Principais", price: 38.90, desc: "Pão brioche, 180g de blend bovino, queijo cheddar, bacon crocante e maionese da casa.", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60", esgotado: false },
  { id: 2, name: "Pizza Margherita Especial", category: "Pratos Principais", price: 54.00, desc: "Molho de tomate italiano, muçarela de búfala, manjericão fresco e azeite trufado.", image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&auto=format&fit=crop&q=60", esgotado: false },
  { id: 3, name: "Batata Frita Suprema", category: "Entradas", price: 26.50, desc: "Batatas rústicas com cheddar cremoso e bacon em cubos.", image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&auto=format&fit=crop&q=60", esgotado: false },
  { id: 4, name: "Iscas de Peixe Empanadas", category: "Entradas", price: 34.00, desc: "Acompanha molho tártaro artesanal e limão siciliano.", image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=60", esgotado: false },
  { id: 5, name: "Sucos Naturais 500ml", category: "Bebidas", price: 12.00, desc: "Laranja, Abacaxi com Hortelã, ou Frutas Vermelhas.", image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=60", esgotado: false },
  { id: 6, name: "Refrigerante Lata 350ml", category: "Bebidas", price: 7.50, desc: "Coca-Cola, Guaraná Antarctica ou Fanta.", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=60", esgotado: false },
  { id: 7, name: "Petit Gâteau com Sorvete", category: "Sobremesas", price: 24.90, desc: "Bolo quente de chocolate com recheio cremoso e sorvete de baunilha.", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&auto=format&fit=crop&q=60", esgotado: false }
];

const NUMERO_WHATSAPP = "5585999998888"; // Altere para o seu número real com DDD e DDI

document.addEventListener("DOMContentLoaded", () => {
  // Se o localStorage não tiver produtos cadastrados pelo admin, insere os padrões
  const menuAtual = localStorage.getItem('gs_menu');
  if (!menuAtual || menuAtual === '[]') {
    localStorage.setItem('gs_menu', JSON.stringify(PRODUTOS_PADRAO));
  }

  renderizarCatalogo();

  // Ouve atualizações em tempo real do painel admin ou de outras abas
  window.addEventListener('storage', (e) => {
    if (e.key === 'gs_menu') {
      renderizarCatalogo();
    }
  });
});

function renderizarCatalogo() {
  const grid = document.getElementById('grid-catalogo');
  if (!grid) return;
  grid.innerHTML = '';

  let listaProdutos = PRODUTOS_PADRAO;

  try {
    const dadosSalvos = localStorage.getItem('gs_menu');
    if (dadosSalvos) {
      const parsed = JSON.parse(dadosSalvos);
      if (Array.isArray(parsed) && parsed.length > 0) {
        listaProdutos = parsed;
      }
    }
  } catch (erro) {
    console.error("Erro ao ler o menu do armazenamento:", erro);
  }

  const inputBusca = document.getElementById('search-catalogo');
  const termo = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

  // Filtra os itens respeitando a propriedade 'esgotado' gerada pelo admin.js
  const itensFiltrados = listaProdutos.filter(item => {
    if (!item) return false;
    
    // Se o prato estiver pausado/esgotado no painel administrativo, oculta do catálogo
    if (item.esgotado === true) return false;

    const nome = (item.name || '').toLowerCase();
    const desc = (item.desc || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();

    return nome.includes(termo) || desc.includes(termo) || cat.includes(termo);
  });

  if (itensFiltrados.length === 0) {
    grid.innerHTML = `<p class="text-center text-xs text-slate-500 py-10">Nenhum produto disponível no momento.</p>`;
    return;
  }

  itensFiltrados.forEach(item => {
    const preco = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    const precoFormatado = preco.toFixed(2).replace('.', ',');
    const nome = item.name || 'Produto';
    const desc = item.desc || '';
    const categoria = item.category || 'Geral';
    const imagem = item.image || 'https://placehold.co/300x200/1e293b/fff?text=Prato';

    const textoMsg = encodeURIComponent(`Olá! Gostaria de encomendar: *${nome}* (R$ ${precoFormatado}). Poderia confirmar a disponibilidade?`);
    const linkZap = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${textoMsg}`;

    const card = document.createElement('div');
    card.className = "bg-slate-900 border border-slate-800 rounded-2xl p-3 flex space-x-3 shadow-md items-center";
    card.innerHTML = `
      <div class="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0">
        <img src="${imagem}" alt="${nome}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/300x200/1e293b/fff?text=Prato'">
      </div>
      <div class="flex flex-col justify-between flex-grow space-y-1">
        <div>
          <span class="text-[9px] uppercase font-bold text-orange-500 tracking-wider">${categoria}</span>
          <h3 class="font-bold text-white text-xs leading-snug">${nome}</h3>
          <p class="text-[10px] text-slate-400 line-clamp-1 mt-0.5">${desc}</p>
        </div>
        <div class="flex items-center justify-between pt-1">
          <span class="text-xs font-extrabold text-emerald-400">R$ ${precoFormatado}</span>
          <a href="${linkZap}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow">
            <i class="fa-brands fa-whatsapp text-xs"></i> Pedir
          </a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filtrarProdutos() {
  renderizarCatalogo();
}