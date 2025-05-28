import { auth, db } from './config/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc,
    collection 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Función para inicializar la UI de autenticación
function initializeAuthUI() {
    console.log('🔧 Inicializando UI de autenticación...');
    // Esperar a que el navbar se cargue
    const checkNavbar = setInterval(() => {
        const authButtons = document.querySelectorAll('#authButtons');
        const userMenus = document.querySelectorAll('.user-menu');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (authButtons.length > 0 && userMenus.length > 0) {
            console.log('✅ Elementos del navbar encontrados');
            clearInterval(checkNavbar);
            setupLogoutButton();
            updateAuthUI();
        }
    }, 100);
}

// Función para configurar el botón de cerrar sesión
function setupLogoutButton() {
    console.log('🔍 Configurando botón de cierre de sesión GLOBAL');
    
    // Agregar listener global para manejar clics en botones de cierre de sesión
    document.addEventListener('click', async (event) => {
        const logoutBtn = event.target.closest('#logoutBtn');
        
        if (logoutBtn) {
            event.preventDefault();
            event.stopPropagation();
            
            console.log('🔄 Iniciando proceso de cierre de sesión desde listener global');
            
            try {
                // Importar dinámicamente Firebase Auth si no está disponible
                const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
                const { auth } = await import('./config/firebase-config.js');
                
                console.log('🔒 Objeto de autenticación:', auth);
                
                // Verificar si hay un usuario autenticado
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    console.warn('⚠️ No hay usuario autenticado');
                    window.location.href = '../views/index.html';
                    return;
                }
                
                await signOut(auth);
                console.log('✅ Sesión cerrada exitosamente');
                
                // Limpiar datos de usuario
                localStorage.removeItem('user');
                sessionStorage.removeItem('user');
                
                // Redirigir a la página de inicio
                const currentPath = window.location.pathname;
                const isInViews = currentPath.includes('/views/');
                const redirectPath = isInViews ? 'index.html' : '../views/index.html';
                console.log('🔄 Redirigiendo a:', redirectPath);
                
                window.location.href = redirectPath;
            } catch (error) {
                console.error('❌ Error al cerrar sesión:', error);
                
                // Mostrar mensaje de error
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al cerrar sesión',
                        text: error.message || 'Por favor, intenta nuevamente',
                        confirmButtonColor: '#0066B1'
                    });
                } else {
                    alert('Error al cerrar sesión: ' + error.message);
                }
            }
        }
    });

    // Intentar configurar botones de cierre de sesión específicos
    const logoutBtns = document.querySelectorAll('#logoutBtn');
    logoutBtns.forEach(btn => {
        console.log('🔍 Botón de cierre de sesión encontrado:', btn);
    });
}

// Llamar a setupLogoutButton cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando configuración de cierre de sesión');
    setupLogoutButton();
});

// Función para actualizar la UI basada en el estado de autenticación
function updateUIOnAuth(user) {
    // Seleccionar todos los elementos relevantes en todas las páginas
    const authButtonsContainers = document.querySelectorAll('#authButtons');
    const userMenus = document.querySelectorAll('.user-menu');
    const userNameSpans = document.querySelectorAll('.user-name');

    if (authButtonsContainers.length === 0 || userMenus.length === 0) {
        console.warn('⚠️ Elementos del navbar no encontrados');
        return;
    }

    if (user) {
        // Usuario autenticado
        authButtonsContainers.forEach(container => {
            container.classList.add('d-none');  // Ocultar botones de inicio de sesión
        });
        userMenus.forEach(menu => {
            menu.classList.remove('d-none');  // Mostrar menú de usuario
        });
        
        // Obtener nombre de usuario desde Firestore
        const userDocRef = doc(db, 'usuarios', user.uid);
        getDoc(userDocRef)
            .then((docSnap) => {
                let userName = user.email; // Valor predeterminado
                
                if (docSnap.exists()) {
                    // Preferir nombreCompleto de Firestore
                    userName = docSnap.data().nombreCompleto || user.email;
                }

                // Actualizar todos los spans de nombre de usuario
                userNameSpans.forEach(span => {
                    if (span) {
                        span.textContent = userName;
                    }
                });
            })
            .catch((error) => {
                console.error("Error al obtener datos del usuario:", error);
                // Actualizar con email si hay error
                userNameSpans.forEach(span => {
                    if (span) {
                        span.textContent = user.email;
                    }
                });
            });

        // Actualizar el contador del carrito
        if (window.cart) {
            window.cart.updateCartDisplay();
        }
    } else {
        // Usuario no autenticado
        authButtonsContainers.forEach(container => {
            container.classList.remove('d-none');  // Mostrar botones de inicio de sesión
        });
        userMenus.forEach(menu => {
            menu.classList.add('d-none');  // Ocultar menú de usuario
        });
    }
}

// Función para actualizar la UI de autenticación
function updateAuthUI() {
    const user = auth.currentUser;
    updateUIOnAuth(user);
}

// Escuchar cambios en el estado de autenticación
const unsubscribe = onAuthStateChanged(auth, (user) => {
    updateUIOnAuth(user);
});

// Limpiar el listener cuando se desmonte el componente
window.addEventListener('unload', () => {
    unsubscribe();
});

// Exportar las funciones necesarias
export { updateUIOnAuth, initializeAuthUI, updateAuthUI }; 

