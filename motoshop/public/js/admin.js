// Variabili globali
let token = localStorage.getItem('adminToken');
let currentUser = null;

// Inizializzazione al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se l'utente è già loggato
    if (token) {
        fetchUserInfo();
    } else {
        showLoginForm();
    }

    // Event listeners
    setupEventListeners();
});

// Setup degli eventi principali
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navigazione nel menu
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            
            // Attiva il link corrente
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
            
            // Mostra la sezione corrispondente
            toggleSection(section);
            
            // Carica i dati per la sezione
            loadSectionData(section);
            
            // Aggiorna URL
            window.location.hash = section;
        });
    });
    
    // Gestione product
    document.getElementById('addProductBtn').addEventListener('click', () => showProductModal());
    document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
    
    // Gestione category
    document.getElementById('addCategoryBtn').addEventListener('click', () => showCategoryModal());
    document.getElementById('saveCategoryBtn').addEventListener('click', saveCategory);
    
    // Gestione ordini
    document.getElementById('updateOrderStatusBtn').addEventListener('click', updateOrderStatus);
    
    // Gestione utenti
    document.getElementById('saveUserBtn').addEventListener('click', saveUser);
    
    // Conferma eliminazione
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
}

// Gestione login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Errore durante il login');
        }
        
        // Verifica sicura della proprietà role
        if (!data.user || data.user.role !== 'admin') {
            throw new Error('Accesso riservato agli amministratori');
        }
        
        // Salva il token e mostra il pannello admin
        token = data.token;
        localStorage.setItem('adminToken', token);
        currentUser = data.user;
        
        // Nascondi errori e form login
        errorEl.classList.add('d-none');
        showAdminPanel();
        
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('d-none');
    }
}

// Recupera info utente
async function fetchUserInfo() {
    try {
        const response = await fetchWithAuth('/api/auth/me');
        
        if (!response.ok) {
            throw new Error('Sessione scaduta');
        }
        
        const data = await response.json();
        
        // Verifica sicura della proprietà role
        if (!data || data.role !== 'admin') {
            throw new Error('Accesso riservato agli amministratori');
        }
        
        currentUser = data;
        showAdminPanel();
        
        // Carica la dashboard o la sezione dall'URL
        const hash = window.location.hash.substring(1) || 'dashboard';
        const navLink = document.querySelector(`.nav-link[data-section="${hash}"]`);
        if (navLink) {
            navLink.click();
        } else {
            // Se il link non esiste, carica la dashboard
            document.querySelector(`.nav-link[data-section="dashboard"]`)?.click();
        }
        
    } catch (error) {
        handleLogout();
    }
}

// Logout
function handleLogout() {
    localStorage.removeItem('adminToken');
    token = null;
    currentUser = null;
    showLoginForm();
}

// Mostra form login
function showLoginForm() {
    document.getElementById('loginSection').classList.remove('d-none');
    document.getElementById('adminPanel').classList.add('d-none');
    document.getElementById('userWelcome').classList.add('d-none');
    document.getElementById('logoutBtn').classList.add('d-none');
}

// Mostra pannello admin
function showAdminPanel() {
    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('adminPanel').classList.remove('d-none');
    
    // Mostra info utente nella navbar
    const userWelcome = document.getElementById('userWelcome');
    userWelcome.classList.remove('d-none');
    document.getElementById('userName').textContent = currentUser.firstName || currentUser.email;
    document.getElementById('logoutBtn').classList.remove('d-none');
}

// Cambia sezione visibile
function toggleSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('d-none');
    });
    document.getElementById(`${sectionId}-section`).classList.remove('d-none');
}

// Carica dati per la sezione
function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// Funzione helper per fetch con autenticazione
async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    return fetch(url, { ...options, headers });
}

// Gestione errori comuni
function handleApiError(error, elementId) {
    console.error('API Error:', error);
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-danger">
                    Errore: ${error.message || 'Si è verificato un errore'}
                </td>
            </tr>
        `;
    }
}

// ------------ DASHBOARD ------------

// Carica dati dashboard
async function loadDashboardData() {
    try {
        // Carica statistiche totali
        const statsResponse = await fetchWithAuth('/api/admin/stats');
        const stats = await statsResponse.json();
        
        if (statsResponse.ok && stats) {
            // Aggiorna card con statistiche
            document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue || 0);
            document.getElementById('totalOrders').textContent = stats.orderCount || 0;
            document.getElementById('totalUsers').textContent = stats.userCount || 0;
            document.getElementById('totalProducts').textContent = stats.productCount || 0;
            
            // Carica ordini recenti
            loadRecentOrders();
            
            // Carica prodotti più venduti
            loadTopProducts();
        }
    } catch (error) {
        console.error('Errore caricamento dashboard:', error);
    }
}

// Carica ordini recenti
async function loadRecentOrders() {
    try {
        const response = await fetchWithAuth('/api/admin/orders?limit=5');
        const orders = await response.json();
        
        const tableBody = document.querySelector('#recentOrdersTable tbody');
        
        if (response.ok && orders && orders.length > 0) {
            tableBody.innerHTML = orders.map(order => `
                <tr>
                    <td>${order._id || order.id}</td>
                    <td>${order.userInfo?.email || 'Cliente ospite'}</td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>${formatCurrency(order.total)}</td>
                    <td><span class="badge bg-${getStatusBadgeColor(order.status)}">${translateStatus(order.status)}</span></td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nessun ordine recente</td></tr>';
        }
    } catch (error) {
        handleApiError(error, 'recentOrdersTable');
    }
}

// Carica prodotti più venduti
async function loadTopProducts() {
    try {
        const response = await fetchWithAuth('/api/admin/products/top');
        const products = await response.json();
        
        const tableBody = document.querySelector('#topProductsTable tbody');
        
        if (response.ok && products && products.length > 0) {
            tableBody.innerHTML = products.map(product => `
                <tr>
                    <td>${product.name || product.product?.name || 'Prodotto non disponibile'}</td>
                    <td>${product.category?.name || 'N/A'}</td>
                    <td>${product.sales || product.count || 0}</td>
                    <td>${formatCurrency(product.revenue || 0)}</td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nessun dato disponibile</td></tr>';
        }
    } catch (error) {
        handleApiError(error, 'topProductsTable');
    }
}

// Formatta valuta
function formatCurrency(value) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

// Formatta data
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('it-IT', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Ottieni colore per badge stato
function getStatusBadgeColor(status) {
    switch(status) {
        case 'pending': return 'warning';
        case 'processing': return 'info';
        case 'shipped': return 'primary';
        case 'delivered': return 'success';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}

// Traduci stato ordine
function translateStatus(status) {
    switch(status) {
        case 'pending': return 'In attesa';
        case 'processing': return 'In elaborazione';
        case 'shipped': return 'Spedito';
        case 'delivered': return 'Consegnato';
        case 'cancelled': return 'Annullato';
        default: return status;
    }
}

// ------------ PRODOTTI ------------

// Carica lista prodotti
async function loadProducts() {
    try {
        const response = await fetchWithAuth('/api/admin/products');
        const products = await response.json();
        
        const tableBody = document.querySelector('#productsTable tbody');
        
        if (response.ok && products && products.length > 0) {
            tableBody.innerHTML = products.map(product => `
                <tr>
                    <td>
                        <img src="${product.image || '/images/no-image.png'}" alt="${product.name}" class="product-image-small">
                    </td>
                    <td>${product.name}</td>
                    <td>${product.category?.name || 'N/A'}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${product.stock || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1" onclick="showProductModal('${product._id || product.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="showDeleteConfirmation('product', '${product._id || product.id}', '${product.name}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nessun prodotto disponibile</td></tr>';
        }
        
        // Carica categorie per il form
        loadProductCategories();
    } catch (error) {
        handleApiError(error, 'productsTable');
    }
}

// Carica categorie per select del form prodotto
async function loadProductCategories() {
    try {
        const response = await fetchWithAuth('/api/categories');
        const categories = await response.json();
        
        const selectElement = document.getElementById('productCategory');
        
        if (response.ok && categories && categories.length > 0) {
            const options = categories.map(cat => 
                `<option value="${cat._id || cat.id}">${cat.name}</option>`
            ).join('');
            
            selectElement.innerHTML = '<option value="">Seleziona categoria</option>' + options;
        }
    } catch (error) {
        console.error('Errore caricamento categorie:', error);
    }
}

// Mostra modal per aggiungere/modificare prodotto
async function showProductModal(productId = null) {
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    const form = document.getElementById('productForm');
    
    // Resetta form
    form.reset();
    document.getElementById('productId').value = '';
    
    // Modifica titolo in base all'operazione
    const modalTitle = document.getElementById('productModalTitle');
    
    if (productId) {
        modalTitle.textContent = 'Modifica Prodotto';
        
        try {
            const response = await fetchWithAuth(`/api/products/${productId}`);
            const product = await response.json();
            
            if (response.ok && product) {
                // Popola form con dati prodotto
                document.getElementById('productId').value = productId;
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productPrice').value = product.price || '';
                document.getElementById('productStock').value = product.stock || 0;
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productImage').value = product.image || '';
                
                // Seleziona categoria
                if (product.category) {
                    document.getElementById('productCategory').value = 
                        product.category._id || product.category.id || product.categoryId || '';
                }
            }
        } catch (error) {
            console.error('Errore caricamento prodotto:', error);
        }
    } else {
        modalTitle.textContent = 'Nuovo Prodotto';
    }
    
    modal.show();
}

// Salva prodotto (nuovo o esistente)
async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const isNewProduct = !productId;
    
    // Raccogli dati dal form
    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').value,
        categoryId: document.getElementById('productCategory').value
    };
    
    try {
        const url = isNewProduct ? '/api/admin/products' : `/api/admin/products/${productId}`;
        const method = isNewProduct ? 'POST' : 'PUT';
        
        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante il salvataggio');
        }
        
        // Chiudi modal e aggiorna lista
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        loadProducts();
        
    } catch (error) {
        console.error('Errore salvataggio prodotto:', error);
        alert(`Errore: ${error.message}`);
    }
}

// ------------ CATEGORIE ------------

// Carica lista categorie
async function loadCategories() {
    try {
        const response = await fetchWithAuth('/api/admin/categories');
        const categories = await response.json();
        
        const tableBody = document.querySelector('#categoriesTable tbody');
        
        if (response.ok && categories && categories.length > 0) {
            tableBody.innerHTML = categories.map(category => `
                <tr>
                    <td>${category.name}</td>
                    <td>${category.slug}</td>
                    <td>${category.description || '-'}</td>
                    <td>${category.productCount || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1" onclick="showCategoryModal('${category._id || category.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="showDeleteConfirmation('category', '${category._id || category.id}', '${category.name}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nessuna categoria disponibile</td></tr>';
        }
    } catch (error) {
        handleApiError(error, 'categoriesTable');
    }
}

// Mostra modal per aggiungere/modificare categoria
async function showCategoryModal(categoryId = null) {
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    const form = document.getElementById('categoryForm');
    
    // Resetta form
    form.reset();
    document.getElementById('categoryId').value = '';
    
    // Modifica titolo in base all'operazione
    const modalTitle = document.getElementById('categoryModalTitle');
    
    if (categoryId) {
        modalTitle.textContent = 'Modifica Categoria';
        
        try {
            const response = await fetchWithAuth(`/api/categories/${categoryId}`);
            const category = await response.json();
            
            if (response.ok && category) {
                // Popola form con dati categoria
                document.getElementById('categoryId').value = categoryId;
                document.getElementById('categoryName').value = category.name || '';
                document.getElementById('categorySlug').value = category.slug || '';
                document.getElementById('categoryDescription').value = category.description || '';
            }
        } catch (error) {
            console.error('Errore caricamento categoria:', error);
        }
    } else {
        modalTitle.textContent = 'Nuova Categoria';
    }
    
    // Aggiungi evento per generare slug dal nome
    document.getElementById('categoryName').addEventListener('input', function() {
        if (!document.getElementById('categoryId').value) {
            document.getElementById('categorySlug').value = this.value
                .toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .replace(/\s+/g, '-');
        }
    });
    
    modal.show();
}

// Salva categoria (nuova o esistente)
async function saveCategory() {
    const categoryId = document.getElementById('categoryId').value;
    const isNewCategory = !categoryId;
    
    // Raccogli dati dal form
    const categoryData = {
        name: document.getElementById('categoryName').value,
        slug: document.getElementById('categorySlug').value,
        description: document.getElementById('categoryDescription').value
    };
    
    try {
        const url = isNewCategory ? '/api/admin/categories' : `/api/admin/categories/${categoryId}`;
        const method = isNewCategory ? 'POST' : 'PUT';
        
        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(categoryData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante il salvataggio');
        }
        
        // Chiudi modal e aggiorna lista
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        loadCategories();
        
    } catch (error) {
        console.error('Errore salvataggio categoria:', error);
        alert(`Errore: ${error.message}`);
    }
}

// ------------ ORDINI ------------

// Carica lista ordini
async function loadOrders() {
    try {
        const response = await fetchWithAuth('/api/admin/orders');
        const orders = await response.json();
        
        const tableBody = document.querySelector('#ordersTable tbody');
        
        if (response.ok && orders && orders.length > 0) {
            tableBody.innerHTML = orders.map(order => `
                <tr>
                    <td>${order._id || order.id}</td>
                    <td>${order.userInfo?.email || 'Cliente ospite'}</td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>${formatCurrency(order.total)}</td>
                    <td><span class="badge bg-${getStatusBadgeColor(order.status)}">${translateStatus(order.status)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info me-1" onclick="showOrderDetail('${order._id || order.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="showDeleteConfirmation('order', '${order._id || order.id}', 'Ordine #${order._id || order.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nessun ordine disponibile</td></tr>';
        }
    } catch (error) {
        handleApiError(error, 'ordersTable');
    }
}

// Mostra dettaglio ordine
async function showOrderDetail(orderId) {
    const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    
    try {
        const response = await fetchWithAuth(`/api/admin/orders/${orderId}`);
        const order = await response.json();
        
        if (response.ok && order) {
            // Imposta ID ordine nel titolo
            document.getElementById('orderDetailId').textContent = orderId;
            
            // Informazioni cliente
            document.getElementById('orderCustomerName').textContent = 
                `${order.userInfo?.firstName || ''} ${order.userInfo?.lastName || ''}`.trim() || 'N/A';
            document.getElementById('orderCustomerEmail').textContent = order.userInfo?.email || 'N/A';
            document.getElementById('orderCustomerPhone').textContent = order.shippingInfo?.phone || 'N/A';
            
            // Informazioni spedizione
            document.getElementById('orderShippingAddress').textContent = order.shippingInfo?.address || 'N/A';
            document.getElementById('orderShippingCity').textContent = order.shippingInfo?.city || 'N/A';
            document.getElementById('orderShippingZip').textContent = order.shippingInfo?.postalCode || 'N/A';
            
            // Stato ordine
            document.getElementById('orderStatus').value = order.status || 'pending';
            
            // Prodotti nell'ordine
            const itemsTableBody = document.querySelector('#orderItemsTable tbody');
            if (order.items && order.items.length > 0) {
                itemsTableBody.innerHTML = order.items.map(item => `
                    <tr>
                        <td>${item.product?.name || item.productName || 'Prodotto non disponibile'}</td>
                        <td>${formatCurrency(item.price)}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                `).join('');
            } else {
                itemsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nessun prodotto nell\'ordine</td></tr>';
            }
            
            // Totali
            document.getElementById('orderSubtotal').textContent = 
                (order.subtotal || order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0).toFixed(2);
            document.getElementById('orderShipping').textContent = (order.shipping || 0).toFixed(2);
            document.getElementById('orderTotal').textContent = (order.total || 0).toFixed(2);
            
            // Salva ID ordine per aggiornamento stato
            document.getElementById('updateOrderStatusBtn').setAttribute('data-order-id', orderId);
            
            modal.show();
        }
    } catch (error) {
        console.error('Errore caricamento dettaglio ordine:', error);
        alert(`Errore: ${error.message || 'Impossibile caricare i dettagli dell\'ordine'}`);
    }
}

// Aggiorna stato ordine
async function updateOrderStatus() {
    const orderId = document.getElementById('updateOrderStatusBtn').getAttribute('data-order-id');
    const newStatus = document.getElementById('orderStatus').value;
    
    if (!orderId) {
        alert('ID ordine non valido');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante l\'aggiornamento');
        }
        
        // Chiudi modal e aggiorna lista
        bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();
        loadOrders();
        
    } catch (error) {
        console.error('Errore aggiornamento stato ordine:', error);
        alert(`Errore: ${error.message}`);
    }
}

// ------------ UTENTI ------------

// Carica lista utenti
async function loadUsers() {
    try {
        const response = await fetchWithAuth('/api/admin/users');
        const users = await response.json();
        
        const tableBody = document.querySelector('#usersTable tbody');
        
        if (response.ok && users && users.length > 0) {
            tableBody.innerHTML = users.map(user => `
                <tr>
                    <td>${user._id || user.id}</td>
                    <td>${user.firstName || ''} ${user.lastName || ''}</td>
                    <td>${user.email}</td>
                    <td><span class="badge bg-${user.role === 'admin' ? 'danger' : 'primary'}">${user.role === 'admin' ? 'Amministratore' : 'Utente'}</span></td>
                    <td>${formatDate(user.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1" onclick="showUserModal('${user._id || user.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="showDeleteConfirmation('user', '${user._id || user.id}', '${user.email}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nessun utente disponibile</td></tr>';
        }
    } catch (error) {
        handleApiError(error, 'usersTable');
    }
}

// Mostra modal per modificare utente
async function showUserModal(userId) {
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    const form = document.getElementById('userForm');
    
    // Resetta form
    form.reset();
    document.getElementById('userId').value = '';
    
    try {
        const response = await fetchWithAuth(`/api/admin/users/${userId}`);
        const user = await response.json();
        
        if (response.ok && user) {
            // Popola form con dati utente
            document.getElementById('userId').value = userId;
            document.getElementById('userFirstName').value = user.firstName || '';
            document.getElementById('userLastName').value = user.lastName || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userRole').value = user.role || 'user';
            
            modal.show();
        }
    } catch (error) {
        console.error('Errore caricamento utente:', error);
        alert(`Errore: ${error.message || 'Impossibile caricare i dati dell\'utente'}`);
    }
}

// Salva utente (modifica)
async function saveUser() {
    const userId = document.getElementById('userId').value;
    
    if (!userId) {
        alert('ID utente non valido');
        return;
    }
    
    // Raccogli dati dal form
    const userData = {
        firstName: document.getElementById('userFirstName').value,
        lastName: document.getElementById('userLastName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value
    };
    
    try {
        const response = await fetchWithAuth(`/api/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante il salvataggio');
        }
        
        // Chiudi modal e aggiorna lista
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        loadUsers();
        
    } catch (error) {
        console.error('Errore salvataggio utente:', error);
        alert(`Errore: ${error.message}`);
    }
}

// ------------ ELIMINAZIONE ELEMENTI ------------

// Variabili per eliminazione
let deleteType = null;
let deleteId = null;

// Mostra conferma eliminazione
function showDeleteConfirmation(type, id, name) {
    deleteType = type;
    deleteId = id;
    
    document.getElementById('deleteItemName').textContent = name;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}

// Conferma eliminazione elemento
async function confirmDelete() {
    if (!deleteType || !deleteId) {
        alert('Dati per eliminazione non validi');
        return;
    }
    
    let endpoint = '';
    
    // Determina endpoint in base al tipo
    switch(deleteType) {
        case 'product':
            endpoint = `/api/admin/products/${deleteId}`;
            break;
        case 'category':
            endpoint = `/api/admin/categories/${deleteId}`;
            break;
        case 'order':
            endpoint = `/api/admin/orders/${deleteId}`;
            break;
        case 'user':
            endpoint = `/api/admin/users/${deleteId}`;
            break;
        default:
            alert('Tipo di elemento non supportato');
            return;
    }
    
    try {
        const response = await fetchWithAuth(endpoint, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante l\'eliminazione');
        }
        
        // Chiudi modal e aggiorna lista corrispondente
        bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
        
        switch(deleteType) {
            case 'product':
                loadProducts();
                break;
            case 'category':
                loadCategories();
                break;
            case 'order':
                loadOrders();
                break;
            case 'user':
                loadUsers();
                break;
        }
        
    } catch (error) {
        console.error('Errore eliminazione:', error);
        alert(`Errore: ${error.message}`);
    } finally {
        // Resetta variabili
        deleteType = null;
        deleteId = null;
    }
} 