// IMPORTANTE: Este archivo debe ser un módulo ES6
// Si Transbank no proporciona un módulo ES6, necesitaremos una estrategia diferente

// Simulación de la integración de Webpay (modo desarrollo)
export const WebpayPlus = {
    Transaction: {
        create: async (sessionId, orderId, total) => {
            console.warn('MODO DESARROLLO: Simulando creación de transacción Webpay');
            return {
                token: `dev_token_${Date.now()}`,
                url: 'https://transbank-dev.cl/pagar'
            };
        },
        commit: async (token) => {
            console.warn('MODO DESARROLLO: Simulando confirmación de transacción');
            return {
                status: 'AUTHORIZED',
                amount: 10000,
                transaction_date: new Date().toISOString()
            };
        }
    },
    configureForIntegration: (commerceCode, apiKey) => {
        console.log('Configurando Webpay para integración', { commerceCode, apiKey });
    },
    configureForProduction: (commerceCode, apiKey) => {
        console.log('Configurando Webpay para producción', { commerceCode, apiKey });
    }
};

import { getAuth } from 'firebase/auth';
import { TRANSBANK_CONFIG } from './config/transbank-config.js';

class WebpayIntegration {
    constructor() {
        console.log('Inicializando WebpayIntegration');
        // Configuración de Webpay usando el archivo de configuración
        this.commerceCode = TRANSBANK_CONFIG.COMMERCE_CODE;
        this.apiKey = TRANSBANK_CONFIG.API_KEY;
        
        console.log('Configuración:', {
            commerceCode: this.commerceCode,
            environment: TRANSBANK_CONFIG.ENVIRONMENT
        });
        
        // Configurar el entorno (integración o producción)
        this.initializeWebpay();
    }

    initializeWebpay() {
        try {
            // Configuración para ambiente de integración
            if (TRANSBANK_CONFIG.ENVIRONMENT === 'integration') {
                console.log('Configurando Webpay para ambiente de integración');
                WebpayPlus.configureForIntegration(this.commerceCode, this.apiKey);
            } else {
                console.log('Configurando Webpay para ambiente de producción');
                WebpayPlus.configureForProduction(this.commerceCode, this.apiKey);
            }
        } catch (error) {
            console.error('Error al configurar Webpay:', error);
        }
    }

    async createTransaction(total, sessionId) {
        try {
            console.log('Creando transacción con:', { total, sessionId });
            
            const transaction = await WebpayPlus.Transaction.create(
                sessionId, // ID único de la transacción
                `order_${Date.now()}`, // ID de la orden
                total // Monto total
            );

            console.log('Transacción creada:', transaction);

            // Guardar detalles de la transacción para referencia posterior
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
            const response = await WebpayPlus.Transaction.commit(token);
            return response;
        } catch (error) {
            console.error('Error al confirmar transacción:', error);
            throw error;
        }
    }
}

// Exportar una instancia para uso global
export const webpayIntegration = new WebpayIntegration(); 