const express = require('express');
const router = express.Router();

// Obtener el carrito actual
router.get('/', (req, res) => {
    const cart = req.session.cart || [];
    res.json(cart);
});

// Agregar un producto al carrito
router.post('/add', (req, res) => {
    try {
        const { productId, quantity } = req.body;
        if (!req.session.cart) {
            req.session.cart = [];
        }

        const existingItem = req.session.cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += quantity || 1;
        } else {
            req.session.cart.push({
                id: productId,
                quantity: quantity || 1
            });
        }

        res.json({ success: true, cart: req.session.cart });
    } catch (error) {
        console.error('Error al agregar al carrito:', error);
        res.status(500).json({ error: 'Error al agregar al carrito' });
    }
});

// Actualizar cantidad de un producto
router.put('/update/:productId', (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!req.session.cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        const item = req.session.cart.find(item => item.id === productId);
        if (!item) {
            return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
        }

        if (quantity > 0) {
            item.quantity = quantity;
        } else {
            req.session.cart = req.session.cart.filter(item => item.id !== productId);
        }

        res.json({ success: true, cart: req.session.cart });
    } catch (error) {
        console.error('Error al actualizar carrito:', error);
        res.status(500).json({ error: 'Error al actualizar carrito' });
    }
});

// Eliminar un producto del carrito
router.delete('/remove/:productId', (req, res) => {
    try {
        const { productId } = req.params;

        if (!req.session.cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        req.session.cart = req.session.cart.filter(item => item.id !== productId);
        res.json({ success: true, cart: req.session.cart });
    } catch (error) {
        console.error('Error al eliminar del carrito:', error);
        res.status(500).json({ error: 'Error al eliminar del carrito' });
    }
});

// Vaciar el carrito
router.delete('/clear', (req, res) => {
    try {
        req.session.cart = [];
        res.json({ success: true, message: 'Carrito vaciado' });
    } catch (error) {
        console.error('Error al vaciar el carrito:', error);
        res.status(500).json({ error: 'Error al vaciar el carrito' });
    }
});

module.exports = router; 