const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const fs = require('fs');

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

// Determina il percorso corretto per i file statici
// Questo gestisce sia lo sviluppo locale che l'ambiente di produzione
let publicPath = path.join(__dirname, '../', 'motoshop/public');
console.log('Percorso dei file statici:', publicPath);

// Prova percorsi alternativi se il percorso principale non esiste
if (!fs.existsSync(publicPath)) {
  console.log('Percorso principale non trovato, tentativo con percorsi alternativi');
  
  const possiblePaths = [
    path.join(__dirname, '../public'),
    path.join(__dirname, '../motoshop/public'),
    path.join(__dirname, 'public'),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'motoshop/public')
  ];
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      console.log(`Percorso alternativo trovato: ${testPath}`);
      publicPath = testPath;
      break;
    }
  }
}

// Servi file statici dalla cartella public corretta
app.use(express.static(publicPath));

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
      serverSelectionTimeoutMS: 30000, // Aumentato a 30 secondi
      socketTimeoutMS: 60000, // Aumentato a 60 secondi
      connectTimeoutMS: 30000, // Aumentato a 30 secondi
      maxIdleTimeMS: 120000, // 2 minuti
      maxPoolSize: 10, // Massimo 10 connessioni nel pool
      retryWrites: true,
      retryReads: true,
      ssl: true
      // Rimossi i flag tlsAllowInvalidCertificates e tlsAllowInvalidHostnames che potrebbero causare problemi
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

// Route principale - Modificata per servire sempre l'HTML se richiesto da un browser
app.get('/', (req, res) => {
  console.log('Servendo index.html per la route principale');
  // Servi la pagina index.html usando il percorso corretto
  return res.sendFile(path.join(publicPath, 'index.html'));
});

// Nuova route specifica per l'API info
app.get('/api', (req, res) => {
  // Per richieste API, restituisci il JSON informativo
  console.log('Servendo informazioni API per la route /api');
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
          console.log('Prodotto trovato nel database:', product.nome || product.id);
          return res.json({
            success: true,
            message: 'Dettagli prodotto dal database',
            data: { product }
          });
        }
      } catch (dbError) {
        console.error('Errore nella ricerca del prodotto nel database:', dbError.message);
        // Continua con i dati statici
      }
    }
    
    // Dati statici di esempio
    const staticProducts = [
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
    ];
    
    // Cerca nei dati statici
    const staticProduct = staticProducts.find(p => p.id === productId);
    
    if (staticProduct) {
      console.log('Prodotto trovato nei dati statici:', staticProduct.nome);
      res.json({
        success: true,
        message: 'Dettagli prodotto (dati statici)',
        data: { product: staticProduct }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Prodotto non trovato',
        errorCode: 'PRODUCT_NOT_FOUND'
      });
    }
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

// Avvia il server
const startServer = async () => {
  // Connettiti al database
  await connectToMongoDB();
  
  // Debug dei percorsi disponibili
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Percorso di esecuzione (cwd):', process.cwd());
  console.log('Percorso del file attuale:', __dirname);
  console.log('Percorso che sarà usato per i file statici:', publicPath);
  
  // Verifica esistenza percorso
  console.log('Il percorso dei file statici esiste?', fs.existsSync(publicPath));
  
  try {
    // Elenca i file nel percorso per verificare che sia corretto
    const files = fs.readdirSync(publicPath);
    console.log('File nel percorso dei file statici:', files);
  } catch (err) {
    console.error('Errore nel leggere i file nel percorso:', err.message);
    
    // Elenca i file nella directory di base
    try {
      const baseFiles = fs.readdirSync(process.cwd());
      console.log('File nella directory di base:', baseFiles);
    } catch (e) {
      console.error('Errore nel leggere i file nella directory di base:', e.message);
    }
  }

  // Imposta route di fallback come ultima cosa prima di avviare il server
  // Questo serve per gestire SPA (Single Page Application) routing
  app.get('*', (req, res) => {
    // Se la richiesta è per una risorsa API, lasciala passare
    if (req.url.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        message: 'API endpoint non trovato'
      });
    }
    
    // Altrimenti, servi la pagina principale
    console.log('Fallback: Servendo index.html per:', req.url);
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Gestione errori 404 per risorse non gestite
  app.use((req, res, next) => {
    res.status(404).json({
      success: false,
      message: 'Risorsa non trovata',
      path: req.path
    });
  });
  
  // Gestione errori generici
  app.use((err, req, res, next) => {
    console.error('Errore non gestito:', err);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: process.env.NODE_ENV === 'production' ? 'Dettagli dell\'errore non disponibili in produzione' : err.message
    });
  });

  // Avvia il server
  app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
    console.log(`Per visualizzare il frontend accedi a: http://localhost:${PORT}`);
  });
};

startServer();

module.exports = app; // Per testing 