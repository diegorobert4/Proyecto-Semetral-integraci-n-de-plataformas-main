const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const db = admin.firestore();
        const productsRef = db.collection('productos');
        const snapshot = await productsRef.get();
        const products = [];
        
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Obtener un producto específico
router.get('/:id', async (req, res) => {
    try {
        const db = admin.firestore();
        const productRef = db.collection('productos').doc(req.params.id);
        const productDoc = await productRef.get();
        
        if (!productDoc.exists) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json({ id: productDoc.id, ...productDoc.data() });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

module.exports = router; 