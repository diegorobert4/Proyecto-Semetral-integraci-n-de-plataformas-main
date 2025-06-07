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
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const forgotPassword = document.getElementById('forgotPassword');
const googleLogin = document.getElementById('googleLogin');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');

// Inicializar el proveedor de Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

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
    let message = getErrorMessage(error.code) || error.message;
    
    // Manejar específicamente el error de API key inválida
    if (error.code === 'auth/api-key-not-valid') {
        message = 'Error de configuración. Por favor, contacte al administrador.';
    }
    
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
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
        // Si es admin, redirigir al panel de administración
        if (auth.currentUser && auth.currentUser.email === 'admin@gmail.com') {
            window.location.href = 'admin/mayoristas.html';
        } else {
            window.location.href = 'mi-perfil.html';
        }
    });
}

// Función para actualizar la UI basada en el estado de autenticación
function updateUIOnAuth(user) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.querySelector('.user-menu');
    const adminMenu = document.querySelector('.admin-menu');
    
    if (user) {
        // Ocultar botones de auth y mostrar menú de usuario
        if (authButtons) authButtons.classList.add('d-none');
        if (userMenu) {
            userMenu.classList.remove('d-none');
            const userNameSpan = userMenu.querySelector('.user-name');
            if (userNameSpan) {
                userNameSpan.textContent = user.email;
            }
        }
        
        // Mostrar/ocultar menú de administrador
        if (adminMenu) {
            if (user.email === 'admin@gmail.com') {
                adminMenu.classList.remove('d-none');
            } else {
                adminMenu.classList.add('d-none');
            }
        }
    } else {
        // Mostrar botones de auth y ocultar menús
        if (authButtons) authButtons.classList.remove('d-none');
        if (userMenu) userMenu.classList.add('d-none');
        if (adminMenu) adminMenu.classList.add('d-none');
    }
}

// Función para procesar solicitud mayorista pendiente
async function procesarSolicitudMayoristaPendiente(user) {
    const solicitudGuardada = localStorage.getItem('solicitudMayorista');
    if (solicitudGuardada) {
        try {
            const formData = JSON.parse(solicitudGuardada);
            // Agregar el ID del usuario a la solicitud
            formData.userId = user.uid;
            formData.email = user.email;

            // Crear la solicitud en Firestore
            await addDoc(collection(db, 'solicitudes_mayorista'), formData);

            // Limpiar localStorage
            localStorage.removeItem('solicitudMayorista');

            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: '¡Solicitud Enviada!',
                text: 'Tu solicitud ha sido enviada correctamente. Te notificaremos cuando sea revisada.',
                confirmButtonColor: '#0066B1'
            }).then(() => {
                window.location.href = 'mayoristas.html';
            });
        } catch (error) {
            console.error('Error al procesar solicitud mayorista:', error);
            showError(error);
        }
    }
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
                
                // Procesar solicitud mayorista pendiente si existe
                await procesarSolicitudMayoristaPendiente(userCredential.user);

                // Si no hay solicitud pendiente, redirigir normalmente
                if (!localStorage.getItem('solicitudMayorista')) {
                    // Actualizar UI y redirigir según el tipo de usuario
                    updateUIOnAuth(userCredential.user);
                    if (userCredential.user.email === 'admin@gmail.com') {
                        window.location.href = 'admin/mayoristas.html';
                    } else {
                        window.location.href = 'mi-perfil.html';
                    }
                }
            }
        } catch (error) {
            console.error('Error de inicio de sesión:', error);
            showError(error);
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
                
                // Mostrar mensaje de éxito sin redirección automática
                Swal.fire({
                    icon: 'success',
                    title: '¡Registro exitoso!',
                    text: 'Tu cuenta ha sido creada correctamente. ¡Bienvenido!',
                    confirmButtonColor: '#0066B1',
                    confirmButtonText: 'Continuar'
                }).then(() => {
                    // Redirigir al index o mantener en la página actual
                    window.location.href = '../index.html';
                });
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
        try {
            showLoader();
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Verificar si el usuario ya existe en Firestore
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
            
            if (!userDoc.exists()) {
                // Si no existe, crear el documento del usuario
                await setDoc(doc(db, 'usuarios', user.uid), {
                    email: user.email,
                    nombreCompleto: user.displayName || '',
                    fechaRegistro: new Date().toISOString(),
                    photoURL: user.photoURL || '',
                    authProvider: 'google'
                });
            }

            // Procesar solicitud mayorista pendiente si existe
            await procesarSolicitudMayoristaPendiente(user);

            // Si no hay solicitud pendiente, redirigir normalmente
            if (!localStorage.getItem('solicitudMayorista')) {
                // Actualizar UI y redirigir
                updateUIOnAuth(user);
                if (user.email === 'admin@gmail.com') {
                    window.location.href = 'admin/mayoristas.html';
                } else {
                    window.location.href = 'mi-perfil.html';
                }
            }
        } catch (error) {
            console.error('Error en inicio de sesión con Google:', error);
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

// Escuchar cambios en el estado de autenticación
auth.onAuthStateChanged((user) => {
    updateUIOnAuth(user);
});

// Función para obtener mensajes de error personalizados
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-credential': 'Email o contraseña incorrectos',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/user-not-found': 'No existe una cuenta con este email',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'Este email ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'El formato del email no es válido',
        'auth/operation-not-allowed': 'Operación no permitida',
        'auth/api-key-not-valid': 'Error de configuración. Por favor, contacte al administrador.'
    };
    return errorMessages[errorCode] || 'Ocurrió un error inesperado';
} 