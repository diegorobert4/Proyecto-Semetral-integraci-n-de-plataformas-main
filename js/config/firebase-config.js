// Importar las funciones necesarias de Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB7zt55jPT8IYyfGNnrcVw2HZjRQwc3Y14",
    authDomain: "auto-parts-2025.firebaseapp.com",
    projectId: "auto-parts-2025",
    storageBucket: "auto-parts-2025.firebasestorage.app",
    messagingSenderId: "758243524320",
    appId: "1:758243524320:web:7540895a596c808f795a85",
    measurementId: "G-QC6EKQR3XS"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Referencias a servicios de Firebase
const auth = getAuth(app);
const db = getFirestore(app);

// Funciones para manejar productos
export const productosAPI = {
    // Agregar un nuevo producto
    async agregarProducto(producto) {
        try {
            const docRef = await addDoc(collection(db, "productos"), {
                codigo: producto.codigo,
                marca: producto.marca,
                codigoFabricante: producto.codigoFabricante,
                nombre: producto.nombre,
                categoria: producto.categoria,
                subcategoria: producto.subcategoria,
                precio: {
                    retail: producto.precio.retail,
                    wholesale: producto.precio.wholesale
                },
                stock: producto.stock,
                descripcion: producto.descripcion,
                imagenes: producto.imagenes,
                createdAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error al agregar producto:", error);
            throw error;
        }
    },

    // Obtener todos los productos
    async obtenerProductos() {
        try {
            const querySnapshot = await getDocs(collection(db, "productos"));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error al obtener productos:", error);
            throw error;
        }
    },

    // Obtener productos por categoría
    async obtenerProductosPorCategoria(categoria) {
        try {
            const q = query(collection(db, "productos"), where("categoria", "==", categoria));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error al obtener productos por categoría:", error);
            throw error;
        }
    }
};

// Funciones para manejar usuarios
export const usuariosAPI = {
    // Agregar un nuevo usuario
    async agregarUsuario(usuario) {
        try {
            const docRef = await addDoc(collection(db, "usuarios"), {
                tipo: usuario.tipo,
                nombre: usuario.nombre,
                email: usuario.email,
                direccion: usuario.direccion,
                telefono: usuario.telefono,
                tipoDistribuidor: usuario.tipoDistribuidor,
                createdAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error al agregar usuario:", error);
            throw error;
        }
    }
};

// Funciones para manejar órdenes
export const ordenesAPI = {
    // Crear una nueva orden
    async crearOrden(orden) {
        try {
            const docRef = await addDoc(collection(db, "ordenes"), {
                userId: orden.userId,
                fecha: new Date(),
                productos: orden.productos,
                total: orden.total,
                estado: "pendiente"
            });
            return docRef.id;
        } catch (error) {
            console.error("Error al crear orden:", error);
            throw error;
        }
    }
};

// Exportar las instancias para uso en otros archivos
export { app, auth, db, analytics };

// Estructura de la base de datos (esto es solo para referencia)
/*
// Colección de Productos
const productosEstructura = {
    productId: {
        codigo: "AP-12345",
        marca: "Bosch",
        codigoFabricante: "BOS-67890",
        nombre: "Filtro de Aceite Bosch",
        categoria: "Motores y Componentes",
        subcategoria: "Filtros de aceite",
        precio: {
            retail: 25990,
            wholesale: 19990
        },
        stock: 100,
        descripcion: "...",
        imagenes: ["url1", "url2"]
    }
};

// Colección de Usuarios
const usuariosEstructura = {
    userId: {
        tipo: "B2C|B2B",
        nombre: "...",
        email: "...",
        direccion: "...",
        telefono: "...",
        tipoDistribuidor: "taller|distribuidor" // solo para B2B
    }
};

// Colección de Órdenes
const ordenesEstructura = {
    orderId: {
        userId: "...",
        fecha: "timestamp",
        productos: [{
            productId: "...",
            cantidad: 2,
            precioUnitario: 25990
        }],
        total: 51980,
        estado: "pendiente|pagado|enviado|entregado"
    }
};
*/