const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  prodotto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  nome: {
    type: String,
    required: true
  },
  varianti: [{
    nome: String,
    valore: String
  }],
  immagine: String,
  prezzoUnitario: {
    type: Number,
    required: true
  },
  prezzoScontato: {
    type: Number,
    default: 0
  },
  quantita: {
    type: Number,
    required: true,
    min: [1, 'La quantità deve essere almeno 1']
  },
  totaleItem: {
    type: Number,
    required: true
  }
});

const shippingSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  cognome: {
    type: String,
    required: true
  },
  via: {
    type: String,
    required: true
  },
  citta: {
    type: String,
    required: true
  },
  provincia: {
    type: String,
    required: true
  },
  cap: {
    type: String,
    required: true
  },
  telefono: String,
  istruzioniConsegna: String
});

const orderSchema = new mongoose.Schema({
  utente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  numeroOrdine: {
    type: String,
    required: true,
    unique: true
  },
  prodotti: [orderItemSchema],
  statoOrdine: {
    type: String,
    enum: [
      'in attesa di pagamento',
      'pagamento ricevuto', 
      'in elaborazione', 
      'spedito', 
      'consegnato', 
      'annullato',
      'rimborso richiesto',
      'rimborsato'
    ],
    default: 'in attesa di pagamento'
  },
  indirizzoSpedizione: shippingSchema,
  indirizzoFatturazione: shippingSchema,
  metodoPagamento: {
    tipo: {
      type: String,
      enum: ['carta di credito', 'paypal', 'bonifico bancario'],
      required: true
    },
    dettagli: {
      ultimeCifreCartaPagamento: String,
      idTransazione: String
    }
  },
  statoPagamento: {
    type: String,
    enum: ['in attesa', 'completato', 'fallito', 'rimborsato'],
    default: 'in attesa'
  },
  dettagliPagamento: {
    idTransazione: String,
    fornitoreServizio: String,
    dataPagamento: Date
  },
  dettagliSpedizione: {
    corriere: String,
    numeroTracking: String,
    metodoDiSpedizione: String,
    dataSpedizione: Date
  },
  subtotale: {
    type: Number,
    required: true
  },
  costoSpedizione: {
    type: Number,
    required: true,
    default: 0
  },
  sconto: {
    type: Number,
    default: 0
  },
  codiceSconto: {
    type: String
  },
  tasse: {
    type: Number,
    required: true
  },
  totale: {
    type: Number,
    required: true
  },
  note: String,
  dataCreazione: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware per generare numero ordine unico
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const randomCode = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.numeroOrdine = `ORD-${year}${month}-${count + 1}-${randomCode}`;
  }
  next();
});

// Indici per migliorare le prestazioni di ricerca
orderSchema.index({ utente: 1 });
orderSchema.index({ numeroOrdine: 1 });
orderSchema.index({ statoOrdine: 1 });
orderSchema.index({ statoPagamento: 1 });
orderSchema.index({ dataCreazione: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 