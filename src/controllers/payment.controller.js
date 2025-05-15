const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');

/**
 * Crea una sessione di pagamento Stripe
 * @route POST /api/payments/create-checkout-session
 * @access Private
 */
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;
    
    // Verifica che ci siano prodotti
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nessun prodotto nel carrello'
      });
    }
    
    // Recupera i dettagli dei prodotti dal database
    const productIds = items.map(item => item.id);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    
    // Crea line_items per Stripe
    const lineItems = [];
    let totalAmount = 0;
    
    for (const item of items) {
      const dbProduct = dbProducts.find(p => p._id.toString() === item.id);
      
      if (!dbProduct) {
        return res.status(404).json({
          success: false,
          message: `Prodotto ${item.id} non trovato`
        });
      }
      
      // Controlla disponibilità
      if (dbProduct.quantita < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Quantità non disponibile per ${dbProduct.nome}`
        });
      }
      
      // Usa il prezzo scontato se disponibile
      const price = dbProduct.prezzoScontato > 0 ? dbProduct.prezzoScontato : dbProduct.prezzo;
      
      // Calcola totale
      totalAmount += price * item.quantity;
      
      // Aggiungi a line_items
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: dbProduct.nome,
            description: dbProduct.descrizioneBreve || dbProduct.nome,
            images: dbProduct.immagini.length > 0 ? [dbProduct.immagini[0].url] : []
          },
          unit_amount: Math.round(price * 100) // Stripe richiede l'importo in centesimi
        },
        quantity: item.quantity
      });
    }
    
    // Crea sessione Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      customer_email: req.user.email,
      client_reference_id: req.user._id.toString(),
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
      shipping_address_collection: {
        allowed_countries: ['IT']
      },
      metadata: {
        userId: req.user._id.toString(),
        shippingAddressId: shippingAddress || '',
        totalAmount: totalAmount.toString()
      }
    });
    
    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Webhook per gestire eventi Stripe
 * @route POST /api/payments/webhook
 * @access Public
 */
exports.handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;
    
    // Verifica la firma dell'evento
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }
    
    // Gestione eventi
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        // Gestisci pagamento riuscito
        break;
      case 'payment_intent.payment_failed':
        // Gestisci pagamento fallito
        break;
      default:
        console.log(`Evento non gestito: ${event.type}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Gestisce il completamento di una sessione di checkout
 * @param {Object} session - Sessione di checkout Stripe
 */
const handleCheckoutSessionCompleted = async (session) => {
  try {
    const userId = session.metadata.userId;
    const totalAmount = parseFloat(session.metadata.totalAmount);
    
    // Recupera i dati dell'utente
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utente non trovato');
    }
    
    // Recupera i dati della sessione di checkout
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    
    // Recupera i dati di spedizione
    const shippingDetails = session.shipping;
    
    // Crea oggetto ordine
    const orderItems = [];
    
    // Nella versione reale bisognerebbe mappare i lineItems agli ID prodotto reali
    // Questo è un esempio semplificato
    for (const item of lineItems.data) {
      // Trova il prodotto nel database
      // Nella versione completa bisognerebbe usare il riferimento al prodotto
      const product = await Product.findOne({ 
        nome: item.description 
      });
      
      if (product) {
        orderItems.push({
          prodotto: product._id,
          nome: product.nome,
          immagine: product.immagini.length > 0 ? product.immagini[0].url : '',
          prezzoUnitario: product.prezzo,
          prezzoScontato: product.prezzoScontato,
          quantita: item.quantity,
          totaleItem: item.amount_total / 100
        });
        
        // Aggiorna la quantità disponibile
        product.quantita -= item.quantity;
        await product.save();
      }
    }
    
    // Crea indirizzo di spedizione
    const shippingAddress = {
      nome: shippingDetails.name.split(' ')[0],
      cognome: shippingDetails.name.split(' ').slice(1).join(' '),
      via: shippingDetails.address.line1,
      citta: shippingDetails.address.city,
      provincia: shippingDetails.address.state,
      cap: shippingDetails.address.postal_code
    };
    
    // Crea nuovo ordine
    const order = new Order({
      utente: userId,
      prodotti: orderItems,
      indirizzoSpedizione: shippingAddress,
      indirizzoFatturazione: shippingAddress,
      metodoPagamento: {
        tipo: 'carta di credito',
        dettagli: {
          idTransazione: session.payment_intent
        }
      },
      statoPagamento: 'completato',
      dettagliPagamento: {
        idTransazione: session.payment_intent,
        fornitoreServizio: 'Stripe',
        dataPagamento: new Date()
      },
      subtotale: totalAmount,
      costoSpedizione: 0, // In una implementazione reale, calcolare il costo di spedizione
      tasse: totalAmount * 0.22, // 22% IVA
      totale: totalAmount,
      statoOrdine: 'pagamento ricevuto'
    });
    
    await order.save();
    
    // Invia email di conferma ordine
    // In una versione completa, qui invieresti la conferma d'ordine
    
  } catch (error) {
    console.error('Errore nel gestire checkout.session.completed:', error);
  }
};

/**
 * Ottieni pagamenti dell'utente
 * @route GET /api/payments/my-payments
 * @access Private
 */
exports.getMyPayments = async (req, res, next) => {
  try {
    const orders = await Order.find({ utente: req.user._id })
      .sort({ dataCreazione: -1 });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
}; 