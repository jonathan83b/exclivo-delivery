import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js"; // Opcional, caso queira usar analytics

const firebaseConfig = {
    apiKey: "AIzaSyCkdUdGSQcyxP1URcgwKzgciVcAmIGyQDU",
    authDomain: "exclivo-delivery.firebaseapp.com",
    projectId: "exclivo-delivery",
    storageBucket: "exclivo-delivery.firebasestorage.app",
    messagingSenderId: "431459421516",
    appId: "1:431459421516:web:afaabd53d1ae8df47c13e9",
    measurementId: "G-DSG2G50M1P"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Opcional
export const db = getFirestore(app);