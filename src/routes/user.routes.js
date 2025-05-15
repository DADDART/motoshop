const express = require('express');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Nota: In un'implementazione completa, qui avremmo un userController
// Per ora creiamo route di esempio per test
router.get('/profile', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profilo utente',
    data: {
      user: req.user
    }
  });
});

router.get('/wishlist', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Wishlist utente',
    data: {
      wishlist: []
    }
  });
});

router.get('/addresses', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Indirizzi utente',
    data: {
      addresses: req.user?.indirizzi || []
    }
  });
});

module.exports = router; 