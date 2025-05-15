/**
 * Utility per testare la connessione a MongoDB Atlas
 * Esegui con: node src/utils/testConnection.js
 */

const { MongoClient } = require('mongodb');

// Stringa di connessione
const connectionString = 'mongodb+srv://davydarrigo98:Oo8CxRhFyD9iae6X@cluster0.nnsdpnr.mongodb.net/motoshop?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  let client;
  
  try {
    console.log('Tentativo di connessione a MongoDB Atlas...');
    
    // Crea client con opzioni avanzate
    client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      ssl: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true
    });
    
    // Tenta la connessione
    await client.connect();
    console.log('✅ Connessione a MongoDB Atlas riuscita!');
    
    // Verifica accesso al database
    const db = client.db('motoshop');
    const collections = await db.listCollections().toArray();
    console.log('📚 Collezioni disponibili:', collections.map(c => c.name).join(', ') || 'Nessuna collezione trovata');
    
    return true;
  } catch (error) {
    console.error('❌ Errore di connessione a MongoDB Atlas:', error.message);
    console.error('Codice di errore:', error.code);
    console.error('Stack di errore:', error.stack);
    
    console.log('\n🔍 SOLUZIONE PROBABILE:');
    console.log('1. Verifica che l\'indirizzo IP sia autorizzato in MongoDB Atlas');
    console.log('2. Verifica che la password sia corretta');
    console.log('3. Verifica che il nome utente sia corretto');
    console.log('4. Verifica la connettività di rete');
    
    return false;
  } finally {
    if (client) {
      await client.close();
      console.log('Connessione chiusa');
    }
  }
}

// Esegui il test
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  }); 