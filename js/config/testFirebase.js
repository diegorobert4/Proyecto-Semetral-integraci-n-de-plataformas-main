import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Función de prueba completa
export async function testConexionFirestore() {
    try {
        console.log("Iniciando pruebas de Firestore...");
        
        // 1. Prueba de la colección 'test'
        console.log("\n--- Prueba colección 'test' ---");
        const testCollection = collection(db, 'test');
        const testDoc = await addDoc(testCollection, {
            mensaje: "Prueba de conexión",
            timestamp: new Date()
        });
        console.log("✓ Documento de prueba creado con ID:", testDoc.id);

        // 2. Prueba de la colección 'productos'
        console.log("\n--- Prueba colección 'productos' ---");
        const productosCollection = collection(db, 'productos');
        const productoEjemplo = {
            codigo: "TEST-001",
            nombre: "Producto de Prueba",
            categoria: "Test",
            precio: {
                retail: 1000,
                wholesale: 800
            },
            stock: 10,
            descripcion: "Producto para prueba de conexión",
            createdAt: new Date()
        };

        try {
            const productoDoc = await addDoc(productosCollection, productoEjemplo);
            console.log("✓ Producto de prueba creado con ID:", productoDoc.id);
        } catch (error) {
            console.log("× Error al crear producto (esperado si no hay autenticación):", error.message);
        }

        // 3. Prueba de lectura de productos
        const productosSnapshot = await getDocs(productosCollection);
        console.log("✓ Lectura de productos exitosa. Cantidad:", productosSnapshot.size);

        // 4. Resumen de la prueba
        console.log("\n--- Resumen de la prueba ---");
        console.log("• Conexión a Firestore: Exitosa");
        console.log("• Escritura en colección 'test': Exitosa");
        console.log("• Lectura de colección 'productos': Exitosa");

        return true;
    } catch (error) {
        console.error("\n❌ Error en la prueba de conexión:", error);
        return false;
    }
} 