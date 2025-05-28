// Importar la clase del carrito
import ShoppingCart from './cart.js';
import { 
    getAuth, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    addDoc, 
    collection, 
    query, 
    where, 
    updateDoc, 
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { auth as firebaseAuth, db as firebaseDB } from './config/firebase-config.js';
import { webpayIntegration } from './webpay-integration.js';

class CartPage {
    constructor() {
        console.log('Inicializando CartPage');
        
        // Verificar la existencia de window.cart
        if (!window.cart) {
            console.error('window.cart no está definido. Creando nueva instancia.');
            window.cart = new ShoppingCart();
        }

        // Inicializar el carrito
        this.cart = window.cart;
        
        // Asegurar que window.cartPage esté definido globalmente
        window.cartPage = this;

        this.auth = firebaseAuth;
        this.db = firebaseDB;
        
        // Inicializar elementos
        this.initializeElements();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Renderizar el carrito al cargar la página
        this.renderCart();
        
        this.setupUserInfoListener();
        this.setupWebpayReturnHandler();

        // Depuración: mostrar contenido del carrito
        console.log('Contenido del carrito:', this.cart.items);
        console.log('Items en localStorage:', JSON.parse(localStorage.getItem('cart') || '[]'));
    }

    initializeElements() {
        this.cartItemsContainer = document.getElementById('cart-items-container');
        this.emptyCartMessage = document.getElementById('empty-cart-message');
        this.cartSubtotal = document.getElementById('cart-subtotal');
        this.cartTax = document.getElementById('cart-tax');
        this.cartTotal = document.getElementById('cart-total');
        this.checkoutButton = document.getElementById('checkout-button');
        this.clearCartButton = document.getElementById('clear-cart-button');

        // Elementos de información de usuario
        this.userNameElement = document.getElementById('cart-user-name');
        this.userEmailElement = document.getElementById('cart-user-email');
        this.userPhoneElement = document.getElementById('cart-user-phone');
        this.userAddressElement = document.getElementById('cart-user-address');

        console.log('Elementos inicializados:', {
            cartItemsContainer: !!this.cartItemsContainer,
            emptyCartMessage: !!this.emptyCartMessage,
            checkoutButton: !!this.checkoutButton,
            clearCartButton: !!this.clearCartButton
        });
    }

    setupUserInfoListener() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.loadUserInfo(user.uid);
            } else {
                this.clearUserInfo();
            }
        });
    }

    async loadUserInfo(userId) {
        try {
            const userDocRef = doc(this.db, 'usuarios', userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Actualizar elementos de información del usuario
                this.userNameElement.textContent = userData.nombreCompleto || '-';
                this.userEmailElement.textContent = userData.email || '-';
                this.userPhoneElement.textContent = userData.telefono || '-';
                
                // Construir dirección completa
                const direccionCompleta = userData.region && userData.comuna && userData.direccion 
                    ? `${userData.direccion}, ${userData.comuna}, ${userData.region}` 
                    : '-';
                this.userAddressElement.textContent = direccionCompleta;
            }
        } catch (error) {
            console.error('Error al cargar información del usuario:', error);
            this.clearUserInfo();
        }
    }

    clearUserInfo() {
        this.userNameElement.textContent = '-';
        this.userEmailElement.textContent = '-';
        this.userPhoneElement.textContent = '-';
        this.userAddressElement.textContent = '-';
    }

    setupEventListeners() {
        console.log('Configurando eventos del carrito');

        // Evento para vaciar carrito
        if (this.clearCartButton) {
            this.clearCartButton.removeEventListener('click', this.handleClearCart.bind(this));
            this.clearCartButton.addEventListener('click', this.handleClearCart.bind(this));
            console.log('Evento de limpiar carrito configurado');
        } else {
            console.error('Botón de limpiar carrito no encontrado');
        }

        // Evento para checkout
        if (this.checkoutButton) {
            this.checkoutButton.removeEventListener('click', this.handleCheckout.bind(this));
            this.checkoutButton.addEventListener('click', this.handleCheckout.bind(this));
            console.log('Evento de checkout configurado');
        } else {
            console.error('Botón de checkout no encontrado');
        }

        // Configurar eventos de los botones de cantidad y eliminación
        this.setupItemEventListeners();
    }

    setupItemEventListeners() {
        console.log('Configurando eventos de items del carrito');
        
        // Delegación de eventos para botones de cantidad y eliminación
        if (this.cartItemsContainer) {
            this.cartItemsContainer.removeEventListener('click', this.handleItemActions.bind(this));
            this.cartItemsContainer.addEventListener('click', this.handleItemActions.bind(this));
            console.log('Eventos de items del carrito configurados');
        } else {
            console.error('Contenedor de items del carrito no encontrado');
        }
    }

    handleItemActions(event) {
        const target = event.target;
        
        // Botón de reducir cantidad
        if (target.closest('.btn-outline-secondary:first-child')) {
            const productId = target.closest('.cart-item').dataset.id;
            const currentQuantityInput = target.closest('.quantity-control').querySelector('input');
            const currentQuantity = parseInt(currentQuantityInput.value);
            
            this.updateItemQuantity(productId, currentQuantity - 1);
            return;
        }
        
        // Botón de aumentar cantidad
        if (target.closest('.btn-outline-secondary:last-child')) {
            const productId = target.closest('.cart-item').dataset.id;
            const currentQuantityInput = target.closest('.quantity-control').querySelector('input');
            const currentQuantity = parseInt(currentQuantityInput.value);
            
            this.updateItemQuantity(productId, currentQuantity + 1);
            return;
        }
        
        // Botón de eliminar
        if (target.closest('.btn-outline-danger')) {
            const productId = target.closest('.cart-item').dataset.id;
            this.removeItem(productId);
            return;
        }
    }

    handleCheckout() {
        console.log('Iniciando proceso de checkout');
        
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Debes iniciar sesión para realizar una compra'
            });
            return;
        }

        const cartTotal = parseFloat(this.cartTotal.textContent.replace('$', ''));
        
        try {
            // Crear una transacción de Webpay
            webpayIntegration.createTransaction(
                cartTotal, 
                `user_${user.uid}_${Date.now()}`
            ).then(transactionData => {
                console.log('Datos de transacción:', transactionData);
                
                // Redirigir a Webpay para completar el pago
                window.location.href = transactionData.url;
            }).catch(error => {
                console.error('Error al crear transacción:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Pago',
                    text: 'No se pudo procesar el pago. Por favor, intenta nuevamente.'
                });
            });
        } catch (error) {
            console.error('Error en el checkout:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Pago',
                text: 'No se pudo procesar el pago. Por favor, intenta nuevamente.'
            });
        }
    }

    renderCart() {
        console.log('Método renderCart llamado');
        
        // Obtener items directamente de localStorage
        const storedCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const items = this.cart.items.length > 0 ? this.cart.items : storedCart;
        
        console.log('Items a renderizar:', items);
        
        // Forzar actualización de items en la instancia del carrito
        this.cart.items = items;
        
        if (items.length === 0) {
            this.showEmptyCartMessage();
            return;
        }

        this.hideEmptyCartMessage();
        this.renderItems(items);
        this.updateTotals();
    }

    renderItems(items) {
        console.log('Renderizando items:', items);
        
        // Limpiar contenedor antes de renderizar
        this.cartItemsContainer.innerHTML = '';

        // Renderizar cada item
        items.forEach(item => {
            console.log('Renderizando item individual:', item);
            
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.dataset.id = item.id;
            
            itemElement.innerHTML = `
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="${item.imagen}" alt="${item.nombre}" class="cart-item-image img-fluid rounded">
                    </div>
                    <div class="col-md-4">
                        <h5 class="mb-1">${item.nombre}</h5>
                        <p class="text-muted mb-0">Precio unitario: $${item.precio.toLocaleString()}</p>
                    </div>
                    <div class="col-md-3">
                        <div class="quantity-control input-group">
                            <button class="btn btn-outline-secondary" type="button">
                                <i class="bi bi-dash"></i>
                            </button>
                            <input type="number" class="form-control text-center" value="${item.quantity}" 
                                   min="1">
                            <button class="btn btn-outline-secondary" type="button">
                                <i class="bi bi-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-2 text-end">
                        <p class="h5 mb-0">$${(item.precio * item.quantity).toLocaleString()}</p>
                    </div>
                    <div class="col-md-1 text-end">
                        <button class="btn btn-outline-danger btn-sm" type="button">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            this.cartItemsContainer.appendChild(itemElement);
        });

        // Forzar visualización del contenedor de items
        this.cartItemsContainer.style.display = 'block';
        
        // Registrar número de items renderizados
        console.log(`Renderizados ${items.length} items en el carrito`);
    }

    updateTotals() {
        console.log('Actualizando totales');
        
        const subtotal = this.cart.items.reduce((total, item) => total + (item.precio * item.quantity), 0);
        const tax = subtotal * 0.19; // IVA 19%
        const total = subtotal + tax;

        console.log('Subtotal:', subtotal);
        console.log('IVA:', tax);
        console.log('Total:', total);

        // Actualizar elementos de totales
        if (this.cartSubtotal) this.cartSubtotal.textContent = `$${subtotal.toLocaleString()}`;
        if (this.cartTax) this.cartTax.textContent = `$${tax.toLocaleString()}`;
        if (this.cartTotal) this.cartTotal.textContent = `$${total.toLocaleString()}`;
    }

    showEmptyCartMessage() {
        console.log('Mostrando mensaje de carrito vacío');
        
        // Ocultar contenedor de items
        this.cartItemsContainer.style.display = 'none';
        
        // Mostrar mensaje de carrito vacío
        const emptyCartMessage = document.getElementById('empty-cart-message');
        if (emptyCartMessage) {
            emptyCartMessage.style.display = 'block';
        }
    }

    hideEmptyCartMessage() {
        console.log('Ocultando mensaje de carrito vacío');
        
        // Mostrar contenedor de items
        this.cartItemsContainer.style.display = 'block';
        
        // Ocultar mensaje de carrito vacío
        const emptyCartMessage = document.getElementById('empty-cart-message');
        if (emptyCartMessage) {
            emptyCartMessage.style.display = 'none';
        }
    }

    updateItemQuantity(productId, newQuantity) {
        console.log(`Actualizando cantidad para producto ${productId}:`, newQuantity);
        
        // Convertir a número entero
        newQuantity = parseInt(newQuantity);
        
        // Validar que la cantidad sea un número positivo
        if (isNaN(newQuantity) || newQuantity < 1) {
            Swal.fire({
                icon: 'warning',
                title: 'Cantidad inválida',
                text: 'Por favor, ingrese una cantidad válida mayor a 0'
            });
            return;
        }

        // Usar el método de la instancia de carrito
        this.cart.updateQuantity(productId, newQuantity);
        
        // Renderizar el carrito nuevamente
        this.renderCart();
    }

    removeItem(productId) {
        console.log('Eliminando producto:', productId);
        
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Quieres eliminar este producto del carrito?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Usar el método de la instancia de carrito
                this.cart.removeItem(productId);
                
                // Renderizar el carrito nuevamente
                this.renderCart();
                
                Swal.fire(
                    '¡Eliminado!',
                    'El producto ha sido eliminado del carrito.',
                    'success'
                );
            }
        });
    }

    handleClearCart() {
        console.log('Limpiando carrito completo');
        
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Se eliminarán todos los productos del carrito",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, vaciar carrito',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Usar el método de la instancia de carrito
                this.cart.clearCart();
                
                // Renderizar el carrito nuevamente
                this.renderCart();
                
                Swal.fire(
                    '¡Carrito vaciado!',
                    'Todos los productos han sido eliminados.',
                    'success'
                );
            }
        });
    }

    async confirmWebpayTransaction(token) {
        try {
            const transactionResult = await webpayIntegration.confirmTransaction(token);
            
            // Actualizar el estado de la orden en Firestore
            const db = getFirestore();
            const orderQuery = await getDocs(
                query(
                    collection(db, 'orders'), 
                    where('transactionToken', '==', token)
                )
            );

            if (!orderQuery.empty) {
                const orderDoc = orderQuery.docs[0];
                await updateDoc(doc(db, 'orders', orderDoc.id), {
                    status: transactionResult.status === 'AUTHORIZED' ? 'completed' : 'failed',
                    transactionDetails: transactionResult
                });
            }

            return transactionResult;
        } catch (error) {
            console.error('Error al confirmar transacción:', error);
            throw error;
        }
    }

    setupWebpayReturnHandler() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token_ws');
        
        if (token) {
            this.confirmWebpayTransaction(token)
                .then(result => {
                    Swal.fire({
                        icon: result.status === 'AUTHORIZED' ? 'success' : 'error',
                        title: result.status === 'AUTHORIZED' ? 'Pago Exitoso' : 'Pago Fallido',
                        text: result.status === 'AUTHORIZED' 
                            ? 'Tu pago ha sido procesado correctamente' 
                            : 'Hubo un problema con tu pago'
                    });
                    
                    // Limpiar el carrito si el pago fue exitoso
                    if (result.status === 'AUTHORIZED') {
                        localStorage.removeItem('cart');
                        document.getElementById('cart-items-container').innerHTML = '';
                        document.getElementById('empty-cart-message').style.display = 'block';
                    }
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo procesar la transacción'
                    });
                });
        }
    }
}

// Crear instancia global de la página del carrito
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado. Inicializando CartPage');
    window.cartPage = new CartPage();
}); 