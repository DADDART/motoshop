const express = require('express');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// Route protette (richiedono autenticazione)
router.use(protect);

// Ottieni ordini dell'utente
router.get('/my-orders', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ordini utente',
    data: {
      orders: []
    }
  });
});

// Dettaglio ordine utente
router.get('/my-orders/:id', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dettaglio ordine',
    data: {
      order: {
        id: req.params.id,
        numeroOrdine: `ORD-${req.params.id}`,
        data: new Date(),
        prodotti: [],
        totale: 0
      }
    }
  });
});

// Crea nuovo ordine
router.post('/', (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Ordine creato con successo',
    data: {
      order: {
        id: '123456',
        numeroOrdine: 'ORD-123456',
        ...req.body
      }
    }
  });
});

// Route per admin
router.get('/', restrictTo('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Lista ordini (admin)',
    data: {
      orders: []
    }
  });
});

module.exports = router; 