const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Il nome della categoria è obbligatorio'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  descrizione: {
    type: String
  },
  immagine: {
    type: String
  },
  icona: {
    type: String
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  ordine: {
    type: Number,
    default: 0
  },
  inEvidenza: {
    type: Boolean,
    default: false
  },
  mostraNelMenu: {
    type: Boolean,
    default: true
  },
  metadati: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuale per sottocategorie
categorySchema.virtual('sottocategorie', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
  justOne: false
});

// Virtuale per prodotti della categoria
categorySchema.virtual('prodotti', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categorie',
  justOne: false
});

// Statics per trovare le categorie di primo livello
categorySchema.statics.getRootCategories = function() {
  return this.find({ parentId: null }).sort({ ordine: 1 });
};

// Statics per trovare l'albero completo delle categorie
categorySchema.statics.getCategoryTree = async function() {
  const rootCategories = await this.find({ parentId: null })
    .sort({ ordine: 1 })
    .populate({
      path: 'sottocategorie',
      populate: {
        path: 'sottocategorie'
      }
    });
  
  return rootCategories;
};

// Indici per migliorare le prestazioni di ricerca
categorySchema.index({ slug: 1 });
categorySchema.index({ nome: 'text' });
categorySchema.index({ parentId: 1 });
categorySchema.index({ inEvidenza: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 