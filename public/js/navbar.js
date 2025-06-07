import ShoppingCart from './cart.js';
import { auth, db } from './config/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { carritoMayorista } from './cart-mayorista.js';

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

// Función para verificar si el usuario es mayorista
async function verificarMayorista(user) {
    if (!user) return false;
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.tipo === 'mayorista' && userData.validado === true;
        }
        return false;
    } catch (error) {
        console.error('Error al verificar estado de mayorista:', error);
        return false;
    }
}

// Función para actualizar los contadores del carrito mayorista
function updateMayoristaCartCounters() {
    const totalItems = carritoMayorista.items.reduce((total, item) => total + item.cantidad, 0);
    const counters = document.querySelectorAll('.cart-count-mayorista');
    counters.forEach(counter => {
        counter.textContent = totalItems;
    });
}

// Función para actualizar la UI según el tipo de usuario
async function updateUI(user) {
    const userMenu = document.querySelector('.user-menu');
    const authButtons = document.getElementById('authButtons');
    const regularCatalog = document.querySelector('.regular-catalog');
    const mayoristaCatalog = document.querySelector('.mayorista-menu');
    const nonMayoristaCatalog = document.querySelector('.non-mayorista-menu');
    const userName = document.querySelector('.user-name');
    const adminMenuItems = document.querySelectorAll('.admin-menu');

    if (user) {
        // Ocultar botones de auth y mostrar menú de usuario
        if (authButtons) authButtons.classList.add('d-none');
        if (userMenu) userMenu.classList.remove('d-none');
        
        // Actualizar nombre de usuario
        if (userName) {
            userName.textContent = user.email;
        }

        // Verificar si es mayorista
        const esMayorista = await verificarMayorista(user);

        if (esMayorista) {
            // Mostrar elementos mayoristas
            if (mayoristaCatalog) mayoristaCatalog.classList.remove('d-none');
            if (regularCatalog) regularCatalog.classList.add('d-none');
            if (nonMayoristaCatalog) nonMayoristaCatalog.classList.add('d-none');

            // Actualizar todos los enlaces del carrito para usuarios mayoristas
            const cartLinks = document.querySelectorAll('a[href*="carrito.html"]');
            cartLinks.forEach(link => {
                link.href = '../views/carrito-mayorista.html';
                // Actualizar el contador del carrito
                const cartCount = link.querySelector('.cart-count');
                if (cartCount) {
                    cartCount.classList.remove('cart-count');
                    cartCount.classList.add('cart-count-mayorista');
                }
            });

            // Actualizar el botón del carrito en móviles
            const mobileCartBtn = document.querySelector('.btn.btn-primary[href*="carrito.html"]');
            if (mobileCartBtn) {
                mobileCartBtn.href = '../views/carrito-mayorista.html';
                const mobileCartCount = mobileCartBtn.querySelector('.cart-count');
                if (mobileCartCount) {
                    mobileCartCount.classList.remove('cart-count');
                    mobileCartCount.classList.add('cart-count-mayorista');
                }
            }

            // Actualizar menú de usuario para mayoristas
            if (userMenu) {
                const dropdownMenu = userMenu.querySelector('.dropdown-menu');
                if (dropdownMenu) {
                    // Actualizar o agregar el enlace al carrito mayorista
                    const existingCartLink = dropdownMenu.querySelector('a[href*="carrito"]');
                    if (existingCartLink) {
                        existingCartLink.href = '../views/carrito-mayorista.html';
                        existingCartLink.innerHTML = `
                            <i class="bi bi-cart3 me-2"></i>Carrito Mayorista
                            <span class="badge bg-danger ms-2 cart-count-mayorista">0</span>
                        `;
                    } else {
                        // Si no existe, insertarlo después del primer elemento
                        const firstItem = dropdownMenu.querySelector('.dropdown-item');
                        if (firstItem) {
                            const carritoMayoristaItem = document.createElement('li');
                            carritoMayoristaItem.innerHTML = `
                                <a class="dropdown-item d-flex align-items-center" href="../views/carrito-mayorista.html">
                                    <i class="bi bi-cart3 me-2"></i>Carrito Mayorista
                                    <span class="badge bg-danger ms-2 cart-count-mayorista">0</span>
                                </a>
                            `;
                            firstItem.parentNode.insertBefore(carritoMayoristaItem, firstItem.nextSibling);
                        }
                    }
                }
            }

            // Actualizar los contadores del carrito mayorista
            await carritoMayorista.loadCart();
            updateMayoristaCartCounters();

            // Observar cambios en el carrito mayorista
            carritoMayorista.onCartChange = updateMayoristaCartCounters;
        } else {
            // Mostrar elementos regulares
            if (mayoristaCatalog) mayoristaCatalog.classList.add('d-none');
            if (regularCatalog) regularCatalog.classList.remove('d-none');
            if (nonMayoristaCatalog) nonMayoristaCatalog.classList.remove('d-none');
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
        // UI para usuarios no autenticados
        if (authButtons) authButtons.classList.remove('d-none');
        if (userMenu) userMenu.classList.add('d-none');
        if (mayoristaCatalog) mayoristaCatalog.classList.add('d-none');
        if (regularCatalog) regularCatalog.classList.remove('d-none');
        if (nonMayoristaCatalog) nonMayoristaCatalog.classList.remove('d-none');
        adminMenuItems.forEach(item => item.classList.add('d-none'));
    }
}

// Escuchar cambios en la autenticación
auth.onAuthStateChanged(async (user) => {
    await updateUI(user);
});

// Configurar cierre de sesión
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = '../views/index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cerrar sesión. Intenta nuevamente.',
            confirmButtonColor: '#0066B1'
        });
    }
});

// Función para inicializar la UI de autenticación
function initializeAuthUI() {
    auth.onAuthStateChanged(async (user) => {
        await updateUI(user);
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeAuthUI);

export { updateUI, initializeAuthUI };