const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  via: {
    type: String,
    required: [true, 'L\'indirizzo è obbligatorio']
  },
  citta: {
    type: String,
    required: [true, 'La città è obbligatoria']
  },
  provincia: {
    type: String,
    required: [true, 'La provincia è obbligatoria']
  },
  cap: {
    type: String,
    required: [true, 'Il CAP è obbligatorio']
  },
  principale: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Il nome è obbligatorio']
  },
  cognome: {
    type: String,
    required: [true, 'Il cognome è obbligatorio']
  },
  email: {
    type: String,
    required: [true, 'L\'email è obbligatoria'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email non valida']
  },
  password: {
    type: String,
    required: [true, 'La password è obbligatoria'],
    minlength: [8, 'La password deve contenere almeno 8 caratteri'],
    select: false
  },
  telefono: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\+?[0-9]{10,15}$/.test(v);
      },
      message: props => `${props.value} non è un numero di telefono valido!`
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  indirizzi: [addressSchema],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  dataRegistrazione: {
    type: Date,
    default: Date.now
  },
  ultimoAccesso: {
    type: Date
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuale per ordini utente
userSchema.virtual('ordini', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'utente',
  justOne: false
});

// Hash della password prima del salvataggio
userSchema.pre('save', async function(next) {
  // Procedi solo se la password è stata modificata
  if (!this.isModified('password')) return next();
  
  try {
    // Genera salt e hash
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Metodo per confrontare le password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 