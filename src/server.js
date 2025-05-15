const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

// Carica variabili d'ambiente
dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Definito' : 'Undefined'); // Log per debug senza mostrare la stringa completa
console.log('PORT:', process.env.PORT); // Log per debug

// Inizializza app Express
const app = express();
// Usa la porta definita nel .env o 3000 come fallback
const PORT = process.env.PORT || 3000;

// Middleware - inseriti qui per evitare duplicati
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servi file statici dalla cartella public
app.use(express.static(path.join(__dirname, '../motoshop/public')));

// Variabili globali per i database
let dbClient = null;
let db = null;

// Connessione MongoDB Atlas
const connectToMongoDB = async () => {
  try {
    // Usa la stringa di connessione dal file .env o usa una di fallback
    const connectionString = process.env.MONGODB_URI || 'mongodb+srv://davydarrigo98:Oo8CxRhFyD9iae6X@cluster0.nnsdpnr.mongodb.net/motoshop?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('Tentativo di connessione a MongoDB Atlas usando il driver nativo...');
    
    // Crea un nuovo client MongoDB con opzioni migliorate per la gestione degli errori
    const client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: 10000, // 10 secondi
      socketTimeoutMS: 45000, // 45 secondi
      connectTimeoutMS: 15000, // 15 secondi
      maxIdleTimeMS: 120000, // 2 minuti
      maxPoolSize: 10, // Massimo 10 connessioni nel pool
      retryWrites: true,
      retryReads: true,
      ssl: true,
      tlsAllowInvalidCertificates: true, // Permetti certificati non validi (solo per ambiente di sviluppo)
      tlsAllowInvalidHostnames: true // Permetti hostname non validi (solo per ambiente di sviluppo)
    });
    
    // Connetti al server MongoDB
    await client.connect();
    console.log('Connesso con successo a MongoDB Atlas!');
    
    // Salva il client e ottieni il database motoshop
    dbClient = client;
    db = client.db('motoshop');
    
    // Verifica che possiamo accedere alle collezioni
    const collections = await db.listCollections().toArray();
    console.log('Collezioni disponibili:', collections.map(c => c.name).join(', ') || 'Nessuna collezione trovata');
    
    // Non è necessario inizializzare dati di esempio se il database è già popolato
    const productsCollection = db.collection('products');
    const productCount = await productsCollection.countDocuments();
    console.log(`Database già popolato con ${productCount} prodotti.`);
    
    // Gestione chiusura connessione quando l'app si chiude
    process.on('SIGINT', async () => {
      console.log('Chiusura connessione MongoDB');
      await client.close();
      process.exit(0);
    });
    
    return true;
  } catch (error) {
    console.error('Errore di connessione a MongoDB Atlas:', error.message);
    console.log('L\'applicazione continuerà a funzionare con dati di esempio');
    return false;
  }
};

// Route principale
app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    // Se la richiesta vuole HTML, servi la pagina index.html
    res.sendFile(path.join(__dirname, '../motoshop/public/index.html'));
  } else {
    // Altrimenti, restituisci il JSON informativo API
    res.json({
      success: true,
      message: 'Benvenuto all\'API di MotoShop!',
      versione: '1.0.0',
      databaseConnesso: db !== null,
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        products: '/api/products',
        categories: '/api/categories',
        orders: '/api/orders',
        payments: '/api/payments',
        admin: '/api/admin'
      }
    });
  }
});

// Route di test
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Il server è in esecuzione correttamente',
    environment: process.env.NODE_ENV,
    databaseConnesso: db !== null,
    timestamp: new Date()
  });
});

// Route per i prodotti
app.get('/api/products', async (req, res) => {
  try {
    // Verifica se abbiamo connessione al database
    if (db) {
      // Ottieni prodotti dal database
      const productsCollection = db.collection('products');
      const products = await productsCollection.find({}).toArray();
      
      if (products && products.length > 0) {
        console.log('Recuperati prodotti dal database:', products.length);
        return res.json({
          success: true,
          message: 'Lista prodotti dal database',
          data: { products }
        });
      }
    }
    
    // Fallback ai dati statici se il database non è disponibile o vuoto
    console.log('Utilizzando dati di prodotto statici');
    res.json({
      success: true,
      message: 'Lista prodotti di esempio (dati statici)',
      data: {
        products: [
          {
            id: '1',
            nome: 'Casco Integrale XR-800',
            prezzo: 249.99,
            descrizione: 'Casco integrale di alta qualità per massima protezione',
            immagine: 'casco1.jpg'
          },
          {
            id: '2',
            nome: 'Giacca in Pelle Touring Pro',
            prezzo: 349.99,
            descrizione: 'Giacca in pelle per touring con protezioni certificate',
            immagine: 'giacca1.jpg'
          },
          {
            id: '3',
            nome: 'Guanti Estivi Air Flow',
            prezzo: 59.99,
            descrizione: 'Guanti estivi con ottima ventilazione',
            immagine: 'guanti1.jpg'
          }
        ]
      }
    });
  } catch (err) {
    console.error('Errore nel recupero dei prodotti:', err.message);
    res.status(500).json({ success: false, message: 'Errore interno del server', error: err.message });
  }
});

// Route per le categorie
app.get('/api/categories', async (req, res) => {
  try {
    // Verifica se abbiamo connessione al database
    if (db) {
      // Ottieni categorie dal database
      const categoriesCollection = db.collection('categories');
      const categories = await categoriesCollection.find({}).toArray();
      
      if (categories && categories.length > 0) {
        console.log('Recuperate categorie dal database:', categories.length);
        return res.json({
          success: true,
          message: 'Lista categorie dal database',
          data: { categories }
        });
      }
    }
    
    // Fallback ai dati statici se il database non è disponibile o vuoto
    console.log('Utilizzando dati di categoria statici');
    res.json({
      success: true,
      message: 'Lista categorie di esempio (dati statici)',
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
  } catch (err) {
    console.error('Errore nel recupero delle categorie:', err.message);
    res.status(500).json({ success: false, message: 'Errore interno del server', error: err.message });
  }
});

// API endpoint per un prodotto specifico
app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Se il database è connesso, prova a ottenere il prodotto dal database
    if (db) {
      try {
        const productsCollection = db.collection('products');
        // Se l'ID è un ObjectId valido, cerca per _id
        let product = null;
        
        // Cerca il prodotto per ID
        if (productId.match(/^[0-9a-fA-F]{24}$/)) {
          const { ObjectId } = require('mongodb');
          product = await productsCollection.findOne({ _id: new ObjectId(productId) });
        } else {
          // Altrimenti cerca per ID come stringa
          product = await productsCollection.findOne({ id: productId });
        }
        
        if (product) {
          return res.json({
            success: true,
            message: 'Dettaglio prodotto dal database',
            data: { product }
          });
        }
      } catch (dbError) {
        console.error('Errore nel recupero del prodotto dal database:', dbError.message);
      }
    }
    
    // Fallback ai dati statici
    res.json({
      success: true,
      message: 'Dettaglio prodotto (dati statici)',
      data: {
        product: {
          id: productId,
          nome: 'Prodotto ' + productId,
          prezzo: 99.99,
          descrizione: 'Questo è il dettaglio del prodotto ' + productId,
          immagine: 'prodotto' + productId + '.jpg'
        }
      }
    });
  } catch (err) {
    console.error('Errore nel recupero del prodotto:', err.message);
    res.status(500).json({ success: false, message: 'Errore interno del server', error: err.message });
  }
});

// API endpoint di prova per autenticazione
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email && password) {
    res.json({
      success: true,
      message: 'Login effettuato con successo',
      data: {
        token: 'sample-jwt-token-for-testing',
        user: {
          id: '12345',
          nome: 'Utente',
          cognome: 'Di Prova',
          email: email,
          role: 'user'
        }
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Email e password sono richiesti'
    });
  }
});

// Importa routes
try {
  const authRoutes = require('./routes/auth.routes');
  const userRoutes = require('./routes/user.routes');
  const productRoutes = require('./routes/product.routes');
  const categoryRoutes = require('./routes/category.routes');
  const orderRoutes = require('./routes/order.routes');
  const paymentRoutes = require('./routes/payment.routes');
  const adminRoutes = require('./routes/admin.routes');
  
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
} catch (error) {
  console.error('Errore nel caricamento delle routes:', error.message);
  
  // Route di fallback per prodotti se le route originali non funzionano
  app.get('/api/products', async (req, res) => {
    try {
      // Prima prova a ottenere i prodotti dal database, se è connesso
      if (mongoose.connection.readyState === 1) {
        const Product = mongoose.model('Product');
        const products = await Product.find({}).lean();
        
        if (products && products.length > 0) {
          console.log('Recuperati prodotti dal database:', products.length);
          return res.json({
            success: true,
            message: 'Lista prodotti dal database',
            data: { products }
          });
        }
      }
      
      // Fallback ai dati statici se il database non è disponibile o vuoto
      console.log('Utilizzando dati di prodotto statici');
      res.json({
        success: true,
        message: 'Lista prodotti di esempio (dati statici)',
        data: {
          products: [
            {
              id: '1',
              nome: 'Casco Integrale XR-800',
              prezzo: 249.99,
              descrizione: 'Casco integrale di alta qualità per massima protezione',
              immagine: 'casco1.jpg'
            },
            {
              id: '2',
              nome: 'Giacca in Pelle Touring Pro',
              prezzo: 349.99,
              descrizione: 'Giacca in pelle per touring con protezioni certificate',
              immagine: 'giacca1.jpg'
            },
            {
              id: '3',
              nome: 'Guanti Estivi Air Flow',
              prezzo: 59.99,
              descrizione: 'Guanti estivi con ottima ventilazione',
              immagine: 'guanti1.jpg'
            }
          ]
        }
      });
    } catch (err) {
      console.error('Errore nel recupero dei prodotti:', err.message);
      res.status(500).json({ success: false, message: 'Errore interno del server', error: err.message });
    }
  });

  // Route di fallback per categorie se le route originali non funzionano
  app.get('/api/categories', async (req, res) => {
    try {
      // Prima prova a ottenere le categorie dal database, se è connesso
      if (mongoose.connection.readyState === 1) {
        const Category = mongoose.model('Category');
        const categories = await Category.find({}).lean();
        
        if (categories && categories.length > 0) {
          console.log('Recuperate categorie dal database:', categories.length);
          return res.json({
            success: true,
            message: 'Lista categorie dal database',
            data: { categories }
          });
        }
      }
      
      // Fallback ai dati statici se il database non è disponibile o vuoto
      console.log('Utilizzando dati di categoria statici');
      res.json({
        success: true,
        message: 'Lista categorie di esempio (dati statici)',
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
    } catch (err) {
      console.error('Errore nel recupero delle categorie:', err.message);
      res.status(500).json({ success: false, message: 'Errore interno del server', error: err.message });
    }
  });
}

// Gestione errori 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Risorsa non trovata'
  });
});

// Gestione errori globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Si è verificato un errore interno',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Avvia la connessione al database e poi il server
(async () => {
  await connectToMongoDB();
  
  // Avvio del server
  const server = app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT} con connessione a MongoDB Atlas`);
  });
  
  // Gestione errori del server
  server.on('error', (error) => {
    console.error('Errore del server:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`La porta ${PORT} è già in uso. Prova con un'altra porta.`);
      process.exit(1);
    }
  });
})();

module.exports = app; // Per testing 