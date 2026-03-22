// ==================== INVENTORY PAGE SCRIPT - CRASH FREE ====================

// Global variables
let LOW_STOCK_THRESHOLD = 5;
let updateTimeout = null;
let tableObserver = null;
let observerPaused = false; // Pause observer during our own DOM changes

// Function to get the current threshold
function getCurrentThreshold() {
    try {
        const thresholdElement = document.getElementById('lowStockThreshold');
        if (thresholdElement) {
            return parseInt(thresholdElement.value) || 5;
        }
        return LOW_STOCK_THRESHOLD;
    } catch (error) {
        console.error('Error getting threshold:', error);
        return 5;
    }
}

// Function to update stats boxes based on current table data
function updateStatsBoxes() {
    try {
        const tableBody = document.getElementById('itemsTable');
        if (!tableBody) return;

        const currentThreshold = getCurrentThreshold();
        const rows = tableBody.querySelectorAll('tr');
        let totalProducts = 0;
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;

        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) return;
            if (row.cells.length < 4) return;
            const quantityCell = row.cells[2];
            if (!quantityCell) return;
            const quantity = parseInt(quantityCell.dataset.qty ?? quantityCell.textContent.trim());
            if (!isNaN(quantity)) {
                totalProducts++;
                if (quantity === 0) outOfStock++;
                else if (quantity <= currentThreshold) lowStock++;
                else inStock++;
            }
        });

        // Directly set text — no animation intervals (they cause extra mutations)
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        set('totalProducts', totalProducts);
        set('inStockCount', inStock);
        set('lowStockCount', lowStock);
        set('outOfStockCount', outOfStock);

        // Color the low stock box
        const lowStockEl = document.getElementById('lowStockCount');
        if (lowStockEl) {
            lowStockEl.style.color = lowStock > 0 ? '#ff9800' : '#ffc107';
            lowStockEl.style.fontWeight = lowStock > 0 ? 'bold' : '';
            if (lowStockEl.parentElement) {
                lowStockEl.parentElement.style.backgroundColor = lowStock > 0 ? '#fff3e0' : '';
            }
        }

        // Color the out of stock box
        const outEl = document.getElementById('outOfStockCount');
        if (outEl) {
            outEl.style.fontWeight = outOfStock > 0 ? 'bold' : '';
            if (outEl.parentElement) {
                outEl.parentElement.style.backgroundColor = outOfStock > 0 ? '#f8d7da' : '';
            }
        }

        return { totalProducts, inStock, lowStock, outOfStock };
    } catch (error) {
        console.error('Error updating stats boxes:', error);
        return null;
    }
}

// Check low stock and update row badges/icons
// Pauses the MutationObserver before touching the DOM, resumes after.
function checkLowStock() {
    try {
        const tableBody = document.getElementById('itemsTable');
        if (!tableBody) return;

        const currentThreshold = getCurrentThreshold();
        const rows = tableBody.querySelectorAll('tr');
        let lowStockCount = 0;

        // ---- Pause observer so our badge changes don't re-trigger it ----
        observerPaused = true;

        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) return;
            if (row.cells.length < 4) return;

            const quantityCell = row.cells[2];
            if (!quantityCell) return;

            // Store raw qty in data attribute so we only read text once
            if (!quantityCell.dataset.qty) {
                quantityCell.dataset.qty = quantityCell.textContent.trim();
            }
            const quantity = parseInt(quantityCell.dataset.qty);

            // Remove existing status classes and badges
            row.classList.remove('low-stock-warning', 'out-of-stock-warning');
            row.querySelectorAll('.stock-warning-icon, .stock-badge').forEach(el => el.remove());

            if (isNaN(quantity)) return;

            if (quantity === 0) {
                row.classList.add('out-of-stock-warning');

            } else if (quantity <= currentThreshold) {
                lowStockCount++;
                row.classList.add('low-stock-warning');

                const icon = document.createElement('span');
                icon.className = 'stock-warning-icon';
                icon.innerHTML = '⚠️';
                icon.title = `Low stock! Only ${quantity} remaining (Threshold: ${currentThreshold})`;
                icon.style.cssText = 'margin-left:8px;font-size:14px;cursor:help;display:inline-block;';
                quantityCell.appendChild(icon);
            }
        });

        // ---- Resume observer ----
        observerPaused = false;

        // Update stats (pure number/style changes, no child-node mutations)
        updateStatsBoxes();

        // Notify once per 5-minute session window
        if (lowStockCount > 0 && !sessionStorage.getItem('lowStockNotified')) {
            showNotification(`${lowStockCount} item(s) are low on stock (threshold: ${currentThreshold})`, 'warning');
            sessionStorage.setItem('lowStockNotified', 'true');
            setTimeout(() => sessionStorage.removeItem('lowStockNotified'), 300000);
        }

        return lowStockCount;
    } catch (error) {
        observerPaused = false; // Always resume
        console.error('Error checking low stock:', error);
        return 0;
    }
}


// Search Functionality
function searchItems() {
    try {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const tableBody = document.getElementById('itemsTable');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        let hasVisibleRows = false;

        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) { row.style.display = 'none'; return; }
            if (row.cells.length < 4) return;

            const itemName = (row.cells[0].querySelector('.item-name')?.textContent || row.cells[0].textContent).toLowerCase();
            const itemId = (row.cells[0].querySelector('small')?.textContent || '').toLowerCase();
            const category = row.cells[1].textContent.toLowerCase();

            const matches = itemName.includes(searchTerm) || category.includes(searchTerm) || itemId.includes(searchTerm);
            row.style.display = (matches || searchTerm === '') ? '' : 'none';
            if (matches || searchTerm === '') hasVisibleRows = true;
        });

        const noResultsRow = tableBody.querySelector('.no-items-row');
        if (noResultsRow) {
            noResultsRow.style.display = (!hasVisibleRows && searchTerm !== '') ? '' : 'none';
            if (!hasVisibleRows && searchTerm !== '') {
                const td = noResultsRow.querySelector('td');
                if (td) td.textContent = 'No items found matching your search';
            }
        }

        scheduleCheck();
    } catch (error) {
        console.error('Error searching items:', error);
    }
}

// Filter by Category
function filterCategory(category) {
    try {
        const dropdownButton = document.getElementById('dropdownMenuButton1');
        if (dropdownButton) dropdownButton.textContent = category === 'all' ? 'All Categories' : category;

        const tableBody = document.getElementById('itemsTable');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        let hasVisibleRows = false;

        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) { row.style.display = (category === 'all') ? '' : 'none'; return; }
            const rowCategory = row.getAttribute('data-category');
            const visible = category === 'all' || rowCategory === category.toLowerCase();
            row.style.display = visible ? '' : 'none';
            if (visible) hasVisibleRows = true;
        });

        const noResultsRow = tableBody.querySelector('.no-items-row');
        if (noResultsRow) {
            noResultsRow.style.display = (!hasVisibleRows && category !== 'all') ? '' : 'none';
            if (!hasVisibleRows && category !== 'all') {
                const td = noResultsRow.querySelector('td');
                if (td) td.textContent = `No items found in category: ${category}`;
            }
        }

        scheduleCheck();
    } catch (error) {
        console.error('Error filtering category:', error);
    }
}

// Debounced check — prevents rapid repeated calls
function scheduleCheck() {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        checkLowStock();
        updateTimeout = null;
    }, 150);
}

// Notification Function
function showNotification(message, type = 'info') {
    try {
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes notificationFadeInOut {
                    0%   { opacity:0; transform:translateX(100px); }
                    15%  { opacity:1; transform:translateX(0); }
                    85%  { opacity:1; transform:translateX(0); }
                    100% { opacity:0; transform:translateX(100px); }
                }
                @keyframes pulse {
                    0%,100% { opacity:0.6; }
                    50%     { opacity:1; transform:scale(1.1); }
                }
                .low-stock-warning  { background-color:rgba(255,152,0,0.1)!important; border-left:4px solid #ff9800!important; }
                .out-of-stock-warning { background-color:rgba(220,53,69,0.1)!important; border-left:4px solid #dc3545!important; }
                .stats-box { transition:all .3s ease; border-radius:8px; padding:15px; }
                .stats-box:hover { transform:translateY(-5px); box-shadow:0 8px 16px rgba(0,0,0,.1); }
            `;
            document.head.appendChild(style);
        }

        document.querySelectorAll('.temp-notification').forEach(el => el.remove());

        const bgColor = { error:'#f44336', success:'#4CAF50', warning:'#ff9800' }[type] || '#2196F3';
        const notification = document.createElement('div');
        notification.className = 'temp-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position:fixed;top:20px;right:20px;background:${bgColor};color:white;
            padding:15px 25px;border-radius:8px;z-index:10000;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
            font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);
            animation:notificationFadeInOut 2.5s ease-in-out;
            max-width:350px;word-wrap:break-word;cursor:pointer;
        `;
        document.body.appendChild(notification);
        notification.addEventListener('click', () => notification.remove());
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 2500);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

// ==================== LOGOUT MODAL ====================
let logoutModal = null;

function createLogoutModal() {
    if (document.getElementById('logoutModal')) return;
    try {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'logoutModal';
        modal.innerHTML = `
            <div class="logout-modal-content">
                <div class="logout-modal-header">
                    <h3>Confirm Logout</h3>
                    <button class="close-modal" onclick="closeLogoutModal()">×</button>
                </div>
                <div class="logout-modal-body"><p>Are you sure you want to logout?</p></div>
                <div class="logout-modal-footer">
                    <button class="btn-cancel" onclick="closeLogoutModal()">No, Cancel</button>
                    <button class="btn-confirm" id="confirmLogoutBtn">Yes, Logout</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        logoutModal = modal;

        document.getElementById('confirmLogoutBtn')?.addEventListener('click', handleLogoutFromModal);

        if (!document.getElementById('logout-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'logout-modal-styles';
            style.textContent = `
                #logoutModal { display:none;position:fixed;top:0;left:0;width:100%;height:100%;
                    background:rgba(0,0,0,.5);z-index:99999;align-items:center;justify-content:center;animation:fadeIn .3s ease; }
                #logoutModal.open { display:flex; }
                .logout-modal-content { background:white;border-radius:10px;box-shadow:0 5px 20px rgba(0,0,0,.2);
                    width:90%;max-width:400px;overflow:hidden;animation:slideUp .3s ease; }
                .logout-modal-header { background:#f8f9fa;padding:15px 20px;display:flex;
                    justify-content:space-between;align-items:center;border-bottom:1px solid #dee2e6; }
                .logout-modal-header h3 { margin:0;font-size:1.2rem;color:#333; }
                .close-modal { background:none;border:none;font-size:1.5rem;cursor:pointer;color:#dc3545;line-height:1;transition:color .2s; }
                .close-modal:hover { color:#a71d2a; }
                .logout-modal-body { padding:30px 20px;text-align:center; }
                .logout-modal-body p { margin:0;font-size:1rem;color:#555; }
                .logout-modal-footer { padding:15px 20px;display:flex;justify-content:flex-end;
                    gap:10px;border-top:1px solid #dee2e6;background:#f8f9fa; }
                .btn-cancel,.btn-confirm { padding:8px 20px;border-radius:5px;font-weight:500;
                    cursor:pointer;border:none;transition:all .2s;min-width:80px; }
                .btn-cancel { background:#822222;color:white; }
                .btn-cancel:hover:not(:disabled) { background:#af2525;transform:translateY(-2px); }
                .btn-confirm { background:#28a745;color:white;display:flex;align-items:center;justify-content:center; }
                .btn-confirm:hover:not(:disabled) { background:#1a732f;transform:translateY(-2px);box-shadow:0 4px 12px rgba(40,167,69,.3); }
                .btn-confirm:disabled { opacity:.6;cursor:not-allowed;transform:none; }
                @keyframes fadeIn { from{opacity:0} to{opacity:1} }
                @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
                .logout-btn:disabled { opacity:.6;cursor:not-allowed; }
            `;
            document.head.appendChild(style);
        }
    } catch (error) {
        console.error('Error creating logout modal:', error);
    }
}

function showLogoutModal() {
    createLogoutModal();
    if (!logoutModal) return;
    const btn = document.getElementById('confirmLogoutBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Yes, Logout'; }
    logoutModal.classList.add('open');
}

function closeLogoutModal() {
    logoutModal?.classList.remove('open');
}

async function handleLogoutFromModal() {
    const btn = document.getElementById('confirmLogoutBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Yes, Logout'; }
    setTimeout(closeLogoutModal, 500);
    await performLogout();
}

async function performLogout() {
    try {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) { logoutBtn.disabled = true; logoutBtn.style.opacity = '0.7'; logoutBtn.style.cursor = 'not-allowed'; }

        showNotification('Logging out...', 'info');

        // Clear intervals
        ['dashboardPollInterval','stockRequestPollInterval','lowStockPollInterval','outOfStockAlertInterval'].forEach(k => {
            if (window[k]) { clearInterval(window[k]); window[k] = null; }
        });

        // Destroy charts
        if (window.salesChart) { try { window.salesChart.destroy(); } catch(e){} window.salesChart = null; }

        // Disconnect observer
        if (tableObserver) { tableObserver.disconnect(); tableObserver = null; }

        // Logout API (best-effort)
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                signal: AbortSignal.timeout(3000)
            }).catch(() => null);
        } catch(e) { /* ignore */ }

        // Preserve non-auth data
        const keep = {
            posOrderCounter: localStorage.getItem('posOrderCounter'),
            theme: localStorage.getItem('theme'),
            userPreferences: localStorage.getItem('userPreferences')
        };

        // Remove auth keys
        const authKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && /auth|token|session|jwt/i.test(key)) authKeys.push(key);
        }
        authKeys.forEach(k => localStorage.removeItem(k));
        sessionStorage.clear();

        // Restore
        Object.entries(keep).forEach(([k, v]) => { if (v) localStorage.setItem(k, v); });

        // Clear cookies
        document.cookie.split(';').forEach(c => {
            const name = c.split('=')[0].trim();
            if (name) {
                document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`;
                document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/;`;
            }
        });

        showNotification('Logged out successfully', 'success');
        setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout completed with warnings. Redirecting...', 'warning');
        setTimeout(() => { window.location.href = '/'; }, 1500);
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    console.log('Inventory page initialized');

    try {
        // Read initial threshold
        const thresholdElement = document.getElementById('lowStockThreshold');
        if (thresholdElement) {
            const val = parseInt(thresholdElement.value);
            if (!isNaN(val)) LOW_STOCK_THRESHOLD = val;

            // Watch threshold attribute changes only
            new MutationObserver(mutations => {
                mutations.forEach(m => {
                    if (m.attributeName === 'value') {
                        const newVal = parseInt(m.target.value);
                        if (!isNaN(newVal) && LOW_STOCK_THRESHOLD !== newVal) {
                            LOW_STOCK_THRESHOLD = newVal;
                            scheduleCheck();
                        }
                    }
                });
            }).observe(thresholdElement, { attributes: true });
        }

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.removeAttribute('onclick');
            const newBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
            newBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); showLogoutModal(); });
        }

        // Category filter
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                const text = this.textContent.trim();
                filterCategory(text === 'All Categories' ? 'all' : text);
                document.querySelector('.dropdown-menu')?.classList.remove('show');
            });
        });

        // Search
        document.getElementById('searchInput')?.addEventListener('input', searchItems);

        // Sidebar
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                sidebarOverlay?.classList.toggle('active');
            });
            sidebarOverlay?.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Menu active state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', function (e) {
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
                document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
            } catch (e) { /* ignore */ }
        }

        // Escape key closes logout modal
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && logoutModal?.classList.contains('open')) closeLogoutModal();
        });

        // Initial check
        setTimeout(checkLowStock, 100);

        // Periodic check every 30 seconds
        setInterval(checkLowStock, 30000);

        // ---- TABLE OBSERVER — only watches for added/removed rows (childList), NOT subtree text/attribute changes ----
        // This is the key fix: no subtree, no characterData, no attributes — so badge insertions don't re-trigger it.
        const tableBody = document.getElementById('itemsTable');
        if (tableBody) {
            tableObserver = new MutationObserver(() => {
                if (!observerPaused) scheduleCheck();
            });
            tableObserver.observe(tableBody, {
                childList: true,   // Only watch row additions/removals
                subtree: false     // Do NOT watch descendants — this was the crash source
            });
        }

        // Refresh button
        document.getElementById('refreshInventory')?.addEventListener('click', () => {
            showNotification('Refreshing inventory...', 'info');
            setTimeout(() => location.reload(), 500);
        });

    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Export globals
window.showLogoutModal = showLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.handleLogoutFromModal = handleLogoutFromModal;
window.performLogout = performLogout;
window.checkLowStock = checkLowStock;
window.updateStatsBoxes = updateStatsBoxes;
window.searchItems = searchItems;
window.filterCategory = filterCategory;
window.getCurrentThreshold = getCurrentThreshold;