const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Route pubbliche
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Route protette (richiede autenticazione)
router.use(protect); // Tutte le route seguenti richiederanno autenticazione
router.get('/me', authController.getMe);
router.put('/update-profile', authController.updateProfile);
router.put('/update-password', authController.updatePassword);

module.exports = router; 