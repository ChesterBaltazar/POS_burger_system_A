let currentReportData = null;
let currentChart = null;
let currentMonth = '';
let dashboardPollInterval = null;
let stockRequestPollInterval = null;

const role = localStorage.getItem("role");
if (role === "user") {
    window.location.href = "/Dashboard/user-dashboard";
}

function updateDate() {
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { 
        weekday:'long', 
        year:'numeric', 
        month:'long', 
        day:'numeric' 
    });
}
updateDate();

function formatCurrency(amount) {
    return '₱' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    
    let icon = '';
    switch(type) {
        case 'success': icon = '✓'; break;
        case 'error': icon = '✗'; break;
        case 'warning': icon = '⚠'; break;
        default: icon = 'ℹ';
    }
    
    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Helper function to escape HTML for security
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to get product name - UPDATED FOR YOUR STRUCTURE
function getProductName(request) {
    // Check direct properties first
    if (request.productName) return request.productName;
    if (request.name) return request.name;
    if (request.product) return request.product;
    
    // Check if product is an object
    if (request.product && typeof request.product === 'object') {
        if (request.product.name) return request.product.name;
        if (request.product.productName) return request.product.productName;
    }
    
    // Check category field (since your object only has category)
    if (request.category) {
        // Try to make it more readable - remove extra words if present
        let category = request.category;
        // Common patterns to clean up
        category = category.replace(/Category:/gi, '');
        category = category.replace(/Type:/gi, '');
        category = category.trim();
        return category || 'Product';
    }
    
    // Check item details
    if (request.itemDetails && request.itemDetails.productName) {
        return request.itemDetails.productName;
    }
    
    // Final fallback
    return 'Product';
}

// Helper function to get category - UPDATED FOR YOUR STRUCTURE
function getCategory(request) {
    if (request.category) {
        let category = request.category;
        // Clean up category name
        category = category.replace(/Category:/gi, '');
        category = category.replace(/Type:/gi, '');
        category = category.trim();
        return category || 'General';
    }
    
    // Check if product is an object with category
    if (request.product && typeof request.product === 'object' && request.product.category) {
        return request.product.category;
    }
    
    return 'Uncategorized';
}

// Helper function to get requester name - UPDATED FOR YOUR STRUCTURE
function getRequesterName(request) {
    // Check direct string properties
    if (request.requestedBy) return request.requestedBy;
    if (request.requestedByUser) return request.requestedByUser;
    if (request.requester) return request.requester;
    if (request.userName) return request.userName;
    
    // Check if requestedBy is an object
    if (request.requestedBy && typeof request.requestedBy === 'object') {
        if (request.requestedBy.name) return request.requestedBy.name;
        if (request.requestedBy.username) return request.requestedBy.username;
        if (request.requestedBy.email) return request.requestedBy.email;
        return 'User';
    }
    
    // Check user reference
    if (request.user && typeof request.user === 'object') {
        return request.user.name || request.user.username || request.user.email || 'User';
    }
    if (request.user && typeof request.user === 'string') return request.user;
    
    // Check createdBy
    if (request.createdBy) return request.createdBy;
    
    // For debugging
    console.warn('Requester name not found, using fallback:', request);
    
    return 'Staff Member';
}

// Helper function to get request ID
function getRequestId(request) {
    return request._id || request.id || request.requestId || '';
}

// Helper function for toast background color based on urgency
function getUrgencyBackground(urgency) {
    switch(urgency) {
        case 'critical': return 'linear-gradient(135deg, #dc3545, #c82333)';
        case 'high': return 'linear-gradient(135deg, #fd7e14, #e8590c)';
        case 'medium': return 'linear-gradient(135deg, #ffc107, #e0a800)';
        case 'low': return 'linear-gradient(135deg, #28a745, #1e7e34)';
        default: return 'linear-gradient(135deg, #6c757d, #495057)';
    }
}

function showStockRequestToast(request) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 350px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Get data with fallbacks
    const requesterName = getRequesterName(request);
    const productName = getProductName(request);
    const category = getCategory(request);
    const urgencyLevel = request.urgencyLevel || 'medium';
    const requestId = getRequestId(request);
    
    const toast = document.createElement('div');
    toast.className = `stock-toast ${urgencyLevel}`;
    toast.style.cssText = `
        background: ${getUrgencyBackground(urgencyLevel)};
        color: white;
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        cursor: pointer;
    `;
    
    // Add click handler to navigate to stock requests
    toast.onclick = function() {
        window.location.href = '/Dashboard/Admin-dashboard/Inventory/Stock-requests';
    };
    
    toast.innerHTML = `
        <span class="toast-icon" style="margin-right: 10px; font-size: 1.2rem;">📦</span>
        <div class="toast-content" style="flex: 1;">
            <div class="toast-title" style="font-weight: bold; margin-bottom: 4px;">New Stock Request</div>
            <div class="toast-message" style="font-size: 0.9rem;">
                ${escapeHtml(productName)} - ${escapeHtml(requesterName)}
            </div>
        </div>
        <button class="close-toast" onclick="event.stopPropagation(); this.parentElement.remove()" 
                style="background: none; border: none; color: white; font-size: 1.2rem; 
                       cursor: pointer; margin-left: 10px; padding: 0; width: 20px; height: 20px;
                       display: flex; align-items: center; justify-content: center;">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 10);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 8000);
    
    playNotificationSound();
    updateStockRequestBadge();
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('Audio not supported');
    }
}

async function updateStockRequestBadge() {
    try {
        const response = await fetch('/api/stock-requests/pending-count');
        if (!response.ok) return;
        
        const result = await response.json();
        if (result.success && result.count > 0) {
            const badge = document.getElementById('inventoryNotificationBadge');
            if (badge) {
                badge.textContent = result.count;
                badge.style.display = 'inline-block';
            }
            
            const panelBadge = document.getElementById('pendingCountBadge');
            if (panelBadge) {
                panelBadge.textContent = result.count;
                panelBadge.style.display = 'inline-block';
            }
        } else {
            const badge = document.getElementById('inventoryNotificationBadge');
            if (badge) badge.style.display = 'none';
            
            const panelBadge = document.getElementById('pendingCountBadge');
            if (panelBadge) panelBadge.style.display = 'none';
        }
    } catch (error) {
        console.log('Error updating badge:', error.message);
    }
}

async function loadPendingStockRequests() {
    try {
        console.log('Fetching stock requests from /api/stock-requests...');
        const response = await fetch('/api/stock-requests');
        if (!response.ok) {
            throw new Error(`Failed to load requests: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Stock requests API response:', result);
        
        const requests = result.requests || result.data || [];
        
        // Debug: Log request structure
        if (requests.length > 0) {
            console.log('Sample request structure:', requests[0]);
            console.log('Available fields in request:', Object.keys(requests[0]));
        }
        
        const pendingRequests = requests.filter(req => req.status === 'pending');
        console.log(`Found ${pendingRequests.length} pending requests`);
        
        const container = document.getElementById('stockRequestsContainer');
        if (!container) {
            console.error('Container not found: #stockRequestsContainer');
            return;
        }
        
        if (pendingRequests.length === 0) {
            container.innerHTML = '<div class="no-requests">No stock requests</div>';
            const panelBadge = document.getElementById('pendingCountBadge');
            if (panelBadge) panelBadge.style.display = 'none';
            return;
        }
        
        // Sort by urgency
        pendingRequests.sort((a, b) => {
            const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const aUrgency = urgencyOrder[a.urgencyLevel || 'medium'];
            const bUrgency = urgencyOrder[b.urgencyLevel || 'medium'];
            return aUrgency - bUrgency;
        });
        
        const displayRequests = pendingRequests.slice(0, 3);
        
        container.innerHTML = displayRequests.map(request => {
            // Get data with proper fallbacks
            const requesterName = getRequesterName(request);
            const productName = getProductName(request);
            const requestId = getRequestId(request);
            
            // Format date safely
            let formattedDate = 'N/A';
            try {
                const dateStr = request.createdAt || request.date || request.requestDate;
                const date = dateStr ? new Date(dateStr) : new Date();
                formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                console.error('Date formatting error:', error);
            }
            
            return `
                <div class="stock-request-item">
                    <div class="request-info">
                        <div class="request-details">
                            <h5>${escapeHtml(productName)}</h5>
                            <p>
                                <strong>Requested by:</strong> ${escapeHtml(requesterName)} |
                                <strong>Date:</strong> ${formattedDate}
                            </p>
                            <p><strong>Urgency:</strong> 
                                <span style="color: ${getUrgencyColor(request.urgencyLevel)}">
                                    ${(request.urgencyLevel || 'medium').toUpperCase()}
                                </span>
                            </p>
                        </div>
                        <div class="request-actions">
                            <button class="btn-approve" onclick="approveRequest('${requestId}', '${escapeHtml(productName)}')">
                                Approve
                            </button>
                            <button class="btn-reject" onclick="rejectRequest('${requestId}', '${escapeHtml(productName)}')">
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update badge count
        const panelBadge = document.getElementById('pendingCountBadge');
        if (panelBadge) {
            panelBadge.textContent = pendingRequests.length;
            panelBadge.style.display = pendingRequests.length > 0 ? 'inline-block' : 'none';
        }
        
    } catch (error) {
        console.error('Error loading stock requests:', error);
        const container = document.getElementById('stockRequestsContainer');
        if (container) {
            container.innerHTML = '<div class="no-requests">Error loading requests. Please check console.</div>';
        }
    }
}

function getUrgencyColor(urgency) {
    switch(urgency) {
        case 'critical': return '#dc3545';
        case 'high': return '#fd7e14';
        case 'medium': return '#ffc107';
        case 'low': return '#28a745';
        default: return '#6c757d';
    }
}

async function approveRequest(requestId, productName) {
    if (!requestId) {
        showNotification('Error: Request ID is missing', 'error');
        return;
    }
    
    const safeProductName = escapeHtml(productName);
    if (!confirm(`Approve stock request for "${safeProductName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/stock-requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'approved' })
        });
        
        if (response.ok) {
            showNotification(`Request for "${safeProductName}" approved`, 'success');
            loadPendingStockRequests();
            updateStockRequestBadge();
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to approve request: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error approving request:', error);
        showNotification('Error approving request', 'error');
    }
}

async function rejectRequest(requestId, productName) {
    if (!requestId) {
        showNotification('Error: Request ID is missing', 'error');
        return;
    }
    
    const safeProductName = escapeHtml(productName);
    if (!confirm(`Reject stock request for "${safeProductName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/stock-requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'rejected' })
        });
        
        if (response.ok) {
            showNotification(`Request for "${safeProductName}" rejected`, 'success');
            loadPendingStockRequests();
            updateStockRequestBadge();
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to reject request: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        showNotification('Error rejecting request', 'error');
    }
}

function startStockRequestPolling() {
    loadPendingStockRequests();
    updateStockRequestBadge();
    
    if (stockRequestPollInterval) {
        clearInterval(stockRequestPollInterval);
    }
    
    stockRequestPollInterval = setInterval(() => {
        loadPendingStockRequests();
        updateStockRequestBadge();
    }, 30000);
}

// ================= DASHBOARD FUNCTIONS =================

function updateDashboard(data) {
    // Update total sales
    const totalSalesEl = document.getElementById('totalSales');
    if (totalSalesEl) {
        const newSalesValue = formatCurrency(data.totalSales || 0);
        if (totalSalesEl.textContent !== newSalesValue) {
            totalSalesEl.textContent = newSalesValue;
            totalSalesEl.classList.add('updated');
            setTimeout(() => totalSalesEl.classList.remove('updated'), 600);
        }
    }

    // Update net profit
    const netProfitEl = document.getElementById('netProfit');
    if (netProfitEl) {
        const newProfitValue = formatCurrency(data.netProfit || 0);
        if (netProfitEl.textContent !== newProfitValue) {
            netProfitEl.textContent = newProfitValue;
            netProfitEl.classList.add('updated');
            setTimeout(() => netProfitEl.classList.remove('updated'), 600);
        }
    }

    // Update orders today
    const ordersTodayEl = document.getElementById('ordersToday');
    if (ordersTodayEl) {
        const newOrdersValue = String(data.ordersToday ?? 0);
        if (ordersTodayEl.textContent !== newOrdersValue) {
            ordersTodayEl.textContent = newOrdersValue;
            ordersTodayEl.classList.add('updated');
            setTimeout(() => ordersTodayEl.classList.remove('updated'), 600);
        }
    }

    // Update total customers
    const totalCustomersEl = document.getElementById('totalCustomers');
    if (totalCustomersEl) {
        const newCustomersValue = String(data.totalCustomers ?? 0);
        if (totalCustomersEl.textContent !== newCustomersValue) {
            totalCustomersEl.textContent = newCustomersValue;
            totalCustomersEl.classList.add('updated');
            setTimeout(() => totalCustomersEl.classList.remove('updated'), 600);
        }
    }

    // Update recent sales
    const salesItems = document.querySelectorAll('#recentSalesContainer .sales-item');
    if (salesItems.length > 0) {
        salesItems.forEach((item, i) => {
            const sale = data.recentSales?.[i];
            if (sale) {
                item.style.display = "flex";
                item.querySelector('h4').textContent = sale.orderNumber || "N/A";
                item.querySelector('p').textContent = sale.customerName || "Walk-in";
                item.querySelector('.order-time').textContent = new Date(sale.createdAt).toLocaleTimeString([], {
                    hour:'2-digit',
                    minute:'2-digit',
                    hour12:true
                });
                item.querySelector('.order-amount').textContent = formatCurrency(sale.totalAmount || 0);
                const statusEl = item.querySelector('.order-status');
                statusEl.textContent = sale.status ?? "completed";
                statusEl.className = `order-status status-${sale.status ?? "completed"}`;
            } else {
                item.style.display = "none";
            }
        });
    }

    // Update low stock alerts
    const lowStockContainer = document.getElementById('lowStockContainer');
    if (lowStockContainer) {
        let alerts = data.lowStockAlerts || [];
        refreshLowStockAlerts(alerts);
    }
}

// Function to fetch low stock alerts separately
async function fetchLowStockAlerts() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.success && Array.isArray(result.data?.lowStockAlerts)) {
            refreshLowStockAlerts(result.data.lowStockAlerts);
            
            const badge = document.getElementById('lowStockCount');
            if (badge) {
                badge.textContent = result.data.lowStockAlerts.length;
                if (result.data.lowStockAlerts.length === 0) {
                    badge.className = 'badge bg-success';
                } else {
                    const hasOutOfStock = result.data.lowStockAlerts.some(alert => {
                        const stock = getStockValue(alert);
                        return stock <= 0;
                    });
                    badge.className = hasOutOfStock ? 'badge bg-danger' : 'badge bg-warning';
                }
            }
            return true;
        } else {
            console.warn('Invalid response format:', result);
            refreshLowStockAlerts([]);
            return false;
        }
    } catch (error) {
        console.error('Error fetching low stock alerts:', error.message);
        refreshLowStockAlerts([]);
        return false;
    }
}

// Helper function to get stock value from different possible field names
function getStockValue(alert) {
    return alert.currentStock || alert.stock || alert.quantity || alert.available || 0;
}

// Helper function to get minimum stock value
function getMinStockValue(alert) {
    return alert.minStock || alert.minimumStock || alert.minimum || 5;
}

// Function to refresh low stock alerts display
function refreshLowStockAlerts(alerts) {
    const lowStockContainer = document.getElementById('lowStockContainer');
    if (!lowStockContainer) return;
    
    lowStockContainer.innerHTML = '';
    
    if (!alerts || alerts.length === 0) {
        lowStockContainer.innerHTML = '<div class="no-alerts">No Alerts Available</div>';
        return;
    }
    
    // Sort alerts by severity
    alerts.sort((a, b) => {
        const stockA = getStockValue(a);
        const stockB = getStockValue(b);
        const minA = getMinStockValue(a);
        const minB = getMinStockValue(b);
        
        // Out of stock items first
        if (stockA <= 0 && stockB > 0) return -1;
        if (stockA > 0 && stockB <= 0) return 1;
        
        // Then sort by stock ratio (most critical first)
        const ratioA = stockA / minA;
        const ratioB = stockB / minB;
        return ratioA - ratioB;
    });
    
    const displayAlerts = alerts.slice(0, 5);
    
    displayAlerts.forEach(alert => {
        const productName = alert.name || alert.productName || alert.product || 'Unknown Product';
        const currentStock = getStockValue(alert);
        const minStock = getMinStockValue(alert);
        const category = alert.category || alert.type || 'N/A';
        const productId = alert._id || alert.id || alert.productId || '';
        
        let alertLevel, statusText, bgColor, borderColor, icon, iconClass;
        
        if (currentStock <= 0) {
            alertLevel = 'danger';
            statusText = 'OUT OF STOCK';
            bgColor = '#f8d7da';
            borderColor = '#dc3545';
            icon = 'bi-x-circle-fill';
            iconClass = 'text-danger';
        } else if (currentStock < minStock) {
            alertLevel = 'warning';
            statusText = `Low Stock: ${currentStock} left`;
            bgColor = '#fff3cd';
            borderColor = '#ffc107';
            icon = 'bi-exclamation-triangle-fill';
            iconClass = 'text-warning';
        } else if (currentStock < minStock * 2) {
            alertLevel = 'info';
            statusText = `Running Low: ${currentStock} left`;
            bgColor = '#d1ecf1';
            borderColor = '#17a2b8';
            icon = 'bi-info-circle-fill';
            iconClass = 'text-info';
        } else {
            return; // Skip items that aren't low stock
        }
        
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 12px;
            background-color: ${bgColor};
            border-radius: 6px;
            border-left: 4px solid ${borderColor};
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            transition: all 0.2s ease;
        `;
        
        alertItem.innerHTML = `
            <div class="alert-icon" style="margin-right: 12px; font-size: 1.3rem;">
                <i class="bi ${icon} ${iconClass}"></i>
            </div>
            <div class="alert-text" style="flex: 1;">
                <h5 style="margin: 0 0 5px 0; font-size: 0.95rem; font-weight: 600; color: ${borderColor};">
                    ${escapeHtml(productName)}
                </h5>
                <p style="margin: 0; font-size: 0.85rem; color: #666;">
                    <strong>Stock:</strong> ${currentStock} | 
                    <strong>Min Required:</strong> ${minStock} |
                    <strong>Status:</strong> <span style="color: ${borderColor}; font-weight: bold;">${statusText}</span>
                </p>
                ${category !== 'N/A' ? `<p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #888;">Category: ${escapeHtml(category)}</p>` : ''}
            </div>
            <div class="alert-actions" style="margin-left: 10px;">
                <button class="btn-restock" onclick="restockProduct('${productId}', '${escapeHtml(productName)}')" 
                        style="padding: 6px 12px; background: ${borderColor}; 
                               color: white; border: none; border-radius: 4px; 
                               font-size: 0.8rem; cursor: pointer; font-weight: 500; white-space: nowrap;">
                    Restock
                </button>
            </div>
        `;
        
        // Add hover effects
        alertItem.addEventListener('mouseenter', () => {
            alertItem.style.transform = 'translateY(-2px)';
            alertItem.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        });
        
        alertItem.addEventListener('mouseleave', () => {
            alertItem.style.transform = 'translateY(0)';
            alertItem.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        });
        
        lowStockContainer.appendChild(alertItem);
    });
    
    if (alerts.length > 5) {
        const viewMoreItem = document.createElement('div');
        viewMoreItem.className = 'alert-item';
        viewMoreItem.style.cssText = `
            text-align: center;
            padding: 10px;
            color: #6c757d;
            font-size: 0.9rem;
            cursor: pointer;
        `;
        viewMoreItem.innerHTML = `
            <i class="bi bi-chevron-down" style="margin-right: 5px;"></i>
            ${alerts.length - 5} more low stock items
        `;
        viewMoreItem.addEventListener('click', () => {
            window.location.href = '/Dashboard/Admin-dashboard/Inventory?filter=low-stock';
        });
        lowStockContainer.appendChild(viewMoreItem);
    }
}

// Function to handle restock action
function restockProduct(productId, productName) {
    if (confirm(`Restock "${escapeHtml(productName)}"? This will open the inventory management page.`)) {
        window.location.href = `/Dashboard/Admin-dashboard/Inventory?edit=${productId}&highlight=${productId}`;
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const result = await response.json();
        if (!result.success || typeof result.data !== "object") {
            throw new Error("Invalid API response format");
        }
        updateDashboard(result.data);
    } catch (err) {
        console.error("Dashboard load error:", err);
        
        const lowStockContainer = document.getElementById('lowStockContainer');
        if (lowStockContainer) {
            lowStockContainer.innerHTML = '<div class="no-alerts">Error loading stock alerts</div>';
        }
    }
}

// Function to start dashboard polling
function startDashboardPolling() {
    loadDashboardData();
    
    if (dashboardPollInterval) {
        clearInterval(dashboardPollInterval);
    }
    
    dashboardPollInterval = setInterval(loadDashboardData, 30000);
}

// ================= LOGOUT FUNCTIONALITY =================
function setupLogoutButton() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            showLogoutConfirmation();
        });
    }
}

function showLogoutConfirmation() {
    const modal = document.createElement('div');
    modal.className = 'logout-confirmation-modal';
    modal.innerHTML = `
        <div class="logout-modal-content">
            <div class="logout-modal-header">
                <h3>Confirm Logout</h3>
                <button class="close-modal">×</button>
            </div>
            <div class="logout-modal-body">
                <p>Are you sure you want to logout?</p>
            </div>
            <div class="logout-modal-footer">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm">Logout</button>
            </div>
        </div>
    `;
    
    if (!document.getElementById('logout-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-modal-styles';
        style.textContent = `
            .logout-confirmation-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                animation: fadeIn 0.3s ease;
            }
            
            .logout-modal-content {
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                width: 90%;
                max-width: 400px;
                overflow: hidden;
                animation: slideUp 0.3s ease;
            }
            
            .logout-modal-header {
                background: #f8f9fa;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #dee2e6;
            }
            
            .logout-modal-header h3 {
                margin: 0;
                font-size: 1.2rem;
                color: #333;
            }
            
            .close-modal {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #dc3545;
                line-height: 1;
            }
            
            .close-modal:hover {
                color: #a71d2a;
            }
            
            .logout-modal-body {
                padding: 30px 20px;
                text-align: center;
            }
            
            .logout-modal-body p {
                margin: 0;
                font-size: 1rem;
                color: #555;
            }
            
            .logout-modal-footer {
                padding: 15px 20px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                border-top: 1px solid #dee2e6;
                background: #f8f9fa;
            }
            
            .btn-cancel, .btn-confirm {
                padding: 8px 20px;
                border-radius: 5px;
                font-weight: 500;
                cursor: pointer;
                border: none;
                transition: all 0.2s ease;
            }
            
            .btn-cancel {
                background: #822222;
                color: white;
            }
            
            .btn-cancel:hover {
                background: #af2525;
            }
            
            .btn-confirm {
                background: #28a745;
                color: white;
            }
            
            .btn-confirm:hover {
                background: #1a732f;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { 
                    transform: translateY(20px);
                    opacity: 0;
                }
                to { 
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');
    
    const removeModal = () => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    };
    
    closeBtn.addEventListener('click', removeModal);
    cancelBtn.addEventListener('click', removeModal);
    confirmBtn.addEventListener('click', () => {
        removeModal();
        performLogout();
    });
}

async function performLogout() {
    try {
        const logoutBtn = document.querySelector('.logout-btn');
        const originalText = logoutBtn ? logoutBtn.textContent : '';
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
            logoutBtn.classList.add('loading');
        }

        showNotification('Logging out...', 'info');

        // Clear any existing notifications
        setTimeout(() => {
            const notifications = document.querySelectorAll('.notification-toast');
            notifications.forEach(notification => notification.remove());
        }, 100);

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                }
            });
        } catch (apiError) {
            console.log('Backend not available, clearing local storage only');
        }

        // Save essential data before clearing
        const posOrderCounter = localStorage.getItem('posOrderCounter');
        const themePreference = localStorage.getItem('theme');
        
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Restore necessary data
        if (posOrderCounter) {
            localStorage.setItem('posOrderCounter', posOrderCounter);
        }
        if (themePreference) {
            localStorage.setItem('theme', themePreference);
        }

        // Clear auth-related cookies
        document.cookie.split(";").forEach(function(c) {
            const cookieParts = c.split("=");
            const cookieName = cookieParts[0].trim();
            const sensitiveKeywords = ['auth', 'token', 'session', 'jwt', 'refresh'];

            if (sensitiveKeywords.some(keyword => cookieName.toLowerCase().includes(keyword))) {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });

        // Clear polling intervals
        if (dashboardPollInterval) {
            clearInterval(dashboardPollInterval);
        }
        
        if (stockRequestPollInterval) {
            clearInterval(stockRequestPollInterval);
        }

        // Show success notification with longer duration
        showNotification('Logged out successfully! Redirecting to login page...', 'success');
        
        // Wait for notification to be visible before redirecting
        setTimeout(() => {
            window.location.replace('/');
        }, 2000);

    } catch (error) {
        console.error('Logout error:', error);
        
        // Show error notification
        showNotification('Error during logout. Redirecting...', 'error');
        
        // Clear storage and redirect anyway
        const posOrderCounter = localStorage.getItem('posOrderCounter');
        localStorage.clear();
        if (posOrderCounter) {
            localStorage.setItem('posOrderCounter', posOrderCounter);
        }
        
        setTimeout(() => {
            window.location.replace('/');
        }, 1500);
    }
}

// ================= AUTH CHECK =================
function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const authToken = localStorage.getItem('authToken');
    const role = localStorage.getItem('role');
    
    if (!isAuthenticated || isAuthenticated !== 'true' || !authToken || !role || role !== 'admin') {
        window.location.replace('/');
        return false;
    }
    
    if (!localStorage.getItem('loginTime')) {
        localStorage.setItem('loginTime', Date.now().toString());
    }
    
    return true;
}

// ================= SESSION MANAGEMENT =================
let sessionCheckInterval = null;

function startSessionTimer() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
    
    sessionCheckInterval = setInterval(() => {
        const loginTime = localStorage.getItem('loginTime');
        if (loginTime) {
            const currentTime = Date.now();
            const sessionAge = currentTime - parseInt(loginTime);
            const maxSessionAge = 8 * 60 * 60 * 1000;
            
            if (sessionAge > maxSessionAge) {
                clearInterval(sessionCheckInterval);
                showNotification('Session expired. Logging out...', 'warning');
                setTimeout(performLogout, 1000);
            } else if (sessionAge > maxSessionAge - 600000) {
                showNotification('Your session will expire in 10 minutes', 'warning');
            }
        }
    }, 300000);
}

function resetSessionTimer() {
    localStorage.setItem('loginTime', Date.now().toString());
    startSessionTimer();
}

function setupActivityDetection() {
    ['click', 'mousemove', 'keydown', 'scroll', 'touchstart', 'mousedown'].forEach(event => {
        document.addEventListener(event, resetSessionTimer, { passive: true });
    });
}

// ================= SIDEBAR TOGGLE =================
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }
            
            const icon = sidebarToggle.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('active')) {
                    icon.className = 'bi bi-x-lg';
                } else {
                    icon.className = 'bi bi-list';
                }
            }
        });
        
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                const icon = sidebarToggle.querySelector('i');
                if (icon) {
                    icon.className = 'bi bi-list';
                }
            });
        }
        
        const menuItems = sidebar.querySelectorAll('.menu-item a');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    if (sidebarOverlay) {
                        sidebarOverlay.classList.remove('active');
                    }
                    const icon = sidebarToggle.querySelector('i');
                    if (icon) {
                        icon.className = 'bi bi-list';
                    }
                }
            });
        });
    }
    
    function handleResize() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (window.innerWidth > 768) {
            if (sidebar) sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            if (sidebarToggle) {
                const icon = sidebarToggle.querySelector('i');
                if (icon) icon.className = 'bi bi-list';
            }
        }
    }
    
    handleResize();
    window.addEventListener('resize', handleResize);
}

// ================= INITIALIZATION =================
function initDashboard() {
    if (!checkAuthentication()) {
        return;
    }

    if (!localStorage.getItem('loginTime')) {
        localStorage.setItem('loginTime', Date.now().toString());
    }

    startSessionTimer();
    setupActivityDetection();
    setupLogoutButton();
    setupSidebarToggle();
    
    // Start dashboard polling
    startDashboardPolling();
    
    // Start stock request polling
    startStockRequestPolling();
}

document.addEventListener('DOMContentLoaded', initDashboard);

// Export functions that might be used elsewhere
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;
window.loadDashboardData = loadDashboardData;
window.restockProduct = restockProduct;
window.fetchLowStockAlerts = fetchLowStockAlerts;
window.startDashboardPolling = startDashboardPolling;
window.startStockRequestPolling = startStockRequestPolling;
window.loadPendingStockRequests = loadPendingStockRequests;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;