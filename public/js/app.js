import './navbar-auth.js';
import { auth, db } from './config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { updateUIOnAuth, initializeAuthUI } from './navbar-auth.js';
import ShoppingCart from './cart.js';

// Inicializar el carrito global
window.cart = new ShoppingCart();

// Función para inicializar la aplicación
function initializeApp() {
    console.log('🚀 Iniciando aplicación...');
    
    // Inicializar la UI de autenticación
    initializeAuthUI();

    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(auth, (user) => {
        console.log(user ? '✅ Usuario autenticado' : '❌ Usuario no autenticado');
        updateUIOnAuth(user);
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

// Exportar funciones que puedan ser necesarias en otros archivos
export { initializeApp };

// Aquí va el resto de la lógica específica de la página principal 