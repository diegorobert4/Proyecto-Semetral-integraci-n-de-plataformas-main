import { auth, db } from '../config/firebase-config.js';
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class AdminAuth {
    constructor() {
        this.checkAdminStatus();
    }

    async checkAdminStatus() {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Si no hay usuario, redirigir al login
                window.location.href = '../iniciar-sesion.html';
                return;
            }

            if (user.email !== 'admin@gmail.com') {
                // Si no es el admin, redirigir al inicio
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: 'No tienes permisos para acceder al panel de administración',
                    confirmButtonText: 'Entendido'
                }).then(() => {
                    window.location.href = '../index.html';
                });
                return;
            }

            // Si es el admin, actualizar la UI
            document.querySelector('.admin-name').textContent = 'Administrador';
            
            // Configurar el botón de logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    try {
                        await auth.signOut();
                        window.location.href = '../index.html';
                    } catch (error) {
                        console.error('Error al cerrar sesión:', error);
                    }
                });
            }
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new AdminAuth();
}); 