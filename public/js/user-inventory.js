    // ==================== INVENTORY PAGE SCRIPT - FULLY FIXED ====================

// Get threshold from data attribute or use default
let LOW_STOCK_THRESHOLD = 5; // Default threshold, will be updated from DOM if different

// Function to get the current threshold (ensures we always have the latest value)
function getCurrentThreshold() {
    const thresholdElement = document.getElementById('lowStockThreshold');
    if (thresholdElement) {
        return parseInt(thresholdElement.value) || 5;
    }
    return LOW_STOCK_THRESHOLD; // fallback to the variable if element not found
}

// Function to update stats boxes based on current table data
function updateStatsBoxes() {
    const tableBody = document.getElementById('itemsTable');
    if (!tableBody) return;
    
    const currentThreshold = getCurrentThreshold(); // Get latest threshold
    
    const rows = tableBody.querySelectorAll('tr');
    let totalProducts = 0;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    
    rows.forEach(row => {
        // Skip placeholder rows
        if (row.querySelector('td[colspan]')) return;
        if (row.cells.length < 4) return;
        
        const quantityCell = row.cells[2];
        if (!quantityCell) return;
        
        const quantityText = quantityCell.textContent.trim();
        const quantity = parseInt(quantityText);
        
        if (!isNaN(quantity)) {
            totalProducts++;
            
            if (quantity === 0) {
                outOfStock++;
            } else if (quantity > 0 && quantity <= currentThreshold) { // Use currentThreshold
                lowStock++;
            } else if (quantity > currentThreshold) { // Use currentThreshold
                inStock++;
            }
        }
    });
    
    // Update all stats boxes
    // --- Total Products ---
    const totalProductsElement = document.getElementById('totalProducts');
    if (totalProductsElement) {
        animateValue(totalProductsElement, parseInt(totalProductsElement.textContent) || 0, totalProducts, 500);
    }
    
    // --- In Stock --- (ID: inStockCount)
    const inStockElement = document.getElementById('inStockCount');
    if (inStockElement) {
        animateValue(inStockElement, parseInt(inStockElement.textContent) || 0, inStock, 500);
    }
    
    // --- Low Stock --- (ID: lowStockCount)
    const lowStockElement = document.getElementById('lowStockCount');
    if (lowStockElement) {
        animateValue(lowStockElement, parseInt(lowStockElement.textContent) || 0, lowStock, 500);
        
        if (lowStock > 0) {
            lowStockElement.style.color = '#ff9800';
            lowStockElement.style.fontWeight = 'bold';
            lowStockElement.parentElement.style.backgroundColor = '#fff3e0';
        } else {
            lowStockElement.style.color = '#ffc107';
            lowStockElement.style.fontWeight = '';
            lowStockElement.parentElement.style.backgroundColor = '';
        }
    }
    
    // --- Out of Stock --- (ID: outOfStockCount)
    const outOfStockElement = document.getElementById('outOfStockCount');
    if (outOfStockElement) {
        animateValue(outOfStockElement, parseInt(outOfStockElement.textContent) || 0, outOfStock, 500);
        
        if (outOfStock > 0) {
            outOfStockElement.style.color = '#dc3545';
            outOfStockElement.style.fontWeight = 'bold';
            outOfStockElement.parentElement.style.backgroundColor = '#f8d7da';
        } else {
            outOfStockElement.style.color = '#dc3545';
            outOfStockElement.style.fontWeight = '';
            outOfStockElement.parentElement.style.backgroundColor = '';
        }
    }
    
    console.log('Stats updated with threshold', currentThreshold, ':', { totalProducts, inStock, lowStock, outOfStock });
    return { totalProducts, inStock, lowStock, outOfStock };
}

// Animate number changes
function animateValue(element, start, end, duration) {
    if (start === end) return;
    
    const range = end - start;
    const increment = range / (duration / 10);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            clearInterval(timer);
            element.textContent = end;
        } else {
            element.textContent = Math.round(current);
        }
    }, 10);
}

// Function to check low stock items and update UI
function checkLowStock() {
    const tableBody = document.getElementById('itemsTable');
    if (!tableBody) return;
    
    const currentThreshold = getCurrentThreshold(); // Get latest threshold
    
    const rows = tableBody.querySelectorAll('tr');
    let lowStockCount = 0;
    
    rows.forEach(row => {
        // Skip placeholder rows
        if (row.querySelector('td[colspan]')) return;
        if (row.cells.length < 4) return;
        
        const quantityCell = row.cells[2];
        if (!quantityCell) return;
        
        const quantityText = quantityCell.textContent.trim();
        const quantity = parseInt(quantityText);
        
        // Remove existing warning classes and icons first
        row.classList.remove('low-stock-warning', 'out-of-stock-warning');
        
        const existingWarningIcon = row.querySelector('.stock-warning-icon');
        if (existingWarningIcon) existingWarningIcon.remove();
        
        const existingBadge = row.querySelector('.stock-badge');
        if (existingBadge) existingBadge.remove();
        
        // Check stock status
        if (!isNaN(quantity)) {
            if (quantity === 0) {
                row.classList.add('out-of-stock-warning');
                
                const outOfStockBadge = document.createElement('span');
                outOfStockBadge.className = 'stock-badge out-of-stock-badge';
                outOfStockBadge.textContent = 'Out of Stock';
                outOfStockBadge.style.cssText = `
                    background: #dc3545;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                    margin-left: 8px;
                    display: inline-block;
                `;
                row.cells[0].appendChild(outOfStockBadge);
                
            } else if (quantity > 0 && quantity <= currentThreshold) { // Use currentThreshold
                lowStockCount++;
                row.classList.add('low-stock-warning');
                
                // Warning icon on quantity cell
                const warningIcon = document.createElement('span');
                warningIcon.className = 'stock-warning-icon';
                warningIcon.innerHTML = '⚠️';
                warningIcon.title = `Low stock! Only ${quantity} remaining (Threshold: ${currentThreshold})`; // Update title
                warningIcon.style.cssText = `
                    margin-left: 8px;
                    font-size: 14px;
                    cursor: help;
                    display: inline-block;
                    animation: pulse 1.5s infinite;
                `;
                quantityCell.appendChild(warningIcon);
                
                // Low stock badge on name cell
                const lowStockBadge = document.createElement('span');
                lowStockBadge.className = 'stock-badge low-stock-badge';
                lowStockBadge.textContent = 'Low Stock';
                lowStockBadge.style.cssText = `
                    background: #ff9800;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                    margin-left: 8px;
                    display: inline-block;
                `;
                row.cells[0].appendChild(lowStockBadge);
            }
        }
    });
    
    // Always update stats boxes after checking
    updateStatsBoxes();
    
    // Show notification if there are low stock items (but not too frequently)
    if (lowStockCount > 0 && !sessionStorage.getItem('lowStockNotified')) {
        showNotification(`${lowStockCount} item(s) are low on stock (threshold: ${currentThreshold})`, 'warning');
        sessionStorage.setItem('lowStockNotified', 'true');
        
        setTimeout(() => {
            sessionStorage.removeItem('lowStockNotified');
        }, 300000);
    }
    
    return lowStockCount;
}

// Search Functionality
function searchItems() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const tableBody = document.getElementById('itemsTable');
    
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        if (row.querySelector('td[colspan]')) {
            row.style.display = 'none';
            return;
        }
        
        if (row.cells.length < 4) return;
        
        const itemName = row.cells[0].querySelector('.item-name')?.textContent.toLowerCase() || row.cells[0].textContent.toLowerCase();
        const itemId = row.cells[0].querySelector('small')?.textContent.toLowerCase() || '';
        const category = row.cells[1].textContent.toLowerCase();
        
        const matches = 
            itemName.includes(searchTerm) || 
            category.includes(searchTerm) || 
            itemId.includes(searchTerm);
        
        if (matches || searchTerm === '') {
            row.style.display = '';
            hasVisibleRows = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    const noResultsRow = tableBody.querySelector('.no-items-row');
    if (noResultsRow) {
        if (!hasVisibleRows && searchTerm !== '') {
            noResultsRow.style.display = '';
            noResultsRow.querySelector('td').textContent = 'No items found matching your search';
        } else {
            noResultsRow.style.display = 'none';
        }
    }
    
    setTimeout(checkLowStock, 100);
}

// Filter by Category
function filterCategory(category) {
    const dropdownButton = document.getElementById('dropdownMenuButton1');
    dropdownButton.textContent = category === 'all' ? 'All Categories' : category;
    
    const tableBody = document.getElementById('itemsTable');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        if (row.querySelector('td[colspan]')) {
            row.style.display = (category === 'all') ? '' : 'none';
            return;
        }
        
        const rowCategory = row.getAttribute('data-category');
        
        if (category === 'all' || rowCategory === category.toLowerCase()) {
            row.style.display = '';
            hasVisibleRows = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    const noResultsRow = tableBody.querySelector('.no-items-row');
    if (noResultsRow) {
        if (!hasVisibleRows && category !== 'all') {
            noResultsRow.style.display = '';
            noResultsRow.querySelector('td').textContent = `No items found in category: ${category}`;
        } else {
            noResultsRow.style.display = 'none';
        }
    }
    
    setTimeout(checkLowStock, 100);
}

// Notification Function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'temp-notification';
    
    const bgColor = type === 'error' ? '#f44336' : 
                    type === 'success' ? '#4CAF50' : 
                    type === 'warning' ? '#ff9800' : 
                    '#2196F3';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: notificationFadeInOut 2.5s ease-in-out;
        max-width: 350px;
        word-wrap: break-word;
        cursor: pointer;
    `;
    
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes notificationFadeInOut {
                0% { opacity: 0; transform: translateX(100px); }
                15% { opacity: 1; transform: translateX(0); }
                85% { opacity: 1; transform: translateX(0); }
                100% { opacity: 0; transform: translateX(100px); }
            }
            
            @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; transform: scale(1.1); }
                100% { opacity: 0.6; }
            }
            
            .temp-notification {
                animation: notificationFadeInOut 2.5s ease-in-out !important;
            }
            
            .low-stock-warning {
                background-color: rgba(255, 152, 0, 0.1) !important;
                border-left: 4px solid #ff9800 !important;
            }
            
            .low-stock-warning:hover {
                background-color: rgba(255, 152, 0, 0.15) !important;
            }
            
            .out-of-stock-warning {
                background-color: rgba(220, 53, 69, 0.1) !important;
                border-left: 4px solid #dc3545 !important;
            }
            
            .stats-box {
                transition: all 0.3s ease;
                border-radius: 8px;
                padding: 15px;
            }
            
            .stats-box:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            }
        `;
        document.head.appendChild(style);
    }
    
    document.querySelectorAll('.temp-notification').forEach(el => el.remove());
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, 2500);
    
    notification.addEventListener('click', () => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
    });
}

// ==================== LOGOUT MODAL FUNCTIONS - FIXED ====================
let logoutModal = null;

function createLogoutModal() {
    if (document.getElementById('logoutModal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'logoutModal';
    modal.innerHTML = `
        <div class="logout-modal-content">
            <div class="logout-modal-header">
                <h3>Confirm Logout</h3>
                <button class="close-modal" onclick="closeLogoutModal()">×</button>
            </div>
            <div class="logout-modal-body">
                <p>Are you sure you want to logout?</p>
            </div>
            <div class="logout-modal-footer">
                <button class="btn-cancel" onclick="closeLogoutModal()">Cancel</button>
                <button class="btn-confirm" id="confirmLogoutBtn">Logout</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    logoutModal = modal;
    
    // Add event listener to confirm button
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleLogoutFromModal);
    }
    
    if (!document.getElementById('logout-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-modal-styles';
        style.textContent = `
            #logoutModal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 99999;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            #logoutModal.open { display: flex; }
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
            .logout-modal-header h3 { margin: 0; font-size: 1.2rem; color: #333; }
            .close-modal {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #dc3545;
                line-height: 1;
                transition: color 0.2s ease;
            }
            .close-modal:hover { color: #a71d2a; }
            .logout-modal-body { padding: 30px 20px; text-align: center; }
            .logout-modal-body p { margin: 0; font-size: 1rem; color: #555; }
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
                min-width: 80px;
            }
            .btn-cancel { background: #822222; color: white; }
            .btn-cancel:hover:not(:disabled) { background: #af2525; transform: translateY(-2px); }
            .btn-confirm {
                background: #28a745;
                color: white;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .btn-confirm:hover:not(:disabled) {
                background: #1a732f;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            }
            .btn-confirm.logging-out {
                padding-left: 35px;
                background: #1a732f;
                cursor: not-allowed;
                opacity: 0.9;
            }
            .btn-confirm.logging-out::before {
                content: '';
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top-color: #fff;
                border-radius: 50%;
                animation: button-spin 0.8s linear infinite;
            }
            .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes button-spin {
                to { transform: translateY(-50%) rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function showLogoutModal() {
    createLogoutModal();
    if (!logoutModal) return;
    
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('logging-out');
        confirmBtn.textContent = 'Logout';
    }
    logoutModal.classList.add('open');
}

function closeLogoutModal() {
    if (logoutModal) logoutModal.classList.remove('open');
}

// FIXED: Improved logout handler with better error handling
async function handleLogoutFromModal() {
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('logging-out');
        confirmBtn.textContent = 'Logging out...';
    }
    
    // Don't close modal immediately - let user see the logging out state
    // Close modal after a short delay
    setTimeout(() => {
        closeLogoutModal();
    }, 500);
    
    await performLogout();
}

// FIXED: Complete overhaul of performLogout function
async function performLogout() {
    try {
        // Update logout button if it exists
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
            logoutBtn.style.opacity = '0.7';
            logoutBtn.style.cursor = 'not-allowed';
        }

        // Show logout notification
        showNotification('Logging out...', 'info');

        // Clear all intervals
        const intervals = [
            'dashboardPollInterval',
            'stockRequestPollInterval',
            'lowStockPollInterval',
            'outOfStockAlertInterval'
        ];
        
        intervals.forEach(interval => {
            if (window[interval]) {
                clearInterval(window[interval]);
                window[interval] = null;
            }
        });

        // Destroy charts if they exist
        if (window.salesChart) {
            try {
                window.salesChart.destroy();
            } catch (e) {
                console.log('Error destroying chart:', e);
            }
            window.salesChart = null;
        }

        // Try to call logout API - but don't wait too long
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
            
            // Use Promise.race to timeout the fetch if it takes too long
            const logoutPromise = fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // Add timeout to prevent hanging
                signal: AbortSignal.timeout(3000)
            }).catch(err => {
                console.log('Logout API call failed (this is expected if backend is not available):', err.message);
                return null;
            });
            
            // Wait for API call but don't block
            await logoutPromise;
        } catch (apiError) {
            console.log('Backend logout failed, proceeding with local cleanup');
        }

        // IMPORTANT: Store essential data before clearing
        const posOrderCounter = localStorage.getItem('posOrderCounter');
        const themePreference = localStorage.getItem('theme');
        const userPreferences = localStorage.getItem('userPreferences');
        
        // Clear authentication data
        const authKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.toLowerCase().includes('auth') || 
                        key.toLowerCase().includes('token') || 
                        key.toLowerCase().includes('session') ||
                        key.toLowerCase().includes('jwt'))) {
                authKeys.push(key);
            }
        }
        
        // Remove auth items
        authKeys.forEach(key => localStorage.removeItem(key));
        
        // Clear session storage completely
        sessionStorage.clear();
        
        // Restore non-auth items
        if (posOrderCounter) localStorage.setItem('posOrderCounter', posOrderCounter);
        if (themePreference) localStorage.setItem('theme', themePreference);
        if (userPreferences) localStorage.setItem('userPreferences', userPreferences);

        // Clear auth cookies
        document.cookie.split(";").forEach(function(c) {
            const cookieParts = c.split("=");
            const cookieName = cookieParts[0].trim();
            // Clear all potential auth cookies
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });

        // Show success message
        showNotification('Logged out successfully! Redirecting...', 'success');
        
        // Small delay before redirect to show success message
        setTimeout(() => {
            // Force redirect to login page
            window.location.href = '/';
        }, 1500);

    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout completed with warnings. Redirecting...', 'warning');
        
        // Even on error, redirect after a delay
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inventory page initialized');
    
    // Read threshold from hidden input and update the global variable if different
    const thresholdElement = document.getElementById('lowStockThreshold');
    if (thresholdElement) {
        const thresholdValue = parseInt(thresholdElement.value);
        if (!isNaN(thresholdValue) && thresholdValue !== LOW_STOCK_THRESHOLD) {
            LOW_STOCK_THRESHOLD = thresholdValue;
            console.log('Low stock threshold updated to:', LOW_STOCK_THRESHOLD);
        } else {
            console.log('Low stock threshold using default:', LOW_STOCK_THRESHOLD);
        }
    }
    
    // Update the global variable whenever the threshold element changes
    // (in case it's dynamically updated)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                const newValue = parseInt(mutation.target.value);
                if (!isNaN(newValue) && LOW_STOCK_THRESHOLD !== newValue) {
                    LOW_STOCK_THRESHOLD = newValue;
                    console.log('Low stock threshold updated to:', LOW_STOCK_THRESHOLD);
                    // Re-check low stock with new threshold
                    checkLowStock();
                    updateStatsBoxes();
                }
            }
        });
    });
    
    if (thresholdElement) {
        observer.observe(thresholdElement, { attributes: true });
    }
    
    // FIXED: Logout button event listener - completely rewritten
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        // Remove any existing onclick attributes
        logoutBtn.removeAttribute('onclick');
        
        // Remove all existing event listeners by cloning
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        // Add new event listener
        newLogoutBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            showLogoutModal();
            return false;
        });
    }
    
    // Category filter dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const text = this.textContent.trim();
            const category = text === 'All Categories' ? 'all' : text;
            filterCategory(category);
            
            const dropdown = document.querySelector('.dropdown-menu');
            if (dropdown) dropdown.classList.remove('show');
        });
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', searchItems);
    
    // Sidebar functionality
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });
        
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }
    }
    
    // Menu item active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const link = this.querySelector('a');
            if (!link || link.getAttribute('href') === '#') {
                e.preventDefault();
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Bootstrap tooltips
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        try {
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
        } catch (e) {
            console.log('Bootstrap tooltips not available');
        }
    }
    
    // Escape key closes logout modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && logoutModal && logoutModal.classList.contains('open')) {
            closeLogoutModal();
        }
    });
    
    // Initial check — run immediately so stats are correct on page load
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
        checkLowStock();
        updateStatsBoxes();
    }, 100);
    
    // Periodic low stock check every 30 seconds
    setInterval(() => { checkLowStock(); }, 30000);
    
    // Watch for table DOM changes
    const tableBody = document.getElementById('itemsTable');
    if (tableBody) {
        const observer = new MutationObserver(() => {
            checkLowStock();
            updateStatsBoxes();
        });
        observer.observe(tableBody, { 
            childList: true, 
            subtree: true,
            characterData: true,
            attributes: true 
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshInventory');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            showNotification('Refreshing inventory...', 'info');
            setTimeout(() => { location.reload(); }, 500);
        });
    }
});

// Export functions globally
window.showLogoutModal = showLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.handleLogoutFromModal = handleLogoutFromModal;
window.performLogout = performLogout;
window.checkLowStock = checkLowStock;
window.updateStatsBoxes = updateStatsBoxes;
window.searchItems = searchItems;
window.filterCategory = filterCategory;
window.LOW_STOCK_THRESHOLD = LOW_STOCK_THRESHOLD;
window.getCurrentThreshold = getCurrentThreshold;

// Logout button styles
if (!document.querySelector('#logout-styles')) {
    const style = document.createElement('style');
    style.id = 'logout-styles';
    style.textContent = `
        .logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .logout-btn.logging-out { position: relative; }
        .logout-btn.logging-out::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: logout-spin 0.8s linear infinite;
        }
        @keyframes logout-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
}    