// Script para agregar marcas a productos existentes
// Este script se debe ejecutar una sola vez para actualizar la base de datos

import { db } from './config/firebase-config.js';
import { 
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Marcas comunes para diferentes categorías
const marcasPorCategoria = {
    'motores': ['Bosch', 'NGK', 'Denso', 'Gates', 'Febi'],
    'frenos': ['Brembo', 'ATE', 'TRW', 'Ferodo', 'Bosch'],
    'electricidad': ['Bosch', 'Varta', 'Exide', 'Hella', 'Philips'],
    'accesorios': ['Thule', 'Hella', 'Bosch', 'Mann', 'K&N']
};

async function updateProductsWithBrands() {
    try {
        console.log('🔄 Iniciando actualización de productos con marcas...');
        
        const productosRef = collection(db, 'productos');
        const querySnapshot = await getDocs(productosRef);
        
        let updatedCount = 0;
        
        for (const docSnapshot of querySnapshot.docs) {
            const product = docSnapshot.data();
            
            // Solo actualizar si no tiene marca
            if (!product.marca) {
                const categoria = product.categoria?.toLowerCase() || 'accesorios';
                const marcasDisponibles = marcasPorCategoria[categoria] || marcasPorCategoria['accesorios'];
                
                // Seleccionar una marca aleatoria de la categoría
                const marcaSeleccionada = marcasDisponibles[Math.floor(Math.random() * marcasDisponibles.length)];
                
                // Actualizar el documento
                const docRef = doc(db, 'productos', docSnapshot.id);
                const updateData = {
                    marca: marcaSeleccionada,
                    fechaActualizacion: new Date()
                };
                
                // Agregar información de creador si no existe
                if (!product.createBy && !product.createdBy) {
                    updateData.createBy = 'Sistema (migración)';
                    updateData.createdBy = 'Sistema (migración)';
                    updateData.updatedBy = 'Sistema (migración)';
                    if (!product.fechaCreacion) {
                        updateData.fechaCreacion = new Date().toISOString();
                    }
                }
                
                await updateDoc(docRef, updateData);
                
                console.log(`✅ Producto "${product.nombre}" actualizado con marca: ${marcaSeleccionada}`);
                updatedCount++;
            }
        }
        
        console.log(`🎉 Actualización completada. ${updatedCount} productos actualizados.`);
        
        // Mostrar mensaje de éxito
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: '¡Actualización completada!',
                text: `Se actualizaron ${updatedCount} productos con marcas`,
                confirmButtonText: 'Recargar página'
            }).then(() => {
                window.location.reload();
            });
        } else {
            alert(`Actualización completada. ${updatedCount} productos actualizados.`);
            window.location.reload();
        }
        
    } catch (error) {
        console.error('❌ Error al actualizar productos:', error);
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar productos: ' + error.message
            });
        } else {
            alert('Error al actualizar productos: ' + error.message);
        }
    }
}

// Función para ejecutar la actualización (solo para administradores)
async function runUpdate() {
    // Verificar autenticación
    const auth = (await import('./config/firebase-config.js')).auth;
    
    if (!auth.currentUser || auth.currentUser.email !== 'admin@gmail.com') {
        alert('Solo el administrador puede ejecutar esta actualización');
        return;
    }
    
    const confirmacion = confirm(
        '¿Estás seguro de que quieres actualizar todos los productos?\n\n' +
        'Esta acción realizará lo siguiente:\n' +
        '• Agregará marcas aleatorias a productos sin marca\n' +
        '• Agregará información de creador a productos antiguos\n' +
        '• Actualizará las fechas de modificación'
    );
    
    if (confirmacion) {
        await updateProductsWithBrands();
    }
}

// Exponer la función globalmente para poder ejecutarla desde la consola
window.updateProductsWithBrands = runUpdate;

console.log('🔧 Script de actualización de marcas cargado.');
console.log('💡 Para ejecutar la actualización, usa: updateProductsWithBrands()'); 