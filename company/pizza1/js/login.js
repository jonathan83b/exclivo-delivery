// CONFIGURAÇÃO DE CREDENCIAIS (Pode alterar aqui!)
const CREDENCIAIS_ADMIN = {
    usuario: "admin",
    senha: "32331733"
};

/**
 * Valida os dados e realiza o login
 */
function realizarLogin(event) {
    event.preventDefault(); // Impede o recarregamento da página

    const usuarioInput = document.getElementById('usuario').value.trim();
    const senhaInput = document.getElementById('senha').value.trim();
    const msgErro = document.getElementById('msg-erro');

    if (usuarioInput === CREDENCIAIS_ADMIN.usuario && senhaInput === CREDENCIAIS_ADMIN.senha) {
        // Guarda o token de sessão autenticada no navegador
        sessionStorage.setItem('exclivo_autenticado', 'true');
        
        // Redireciona para o painel admin
        window.location.href = 'admin.html';
    } else {
        msgErro.style.display = 'block';
    }
}

// Se o usuário já estiver logado, redireciona direto para o admin ao abrir a tela de login
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('exclivo_autenticado') === 'true') {
        window.location.href = 'admin.html';
    }
});