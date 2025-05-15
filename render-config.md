# Configurazione per Render

Questo documento contiene le istruzioni per configurare correttamente l'applicazione su Render.

## Variabili d'ambiente

Configura le seguenti variabili d'ambiente nel pannello di controllo di Render:

- `MONGODB_URI`: mongodb+srv://davydarrigo98:Oo8CxRhFyD9iae6X@cluster0.nnsdpnr.mongodb.net/motoshop?retryWrites=true&w=majority&appName=Cluster0
- `PORT`: 10000

## Indirizzi IP da configurare in MongoDB Atlas

Per garantire che Render possa connettersi al database MongoDB Atlas, aggiungi i seguenti indirizzi IP nella configurazione "Network Access" di MongoDB Atlas:

- 18.156.158.53
- 18.156.42.200
- 52.59.103.54

## Comandi di build e start

### Build Command
```
npm install
```

### Start Command
```
node src/server.js
```

## Accesso all'applicazione

Una volta che l'applicazione è stata deployata con successo su Render, puoi accedervi in due modi:

1. **Interfaccia Web**: Visita l'URL assegnato da Render (es. https://motoshop.onrender.com) nel tuo browser per vedere la pagina principale dell'e-commerce.

2. **API**: Puoi accedere direttamente alle API REST tramite:
   - `GET /api/products` - Lista prodotti
   - `GET /api/categories` - Lista categorie
   - `POST /api/auth/login` - Login utente

## Pagine disponibili

- `/` - Home page (index.html)
- `/carrello.html` - Pagina del carrello
- `/checkout.html` - Pagina di checkout
- `/categoria.html` - Lista prodotti per categoria

## Verifica della connessione

Per verificare che la connessione al database funzioni correttamente, puoi eseguire:

```
node src/utils/testConnection.js
```

Questo script eseguirà un test di connessione e fornirà informazioni diagnostiche in caso di problemi. 