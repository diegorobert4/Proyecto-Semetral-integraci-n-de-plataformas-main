import { auth, db } from './config/firebase-config.js';
import { 
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { carritoMayorista } from './cart-mayorista.js';

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const productGrid = document.getElementById('productGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const productTemplate = document.getElementById('productTemplate');

    console.log('🔍 Verificando elementos DOM:');
    console.log('  - productGrid:', productGrid ? '✅ Encontrado' : '❌ No encontrado');
    console.log('  - searchInput:', searchInput ? '✅ Encontrado' : '❌ No encontrado');
    console.log('  - categoryFilter:', categoryFilter ? '✅ Encontrado' : '❌ No encontrado');
    console.log('  - productTemplate:', productTemplate ? '✅ Encontrado' : '❌ No encontrado');

    if (!productTemplate) {
        console.error('❌ No se encontró el template de productos');
        return;
    }

    if (!productGrid) {
        console.error('❌ No se encontró el contenedor de productos');
        return;
    }

    // Constantes
    const DESCUENTO_MAYORISTA = 0.15; // 15% de descuento
    const LOTE_MINIMO = 5; // Mínimo 5 unidades por lote

    // Función para manejar el cambio de cantidad
    function handleQuantityChange(input, isIncrease = true) {
        let value = parseInt(input.value) || LOTE_MINIMO;
        if (isIncrease) {
            value += LOTE_MINIMO;
        } else {
            value = Math.max(LOTE_MINIMO, value - LOTE_MINIMO);
        }
        input.value = value;
    }

    // Verificar si el usuario es mayorista
    async function verificarMayorista(user) {
        if (!user) {
            console.log('⚠️ No hay usuario para verificar');
            return false;
        }
        
        try {
            console.log('📋 Consultando datos del usuario en Firestore...');
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log('📊 Datos del usuario:', userData);
                console.log('   - Tipo:', userData.tipo);
                console.log('   - Validado:', userData.validado);
                
                const esMayorista = userData.tipo === 'mayorista' && userData.validado === true;
                console.log('🏪 Resultado verificación mayorista:', esMayorista);
                return esMayorista;
            } else {
                console.log('⚠️ Documento de usuario no existe en Firestore');
                return false;
            }
        } catch (error) {
            console.error('❌ Error al verificar estado de mayorista:', error);
            return false;
        }
    }

    // Función para agregar al carrito
    async function agregarAlCarrito(productId, nombre, precio, cantidad, imagen) {
        try {
            // Agregar al carrito mayorista
            await carritoMayorista.addItem({
                id: productId,
                nombre,
                precio,
                cantidad,
                imagen
            });

            // Actualizar contador del carrito
            updateCartCount();

            // Calcular total de productos en carrito
            const totalProductos = carritoMayorista.items.reduce((total, item) => total + item.cantidad, 0);

            // Mostrar modal personalizado
            Swal.fire({
                title: '¡Producto agregado!',
                html: `
                    <div class="d-flex flex-column align-items-center">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <img src="${imagen || 'https://via.placeholder.com/80'}" 
                                 alt="${nombre}" 
                                 style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;"
                                 onerror="this.src='https://via.placeholder.com/80'">
                            <div>
                                <h5 class="mb-1">${nombre}</h5>
                                <p class="text-muted mb-1">Precio: $${precio.toLocaleString()}</p>
                                <p class="text-muted mb-1">Cantidad: ${cantidad} unidades</p>
                                <p class="text-success mb-0">
                                    <i class="bi bi-check-circle-fill me-2"></i>
                                    ¡Agregado al carrito!
                                </p>
                            </div>
                        </div>
                        <div class="w-100">
                            <p class="text-center mb-2">
                                <i class="bi bi-cart-check me-2"></i>
                                Total en carrito: ${totalProductos} productos
                            </p>
                            <div class="d-flex justify-content-between gap-2">
                                <button class="btn btn-outline-primary flex-grow-1" onclick="Swal.close()" style="pointer-events: auto;">
                                    <i class="bi bi-arrow-left me-2"></i> Seguir comprando
                                </button>
                                <button class="btn btn-primary flex-grow-1" onclick="window.location.href='carrito-mayorista.html'" style="pointer-events: auto;">
                                    <i class="bi bi-cart3 me-2"></i> Ver carrito
                                </button>
                            </div>
                        </div>
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: false,
                allowOutsideClick: true,
                allowEscapeKey: true,
                width: '500px',
                customClass: {
                    popup: 'swal2-show'
                }
            });

        } catch (error) {
            console.error('Error al agregar al carrito:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo agregar el producto al carrito',
                confirmButtonColor: '#0066B1'
            });
        }
    }

    // Función para actualizar el contador del carrito
    function updateCartCount() {
        const cartCountElement = document.querySelector('.cart-count-mayorista');
        if (cartCountElement) {
            cartCountElement.textContent = carritoMayorista.items.reduce((total, item) => total + item.cantidad, 0);
        }
    }

    // Cargar productos con precios mayoristas
    async function cargarProductos() {
        try {
            console.log('🔄 Iniciando carga de productos...');
            const productosRef = collection(db, 'productos');
            const snapshot = await getDocs(productosRef);
            
            console.log(`📦 Se encontraron ${snapshot.size} productos`);
            
            if (productGrid) {
                productGrid.innerHTML = '';
                
                if (snapshot.empty) {
                    console.log('⚠️ No hay productos en la base de datos');
                    productGrid.innerHTML = '<div class="col-12"><div class="alert alert-warning">No hay productos disponibles en este momento.</div></div>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const producto = doc.data();
                    console.log('📋 Procesando producto:', producto.nombre);
                    
                    if (!producto.precio) {
                        console.warn('⚠️ Producto sin precio:', producto.nombre);
                        return;
                    }
                    
                    const precioMayorista = producto.precio * (1 - DESCUENTO_MAYORISTA);
                    
                    // Clonar el template
                    const productCard = productTemplate.content.cloneNode(true);
                    
                    // Actualizar contenido
                    productCard.querySelector('.card').dataset.category = producto.categoria || '';
                    productCard.querySelector('.card-img-top').src = producto.imagen || 'https://via.placeholder.com/300';
                    productCard.querySelector('.card-img-top').alt = producto.nombre;
                    productCard.querySelector('.card-title').textContent = producto.nombre;
                    productCard.querySelector('.card-text.description').textContent = producto.descripcion || '';
                    productCard.querySelector('.normal-price').textContent = producto.precio.toLocaleString();
                    productCard.querySelector('.final-price').textContent = precioMayorista.toLocaleString();

                    // Configurar controles de cantidad
                    const quantityInput = productCard.querySelector('.quantity-input');
                    const decreaseBtn = productCard.querySelector('.decrease-qty');
                    const increaseBtn = productCard.querySelector('.increase-qty');
                    const addToCartBtn = productCard.querySelector('.add-to-cart');

                    decreaseBtn.addEventListener('click', () => handleQuantityChange(quantityInput, false));
                    increaseBtn.addEventListener('click', () => handleQuantityChange(quantityInput, true));
                    
                    addToCartBtn.addEventListener('click', () => {
                        const cantidad = parseInt(quantityInput.value);
                        if (cantidad >= LOTE_MINIMO) {
                            agregarAlCarrito(doc.id, producto.nombre, precioMayorista, cantidad, producto.imagen);
                        } else {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Cantidad mínima',
                                text: `Debes agregar al menos ${LOTE_MINIMO} unidades`,
                                confirmButtonColor: '#0066B1'
                            });
                        }
                    });

                    productGrid.appendChild(productCard);
                });
                
                console.log('✅ Carga de productos completada exitosamente');
            } else {
                console.error('❌ productGrid no está disponible');
            }
        } catch (error) {
            console.error('❌ Error al cargar productos:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los productos. Por favor, intenta nuevamente.',
                confirmButtonColor: '#0066B1'
            });
        }
    }

    // Función para actualizar la UI
    function updateUI(user) {
        const userNameSpan = document.querySelector('.user-name');
        if (userNameSpan && user) {
            userNameSpan.textContent = user.email;
        }
        updateCartCount();
    }

    // Escuchar cambios en la autenticación
    auth.onAuthStateChanged(async (user) => {
        console.log('🔐 Estado de autenticación:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
        
        if (!user) {
            console.log('❌ Usuario no autenticado, redirigiendo...');
            window.location.href = 'iniciar-sesion.html';
            return;
        }

        console.log('👤 Usuario:', user.email);
        console.log('🔍 Verificando permisos de mayorista...');
        
        const esMayorista = await verificarMayorista(user);
        console.log('🏪 Es mayorista:', esMayorista ? '✅ Sí' : '❌ No');
        
        if (!esMayorista) {
            console.log('❌ Acceso denegado - No es mayorista validado');
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: 'No tienes acceso al catálogo mayorista.',
                confirmButtonColor: '#0066B1'
            }).then(() => {
                window.location.href = 'mayoristas.html';
            });
            return;
        }

        console.log('✅ Acceso permitido - Iniciando carga de productos...');
        updateUI(user);
        cargarProductos();
    });

    // Configurar cierre de sesión
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'index.html';
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

    // Configurar búsqueda y filtros
    searchInput?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.product-card');
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const description = card.querySelector('.card-text.description').textContent.toLowerCase();
            const shouldShow = title.includes(searchTerm) || description.includes(searchTerm);
            card.closest('.col').style.display = shouldShow ? '' : 'none';
        });
    });

    categoryFilter?.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        const cards = document.querySelectorAll('.product-card');
        
        cards.forEach(card => {
            const cardCategory = card.dataset.category;
            const shouldShow = selectedCategory === 'todos' || cardCategory === selectedCategory;
            card.closest('.col').style.display = shouldShow ? '' : 'none';
        });
    });
}); 