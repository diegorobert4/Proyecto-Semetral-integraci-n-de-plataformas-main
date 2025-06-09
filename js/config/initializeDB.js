import { productosAPI } from './firebase-config.js';
import { productosAPI as apiProductos } from './api/products.js';

const productosIniciales = [
    // Motores y Componentes
    {
        codigo: "FA-001",
        marca: "Bosch",
        codigoFabricante: "BOS-1234",
        nombre: "Filtro de Aceite Premium",
        categoria: "Motores y Componentes",
        subcategoria: "Filtros de aceite",
        precio: {
            retail: 15990,
            wholesale: 12990
        },
        stock: 100,
        descripcion: "Filtro de aceite de alta calidad para motores de alto rendimiento",
        imagenes: ["https://m.media-amazon.com/images/I/71eBZJ+TpbL._AC_SL1500_.jpg"]
    },
    {
        codigo: "FA-002",
        marca: "Mann-Filter",
        codigoFabricante: "MF-5678",
        nombre: "Filtro de Aire Deportivo",
        categoria: "Motores y Componentes",
        subcategoria: "Filtros de aire",
        precio: {
            retail: 25990,
            wholesale: 21990
        },
        stock: 75,
        descripcion: "Filtro de aire deportivo de alto flujo",
        imagenes: ["https://m.media-amazon.com/images/I/61KYDHyBbIL._AC_SL1000_.jpg"]
    },
    // Frenos y Suspensión
    {
        codigo: "FB-001",
        marca: "Brembo",
        codigoFabricante: "BR-9012",
        nombre: "Pastillas de Freno Cerámicas",
        categoria: "Frenos y Suspensión",
        subcategoria: "Pastillas de freno",
        precio: {
            retail: 45990,
            wholesale: 39990
        },
        stock: 50,
        descripcion: "Pastillas de freno cerámicas de alto rendimiento",
        imagenes: ["https://m.media-amazon.com/images/I/71af8BlxZiL._AC_SL1500_.jpg"]
    },
    // Electricidad y Baterías
    {
        codigo: "EB-001",
        marca: "Optima",
        codigoFabricante: "OPT-3456",
        nombre: "Batería de Alto Rendimiento",
        categoria: "Electricidad y Baterías",
        subcategoria: "Baterías",
        precio: {
            retail: 159990,
            wholesale: 139990
        },
        stock: 30,
        descripcion: "Batería de alto rendimiento con tecnología AGM",
        imagenes: ["https://m.media-amazon.com/images/I/71RGsNid-sL._AC_SL1500_.jpg"]
    },
    // Accesorios y Seguridad
    {
        codigo: "AS-001",
        marca: "Viper",
        codigoFabricante: "VP-7890",
        nombre: "Alarma con GPS",
        categoria: "Accesorios y Seguridad",
        subcategoria: "Alarmas",
        precio: {
            retail: 89990,
            wholesale: 75990
        },
        stock: 25,
        descripcion: "Sistema de alarma con GPS y control desde smartphone",
        imagenes: ["https://m.media-amazon.com/images/I/61YoV+OnRhL._AC_SL1500_.jpg"]
    }
];

// Función para inicializar la base de datos
export async function inicializarBaseDeDatos() {
    try {
        console.log("Iniciando carga de productos...");
        let productosAgregados = 0;
        
        for (const producto of productosIniciales) {
            await productosAPI.agregarProducto(producto);
            productosAgregados++;
            console.log(`Producto agregado (${productosAgregados}/${productosIniciales.length}): ${producto.nombre}`);
        }
        
        console.log(`Base de datos inicializada correctamente. Se agregaron ${productosAgregados} productos.`);
        return true;
    } catch (error) {
        console.error("Error al inicializar la base de datos:", error);
        return false;
    }
}

async function mostrarProductosPopulares() {
    try {
        const productos = await apiProductos.obtenerPopulares(4);
        // Renderizar los productos en tu HTML
    } catch (error) {
        console.error('Error:', error);
    }
}

// Ejemplos de uso:
const todosLosProductos = await apiProductos.obtenerTodos();
const productoPorId = await apiProductos.obtenerPorId('id-del-producto');
const productosPorCategoria = await apiProductos.obtenerPorCategoria('motores');
const productosPorMarca = await apiProductos.obtenerPorMarca('bosch');
const productosBuscados = await apiProductos.buscar('filtro');
const productosPopulares = await apiProductos.obtenerPopulares(4); 