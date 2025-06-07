// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7zt55jPT8IYyfGNnrcVw2HZjRQwc3Y14",
    authDomain: "auto-parts-2025.firebaseapp.com",
    projectId: "auto-parts-2025",
    storageBucket: "auto-parts-2025.appspot.com",
    messagingSenderId: "758243524320",
    appId: "1:758243524320:web:7540895a596c808f795a85",
    measurementId: "G-QC6EKQR3XS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('📦 Inicializando Storage...');
const storage = getStorage(app);
console.log('✅ Storage inicializado');

// Exportar las instancias
export { app, auth, db, storage }; 