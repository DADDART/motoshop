const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  valore: {
    type: String,
    required: true
  },
  prezzo: {
    type: Number,
    default: 0 // Supplemento prezzo per questa variante
  },
  disponibile: {
    type: Boolean,
    default: true
  },
  immagine: String
});

const reviewSchema = new mongoose.Schema({
  utente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  valutazione: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  commento: {
    type: String,
    required: true,
    trim: true
  },
  dataCreazione: {
    type: Date,
    default: Date.now
  }
});

const productSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Il nome del prodotto è obbligatorio'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  descrizione: {
    type: String,
    required: [true, 'La descrizione del prodotto è obbligatoria']
  },
  descrizioneBreve: {
    type: String,
    maxlength: [150, 'La descrizione breve non può superare i 150 caratteri']
  },
  prezzo: {
    type: Number,
    required: [true, 'Il prezzo è obbligatorio'],
    min: [0, 'Il prezzo non può essere negativo']
  },
  prezzoScontato: {
    type: Number,
    default: 0
  },
  percentualeSconto: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tasse: {
    type: Number,
    default: 22 // IVA predefinita 22%
  },
  categorie: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  marchio: {
    type: String,
    required: true
  },
  immagini: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrincipale: {
      type: Boolean,
      default: false
    }
  }],
  quantita: {
    type: Number,
    required: [true, 'La quantità è obbligatoria'],
    default: 0,
    min: [0, 'La quantità non può essere negativa']
  },
  disponibile: {
    type: Boolean,
    default: true
  },
  nuovoProdotto: {
    type: Boolean,
    default: false
  },
  inEvidenza: {
    type: Boolean,
    default: false
  },
  bestseller: {
    type: Boolean,
    default: false
  },
  spedizione: {
    peso: Number,
    dimensioni: {
      lunghezza: Number,
      larghezza: Number,
      altezza: Number
    },
    gratuita: {
      type: Boolean,
      default: false
    }
  },
  varianti: [variantSchema],
  recensioni: [reviewSchema],
  metadati: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: String
  },
  dataCreazione: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuale per calcolare la valutazione media
productSchema.virtual('valutazioneMedia').get(function() {
  if (this.recensioni.length === 0) return 0;
  
  const sum = this.recensioni.reduce((acc, review) => acc + review.valutazione, 0);
  return Math.round((sum / this.recensioni.length) * 10) / 10;
});

// Virtuale per calcolare il numero di recensioni
productSchema.virtual('numeroRecensioni').get(function() {
  return this.recensioni.length;
});

// Indici per migliorare le prestazioni di ricerca
productSchema.index({ nome: 'text', descrizione: 'text', marchio: 'text' });
productSchema.index({ slug: 1 });
productSchema.index({ categorie: 1 });
productSchema.index({ prezzo: 1 });
productSchema.index({ 'varianti.nome': 1, 'varianti.valore': 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 