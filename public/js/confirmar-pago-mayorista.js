import { auth, db } from './config/firebase-config.js';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de la URL base de Firebase Functions
const FUNCTIONS_URL = 'https://us-central1-auto-parts-2025.cloudfunctions.net';

// Referencias a elementos del DOM
const loadingState = document.getElementById('loadingState');
const successState = document.getElementById('successState');
const errorState = document.getElementById('errorState');
const orderDetails = document.getElementById('orderDetails');

// Función para formatear precios
function formatPrice(price) {
    return `$${price.toLocaleString()}`;
}

// Función para mostrar los detalles del pedido
function displayOrderDetails(order) {
    if (!orderDetails) return;

    const items = order.items.map(item => `
        <div class="mb-3">
            <div class="d-flex justify-content-between">
                <strong>${item.nombre}</strong>
                <span>${formatPrice(item.precio * item.cantidad)}</span>
            </div>
            <div class="text-muted small">
                ${item.cantidad} unidades (${item.cantidad / item.loteMinimo} lotes de ${item.loteMinimo})
                a ${formatPrice(item.precio)} c/u
            </div>
        </div>
    `).join('');

    orderDetails.innerHTML = `
        <div class="border-bottom pb-3 mb-3">
            <div class="text-muted mb-2">Orden #${order.id}</div>
            ${items}
        </div>
        <div class="d-flex justify-content-between mb-2">
            <span>Subtotal:</span>
            <span>${formatPrice(order.total / 0.85)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
            <span>Descuento Mayorista (15%):</span>
            <span>-${formatPrice(order.total * 0.15 / 0.85)}</span>
        </div>
        <div class="d-flex justify-content-between fw-bold">
            <span>Total:</span>
            <span>${formatPrice(order.total)}</span>
        </div>
    `;
}

// Función para verificar el estado del pago
async function checkPaymentStatus() {
    try {
        // Obtener el token de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token_ws');

        if (!token) {
            console.log('No hay token en la URL');
            return;
        }

        console.log('Verificando pago con token:', token);

        // Verificar el estado del pago con WebPay usando Firebase Functions
        const response = await fetch(`${FUNCTIONS_URL}/confirmWebpayTransaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta del servidor: ${response.status}`);
        }

        const result = await response.json();
        console.log('Resultado de la verificación:', result);

        if (result.status === 'AUTHORIZED') {
            // Buscar la orden por el token
            const ordersRef = collection(db, 'ordenes_mayorista');
            const q = query(ordersRef, where('webpayToken', '==', token));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('Orden no encontrada');
            }

            const orderDoc = querySnapshot.docs[0];
            const orderId = orderDoc.id;
            const orderData = orderDoc.data();

            // Actualizar el estado de la orden
            await updateDoc(doc(db, 'ordenes_mayorista', orderId), {
                status: 'paid',
                paymentDetails: result
            });

            // Preparar el resumen de items
            const resumenItems = orderData.items.map(item => `
                <tr>
                    <td>${item.nombre}</td>
                    <td>${item.cantidad} unidades</td>
                    <td>$${(item.precio * item.cantidad).toLocaleString()}</td>
                </tr>
            `).join('');

            // Mostrar el resumen de la compra
            Swal.fire({
                icon: 'success',
                title: '¡Pago Realizado con Éxito!',
                html: `
                    <div class="text-start">
                        <div class="alert alert-success mb-4">
                            <i class="bi bi-check-circle me-2"></i>
                            Tu pago ha sido procesado correctamente
                        </div>
                        <h6 class="mb-3">Resumen de tu compra:</h6>
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resumenItems}
                            </tbody>
                            <tfoot>
                                <tr class="table-primary">
                                    <th colspan="2">Total Pagado:</th>
                                    <th>$${orderData.total.toLocaleString()}</th>
                                </tr>
                            </tfoot>
                        </table>
                        <div class="alert alert-info mt-3">
                            <i class="bi bi-info-circle me-2"></i>
                            Número de Orden: ${orderId}<br>
                            Código de Autorización: ${result.authorization_code}<br>
                            Fecha de Transacción: ${new Date(result.transaction_date).toLocaleString()}
                        </div>
                    </div>
                `,
                confirmButtonText: 'Ver Mis Pedidos',
                confirmButtonColor: '#0066B1',
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '../views/mis-ordenes.html';
                }
            });
        } else {
            throw new Error('Pago no autorizado');
        }
    } catch (error) {
        console.error('Error al procesar el pago:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error en el Pago',
            text: 'No se pudo completar el pago. Por favor, contacta con soporte.',
            confirmButtonColor: '#0066B1'
        }).then(() => {
            window.location.href = '../views/carrito-mayorista.html';
        });
    }
}

// Ejecutar la verificación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página cargada, verificando pago...');
    checkPaymentStatus();
});

// Verificar autenticación y tipo de usuario
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'iniciar-sesion.html';
        return;
    }

    // Verificar si es mayorista
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (!userDoc.exists() || userDoc.data().tipo !== 'mayorista') {
            window.location.href = 'index.html';
            return;
        }

        // Actualizar nombre de usuario
        const userNameSpan = document.querySelector('.user-name');
        if (userNameSpan) {
            userNameSpan.textContent = user.email;
        }

        // Verificar el estado del pago
        await checkPaymentStatus();
    } catch (error) {
        console.error('Error al verificar usuario:', error);
        window.location.href = 'index.html';
    }
});

// Configurar cierre de sesión
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cerrar sesión. Intenta nuevamente.',
            confirmButtonColor: '#0066B1'
        });
    }
}); 