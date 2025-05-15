// Funzioni di utilità
document.addEventListener('DOMContentLoaded', function() {
    // Inizializzazione del carousel
    var carouselEl = document.querySelector('#carouselExampleIndicators');
    if (carouselEl) {
        var carousel = new bootstrap.Carousel(carouselEl, {
            interval: 5000,
            wrap: true
        });
    }

    // Gestione aggiunta al carrello
    const addToCartButtons = document.querySelectorAll('.product-card .btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            // Recupera informazioni prodotto
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('.card-title').textContent;
            const productPrice = productCard.querySelector('.fw-bold').textContent;
            
            // Aggiorna contatore carrello
            const cartCounter = document.querySelector('.fa-shopping-cart + .badge');
            if (cartCounter) {
                let count = parseInt(cartCounter.textContent);
                cartCounter.textContent = count + 1;
            }
            
            // Mostra messaggio di conferma
            showToast(`${productName} aggiunto al carrello`);
            
            // In una reale implementazione, qui verrebbero salvati i dati nel localStorage o inviati al server
            console.log(`Prodotto aggiunto: ${productName} - ${productPrice}`);
        });
    });

    // Funzione per mostrare toast di conferma
    function showToast(message) {
        // Crea elemento toast se non esiste
        if (!document.querySelector('#toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '5';
            document.body.appendChild(toastContainer);
        }
        
        // Crea toast
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">MotoShop</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        document.querySelector('#toast-container').insertAdjacentHTML('beforeend', toastHtml);
        
        // Inizializza e mostra toast
        const toastEl = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastEl, {
            autohide: true,
            delay: 3000
        });
        toast.show();
        
        // Rimuovi toast dopo la chiusura
        toastEl.addEventListener('hidden.bs.toast', function() {
            toastEl.remove();
        });
    }

    // Gestione ricerca prodotti
    const searchForm = document.querySelector('form.d-flex');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchTerm = this.querySelector('input').value.trim();
            if (searchTerm) {
                // In una reale implementazione, qui verrebbe effettuata una ricerca nel database
                // e l'utente verrebbe reindirizzato ai risultati
                console.log(`Ricerca effettuata: ${searchTerm}`);
                alert(`Hai cercato: ${searchTerm}\nQuesta funzionalità sarà implementata a breve.`);
            }
        });
    }

    // Gestione newsletter
    const newsletterForm = document.querySelector('.newsletter-section form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value.trim();
            if (email && isValidEmail(email)) {
                // In una reale implementazione, qui l'email verrebbe inviata al server
                console.log(`Iscrizione newsletter: ${email}`);
                showToast('Grazie per l\'iscrizione alla newsletter!');
                this.reset();
            } else {
                showToast('Per favore, inserisci un indirizzo email valido.');
            }
        });
    }

    // Funzione per validare email
    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
});

// Funzione per gestire l'aggiunta prodotti alla wishlist
function addToWishlist(productId) {
    // In una reale implementazione, qui verrebbe gestita l'aggiunta alla wishlist
    console.log(`Prodotto aggiunto alla wishlist: ${productId}`);
    showToast('Prodotto aggiunto alla wishlist!');
} 