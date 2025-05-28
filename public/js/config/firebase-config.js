// Importar las funciones necesarias de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB7zt55jPT8IYyfGNnrcVw2HZjRQwc3Y14",
    authDomain: "auto-parts-2025.firebaseapp.com",
    projectId: "auto-parts-2025",
    storageBucket: "auto-parts-2025.appspot.com",
    messagingSenderId: "758243524320",
    appId: "1:758243524320:web:7540895a596c808f795a85",
    measurementId: "G-QC6EKQR3XS"
};

// Inicializar Firebase
let app;
let auth;
let db;
let storage;

try {
    console.log('🔥 Inicializando Firebase...');
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');

    console.log('🔐 Inicializando Auth...');
    auth = getAuth(app);
    console.log('✅ Auth inicializado');

    console.log('💾 Inicializando Firestore...');
    db = getFirestore(app);
    console.log('✅ Firestore inicializado');

    console.log('📦 Inicializando Storage...');
    storage = getStorage(app);
    console.log('✅ Storage inicializado');
} catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
    throw new Error('Error al inicializar Firebase: ' + error.message);
}

// Exportar las instancias
export { app, auth, db, storage }; 