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
const verifyUserBtn = document.getElementById('verifyUserBtn');
const currentUserEmail = document.getElementById('currentUserEmail');

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

    if (addProductBtn) {
        if (admin) {
            console.log('Mostrando botón de agregar producto');
            addProductBtn.style.display = 'inline-block';
            addProductBtn.classList.add('btn-lg', 'shadow');
            
            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido Administrador!',
                text: 'Tienes acceso completo al catálogo',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            console.log('Ocultando botón de agregar producto');
            addProductBtn.style.display = 'none';
        }
    } else {
        console.error('No se encontró el botón de agregar producto');
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
            
            const productCard = document.createElement('div');
            productCard.className = 'col';
            productCard.innerHTML = createProductCard(product);
            productGrid.appendChild(productCard);
        });
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
    
    // Verificar usuario actual
    const currentUser = auth.currentUser;
    console.log('Usuario actual:', {
        exists: !!currentUser,
        email: currentUser?.email,
        uid: currentUser?.uid
    });

    if (currentUser) {
        updateInterface(currentUser);
    }
    
    // Cargar productos
    loadProducts();

    // Configurar eventos del formulario
    if (productForm && addProductBtn) {
        console.log('Configurando eventos del formulario');

        // Eliminar cualquier evento de submit existente
        productForm.onsubmit = null;

        // Click en agregar producto
        addProductBtn.addEventListener('click', () => {
            console.log('Click en agregar producto');
            const admin = isAdmin(auth.currentUser);
            console.log('Verificación de admin al click:', admin);

            if (!admin) {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: 'Solo el administrador puede agregar productos'
                });
                return;
            }

            // Resetear el formulario para modo de creación
            productForm.dataset.mode = 'create';
            productForm.reset();
            document.querySelector('.modal-title').textContent = 'Agregar Producto';
            
            // Mostrar el modal
            const productModal = new bootstrap.Modal(document.getElementById('productModal'));
            productModal.show();
        });

        // Manejar el envío del formulario
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Formulario enviado');
            
            try {
                // Determinar si es creación o edición
                const mode = productForm.dataset.mode || 'create';
                
                // Obtener la URL de la imagen
                let imageUrl;
                const imageSource = document.querySelector('input[name="imageSource"]:checked').value;
                
                if (imageSource === 'url') {
                    imageUrl = document.getElementById('productImageUrl').value.trim();
                    if (!imageUrl) {
                        throw new Error('Por favor, ingresa una URL de imagen válida');
                    }
                } else {
                    const imageFile = document.getElementById('productImage').files[0];
                    if (imageFile) {
                        imageUrl = await uploadImage(imageFile);
                    } else if (mode === 'create') {
                        throw new Error('Por favor, selecciona una imagen');
                    }
                }

                const formData = {
                    nombre: document.getElementById('productName').value.trim(),
                    categoria: document.getElementById('productCategory').value,
                    precio: parseFloat(document.getElementById('productPrice').value),
                    stock: parseInt(document.getElementById('productStock').value),
                    descripcion: document.getElementById('productDescription').value.trim(),
                    imagen: imageUrl,
                    fechaCreacion: new Date().toISOString(),
                    createdBy: auth.currentUser.email
                };

                // Validar campos
                if (!formData.nombre || !formData.categoria || !formData.precio || !formData.stock || !formData.descripcion || !formData.imagen) {
                    throw new Error('Por favor completa todos los campos');
                }

                // Guardar o actualizar según el modo
                if (mode === 'create') {
                    // Guardar nuevo producto
                    const productosRef = collection(db, 'productos');
                    await addDoc(productosRef, formData);
                } else {
                    // Actualizar producto existente
                    const productId = productForm.dataset.productId;
                    const docRef = doc(db, 'productos', productId);
                    await updateDoc(docRef, {
                        ...formData,
                        fechaActualizacion: new Date().toISOString(),
                        updatedBy: auth.currentUser.email
                    });
                }
                
                // Cerrar el modal
                const productModal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
                productModal.hide();
                
                // Recargar productos
                await loadProducts();
                
                // Mostrar mensaje de éxito
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: mode === 'create' ? 'Producto agregado correctamente' : 'Producto actualizado correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error al procesar producto:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message
                });
            }
        });
    } else {
        console.error('No se encontraron elementos del formulario:', {
            form: !!productForm,
            button: !!addProductBtn
        });
    }
});

// Implementar búsqueda
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('#productGrid .col');
    
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const description = card.querySelector('.card-text').textContent.toLowerCase();
        const category = card.querySelector('.badge.bg-info').textContent.toLowerCase();
        
        const matchesSearch = title.includes(searchTerm) || 
                               description.includes(searchTerm) || 
                               category.includes(searchTerm);
        
        card.style.display = matchesSearch ? '' : 'none';
    });
});

// Implementar filtro por categoría
categoryFilter.addEventListener('change', (e) => {
    const selectedCategory = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('#productGrid .col');
    
    cards.forEach(card => {
        const cardCategory = card.querySelector('.badge.bg-info').textContent.toLowerCase();
        
        const matchesCategory = selectedCategory === 'todos' || cardCategory === selectedCategory;
        
        card.style.display = matchesCategory ? '' : 'none';
    });
});

// Combinar filtros de búsqueda y categoría
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value.toLowerCase();
    const cards = document.querySelectorAll('#productGrid .col');
    
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const description = card.querySelector('.card-text').textContent.toLowerCase();
        const category = card.querySelector('.badge.bg-info').textContent.toLowerCase();
        
        const matchesSearch = title.includes(searchTerm) || 
                               description.includes(searchTerm) || 
                               category.includes(searchTerm);
        
        const matchesCategory = selectedCategory === 'todos' || category === selectedCategory;
        
        card.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
    });
}

// Agregar eventos para aplicar filtros combinados
searchInput.addEventListener('input', applyFilters);
categoryFilter.addEventListener('change', applyFilters);

// Función para crear la tarjeta de producto
function createProductCard(product) {
    const isUserAdmin = auth.currentUser && auth.currentUser.email === 'admin@gmail.com';
    
    return `
        <div class="col">
            <div class="card catalog-card">
                <img src="${product.imagen}" class="card-img-top" alt="${product.nombre}">
                <span class="badge ${product.stock > 0 ? 'bg-success' : 'bg-danger'} position-absolute top-0 end-0 m-2">
                    ${product.stock > 0 ? 'En Stock' : 'Sin Stock'}
                </span>
                <div class="card-body">
                    <span class="badge bg-info mb-2">${product.categoria}</span>
                    <h5 class="card-title">${product.nombre}</h5>
                    <p class="card-text text-muted">${product.descripcion}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="text-primary h5">$${product.precio.toLocaleString()}</span>
                        <span class="text-muted small">${product.stock} disponibles</span>
                    </div>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-primary flex-grow-1" 
                                onclick="cart.addItem({
                                    id: '${product.id}',
                                    nombre: '${product.nombre.replace(/'/g, "\\'")}',
                                    precio: ${product.precio},
                                    imagen: '${product.imagen}'
                                })"
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
        document.getElementById('productPrice').value = product.precio;
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

// Función para manejar el clic en el botón de agregar al carrito
function handleAddToCart(productId) {
    const product = productos.find(p => p.id === productId);
    if (!product) return;

    if (!window.cart) {
        console.error('El carrito no está inicializado');
        return;
    }

    window.cart.addItem({
        id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        imagen: product.imagen,
        quantity: 1
    });

    // Mostrar notificación de éxito
    Swal.fire({
        title: '¡Producto agregado!',
        text: `${product.nombre} ha sido agregado al carrito`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
}

// Función para configurar los eventos de los botones de agregar al carrito
function setupAddToCartButtons() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.closest('.add-to-cart').dataset.productId;
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

// Hacer las funciones disponibles globalmente
window.editProduct = editProduct;
window.deleteProduct = deleteProduct; 