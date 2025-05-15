const User = require('../models/user.model');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Order = require('../models/order.model');

/**
 * Dashboard Admin - Statistiche generali
 * @route GET /api/admin/dashboard
 * @access Private (Admin)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Statistiche totali
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalCategories = await Category.countDocuments();
    
    // Calcola fatturato totale
    const orders = await Order.find({ statoPagamento: 'completato' });
    const totalRevenue = orders.reduce((acc, order) => acc + order.totale, 0);
    
    // Ultimi 5 ordini
    const recentOrders = await Order.find()
      .sort({ dataCreazione: -1 })
      .limit(5)
      .populate('utente', 'nome cognome email');
    
    // Ultimi 5 utenti registrati
    const recentUsers = await User.find()
      .sort({ dataRegistrazione: -1 })
      .limit(5)
      .select('nome cognome email dataRegistrazione');
    
    // Prodotti più venduti (top 5)
    const topProducts = await Order.aggregate([
      { $unwind: '$prodotti' },
      {
        $group: {
          _id: '$prodotti.prodotto',
          nome: { $first: '$prodotti.nome' },
          totaleVenduto: { $sum: '$prodotti.quantita' },
          ricavoTotale: { $sum: '$prodotti.totaleItem' }
        }
      },
      { $sort: { totaleVenduto: -1 } },
      { $limit: 5 }
    ]);
    
    // Statitiche ordini per stato
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: '$statoOrdine',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Conversione in un oggetto più semplice
    const orderStatusCount = {};
    orderStats.forEach(stat => {
      orderStatusCount[stat._id] = stat.count;
    });
    
    res.status(200).json({
      success: true,
      data: {
        counts: {
          users: totalUsers,
          products: totalProducts,
          orders: totalOrders,
          categories: totalCategories,
          revenue: totalRevenue
        },
        recentOrders,
        recentUsers,
        topProducts,
        orderStatusCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gestione Utenti - Lista tutti gli utenti
 * @route GET /api/admin/users
 * @access Private (Admin)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    // Parametri di paginazione
    const { page = 1, limit = 10, sort = 'dataRegistrazione', order = -1 } = req.query;
    
    // Calcola gli utenti da saltare
    const skip = (page - 1) * limit;
    
    // Conta il totale degli utenti
    const total = await User.countDocuments();
    
    // Ottieni gli utenti con paginazione
    const users = await User.find()
      .sort({ [sort]: order })
      .skip(skip)
      .limit(Number(limit))
      .select('-password -resetPasswordToken -resetPasswordExpires');
    
    // Calcola i metadati della paginazione
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    const hasPrev = page > 1;
    
    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        totalPages,
        currentPage: Number(page),
        hasMore,
        hasPrev
      },
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gestione Utenti - Ottieni dettagli utente
 * @route GET /api/admin/users/:id
 * @access Private (Admin)
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('ordini');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gestione Utenti - Aggiorna utente
 * @route PUT /api/admin/users/:id
 * @access Private (Admin)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, cognome, email, role, isEmailVerified } = req.body;
    
    // Controlla che non si stia modificando l'ultimo admin
    if (role === 'user') {
      const currentUser = await User.findById(id);
      if (currentUser && currentUser.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Impossibile rimuovere l\'ultimo amministratore'
          });
        }
      }
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      { nome, cognome, email, role, isEmailVerified },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Utente aggiornato con successo',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gestione Utenti - Elimina utente
 * @route DELETE /api/admin/users/:id
 * @access Private (Admin)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Assicurati di non eliminare l'ultimo admin
    const userToDelete = await User.findById(id);
    
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    if (userToDelete.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossibile eliminare l\'ultimo amministratore'
        });
      }
    }
    
    // Gestisci ordinatamente rimozione utente e dati correlati
    // Elimina o anonimizza gli ordini dell'utente
    // await Order.updateMany({ utente: id }, { utente: null });
    
    // Elimina l'utente
    await User.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Utente eliminato con successo'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gestione Ordini - Lista tutti gli ordini
 * @route GET /api/admin/orders
 * @access Private (Admin)
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    // Parametri di paginazione e filtri
    const { 
      page = 1, 
      limit = 10, 
      sort = 'dataCreazione', 
      order = -1,
      status
    } = req.query;
    
    // Costruisci query di filtro
    let query = {};
    
    // Filtro per stato ordine
    if (status) {
      query.statoOrdine = status;
    }
    
    // Calcola gli ordini da saltare
    const skip = (page - 1) * limit;
    
    // Conta il totale degli ordini che corrispondono al filtro
    const total = await Order.countDocuments(query);
    
    // Ottieni gli ordini con paginazione
    const orders = await Order.find(query)
      .sort({ [sort]: order })
      .skip(skip)
      .limit(Number(limit))
      .populate('utente', 'nome cognome email');
    
    // Calcola i metadati della paginazione
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    const hasPrev = page > 1;
    
    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        totalPages,
        currentPage: Number(page),
        hasMore,
        hasPrev
      },
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gestione Ordini - Ottieni dettagli ordine
 * @route GET /api/admin/orders/:id
 * @access Private (Admin)
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id)
      .populate('utente', 'nome cognome email telefono');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Ordine non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gestione Ordini - Aggiorna stato ordine
 * @route PUT /api/admin/orders/:id
 * @access Private (Admin)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statoOrdine, numeroTracking, corriere } = req.body;
    
    const updateData = { statoOrdine };
    
    // Aggiorna i dettagli di spedizione se forniti
    if (numeroTracking || corriere) {
      updateData.dettagliSpedizione = {};
      
      if (numeroTracking) {
        updateData.dettagliSpedizione.numeroTracking = numeroTracking;
      }
      
      if (corriere) {
        updateData.dettagliSpedizione.corriere = corriere;
      }
      
      // Se lo stato è 'spedito', aggiungi la data di spedizione
      if (statoOrdine === 'spedito') {
        updateData.dettagliSpedizione.dataSpedizione = new Date();
      }
    }
    
    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Ordine non trovato'
      });
    }
    
    // Invia email di aggiornamento stato ordine
    // In una versione completa, qui invieresti una email di notifica
    
    res.status(200).json({
      success: true,
      message: 'Stato ordine aggiornato con successo',
      data: order
    });
  } catch (error) {
    next(error);
  }
}; 