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
        
        // Renderizar el carrito al cargar la página con loading
        this.renderCartWithLoading();
        
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
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                await this.loadUserInfo(user.uid);
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
            
            // Evento para cambios directos en el input de cantidad
            this.cartItemsContainer.removeEventListener('change', this.handleQuantityInputChange.bind(this));
            this.cartItemsContainer.addEventListener('change', this.handleQuantityInputChange.bind(this));
            
            console.log('Eventos de items del carrito configurados');
        } else {
            console.error('Contenedor de items del carrito no encontrado');
        }
    }

    handleQuantityInputChange(event) {
        const target = event.target;
        
        // Verificar si es un input de cantidad
        if (target.type === 'number' && target.closest('.quantity-control')) {
            const productId = target.closest('.cart-item').dataset.id;
            const newQuantity = parseInt(target.value);
            
            // Validar rango
            if (newQuantity >= 1 && newQuantity <= 99) {
                this.updateItemQuantity(productId, newQuantity);
            } else {
                // Restaurar valor anterior si está fuera del rango
                const currentItem = this.cart.items.find(item => item.id === productId);
                if (currentItem) {
                    target.value = currentItem.quantity;
                }
            }
        }
    }

    handleItemActions(event) {
        const target = event.target;
        const button = target.closest('button');
        
        if (!button) return;
        
        // Botón de reducir cantidad (primer botón en el control de cantidad)
        if (button.classList.contains('btn-outline-primary') && button.querySelector('.bi-dash-lg')) {
            const productId = button.closest('.cart-item').dataset.id;
            const currentQuantityInput = button.closest('.quantity-control').querySelector('input');
            const currentQuantity = parseInt(currentQuantityInput.value);
            
            if (currentQuantity > 1) {
                this.updateItemQuantity(productId, currentQuantity - 1);
            }
            return;
        }
        
        // Botón de aumentar cantidad (segundo botón en el control de cantidad)
        if (button.classList.contains('btn-outline-primary') && button.querySelector('.bi-plus-lg')) {
            const productId = button.closest('.cart-item').dataset.id;
            const currentQuantityInput = button.closest('.quantity-control').querySelector('input');
            const currentQuantity = parseInt(currentQuantityInput.value);
            
            if (currentQuantity < 99) {
                this.updateItemQuantity(productId, currentQuantity + 1);
            }
            return;
        }
        
        // Botón de eliminar
        if (button.classList.contains('btn-outline-danger')) {
            const productId = button.closest('.cart-item').dataset.id;
            this.removeItem(productId);
            return;
        }
    }

    async handleCheckout() {
        console.log('Iniciando proceso de checkout');
        
        const auth = getAuth();
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
            // Paso 1: Obtener monto total
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

            // Paso 2: Generar un sessionId y orderId
            const sessionId = 'session_' + Date.now();
            const orderId = 'order_' + Date.now();

            // Paso 3: Preparar los items del carrito
            const cartItems = this.cart.items.map(item => ({
                id: item.id,
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.quantity
            }));

            // Mostrar loading mientras se procesa
            Swal.fire({
                title: 'Iniciando pago...',
                html: `
                    <div class="text-center">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Procesando...</span>
                        </div>
                        <p>Conectando con WebPay</p>
                        <small class="text-muted">Preparando tu transacción segura</small>
                    </div>
                `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Paso 4: Crear la transacción con Webpay
            const transaction = await webpayIntegration.createTransaction(
                total, 
                sessionId, 
                orderId,
                cartItems
            );

            // Cerrar el loading
            Swal.close();

            // Paso 5: Redirigir al usuario a Webpay
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

    async renderCartWithLoading() {
        // Detectar si venimos de WebPay
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token_ws');
        
        // Mostrar loading específico según el contexto
        Swal.fire({
            title: token ? 'Regresando de WebPay...' : 'Cargando carrito...',
            html: `
                <div class="text-center">
                    <div class="spinner-border ${token ? 'text-success' : 'text-primary'} mb-3" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p>${token ? 'Procesando resultado del pago' : 'Cargando productos del carrito'}</p>
                    ${token ? '<small class="text-muted">No cierres esta ventana</small>' : ''}
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
            // Delay más largo si venimos de WebPay para mostrar el mensaje específico
            const delay = token ? 1000 : 500;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Renderizar el carrito
            this.renderCart();
            
            // Cerrar el loading
            Swal.close();
        } catch (error) {
            console.error('Error al cargar el carrito:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar el carrito. Por favor, recarga la página.'
            });
        }
    }

    renderCart() {
        console.log('Método renderCart llamado');
        
        try {
            // Obtener items del localStorage y validar su estructura
            const storedCart = localStorage.getItem('cart');
            let items = [];
            
            if (storedCart) {
                try {
                    items = JSON.parse(storedCart);
                    console.log('Items cargados del localStorage:', items);
                } catch (e) {
                    console.error('Error al parsear el carrito del localStorage:', e);
                    items = [];
                }
            }

            // Usar items del carrito en memoria si están disponibles
            if (this.cart && this.cart.items && this.cart.items.length > 0) {
                items = this.cart.items;
                console.log('Usando items del carrito en memoria:', items);
            }

            // Validar que cada item tenga las propiedades necesarias
            items = items.filter(item => {
                const isValid = item && 
                              item.id && 
                              item.nombre && 
                              typeof item.precio === 'number' && 
                              item.imagen &&
                              typeof item.quantity === 'number';
                
                if (!isValid) {
                    console.warn('Item inválido encontrado:', item);
                }
                return isValid;
            });

            // Actualizar items en la instancia del carrito
            if (this.cart) {
                this.cart.items = items;
            }

            if (items.length === 0) {
                this.showEmptyCartMessage();
                this.updateTotals(); // Actualizar totales incluso si está vacío
                return;
            }

            this.hideEmptyCartMessage();
            this.renderItems(items);
            this.updateTotals();
            
            // Actualizar el contador global del carrito
            if (this.cart) {
                this.cart.updateCartCount();
            }
        } catch (error) {
            console.error('Error al renderizar el carrito:', error);
            this.showEmptyCartMessage();
            this.updateTotals();
        }
    }

    renderItems(items) {
        if (!this.cartItemsContainer) {
            console.error('El contenedor del carrito no existe');
            return;
        }

        console.log('Renderizando items:', items);
        
        try {
            // Limpiar contenedor antes de renderizar
            this.cartItemsContainer.innerHTML = `
                <div class="list-group">
                    ${items.map(item => `
                        <div class="list-group-item cart-item" data-id="${item.id}">
                            <div class="row g-3 align-items-center">
                                <!-- Imagen del producto -->
                                <div class="col-12 col-md-2">
                                    <img src="${item.imagen}" 
                                         alt="${item.nombre}" 
                                         class="img-fluid rounded"
                                         style="width: 100px; height: 100px; object-fit: cover;"
                                         onerror="this.src='../images/placeholder.jpg'">
                                </div>
                                
                                <!-- Información del producto -->
                                <div class="col-12 col-md-4">
                                    <h5 class="mb-1">${item.nombre}</h5>
                                    <p class="text-muted mb-0">
                                        <small>Precio unitario: </small>
                                        <span class="fw-bold">$${item.precio.toLocaleString()}</span>
                                    </p>
                                </div>
                                
                                <!-- Control de cantidad -->
                                <div class="col-12 col-md-3">
                                    <div class="quantity-control input-group">
                                        <button class="btn btn-outline-primary" type="button" title="Disminuir cantidad">
                                            <i class="bi bi-dash-lg"></i>
                                        </button>
                                        <input type="number" 
                                               class="form-control text-center" 
                                               value="${item.quantity}" 
                                               min="1" 
                                               max="99"
                                               aria-label="Cantidad del producto">
                                        <button class="btn btn-outline-primary" type="button" title="Aumentar cantidad">
                                            <i class="bi bi-plus-lg"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Subtotal -->
                                <div class="col-6 col-md-2 text-end">
                                    <p class="h5 mb-0">$${(item.precio * item.quantity).toLocaleString()}</p>
                                    <small class="text-muted">Subtotal</small>
                                </div>
                                
                                <!-- Botón eliminar -->
                                <div class="col-6 col-md-1 text-end">
                                    <button class="btn btn-outline-danger" type="button" title="Eliminar producto">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Agregar estilos adicionales
            const style = document.createElement('style');
            style.textContent = `
                .cart-item {
                    transition: all 0.3s ease;
                    border: 1px solid #dee2e6;
                    margin-bottom: 1rem;
                }
                .cart-item:hover {
                    background-color: #f8f9fa;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .quantity-control {
                    max-width: 150px;
                }
                .quantity-control input {
                    text-align: center;
                    font-weight: bold;
                    font-size: 1.1rem;
                    border-left: none;
                    border-right: none;
                    background-color: #f8f9fa;
                    -moz-appearance: textfield;
                    padding: 0.5rem 0.25rem;
                }
                .quantity-control input:focus {
                    background-color: #fff;
                    border-color: #0d6efd;
                    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
                }
                .quantity-control input::-webkit-outer-spin-button,
                .quantity-control input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .quantity-control .btn {
                    border: 1px solid #dee2e6;
                    padding: 0.5rem 0.75rem;
                }
                .quantity-control .btn:hover {
                    background-color: #0d6efd;
                    border-color: #0d6efd;
                    color: white;
                }
                @media (max-width: 768px) {
                    .cart-item {
                        padding: 1rem;
                    }
                    .quantity-control {
                        max-width: 100%;
                    }
                }
            `;
            document.head.appendChild(style);

            // Forzar visualización del contenedor de items
            this.cartItemsContainer.style.display = 'block';
            
            // Configurar event listeners para los items renderizados
            this.setupItemEventListeners();
            
            console.log(`Renderizados ${items.length} items en el carrito`);
        } catch (error) {
            console.error('Error al renderizar items:', error);
            this.showEmptyCartMessage();
        }
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

    async updateItemQuantity(productId, newQuantity) {
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

        // Mostrar loading breve
        Swal.fire({
            title: 'Actualizando...',
            html: `
                <div class="text-center">
                    <div class="spinner-border text-primary mb-2" role="status">
                        <span class="visually-hidden">Actualizando...</span>
                    </div>
                    <p>Actualizando cantidad</p>
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

        try {
            // Usar el método de la instancia de carrito
            this.cart.updateQuantity(productId, newQuantity);
            
            // Renderizar el carrito nuevamente
            this.renderCart();
        } catch (error) {
            console.error('Error al actualizar cantidad:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar la cantidad.'
            });
        }
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
        }).then(async (result) => {
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
                    // Usar el método de la instancia de carrito
                    this.cart.removeItem(productId);
                    
                    // Renderizar el carrito nuevamente
                    this.renderCart();
                    
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
                        text: 'No se pudo eliminar el producto. Intenta nuevamente.'
                    });
                }
            }
        });
    }

    handleClearCart() {
        console.log('Limpiando carrito completo');
        
        if (this.cart.items.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Carrito Vacío',
                text: 'No hay productos en el carrito para eliminar.'
            });
            return;
        }

        Swal.fire({
            title: '¿Estás seguro?',
            text: "Se eliminarán todos los productos del carrito",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, vaciar carrito',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Mostrar loading mientras se limpia
                Swal.fire({
                    title: 'Vaciando carrito...',
                    html: `
                        <div class="text-center">
                            <div class="spinner-border text-warning mb-3" role="status">
                                <span class="visually-hidden">Vaciando...</span>
                            </div>
                            <p>Eliminando todos los productos</p>
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
                    // Usar el método de la instancia de carrito
                    this.cart.clearCart();
                    
                    // Forzar la actualización de la interfaz
                    this.cartItemsContainer.innerHTML = '';
                    this.showEmptyCartMessage();
                    this.updateTotals();
                    
                    // Actualizar el contador global del carrito
                    const cartCountElements = document.querySelectorAll('.cart-count');
                    cartCountElements.forEach(element => {
                        element.textContent = '0';
                    });
                    
                    Swal.fire({
                        icon: 'success',
                        title: '¡Carrito vaciado!',
                        text: 'Todos los productos han sido eliminados.',
                        showConfirmButton: false,
                        timer: 1500
                    });
                } catch (error) {
                    console.error('Error al vaciar el carrito:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo vaciar el carrito. Por favor, intenta nuevamente.'
                    });
                }
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
            console.log('🔍 Token WebPay detectado, iniciando confirmación...');
            
            // Mostrar loading inmediato al detectar el token
            Swal.fire({
                title: 'Verificando pago...',
                html: `
                    <div class="text-center">
                        <div class="spinner-border text-success mb-3" role="status">
                            <span class="visually-hidden">Verificando...</span>
                        </div>
                        <p>Conectando con el banco...</p>
                        <small class="text-muted">Verificando el estado de tu transacción</small>
                    </div>
                `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Pequeño delay para mostrar el mensaje inicial
            setTimeout(() => {
                this.confirmWebpayTransaction(token)
                    .then(async result => {
                        // No mostrar mensaje aquí - webpay-integration.js ya muestra el mensaje detallado
                        
                        // Solo limpiar el carrito si el pago fue exitoso
                        if (result.status === 'AUTHORIZED') {
                            console.log('🎉 Pago autorizado, limpiando carrito...');
                            
                            try {
                                // Limpiar carrito del localStorage
                                localStorage.removeItem('cart');
                                console.log('✅ localStorage cart limpiado');
                                
                                // Limpiar instancia del carrito en memoria
                                if (this.cart) {
                                    this.cart.clearCart();
                                    console.log('✅ Instancia del carrito limpiada');
                                }
                                
                                // Limpiar instancia global del carrito
                                if (window.cart) {
                                    window.cart.clearCart();
                                    console.log('✅ Carrito global limpiado');
                                }
                                
                                // Actualizar la interfaz
                                if (document.getElementById('cart-items-container')) {
                                    document.getElementById('cart-items-container').innerHTML = '';
                                }
                                if (document.getElementById('empty-cart-message')) {
                                    document.getElementById('empty-cart-message').style.display = 'block';
                                }
                                
                                // Actualizar totales
                                this.updateTotals();
                                
                                // Actualizar contadores del carrito en toda la aplicación
                                const cartCountElements = document.querySelectorAll('.cart-count');
                                cartCountElements.forEach(element => {
                                    element.textContent = '0';
                                });
                                
                                // Disparar evento para que otras partes de la aplicación se actualicen
                                window.dispatchEvent(new CustomEvent('cartCleared'));
                                
                                console.log('🎉 Carrito completamente limpiado después del pago exitoso');
                            } catch (error) {
                                console.error('❌ Error al limpiar el carrito:', error);
                            }
                        }
                    })
                    .catch(error => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudo procesar la transacción'
                        });
                    });
            }, 500);
        }
    }
}

// Crear instancia global de la página del carrito
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado. Inicializando CartPage');
    window.cartPage = new CartPage();
}); 