# MotoShop

Applicazione e-commerce per prodotti motociclistici.

## Aggiornamento Frontend

L'applicazione è stata aggiornata per visualizzare correttamente il frontend su Render. Sono state risolte le seguenti problematiche:
- Gestione corretta dei percorsi dei file statici
- Implementazione di un sistema di fallback per quando i file statici non sono trovati
- Aggiunto debugging avanzato per diagnosticare problemi di deployment

## Configurazione MongoDB Atlas

Per consentire la connessione a MongoDB Atlas da Render o altri servizi di hosting:

1. Accedi a MongoDB Atlas (https://cloud.mongodb.com/)
2. Vai al tuo cluster > Network Access
3. Clicca su "Add IP Address"
4. Aggiungi i seguenti indirizzi IP di Render:
   - 18.156.158.53
   - 18.156.42.200
   - 52.59.103.54
5. Oppure seleziona "Allow Access From Anywhere" (meno sicuro ma più semplice)

## Avvio dell'applicazione

```
npm install
npm run dev
```
