import { auth, db } from './config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import ShoppingCart from './cart.js';

// Inicializar el carrito global
window.cart = new ShoppingCart();

// Función para actualizar la UI basada en el estado de autenticación
function updateUIOnAuth(user) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.querySelector('.user-menu');
    const adminMenuItems = document.querySelectorAll('.admin-menu');
    
    if (user) {
        // Ocultar botones de auth y mostrar menú de usuario
        if (authButtons) authButtons.classList.add('d-none');
        if (userMenu) {
            userMenu.classList.remove('d-none');
            const userNameSpan = userMenu.querySelector('.user-name');
            if (userNameSpan) {
                userNameSpan.textContent = user.email;
            }
        }
        
        // Mostrar/ocultar elementos de administrador
        adminMenuItems.forEach(item => {
            if (user.email === 'admin@gmail.com') {
                item.classList.remove('d-none');
            } else {
                item.classList.add('d-none');
            }
        });
    } else {
        // Mostrar botones de auth y ocultar menús
        if (authButtons) authButtons.classList.remove('d-none');
        if (userMenu) userMenu.classList.add('d-none');
        adminMenuItems.forEach(item => item.classList.add('d-none'));
    }
}

// Inicializar la UI de autenticación
function initializeAuthUI() {
    onAuthStateChanged(auth, (user) => {
        updateUIOnAuth(user);
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeAuthUI);

// Exportar funciones que puedan ser necesarias en otros archivos
export { initializeAuthUI };

// Aquí va el resto de la lógica específica de la página principal 