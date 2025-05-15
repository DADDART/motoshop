const express = require('express');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// Route di esempio per test
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Lista categorie',
    data: {
      categories: [
        {
          id: '1',
          nome: 'Caschi',
          slug: 'caschi',
          descrizione: 'Caschi per motociclisti'
        },
        {
          id: '2',
          nome: 'Giacche',
          slug: 'giacche',
          descrizione: 'Giacche per motociclisti'
        },
        {
          id: '3',
          nome: 'Guanti',
          slug: 'guanti',
          descrizione: 'Guanti per motociclisti'
        }
      ]
    }
  });
});

router.get('/:id', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dettaglio categoria',
    data: {
      category: {
        id: req.params.id,
        nome: 'Categoria di esempio',
        slug: req.params.id,
        descrizione: 'Questa è una categoria di esempio per test'
      }
    }
  });
});

router.post('/', protect, restrictTo('admin'), (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Categoria creata con successo',
    data: {
      category: req.body
    }
  });
});

router.put('/:id', protect, restrictTo('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Categoria aggiornata con successo',
    data: {
      category: {
        id: req.params.id,
        ...req.body
      }
    }
  });
});

router.delete('/:id', protect, restrictTo('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Categoria eliminata con successo'
  });
});

module.exports = router; 