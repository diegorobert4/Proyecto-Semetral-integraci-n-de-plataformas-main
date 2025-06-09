const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const productosRef = db.collection('productos');
        const snapshot = await productosRef.get();
        const productos = [];
        
        snapshot.forEach(doc => {
            productos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Obtener un producto por ID
router.get('/:id', async (req, res) => {
    try {
        const productoRef = db.collection('productos').doc(req.params.id);
        const doc = await productoRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json({
            id: doc.id,
            ...doc.data()
        });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// Obtener productos por categoría
router.get('/categoria/:categoria', async (req, res) => {
    try {
        const productosRef = db.collection('productos');
        const q = productosRef.where('categoria', '==', req.params.categoria);
        const snapshot = await q.get();
        const productos = [];
        
        snapshot.forEach(doc => {
            productos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos por categoría:', error);
        res.status(500).json({ error: 'Error al obtener productos por categoría' });
    }
});

// Obtener productos por marca
router.get('/marca/:marca', async (req, res) => {
    try {
        const productosRef = db.collection('productos');
        const q = productosRef.where('marca', '==', req.params.marca);
        const snapshot = await q.get();
        const productos = [];
        
        snapshot.forEach(doc => {
            productos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos por marca:', error);
        res.status(500).json({ error: 'Error al obtener productos por marca' });
    }
});

// Buscar productos por nombre o descripción
router.get('/buscar/:termino', async (req, res) => {
    try {
        const termino = req.params.termino.toLowerCase();
        const productosRef = db.collection('productos');
        const snapshot = await productosRef.get();
        const productos = [];
        
        snapshot.forEach(doc => {
            const producto = doc.data();
            if (
                producto.nombre.toLowerCase().includes(termino) ||
                producto.descripcion.toLowerCase().includes(termino)
            ) {
                productos.push({
                    id: doc.id,
                    ...producto
                });
            }
        });
        
        res.json(productos);
    } catch (error) {
        console.error('Error al buscar productos:', error);
        res.status(500).json({ error: 'Error al buscar productos' });
    }
});

// Obtener productos populares (los más vendidos)
router.get('/populares/:limite', async (req, res) => {
    try {
        const limite = parseInt(req.params.limite) || 4;
        const productosRef = db.collection('productos');
        const q = productosRef.orderBy('ventas', 'desc').limit(limite);
        const snapshot = await q.get();
        const productos = [];
        
        snapshot.forEach(doc => {
            productos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos populares:', error);
        res.status(500).json({ error: 'Error al obtener productos populares' });
    }
});

module.exports = router; 