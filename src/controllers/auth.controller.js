const crypto = require('crypto');
const User = require('../models/user.model');
const { generateToken } = require('../config/jwt.config');
const sendEmail = require('../utils/email');

/**
 * Registrazione nuovo utente
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res, next) => {
  try {
    const { nome, cognome, email, password, telefono } = req.body;
    
    // Verifica se l'email è già in uso
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email già registrata'
      });
    }
    
    // Crea token di verifica email
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    
    // Crea nuovo utente
    const user = await User.create({
      nome,
      cognome,
      email,
      password,
      telefono,
      emailVerificationToken
    });
    
    // Rimuovi la password dalla risposta
    user.password = undefined;
    
    // Invia email di verifica
    // Nella versione completa qui invieresti l'email di verifica
    // await sendVerificationEmail(user, emailVerificationToken);
    
    // Genera token JWT
    const token = generateToken(user);
    
    res.status(201).json({
      success: true,
      message: 'Utente registrato con successo',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login utente
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Verifica se email e password sono stati forniti
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Inserisci email e password'
      });
    }
    
    // Cerca l'utente nel database
    const user = await User.findOne({ email }).select('+password');
    
    // Verifica se l'utente esiste e la password è corretta
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Email o password non validi'
      });
    }
    
    // Aggiorna l'ultimo accesso
    user.ultimoAccesso = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Rimuovi la password dalla risposta
    user.password = undefined;
    
    // Genera token JWT
    const token = generateToken(user);
    
    res.status(200).json({
      success: true,
      message: 'Login effettuato con successo',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifica l'email dell'utente
 * @route GET /api/auth/verify-email/:token
 * @access Public
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({ emailVerificationToken: token });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token di verifica non valido'
      });
    }
    
    // Aggiorna lo stato di verifica dell'utente
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'Email verificata con successo'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Richiedi il reset della password
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Nessun utente trovato con questa email'
      });
    }
    
    // Genera il token di reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Salva il token di reset (hashed) e la data di scadenza
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minuti
    
    await user.save({ validateBeforeSave: false });
    
    // Invia email con token di reset
    // Nella versione completa qui invieresti l'email di reset
    // const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    // await sendPasswordResetEmail(user, resetURL);
    
    res.status(200).json({
      success: true,
      message: 'Email per il reset della password inviata'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resetta la password
 * @route POST /api/auth/reset-password/:token
 * @access Public
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Hash il token ricevuto
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Trova l'utente con il token di reset valido e non scaduto
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token non valido o scaduto'
      });
    }
    
    // Aggiorna la password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // Genera nuovo token JWT
    const newToken = generateToken(user);
    
    res.status(200).json({
      success: true,
      message: 'Password resettata con successo',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ottieni utente corrente
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggiorna dati utente
 * @route PUT /api/auth/update-profile
 * @access Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { nome, cognome, telefono } = req.body;
    
    // Solo questi campi possono essere aggiornati
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { nome, cognome, telefono },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Profilo aggiornato con successo',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggiorna password
 * @route PUT /api/auth/update-password
 * @access Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Ottieni l'utente con la password
    const user = await User.findById(req.user.id).select('+password');
    
    // Verifica la password corrente
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password corrente non valida'
      });
    }
    
    // Aggiorna la password
    user.password = newPassword;
    await user.save();
    
    // Genera nuovo token JWT
    const token = generateToken(user);
    
    res.status(200).json({
      success: true,
      message: 'Password aggiornata con successo',
      data: {
        token
      }
    });
  } catch (error) {
    next(error);
  }
}; 