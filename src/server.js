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

// SOLUZIONE PER RENDER: gestione diretta dei file statici
const PRODUCTION_FILES = path.join(process.cwd(), 'motoshop/public');
const LOCAL_FILES = path.join(__dirname, '../motoshop/public');

// Log dei percorsi per debugging
console.log('AMBIENTE:', process.env.NODE_ENV);
console.log('CWD:', process.cwd());
console.log('DIRNAME:', __dirname);
console.log('PRODUCTION PATH EXISTS:', fs.existsSync(PRODUCTION_FILES));
console.log('LOCAL PATH EXISTS:', fs.existsSync(LOCAL_FILES));

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

// Configura prima le rotte API
app.get('/api', (req, res) => {
  console.log('Servendo API info');
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

// Endpoint di diagnostica per Render
app.get('/render-debug', (req, res) => {
  // Raccoglie informazioni sull'ambiente
  const debugInfo = {
    environment: process.env.NODE_ENV,
    workingDirectory: process.cwd(),
    dirname: __dirname,
    files: {
      rootDirectory: fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : 'Non accessibile',
      srcDirectory: fs.existsSync(path.join(process.cwd(), 'src')) ? fs.readdirSync(path.join(process.cwd(), 'src')) : 'Non accessibile'
    },
    paths: {
      production: {
        path: PRODUCTION_FILES,
        exists: fs.existsSync(PRODUCTION_FILES),
        files: fs.existsSync(PRODUCTION_FILES) ? fs.readdirSync(PRODUCTION_FILES) : 'Non accessibile'
      },
      local: {
        path: LOCAL_FILES,
        exists: fs.existsSync(LOCAL_FILES),
        files: fs.existsSync(LOCAL_FILES) ? fs.readdirSync(LOCAL_FILES) : 'Non accessibile'
      }
    },
    motoshopDirectory: fs.existsSync(path.join(process.cwd(), 'motoshop')) ? {
      exists: true,
      files: fs.readdirSync(path.join(process.cwd(), 'motoshop'))
    } : {
      exists: false,
      message: 'Directory motoshop non trovata'
    },
    possiblePublicPaths: [
      path.join(process.cwd(), 'public'),
      path.join(process.cwd(), 'motoshop/public'),
      path.join(__dirname, 'public'),
      path.join(__dirname, '../public'),
      path.join(__dirname, '../motoshop/public')
    ].map(p => ({
      path: p,
      exists: fs.existsSync(p),
      files: fs.existsSync(p) ? fs.readdirSync(p) : 'Non accessibile'
    }))
  };

  // Ritorna le informazioni di debug come JSON
  res.json(debugInfo);
});

// Controlla quale percorso è disponibile e configura i file statici
if (fs.existsSync(PRODUCTION_FILES)) {
  console.log('*** USANDO PERCORSO PRODUCTION ***');
  app.use(express.static(PRODUCTION_FILES));
  
  // Servi index.html per tutte le richieste non-API
  app.get('/', (req, res) => {
    console.log('Servendo index.html (PRODUCTION)');
    // Prova a servire il file index.html ma con un fallback in caso di errore
    res.sendFile(path.join(PRODUCTION_FILES, 'index.html'), (err) => {
      if (err) {
        console.error('Errore nel servire index.html da PRODUCTION:', err);
        // Fallback a HTML inline
        res.send(getBasicHtml());
      }
    });
  });
} else if (fs.existsSync(LOCAL_FILES)) {
  console.log('*** USANDO PERCORSO LOCALE ***');
  app.use(express.static(LOCAL_FILES));
  
  // Servi index.html per tutte le richieste non-API
  app.get('/', (req, res) => {
    console.log('Servendo index.html (LOCAL)');
    // Prova a servire il file index.html ma con un fallback in caso di errore
    res.sendFile(path.join(LOCAL_FILES, 'index.html'), (err) => {
      if (err) {
        console.error('Errore nel servire index.html da LOCAL:', err);
        // Fallback a HTML inline
        res.send(getBasicHtml());
      }
    });
  });
} else {
  // Nessun percorso trovato - crea directory e file di fallback
  console.log('*** NESSUN PERCORSO TROVATO - USANDO HTML INLINE ***');
  
  // Route principale semplificata che mostra un messaggio di base in HTML
  app.get('/', (req, res) => {
    console.log('Servendo pagina HTML di base');
    res.send(getBasicHtml());
  });
}

// Funzione per generare l'HTML di base
function getBasicHtml() {
  return `
    <!DOCTYPE html>
    <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MotoShop</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
          h1 { color: #333; }
          .container { max-width: 800px; margin: 0 auto; }
          .card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
          .btn { display: inline-block; background: #333; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Benvenuto al MotoShop!</h1>
          <div class="card">
            <h2>MotoShop è online</h2>
            <p>Questa è la pagina principale dell'e-commerce per prodotti motociclistici.</p>
            <p>Per accedere alle API del sito, visita la <a href="/api">/api</a>.</p>
            <div class="card">
              <h3>Prodotti in evidenza:</h3>
              <ul>
                <li><a href="/api/products/1">Casco Integrale XR-800</a></li>
                <li><a href="/api/products/2">Giacca in Pelle Touring Pro</a></li>
                <li><a href="/api/products/3">Guanti Estivi Air Flow</a></li>
              </ul>
              <p><a href="/api/products" class="btn">Visualizza tutti i prodotti</a></p>
            </div>
            <div class="card">
              <h3>Diagnostica:</h3>
              <p>Per vedere informazioni dettagliate sull'ambiente e sui percorsi, visita la <a href="/render-debug">/render-debug</a>.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

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
  console.log('Percorso che sarà usato per i file statici:', PRODUCTION_FILES || LOCAL_FILES);
  
  // Verifica esistenza percorso
  console.log('Il percorso dei file statici esiste?', fs.existsSync(PRODUCTION_FILES) || fs.existsSync(LOCAL_FILES));
  
  // Se nessun percorso esiste, non provare ad accedervi
  if (fs.existsSync(PRODUCTION_FILES)) {
    try {
      const files = fs.readdirSync(PRODUCTION_FILES);
      console.log('File nel percorso PRODUCTION:', files);
    } catch (err) {
      console.error('Errore nel leggere i file nel percorso PRODUCTION:', err.message);
    }
  } else if (fs.existsSync(LOCAL_FILES)) {
    try {
      const files = fs.readdirSync(LOCAL_FILES);
      console.log('File nel percorso LOCAL:', files);
    } catch (err) {
      console.error('Errore nel leggere i file nel percorso LOCAL:', err.message);
    }
  } else {
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
    
    // Controlla quale percorso esiste
    if (fs.existsSync(PRODUCTION_FILES)) {
      res.sendFile(path.join(PRODUCTION_FILES, 'index.html'));
    } else if (fs.existsSync(LOCAL_FILES)) {
      res.sendFile(path.join(LOCAL_FILES, 'index.html'));
    } else {
      // Se nessun percorso esiste, mostra il messaggio HTML di base
      res.send(getBasicHtml());
    }
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