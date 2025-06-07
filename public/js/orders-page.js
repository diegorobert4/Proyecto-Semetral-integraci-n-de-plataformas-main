import { auth, db } from './config/firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
    onSnapshot,
    getDoc,
    doc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

class OrdersPage {
    constructor() {
        this.ordersContainer = document.getElementById('orders-container');
        this.unsubscribe = null;
        
        // Verificar estado de autenticación
        this.setupAuthListener();
    }

    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    console.log('Usuario autenticado:', user.uid);
                    // Verificar si el usuario existe en la colección usuarios
                    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
                    if (!userDoc.exists()) {
                        console.log('Creando documento de usuario...');
                        // Si no existe, crear el documento
                        await setDoc(doc(db, 'usuarios', user.uid), {
                            email: user.email,
                            createdAt: new Date(),
                            lastLogin: new Date()
                        });
                    }
                    
                    // Esperar un momento para asegurar que la autenticación esté completamente establecida
                    setTimeout(() => {
                        this.loadOrders(user.uid);
                    }, 1000);
                } else {
                    console.log('Usuario no autenticado, redirigiendo...');
                    window.location.href = '../views/iniciar-sesion.html';
                }
            } catch (error) {
                console.error('Error en setupAuthListener:', error);
                this.showError(error.message);
            }
        });
    }

    async loadOrders(userId) {
        try {
            console.log('Cargando órdenes para usuario:', userId);
            console.log('Estado de autenticación:', auth.currentUser?.uid);
            
            // Limpiar suscripción anterior si existe
            if (this.unsubscribe) {
                this.unsubscribe();
            }

            const ordersRef = collection(db, 'orders');
            
            // Consulta simplificada mientras se crea el índice
            const q = query(
                ordersRef,
                where('userId', '==', userId)
            );

            try {
                const snapshot = await getDocs(q);
                console.log('Prueba de acceso exitosa, configurando listener en tiempo real');
                
                // Si getDocs funciona, configurar onSnapshot
                this.unsubscribe = onSnapshot(q, (querySnapshot) => {
                    console.log('Resultados obtenidos:', querySnapshot.size);
                    
                    if (querySnapshot.empty) {
                        console.log('No se encontraron órdenes');
                        this.showEmptyState();
                        return;
                    }

                    // Ordenar los documentos manualmente
                    const sortedDocs = querySnapshot.docs.sort((a, b) => {
                        const dateA = a.data().created_at?.toDate() || new Date(0);
                        const dateB = b.data().created_at?.toDate() || new Date(0);
                        return dateB - dateA; // orden descendente
                    });

                    this.renderOrders(sortedDocs);
                }, (error) => {
                    console.error('Error en onSnapshot:', error);
                    this.showError(`Error al escuchar cambios: ${error.message}`);
                });

            } catch (error) {
                console.error('Error en prueba inicial de acceso:', error);
                this.showError(`Error de acceso: ${error.message}`);
                throw error;
            }

        } catch (error) {
            console.error('Error detallado al cargar órdenes:', error);
            this.showError(`Error al cargar órdenes: ${error.message}`);
        }
    }

    showEmptyState() {
        this.ordersContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-box display-1 text-muted mb-3"></i>
                <h3>No tienes órdenes aún</h3>
                <p class="text-muted">¡Explora nuestro catálogo y realiza tu primera compra!</p>
                <a href="../views/catalogo.html" class="btn btn-primary mt-3">
                    <i class="bi bi-grid me-2"></i>Ver Catálogo
                </a>
            </div>
        `;
    }

    showError(errorMessage) {
        this.ordersContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Error al cargar las órdenes: ${errorMessage}
                <br>
                <small class="text-muted">Por favor, intenta recargar la página o inicia sesión nuevamente.</small>
                <br>
                <button class="btn btn-outline-danger btn-sm mt-2" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Recargar página
                </button>
            </div>
        `;
    }

    renderOrders(orders) {
        const ordersList = orders.map(doc => {
            const order = doc.data();
            const date = order.created_at?.toDate() || new Date();
            const items = order.items || [];
            const total = order.total || 0;

            return `
                <div class="card mb-4 order-card">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-0">Orden #${doc.id.slice(-8)}</h5>
                            <small class="text-muted">
                                ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
                            </small>
                        </div>
                        <span class="badge bg-${this.getStatusBadgeClass(order.status)}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h6 class="mb-3">Productos</h6>
                                ${items.map(item => `
                                    <div class="d-flex align-items-center mb-2">
                                        <span class="me-2">•</span>
                                        <span>${item.cantidad}x ${item.nombre}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="col-md-4 text-md-end">
                                <h6 class="mb-3">Total</h6>
                                <h4 class="text-primary mb-0">$${total.toLocaleString()}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-light">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge bg-${this.getShippingStatusBadgeClass(order.shipping_status)}">
                                    ${this.getShippingStatusText(order.shipping_status)}
                                </span>
                                <span class="badge bg-${this.getPaymentStatusBadgeClass(order.payment_status)} ms-2">
                                    ${this.getPaymentStatusText(order.payment_status)}
                                </span>
                            </div>
                            <button class="btn btn-sm btn-outline-primary" onclick="window.print()">
                                <i class="bi bi-printer me-2"></i>Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.ordersContainer.innerHTML = ordersList;
    }

    getStatusBadgeClass(status) {
        switch (status) {
            case 'completed': return 'success';
            case 'pending': return 'warning';
            case 'failed': return 'danger';
            default: return 'secondary';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'completed': return 'Completada';
            case 'pending': return 'Pendiente';
            case 'failed': return 'Fallida';
            default: return 'Desconocido';
        }
    }

    getShippingStatusBadgeClass(status) {
        switch (status) {
            case 'delivered': return 'success';
            case 'shipped': return 'info';
            case 'pending': return 'warning';
            default: return 'secondary';
        }
    }

    getShippingStatusText(status) {
        switch (status) {
            case 'delivered': return 'Entregado';
            case 'shipped': return 'En Camino';
            case 'pending': return 'Por Enviar';
            default: return 'Desconocido';
        }
    }

    getPaymentStatusBadgeClass(status) {
        switch (status) {
            case 'paid': return 'success';
            case 'pending': return 'warning';
            case 'failed': return 'danger';
            default: return 'secondary';
        }
    }

    getPaymentStatusText(status) {
        switch (status) {
            case 'paid': return 'Pagado';
            case 'pending': return 'Pendiente';
            case 'failed': return 'Fallido';
            default: return 'Desconocido';
        }
    }
}

// Inicializar la página cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando OrdersPage...');
    window.ordersPage = new OrdersPage();
}); 