const nodemailer = require('nodemailer');

/**
 * Configura il transport per Nodemailer
 * @returns {Object} Nodemailer transporter
 */
const createTransporter = () => {
  // In ambiente di produzione, usa i parametri da .env
  // In ambiente di sviluppo, usa ethereal.email per test
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Per test, usa ethereal.email (email di test)
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'ethereal_test@example.com',
        pass: process.env.EMAIL_PASS || 'ethereal_password'
      }
    });
  }
};

/**
 * Invia una email
 * @param {Object} options - Opzioni email (to, subject, text, html)
 * @returns {Promise} Risultato dell'invio
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'MotoShop <noreply@motoshop.it>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email di test inviata:');
      console.log(`URL di anteprima: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    throw error;
  }
};

/**
 * Invia email di verifica registrazione
 * @param {Object} user - Utente
 * @param {String} verificationToken - Token di verifica
 */
const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">Benvenuto su MotoShop!</h2>
      <p>Ciao ${user.nome},</p>
      <p>Grazie per esserti registrato su MotoShop. Per attivare il tuo account, ti preghiamo di verificare la tua email cliccando sul link sottostante:</p>
      <p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verifica Email
        </a>
      </p>
      <p>Se non riesci a cliccare sul bottone, copia e incolla il seguente link nel tuo browser:</p>
      <p>${verificationUrl}</p>
      <p>Se non hai richiesto questa email, puoi ignorarla.</p>
      <p>Cordiali saluti,<br>Il team di MotoShop</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: 'Verifica la tua email',
    text: `Benvenuto su MotoShop! Per attivare il tuo account, visita questo link: ${verificationUrl}`,
    html
  });
};

/**
 * Invia email di reset password
 * @param {Object} user - Utente
 * @param {String} resetUrl - URL di reset
 */
const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">Reset Password MotoShop</h2>
      <p>Ciao ${user.nome},</p>
      <p>Hai richiesto il reset della password per il tuo account MotoShop. Clicca sul link sottostante per procedere:</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
      </p>
      <p>Se non riesci a cliccare sul bottone, copia e incolla il seguente link nel tuo browser:</p>
      <p>${resetUrl}</p>
      <p>Il link sarà valido per 10 minuti.</p>
      <p>Se non hai richiesto il reset della password, ignora questa email e la tua password rimarrà invariata.</p>
      <p>Cordiali saluti,<br>Il team di MotoShop</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: 'Reset della Password',
    text: `Hai richiesto il reset della password. Visita questo link per procedere: ${resetUrl}. Il link sarà valido per 10 minuti.`,
    html
  });
};

/**
 * Invia conferma ordine
 * @param {Object} user - Utente
 * @param {Object} order - Ordine
 */
const sendOrderConfirmation = async (user, order) => {
  // Costruisci il riepilogo prodotti
  let productsHtml = '';
  
  for (const item of order.prodotti) {
    productsHtml += `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
          ${item.nome}
          ${item.varianti && item.varianti.length > 0 
            ? `<br><small style="color: #666;">${item.varianti.map(v => `${v.nome}: ${v.valore}`).join(', ')}</small>` 
            : ''}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantita}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">€${item.prezzoUnitario.toFixed(2)}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">€${item.totaleItem.toFixed(2)}</td>
      </tr>
    `;
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">Conferma Ordine #${order.numeroOrdine}</h2>
      <p>Ciao ${user.nome},</p>
      <p>Grazie per il tuo ordine su MotoShop. Di seguito trovi il riepilogo del tuo acquisto:</p>
      
      <h3>Dettagli Ordine:</h3>
      <p><strong>Numero Ordine:</strong> ${order.numeroOrdine}</p>
      <p><strong>Data:</strong> ${new Date(order.dataCreazione).toLocaleDateString('it-IT')}</p>
      <p><strong>Stato:</strong> ${order.statoOrdine}</p>
      
      <h3>Prodotti:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f8f9fa;">
          <th style="text-align: left; padding: 10px 0;">Prodotto</th>
          <th style="text-align: center; padding: 10px 0;">Qtà</th>
          <th style="text-align: right; padding: 10px 0;">Prezzo</th>
          <th style="text-align: right; padding: 10px 0;">Totale</th>
        </tr>
        ${productsHtml}
      </table>
      
      <div style="margin-top: 20px; text-align: right;">
        <p><strong>Subtotale:</strong> €${order.subtotale.toFixed(2)}</p>
        <p><strong>Spedizione:</strong> €${order.costoSpedizione.toFixed(2)}</p>
        ${order.sconto > 0 ? `<p><strong>Sconto:</strong> -€${order.sconto.toFixed(2)}</p>` : ''}
        <p><strong>Tasse:</strong> €${order.tasse.toFixed(2)}</p>
        <p style="font-size: 18px;"><strong>Totale:</strong> €${order.totale.toFixed(2)}</p>
      </div>
      
      <h3>Indirizzo di Spedizione:</h3>
      <p>
        ${order.indirizzoSpedizione.nome} ${order.indirizzoSpedizione.cognome}<br>
        ${order.indirizzoSpedizione.via}<br>
        ${order.indirizzoSpedizione.citta}, ${order.indirizzoSpedizione.provincia} ${order.indirizzoSpedizione.cap}
      </p>
      
      <p>Puoi seguire lo stato del tuo ordine accedendo alla tua area personale sul nostro sito.</p>
      <p>Per qualsiasi domanda, non esitare a contattarci.</p>
      <p>Cordiali saluti,<br>Il team di MotoShop</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: `Conferma Ordine #${order.numeroOrdine}`,
    text: `Grazie per il tuo ordine #${order.numeroOrdine} su MotoShop del ${new Date(order.dataCreazione).toLocaleDateString('it-IT')}. Totale: €${order.totale.toFixed(2)}`,
    html
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmation
}; 