import { auth, db, storage } from './config/firebase-config.js';
import { 
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Referencias a elementos del DOM
const productForm = document.getElementById('productForm');
const productModalElement = document.getElementById('productModal');
const productModal = productModalElement ? new bootstrap.Modal(productModalElement) : null;
const addProductBtn = document.getElementById('addProductBtn');
const adminActions = document.getElementById('adminActions');
const productGrid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const brandFilter = document.getElementById('brandFilter');
const verifyUserBtn = document.getElementById('verifyUserBtn');
const currentUserEmail = document.getElementById('currentUserEmail');

// Array para almacenar todas las marcas disponibles
let availableBrands = new Set();

// Array para almacenar todos los productos cargados
let productos = [];

console.log('Elementos del DOM:', {
    productForm: !!productForm,
    productModal: !!productModal,
    productModalElement: !!productModalElement,
    addProductBtn: !!addProductBtn,
    productGrid: !!productGrid,
    currentUserEmail: !!currentUserEmail
});

// Función para verificar si el usuario es administrador
function isAdmin(user) {
    const admin = user && user.email === 'admin@gmail.com';
    console.log('Verificación de admin:', {
        userExists: !!user,
        userEmail: user?.email,
        isAdmin: admin,
        uid: user?.uid
    });
    return admin;
}

// Función para actualizar la interfaz
function updateInterface(user) {
    console.log('Actualizando interfaz para:', user?.email);

    // Actualizar email mostrado
    if (currentUserEmail) {
        currentUserEmail.textContent = user ? user.email : 'No conectado';
        currentUserEmail.style.color = user ? 'green' : 'red';
    }

    // Verificar si es admin
    const admin = isAdmin(user);
    console.log('Estado de admin:', admin);

    // Mostrar/ocultar elementos de administrador
    const adminFilters = document.getElementById('adminFilters');
    
    if (admin) {
        console.log('Mostrando elementos de administrador');
        
        // Mostrar botón de agregar producto
        if (addProductBtn) {
            addProductBtn.style.display = 'inline-block';
            addProductBtn.classList.remove('d-none');
        }
        
        // Mostrar filtros de administrador
        if (adminFilters) {
            adminFilters.classList.remove('d-none');
        }
        
        Swal.fire({
            icon: 'success',
            title: '¡Bienvenido Administrador!',
            text: 'Tienes acceso completo al catálogo con vista administrativa',
            timer: 3000,
            showConfirmButton: false
        });
    } else {
        console.log('Ocultando elementos de administrador');
        
        // Ocultar botón de agregar producto
        if (addProductBtn) {
            addProductBtn.style.display = 'none';
            addProductBtn.classList.add('d-none');
        }
        
        // Ocultar filtros de administrador
        if (adminFilters) {
            adminFilters.classList.add('d-none');
        }
    }
}

// Función para mostrar el estado del usuario
function showUserStatus() {
    const user = auth.currentUser;
    console.log('Mostrando estado para usuario:', user?.email);
    
    Swal.fire({
        title: 'Estado del Usuario',
        html: `
            <div class="text-start">
                <p><strong>Estado:</strong> ${user ? 'Conectado' : 'No conectado'}</p>
                ${user ? `
                    <p><strong>Email actual:</strong> ${user.email}</p>
                    <p><strong>¿Es admin?:</strong> ${user.email === 'admin@gmail.com' ? 'Sí' : 'No'}</p>
                    <p><strong>UID:</strong> ${user.uid}</p>
                ` : '<p>Por favor, inicia sesión como administrador (admin@gmail.com)</p>'}
            </div>
        `,
        icon: user ? (user.email === 'admin@gmail.com' ? 'success' : 'info') : 'warning'
    });
}

// Escuchar cambios en la autenticación
onAuthStateChanged(auth, (user) => {
    console.log('Estado de autenticación cambiado:', {
        userExists: !!user,
        userEmail: user?.email,
        uid: user?.uid
    });
    updateInterface(user);
});

// Configurar el botón de verificación
if (verifyUserBtn) {
    verifyUserBtn.addEventListener('click', showUserStatus);
}

// Configurar el botón de agregar producto
if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        // Resetear el formulario para modo de creación
        if (productForm) {
            productForm.reset();
            productForm.classList.remove('was-validated');
            productForm.removeAttribute('data-mode');
            productForm.removeAttribute('data-product-id');
            
            // Configurar para subida de archivo por defecto
            document.getElementById('imageSourceFile').checked = true;
            document.getElementById('fileUploadSection').style.display = 'block';
            document.getElementById('urlInputSection').style.display = 'none';
            
            // Cambiar el título del modal
            document.querySelector('.modal-title').textContent = 'Agregar Producto';
        }
    });
}

// Configurar filtros de administrador
const showMyProductsBtn = document.getElementById('showMyProductsBtn');
const showAllProductsBtn = document.getElementById('showAllProductsBtn');

if (showMyProductsBtn) {
    showMyProductsBtn.addEventListener('click', () => {
        filterProductsByCreator();
        // Actualizar estado visual de los botones
        showMyProductsBtn.classList.remove('btn-outline-info');
        showMyProductsBtn.classList.add('btn-info');
        showAllProductsBtn.classList.remove('btn-secondary');
        showAllProductsBtn.classList.add('btn-outline-secondary');
    });
}

if (showAllProductsBtn) {
    showAllProductsBtn.addEventListener('click', () => {
        showAllProducts();
        // Actualizar estado visual de los botones
        showAllProductsBtn.classList.remove('btn-outline-secondary');
        showAllProductsBtn.classList.add('btn-secondary');
        showMyProductsBtn.classList.remove('btn-info');
        showMyProductsBtn.classList.add('btn-outline-info');
    });
}

// Cargar marcas disponibles
function loadBrands() {
    if (!brandFilter) return;
    
    // Limpiar filtro de marcas
    brandFilter.innerHTML = '<option value="todas">Todas las marcas</option>';
    
    // Convertir Set a array, ordenar y agregar al filtro
    const sortedBrands = Array.from(availableBrands).sort();
    sortedBrands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand.toLowerCase();
        option.textContent = brand;
        brandFilter.appendChild(option);
    });
}

// Cargar productos
async function loadProducts() {
    try {
        console.log('Intentando cargar productos...');
        const productosRef = collection(db, 'productos');
        const querySnapshot = await getDocs(productosRef);
        
        if (!productGrid) {
            console.error('No se encontró el grid de productos');
            return;
        }
        
        console.log('Número de productos encontrados:', querySnapshot.size);
        productGrid.innerHTML = '';
        availableBrands.clear(); // Limpiar marcas
        productos = []; // Limpiar array de productos
        
        if (querySnapshot.empty) {
            console.log('No hay productos en la base de datos');
            productGrid.innerHTML = `
                <div class="col-12 text-center">
                    <p class="lead text-muted">No hay productos disponibles</p>
                </div>
            `;
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            console.log('Producto cargado:', product);
            
            // Agregar al array global de productos
            productos.push(product);
            
            // Agregar marca al conjunto de marcas disponibles (si existe)
            if (product.marca) {
                availableBrands.add(product.marca);
            }
            
            const productCard = document.createElement('div');
            productCard.className = 'col';
            productCard.innerHTML = createProductCard(product);
            productGrid.appendChild(productCard);
        });
        
        // Actualizar filtro de marcas
        loadBrands();
        
        // Configurar eventos de los botones de carrito
        setupAddToCartButtons();
        
    } catch (error) {
        console.error('Error al cargar productos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar los productos: ' + error.message
        });
    }
}

// Configurar cambio entre archivo y URL
document.querySelectorAll('input[name="imageSource"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const fileSection = document.getElementById('fileUploadSection');
        const urlSection = document.getElementById('urlInputSection');
        
        if (e.target.value === 'file') {
            fileSection.style.display = 'block';
            urlSection.style.display = 'none';
        } else {
            fileSection.style.display = 'none';
            urlSection.style.display = 'block';
        }
    });
});

// Función para obtener la URL de la imagen
async function getImageUrl() {
    const imageSource = document.querySelector('input[name="imageSource"]:checked').value;
    
    if (imageSource === 'url') {
        const imageUrl = document.getElementById('productImageUrl').value.trim();
        if (!imageUrl) {
            throw new Error('Por favor, ingresa una URL de imagen válida');
        }
        return imageUrl;
    } else {
        const imageFile = document.getElementById('productImage').files[0];
        if (!imageFile) {
            throw new Error('Por favor, selecciona una imagen');
        }
        return await uploadImage(imageFile);
    }
}

// Función para subir imagen
async function uploadImage(imageFile) {
    try {
        console.log('Iniciando proceso de subida de imagen...', {
            fileName: imageFile.name,
            fileSize: imageFile.size,
            fileType: imageFile.type
        });

        // Crear nombre único para la imagen
        const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        console.log('Nombre de archivo generado:', fileName);

        // Crear referencia en Storage
        const storageRef = ref(storage, `productos/${fileName}`);
        console.log('Referencia de Storage creada:', storageRef.fullPath);

        // Subir archivo
        console.log('Iniciando subida al storage...');
        const snapshot = await uploadBytes(storageRef, imageFile);
        console.log('Imagen subida exitosamente. Metadata:', snapshot.metadata);

        // Obtener URL
        console.log('Obteniendo URL de descarga...');
        const imageUrl = await getDownloadURL(snapshot.ref);
        console.log('URL de imagen obtenida:', imageUrl);

        return imageUrl;
    } catch (error) {
        console.error('Error detallado en uploadImage:', error);
        throw new Error('Error al subir la imagen: ' + error.message);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Cargado - Iniciando configuración');
    
    // Cargar productos inmediatamente
    loadProducts();

    // Configurar eventos de filtrado
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    if (brandFilter) {
        brandFilter.addEventListener('change', applyFilters);
    }

    // Configurar formulario de producto
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
});

// Los eventos de filtrado se configuran en la inicialización para evitar duplicados

// Función para filtrar productos por creador (solo mis productos)
function filterProductsByCreator() {
    if (!auth.currentUser) return;
    
    const currentUserEmail = auth.currentUser.email;
    const cards = document.querySelectorAll('#productGrid .col');
    let visibleCount = 0;
    
    cards.forEach(card => {
        const adminInfo = card.querySelector('.admin-info');
        let isMyProduct = false;
        
        if (adminInfo) {
            const creatorText = adminInfo.textContent;
            isMyProduct = creatorText.includes(currentUserEmail);
        }
        
        if (isMyProduct) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Mostrar mensaje si no hay productos del usuario
    if (visibleCount === 0) {
        const productGrid = document.getElementById('productGrid');
        if (productGrid) {
            productGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                    <h4 class="text-muted mt-3">No has creado productos aún</h4>
                    <p class="text-muted">Haz clic en "Agregar Producto" para crear tu primer producto.</p>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#productModal">
                        <i class="bi bi-plus-circle me-2"></i>Crear Producto
                    </button>
                </div>
            `;
        }
    }
}

// Función para mostrar todos los productos
function showAllProducts() {
    const cards = document.querySelectorAll('#productGrid .col');
    cards.forEach(card => {
        card.style.display = '';
    });
    
    // Si no hay productos visibles, recargar
    const visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');
    if (visibleCards.length === 0) {
        loadProducts();
    }
}

// Combinar filtros de búsqueda, categoría y marca
function applyFilters() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value.toLowerCase() : 'todos';
    const selectedBrand = brandFilter ? brandFilter.value.toLowerCase() : 'todas';
    const cards = document.querySelectorAll('#productGrid .col');
    
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const description = card.querySelector('.card-text').textContent.toLowerCase();
        const category = card.querySelector('.badge.bg-info').textContent.toLowerCase();
        
        // Obtener la marca del producto (puede que no exista en productos antiguos)
        const brandElement = card.querySelector('.product-brand');
        const brand = brandElement ? brandElement.textContent.toLowerCase() : '';
        
        const matchesSearch = title.includes(searchTerm) || 
                               description.includes(searchTerm) || 
                               category.includes(searchTerm) ||
                               brand.includes(searchTerm);
        
        const matchesCategory = selectedCategory === 'todos' || category === selectedCategory;
        const matchesBrand = selectedBrand === 'todas' || brand === selectedBrand;
        
        card.style.display = (matchesSearch && matchesCategory && matchesBrand) ? '' : 'none';
    });
}

// Agregar eventos para aplicar filtros combinados
if (searchInput) searchInput.addEventListener('input', applyFilters);
if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
if (brandFilter) brandFilter.addEventListener('change', applyFilters);

// Función para crear la tarjeta de producto
function createProductCard(product) {
    const isUserAdmin = auth.currentUser && auth.currentUser.email === 'admin@gmail.com';
    
    // Formatear fecha de creación
    const fechaCreacion = product.fechaCreacion ? 
        new Date(product.fechaCreacion).toLocaleDateString('es-ES') : 
        'No disponible';
    
    return `
        <div class="col">
            <div class="card catalog-card ${isUserAdmin ? 'admin-view' : ''}">
                <img src="${product.imagen}" class="card-img-top" alt="${product.nombre}">
                <span class="badge ${product.stock > 0 ? 'bg-success' : 'bg-danger'} position-absolute top-0 end-0 m-2">
                    ${product.stock > 0 ? 'En Stock' : 'Sin Stock'}
                </span>
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-info">${product.categoria}</span>
                        ${product.marca ? `<span class="badge bg-secondary product-brand">${product.marca}</span>` : ''}
                    </div>
                    <h5 class="card-title">${product.nombre}</h5>
                    <p class="card-text text-muted">${product.descripcion}</p>
                    
                    ${isUserAdmin ? `
                        <div class="admin-info mb-3 p-2" style="background-color: #f8f9fa; border-radius: 5px; border-left: 3px solid #007bff;">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-person-circle me-2 text-primary"></i>
                                <small class="text-muted">
                                    <strong>Creado por:</strong> ${product.createBy || product.createdBy || 'No especificado'}
                                </small>
                            </div>
                            <div class="d-flex align-items-center">
                                <i class="bi bi-calendar3 me-2 text-primary"></i>
                                <small class="text-muted">
                                    <strong>Fecha:</strong> ${fechaCreacion}
                                </small>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="text-primary h5">$${product.precio.toLocaleString()}</span>
                        <span class="text-muted small">${product.stock} disponibles</span>
                    </div>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-primary flex-grow-1 add-to-cart" 
                                data-product-id="${product.id}"
                                ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="bi bi-cart-plus me-2"></i>Agregar al Carrito
                        </button>
                        ${isUserAdmin ? `
                            <button class="btn btn-outline-primary" 
                                    onclick="editProduct('${product.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger" 
                                    onclick="deleteProduct('${product.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Función para editar producto
async function editProduct(productId) {
    try {
        const docRef = doc(db, 'productos', productId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Producto no encontrado');
        }

        const product = docSnap.data();
        
        // Obtener el formulario
        const productForm = document.getElementById('productForm');
        
        // Resetear el formulario
        productForm.reset();
        
        // Establecer modo de edición y ID del producto
        productForm.dataset.mode = 'edit';
        productForm.dataset.productId = productId;
        
        // Llenar el formulario con los datos del producto
        document.getElementById('productName').value = product.nombre;
        document.getElementById('productCategory').value = product.categoria;
        document.getElementById('productBrand').value = product.marca || '';
        document.getElementById('productPrice').value = product.precio;
        
        // El precio mayorista solo se maneja en el panel admin, no en el catálogo normal
        
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productDescription').value = product.descripcion;
        
        // Configurar la imagen
        document.getElementById('imageSourceUrl').checked = true;
        document.getElementById('fileUploadSection').style.display = 'none';
        document.getElementById('urlInputSection').style.display = 'block';
        document.getElementById('productImageUrl').value = product.imagen;
        
        // Cambiar el título del modal
        document.querySelector('.modal-title').textContent = 'Editar Producto';
        
        // Mostrar el modal
        const productModal = new bootstrap.Modal(document.getElementById('productModal'));
        productModal.show();
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    }
}

// Función para eliminar producto
async function deleteProduct(productId) {
    try {
        console.log('Intentando eliminar producto con ID:', productId);
        
        // Verificar si el usuario es administrador
        if (!auth.currentUser || auth.currentUser.email !== 'admin@gmail.com') {
            throw new Error('Solo el administrador puede eliminar productos');
        }

        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            // Mostrar loading
            Swal.fire({
                title: 'Eliminando producto...',
                text: 'Por favor espera...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Obtener referencia al documento
            const docRef = doc(db, 'productos', productId);
            console.log('Referencia al documento:', docRef.path);
            
            // Verificar si el documento existe
            const docSnap = await getDoc(docRef);
            console.log('Documento existe:', docSnap.exists());
            
            if (!docSnap.exists()) {
                throw new Error('El producto no existe');
            }

            // Eliminar el documento
            await deleteDoc(docRef);
            console.log('Documento eliminado correctamente');
            
            // Recargar la lista de productos
            await loadProducts();
            
            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: '¡Eliminado!',
                text: 'El producto ha sido eliminado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error al eliminar el producto'
        });
    }
}

// Función para manejar el envío del formulario de producto
async function handleProductSubmit(e) {
    e.preventDefault();
    
    try {
        // Verificar si el usuario es administrador
        if (!auth.currentUser || auth.currentUser.email !== 'admin@gmail.com') {
            throw new Error('Solo el administrador puede agregar o editar productos');
        }

        // Verificar que el formulario existe
        const form = e.target;
        if (!form) {
            throw new Error('Formulario no encontrado');
        }

        // Validar el formulario
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        // Obtener los datos del formulario
        const nombre = document.getElementById('productName').value.trim();
        const categoria = document.getElementById('productCategory').value;
        const marca = document.getElementById('productBrand').value.trim();
        const precio = parseFloat(document.getElementById('productPrice').value);
        
        // En el catálogo normal, calcular precio mayorista automáticamente (15% descuento)
        const precioMayorista = precio * 0.85;
        
        const stock = parseInt(document.getElementById('productStock').value);
        const descripcion = document.getElementById('productDescription').value.trim();

        // Mostrar loading
        Swal.fire({
            title: 'Guardando producto...',
            text: 'Por favor espera...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Obtener la URL de la imagen
        const imagen = await getImageUrl();

        // Preparar los datos del producto
        const productData = {
            nombre,
            categoria,
            marca,
            precio,
            precioMayorista,
            stock,
            descripcion,
            imagen,
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString(),
            createBy: auth.currentUser.email,
            createdBy: auth.currentUser.email,
            updatedBy: auth.currentUser.email
        };

        const isEditMode = form.dataset.mode === 'edit';
        
        if (isEditMode) {
            // Actualizar producto existente
            const productId = form.dataset.productId;
            const docRef = doc(db, 'productos', productId);
            
            // Para edición, solo actualizar campos específicos
            const updateData = {
                nombre,
                categoria,
                marca,
                precio,
                precioMayorista,
                stock,
                descripcion,
                imagen,
                fechaActualizacion: new Date().toISOString(),
                updatedBy: auth.currentUser.email
            };
            
            await updateDoc(docRef, updateData);
            
            Swal.fire({
                icon: 'success',
                title: '¡Producto actualizado!',
                text: 'El producto ha sido actualizado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Agregar nuevo producto
            const productosRef = collection(db, 'productos');
            await addDoc(productosRef, productData);
            
            Swal.fire({
                icon: 'success',
                title: '¡Producto agregado!',
                text: 'El producto ha sido agregado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        }

        // Limpiar formulario y cerrar modal
        productForm.reset();
        productForm.classList.remove('was-validated');
        productForm.removeAttribute('data-mode');
        productForm.removeAttribute('data-product-id');
        
        if (productModal) {
            productModal.hide();
        }

        // Recargar productos
        await loadProducts();

    } catch (error) {
        console.error('Error al guardar producto:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error al guardar el producto'
        });
    }
}

// Función para manejar el clic en el botón de agregar al carrito
function handleAddToCart(productId) {
    console.log('🛒 handleAddToCart llamado con productId:', productId);
    console.log('📦 Array productos:', productos);
    
    const product = productos.find(p => p.id === productId);
    console.log('🔍 Producto encontrado:', product);
    
    if (!product) {
        console.error('❌ Producto no encontrado en el array');
        return;
    }

    if (!window.cart) {
        console.error('❌ El carrito no está inicializado');
        return;
    }

    console.log('✅ Agregando producto al carrito...');
    window.cart.addItem({
        id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        imagen: product.imagen,
        quantity: 1
    });

    console.log('🎉 Mostrando notificación...');
    // Mostrar ventana completa con botones
    showAddToCartNotification(product);
}

// Función para configurar los eventos de los botones de agregar al carrito
function setupAddToCartButtons() {
    console.log('🔧 Configurando botones de carrito...');
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    console.log('🔍 Botones encontrados:', addToCartButtons.length);
    
    addToCartButtons.forEach((button, index) => {
        console.log(`🔗 Configurando botón ${index + 1}:`, button.dataset.productId);
        button.addEventListener('click', (e) => {
            console.log('🖱️ Click en botón de carrito');
            const productId = e.target.closest('.add-to-cart').dataset.productId;
            console.log('🆔 Product ID extraído:', productId);
            handleAddToCart(productId);
        });
    });
}

// Modificar la función renderProducts para incluir la configuración de los botones
function renderProducts(products) {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;

    productGrid.innerHTML = products.map(createProductCard).join('');
    setupAddToCartButtons();
}

// Configurar event listener para el formulario de producto
if (productForm) {
    productForm.addEventListener('submit', handleProductSubmit);
}

// Configurar los radio buttons para alternar entre fuente de imagen
const imageSourceRadios = document.querySelectorAll('input[name="imageSource"]');
imageSourceRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        const imageSource = document.querySelector('input[name="imageSource"]:checked')?.value;
        const fileSection = document.getElementById('fileUploadSection');
        const urlSection = document.getElementById('urlInputSection');

        if (imageSource === 'file') {
            if (fileSection) fileSection.style.display = 'block';
            if (urlSection) urlSection.style.display = 'none';
        } else {
            if (fileSection) fileSection.style.display = 'none';
            if (urlSection) urlSection.style.display = 'block';
        }
    });
});

// Cargar productos al inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

// Configurar auth listener
onAuthStateChanged(auth, (user) => {
    console.log('Estado de autenticación cambiado:', {
        userExists: !!user,
        userEmail: user?.email,
        uid: user?.uid
    });
    updateInterface(user);
});

// Función para mostrar notificación completa del carrito
function showAddToCartNotification(product) {
    console.log('🎉 showAddToCartNotification llamado con producto:', product);
    console.log('🔍 SweetAlert2 disponible:', typeof Swal !== 'undefined');
    
    // Crear contenido personalizado para la notificación
    const notificationContent = document.createElement('div');
    notificationContent.className = 'd-flex flex-column align-items-center';
    
    notificationContent.innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-3">
            <img src="${product.imagen || 'https://via.placeholder.com/80x80?text=Sin+Imagen'}" alt="${product.nombre}" 
                style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
            <div>
                <h5 class="mb-1">${product.nombre}</h5>
                <p class="text-muted mb-1">Precio: $${product.precio.toLocaleString()}</p>
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
}

// Hacer las funciones disponibles globalmente
window.editProduct = editProduct;
window.deleteProduct = deleteProduct; 