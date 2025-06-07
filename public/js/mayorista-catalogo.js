import { 
    auth, 
    db 
} from './config/firebase-config.js';
import { 
    collection,
    query,
    getDocs,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class MayoristaCatalog {
    constructor() {
        this.DESCUENTO_MAYORISTA = 0.15; // 15% de descuento
        this.LOTE_MINIMO = 5; // Lote mínimo de 5 unidades
        this.products = []; // Almacenar productos cargados
        this.brands = new Set(); // Almacenar marcas únicas
        this.setupEventListeners();
        this.loadProducts();
        this.checkMayoristaAccess();
        this.initializeCartCounter();
    }

    async checkMayoristaAccess() {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'iniciar-sesion.html';
                return;
            }

            // Verificar si el usuario es mayorista
            const userDoc = await getDocs(query(
                collection(db, 'usuarios'),
                where('email', '==', user.email),
                where('tipo', '==', 'mayorista'),
                where('validado', '==', true)
            ));

            if (userDoc.empty) {
                window.location.href = 'mayoristas.html';
                return;
            }
        });
    }

    setupEventListeners() {
        // Búsqueda de productos
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterProducts();
            });
        }

        // Filtro por categoría
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filterProducts();
            });
        }

        // Filtro por marca
        const brandFilter = document.getElementById('brandFilter');
        if (brandFilter) {
            brandFilter.addEventListener('change', () => {
                this.filterProducts();
            });
        }
    }

    async loadProducts() {
        try {
            const productosRef = collection(db, 'productos');
            const q = query(productosRef, orderBy('nombre'));
            const snapshot = await getDocs(q);
            
            const productGrid = document.getElementById('productGrid');
            if (!productGrid) return;

            productGrid.innerHTML = '';
            
            if (snapshot.empty) {
                productGrid.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            No hay productos disponibles en este momento.
                        </div>
                    </div>
                `;
                return;
            }

            snapshot.forEach(doc => {
                const producto = doc.data();
                producto.id = doc.id; // Agregar ID al producto
                this.products.push(producto); // Almacenar en el array

                // Agregar marca al conjunto de marcas si existe
                if (producto.marca) {
                    this.brands.add(producto.marca);
                }
            });

            // Llenar el filtro de marcas
            this.populateBrandFilter();

            // Renderizar productos
            this.renderProducts();
        } catch (error) {
            console.error('Error al cargar productos:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los productos. Por favor, intente nuevamente.'
            });
        }
    }

    populateBrandFilter() {
        const brandFilter = document.getElementById('brandFilter');
        if (!brandFilter) return;

        // Limpiar opciones existentes excepto la primera
        brandFilter.innerHTML = '<option value="todas">Todas las marcas</option>';

        // Agregar marcas ordenadas alfabéticamente
        const sortedBrands = Array.from(this.brands).sort();
        sortedBrands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.toLowerCase();
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
    }

    renderProducts() {
        const productGrid = document.getElementById('productGrid');
        if (!productGrid) return;

        productGrid.innerHTML = '';

        this.products.forEach(producto => {
            // Usar precio mayorista definido o calcular descuento automático
            const precioMayorista = producto.precioMayorista || (producto.precio * (1 - this.DESCUENTO_MAYORISTA));
            const descuento = Math.round(((producto.precio - precioMayorista) / producto.precio) * 100);
            
            const card = document.createElement('div');
            card.className = 'col';
            card.innerHTML = `
                <div class="card catalog-card h-100" 
                     data-category="${producto.categoria}" 
                     data-nombre="${producto.nombre.toLowerCase()}"
                     data-brand="${(producto.marca || '').toLowerCase()}">
                    <span class="discount-badge">-${descuento}%</span>
                    <span class="badge bg-warning position-absolute top-0 end-0 m-2" style="z-index: 3;">
                        Lote mín: ${this.LOTE_MINIMO}
                    </span>
                    <img src="${producto.imagen || '../assets/img/producto-default.jpg'}" 
                         class="card-img-top" 
                         alt="${producto.nombre}"
                         onerror="this.src='../assets/img/producto-default.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${producto.nombre}</h5>
                        <p class="card-text">${producto.descripcion}</p>
                        ${producto.marca ? `<div class="mb-2"><span class="badge bg-info">${producto.marca}</span></div>` : ''}
                        <div class="price-section mb-3">
                            <p class="price-original mb-0 text-decoration-line-through text-muted">$${producto.precio.toLocaleString()}</p>
                            <p class="price-mayorista mb-0 text-success fw-bold">$${Math.round(precioMayorista).toLocaleString()}</p>
                            <small class="text-info">Precio por unidad</small>
                        </div>
                        
                        <div class="quantity-section mb-3">
                            <label class="form-label small text-muted">Cantidad (mínimo ${this.LOTE_MINIMO} unidades):</label>
                            <div class="input-group input-group-sm">
                                <button class="btn btn-outline-secondary quantity-decrease" type="button" data-id="${producto.id}">
                                    <i class="bi bi-dash"></i>
                                </button>
                                <input type="number" class="form-control text-center quantity-input" 
                                       data-id="${producto.id}" 
                                       value="${this.LOTE_MINIMO}" 
                                       min="${this.LOTE_MINIMO}" 
                                       step="${this.LOTE_MINIMO}" 
                                       readonly>
                                <button class="btn btn-outline-secondary quantity-increase" type="button" data-id="${producto.id}">
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>
                            <small class="text-muted">Lote mínimo: ${this.LOTE_MINIMO} unidades</small>
                        </div>
                        
                        <div class="total-price-section mb-3">
                            <strong class="text-primary">Total: $<span class="total-price" data-id="${producto.id}">${(Math.round(precioMayorista) * this.LOTE_MINIMO).toLocaleString()}</span></strong>
                        </div>
                        
                        <button class="btn btn-primary w-100 add-to-cart" data-id="${producto.id}" data-precio="${precioMayorista}">
                            <i class="bi bi-cart-plus me-2"></i>Agregar al Carrito
                        </button>
                        <small class="text-muted d-block mt-2">Stock: ${producto.stock || 0} unidades</small>
                    </div>
                </div>
            `;

            // Agregar evento al botón de agregar al carrito
            const addToCartBtn = card.querySelector('.add-to-cart');
            addToCartBtn.addEventListener('click', () => {
                const quantityInput = card.querySelector('.quantity-input');
                let quantity = parseInt(quantityInput.value);
                
                // Validar que la cantidad sea múltiplo del lote mínimo
                if (quantity % this.LOTE_MINIMO !== 0) {
                    quantity = Math.ceil(quantity / this.LOTE_MINIMO) * this.LOTE_MINIMO;
                    quantityInput.value = quantity;
                    Swal.fire({
                        icon: 'info',
                        title: 'Cantidad ajustada',
                        text: `La cantidad fue ajustada a ${quantity} unidades (múltiplo de ${this.LOTE_MINIMO})`,
                        confirmButtonColor: '#0066B1',
                        timer: 3000
                    });
                }
                
                this.addToCart(producto.id, producto.nombre, precioMayorista, producto.imagen, quantity);
            });

            // Agregar eventos a los botones de cantidad
            const decreaseBtn = card.querySelector('.quantity-decrease');
            const increaseBtn = card.querySelector('.quantity-increase');
            const quantityInput = card.querySelector('.quantity-input');
            const totalPriceSpan = card.querySelector('.total-price');

            decreaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue > this.LOTE_MINIMO) {
                    const newValue = currentValue - this.LOTE_MINIMO;
                    quantityInput.value = newValue;
                    totalPriceSpan.textContent = (Math.round(precioMayorista) * newValue).toLocaleString();
                }
            });

            increaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value);
                const maxStock = producto.stock || 0;
                if (currentValue + this.LOTE_MINIMO <= maxStock) {
                    const newValue = currentValue + this.LOTE_MINIMO;
                    quantityInput.value = newValue;
                    totalPriceSpan.textContent = (Math.round(precioMayorista) * newValue).toLocaleString();
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Stock insuficiente',
                        text: `Solo hay ${maxStock} unidades disponibles. El siguiente lote sería de ${currentValue + this.LOTE_MINIMO} unidades.`,
                        confirmButtonColor: '#0066B1'
                    });
                }
            });

            productGrid.appendChild(card);
        });
    }

    filterProducts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;
        const brand = document.getElementById('brandFilter').value;
        
        const cards = document.querySelectorAll('.catalog-card');
        
        cards.forEach(card => {
            const productName = card.dataset.nombre;
            const productCategory = card.dataset.category;
            const productBrand = card.dataset.brand;
            
            const matchesSearch = productName.includes(searchTerm);
            const matchesCategory = category === 'todos' || productCategory === category;
            const matchesBrand = brand === 'todas' || productBrand === brand;
            
            card.closest('.col').style.display = 
                matchesSearch && matchesCategory && matchesBrand ? 'block' : 'none';
        });
    }

    async addToCart(productId, nombre, precio, imagen, quantity = this.LOTE_MINIMO) {
        try {
            console.log('🛒 Iniciando addToCart con:', { productId, nombre, precio, imagen, quantity });
            
            // Verificar autenticación
            if (!auth.currentUser) {
                console.log('❌ Usuario no autenticado');
                Swal.fire({
                    icon: 'warning',
                    title: 'Inicia sesión',
                    text: 'Necesitas iniciar sesión para agregar productos al carrito mayorista',
                    confirmButtonText: 'Iniciar Sesión',
                    confirmButtonColor: '#0066B1'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = 'iniciar-sesion.html';
                    }
                });
                return;
            }

            console.log('✅ Usuario autenticado:', auth.currentUser.email);
            
            // Agregar al localStorage como método principal
            console.log('💾 Agregando al localStorage del carrito mayorista');
            let cart = JSON.parse(localStorage.getItem('carritoMayorista')) || [];
            console.log('📋 Carrito actual en localStorage:', cart);
            
            const existingItem = cart.find(item => item.id === productId);
            if (existingItem) {
                existingItem.cantidad += quantity;
                existingItem.loteMinimo = this.LOTE_MINIMO; // Asegurar que tenga el lote mínimo
                console.log('✅ Producto existente, incrementando cantidad:', existingItem);
            } else {
                const newItem = {
                    id: productId,
                    nombre: nombre,
                    precio: precio,
                    imagen: imagen,
                    cantidad: quantity,
                    loteMinimo: this.LOTE_MINIMO // Establecer lote mínimo
                };
                cart.push(newItem);
                console.log('✅ Producto nuevo agregado:', newItem);
            }
            
            localStorage.setItem('carritoMayorista', JSON.stringify(cart));
            console.log('💾 Carrito guardado en localStorage:', cart);
            
            // Disparar evento personalizado
            window.dispatchEvent(new CustomEvent('carritoMayoristaUpdated', { 
                detail: { cart, total: cart.reduce((sum, item) => sum + item.cantidad, 0) }
            }));

            // También intentar usar el carrito mayorista global si está disponible
            console.log('🔍 Verificando window.carritoMayorista:', {
                exists: typeof window.carritoMayorista !== 'undefined',
                hasAddItem: window.carritoMayorista?.addItem,
                carritoMayorista: window.carritoMayorista
            });

            if (typeof window.carritoMayorista !== 'undefined' && window.carritoMayorista.addItem) {
                try {
                    console.log('✅ También agregando al carrito mayorista global');
                    const productData = {
                        id: productId,
                        nombre: nombre,
                        precio: precio,
                        imagen: imagen,
                        cantidad: quantity,
                        loteMinimo: this.LOTE_MINIMO
                    };
                    
                    console.log('📦 Datos del producto para carrito global:', productData);
                    await window.carritoMayorista.addItem(productData);
                    console.log('✅ Producto agregado al carrito mayorista global');
                } catch (error) {
                    console.error('⚠️ Error al agregar al carrito global:', error);
                }
            } else {
                console.log('⚠️ Carrito mayorista global no disponible');
            }
            
            // Actualizar el contador del carrito
            this.updateCartCount();
            console.log('🔄 Contador del carrito actualizado');
            
            // Mostrar notificación completa con botones
            this.showAddedToCartNotification(nombre, precio, imagen, quantity);
            console.log('🎉 Notificación mostrada');
            
        } catch (error) {
            console.error('❌ Error al agregar al carrito:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo agregar el producto al carrito mayorista'
            });
        }
    }

    showAddedToCartNotification(nombre, precio, imagen, quantity = this.LOTE_MINIMO) {
        // Crear contenido personalizado para la notificación
        const notificationContent = document.createElement('div');
        notificationContent.className = 'd-flex flex-column align-items-center';
        
        notificationContent.innerHTML = `
            <div class="d-flex align-items-center gap-3 mb-3">
                <img src="${imagen || '../assets/img/producto-default.jpg'}" alt="${nombre}" 
                    style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                <div>
                    <h5 class="mb-1">${nombre}</h5>
                    <p class="text-muted mb-1">Cantidad: ${quantity} unidades</p>
                    <p class="text-muted mb-1">Precio mayorista: $${Math.round(precio).toLocaleString()} c/u</p>
                    <p class="text-primary mb-1"><strong>Total: $${(Math.round(precio) * quantity).toLocaleString()}</strong></p>
                    <p class="text-success mb-0">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        ¡Agregado al carrito mayorista!
                    </p>
                </div>
            </div>
            <div class="w-100">
                <p class="text-center mb-2">
                    <i class="bi bi-cart-check me-2"></i>
                    Producto agregado al carrito mayorista
                </p>
                <div class="d-flex justify-content-between gap-2">
                    <button class="btn btn-outline-primary flex-grow-1" onclick="Swal.close()">
                        <i class="bi bi-arrow-left me-2"></i> Seguir comprando
                    </button>
                    <button class="btn btn-primary flex-grow-1" onclick="window.location.href='carrito-mayorista.html'">
                        <i class="bi bi-cart3 me-2"></i> Ver carrito mayorista
                    </button>
                </div>
            </div>
        `;

        Swal.fire({
            title: '¡Producto agregado!',
            html: notificationContent,
            showConfirmButton: false,
            showCloseButton: true,
            width: '500px',
            position: 'center',
            backdrop: true,
            didOpen: () => {
                // Asegurar que los botones funcionen dentro del modal
                const modal = Swal.getPopup();
                const buttons = modal.querySelectorAll('button');
                buttons.forEach(button => {
                    button.style.pointerEvents = 'auto';
                });
            }
        });
    }

    updateCartCount() {
        console.log('🔄 Actualizando contador del carrito...');
        
        // Usar localStorage como método principal
        const cart = JSON.parse(localStorage.getItem('carritoMayorista')) || [];
        const total = cart.reduce((sum, item) => sum + item.cantidad, 0);
        console.log('📊 Total de items en localStorage:', total, 'Carrito:', cart);
        
        // Buscar todos los tipos de badges de carrito
        const badges = document.querySelectorAll('.cart-count-mayorista, .cart-count');
        console.log('🏷️ Badges encontrados:', badges.length);
        
        badges.forEach((badge, index) => {
            badge.textContent = total;
            console.log(`✅ Badge ${index + 1} actualizado:`, badge, 'con total:', total);
        });

        // También actualizar el carrito global si está disponible
        if (typeof window.carritoMayorista !== 'undefined' && window.carritoMayorista.updateCartUI) {
            try {
                console.log('🔄 También actualizando UI del carrito global');
                window.carritoMayorista.updateCartUI();
            } catch (error) {
                console.error('⚠️ Error al actualizar UI del carrito global:', error);
            }
        }
    }

    initializeCartCounter() {
        console.log('🚀 Inicializando contador del carrito mayorista...');
        
        // Configurar el contador inicial
        this.updateCartCount();
        
        // Escuchar cambios en el localStorage del carrito mayorista
        window.addEventListener('storage', (e) => {
            if (e.key === 'carritoMayorista') {
                console.log('📢 Cambio detectado en carritoMayorista localStorage');
                this.updateCartCount();
            }
        });

        // Escuchar eventos personalizados del carrito mayorista
        window.addEventListener('carritoMayoristaUpdated', () => {
            console.log('📢 Evento carritoMayoristaUpdated recibido');
            this.updateCartCount();
        });

        console.log('✅ Contador del carrito mayorista inicializado');
    }
}

// Inicializar el catálogo
document.addEventListener('DOMContentLoaded', () => {
    new MayoristaCatalog();
}); 