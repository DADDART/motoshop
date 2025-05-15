const Product = require('../models/product.model');
const Category = require('../models/category.model');

/**
 * Ottieni tutti i prodotti con paginazione e filtri
 * @route GET /api/products
 * @access Public
 */
exports.getProducts = async (req, res, next) => {
  try {
    // Parametri di query per filtri, ordinamento e paginazione
    const {
      page = 1,
      limit = 12,
      sort = 'dataCreazione',
      order = -1,
      category,
      minPrice,
      maxPrice,
      brand,
      search,
      inStock = false,
      featured = false
    } = req.query;
    
    // Costruisci query di filtro
    let query = {};
    
    // Filtro per categoria
    if (category) {
      const categoryObj = await Category.findOne({ slug: category });
      if (categoryObj) {
        query.categorie = categoryObj._id;
      }
    }
    
    // Filtro per prezzo
    if (minPrice || maxPrice) {
      query.prezzo = {};
      if (minPrice) query.prezzo.$gte = Number(minPrice);
      if (maxPrice) query.prezzo.$lte = Number(maxPrice);
    }
    
    // Filtro per marca
    if (brand) {
      query.marchio = brand;
    }
    
    // Filtro per disponibilità
    if (inStock === 'true') {
      query.quantita = { $gt: 0 };
      query.disponibile = true;
    }
    
    // Filtro per prodotti in evidenza
    if (featured === 'true') {
      query.inEvidenza = true;
    }
    
    // Ricerca testuale
    if (search) {
      query.$text = { $search: search };
    }
    
    // Calcola il numero totale di prodotti che corrispondono ai filtri
    const total = await Product.countDocuments(query);
    
    // Ottieni i prodotti con paginazione e ordinamento
    const products = await Product.find(query)
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('categorie', 'nome slug');
    
    // Calcola i metadati della paginazione
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    const hasPrev = page > 1;
    
    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        totalPages,
        currentPage: Number(page),
        hasMore,
        hasPrev
      },
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ottieni un singolo prodotto per ID o slug
 * @route GET /api/products/:id
 * @access Public
 */
exports.getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    let product;
    
    // Cerca per ID o slug
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).populate('categorie', 'nome slug');
    } else {
      product = await Product.findOne({ slug: id }).populate('categorie', 'nome slug');
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuovo prodotto
 * @route POST /api/products
 * @access Private (Admin)
 */
exports.createProduct = async (req, res, next) => {
  try {
    // Crea lo slug dal nome
    if (!req.body.slug && req.body.nome) {
      req.body.slug = req.body.nome
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }
    
    // Crea il prodotto
    const product = await Product.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Prodotto creato con successo',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggiorna un prodotto
 * @route PUT /api/products/:id
 * @access Private (Admin)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Aggiorna lo slug se il nome è cambiato
    if (req.body.nome && !req.body.slug) {
      req.body.slug = req.body.nome
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }
    
    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Prodotto aggiornato con successo',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un prodotto
 * @route DELETE /api/products/:id
 * @access Private (Admin)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByIdAndDelete(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Prodotto eliminato con successo'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggiungi recensione a un prodotto
 * @route POST /api/products/:id/reviews
 * @access Private
 */
exports.addReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { valutazione, commento } = req.body;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    // Verifica se l'utente ha già recensito questo prodotto
    const alreadyReviewed = product.recensioni.find(
      review => review.utente.toString() === req.user.id
    );
    
    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'Hai già recensito questo prodotto'
      });
    }
    
    // Crea nuova recensione
    const review = {
      utente: req.user.id,
      valutazione: Number(valutazione),
      commento,
      dataCreazione: Date.now()
    };
    
    // Aggiungi recensione e salva
    product.recensioni.push(review);
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Recensione aggiunta con successo',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ottieni prodotti correlati
 * @route GET /api/products/:id/related
 * @access Public
 */
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    // Trova prodotti con categorie simili
    const relatedProducts = await Product.find({
      _id: { $ne: id },
      categorie: { $in: product.categorie }
    })
      .limit(4)
      .populate('categorie', 'nome slug');
    
    res.status(200).json({
      success: true,
      data: relatedProducts
    });
  } catch (error) {
    next(error);
  }
}; 