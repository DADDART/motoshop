const express = require('express');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// Route di esempio per test
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Lista prodotti',
    data: {
      products: []
    }
  });
});

router.get('/:id', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dettaglio prodotto',
    data: {
      product: {
        id: req.params.id,
        nome: 'Prodotto di esempio',
        prezzo: 99.99,
        descrizione: 'Questo è un prodotto di esempio per test'
      }
    }
  });
});

router.post('/', protect, restrictTo('admin'), (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Prodotto creato con successo',
    data: {
      product: req.body
    }
  });
});

router.put('/:id', protect, restrictTo('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Prodotto aggiornato con successo',
    data: {
      product: {
        id: req.params.id,
        ...req.body
      }
    }
  });
});

router.delete('/:id', protect, restrictTo('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Prodotto eliminato con successo'
  });
});

module.exports = router; 