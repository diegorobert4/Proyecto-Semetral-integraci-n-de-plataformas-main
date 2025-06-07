// Configuración de Transbank para ambiente de integración
export const TRANSBANK_CONFIG = {
    // Credenciales del ambiente de integración
    COMMERCE_CODE: '597055555532',
    API_KEY: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
    ENVIRONMENT: 'integration', // 'integration' o 'production'
    
    // URLs de retorno después del pago
    RETURN_URL: window.location.origin + '/views/carrito.html',
    RETURN_URL_MAYORISTA: window.location.origin + '/views/carrito-mayorista.html',
    
    // URLs de la API de Webpay
    API_URL: {
        integration: 'https://webpay3gint.transbank.cl',
        production: 'https://webpay3g.transbank.cl'
    }
}; 