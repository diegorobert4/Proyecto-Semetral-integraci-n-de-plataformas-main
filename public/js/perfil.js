import { auth, db } from './config/firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Referencias a elementos del DOM
const profileForm = document.getElementById('profileForm');
const userFullName = document.getElementById('userFullName');
const userEmail = document.getElementById('userEmail');
const userType = document.getElementById('userType');
const userAvatar = document.getElementById('userAvatar');

// Función para verificar si un usuario es mayorista
async function isMayorista(user) {
    if (!user) return false;
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.tipo === 'mayorista' && userData.validado === true;
        }
        // Fallback: verificar por email si no hay documento
        return user.email.toLowerCase().includes('mayorista');
    } catch (error) {
        console.error('Error al verificar mayorista:', error);
        // Fallback: verificar por email en caso de error
        return user.email.toLowerCase().includes('mayorista');
    }
}

// Función para cargar los datos del usuario
async function loadUserProfile(user) {
    try {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Actualizar campos del formulario
            document.getElementById('nombre').value = userData.nombre || '';
            document.getElementById('apellido').value = userData.apellido || '';
            document.getElementById('telefono').value = userData.telefono || '';
            document.getElementById('rut').value = userData.rut || '';
            document.getElementById('direccion').value = userData.direccion || '';
            document.getElementById('ciudad').value = userData.ciudad || '';
            document.getElementById('region').value = userData.region || '';

            // Actualizar encabezado del perfil
            const esMayorista = await isMayorista(user);
            
            if (esMayorista) {
                // Para usuarios mayoristas, mostrar información de empresa
                let nombreEmpresa = userData.nombreEmpresa;
                
                // Configuración específica para mayorista@gmail.com
                if (user.email === 'mayorista@gmail.com') {
                    nombreEmpresa = 'Empresa Maxi';
                }
                
                userFullName.textContent = nombreEmpresa || 'Empresa Mayorista';
                userEmail.innerHTML = `
                    <span class="fw-bold" style="color: #000000;">${user.email}</span><br>
                    <small class="text-muted">Email empresarial</small>
                `;
            } else {
                // Para usuarios regulares
                userFullName.textContent = `${userData.nombre || ''} ${userData.apellido || ''}`.trim() || 'Usuario';
                userEmail.innerHTML = `<span class="fw-bold" style="color: #000000;">${user.email}</span>`;
            }
            
            // Aplicar color negro al nombre para todos los usuarios
            userFullName.style.color = '#000000';
            
            // Actualizar tipo de usuario
            userType.textContent = `Tipo de usuario: ${esMayorista ? 'Mayorista' : 'Cliente'}`;
            
            // Aplicar estilo especial para todos los usuarios
            userType.className = 'mb-0 fw-bold';
            userType.style.color = '#ffffff';
            userType.style.fontWeight = 'bold';
            userType.style.backgroundColor = '#ff3366';
            userType.style.padding = '8px 12px';
            userType.style.borderRadius = '5px';
            userType.style.border = '2px solid #ffffff';

            // Actualizar avatar si existe
            if (userData.avatarUrl) {
                userAvatar.src = userData.avatarUrl;
            }
        } else {
            console.log('No existe el documento del usuario, creando uno nuevo...');
            // Crear documento inicial del usuario
            const newUserData = {
                email: user.email,
                nombre: user.displayName ? user.displayName.split(' ')[0] : '',
                apellido: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
                fechaRegistro: new Date().toISOString(),
                ultimaActualizacion: new Date().toISOString(),
                tipo: 'cliente' // tipo por defecto
            };
            
            try {
                await setDoc(userDocRef, newUserData);
                console.log('Documento de usuario creado exitosamente');
                
                // Actualizar la interfaz con los datos iniciales
                userFullName.textContent = user.displayName || 'Usuario';
                userFullName.style.color = '#000000';
                
                userEmail.innerHTML = `<span class="fw-bold" style="color: #000000;">${user.email}</span>`;
                
                userType.textContent = 'Tipo de usuario: Cliente';
                userType.className = 'mb-0 fw-bold';
                userType.style.color = '#ffffff';
                userType.style.fontWeight = 'bold';
                userType.style.backgroundColor = '#ff3366';
                userType.style.padding = '8px 12px';
                userType.style.borderRadius = '5px';
                userType.style.border = '2px solid #ffffff';
                
                // Si el usuario tiene foto de perfil de Google
                if (user.photoURL) {
                    userAvatar.src = user.photoURL;
                }
            } catch (error) {
                console.error('Error al crear el documento del usuario:', error);
                throw error;
            }
        }
    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los datos del perfil. Por favor, intenta nuevamente.',
            confirmButtonColor: '#0066B1'
        });
    }
}

// Función para guardar los cambios del perfil
async function saveProfile(event) {
    event.preventDefault();

    if (!profileForm.checkValidity()) {
        event.stopPropagation();
        profileForm.classList.add('was-validated');
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Debes iniciar sesión para guardar los cambios',
            confirmButtonColor: '#0066B1'
        });
        return;
    }

    try {
        Swal.fire({
            title: 'Guardando cambios...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const userDocRef = doc(db, 'usuarios', user.uid);
        const userData = {
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            telefono: document.getElementById('telefono').value,
            rut: document.getElementById('rut').value,
            direccion: document.getElementById('direccion').value,
            ciudad: document.getElementById('ciudad').value,
            region: document.getElementById('region').value,
            ultimaActualizacion: new Date().toISOString()
        };

        await setDoc(userDocRef, userData, { merge: true });

        Swal.fire({
            icon: 'success',
            title: '¡Perfil actualizado!',
            text: 'Los cambios han sido guardados correctamente',
            confirmButtonColor: '#0066B1'
        });

        // Actualizar la información mostrada
        userFullName.textContent = `${userData.nombre} ${userData.apellido}`;
    } catch (error) {
        console.error('Error al guardar el perfil:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron guardar los cambios. Por favor, intenta nuevamente.',
            confirmButtonColor: '#0066B1'
        });
    }
}

// Escuchar cambios en la autenticación
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await loadUserProfile(user);
    } else {
        // Redirigir al inicio si no hay usuario autenticado
        window.location.href = 'iniciar-sesion.html';
    }
});

// Event listeners
if (profileForm) {
    profileForm.addEventListener('submit', saveProfile);
}

// Validación de RUT chileno
const rutInput = document.getElementById('rut');
if (rutInput) {
    rutInput.addEventListener('input', function(e) {
        let rut = e.target.value.replace(/[^0-9kK]/g, '');
        
        if (rut.length > 1) {
            rut = rut.slice(0, -1) + '-' + rut.slice(-1);
        }
        
        if (rut.length > 4) {
            rut = rut.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        }
        
        e.target.value = rut;
    });
} 