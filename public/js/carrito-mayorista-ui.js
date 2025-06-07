import { auth } from './config/firebase-config.js';
import { carritoMayorista } from './cart-mayorista.js';

// Referencias a elementos del DOM
const cartItemsContainer = document.getElementById('cartItems');
const subtotalElement = document.getElementById('subtotal');
const discountElement = document.getElementById('discount');
const totalElement = document.getElementById('total');
const checkoutBtn = document.getElementById('checkoutBtn');

// Función para formatear precios (sin decimales)
function formatPrice(price) {
    return `$${Math.round(price).toLocaleString()}`;
}

// Función para renderizar los items del carrito
function renderCartItems() {
    if (!cartItemsContainer) return;

    if (carritoMayorista.items.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-cart-x fs-1 text-muted"></i>
                <p class="mt-2">Tu carrito mayorista está vacío</p>
                <a href="mayorista.html" class="btn btn-primary">
                    <i class="bi bi-box-seam me-2"></i>Ir al Catálogo Mayorista
                </a>
            </div>
        `;
        return;
    }

    // Agregar estilos CSS si no existen
    addQuantityControlStyles();

    cartItemsContainer.innerHTML = carritoMayorista.items.map(item => `
        <div class="card mb-3">
            <div class="row g-0">
                <div class="col-md-2">
                    <img src="${item.imagen || 'https://via.placeholder.com/150'}" 
                         class="img-fluid rounded-start" 
                         alt="${item.nombre}">
                </div>
                <div class="col-md-10">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${item.nombre}</h5>
                            <button class="btn btn-link text-danger" 
                                    onclick="window.removeItem('${item.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <p class="card-text">
                            <small class="text-muted">
                                Lote mínimo: ${item.loteMinimo} unidades
                            </small>
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="quantity-control-mayorista input-group" style="max-width: 180px;">
                                <button class="btn btn-outline-primary quantity-btn-decrease" 
                                        data-product-id="${item.id}"
                                        data-current-quantity="${item.cantidad}"
                                        data-lote-minimo="${item.loteMinimo}"
                                        ${item.cantidad <= item.loteMinimo ? 'disabled' : ''}
                                        title="Disminuir lote (-${item.loteMinimo})">
                                    <i class="bi bi-dash-lg"></i>
                                </button>
                                <input type="number" 
                                       class="form-control text-center quantity-input-mayorista" 
                                       value="${item.cantidad}"
                                       min="${item.loteMinimo}"
                                       step="${item.loteMinimo}"
                                       data-product-id="${item.id}"
                                       data-lote-minimo="${item.loteMinimo}"
                                       aria-label="Cantidad del producto (lotes de ${item.loteMinimo})"
                                       style="text-align: center !important; font-weight: bold !important; font-size: 1.3rem !important; color: #000 !important; background-color: #ffffff !important; border: 2px solid #dee2e6 !important; padding: 8px !important;">
                                <button class="btn btn-outline-primary quantity-btn-increase"
                                        data-product-id="${item.id}"
                                        data-current-quantity="${item.cantidad}"
                                        data-lote-minimo="${item.loteMinimo}"
                                        title="Aumentar lote (+${item.loteMinimo})">
                                    <i class="bi bi-plus-lg"></i>
                                </button>
                            </div>
                            <div class="text-end">
                                <div class="fs-5 fw-bold text-success">${formatPrice(item.precio * item.cantidad)}</div>
                                <small class="text-muted">
                                    ${formatPrice(item.precio)} por unidad
                                </small>
                                <div>
                                    <small class="badge bg-info text-dark">
                                        ${item.cantidad / item.loteMinimo} lote(s)
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Configurar event listeners después de renderizar
    setupQuantityEventListeners();
    
    // Forzar aplicación de estilos en los inputs
    setTimeout(() => {
        const inputs = document.querySelectorAll('.quantity-input-mayorista');
        inputs.forEach(input => {
            // Aplicar estilos directamente con máxima prioridad
            input.style.cssText = `
                text-align: center !important;
                font-weight: 900 !important;
                font-size: 1.4rem !important;
                color: #000000 !important;
                background-color: #ffffff !important;
                border: 2px solid #dee2e6 !important;
                padding: 8px 12px !important;
                min-width: 80px !important;
                height: 44px !important;
                line-height: 1 !important;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                -webkit-appearance: none !important;
                -moz-appearance: textfield !important;
            `;
            
            // Asegurar que el valor sea visible
            if (input.value) {
                input.setAttribute('value', input.value);
                // Refrescar el display del valor
                const currentValue = input.value;
                input.value = '';
                input.value = currentValue;
            }
        });
    }, 100);
}

// Función para agregar estilos CSS
function addQuantityControlStyles() {
    // Verificar si ya existen los estilos
    if (document.getElementById('mayorista-quantity-styles')) return;

    const style = document.createElement('style');
    style.id = 'mayorista-quantity-styles';
    style.textContent = `
        .quantity-control-mayorista {
            max-width: 180px;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .quantity-control-mayorista input {
            text-align: center !important;
            font-weight: 900 !important;
            font-size: 1.4rem !important;
            color: #000000 !important;
            background-color: #ffffff !important;
            border: 2px solid #dee2e6 !important;
            border-left: 1px solid #dee2e6 !important;
            border-right: 1px solid #dee2e6 !important;
            -moz-appearance: textfield !important;
            -webkit-appearance: none !important;
            padding: 8px 12px !important;
            min-width: 80px !important;
            height: 44px !important;
            line-height: 1 !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .quantity-control-mayorista input:focus {
            background-color: #fff !important;
            border-color: #0d6efd !important;
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important;
            outline: none !important;
        }
        .quantity-control-mayorista input::-webkit-outer-spin-button,
        .quantity-control-mayorista input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .quantity-control-mayorista .btn {
            border: 1px solid #dee2e6;
            padding: 0.5rem 0.75rem;
        }
        .quantity-control-mayorista .btn:hover:not(:disabled) {
            background-color: #0d6efd;
            border-color: #0d6efd;
            color: white;
        }
        .quantity-control-mayorista .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        /* Estilos adicionales para asegurar visibilidad del número */
        .quantity-input-mayorista {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            letter-spacing: 0.5px !important;
            line-height: 1.2 !important;
        }
        .quantity-input-mayorista::-webkit-input-placeholder {
            color: #6c757d !important;
        }
        .quantity-input-mayorista::-moz-placeholder {
            color: #6c757d !important;
        }
        .quantity-input-mayorista:-ms-input-placeholder {
            color: #6c757d !important;
        }
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.12);
            transition: all 0.3s ease;
        }
        @media (max-width: 768px) {
            .quantity-control-mayorista {
                max-width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

// Función para configurar event listeners
function setupQuantityEventListeners() {
    if (!cartItemsContainer) return;

    // Remover event listeners existentes
    cartItemsContainer.removeEventListener('click', handleQuantityButtons);
    cartItemsContainer.removeEventListener('change', handleQuantityInputChange);

    // Agregar nuevos event listeners
    cartItemsContainer.addEventListener('click', handleQuantityButtons);
    cartItemsContainer.addEventListener('change', handleQuantityInputChange);
}

// Función para manejar clics en botones de cantidad
function handleQuantityButtons(event) {
    const button = event.target.closest('button');
    if (!button) return;

    const productId = button.dataset.productId;
    const loteMinimo = parseInt(button.dataset.loteMinimo);
    const currentQuantity = parseInt(button.dataset.currentQuantity);

    // Botón de disminuir
    if (button.classList.contains('quantity-btn-decrease')) {
        const newQuantity = currentQuantity - loteMinimo;
        if (newQuantity >= loteMinimo) {
            updateQuantityWithValidation(productId, newQuantity, loteMinimo);
        }
        return;
    }

    // Botón de aumentar
    if (button.classList.contains('quantity-btn-increase')) {
        const newQuantity = currentQuantity + loteMinimo;
        updateQuantityWithValidation(productId, newQuantity, loteMinimo);
        return;
    }
}

// Función para manejar cambios en el input de cantidad
function handleQuantityInputChange(event) {
    const input = event.target;
    if (!input.classList.contains('quantity-input-mayorista')) return;

    const productId = input.dataset.productId;
    const loteMinimo = parseInt(input.dataset.loteMinimo);
    const newQuantity = parseInt(input.value);

    // Validar que sea múltiplo del lote mínimo
    if (newQuantity % loteMinimo !== 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Cantidad inválida',
            text: `La cantidad debe ser múltiplo de ${loteMinimo} (lote mínimo)`,
            confirmButtonColor: '#0066B1'
        });
        
        // Restaurar valor anterior
        const currentItem = carritoMayorista.items.find(item => item.id === productId);
        if (currentItem) {
            input.value = currentItem.cantidad;
        }
        return;
    }

    if (newQuantity >= loteMinimo) {
        updateQuantityWithValidation(productId, newQuantity, loteMinimo);
    } else {
        // Restaurar valor anterior
        const currentItem = carritoMayorista.items.find(item => item.id === productId);
        if (currentItem) {
            input.value = currentItem.cantidad;
        }
    }
}

// Función para actualizar cantidad con validación
async function updateQuantityWithValidation(productId, newQuantity, loteMinimo) {
    try {
        // Mostrar loading breve
        Swal.fire({
            title: 'Actualizando lote...',
            html: `
                <div class="text-center">
                    <div class="spinner-border text-primary mb-2" role="status">
                        <span class="visually-hidden">Actualizando...</span>
                    </div>
                    <p>Actualizando cantidad del lote</p>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            timer: 800,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        await carritoMayorista.updateQuantity(productId, newQuantity, loteMinimo);
        renderCartItems();
        updateCartSummary();
    } catch (error) {
        console.error('Error al actualizar cantidad:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar la cantidad. Intenta nuevamente.',
            confirmButtonColor: '#0066B1'
        });
    }
}

// Función para actualizar el resumen del carrito
function updateCartSummary() {
    const subtotal = carritoMayorista.items.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    const discount = subtotal * 0.15; // Descuento mayorista 15%
    const subtotalWithDiscount = subtotal - discount;
    const iva = subtotalWithDiscount * 0.19; // IVA 19%
    const total = subtotalWithDiscount + iva; // Total final con IVA

    if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
    if (discountElement) discountElement.textContent = `-${formatPrice(discount)}`;
    
    // Buscar elementos adicionales para subtotal con descuento e IVA
    const subtotalDiscountedElement = document.getElementById('cart-subtotal-discounted');
    const ivaElement = document.getElementById('cart-iva');
    
    if (subtotalDiscountedElement) subtotalDiscountedElement.textContent = formatPrice(subtotalWithDiscount);
    if (ivaElement) ivaElement.textContent = formatPrice(iva);
    if (totalElement) totalElement.textContent = formatPrice(total);
}

// Función para remover un item
window.removeItem = async (productId) => {
    // Mostrar confirmación
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: '¿Quieres eliminar este producto del carrito?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        // Mostrar loading mientras se elimina
        Swal.fire({
            title: 'Eliminando producto...',
            html: `
                <div class="text-center">
                    <div class="spinner-border text-danger mb-3" role="status">
                        <span class="visually-hidden">Eliminando...</span>
                    </div>
                    <p>Eliminando producto del carrito</p>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            await carritoMayorista.removeItem(productId);
            renderCartItems();
            updateCartSummary();
            
            // Mostrar confirmación de éxito
            Swal.fire({
                icon: 'success',
                title: '¡Eliminado!',
                text: 'El producto ha sido eliminado del carrito.',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el producto. Intenta nuevamente.',
                confirmButtonColor: '#0066B1'
            });
        }
    }
};



// Event Listeners
checkoutBtn?.addEventListener('click', async () => {
    if (carritoMayorista.items.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Carrito Vacío',
            text: 'Agrega productos al carrito antes de proceder al pago.',
            confirmButtonColor: '#0066B1'
        });
        return;
    }

    await carritoMayorista.processOrder();
});

// Función para cargar el carrito con loading
async function loadCartWithLoading() {
    // Mostrar loading
    Swal.fire({
        title: 'Cargando carrito mayorista...',
        html: `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p>Cargando productos del carrito mayorista</p>
                <small class="text-muted">Esto puede tomar unos segundos</small>
            </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // Cargar el carrito desde Firebase/localStorage
        await carritoMayorista.loadCart();
        
        // Simular un pequeño delay para mostrar el loading
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Renderizar el carrito
        renderCartItems();
        updateCartSummary();
        
        // Cerrar el loading
        Swal.close();
    } catch (error) {
        console.error('Error al cargar el carrito mayorista:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el carrito mayorista. Por favor, recarga la página.',
            confirmButtonColor: '#0066B1'
        });
    }
}

// Verificar autenticación y tipo de usuario
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'iniciar-sesion.html';
        return;
    }

    // Cargar y renderizar el carrito con loading
    await loadCartWithLoading();
});

// Configurar cierre de sesión
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}); 