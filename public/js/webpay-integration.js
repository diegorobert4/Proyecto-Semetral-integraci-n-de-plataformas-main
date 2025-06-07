// IMPORTANTE: Este archivo debe ser un módulo ES6
// Si Transbank no proporciona un módulo ES6, necesitaremos una estrategia diferente




import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { TRANSBANK_CONFIG } from './config/transbank-config.js';

class WebpayIntegration {
    constructor() {
        console.log('Inicializando WebpayIntegration');
        this.functionsUrl = 'https://us-central1-auto-parts-2025.cloudfunctions.net';
    }

    async createTransaction(amount, sessionId, orderId, items, returnUrl = TRANSBANK_CONFIG.RETURN_URL) {
        try {
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            console.log('Creando transacción con:', { amount, sessionId, orderId, items });

            const response = await fetch(`${this.functionsUrl}/createWebpayTransaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount,
                    sessionId,
                    orderId,
                    returnUrl,
                    items,
                    userId: user.uid
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const transaction = await response.json();
            console.log('Transacción creada:', transaction);

            return {
                token: transaction.token,
                url: transaction.url
            };
        } catch (error) {
            console.error('Error detallado al crear transacción de Webpay:', error);
            throw error;
        }
    }

    async confirmTransaction(token) {
        try {
            // Mostrar loading mientras se procesa la confirmación
            Swal.fire({
                title: 'Procesando pago...',
                html: `
                    <div class="text-center">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p>Confirmando transacción con WebPay</p>
                        <small class="text-muted">Por favor espera, no cierres esta ventana</small>
                    </div>
                `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(`${this.functionsUrl}/confirmWebpayTransaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();
            
            // Mostrar mensaje de confirmación
            if (result.status === 'AUTHORIZED') {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Pago Exitoso!',
                    html: `
                        <div class="text-center">
                            <p class="mb-3">Tu pago ha sido procesado correctamente</p>
                            <div class="alert alert-success">
                                <strong>Código de autorización:</strong> ${result.authorization_code}<br>
                                <strong>Fecha:</strong> ${new Date(result.transaction_date).toLocaleString()}<br>
                                <strong>Monto:</strong> $${result.amount.toLocaleString()}
                            </div>
                            <p class="mt-3">Recibirás un correo con los detalles de tu compra</p>
                            <div class="mt-4">
                                <button class="btn btn-primary me-2" onclick="window.location.href='/views/mis-ordenes.html'">
                                    <i class="bi bi-box me-2"></i>Ver Mis Órdenes
                                </button>
                                <button class="btn btn-outline-secondary" onclick="Swal.close()">
                                    Continuar
                                </button>
                            </div>
                        </div>
                    `,
                    showConfirmButton: false,
                    allowOutsideClick: false
                });

                // La limpieza del carrito y redirección se manejan en setupWebpayReturnHandler
                // de cada página específica para evitar conflictos
            } else {
                throw new Error('Transacción no autorizada');
            }

            return result;
        } catch (error) {
            console.error('Error al confirmar transacción:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error en el Pago',
                text: 'No se pudo completar la transacción. Por favor, intenta nuevamente.',
                confirmButtonText: 'Volver al Carrito'
            });
            throw error;
        }
    }

    async refundTransaction(token, amount) {
        try {
            const response = await fetch(`${this.baseUrl}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}/refunds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Tbk-Api-Key-Id': TRANSBANK_CONFIG.COMMERCE_CODE,
                    'Tbk-Api-Key-Secret': TRANSBANK_CONFIG.API_KEY
                },
                body: JSON.stringify({ amount })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();
            return {
                type: result.type,
                authorization_code: result.authorization_code,
                response_code: result.response_code,
                amount: result.amount,
                status: 'REVERSED'
            };
        } catch (error) {
            console.error('Error al anular la transacción:', error);
            throw error;
        }
    }
}

// Exportar una instancia para uso global
export const webpayIntegration = new WebpayIntegration(); 