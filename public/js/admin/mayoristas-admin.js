import { 
    auth, 
    db 
} from '../config/firebase-config.js';
import { 
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class MayoristasAdmin {
    constructor() {
        this.setupEventListeners();
        this.fixMayoristaData();
        this.migrateOnStartup();
        this.loadAllRequests();
    }

    async migrateOnStartup() {
        // Migrar automáticamente al cargar la página
        await this.migrateMayoristaUsers();
    }

    setupEventListeners() {
        // Manejar clics en los botones de las pestañas
        const tabs = document.querySelectorAll('.nav-link');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = tab.getAttribute('href').substring(1);
                this.loadTabContent(targetId);
            });
        });

        // Manejar acciones de aprobar/rechazar
        document.addEventListener('click', async (e) => {
            if (e.target.matches('[data-action="approve"]')) {
                const requestId = e.target.dataset.requestId;
                const userId = e.target.dataset.userId;
                await this.approveRequest(requestId, userId);
            } else if (e.target.matches('[data-action="reject"]')) {
                const requestId = e.target.dataset.requestId;
                const userId = e.target.dataset.userId;
                await this.rejectRequest(requestId, userId);
            } else if (e.target.matches('[data-action="send-invitation"]')) {
                const email = e.target.dataset.email;
                await this.sendInvitation(email);
            } else if (e.target.matches('#migrate-users-btn')) {
                await this.manualMigration();
            }
        });
    }

    async loadAllRequests() {
        await this.loadPendingRequests();
        await this.loadApprovedRequests();
        await this.loadRejectedRequests();
    }



    async createMissingSolicitud(userId, userData) {
        try {
            // Verificar si ya existe la solicitud
            const solicitudQuery = query(
                collection(db, 'solicitudes_mayorista'),
                where('userId', '==', userId)
            );
            
            const solicitudSnapshot = await getDocs(solicitudQuery);
            
            if (solicitudSnapshot.empty) {
                // Crear la solicitud faltante
                const solicitudData = {
                    userId: userId,
                    email: userData.email,
                    nombreEmpresa: userData.nombreEmpresa || userData.nombreContacto || 'Empresa no especificada',
                    rutEmpresa: userData.rut || 'RUT no especificado',
                    direccionEmpresa: userData.direccion || 'Dirección no especificada',
                    telefonoEmpresa: userData.telefono || 'Teléfono no especificado',
                    descripcionNegocio: userData.descripcion || userData.tipoNegocio || 'Descripción no especificada',
                    estado: 'pendiente',
                    fechaSolicitud: userData.fechaRegistro ? new Date(userData.fechaRegistro) : new Date(),
                    migrated: true // Flag para identificar solicitudes migradas
                };

                await addDoc(collection(db, 'solicitudes_mayorista'), solicitudData);
            }
        } catch (error) {
            console.error('Error al crear solicitud faltante:', error);
        }
    }

    async migrateMayoristaUsers() {
        try {
            // Buscar todos los usuarios con tipo mayorista y validado = false
            const mayoristaQuery = query(
                collection(db, 'usuarios'),
                where('tipo', '==', 'mayorista'),
                where('validado', '==', false)
            );
            
            const mayoristaSnapshot = await getDocs(mayoristaQuery);
            
            for (const doc of mayoristaSnapshot.docs) {
                const userData = doc.data();
                await this.createMissingSolicitud(doc.id, userData);
            }
            
        } catch (error) {
            console.error('Error al migrar usuarios mayoristas:', error);
        }
    }

    async loadTabContent(tabId) {
        switch (tabId) {
            case 'pending':
                await this.loadPendingRequests();
                break;
            case 'approved':
                await this.loadApprovedRequests();
                break;
            case 'rejected':
                await this.loadRejectedRequests();
                break;
        }
    }

    async loadPendingRequests() {
        try {
            // Cargar solicitudes pendientes (autenticadas) y sin autenticar
            const qPendientes = query(
                collection(db, 'solicitudes_mayorista'),
                where('estado', '==', 'pendiente')
            );

            const qSinAutenticar = query(
                collection(db, 'solicitudes_mayorista'),
                where('estado', '==', 'sin_autenticar')
            );

            const [snapshotPendientes, snapshotSinAutenticar] = await Promise.all([
                getDocs(qPendientes),
                getDocs(qSinAutenticar)
            ]);

            // Combinar los resultados
            const allDocs = [...snapshotPendientes.docs, ...snapshotSinAutenticar.docs];

            // Crear un snapshot simulado para mantener compatibilidad
            const combinedSnapshot = {
                docs: allDocs,
                empty: allDocs.length === 0,
                size: allDocs.length,
                forEach: (callback) => allDocs.forEach(callback)
            };
            
            this.renderRequests(combinedSnapshot, 'pending-requests', 'pendientes');
        } catch (error) {
            console.error('Error al cargar solicitudes pendientes:', error);
            this.showError('Error al cargar solicitudes pendientes');
        }
    }

    async loadApprovedRequests() {
        try {
            const q = query(
                collection(db, 'solicitudes_mayorista'),
                where('estado', '==', 'aprobado')
            );

            const snapshot = await getDocs(q);
            this.renderRequests(snapshot, 'approved-requests', 'aprobadas');
        } catch (error) {
            console.error('Error al cargar solicitudes aprobadas:', error);
            this.showError('Error al cargar solicitudes aprobadas');
        }
    }

    async loadRejectedRequests() {
        try {
            const q = query(
                collection(db, 'solicitudes_mayorista'),
                where('estado', '==', 'rechazado')
            );

            const snapshot = await getDocs(q);
            this.renderRequests(snapshot, 'rejected-requests', 'rechazadas');
        } catch (error) {
            console.error('Error al cargar solicitudes rechazadas:', error);
            this.showError('Error al cargar solicitudes rechazadas');
        }
    }

    renderRequests(snapshot, containerId, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="alert alert-info">
                    No hay solicitudes ${type}.
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = this.createRequestCard(doc.id, data.userId, data, type);
            container.appendChild(card);
        });
    }

    createRequestCard(requestId, userId, data, type) {
        const card = document.createElement('div');
        const requiresAuth = data.estado === 'sin_autenticar' || data.requiereAutenticacion;
        const cardClass = requiresAuth ? 'card mb-3 border-warning' : 'card mb-3';
        
        card.className = cardClass;
        card.innerHTML = `
            <div class="card-body">
                ${requiresAuth ? `
                    <div class="alert alert-warning mb-3">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Sin autenticar:</strong> El solicitante debe crear una cuenta con el email ${data.email}
                    </div>
                ` : ''}
                <div class="row">
                    <div class="col-md-6">
                        <h5 class="card-title">${data.nombreEmpresa}</h5>
                        <p class="mb-1"><strong>RUT:</strong> ${data.rutEmpresa}</p>
                        <p class="mb-1"><strong>Email:</strong> ${data.email}</p>
                        <p class="mb-1"><strong>Teléfono:</strong> ${data.telefonoEmpresa}</p>
                        ${data.ciudadEmpresa ? `<p class="mb-1"><strong>Ciudad:</strong> ${data.ciudadEmpresa}</p>` : ''}
                        ${data.regionEmpresa ? `<p class="mb-1"><strong>Región:</strong> ${data.regionEmpresa}</p>` : ''}
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Dirección:</strong> ${data.direccionEmpresa}</p>
                        <p class="mb-1"><strong>Descripción:</strong> ${data.descripcionNegocio}</p>
                        <p class="mb-1"><strong>Fecha de Solicitud:</strong> ${data.fechaSolicitud ? new Date(data.fechaSolicitud.toDate()).toLocaleDateString() : 'No disponible'}</p>
                        <p class="mb-1"><strong>Estado:</strong> 
                            <span class="badge ${requiresAuth ? 'bg-warning text-dark' : 'bg-primary'}">
                                ${requiresAuth ? 'Sin autenticar' : 'Pendiente'}
                            </span>
                        </p>
                    </div>
                </div>
                ${type === 'pendientes' ? `
                    <div class="mt-3">
                        <button class="btn btn-success" data-action="approve" data-request-id="${requestId}" data-user-id="${userId || ''}" data-email="${data.email}">
                            <i class="bi bi-check-circle me-2"></i>Aprobar
                        </button>
                        <button class="btn btn-danger" data-action="reject" data-request-id="${requestId}" data-user-id="${userId || ''}" data-email="${data.email}">
                            <i class="bi bi-x-circle me-2"></i>Rechazar
                        </button>
                        ${requiresAuth ? `
                            <button class="btn btn-info" data-action="send-invitation" data-email="${data.email}">
                                <i class="bi bi-envelope me-2"></i>Enviar Invitación
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        return card;
    }

    async approveRequest(requestId, userId) {
        try {
            const result = await Swal.fire({
                title: '¿Aprobar solicitud?',
                text: 'Esta acción habilitará la cuenta mayorista',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, aprobar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                // Actualizar estado en solicitudes_mayorista
                await updateDoc(doc(db, 'solicitudes_mayorista', requestId), {
                    estado: 'aprobado',
                    fechaAprobacion: new Date(),
                    aprobadoPor: auth.currentUser.email
                });

                // Solo actualizar el documento del usuario si existe (userId no está vacío)
                if (userId && userId.trim() !== '') {
                    try {
                        await updateDoc(doc(db, 'usuarios', userId), {
                            tipo: 'mayorista',
                            validado: true,
                            solicitudMayorista: {
                                estado: 'aprobado',
                                fechaAprobacion: new Date()
                            }
                        });
                    } catch (userUpdateError) {
                        console.warn('No se pudo actualizar el documento del usuario (puede que no exista aún):', userUpdateError);
                    }
                }

                await this.loadAllRequests();

                Swal.fire({
                    icon: 'success',
                    title: 'Solicitud Aprobada',
                    text: userId ? 'La cuenta mayorista ha sido habilitada' : 'La solicitud ha sido aprobada. Cuando el usuario se registre con este email, tendrá acceso mayorista automáticamente.'
                });
            }
        } catch (error) {
            console.error('Error al aprobar solicitud:', error);
            this.showError('No se pudo aprobar la solicitud');
        }
    }

    async rejectRequest(requestId, userId) {
        try {
            const { value: motivo } = await Swal.fire({
                title: '¿Rechazar solicitud?',
                input: 'textarea',
                inputLabel: 'Motivo del rechazo',
                inputPlaceholder: 'Ingrese el motivo del rechazo...',
                showCancelButton: true,
                confirmButtonText: 'Rechazar',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Debe ingresar un motivo';
                    }
                }
            });

            if (motivo) {
                // Actualizar estado en solicitudes_mayorista
                await updateDoc(doc(db, 'solicitudes_mayorista', requestId), {
                    estado: 'rechazado',
                    fechaRechazo: new Date(),
                    rechazadoPor: auth.currentUser.email,
                    motivoRechazo: motivo
                });

                // Actualizar estado en el documento del usuario
                await updateDoc(doc(db, 'usuarios', userId), {
                    solicitudMayorista: {
                        estado: 'rechazado',
                        fechaRechazo: new Date(),
                        motivoRechazo: motivo
                    }
                });

                await this.loadAllRequests();

                Swal.fire({
                    icon: 'success',
                    title: 'Solicitud Rechazada',
                    text: 'La solicitud ha sido rechazada'
                });
            }
        } catch (error) {
            console.error('Error al rechazar solicitud:', error);
            this.showError('No se pudo rechazar la solicitud');
        }
    }

    async fixMayoristaData() {
        try {
            const q = query(
                collection(db, 'usuarios'),
                where('email', '==', 'mayorista@gmail.com')
            );
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                console.log('No se encontró el usuario mayorista@gmail.com');
                return;
            }

            snapshot.forEach(async (doc) => {
                const data = doc.data();
                if (!data.tipo || data.tipo !== 'mayorista' || data.validado === undefined || data.rechazado === undefined) {
                    await updateDoc(doc.ref, {
                        tipo: 'mayorista',
                        validado: false,
                        rechazado: false,
                        fechaRegistro: data.fechaRegistro || new Date().toISOString()
                    });
                    console.log('Datos de mayorista actualizados');
                }
            });
        } catch (error) {
            console.error('Error al arreglar datos de mayorista:', error);
        }
    }

    async manualMigration() {
        try {
            const result = await Swal.fire({
                title: '¿Migrar usuarios mayoristas?',
                text: 'Esto creará solicitudes para todos los usuarios mayoristas que no tengan una.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, migrar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Migrando usuarios...',
                    text: 'Por favor espere...',
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                await this.migrateMayoristaUsers();
                await this.loadAllRequests();

                Swal.fire({
                    icon: 'success',
                    title: 'Migración Completada',
                    text: 'Se han creado las solicitudes faltantes.'
                });
            }
        } catch (error) {
            console.error('Error en migración manual:', error);
            this.showError('Error al migrar usuarios');
        }
    }

    async sendInvitation(email) {
        try {
            const result = await Swal.fire({
                title: 'Enviar Invitación',
                html: `
                    <p>¿Enviar invitación a <strong>${email}</strong>?</p>
                    <div class="alert alert-info">
                        <small>Nota: Esta función requiere integración con un servicio de email. Por ahora, se mostrará el mensaje que debes enviar manualmente.</small>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Ver mensaje',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                const invitationMessage = `
Estimado/a,

Tu solicitud para ser mayorista en Auto Parts ha sido aprobada preliminarmente.

Para completar el proceso y acceder a los beneficios mayoristas:

1. Crea una cuenta en nuestro sitio web usando exactamente este email: ${email}
2. Una vez creada la cuenta, tendrás acceso automático al catálogo mayorista con descuentos del 15%
3. Podrás realizar pedidos con precios preferenciales

¡Bienvenido/a a nuestro programa de mayoristas!

Saludos,
Equipo Auto Parts
                `;

                Swal.fire({
                    title: 'Mensaje de Invitación',
                    html: `
                        <div class="text-start">
                            <p><strong>Envía este mensaje a:</strong> ${email}</p>
                            <hr>
                            <pre style="white-space: pre-wrap; font-size: 12px; background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: left;">${invitationMessage}</pre>
                        </div>
                    `,
                    width: '600px',
                    showConfirmButton: true,
                    confirmButtonText: 'Entendido'
                });
            }
        } catch (error) {
            console.error('Error al enviar invitación:', error);
            this.showError('Error al procesar la invitación');
        }
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
    }
}

// Inicializar el administrador de mayoristas
document.addEventListener('DOMContentLoaded', () => {
    new MayoristasAdmin();
}); 