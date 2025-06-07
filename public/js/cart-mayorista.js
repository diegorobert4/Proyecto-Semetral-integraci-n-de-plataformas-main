import { auth, db } from './config/firebase-config.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc,
    deleteDoc,
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { webpayIntegration } from './webpay-integration.js';
import { TRANSBANK_CONFIG } from './config/transbank-config.js';

// Referencias a elementos del DOM
let cartItemsContainer;
let emptyCartMessage;
let cartSubtotal;
let cartDiscount;
let cartTotal;
let checkoutButton;
let clearCartButton;
let cartCountElements;

class CarritoMayorista {
    constructor() {
        this.items = [];
        this.total = 0;
        this.onCartChange = null;
        this.init();
    }

    async init() {
        await this.loadCart();
        this.updateCartUI();
        this.setupEventListeners();
    }

    async loadCart() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const cartDoc = await getDoc(doc(db, 'carritos_mayorista', user.uid));
            if (cartDoc.exists()) {
                const data = cartDoc.data();
                this.items = data.items || [];
                this.total = this.calculateTotal();
                // Notificar cambios después de cargar
                if (this.onCartChange) this.onCartChange();
            }
        } catch (error) {
            console.error('Error al cargar el carrito:', error);
        }
    }

    calculateTotal() {
        const subtotal = this.items.reduce((total, item) => total + (item.precio * item.cantidad), 0);
        const discount = subtotal * 0.15; // Descuento mayorista 15%
        const subtotalWithDiscount = subtotal - discount;
        const iva = subtotalWithDiscount * 0.19; // IVA 19%
        return subtotalWithDiscount + iva; // Total final con IVA
    }

    updateCartUI() {
        const cartCountElements = document.querySelectorAll('.cart-count-mayorista');
        cartCountElements.forEach(element => {
            element.textContent = this.items.reduce((total, item) => total + item.cantidad, 0);
        });
        // Notificar cambios después de actualizar UI
        if (this.onCartChange) this.onCartChange();
    }

    async saveCart() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await setDoc(doc(db, 'carritos_mayorista', user.uid), {
                items: this.items,
                total: this.calculateTotal(),
                updatedAt: serverTimestamp()
            });
            // Notificar cambios después de guardar
            if (this.onCartChange) this.onCartChange();
        } catch (error) {
            console.error('Error al guardar el carrito:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo guardar el carrito. Por favor, intenta nuevamente.',
                confirmButtonColor: '#0066B1'
            });
        }
    }

    async addItem(product) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.cantidad += product.cantidad;
        } else {
            this.items.push(product);
        }

        this.total = this.calculateTotal();
        await this.saveCart();
        this.updateCartUI();

        // No mostrar modal automático - el modal se maneja desde el archivo mayorista.js
        // El modal personalizado se muestra desde la función agregarAlCarrito en mayorista.js
    }

    async removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.total = this.calculateTotal();
        await this.saveCart();
        this.updateCartUI();
    }

    async updateQuantity(productId, newQuantity, loteMinimo) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            // Asegurarse de que la cantidad sea múltiplo del lote mínimo
            const lotesRequeridos = Math.ceil(newQuantity / loteMinimo);
            item.cantidad = lotesRequeridos * loteMinimo;
            this.total = this.calculateTotal();
            await this.saveCart();
            this.updateCartUI();
        }
    }

    async clearCart() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await deleteDoc(doc(db, 'carritos_mayorista', user.uid));
            this.items = [];
            this.total = 0;
            
            // Limpiar también el localStorage
            localStorage.removeItem('carritoMayorista');
            
            // Disparar evento para actualizar contadores
            window.dispatchEvent(new CustomEvent('carritoMayoristaUpdated', { 
                detail: { cart: [], total: 0 }
            }));
            
            this.updateCartUI();
            // Notificar cambios después de limpiar
            if (this.onCartChange) this.onCartChange();
        } catch (error) {
            console.error('Error al limpiar el carrito:', error);
        }
    }

    async processOrder() {
        const user = auth.currentUser;
        if (!user || this.items.length === 0) return;

        try {
            // Calcular totales con IVA
            const subtotal = this.items.reduce((total, item) => total + (item.precio * item.cantidad), 0);
            const discount = subtotal * 0.15; // Descuento mayorista 15%
            const subtotalWithDiscount = subtotal - discount;
            const iva = subtotalWithDiscount * 0.19; // IVA 19%
            const totalFinal = subtotalWithDiscount + iva; // Total final con IVA

            // Crear la orden
            const orderData = {
                userId: user.uid,
                items: this.items,
                subtotal,
                discount,
                subtotalWithDiscount,
                iva,
                total: totalFinal,
                status: 'pending',
                createdAt: serverTimestamp(),
                tipo: 'mayorista'
            };

            // Guardar la orden en Firestore
            const orderRef = await addDoc(collection(db, 'ordenes_mayorista'), orderData);

            // Preparar datos para WebPay
            const sessionId = 'session_' + Date.now();
            const orderId = orderRef.id;
            const amount = Math.round(totalFinal); // WebPay requiere un número entero

            // Mostrar loading mientras se procesa
            Swal.fire({
                title: 'Procesando...',
                text: 'Conectando con Webpay',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Crear la transacción con Webpay usando la clase WebpayIntegration
            const transaction = await webpayIntegration.createTransaction(
                amount,
                sessionId,
                orderId,
                this.items,
                TRANSBANK_CONFIG.RETURN_URL_MAYORISTA // Usar la URL de retorno mayorista
            );

            // Cerrar el loading
            Swal.close();

            if (transaction.url && transaction.token) {
                // Actualizar la orden con el token de WebPay
                await updateDoc(doc(db, 'ordenes_mayorista', orderId), {
                    webpayToken: transaction.token,
                    sessionId: sessionId
                });

                // Limpiar el carrito antes de redirigir
                await this.clearCart();

                // Redirigir a WebPay
                window.location.href = `${transaction.url}?token_ws=${transaction.token}&orderId=${orderId}`;
            } else {
                throw new Error('No se recibieron los datos de WebPay correctamente');
            }
        } catch (error) {
            console.error('Error al procesar la orden:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error en el Proceso de Pago',
                text: 'No se pudo procesar el pago. Por favor, intenta nuevamente.',
                confirmButtonColor: '#0066B1'
            });
        }
    }

    setupEventListeners() {
        // Escuchar cambios en la autenticación
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.loadCart();
            } else {
                this.items = [];
                this.total = 0;
            }
            this.updateCartUI();
        });
    }
}

// Exportar una instancia del carrito y hacerla global
export const carritoMayorista = new CarritoMayorista();
window.carritoMayorista = carritoMayorista;

// Función para inicializar referencias del DOM
function initializeDOMReferences() {
    // Solo inicializar elementos si estamos en la página del carrito
    if (window.location.pathname.includes('carrito-mayorista.html')) {
        cartItemsContainer = document.getElementById('cart-items-container');
        emptyCartMessage = document.getElementById('empty-cart-message');
        cartSubtotal = document.getElementById('cart-subtotal');
        cartDiscount = document.getElementById('cart-discount');
        cartTotal = document.getElementById('cart-total');
        checkoutButton = document.getElementById('checkout-button');
        clearCartButton = document.getElementById('clear-cart-button');
        cartCountElements = document.querySelectorAll('.cart-count');

        // Agregar event listeners
        checkoutButton?.addEventListener('click', proceedToCheckout);
        clearCartButton?.addEventListener('click', clearCart);
    }
}

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', initializeDOMReferences);

// Función para formatear precios (sin decimales)
function formatPrice(price) {
    return `$${Math.round(price).toLocaleString()}`;
}

// Función para actualizar el contador del carrito
function updateCartCount(count) {
    cartCountElements?.forEach(element => {
        element.textContent = count;
    });
}

// Función para actualizar la cantidad de un producto
async function updateProductQuantity(productId, newQuantity, minLot) {
    try {
        const userId = auth.currentUser.uid;
        const cartRef = doc(db, 'carritos_mayorista', userId);
        const cartDoc = await getDoc(cartRef);
        
        if (cartDoc.exists()) {
            const cartData = cartDoc.data();
            const items = cartData.items || [];
            
            // Validar que la cantidad sea múltiplo del lote mínimo
            if (newQuantity % minLot !== 0) {
                throw new Error(`La cantidad debe ser múltiplo de ${minLot}`);
            }

            const itemIndex = items.findIndex(item => item.id === productId);
            if (itemIndex > -1) {
                if (newQuantity <= 0) {
                    items.splice(itemIndex, 1);
                } else {
                    items[itemIndex].cantidad = newQuantity;
                }
                
                await updateDoc(cartRef, { items });
                await loadCartItems();
            }
        }
    } catch (error) {
        console.error('Error al actualizar cantidad:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonColor: '#0066B1'
        });
    }
}

// Función para cargar la información del usuario
async function loadUserInfo(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('Datos del usuario:', userData); // Para debugging

            // Actualizar la información en el DOM
            const elements = {
                'cart-user-name': userData.nombre,
                'cart-company-rut': userData.rut,
                'cart-user-email': userData.email || auth.currentUser.email,
                'cart-user-phone': userData.telefono,
                'cart-user-address': userData.direccion
            };

            // Actualizar cada elemento si existe
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value || '-';
                }
            });
        } else {
            console.warn('No se encontró el documento del usuario');
        }
    } catch (error) {
        console.error('Error al cargar información del usuario:', error);
    }
}

// Función para cargar los items del carrito
async function loadCartItems() {
    try {
        // Verificar que los elementos del DOM existan, si no, intentar obtenerlos
        if (!cartItemsContainer) {
            cartItemsContainer = document.getElementById('cart-items-container');
        }
        if (!emptyCartMessage) {
            emptyCartMessage = document.getElementById('empty-cart-message');
        }
        if (!cartSubtotal) {
            cartSubtotal = document.getElementById('cart-subtotal');
        }
        if (!cartDiscount) {
            cartDiscount = document.getElementById('cart-discount');
        }
        if (!cartTotal) {
            cartTotal = document.getElementById('cart-total');
        }
        
        // Si aún no existen los elementos críticos, salir
        if (!cartItemsContainer || !emptyCartMessage) {
            console.warn('Elementos críticos del DOM no encontrados');
            return;
        }

        const userId = auth.currentUser.uid;
        
        // Cargar información del usuario primero
        await loadUserInfo(userId);

        const cartRef = doc(db, 'carritos_mayorista', userId);
        const cartDoc = await getDoc(cartRef);
        
        if (!cartDoc.exists() || !cartDoc.data().items || cartDoc.data().items.length === 0) {
            cartItemsContainer.style.display = 'none';
            emptyCartMessage.style.display = 'block';
            updateCartCount(0);
            return;
        }

        const items = cartDoc.data().items;
        updateCartCount(items.length);
        
        let subtotal = 0;
        const itemsHTML = items.map(item => {
            const itemTotal = item.precio * item.cantidad;
            subtotal += itemTotal;
            
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-2">
                                <img src="${item.imagen}" alt="${item.nombre}" class="cart-item-image rounded">
                            </div>
                            <div class="col-md-4">
                                <h5 class="card-title">${item.nombre}</h5>
                                <p class="card-text text-muted lot-info">
                                    ${item.cantidad / item.loteMinimo} lotes de ${item.loteMinimo} unidades
                                </p>
                            </div>
                            <div class="col-md-3">
                                <div class="input-group quantity-control">
                                    <button class="btn btn-outline-secondary" onclick="window.updateQuantity('${item.id}', ${item.cantidad - item.loteMinimo}, ${item.loteMinimo})">-</button>
                                    <input type="number" class="form-control text-center" value="${item.cantidad}" 
                                           min="${item.loteMinimo}" step="${item.loteMinimo}" 
                                           onchange="window.updateQuantity('${item.id}', this.value, ${item.loteMinimo})">
                                    <button class="btn btn-outline-secondary" onclick="window.updateQuantity('${item.id}', ${item.cantidad + item.loteMinimo}, ${item.loteMinimo})">+</button>
                                </div>
                            </div>
                            <div class="col-md-2 text-end">
                                <div class="fw-bold">${formatPrice(itemTotal)}</div>
                                <div class="text-muted small">${formatPrice(item.precio)} c/u</div>
                            </div>
                            <div class="col-md-1 text-end">
                                <button class="btn btn-link text-danger" onclick="window.removeItem('${item.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        cartItemsContainer.innerHTML = itemsHTML;
        cartItemsContainer.style.display = 'block';
        emptyCartMessage.style.display = 'none';

        // Actualizar totales
        const discount = subtotal * 0.15; // Descuento mayorista 15%
        const subtotalWithDiscount = subtotal - discount;
        const iva = subtotalWithDiscount * 0.19; // IVA 19%
        const total = subtotalWithDiscount + iva; // Total final con IVA

        if (cartSubtotal) cartSubtotal.textContent = formatPrice(subtotal);
        if (cartDiscount) cartDiscount.textContent = `-${formatPrice(discount)}`;
        
        // Nuevos elementos para mostrar subtotal con descuento e IVA
        const cartSubtotalDiscounted = document.getElementById('cart-subtotal-discounted');
        const cartIva = document.getElementById('cart-iva');
        
        if (cartSubtotalDiscounted) cartSubtotalDiscounted.textContent = formatPrice(subtotalWithDiscount);
        if (cartIva) cartIva.textContent = formatPrice(iva);
        if (cartTotal) cartTotal.textContent = formatPrice(total);

    } catch (error) {
        console.error('Error al cargar el carrito:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el carrito. Por favor, intenta de nuevo.',
            confirmButtonColor: '#0066B1'
        });
    }
}

// Función para eliminar un item del carrito
async function removeItem(productId) {
    try {
        const userId = auth.currentUser.uid;
        const cartRef = doc(db, 'carritos_mayorista', userId);
        const cartDoc = await getDoc(cartRef);
        
        if (cartDoc.exists()) {
            const items = cartDoc.data().items.filter(item => item.id !== productId);
            await updateDoc(cartRef, { items });
            await loadCartItems();
        }
    } catch (error) {
        console.error('Error al eliminar item:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar el producto. Por favor, intenta de nuevo.',
            confirmButtonColor: '#0066B1'
        });
    }
}

// Función para proceder al pago (IDÉNTICA al carrito normal)
async function proceedToCheckout() {
    console.log('Iniciando proceso de checkout mayorista');
    
    const user = auth.currentUser;
    if (!user) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Debes iniciar sesión para realizar la compra',
            footer: '<a href="../views/iniciar-sesion.html">Iniciar Sesión</a>'
        });
        return;
    }

    try {
        // Paso 1: Obtener monto total (idéntico al carrito normal)
        const totalText = document.getElementById('cart-total').textContent;
        const total = parseInt(totalText.replace(/[^\d]/g, ''));

        if (total <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Carrito vacío',
                text: 'Agrega productos al carrito antes de proceder al pago'
            });
            return;
        }

        // Paso 2: Generar un sessionId y orderId (idéntico al carrito normal)
        const sessionId = 'session_' + Date.now();
        const orderId = 'order_' + Date.now();

        // Paso 3: Obtener los items del carrito desde Firestore (adaptado para mayorista)
        const userId = auth.currentUser.uid;
        const cartRef = doc(db, 'carritos_mayorista', userId);
        const cartDoc = await getDoc(cartRef);
        
        if (!cartDoc.exists() || !cartDoc.data().items || cartDoc.data().items.length === 0) {
            throw new Error('El carrito mayorista está vacío');
        }

        // Preparar los items del carrito (adaptado para mayorista, usando 'cantidad' en lugar de 'quantity')
        const cartItems = cartDoc.data().items.map(item => ({
            id: item.id,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: item.cantidad
        }));

        // Mostrar loading mientras se procesa (idéntico al carrito normal)
        Swal.fire({
            title: 'Procesando...',
            text: 'Conectando con Webpay',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Paso 4: Crear la transacción con Webpay (usando URL de retorno mayorista)
        const transaction = await webpayIntegration.createTransaction(
            total, 
            sessionId, 
            orderId,
            cartItems,
            TRANSBANK_CONFIG.RETURN_URL_MAYORISTA // URL de retorno específica para mayorista
        );

        // Cerrar el loading (idéntico al carrito normal)
        Swal.close();

        // Paso 5: Redirigir al usuario a Webpay (idéntico al carrito normal)
        window.location.href = `${transaction.url}?token_ws=${transaction.token}`;
    } catch (error) {
        console.error('Error al iniciar el pago con Webpay:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al iniciar el pago',
            text: 'Ocurrió un problema al conectar con Webpay. Inténtalo nuevamente.'
        });
    }
}

// Función para vaciar el carrito
async function clearCart() {
    try {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Se eliminarán todos los productos del carrito',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, vaciar carrito',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const userId = auth.currentUser.uid;
            const cartRef = doc(db, 'carritos_mayorista', userId);
            await updateDoc(cartRef, { items: [] });
            
            // Limpiar también el localStorage
            localStorage.removeItem('carritoMayorista');
            
            // Limpiar instancia en memoria si existe
            if (window.carritoMayorista) {
                window.carritoMayorista.items = [];
                window.carritoMayorista.total = 0;
                window.carritoMayorista.updateCartUI();
            }
            
            // Disparar evento para actualizar contadores
            window.dispatchEvent(new CustomEvent('carritoMayoristaUpdated', { 
                detail: { cart: [], total: 0 }
            }));
            
            await loadCartItems();
            
            Swal.fire({
                icon: 'success',
                title: 'Carrito vaciado',
                text: 'Se han eliminado todos los productos del carrito',
                confirmButtonColor: '#0066B1'
            });
        }
    } catch (error) {
        console.error('Error al vaciar el carrito:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo vaciar el carrito. Por favor, intenta de nuevo.',
            confirmButtonColor: '#0066B1'
        });
    }
}

// Función para confirmar transacción de Webpay (IDÉNTICA al carrito normal)
async function confirmWebpayTransaction(token) {
    try {
        const transactionResult = await webpayIntegration.confirmTransaction(token);
        return transactionResult;
    } catch (error) {
        console.error('Error al confirmar transacción:', error);
        throw error;
    }
}

// Función para manejar el retorno de Webpay (IDÉNTICA al carrito normal)
function setupWebpayReturnHandler() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token_ws');
    
    console.log('setupWebpayReturnHandler ejecutado. Token:', token);
    
    if (token) {
        console.log('Token encontrado, confirmando transacción...');
        confirmWebpayTransaction(token)
            .then(async result => {
                console.log('Resultado de la transacción:', result);
                
                // No mostrar mensaje aquí - webpay-integration.js ya muestra el mensaje detallado
                
                // Solo limpiar el carrito si el pago fue exitoso (adaptado para mayorista)
                if (result.status === 'AUTHORIZED') {
                    console.log('Pago autorizado, procediendo a limpiar el carrito...');
                    try {
                        // Limpiar carrito mayorista en Firestore (con await)
                        const userId = auth.currentUser?.uid;
                        if (!userId) {
                            console.error('Usuario no autenticado al intentar limpiar carrito');
                            return;
                        }
                        
                        console.log('Limpiando carrito en Firestore para usuario:', userId);
                        const cartRef = doc(db, 'carritos_mayorista', userId);
                        await updateDoc(cartRef, { items: [] });
                        
                        console.log('Carrito limpiado en Firestore, recargando interfaz...');
                        // Recargar completamente la interfaz del carrito
                        await loadCartItems();
                        
                        // También limpiar la instancia del carrito mayorista en memoria
                        if (window.carritoMayorista) {
                            console.log('Limpiando instancia en memoria...');
                            window.carritoMayorista.items = [];
                            window.carritoMayorista.total = 0;
                            window.carritoMayorista.updateCartUI();
                        }
                        
                        // Limpiar también el localStorage del carrito mayorista
                        console.log('Limpiando localStorage del carrito mayorista...');
                        localStorage.removeItem('carritoMayorista');
                        
                        // Disparar evento para actualizar contadores en otras páginas
                        window.dispatchEvent(new CustomEvent('carritoMayoristaUpdated', { 
                            detail: { cart: [], total: 0 }
                        }));
                        
                        console.log('Carrito mayorista vaciado exitosamente después del pago');
                    } catch (error) {
                        console.error('Error al vaciar el carrito después del pago:', error);
                    }
                } else {
                    console.log('Pago no autorizado, estado:', result.status);
                }
            })
            .catch(error => {
                console.error('Error al confirmar transacción:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo procesar la transacción'
                });
            });
    } else {
        console.log('No se encontró token en la URL');
    }
}

// Función para actualizar la información del usuario en el navbar
async function updateUserInfo(user) {
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Actualizar el nombre de usuario en el navbar con el email
            const userNameElements = document.querySelectorAll('.user-name');
            userNameElements.forEach(element => {
                element.textContent = userData.email || user.email;
            });
        }
    } catch (error) {
        console.error('Error al cargar información del usuario:', error);
    }
}

// Exponer funciones necesarias globalmente
window.updateQuantity = updateProductQuantity;
window.removeItem = removeItem;

// Inicializar instancia global del carrito mayorista
let carritoMayoristaInstance;

// Función para inicializar carrito mayorista global
export function initializeCarritoMayorista() {
    if (!carritoMayoristaInstance) {
        carritoMayoristaInstance = new CarritoMayorista();
        window.cartMayorista = carritoMayoristaInstance;
        console.log('✅ Carrito mayorista inicializado globalmente');
    }
    return carritoMayoristaInstance;
}

// Inicializar instancia global inmediatamente
initializeCarritoMayorista();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMReferences();
    
    // Configurar manejo de retorno de Webpay (igual que carrito normal)
    setupWebpayReturnHandler();
    
    // Verificar autenticación
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Si estamos en la página del carrito mayorista, redirigir
            if (window.location.pathname.includes('carrito-mayorista')) {
                window.location.href = '../views/iniciar-sesion.html';
                return;
            }
            // Si estamos en index.html, solo limpiar el carrito
            if (window.cartMayorista) {
                window.cartMayorista.items = [];
                window.cartMayorista.total = 0;
                window.cartMayorista.updateCartUI();
            }
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
            
            // Si estamos en la página del carrito mayorista, verificar tipo de usuario
            if (window.location.pathname.includes('carrito-mayorista')) {
                if (!userDoc.exists() || userDoc.data().tipo !== 'mayorista') {
                    window.location.href = '../views/index.html';
                    return;
                }
                
                // Actualizar la información del usuario en el navbar
                await updateUserInfo(user);
                
                // Cargar información del usuario
                await loadUserInfo(user.uid);

                // Cargar carrito
                await loadCartItems();
            } else {
                // Si estamos en index.html, cargar el carrito para mayoristas
                if (userDoc.exists() && userDoc.data().tipo === 'mayorista' && window.cartMayorista) {
                    await window.cartMayorista.loadCart();
                }
            }
        } catch (error) {
            console.error('Error al verificar usuario:', error);
            if (window.location.pathname.includes('carrito-mayorista')) {
                window.location.href = '../views/index.html';
            }
        }
    });
}); 