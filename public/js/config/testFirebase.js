import { db } from './firebase-config.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Función de prueba completa
export async function testConexionFirestore() {
    try {
        console.log("Iniciando pruebas de Firestore...");
        
        // 1. Prueba de la colección 'test'
        console.log("\n--- Prueba colección 'test' ---");
        const testCollection = collection(db, 'test');
        const testDoc = await addDoc(testCollection, {
            mensaje: "Prueba de conexión",
            timestamp: new Date(),
            prueba_numero: Math.floor(Math.random() * 1000) // Número aleatorio para verificar
        });
        console.log("✓ Documento de prueba creado con ID:", testDoc.id);

        // 2. Prueba de lectura
        const querySnapshot = await getDocs(testCollection);
        console.log("✓ Lectura exitosa. Documentos encontrados:", querySnapshot.size);
        
        // 3. Mostrar contenido de los documentos
        console.log("\n--- Documentos en la colección 'test' ---");
        querySnapshot.forEach((doc) => {
            console.log(`Documento ID: ${doc.id}`);
            console.log("Datos:", doc.data());
        });

        return true;
    } catch (error) {
        console.error("\n❌ Error en la prueba de conexión:", error);
        return false;
    }
} 