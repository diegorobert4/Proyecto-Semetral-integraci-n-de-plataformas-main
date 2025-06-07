import { auth, db } from './config/firebase-config.js';
import { 
    doc, 
    getDoc,
    query,
    collection,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class CartCounterManager {
    constructor() {
        this.isInitialized = false;
        this.isMayorista = false;
        this.init();
    }

    async init() {
        console.log('🔄 Inicializando CartCounterManager...');
        
        // Esperar a que Firebase auth esté listo
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.checkUserType(user);
                this.setupCounters();
            } else {
                this.clearCounters();
            }
        });

        // Escuchar eventos de actualización del carrito mayorista
        window.addEventListener('carritoMayoristaUpdated', (e) => {
            if (this.isMayorista) {
                console.log('📢 Evento carritoMayoristaUpdated recibido en CartCounterManager');
                this.updateCartCounters();
            }
        });

        // Escuchar evento de carrito limpiado después de pago exitoso
        window.addEventListener('cartCleared', () => {
            console.log('📢 Evento cartCleared recibido en CartCounterManager');
            this.clearCounters();
        });

        // Escuchar cambios en localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'carritoMayorista' && this.isMayorista) {
                console.log('📢 Cambio en localStorage carritoMayorista detectado');
                this.updateCartCounters();
            }
        });

        this.isInitialized = true;
        console.log('✅ CartCounterManager inicializado');
    }

    async checkUserType(user) {
        try {
            console.log('🔍 Verificando tipo de usuario para:', user.email);
            
            // Verificar si el usuario es mayorista validado
            const userQuery = query(
                collection(db, 'usuarios'),
                where('email', '==', user.email),
                where('tipo', '==', 'mayorista'),
                where('validado', '==', true)
            );
            
            const querySnapshot = await getDocs(userQuery);
            this.isMayorista = !querySnapshot.empty;
            
            console.log('👤 Usuario es mayorista:', this.isMayorista);
        } catch (error) {
            console.error('❌ Error al verificar tipo de usuario:', error);
            this.isMayorista = false;
        }
    }

    setupCounters() {
        if (!this.isMayorista) {
            console.log('⚠️ Usuario no es mayorista, no configurando contadores');
            return;
        }

        console.log('🔧 Configurando contadores para usuario mayorista');
        this.updateCartCounters();
    }

    updateCartCounters() {
        if (!this.isMayorista) return;

        console.log('🔄 Actualizando contadores del carrito mayorista...');
        
        // Obtener datos del carrito mayorista desde localStorage
        const cart = JSON.parse(localStorage.getItem('carritoMayorista')) || [];
        const total = cart.reduce((sum, item) => sum + item.cantidad, 0);
        
        console.log('📊 Total de items en carrito mayorista:', total);

        // Actualizar todos los contadores de carrito
        const selectors = [
            '.cart-count-mayorista',
            '.cart-count',
            '.cart-badge',
            '[data-cart-count]'
        ];

        let updatedCount = 0;
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.textContent = total;
                updatedCount++;
                console.log(`✅ Contador actualizado (${selector}):`, element);
            });
        });

        console.log(`🎯 Total de contadores actualizados: ${updatedCount}`);
    }

    clearCounters() {
        console.log('🧹 Limpiando contadores de carrito');
        
        const selectors = [
            '.cart-count-mayorista',
            '.cart-count',
            '.cart-badge',
            '[data-cart-count]'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.textContent = '0';
            });
        });
    }

    // Método público para forzar actualización
    forceUpdate() {
        if (this.isInitialized) {
            this.updateCartCounters();
        }
    }
}

// Crear instancia global
const cartCounterManager = new CartCounterManager();
window.cartCounterManager = cartCounterManager;

export default CartCounterManager; 