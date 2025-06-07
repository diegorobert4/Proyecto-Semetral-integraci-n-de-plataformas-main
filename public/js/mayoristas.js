import { 
    auth, 
    db 
} from './config/firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class MayoristasManager {
    constructor() {
        this.setupEventListeners();
        this.checkUserStatus();
    }

    async setupEventListeners() {
        const form = document.getElementById('mayorista-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Validación de RUT en tiempo real
        const rutInput = document.getElementById('rut');
        if (rutInput) {
            rutInput.addEventListener('input', this.validateRut.bind(this));
            rutInput.addEventListener('blur', this.formatRut.bind(this));
        }
    }

    async checkUserStatus() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.tipo === 'mayorista') {
                        if (userData.validado) {
                            this.showMayoristaInterface(userData);
                        } else {
                            this.showPendingValidation();
                        }
                    }
                }
            }
        });
    }

    validateRut(input) {
        // Si viene de un evento, usar event.target.value, si no, usar el input directamente
        const rut = typeof input === 'object' ? input.target.value : input;
        
        // Validar formato
        const rutRegex = /^[0-9]{7,8}-[0-9kK]$/;
        const isValid = rutRegex.test(rut);
        
        // Si viene de un evento, actualizar las clases del input
        if (typeof input === 'object' && input.target) {
            input.target.classList.toggle('is-valid', isValid);
            input.target.classList.toggle('is-invalid', !isValid);
        }
        
        return isValid;
    }

    formatRut(event) {
        let rut = event.target.value;
        if (rut.length > 0) {
            // Eliminar puntos y guión
            rut = rut.replace(/[^0-9kK]/g, '');
            
            if (rut.length > 1) {
                // Separar dígito verificador
                const dv = rut.slice(-1);
                let rutNumbers = rut.slice(0, -1);
                
                // Agregar guión
                rut = rutNumbers + '-' + dv;
            }
            
            event.target.value = rut;
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        try {
            // Mostrar loading
            Swal.fire({
                title: 'Procesando solicitud...',
                text: 'Por favor espere...',
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const formData = new FormData(event.target);
            const data = {
                nombreEmpresa: formData.get('nombreEmpresa'),
                rut: formData.get('rut'),
                nombreContacto: formData.get('nombreContacto'),
                email: formData.get('email'),
                telefono: formData.get('telefono'),
                direccion: formData.get('direccion'),
                ciudad: formData.get('ciudad'),
                region: formData.get('region'),
                tipoNegocio: formData.get('tipoNegocio'),
                descripcion: formData.get('descripcion')
            };

            // Validar RUT
            if (!this.validateRut(data.rut)) {
                throw new Error('RUT inválido. Debe tener el formato 12345678-9');
            }

            // Crear usuario en Authentication primero
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                data.email,
                formData.get('password')
            );

            // Esperar a que la autenticación se complete
            await new Promise((resolve) => {
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    if (user) {
                        unsubscribe();
                        resolve();
                    }
                });
            });

            // Crear documento en Firestore
            const userData = {
                ...data,
                tipo: 'mayorista',
                validado: false,
                fechaRegistro: new Date().toISOString(),
                uid: userCredential.user.uid
            };

            try {
                await setDoc(doc(db, 'usuarios', userCredential.user.uid), userData);
            } catch (firestoreError) {
                // Si falla la creación en Firestore, eliminar el usuario de Authentication
                await userCredential.user.delete();
                throw firestoreError;
            }

            // Mostrar mensaje de éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Registro Exitoso!',
                text: 'Tu solicitud ha sido enviada. Te notificaremos cuando sea aprobada.',
                confirmButtonText: 'Entendido'
            });

            this.showPendingValidation();

        } catch (error) {
            console.error('Error en registro:', error);
            
            let errorMessage = 'Ocurrió un error al procesar la solicitud';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este email ya está registrado';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'El email no es válido';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'El registro está deshabilitado temporalmente';
            } else if (error.message) {
                errorMessage = error.message;
            }

            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage
            });
        }
    }

    showPendingValidation() {
        const formContainer = document.querySelector('.contact-form');
        if (formContainer) {
            formContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-clock-history text-warning display-1"></i>
                    <h3 class="mt-4">Solicitud en Revisión</h3>
                    <p class="text-muted">
                        Tu solicitud está siendo revisada por nuestro equipo. 
                        Te notificaremos por email cuando sea aprobada.
                    </p>
                </div>
            `;
        }
    }

    showMayoristaInterface(userData) {
        const mainContainer = document.querySelector('main') || document.body;
        mainContainer.innerHTML = `
            <div class="container py-5">
                <div class="text-center">
                    <i class="bi bi-check-circle-fill text-success display-1"></i>
                    <h2 class="mt-4">¡Bienvenido al Programa de Mayoristas!</h2>
                    <p class="lead text-muted">Tu cuenta ha sido validada como mayorista.</p>
                    <div class="mt-4">
                        <a href="https://auto-parts-2025.web.app/views/mayorista.html" class="btn btn-primary">
                            <i class="bi bi-box-seam me-2"></i>Ir al Catálogo Mayorista
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    async loadMayoristaProducts() {
        try {
            const productosRef = collection(db, 'productos');
            const snapshot = await getDocs(productosRef);
            const tbody = document.getElementById('productos-mayorista');

            if (tbody) {
                tbody.innerHTML = '';
                snapshot.forEach(doc => {
                    const producto = doc.data();
                    const descuento = 0.15; // 15% de descuento para mayoristas
                    const precioMayorista = producto.precio * (1 - descuento);

                    tbody.innerHTML += `
                        <tr>
                            <td>${producto.nombre}</td>
                            <td>$${producto.precio.toLocaleString()}</td>
                            <td>$${precioMayorista.toLocaleString()}</td>
                            <td>15%</td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }
}

// Inicializar el manejador de mayoristas
document.addEventListener('DOMContentLoaded', () => {
    new MayoristasManager();
});

// Referencias a elementos del formulario
const solicitudForm = document.getElementById('solicitudMayoristaForm');

// Función para verificar si el usuario ya ha enviado una solicitud
async function verificarSolicitudExistente(userId) {
    try {
        const solicitudQuery = query(
            collection(db, 'solicitudes_mayorista'),
            where('userId', '==', userId)
        );
        const solicitudSnapshot = await getDocs(solicitudQuery);
        return !solicitudSnapshot.empty;
    } catch (error) {
        console.error('Error al verificar solicitud:', error);
        return false;
    }
}

// Función para verificar si ya existe una solicitud con un email específico
async function verificarSolicitudExistentePorEmail(email) {
    try {
        const solicitudQuery = query(
            collection(db, 'solicitudes_mayorista'),
            where('email', '==', email)
        );
        const solicitudSnapshot = await getDocs(solicitudQuery);
        return !solicitudSnapshot.empty;
    } catch (error) {
        console.error('Error al verificar solicitud por email:', error);
        return false;
    }
}

// Función para enviar solicitud de mayorista
async function enviarSolicitudMayorista(event) {
    event.preventDefault();

    try {
        // Obtener email del formulario o del usuario autenticado
        const emailInput = document.getElementById('emailEmpresa');
        const user = auth.currentUser;
        const email = emailInput ? emailInput.value : (user ? user.email : '');

        if (!email) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor, proporciona un email válido.',
                confirmButtonColor: '#0066B1'
            });
            return;
        }

        // Verificar si ya existe una solicitud con este email
        const solicitudExistentePorEmail = await verificarSolicitudExistentePorEmail(email);
        if (solicitudExistentePorEmail) {
            Swal.fire({
                icon: 'warning',
                title: 'Solicitud Existente',
                text: 'Ya existe una solicitud con este email. Por favor, espera la respuesta.',
                confirmButtonColor: '#0066B1'
            });
            return;
        }

        // Si hay usuario autenticado, verificar también por userId
        if (user) {
            const solicitudExistentePorUserId = await verificarSolicitudExistente(user.uid);
            if (solicitudExistentePorUserId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Solicitud Existente',
                    text: 'Ya has enviado una solicitud anteriormente. Por favor, espera la respuesta.',
                    confirmButtonColor: '#0066B1'
                });
                return;
            }
        }

        // Validar que región y ciudad estén seleccionadas
        const regionSelect = document.getElementById('regionEmpresa');
        const ciudadSelect = document.getElementById('ciudadEmpresa');
        
        if (!regionSelect.value || !ciudadSelect.value) {
            Swal.fire({
                icon: 'error',
                title: 'Datos Incompletos',
                text: 'Por favor, selecciona una región y una ciudad.',
                confirmButtonColor: '#0066B1'
            });
            return;
        }

        // Obtener datos del formulario
        const formData = {
            userId: user ? user.uid : null,
            email: email,
            nombreEmpresa: document.getElementById('nombreEmpresa').value,
            rutEmpresa: document.getElementById('rutEmpresa').value,
            direccionEmpresa: document.getElementById('direccionEmpresa').value,
            telefonoEmpresa: document.getElementById('telefonoEmpresa').value,
            ciudadEmpresa: ciudadSelect.value,
            regionEmpresa: regionSelect.value,
            descripcionNegocio: document.getElementById('mensaje').value || 'Sin descripción adicional',
            estado: user ? 'pendiente' : 'sin_autenticar',
            fechaSolicitud: serverTimestamp(),
            documentosAdjuntos: [], // Para futura implementación de carga de documentos
            requiereAutenticacion: !user // Flag para indicar si necesita autenticación
        };

        // Mostrar loading
        Swal.fire({
            title: 'Enviando solicitud...',
            text: 'Por favor espere...',
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Guardar en Firestore
        const solicitudesRef = collection(db, 'solicitudes_mayorista');
        await addDoc(solicitudesRef, formData);

        // Si el usuario está autenticado, actualizar su documento
        if (user) {
            try {
                const userRef = doc(db, 'usuarios', user.uid);
                await updateDoc(userRef, {
                    solicitudMayorista: {
                        estado: 'pendiente',
                        fechaSolicitud: serverTimestamp()
                    }
                });
            } catch (updateError) {
                console.warn('No se pudo actualizar el documento del usuario:', updateError);
                // No falla la solicitud si no se puede actualizar el usuario
            }
        }

        // Cerrar loading
        Swal.close();

        // Mostrar mensaje de éxito
        if (user) {
            Swal.fire({
                icon: 'success',
                title: '¡Solicitud Enviada!',
                text: 'Tu solicitud ha sido enviada correctamente. Te notificaremos cuando sea revisada.',
                confirmButtonColor: '#0066B1'
            });
        } else {
            Swal.fire({
                icon: 'success',
                title: '¡Solicitud Recibida!',
                html: `
                    <p>Tu solicitud ha sido enviada correctamente.</p>
                    <p><strong>Importante:</strong> Para completar el proceso y acceder a los beneficios mayoristas, necesitarás crear una cuenta con el email: <strong>${email}</strong></p>
                    <p>Te notificaremos por email cuando tu solicitud sea revisada.</p>
                `,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#0066B1'
            });
        }

        // Limpiar formulario
        if (solicitudForm) {
            solicitudForm.reset();
        }

    } catch (error) {
        console.error('Error al enviar solicitud:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo enviar la solicitud. Por favor, intenta nuevamente.',
            confirmButtonColor: '#0066B1'
        });
    }
}

// Función para verificar si existe una solicitud aprobada para un email y vincularla al usuario
async function vincularSolicitudAprobada(user) {
    try {
        // Buscar solicitudes aprobadas con el email del usuario
        const solicitudAprobadaQuery = query(
            collection(db, 'solicitudes_mayorista'),
            where('email', '==', user.email),
            where('estado', '==', 'aprobado')
        );
        
        const solicitudSnapshot = await getDocs(solicitudAprobadaQuery);
        
        if (!solicitudSnapshot.empty) {
            // Existe una solicitud aprobada, vincular al usuario
            const solicitudDoc = solicitudSnapshot.docs[0];
            const solicitudData = solicitudDoc.data();
            
            // Actualizar la solicitud con el userId
            await updateDoc(solicitudDoc.ref, {
                userId: user.uid,
                vinculadoEn: serverTimestamp()
            });
            
            // Actualizar el documento del usuario para que sea mayorista
            const userRef = doc(db, 'usuarios', user.uid);
            await updateDoc(userRef, {
                tipo: 'mayorista',
                validado: true,
                solicitudMayorista: {
                    estado: 'aprobado',
                    fechaAprobacion: solicitudData.fechaAprobacion || new Date(),
                    vinculadoAutomaticamente: true
                }
            });
            
            console.log('Usuario vinculado automáticamente a solicitud mayorista aprobada');
            
            // Mostrar mensaje de bienvenida
            setTimeout(() => {
                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido al Programa de Mayoristas!',
                    html: `
                        <p>Tu cuenta ha sido automáticamente habilitada como mayorista.</p>
                        <p>Ya tienes acceso a:</p>
                        <ul class="text-start">
                            <li>Descuentos del 15% en todos los productos</li>
                            <li>Catálogo mayorista exclusivo</li>
                            <li>Precios preferenciales</li>
                        </ul>
                    `,
                    confirmButtonText: 'Ir al Catálogo Mayorista',
                    confirmButtonColor: '#0066B1'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = 'https://auto-parts-2025.web.app/views/mayorista.html';
                    }
                });
            }, 2000);
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error al vincular solicitud aprobada:', error);
        return false;
    }
}

// Función para procesar solicitud guardada en localStorage (ya no se usa pero se mantiene por compatibilidad)
async function procesarSolicitudGuardada() {
    // Esta función ya no es necesaria ya que guardamos directamente en Firebase
    const solicitudGuardada = localStorage.getItem('solicitudMayorista');
    if (solicitudGuardada) {
        localStorage.removeItem('solicitudMayorista');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Procesar solicitud guardada si existe (compatibilidad)
            await procesarSolicitudGuardada();
            
            // Verificar si existe una solicitud aprobada para vincular automáticamente
            const vinculado = await vincularSolicitudAprobada(user);
            
            if (!vinculado) {
                // Si no se vinculó automáticamente, verificar si ya tiene una solicitud
                const solicitudExistente = await verificarSolicitudExistente(user.uid);
                if (solicitudExistente) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Solicitud en Proceso',
                        text: 'Ya tienes una solicitud en proceso. Te notificaremos cuando sea revisada.',
                        confirmButtonColor: '#0066B1'
                    });
                    // Opcional: deshabilitar el formulario
                    if (solicitudForm) {
                        solicitudForm.querySelectorAll('input, textarea, button').forEach(element => {
                            element.disabled = true;
                        });
                    }
                }
            }
        }
    });

    // Event listener para el formulario
    solicitudForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Procesar la solicitud independientemente del estado de autenticación
        await enviarSolicitudMayorista(e);
    });

    // Formateo y validación de RUT empresa
    const rutInput = document.getElementById('rutEmpresa');
    if (rutInput) {
        rutInput.addEventListener('input', function(e) {
            let rut = e.target.value.replace(/[^0-9kK]/g, '');
            
            if (rut.length > 1) {
                const dv = rut.slice(-1);
                let rutNumbers = rut.slice(0, -1);
                
                // Formatear con puntos
                if (rutNumbers.length > 3) {
                    rutNumbers = rutNumbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                }
                
                rut = rutNumbers + '-' + dv;
            }
            
            e.target.value = rut;
            
            // Validación visual del RUT
            if (rut.length >= 9) {
                const isValid = validateRUT(rut);
                e.target.classList.toggle('is-valid', isValid);
                e.target.classList.toggle('is-invalid', !isValid);
            } else {
                e.target.classList.remove('is-valid', 'is-invalid');
            }
        });
    }

    // Formateo de teléfono
    const phoneInput = document.getElementById('telefonoEmpresa');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let phone = e.target.value.replace(/\D/g, '');
            
            // Formatear teléfono chileno
            if (phone.startsWith('56')) {
                // Formato internacional que ya tiene +56
                phone = phone.substring(2);
            }
            
            if (phone.length > 0) {
                if (phone.length <= 1) {
                    phone = `+56 ${phone}`;
                } else if (phone.length <= 5) {
                    phone = `+56 ${phone.slice(0,1)} ${phone.slice(1)}`;
                } else {
                    phone = `+56 ${phone.slice(0,1)} ${phone.slice(1,5)} ${phone.slice(5,9)}`;
                }
            }
            
            e.target.value = phone;
        });
        
        // Placeholder dinámico para el teléfono
        phoneInput.addEventListener('focus', function() {
            if (!this.value) {
                this.value = '+56 ';
            }
        });
    }

    // Validación en tiempo real del email
    const emailInput = document.getElementById('emailEmpresa');
    if (emailInput) {
        emailInput.addEventListener('input', function(e) {
            const email = e.target.value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValid = emailRegex.test(email);
            
            e.target.classList.toggle('is-valid', isValid && email.length > 5);
            e.target.classList.toggle('is-invalid', !isValid && email.length > 5);
        });
    }
});

// Función para validar RUT chileno
function validateRUT(rut) {
    if (!rut || rut.length < 9) return false;
    
    const rutClean = rut.replace(/[^0-9kK]/g, '');
    const dv = rutClean.slice(-1).toLowerCase();
    const rutNumbers = rutClean.slice(0, -1);
    
    if (rutNumbers.length < 7) return false;
    
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = rutNumbers.length - 1; i >= 0; i--) {
        suma += parseInt(rutNumbers[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const dvCalculado = 11 - (suma % 11);
    let dvEsperado;
    
    if (dvCalculado === 11) {
        dvEsperado = '0';
    } else if (dvCalculado === 10) {
        dvEsperado = 'k';
    } else {
        dvEsperado = dvCalculado.toString();
    }
    
    return dv === dvEsperado;
} 