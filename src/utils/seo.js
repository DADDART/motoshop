const fs = require('fs');
const path = require('path');
const Product = require('../models/product.model');
const Category = require('../models/category.model');

/**
 * Genera una sitemap XML
 * @param {String} baseUrl - URL base del sito
 * @param {String} outputPath - Percorso di output del file sitemap.xml
 * @returns {Promise} Risultato dell'operazione
 */
const generateSitemap = async (baseUrl, outputPath) => {
  try {
    // Ottieni tutti i prodotti e categorie dal database
    const products = await Product.find({ disponibile: true }).select('slug dataCreazione updatedAt');
    const categories = await Category.find().select('slug updatedAt');
    
    // Inizia a costruire la sitemap
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Pagine statiche
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: 'chi-siamo', priority: '0.8', changefreq: 'monthly' },
      { url: 'contatti', priority: '0.8', changefreq: 'monthly' },
      { url: 'condizioni-vendita', priority: '0.7', changefreq: 'monthly' },
      { url: 'privacy', priority: '0.7', changefreq: 'monthly' },
      { url: 'spedizioni', priority: '0.7', changefreq: 'monthly' },
      { url: 'resi', priority: '0.7', changefreq: 'monthly' },
      { url: 'faq', priority: '0.7', changefreq: 'monthly' }
    ];
    
    // Aggiungi pagine statiche
    for (const page of staticPages) {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/${page.url}</loc>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
      sitemap += `  </url>\n`;
    }
    
    // Aggiungi categorie
    for (const category of categories) {
      const lastmod = category.updatedAt ? new Date(category.updatedAt).toISOString() : new Date().toISOString();
      
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/categoria/${category.slug}</loc>\n`;
      sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemap += `    <priority>0.8</priority>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `  </url>\n`;
    }
    
    // Aggiungi prodotti
    for (const product of products) {
      const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString();
      
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/prodotto/${product.slug}</loc>\n`;
      sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemap += `    <priority>0.7</priority>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `  </url>\n`;
    }
    
    // Chiudi la sitemap
    sitemap += '</urlset>';
    
    // Scrivi il file
    fs.writeFileSync(outputPath, sitemap);
    
    console.log(`Sitemap generata con successo in ${outputPath}`);
    return { success: true, count: staticPages.length + categories.length + products.length };
  } catch (error) {
    console.error('Errore nella generazione della sitemap:', error);
    throw error;
  }
};

/**
 * Genera dati strutturati Schema.org per un prodotto
 * @param {Object} product - Prodotto
 * @param {String} baseUrl - URL base del sito
 * @returns {Object} Dati strutturati Schema.org
 */
const generateProductSchema = (product, baseUrl) => {
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.nome,
    "description": product.descrizione,
    "sku": product._id.toString(),
    "mpn": product._id.toString(),
    "brand": {
      "@type": "Brand",
      "name": product.marchio
    },
    "offers": {
      "@type": "Offer",
      "url": `${baseUrl}/prodotto/${product.slug}`,
      "priceCurrency": "EUR",
      "price": product.prezzoScontato > 0 ? product.prezzoScontato : product.prezzo,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "availability": product.disponibile && product.quantita > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };
  
  // Aggiungi immagini se disponibili
  if (product.immagini && product.immagini.length > 0) {
    schema.image = product.immagini.map(img => img.url);
  }
  
  // Aggiungi recensioni se disponibili
  if (product.recensioni && product.recensioni.length > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": product.valutazioneMedia,
      "reviewCount": product.recensioni.length
    };
    
    // Aggiungi alcune recensioni
    schema.review = product.recensioni.slice(0, 5).map(review => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.valutazione
      },
      "author": {
        "@type": "Person",
        "name": "Cliente MotoShop"
      },
      "reviewBody": review.commento
    }));
  }
  
  return schema;
};

/**
 * Genera dati meta per un prodotto
 * @param {Object} product - Prodotto
 * @returns {Object} Dati meta
 */
const generateProductMeta = (product) => {
  // Crea titolo meta
  const metaTitle = product.metadati && product.metadati.metaTitle 
    ? product.metadati.metaTitle 
    : `${product.nome} - ${product.marchio} | MotoShop`;
  
  // Crea descrizione meta
  const metaDescription = product.metadati && product.metadati.metaDescription
    ? product.metadati.metaDescription
    : product.descrizioneBreve || product.descrizione.substring(0, 160);
  
  // Crea keyword meta
  const metaKeywords = product.metadati && product.metadati.metaKeywords
    ? product.metadati.metaKeywords
    : `${product.nome}, ${product.marchio}, accessori moto, motoshop`;
  
  return {
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords,
    ogTitle: metaTitle,
    ogDescription: metaDescription,
    ogImage: product.immagini && product.immagini.length > 0 ? product.immagini[0].url : '',
    ogType: 'product'
  };
};

module.exports = {
  generateSitemap,
  generateProductSchema,
  generateProductMeta
}; 