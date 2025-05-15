const express = require('express');
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// Tutte le rotte admin richiedono autenticazione e ruolo admin
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Gestione utenti
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Gestione prodotti
router.get('/products', productController.getProducts);
router.post('/products', productController.createProduct);
router.get('/products/:id', productController.getProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Gestione ordini
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.put('/orders/:id', adminController.updateOrderStatus);

module.exports = router; 