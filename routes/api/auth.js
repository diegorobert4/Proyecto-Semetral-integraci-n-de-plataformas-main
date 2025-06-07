const express = require('express');
const router = express.Router();
const { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut 
} = require('firebase/auth');
const { db } = require('../../config/firebase-config.js_');
const { doc, setDoc, getDoc } = require('firebase/firestore');

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { email, password, nombreCompleto, telefono, direccion, comuna, region } = req.body;
        const auth = getAuth();
        
        // Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Guardar información adicional en Firestore
        await setDoc(doc(db, 'usuarios', user.uid), {
            email,
            nombreCompleto,
            telefono,
            direccion,
            comuna,
            region,
            createdAt: new Date().toISOString()
        });

        // Guardar información en la sesión
        req.session.user = {
            uid: user.uid,
            email: user.email,
            nombreCompleto
        };

        res.json({ 
            success: true, 
            user: req.session.user 
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(400).json({ 
            error: error.message || 'Error en el registro' 
        });
    }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const auth = getAuth();
        
        // Autenticar con Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Obtener información adicional de Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        const userData = userDoc.data();

        // Guardar en sesión
        req.session.user = {
            uid: user.uid,
            email: user.email,
            nombreCompleto: userData.nombreCompleto
        };

        res.json({ 
            success: true, 
            user: req.session.user 
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(401).json({ 
            error: 'Credenciales inválidas' 
        });
    }
});

// Cerrar sesión
router.post('/logout', (req, res) => {
    try {
        const auth = getAuth();
        signOut(auth);
        req.session.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

// Obtener usuario actual
router.get('/me', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const userDoc = await getDoc(doc(db, 'usuarios', req.session.user.uid));
        if (!userDoc.exists()) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const userData = userDoc.data();
        res.json({
            uid: req.session.user.uid,
            email: userData.email,
            nombreCompleto: userData.nombreCompleto,
            telefono: userData.telefono,
            direccion: userData.direccion,
            comuna: userData.comuna,
            region: userData.region
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error al obtener información del usuario' });
    }
});

module.exports = router; 