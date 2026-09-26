/* ==========================================================================
   SISTEMA DE AUTENTICAÇÃO E LOGIN UNIFICADO (LOGIN.JS)
   ========================================================================== */

let perfilSelecionado = 'garcom';

// Lê os PINs atualizados no painel DEV com suporte a ambas as chaves de armazenamento
function obterPinsDEV() {
  // Tenta ler de 'gs_config_dev' ou 'gs_config_loja'
  const savedDev = localStorage.getItem('gs_config_dev') || localStorage.getItem('gs_config_loja');
  
  if (savedDev) {
    try {
      const parsed = JSON.parse(savedDev);
      if (parsed.pins) {
        return parsed.pins;
      }
    } catch (e) {
      console.error("Erro ao ler credenciais DEV:", e);
    }
  }
  
  // Padrões de fábrica caso não encontre nada guardado
  return {
    admin: '0000',
    garcom: '1234',
    cozinha: '5678'
  };
}

// Retorna as rotas e perfis sincronizados
function obterCredenciaisEquipe() {
  const pins = obterPinsDEV();
  return {
    admin: {
      pin: pins.admin,
      usuario: 'admin',
      destino: '../admin.html', // Sai da pasta 'painel' para encontrar a raiz
      nome: 'Administrador Principal',
      cargo: 'admin'
    },
    garcom: {
      pin: pins.garcom,
      usuario: 'garcom',
      destino: 'garcom.html',   // Permanece dentro de /painel/
      nome: 'Garçom de Turno',
      cargo: 'garcom'
    },
    cozinha: {
      pin: pins.cozinha,
      usuario: 'cozinha',
      destino: 'cozinha.html',  // Permanece dentro de /painel/
      nome: 'Equipe da Cozinha',
      cargo: 'cozinha'
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  configurarSelecaoPerfil();
  configurarFormularios();
  selecionarPerfil('garcom');
});

function configurarSelecaoPerfil() {
  const btnGarcom = document.getElementById('btn-role-garcom');
  const btnCozinha = document.getElementById('btn-role-cozinha');
  const btnAdmin = document.getElementById('btn-role-admin');

  if (btnGarcom) btnGarcom.addEventListener('click', () => selecionarPerfil('garcom'));
  if (btnCozinha) btnCozinha.addEventListener('click', () => selecionarPerfil('cozinha'));
  if (btnAdmin) btnAdmin.addEventListener('click', () => selecionarPerfil('admin'));
}

function selecionarPerfil(perfil) {
  perfilSelecionado = perfil;
  const btnGarcom = document.getElementById('btn-role-garcom');
  const btnCozinha = document.getElementById('btn-role-cozinha');
  const btnAdmin = document.getElementById('btn-role-admin');
  const labelPerfil = document.getElementById('label-perfil-nome');

  const credenciais = obterCredenciaisEquipe();
  const config = credenciais[perfil];

  [btnGarcom, btnCozinha, btnAdmin].forEach(btn => {
    if (btn) btn.className = 'role-card flex-1 bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 text-center cursor-pointer opacity-60 hover:opacity-100 transition-all';
  });

  if (perfil === 'garcom' && btnGarcom) {
    btnGarcom.className = 'role-card active flex-1 bg-brand-500/10 border-2 border-brand-500 rounded-2xl p-3 text-center cursor-pointer transition-all';
  } else if (perfil === 'cozinha' && btnCozinha) {
    btnCozinha.className = 'role-card active flex-1 bg-brand-500/10 border-2 border-brand-500 rounded-2xl p-3 text-center cursor-pointer transition-all';
  } else if (perfil === 'admin' && btnAdmin) {
    btnAdmin.className = 'role-card active flex-1 bg-brand-500/10 border-2 border-brand-500 rounded-2xl p-3 text-center cursor-pointer transition-all';
  }

  if (labelPerfil) {
    labelPerfil.textContent = `Acesso de ${config.nome} (PIN Atual: ${config.pin})`;
  }

  const msgErro = document.getElementById('msg-erro');
  if (msgErro) msgErro.classList.add('hidden');

  const inputPin = document.getElementById('input-pin');
  if (inputPin) {
    inputPin.value = '';
    inputPin.focus();
  }
}

function configurarFormularios() {
  const formEquipe = document.getElementById('form-login-equipe');
  if (formEquipe) {
    formEquipe.addEventListener('submit', executarLoginPIN);
  }

  const formLoginPadrao = document.getElementById('form-login');
  if (formLoginPadrao) {
    formLoginPadrao.addEventListener('submit', executarLoginUtilizadorSenha);
  }
}

function executarLoginPIN(e) {
  e.preventDefault();
  const pinDigitado = document.getElementById('input-pin').value.trim();
  const credenciais = obterCredenciaisEquipe();
  const configPerfil = credenciais[perfilSelecionado];
  const msgErro = document.getElementById('msg-erro');

  if (pinDigitado === configPerfil.pin) {
    salvarSessaoERedirecionar(configPerfil);
  } else {
    exibirErroPIN(msgErro, 'PIN de acesso incorreto! Tente novamente.');
  }
}

function executarLoginUtilizadorSenha(e) {
  e.preventDefault();

  const usuarioInput = document.getElementById('login-usuario').value.trim();
  const senhaInput = document.getElementById('login-senha').value.trim();
  const credenciais = obterCredenciaisEquipe();

  if (!usuarioInput || !senhaInput) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  if ((usuarioInput === 'admin' || usuarioInput === 'gerente') && senhaInput === '123456') {
    salvarSessaoERedirecionar(credenciais.admin);
    return;
  }

  if (usuarioInput === 'garcom' && senhaInput === '123456') {
    salvarSessaoERedirecionar(credenciais.garcom);
    return;
  }

  if (usuarioInput === 'cozinha' && senhaInput === '123456') {
    salvarSessaoERedirecionar(credenciais.cozinha);
    return;
  }

  alert("Utilizador ou palavra-passe inválidos!");
}

function salvarSessaoERedirecionar(dadosPerfil) {
  const sessaoEquipe = {
    nome: dadosPerfil.nome,
    cargo: dadosPerfil.cargo || dadosPerfil.perfil,
    perfil: dadosPerfil.cargo || dadosPerfil.perfil,
    dataLogin: new Date().toISOString(),
    horaLogin: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };

  localStorage.setItem('gs_equipe_sessao', JSON.stringify(sessaoEquipe));
  window.location.href = dadosPerfil.destino;
}

function exibirErroPIN(elementoErro, mensagem) {
  if (elementoErro) {
    elementoErro.textContent = mensagem;
    elementoErro.classList.remove('hidden');
  } else {
    alert(mensagem);
  }
  const inputPin = document.getElementById('input-pin');
  if (inputPin) {
    inputPin.value = '';
    inputPin.focus();
  }
}