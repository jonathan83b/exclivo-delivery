import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    query, 
    orderBy, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const COLECAO_PEDIDOS = 'pedidos';

/**
 * Cria um novo pedido no Firestore
 */
export async function criarPedido(novoPedido) {
    try {
        const docRef = await addDoc(collection(db, COLECAO_PEDIDOS), novoPedido);
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error("Erro ao criar pedido no Firestore:", e);
        return { success: false, error: e };
    }
}

/**
 * Busca todos os pedidos uma única vez
 */
export async function buscarPedidos() {
    try {
        const q = query(collection(db, COLECAO_PEDIDOS), orderBy('dataCriacao', 'desc'));
        const querySnapshot = await getDocs(q);
        const pedidos = [];
        querySnapshot.forEach((docSnap) => {
            pedidos.push({ idDoc: docSnap.id, ...docSnap.data() });
        });
        return pedidos;
    } catch (e) {
        console.error("Erro ao buscar pedidos:", e);
        return [];
    }
}

/**
 * Ouve alterações em tempo real nos pedidos para atualizar a cozinha instantaneamente
 */
export function escutarPedidosEmTempoReal(callback) {
    const q = query(collection(db, COLECAO_PEDIDOS), orderBy('dataCriacao', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
        const pedidos = [];
        querySnapshot.forEach((docSnap) => {
            pedidos.push({ idDoc: docSnap.id, ...docSnap.data() });
        });
        callback(pedidos);
    });
}

/**
 * Atualiza o status de um pedido específico no Firestore
 */
export async function atualizarStatusPedido(idDoc, novoStatus, motivo = '') {
    try {
        const pedidoRef = doc(db, COLECAO_PEDIDOS, idDoc);
        const dadosAtualizados = { status: novoStatus };
        if (motivo) {
            dadosAtualizados.motivoCancelamento = motivo;
        }
        await updateDoc(pedidoRef, dadosAtualizados);
        return true;
    } catch (e) {
        console.error("Erro ao atualizar status:", e);
        return false;
    }
}