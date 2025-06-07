const express = require('express');
const router = express.Router();

// Página de inicio
router.get('/', (req, res) => {
    res.render('index', { 
        title: 'Auto Parts - Inicio',
        user: req.session.user || null
    });
});

// Página de catálogo
router.get('/catalogo', (req, res) => {
    res.render('catalogo', { 
        title: 'Catálogo de Productos',
        user: req.session.user || null
    });
});

// Página de carrito
router.get('/carrito', (req, res) => {
    res.render('carrito', { 
        title: 'Carrito de Compras',
        user: req.session.user || null
    });
});

// Página de mayoristas
router.get('/mayoristas', (req, res) => {
    res.render('mayoristas', { 
        title: 'Área Mayoristas',
        user: req.session.user || null
    });
});

module.exports = router; 