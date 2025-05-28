import { auth, db } from './config/firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc,
    getDoc,
    collection
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { updateUIOnAuth } from './navbar-auth.js';

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const forgotPassword = document.getElementById('forgotPassword');
const googleLogin = document.getElementById('googleLogin');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');

// Cambio entre formularios
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${btn.dataset.tab}Form`).classList.add('active');
    });
});

// Toggle contraseña visible/oculta
document.addEventListener('DOMContentLoaded', () => {
    const passwordInputs = document.querySelectorAll('.password-input');
    
    passwordInputs.forEach(container => {
        const toggleBtn = container.querySelector('.toggle-password');
        const input = container.querySelector('input');
        
        if (toggleBtn && input) {
            toggleBtn.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                toggleBtn.classList.toggle('bi-eye');
                toggleBtn.classList.toggle('bi-eye-slash');
            });
        }
    });
});

// Función para mostrar el loader
function showLoader() {
    Swal.fire({
        title: 'Cargando...',
        html: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

// Función para mostrar errores
function showError(error) {
    console.error('Error:', error);
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getErrorMessage(error.code) || error.message,
        confirmButtonColor: '#0066B1'
    });
}

// Función para mostrar éxito
function showSuccess(title, text) {
    Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        window.location.href = 'mi-perfil.html';
    });
}

// Login con email y contraseña
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showError({ message: 'Por favor, completa todos los campos' });
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError({ message: 'Por favor, ingresa un email válido' });
            return;
        }

        showLoader();

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (userCredential.user) {
                // Verificar si el usuario existe en Firestore
                const userDoc = await getDoc(doc(db, 'usuarios', userCredential.user.uid));
                if (!userDoc.exists()) {
                    // Si no existe en Firestore, crear el documento
                    await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
                        email: userCredential.user.email,
                        nombreCompleto: userCredential.user.displayName || '',
                        fechaRegistro: new Date().toISOString()
                    });
                }
                updateUIOnAuth(userCredential.user);
                showSuccess('¡Bienvenido!', 'Has iniciado sesión correctamente');
            }
        } catch (error) {
            console.error('Error de inicio de sesión:', error);
            if (error.code === 'auth/invalid-credential') {
                showError({ message: 'Email o contraseña incorrectos' });
            } else {
                showError(error);
            }
        }
    });
}

// Registro de usuario
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        console.log('Iniciando proceso de registro...');

        if (!name || !email || !password || !passwordConfirm) {
            showError({ message: 'Por favor, completa todos los campos' });
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError({ message: 'Por favor, ingresa un email válido' });
            return;
        }

        if (password !== passwordConfirm) {
            showError({ message: 'Las contraseñas no coinciden' });
            return;
        }

        if (password.length < 6) {
            showError({ message: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }

        showLoader();

        try {
            console.log('Creando usuario en Authentication...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Usuario creado exitosamente en Authentication');
            
            try {
                console.log('Guardando información en Firestore...');
                const usuariosRef = collection(db, 'usuarios');
                const userDocRef = doc(usuariosRef, userCredential.user.uid);
                
                await setDoc(userDocRef, {
                    nombreCompleto: name,
                    email: email,
                    fechaRegistro: new Date().toISOString(),
                    ultimoAcceso: new Date().toISOString()
                });
                
                console.log('Información guardada exitosamente en Firestore');

                try {
                    console.log('Enviando email de verificación...');
                    await sendEmailVerification(userCredential.user);
                    console.log('Email de verificación enviado exitosamente');
                } catch (verificationError) {
                    console.warn('Error al enviar email de verificación:', verificationError);
                }

                updateUIOnAuth(userCredential.user);
                showSuccess('¡Registro exitoso!', 'Tu cuenta ha sido creada correctamente. Por favor, verifica tu email.');
            } catch (firestoreError) {
                console.error('Error al guardar en Firestore:', firestoreError);
                try {
                    await userCredential.user.delete();
                    showError({ message: 'Error al crear la cuenta. Por favor, intenta nuevamente.' });
                } catch (deleteError) {
                    console.error('Error al eliminar usuario después de fallo en Firestore:', deleteError);
                    showError({ message: 'Error al crear la cuenta. Por favor, contacta a soporte.' });
                }
            }
        } catch (error) {
            console.error('Error durante el registro:', error);
            let errorMessage = 'Ha ocurrido un error inesperado';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este email ya está registrado';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'El formato del email no es válido';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'El registro con email y contraseña no está habilitado';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet';
                    break;
                default:
                    errorMessage = `Error: ${error.message}`;
            }
            
            showError({ message: errorMessage });
        }
    });
}

// Login con Google
if (googleLogin) {
    googleLogin.addEventListener('click', async () => {
        showLoader();
        const provider = new GoogleAuthProvider();
        
        try {
            const result = await signInWithPopup(auth, provider);
            await setDoc(doc(db, 'usuarios', result.user.uid), {
                nombreCompleto: result.user.displayName,
                email: result.user.email,
                fechaRegistro: new Date().toISOString()
            }, { merge: true });

            updateUIOnAuth(result.user);
            showSuccess('¡Bienvenido!', 'Has iniciado sesión con Google correctamente');
        } catch (error) {
            showError(error);
        }
    });
}

// Restablecer contraseña
if (forgotPassword) {
    forgotPassword.addEventListener('click', () => {
        Swal.fire({
            title: 'Restablecer Contraseña',
            input: 'email',
            inputLabel: 'Email',
            inputPlaceholder: 'Ingresa tu email',
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
            showLoaderOnConfirm: true,
            preConfirm: async (email) => {
                try {
                    await sendPasswordResetEmail(auth, email);
                    return true;
                } catch (error) {
                    Swal.showValidationMessage(getErrorMessage(error.code));
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Email enviado',
                    text: 'Revisa tu correo para restablecer tu contraseña'
                });
            }
        });
    });
}

// Función para traducir mensajes de error
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Este email ya está registrado';
        case 'auth/invalid-email':
            return 'Email inválido';
        case 'auth/operation-not-allowed':
            return 'Operación no permitida';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres';
        case 'auth/user-disabled':
            return 'Usuario deshabilitado';
        case 'auth/user-not-found':
            return 'Usuario no encontrado';
        case 'auth/wrong-password':
            return 'Contraseña incorrecta';
        case 'auth/invalid-credential':
            return 'Email o contraseña incorrectos';
        case 'auth/popup-closed-by-user':
            return 'Ventana de Google cerrada antes de completar el inicio de sesión';
        default:
            return 'Ocurrió un error inesperado';
    }
} 