import { db, auth } from './config/firebase-config.js';
import { 
    collection,
    getDocs,
    limit,
    query,
    where,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class PopularProducts {
    constructor() {
        this.products = []; // Cache de productos
        this.isLoading = false; // Flag para evitar múltiples cargas
        this.isMayorista = false; // Flag para usuario mayorista
        
        // Verificar el estado del usuario y cargar productos
        this.initializeProducts();
    }

    async initializeProducts() {
        // Escuchar cambios en la autenticación
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.checkMayoristaStatus(user);
            } else {
                this.isMayorista = false;
            }
            
            // Cargar productos después de verificar el status
            this.loadPopularProducts();
            
            // Actualizar el botón independientemente de si hay productos
            setTimeout(() => {
                this.updateSectionTitle();
            }, 100);
        });
    }

    async checkMayoristaStatus(user) {
        try {
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                this.isMayorista = userData.tipo === 'mayorista' && userData.validado === true;
            } else {
                // Fallback para verificar por email
                this.isMayorista = user.email.toLowerCase().includes('mayorista');
            }
            console.log('👤 Usuario mayorista:', this.isMayorista);
        } catch (error) {
            console.error('Error al verificar status mayorista:', error);
            // Fallback para verificar por email
            this.isMayorista = user.email.toLowerCase().includes('mayorista');
        }
    }

    async loadPopularProducts() {
        // Evitar cargas múltiples
        if (this.isLoading) {
            console.log('📦 Ya cargando productos...');
            return;
        }

        // Si ya hay productos, solo re-renderizar con el nuevo estilo
        if (this.products.length > 0) {
            console.log('📦 Re-renderizando productos existentes...');
            this.renderProducts();
            return;
        }

        try {
            this.isLoading = true;
            console.log('🔍 Cargando productos populares...');
            
            const popularGrid = document.getElementById('popularProductsGrid');
            if (!popularGrid) {
                console.error('❌ No se encontró el grid de productos populares');
                return;
            }

            // Mostrar loading
            popularGrid.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="text-muted mt-3">Cargando productos populares...</p>
                    </div>
                </div>
            `;

            // Consulta para obtener solo 4 productos
            const productosRef = collection(db, 'productos');
            const q = query(productosRef, limit(4));
            const querySnapshot = await getDocs(q);
            
            console.log(`📦 Se encontraron ${querySnapshot.size} productos`);
            
            if (querySnapshot.empty) {
                this.showNoProductsMessage(popularGrid);
                return;
            }

            // Guardar productos en cache
            querySnapshot.forEach((doc) => {
                const productData = doc.data();
                this.products.push({ id: doc.id, ...productData });
            });

            // Renderizar productos normales
            this.renderProducts();

            console.log('✅ Productos populares cargados correctamente');
            
        } catch (error) {
            console.error('❌ Error al cargar productos populares:', error);
            this.showErrorMessage();
        } finally {
            this.isLoading = false;
        }
    }

    renderProducts() {
        const popularGrid = document.getElementById('popularProductsGrid');
        if (!popularGrid || this.products.length === 0) {
            return;
        }

        console.log(`🎨 Renderizando productos ${this.isMayorista ? 'mayoristas' : 'normales'}`);

        // Limpiar el contenido actual
        popularGrid.innerHTML = '';
        
        // Crear las tarjetas según el tipo de usuario
        this.products.forEach(product => {
            const productCard = this.isMayorista 
                ? this.createMayoristaCard(product) 
                : this.createNormalCard(product);
            popularGrid.appendChild(productCard);
        });

        // Actualizar el título de la sección
        this.updateSectionTitle();
    }

    updateSectionTitle() {
        const sectionTitle = document.querySelector('#productos-populares h2');
        const sectionButton = document.getElementById('catalogButton');
        
        console.log('🔧 Actualizando sección para mayorista:', this.isMayorista);
        console.log('🎯 Botón encontrado:', sectionButton);
        
        if (this.isMayorista) {
            if (sectionTitle) {
                sectionTitle.textContent = 'Productos Destacados - Precios Mayoristas';
            }
            if (sectionButton) {
                sectionButton.innerHTML = '<i class="bi bi-box-seam me-2"></i>Ver Catálogo Mayorista';
                sectionButton.href = 'mayorista.html';
                console.log('✅ Botón cambiado a catálogo mayorista');
            }
        } else {
            if (sectionTitle) {
                sectionTitle.textContent = 'Productos Populares';
            }
            if (sectionButton) {
                sectionButton.innerHTML = '<i class="bi bi-grid me-2"></i>Ver Catálogo Completo';
                sectionButton.href = 'catalogo.html';
                console.log('✅ Botón cambiado a catálogo regular');
            }
        }
    }

    createNormalCard(product) {
        const col = document.createElement('div');
        col.className = 'col';
        
        const precioOriginal = product.precio || 0;
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm product-card" style="border: none; transition: transform 0.2s;">
                <div class="position-relative">
                    <img src="${product.imagen || 'https://via.placeholder.com/300x200?text=Sin+Imagen'}" 
                         class="card-img-top" 
                         alt="${product.nombre}"
                         style="height: 200px; object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/300x200?text=Sin+Imagen'">
                    <span class="badge ${product.stock > 0 ? 'bg-success' : 'bg-danger'} position-absolute top-0 end-0 m-2">
                        ${product.stock > 0 ? 'En Stock' : 'Sin Stock'}
                    </span>
                </div>
                <div class="card-body d-flex flex-column">
                    <span class="badge bg-info mb-2 align-self-start">${product.categoria || 'Sin categoría'}</span>
                    <h5 class="card-title" style="font-size: 1.1rem; font-weight: 600;">${product.nombre}</h5>
                    <p class="card-text text-muted flex-grow-1" style="font-size: 0.9rem; line-height: 1.4;">
                        ${product.descripcion || 'Sin descripción disponible'}
                    </p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="text-primary h5 mb-0">$${precioOriginal.toLocaleString()}</span>
                            <span class="text-muted small">${product.stock || 0} disponibles</span>
                        </div>
                        <button class="btn btn-primary w-100 add-to-cart-btn" 
                                data-product-id="${product.id}"
                                data-product-name="${product.nombre}"
                                data-product-price="${precioOriginal}"
                                data-product-image="${product.imagen || ''}"
                                ${!product.stock || product.stock <= 0 ? 'disabled' : ''}>
                            <i class="bi bi-cart-plus me-2"></i>
                            ${product.stock > 0 ? 'Agregar al Carrito' : 'Sin Stock'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.setupCardEvents(col);
        return col;
    }

    createMayoristaCard(product) {
        const col = document.createElement('div');
        col.className = 'col';
        
        const LOTE_MINIMO = 5;
        const precioOriginal = product.precio || 0;
        const precioMayorista = product.precioMayorista || (precioOriginal * 0.85); // 15% descuento si no hay precio mayorista definido
        const descuento = Math.round(((precioOriginal - precioMayorista) / precioOriginal) * 100);
        const precioTotalLote = Math.round(precioMayorista * LOTE_MINIMO);
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm product-card mayorista-card" style="border: none; transition: transform 0.2s; background-color: white;">
                <div class="position-relative">
                    <img src="${product.imagen || 'https://via.placeholder.com/300x200?text=Sin+Imagen'}" 
                         class="card-img-top" 
                         alt="${product.nombre}"
                         style="height: 200px; object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/300x200?text=Sin+Imagen'">
                    <span class="badge bg-warning text-dark position-absolute top-0 start-0 m-2">
                        -${descuento}% OFF
                    </span>
                    <span class="badge bg-primary position-absolute top-0 end-0 m-2">
                        Lote ${LOTE_MINIMO} uds.
                    </span>
                    <span class="badge ${product.stock >= LOTE_MINIMO ? 'bg-success' : 'bg-danger'} position-absolute" 
                          style="top: 35px; right: 8px;">
                        ${product.stock >= LOTE_MINIMO ? 'Disponible' : 'Sin Stock'}
                    </span>
                </div>
                <div class="card-body d-flex flex-column">
                    <span class="badge bg-info mb-2 align-self-start">${product.categoria || 'Sin categoría'}</span>
                    <h5 class="card-title" style="font-size: 1.1rem; font-weight: 600; color: #333;">${product.nombre}</h5>
                    <p class="card-text text-muted flex-grow-1" style="font-size: 0.9rem; line-height: 1.4;">
                        ${product.descripcion || 'Sin descripción disponible'}
                    </p>
                    <div class="mt-auto">
                        <!-- Precios -->
                        <div class="price-section mb-3 p-2 bg-light rounded">
                            <div class="text-decoration-line-through text-muted small">
                                Precio unitario regular: $${precioOriginal.toLocaleString()}
                            </div>
                            <div class="text-success fw-bold">
                                Precio mayorista: $${Math.round(precioMayorista).toLocaleString()} c/u
                            </div>
                            <div class="text-primary fw-bold h6 mb-0">
                                Total lote (${LOTE_MINIMO} uds): $${precioTotalLote.toLocaleString()}
                            </div>
                            <small class="text-muted">Stock: ${product.stock || 0} unidades</small>
                        </div>

                        <!-- Control de cantidad -->
                        <div class="quantity-section mb-3 p-2 border rounded">
                            <label class="form-label small text-muted mb-1">Cantidad (múltiplos de ${LOTE_MINIMO})</label>
                            <div class="input-group input-group-sm">
                                <button class="btn btn-outline-secondary decrease-qty" type="button" data-product-id="${product.id}">
                                    <i class="bi bi-dash"></i>
                                </button>
                                <input type="number" class="form-control quantity-input text-center fw-bold" 
                                       value="${LOTE_MINIMO}" 
                                       min="${LOTE_MINIMO}" 
                                       step="${LOTE_MINIMO}" 
                                       data-product-id="${product.id}"
                                       readonly>
                                <button class="btn btn-outline-secondary increase-qty" type="button" data-product-id="${product.id}">
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Precio total dinámico -->
                        <div class="total-price-section mb-3">
                            <div class="text-center">
                                <strong class="text-primary total-price" data-base-price="${precioMayorista}">
                                    Total: $${precioTotalLote.toLocaleString()}
                                </strong>
                            </div>
                        </div>

                        <button class="btn btn-primary w-100 add-to-cart-mayorista-btn" 
                                data-product-id="${product.id}"
                                data-product-name="${product.nombre}"
                                data-product-price="${precioMayorista}"
                                data-product-image="${product.imagen || ''}"
                                data-lote-minimo="${LOTE_MINIMO}"
                                ${!product.stock || product.stock < LOTE_MINIMO ? 'disabled' : ''}>
                            <i class="bi bi-cart-plus me-2"></i>
                            ${product.stock >= LOTE_MINIMO ? 'Agregar Lote al Carrito' : 'Sin Stock Suficiente'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.setupMayoristaCardEvents(col, product);
        return col;
    }

    setupCardEvents(col) {
        const card = col.querySelector('.product-card');
        const addToCartBtn = col.querySelector('.add-to-cart-btn');

        // Agregar efecto hover
        if (card) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });
        }

        // Evento para carrito normal
        if (addToCartBtn && !addToCartBtn.disabled) {
            addToCartBtn.addEventListener('click', (e) => {
                this.addToCart(e.target.closest('.add-to-cart-btn'));
            });
        }
    }

    addToCart(button) {
        const productData = {
            id: button.dataset.productId,
            nombre: button.dataset.productName,
            precio: parseFloat(button.dataset.productPrice),
            imagen: button.dataset.productImage
        };

        // Verificar si hay usuario autenticado
        if (!auth.currentUser) {
            // Si no hay usuario, redirigir al login
            Swal.fire({
                icon: 'info',
                title: 'Inicia sesión',
                text: 'Necesitas iniciar sesión para agregar productos al carrito',
                showCancelButton: true,
                confirmButtonText: 'Iniciar Sesión',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#0066B1'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '../views/iniciar-sesion.html';
                }
            });
            return;
        }

        // Verificar si el objeto cart está disponible globalmente
        if (typeof window.cart !== 'undefined' && window.cart.addItem) {
            window.cart.addItem(productData);
            // Mostrar ventana centrada también cuando se usa el carrito global
            this.showAddToCartSuccess(productData.nombre, productData);
        } else {
            // Fallback: mostrar mensaje de éxito
            this.showAddToCartSuccess(productData.nombre, productData);
        }
    }

    setupMayoristaCardEvents(col, product) {
        const LOTE_MINIMO = 5;
        
        // Agregar eventos de hover
        const card = col.querySelector('.product-card');
        if (card) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            });
        }

        // Control de cantidad
        const quantityInput = col.querySelector('.quantity-input');
        const decreaseBtn = col.querySelector('.decrease-qty');
        const increaseBtn = col.querySelector('.increase-qty');
        const totalPriceElement = col.querySelector('.total-price');
        const basePrice = parseFloat(totalPriceElement.dataset.basePrice);

        const updateTotalPrice = () => {
            const quantity = parseInt(quantityInput.value);
            const total = Math.round(basePrice * quantity);
            totalPriceElement.textContent = `Total: $${total.toLocaleString()}`;
        };

        // Botón decrementar
        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value);
                const newValue = Math.max(LOTE_MINIMO, currentValue - LOTE_MINIMO);
                quantityInput.value = newValue;
                updateTotalPrice();
            });
        }

        // Botón incrementar
        if (increaseBtn) {
            increaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value);
                const maxStock = Math.floor((product.stock || 0) / LOTE_MINIMO) * LOTE_MINIMO;
                const newValue = Math.min(maxStock, currentValue + LOTE_MINIMO);
                
                if (newValue <= maxStock && newValue > currentValue) {
                    quantityInput.value = newValue;
                    updateTotalPrice();
                } else {
                    // Mostrar mensaje de stock insuficiente
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Stock insuficiente',
                            text: `Solo hay ${product.stock} unidades disponibles. El máximo que puedes agregar es ${maxStock} unidades.`,
                            confirmButtonColor: '#0066B1'
                        });
                    }
                }
            });
        }

        // Botón agregar al carrito mayorista
        const addToCartBtn = col.querySelector('.add-to-cart-mayorista-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🛒 Botón de agregar lote al carrito clickeado');
                
                const productId = addToCartBtn.dataset.productId;
                const productName = addToCartBtn.dataset.productName;
                const productPrice = parseFloat(addToCartBtn.dataset.productPrice);
                const productImage = addToCartBtn.dataset.productImage;
                const loteMinimo = parseInt(addToCartBtn.dataset.loteMinimo);
                const quantity = parseInt(quantityInput.value);
                
                if (productId && productName && productPrice && quantity >= loteMinimo) {
                    this.addToMayoristaCart(productId, productName, productPrice, productImage, quantity, loteMinimo);
                } else {
                    console.error('❌ Datos del producto incompletos o cantidad inválida:', { 
                        productId, productName, productPrice, quantity, loteMinimo 
                    });
                }
            });
        }
    }

    async addToMayoristaCart(productId, productName, productPrice, productImage, quantity, loteMinimo) {
        const productData = {
            id: productId,
            nombre: productName,
            precio: productPrice,
            imagen: productImage,
            cantidad: quantity,
            loteMinimo: loteMinimo,
            esMayorista: true
        };

        // Verificar si hay usuario autenticado
        if (!auth.currentUser) {
            // Si no hay usuario, redirigir al login
            Swal.fire({
                icon: 'info',
                title: 'Inicia sesión',
                text: 'Necesitas iniciar sesión para agregar productos al carrito',
                showCancelButton: true,
                confirmButtonText: 'Iniciar Sesión',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#0066B1'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '../views/iniciar-sesion.html';
                }
            });
            return;
        }

        try {
            // Verificar si el objeto cart está disponible globalmente
            if (typeof window.cartMayorista !== 'undefined' && window.cartMayorista.addItem) {
                console.log('🛒 Agregando al carrito mayorista usando objeto global');
                await window.cartMayorista.addItem(productData);
                this.showMayoristaAddToCartSuccess(productData);
            } else {
                // Fallback: agregar directamente a Firebase
                console.log('🛒 Agregando al carrito mayorista usando Firebase directamente');
                await this.addToMayoristaCartDirectly(productData);
                this.showMayoristaAddToCartSuccess(productData);
            }
        } catch (error) {
            console.error('❌ Error al agregar al carrito mayorista:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo agregar el producto al carrito. Intenta nuevamente.',
                confirmButtonColor: '#0066B1'
            });
        }
    }

    async addToMayoristaCartDirectly(productData) {
        const { doc, setDoc, getDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const { db } = await import('./config/firebase-config.js');
        
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Obtener carrito actual
            const cartDoc = await getDoc(doc(db, 'carritos_mayorista', user.uid));
            let items = [];
            
            if (cartDoc.exists()) {
                items = cartDoc.data().items || [];
            }
            
            // Buscar si el producto ya existe
            const existingItemIndex = items.findIndex(item => item.id === productData.id);
            
            if (existingItemIndex >= 0) {
                // Si existe, sumar las cantidades
                items[existingItemIndex].cantidad += productData.cantidad;
            } else {
                // Si no existe, agregarlo
                items.push(productData);
            }
            
            // Calcular total
            const subtotal = items.reduce((total, item) => total + (item.precio * item.cantidad), 0);
            const discount = subtotal * 0.15;
            const subtotalWithDiscount = subtotal - discount;
            const iva = subtotalWithDiscount * 0.19;
            const total = subtotalWithDiscount + iva;
            
            // Guardar en Firebase
            await setDoc(doc(db, 'carritos_mayorista', user.uid), {
                items: items,
                total: total,
                updatedAt: serverTimestamp()
            });
            
            // Actualizar contadores visuales
            this.updateCartCounters(items);
            
            console.log('✅ Producto agregado directamente al carrito mayorista en Firebase');
            
        } catch (error) {
            console.error('❌ Error al agregar producto directamente a Firebase:', error);
            throw error;
        }
    }

    updateCartCounters(items) {
        const totalItems = items.reduce((total, item) => total + item.cantidad, 0);
        
        // Actualizar solo contadores de carrito mayorista
        const mayoristaCountElements = document.querySelectorAll('.cart-count-mayorista');
        mayoristaCountElements.forEach(element => {
            element.textContent = totalItems;
        });
        
        // También disparar evento para actualizar otros contadores si es necesario
        window.dispatchEvent(new CustomEvent('carritoMayoristaUpdated', { 
            detail: { cart: items, total: totalItems }
        }));
    }

    showMayoristaAddToCartSuccess(productData) {
        console.log('🎯 Ejecutando showMayoristaAddToCartSuccess con datos:', productData);
        const totalPrice = Math.round(productData.precio * productData.cantidad);
        
        // Usar SweetAlert2 con ventana específica para mayoristas
        if (typeof Swal !== 'undefined') {
            console.log('✅ SweetAlert2 disponible, creando modal...');
            const notificationContent = document.createElement('div');
            notificationContent.className = 'd-flex flex-column align-items-center';
            
            notificationContent.innerHTML = `
                <!-- Header con ícono de éxito -->
                <div class="text-center mb-4">
                    <div class="success-icon-container">
                        <i class="bi bi-check-circle-fill text-success"></i>
                    </div>
                </div>
                
                <!-- Información del producto -->
                <div class="product-info-card mb-4">
                    <div class="row align-items-center">
                        <div class="col-4">
                            <div class="product-image-container">
                                <img src="${productData.imagen || 'https://via.placeholder.com/120x120?text=Sin+Imagen'}" 
                                     alt="${productData.nombre}" class="product-image">
                                <div class="lote-badge">
                                    <i class="bi bi-box-seam me-1"></i>
                                    Lote ${productData.loteMinimo} uds.
                                </div>
                            </div>
                        </div>
                        <div class="col-8">
                            <h4 class="product-name mb-2">${productData.nombre}</h4>
                            <div class="pricing-details">
                                <div class="price-row">
                                    <span class="price-label">Precio unitario:</span>
                                    <span class="price-value">$${productData.precio.toLocaleString()}</span>
                                </div>
                                <div class="price-row">
                                    <span class="price-label">Cantidad:</span>
                                    <span class="quantity-value">${productData.cantidad} unidades</span>
                                </div>
                                <div class="price-row total-row">
                                    <span class="price-label">Total del lote:</span>
                                    <span class="total-value">$${totalPrice.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Mensaje de confirmación -->
                
                
                
                <!-- Botones de acción -->
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-continue" onclick="Swal.close()">
                        <i class="bi bi-arrow-left me-2"></i>
                        Continuar comprando
                    </button>
                    <button class="btn btn-primary btn-cart" onclick="window.location.href='carrito-mayorista.html'">
                        <i class="bi bi-cart-check me-2"></i>
                        Ver mi carrito
                    </button>
                </div>
            `;

            console.log('🚀 Intentando mostrar modal SweetAlert2...');
            
            // Deshabilitar temporalmente el manejo automático de aria-hidden de SweetAlert2
            const originalAriaHidden = Swal.ariaHidden;
            Swal.ariaHidden = false;
            
            Swal.fire({
                title: '¡Lote agregado al carrito!',
                html: notificationContent,
                showConfirmButton: false,
                showCloseButton: true,
                width: '600px',
                position: 'top',
                timer: 0,
                timerProgressBar: false,
                backdrop: true,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                allowOutsideClick: true,
                allowEscapeKey: true,
                customClass: {
                    popup: 'productos-populares-modal',
                    container: 'productos-populares-container'
                },
                willOpen: () => {
                    console.log('🎯 Modal willOpen ejecutado');
                },
                didOpen: () => {
                    console.log('🎯 Modal didOpen ejecutado');
                    
                    // Remover aria-hidden de todos los elementos principales inmediatamente
                    const elementsWithAriaHidden = document.querySelectorAll('[aria-hidden="true"]');
                    elementsWithAriaHidden.forEach(element => {
                        element.removeAttribute('aria-hidden');
                        console.log('🔧 Removido aria-hidden de:', element.tagName, element.id || element.className);
                    });

                    // Asegurar que el modal sea visible
                    const modal = Swal.getPopup();
                    if (modal) {
                        modal.style.position = 'fixed';
                        modal.style.top = '10%';
                        modal.style.left = '50%';
                        modal.style.transform = 'translateX(-50%)';
                        modal.style.zIndex = '99999';
                        modal.style.backgroundColor = '#ffffff';
                        modal.style.display = 'block';
                        modal.style.visibility = 'visible';
                        
                        console.log('✅ Modal posicionado y visible');
                    }
                    
                    // Asegurar que los botones funcionen
                    const buttons = document.querySelectorAll('.productos-populares-modal button');
                    buttons.forEach(button => {
                        button.style.pointerEvents = 'auto';
                        button.style.cursor = 'pointer';
                    });
                    
                    console.log('✅ Modal mayorista mostrado correctamente');
                },
                didClose: () => {
                    console.log('🎯 Modal didClose ejecutado');
                    // Restaurar el manejo original de aria-hidden
                    if (typeof originalAriaHidden !== 'undefined') {
                        Swal.ariaHidden = originalAriaHidden;
                    }
                    console.log('✅ Modal mayorista cerrado');
                }
            }).then((result) => {
                console.log('🎯 Modal result:', result);
            }).catch((error) => {
                console.error('❌ Error al mostrar modal:', error);
            });
        } else {
            console.warn('⚠️ SweetAlert2 no disponible, usando fallback');
            // Fallback simple
            alert(`Lote de ${productData.cantidad} unidades de ${productData.nombre} agregado al carrito mayorista`);
        }
        
        // Fallback adicional: mostrar notificación simple si SweetAlert2 falla
        setTimeout(() => {
            if (!document.querySelector('.productos-populares-modal')) {
                console.warn('⚠️ Modal no visible, mostrando notificación de fallback');
                const notification = document.createElement('div');
                notification.innerHTML = `
                    <div style="position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px 20px; border-radius: 8px; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                        <strong>✅ Lote agregado al carrito mayorista</strong><br>
                        ${productData.cantidad} x ${productData.nombre}
                        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer;">×</button>
                    </div>
                `;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 5000);
            }
        }, 1000);
    }

    showAddToCartSuccess(productName, productData) {
        // Usar SweetAlert2 con ventana completa
        if (typeof Swal !== 'undefined') {
            // Crear contenido personalizado para la notificación
            const notificationContent = document.createElement('div');
            notificationContent.className = 'd-flex flex-column align-items-center';
            
            notificationContent.innerHTML = `
                <div class="d-flex align-items-center gap-3 mb-3">
                    <img src="${productData.imagen || 'https://via.placeholder.com/80x80?text=Sin+Imagen'}" alt="${productName}" 
                        style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <h5 class="mb-1">${productName}</h5>
                        <p class="text-muted mb-1">Precio: $${productData.precio.toLocaleString()}</p>
                        <p class="text-success mb-0">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            ¡Agregado al carrito!
                        </p>
                    </div>
                </div>
                <div class="w-100">
                    <p class="text-center mb-2">
                        <i class="bi bi-cart-check me-2"></i>
                        Producto agregado al carrito
                    </p>
                    <div class="d-flex justify-content-between gap-2">
                        <button class="btn btn-outline-primary flex-grow-1" onclick="Swal.close()">
                            <i class="bi bi-arrow-left me-2"></i> Seguir comprando
                        </button>
                        <button class="btn btn-primary flex-grow-1" onclick="window.location.href='carrito.html'">
                            <i class="bi bi-cart3 me-2"></i> Ver carrito
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
        } else {
            // Fallback simple
            alert(`${productName} se agregó al carrito`);
        }
    }

    showNoProductsMessage(container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-box-seam text-muted" style="font-size: 3rem;"></i>
                    <h4 class="text-muted mt-3">No hay productos disponibles</h4>
                    <p class="text-muted">En este momento no tenemos productos para mostrar.</p>
                </div>
            </div>
        `;
    }

    showErrorMessage() {
        const popularGrid = document.getElementById('popularProductsGrid');
        if (popularGrid) {
            popularGrid.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                        <h4 class="text-warning mt-3">Error al cargar productos</h4>
                        <p class="text-muted">No se pudieron cargar los productos populares. Intenta recargar la página.</p>
                        <button class="btn btn-outline-primary" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise me-2"></i>Recargar Página
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando carga de productos populares...');
    new PopularProducts();
}); 