import { db } from './firebase-config.js';

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const COLECAO_PEDIDOS = "pedidos";

/**
 * Cria um novo pedido
 */
export async function criarPedido(novoPedido) {
    try {

        const pedidoCompleto = {
            ...novoPedido,
            dataCriacao: serverTimestamp()
        };

        const docRef = await addDoc(
            collection(db, COLECAO_PEDIDOS),
            pedidoCompleto
        );

        console.log("Pedido criado:", docRef.id);

        return {
            success: true,
            id: docRef.id
        };

    } catch (erro) {

        console.error("Erro ao criar pedido:", erro);

        return {
            success: false,
            error: erro
        };
    }
}


/**
 * Busca pedidos de uma empresa
 */
export async function buscarPedidos(restaurantId) {

    try {

        const q = query(
            collection(db, COLECAO_PEDIDOS),
            where("restaurantId", "==", restaurantId),
            orderBy("dataCriacao", "desc")
        );

        const resultado = await getDocs(q);

        const pedidos = [];

        resultado.forEach((documento) => {

            pedidos.push({
                idDoc: documento.id,
                ...documento.data()
            });

        });

        return pedidos;

    } catch (erro) {

        console.error("Erro ao buscar pedidos:", erro);

        return [];
    }
}


/**
 * Escuta pedidos em tempo real
 */
export function escutarPedidosEmTempoReal(
    restaurantId,
    callback
) {

    const q = query(
        collection(db, COLECAO_PEDIDOS),
        where("restaurantId", "==", restaurantId),
        orderBy("dataCriacao", "desc")
    );

    return onSnapshot(
        q,
        (snapshot) => {

            const pedidos = [];

            snapshot.forEach((documento) => {

                pedidos.push({
                    idDoc: documento.id,
                    ...documento.data()
                });

            });

            callback(pedidos);
        },

        (erro) => {

            console.error(
                "Erro no monitoramento dos pedidos:",
                erro
            );

        }
    );
}


/**
 * Atualiza o status do pedido
 */
export async function atualizarStatusPedido(
    idDoc,
    novoStatus,
    motivo = ""
) {

    try {

        const pedidoRef = doc(
            db,
            COLECAO_PEDIDOS,
            idDoc
        );

        const dadosAtualizados = {
            status: novoStatus
        };

        if (motivo) {
            dadosAtualizados.motivoCancelamento = motivo;
        }

        await updateDoc(
            pedidoRef,
            dadosAtualizados
        );

        return true;

    } catch (erro) {

        console.error(
            "Erro ao atualizar status:",
            erro
        );

        return false;
    }
}