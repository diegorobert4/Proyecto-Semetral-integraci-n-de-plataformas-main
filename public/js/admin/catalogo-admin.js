import { auth, db, storage } from '../config/firebase-config.js';
import { 
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

class CatalogoAdmin {
    constructor() {
        this.allProducts = [];
        this.filteredProducts = [];
        this.availableBrands = new Set();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Manejar clics en pestañas
        const catalogTab = document.querySelector('a[href="#catalog"]');
        if (catalogTab) {
            catalogTab.addEventListener('click', () => {
                this.loadProducts();
            });
        }

        // Formulario de producto
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }

        // Botón agregar producto
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.openProductModal());
        }

        // Filtros
        const searchInput = document.getElementById('searchProductInput');
        const categoryFilter = document.getElementById('categoryProductFilter');
        const brandFilter = document.getElementById('brandProductFilter');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        if (brandFilter) {
            brandFilter.addEventListener('change', () => this.applyFilters());
        }

        // Alternar entre file upload y URL
        const imageSourceRadios = document.querySelectorAll('input[name="imageSource"]');
        imageSourceRadios.forEach(radio => {
            radio.addEventListener('change', () => this.toggleImageSource());
        });

        // Manejar clics en el grid de productos
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="edit-product"]')) {
                const productId = e.target.dataset.productId;
                this.editProduct(productId);
            } else if (e.target.matches('[data-action="delete-product"]')) {
                const productId = e.target.dataset.productId;
                this.deleteProduct(productId);
            }
        });
    }

    async loadProducts() {
        try {
            console.log('Cargando productos...');
            const q = query(collection(db, 'productos'), orderBy('fechaCreacion', 'desc'));
            const querySnapshot = await getDocs(q);
            
            this.allProducts = [];
            this.availableBrands.clear();

            querySnapshot.forEach((doc) => {
                const product = { id: doc.id, ...doc.data() };
                this.allProducts.push(product);
                
                if (product.marca) {
                    this.availableBrands.add(product.marca);
                }
            });

            this.loadBrands();
            this.filteredProducts = [...this.allProducts];
            this.renderProducts();
            
            console.log(`Cargados ${this.allProducts.length} productos`);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            this.showError('Error al cargar los productos');
        }
    }

    loadBrands() {
        const brandFilter = document.getElementById('brandProductFilter');
        if (!brandFilter) return;

        // Limpiar opciones existentes excepto la primera
        brandFilter.innerHTML = '<option value="todas">Todas las marcas</option>';

        // Agregar marcas ordenadas
        const sortedBrands = Array.from(this.availableBrands).sort();
        sortedBrands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchProductInput')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryProductFilter')?.value || 'todos';
        const brandFilter = document.getElementById('brandProductFilter')?.value || 'todas';

        this.filteredProducts = this.allProducts.filter(product => {
            const matchesSearch = product.nombre.toLowerCase().includes(searchTerm) ||
                                product.descripcion.toLowerCase().includes(searchTerm) ||
                                (product.marca && product.marca.toLowerCase().includes(searchTerm));

            const matchesCategory = categoryFilter === 'todos' || product.categoria === categoryFilter;
            const matchesBrand = brandFilter === 'todas' || product.marca === brandFilter;

            return matchesSearch && matchesCategory && matchesBrand;
        });

        this.renderProducts();
    }

    renderProducts() {
        const productGrid = document.getElementById('adminProductGrid');
        if (!productGrid) return;

        if (this.filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-box-seam display-1 text-muted"></i>
                        <h3 class="text-muted mt-3">No hay productos</h3>
                        <p class="text-muted">Agrega productos para mostrar en el catálogo mayorista</p>
                    </div>
                </div>
            `;
            return;
        }

        productGrid.innerHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
    }

    createProductCard(product) {
        const regularPrice = parseFloat(product.precio || 0);
        const wholesalePrice = parseFloat(product.precioMayorista || regularPrice * 0.85);
        const discount = Math.round(((regularPrice - wholesalePrice) / regularPrice) * 100);

        return `
            <div class="col">
                <div class="card h-100 shadow-sm">
                    <img src="${product.imagen || '/imgs/placeholder.jpg'}" 
                         class="card-img-top" 
                         style="height: 200px; object-fit: cover;"
                         alt="${product.nombre}">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title">${product.nombre}</h6>
                        <p class="card-text text-muted small flex-grow-1">${product.descripcion?.substring(0, 80)}...</p>
                        
                        <div class="mb-2">
                            <span class="badge bg-secondary">${product.categoria}</span>
                            ${product.marca ? `<span class="badge bg-info ms-1">${product.marca}</span>` : ''}
                        </div>
                        
                        <div class="mb-2">
                            <div class="text-decoration-line-through text-muted small">
                                Precio regular: $${regularPrice.toLocaleString()}
                            </div>
                            <div class="fw-bold text-success">
                                Precio mayorista: $${wholesalePrice.toLocaleString()}
                                <span class="badge bg-success ms-1">${discount}% OFF</span>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <small class="text-muted">Stock: ${product.stock || 0} unidades</small>
                        </div>
                        
                        <div class="mt-auto">
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary flex-fill" 
                                        data-action="edit-product" 
                                        data-product-id="${product.id}">
                                    <i class="bi bi-pencil"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-outline-danger" 
                                        data-action="delete-product" 
                                        data-product-id="${product.id}">
                                    <i class="bi bi-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    openProductModal(mode = 'create', productData = null) {
        const modal = new bootstrap.Modal(document.getElementById('productModal'));
        const form = document.getElementById('productForm');
        const modalTitle = document.querySelector('#productModal .modal-title');

        // Resetear formulario
        form.reset();
        form.classList.remove('was-validated');

        if (mode === 'create') {
            modalTitle.textContent = 'Agregar Producto';
            form.removeAttribute('data-product-id');
            form.removeAttribute('data-mode');
        } else if (mode === 'edit' && productData) {
            modalTitle.textContent = 'Editar Producto';
            form.setAttribute('data-product-id', productData.id);
            form.setAttribute('data-mode', 'edit');

            // Llenar campos
            document.getElementById('productName').value = productData.nombre || '';
            document.getElementById('productCategory').value = productData.categoria || '';
            document.getElementById('productBrand').value = productData.marca || '';
            document.getElementById('productPrice').value = productData.precio || '';
            document.getElementById('productWholesalePrice').value = productData.precioMayorista || '';
            document.getElementById('productStock').value = productData.stock || '';
            document.getElementById('productDescription').value = productData.descripcion || '';

            // Configurar imagen
            if (productData.imagen) {
                document.getElementById('imageSourceUrl').checked = true;
                document.getElementById('productImageUrl').value = productData.imagen;
                this.toggleImageSource();
            }
        }

        modal.show();
    }

    async editProduct(productId) {
        try {
            const docRef = doc(db, 'productos', productId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Producto no encontrado');
            }

            const productData = { id: productId, ...docSnap.data() };
            this.openProductModal('edit', productData);
        } catch (error) {
            console.error('Error al cargar producto:', error);
            this.showError('Error al cargar el producto');
        }
    }

    async deleteProduct(productId) {
        try {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "Esta acción eliminará el producto del catálogo",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                await deleteDoc(doc(db, 'productos', productId));
                await this.loadProducts();
                
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
            this.showError('Error al eliminar el producto');
        }
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        try {
            const isEditMode = form.hasAttribute('data-mode') && form.getAttribute('data-mode') === 'edit';
            
            // Mostrar loading
            Swal.fire({
                title: isEditMode ? 'Actualizando producto...' : 'Guardando producto...',
                text: 'Por favor espera...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Obtener datos del formulario
            const nombre = document.getElementById('productName').value.trim();
            const categoria = document.getElementById('productCategory').value;
            const marca = document.getElementById('productBrand').value.trim();
            const precio = parseFloat(document.getElementById('productPrice').value);
            const precioMayorista = parseFloat(document.getElementById('productWholesalePrice').value);
            const stock = parseInt(document.getElementById('productStock').value);
            const descripcion = document.getElementById('productDescription').value.trim();

            // Obtener imagen
            const imagen = await this.getImageUrl();

            const productData = {
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

            if (isEditMode) {
                const productId = form.getAttribute('data-product-id');
                await updateDoc(doc(db, 'productos', productId), productData);
            } else {
                productData.fechaCreacion = new Date().toISOString();
                productData.createdBy = auth.currentUser.email;
                await addDoc(collection(db, 'productos'), productData);
            }

            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            modal.hide();

            // Recargar productos
            await this.loadProducts();

            // Mostrar éxito
            Swal.fire({
                icon: 'success',
                title: isEditMode ? '¡Producto actualizado!' : '¡Producto creado!',
                text: 'Los cambios se reflejarán en el catálogo mayorista',
                timer: 3000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error al guardar producto:', error);
            this.showError('Error al guardar el producto');
        }
    }

    async getImageUrl() {
        const imageSource = document.querySelector('input[name="imageSource"]:checked').value;
        
        if (imageSource === 'url') {
            return document.getElementById('productImageUrl').value;
        } else {
            const imageFile = document.getElementById('productImage').files[0];
            if (imageFile) {
                return await this.uploadImage(imageFile);
            } else {
                throw new Error('Debes seleccionar una imagen');
            }
        }
    }

    async uploadImage(imageFile) {
        try {
            const fileName = `productos/${Date.now()}_${imageFile.name}`;
            const storageRef = ref(storage, fileName);
            
            const snapshot = await uploadBytes(storageRef, imageFile);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            return downloadURL;
        } catch (error) {
            throw new Error('Error al subir la imagen');
        }
    }

    toggleImageSource() {
        const imageSource = document.querySelector('input[name="imageSource"]:checked').value;
        const fileSection = document.getElementById('fileUploadSection');
        const urlSection = document.getElementById('urlInputSection');

        if (imageSource === 'file') {
            fileSection.style.display = 'block';
            urlSection.style.display = 'none';
        } else {
            fileSection.style.display = 'none';
            urlSection.style.display = 'block';
        }
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que estamos en el panel admin
    if (window.location.pathname.includes('/admin/')) {
        new CatalogoAdmin();
    }
}); 