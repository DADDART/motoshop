const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT per l'utente autenticato
 * @param {Object} user - Oggetto utente
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN
    }
  );
};

/**
 * Verifica un token JWT
 * @param {String} token - Token JWT
 * @returns {Object} Payload decodificato o errore
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Token non valido o scaduto');
  }
};

module.exports = {
  generateToken,
  verifyToken
}; 