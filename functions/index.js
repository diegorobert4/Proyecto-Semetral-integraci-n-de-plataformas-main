const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();

// Configuración de Transbank
const TRANSBANK_CONFIG = {
    COMMERCE_CODE: '597055555532',
    API_KEY: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
    ENVIRONMENT: 'integration',
    API_URL: 'https://webpay3gint.transbank.cl'
};

exports.createWebpayTransaction = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const { amount, sessionId, orderId, returnUrl, items, userId } = req.body;

            if (!amount || !sessionId || !orderId || !returnUrl || !items || !userId) {
                throw new Error('Faltan parámetros requeridos');
            }

            // Crear la transacción en Webpay
            const response = await fetch(`${TRANSBANK_CONFIG.API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Tbk-Api-Key-Id': TRANSBANK_CONFIG.COMMERCE_CODE,
                    'Tbk-Api-Key-Secret': TRANSBANK_CONFIG.API_KEY
                },
                body: JSON.stringify({
                    buy_order: orderId,
                    session_id: sessionId,
                    amount: amount,
                    return_url: returnUrl
                })
            });

            if (!response.ok) {
                throw new Error(`Error en la respuesta de Webpay: ${response.status}`);
            }

            const webpayResponse = await response.json();

            // Guardar la transacción en Firestore
            const db = admin.firestore();
            await db.collection('transactions').doc(orderId).set({
                userId: userId,
                amount: amount,
                items: items,
                status: 'pending',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                webpayToken: webpayResponse.token,
                sessionId: sessionId
            });

            res.json(webpayResponse);
        } catch (error) {
            console.error('Error creating Webpay transaction:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

exports.confirmWebpayTransaction = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const { token } = req.body;

            if (!token) {
                throw new Error('Token no proporcionado');
            }

            // Confirmar transacción con Webpay
            const response = await fetch(`${TRANSBANK_CONFIG.API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}`, {
                method: 'PUT',
                headers: {
                    'Tbk-Api-Key-Id': TRANSBANK_CONFIG.COMMERCE_CODE,
                    'Tbk-Api-Key-Secret': TRANSBANK_CONFIG.API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Error en la respuesta de Webpay: ${response.status}`);
            }

            const transactionResult = await response.json();

            // Buscar y actualizar la transacción en Firestore
            const db = admin.firestore();
            const transactionsRef = db.collection('transactions');
            const querySnapshot = await transactionsRef.where('webpayToken', '==', token).get();

            if (querySnapshot.empty) {
                throw new Error('Transacción no encontrada');
            }

            const transactionDoc = querySnapshot.docs[0];
            const transactionId = transactionDoc.id;
            const transactionData = transactionDoc.data();

            // Actualizar el estado de la transacción
            await transactionsRef.doc(transactionId).update({
                status: transactionResult.status === 'AUTHORIZED' ? 'completed' : 'failed',
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                payment_details: {
                    authorization_code: transactionResult.authorization_code,
                    payment_type_code: transactionResult.payment_type_code,
                    response_code: transactionResult.response_code,
                    transaction_date: transactionResult.transaction_date
                }
            });

            // Si la transacción fue exitosa, crear la orden
            if (transactionResult.status === 'AUTHORIZED') {
                try {
                    const orderRef = await db.collection('orders').add({
                        userId: transactionData.userId,
                        items: transactionData.items,
                        total: transactionData.amount,
                        status: 'pending',
                        created_at: admin.firestore.FieldValue.serverTimestamp(),
                        transaction_id: transactionId,
                        shipping_status: 'pending',
                        payment_status: 'paid',
                        transactionToken: token
                    });

                    console.log('Orden creada exitosamente:', orderRef.id);
                } catch (orderError) {
                    console.error('Error al crear la orden:', orderError);
                    // No lanzamos el error aquí para no afectar la respuesta al cliente
                }
            }

            res.json(transactionResult);
        } catch (error) {
            console.error('Error confirming Webpay transaction:', error);
            res.status(500).json({ error: error.message });
        }
    });
}); 