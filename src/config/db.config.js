const mongoose = require('mongoose');

/**
 * Configurazione e connessione al database MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Le opzioni sono gestite automaticamente nelle versioni recenti di mongoose
    });
    
    console.log(`MongoDB connesso: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Errore di connessione a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 