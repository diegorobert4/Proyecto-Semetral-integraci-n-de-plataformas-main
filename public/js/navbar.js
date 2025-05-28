import ShoppingCart from './cart.js';
import { updateUIOnAuth, updateAuthUI, initializeAuthUI } from './navbar-auth.js';

// Función para manejar el scroll
function handleScroll() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
}

// Función para cargar el navbar
async function loadNavbar() {
    try {
        console.log('🔄 Cargando navbar...');
        
        // Verificar si hay un contenedor de navbar
        const navbarContainer = document.getElementById('navbar-container');
        if (!navbarContainer) {
            console.error('❌ No se encontró el contenedor del navbar');
            return;
        }

        // Intentar cargar el navbar
        const response = await fetch('../components/navbar.html');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Insertar el HTML del navbar
        navbarContainer.innerHTML = html;
        console.log('✅ Navbar cargado correctamente');
        
        // Verificar si el navbar se insertó correctamente
        const navbarElement = navbarContainer.querySelector('.navbar');
        if (!navbarElement) {
            console.error('❌ No se pudo insertar el navbar');
            return;
        }

        // Añadir eventos después de cargar el navbar
        window.addEventListener('scroll', handleScroll);
        handleScroll();

        // Actualizar el contador del carrito
        if (window.cart) {
            window.cart.updateCartDisplay();
        }

        // Añadir log de depuración para dispositivos móviles
        console.log('Ancho de pantalla:', window.innerWidth);
        console.log('Agente de usuario:', navigator.userAgent);

        // Inicializar UI de autenticación
        initializeAuthUI();

        // Llamar a updateAuthUI para manejar el estado de autenticación
        import('./config/firebase-config.js').then(({ auth }) => {
            import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').then(({ onAuthStateChanged }) => {
                onAuthStateChanged(auth, (user) => {
                    updateAuthUI();
                });
            });
        });

    } catch (error) {
        console.error('❌ Error al cargar el navbar:', error);
    }
}

// Cargar el navbar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', loadNavbar);

// Exportar funciones si es necesario
export { handleScroll, loadNavbar };

document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.querySelector('.login-button');
    if (loginButton) {
        console.log('Botón de inicio de sesión encontrado');
        console.log('Estilos del botón:', window.getComputedStyle(loginButton));
        console.log('Visibilidad:', loginButton.offsetParent);
    } else {
        console.error('Boton de inicio de sesion encontrado');
    }
});