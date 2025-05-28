// Clase para manejar el carrito de compras
export default class ShoppingCart {
    constructor() {
        // Intentar cargar el carrito desde localStorage
        const savedCart = localStorage.getItem('cart');
        this.items = savedCart ? this.parseCartItems(JSON.parse(savedCart)) : [];
        
        // Asegurar que window.cart esté definido
        window.cart = this;

        // Actualizar el contador de carrito al inicializar
        this.updateCartCount();

        console.log('Carrito inicializado:', this.items);
    }

    // Método para parsear y validar items del carrito
    parseCartItems(items) {
        return items.map(item => ({
            id: item.id,
            nombre: item.nombre,
            precio: item.precio,
            imagen: item.imagen,
            quantity: item.quantity || 1
        }));
    }

    // Guardar el carrito en localStorage
    saveCart() {
        console.log('Guardando carrito:', this.items);
        localStorage.setItem('cart', JSON.stringify(this.items));
        this.updateCartCount();
    }

    // Agregar un producto al carrito
    addItem(product) {
        console.log('Agregando producto al carrito:', product);

        // Verificar si el producto ya existe en el carrito
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            // Incrementar cantidad si ya existe
            existingItem.quantity += 1;
        } else {
            // Agregar nuevo item con cantidad 1
            const newItem = {
                id: product.id,
                nombre: product.nombre,
                precio: product.precio,
                imagen: product.imagen,
                quantity: 1
            };
            this.items.push(newItem);
            console.log('Nuevo item agregado:', newItem);
        }
        
        // Guardar en localStorage
        this.saveCart();
        
        // Mostrar notificación de producto agregado
        this.showAddedToCartNotification(product);
    }

    // Actualizar cantidad de un producto
    updateQuantity(productId, newQuantity) {
        console.log(`Actualizando cantidad del producto ${productId}:`, newQuantity);
        
        // Encontrar el item en el carrito
        const itemIndex = this.items.findIndex(item => item.id === productId);
        
        if (itemIndex !== -1) {
            // Actualizar cantidad
            if (newQuantity > 0) {
                this.items[itemIndex].quantity = newQuantity;
            } else {
                // Eliminar si la cantidad es 0 o negativa
                this.items.splice(itemIndex, 1);
            }
            
            // Guardar cambios
            this.saveCart();
        }
    }

    // Remover un producto del carrito
    removeItem(productId) {
        console.log('Eliminando producto del carrito:', productId);
        
        // Filtrar para eliminar el item específico
        this.items = this.items.filter(item => item.id !== productId);
        
        // Guardar en localStorage
        this.saveCart();
    }

    // Limpiar el carrito
    clearCart() {
        console.log('Limpiando carrito completamente');
        
        // Limpiar items
        this.items = [];
        
        // Limpiar localStorage
        localStorage.removeItem('cart');
        
        // Actualizar contador de carrito
        this.updateCartCount();
    }

    // Calcular el total del carrito
    getTotal() {
        // Calcular total sumando (precio * cantidad) de cada item
        return this.items.reduce((total, item) => total + (item.precio * item.quantity), 0);
    }

    // Obtener el total de items en el carrito
    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Actualizar la visualización del carrito
    updateCartDisplay() {
        // Actualizar el contenido del dropdown
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        
        if (cartItems) {
            if (this.items.length === 0) {
                cartItems.innerHTML = `
                    <div class="text-center py-3">
                        <i class="bi bi-cart-x fs-1 text-muted"></i>
                        <p class="text-muted mb-0">Tu carrito está vacío</p>
                    </div>
                `;
            } else {
                cartItems.innerHTML = this.items.map(item => `
                    <div class="cart-item mb-3">
                        <div class="d-flex align-items-center">
                            <img src="${item.imagen}" alt="${item.nombre}" 
                                style="width: 50px; height: 50px; object-fit: cover;" 
                                class="rounded me-3">
                            <div class="flex-grow-1">
                                <h6 class="mb-0 text-truncate" style="max-width: 150px;">${item.nombre}</h6>
                                <small class="text-muted">
                                    ${item.quantity} x $${item.precio.toLocaleString()}
                                </small>
                            </div>
                            <div class="text-end ms-3">
                                <small class="d-block text-muted">
                                    $${(item.precio * item.quantity).toLocaleString()}
                                </small>
                                <button class="btn btn-sm btn-outline-danger mt-1" onclick="cart.removeItem('${item.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        if (cartTotal) {
            cartTotal.textContent = `$${this.getTotal().toLocaleString()}`;
        }
    }

    // Actualizar contador de carrito
    updateCartCount() {
        // Actualizar contador de items en el carrito
        const cartCountElements = document.querySelectorAll('.cart-count');
        const totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
        
        cartCountElements.forEach(element => {
            element.textContent = totalItems;
        });
    }

    // Mostrar notificación de producto agregado
    showAddedToCartNotification(product) {
        Swal.fire({
            icon: 'success',
            title: '¡Producto agregado!',
            html: `
                <div class="d-flex flex-column align-items-center">
                    <img src="${product.imagen}" alt="${product.nombre}" style="max-width: 100px; max-height: 100px; object-fit: cover;">
                    <p class="mt-2">${product.nombre}</p>
                    <p class="text-muted">Precio: $${product.precio.toLocaleString()}</p>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Ir al Carrito',
            showCancelButton: true,
            cancelButtonText: 'Seguir Comprando'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '../views/carrito.html';
            }
        });
    }
}

// Crear una instancia global del carrito
const cart = new ShoppingCart();
window.cart = cart; 