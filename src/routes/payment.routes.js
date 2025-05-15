const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Rotte protette (richiedono autenticazione)
router.post('/create-checkout-session', protect, paymentController.createCheckoutSession);
router.get('/my-payments', protect, paymentController.getMyPayments);

// Webhook Stripe (pubblico)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router; 