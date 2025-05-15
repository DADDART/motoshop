const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { verifyToken } = require('../config/jwt.config');

/**
 * Middleware per proteggere route che richiedono autenticazione
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Controlla se il token è presente nell'header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Se il token non esiste, restituisci un errore
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Non sei autorizzato ad accedere a questa risorsa'
      });
    }
    
    try {
      // Verifica il token
      const decoded = verifyToken(token);
      
      // Cerca l'utente dal database
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'L\'utente appartenente a questo token non esiste più'
        });
      }
      
      // Aggiorna l'ultimo accesso dell'utente
      user.ultimoAccesso = new Date();
      await user.save({ validateBeforeSave: false });
      
      // Aggiungi l'utente alla richiesta
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token non valido o scaduto'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware per limitare l'accesso in base al ruolo utente
 * @param  {...String} roles - Ruoli autorizzati
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Se il ruolo dell'utente non è incluso nell'array, nega l'accesso
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per eseguire questa azione'
      });
    }
    
    next();
  };
}; 