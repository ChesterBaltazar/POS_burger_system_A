// ==================== INVENTORY PAGE SCRIPT ====================

// Global variables
let LOW_STOCK_THRESHOLD = 5;
let updateTimeout = null;
let tableObserver = null;
let observerPaused = false;

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

// Normalize any raw category string to a canonical key.
// Strips all non-alphanumeric chars so "Hotdogs & Sausages",
// "hotdog", "Hotdog", etc. all map to the same key.
function normalizeCategory(raw) {
    const s = (raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s === 'bread' || s === 'bun' || s === 'buns') return 'bread';
    if (s === 'meat') return 'meat';
    if (s === 'poultry' || s === 'chicken') return 'poultry';
    if (s === 'dairy') return 'dairy';
    if (s === 'drinks' || s === 'drink' || s === 'beverage' || s === 'beverages') return 'drinks';
    if (
        s === 'hotdog' || s === 'hotdogs' ||
        s === 'sausage' || s === 'sausages' ||
        s === 'hotdogandsausages' || s === 'hotdogssausages' ||
        s === 'hotdogsandsausages' || s === 'hotdogsausages'
    ) return 'hotdog';
    return s; // fallback
}

const CATEGORY_LABELS = {
    all:     'Categories',
    bread:   'Bread',
    meat:    'Meat',
    poultry: 'Poultry',
    dairy:   'Dairy',
    drinks:  'Drinks',
    hotdog:  'Hotdogs & Sausages'
};

// Only fills in data-category for rows that are missing it (dynamically added rows).
// Server-rendered rows already have the correct data-category from EJS.
function setRowCategories() {
    try {
        const tableBody = document.getElementById('itemsTable');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.classList.contains('no-items-row')) return;
            if (row.cells.length < 4) return;
            if (!row.getAttribute('data-category')) {
                const categoryCell = row.cells[1];
                if (categoryCell) {
                    const span = categoryCell.querySelector('span');
                    const category = span
                        ? span.textContent.trim().toLowerCase()
                        : categoryCell.textContent.trim().toLowerCase();
                    if (category) row.setAttribute('data-category', category);
                }
            }
        });
    } catch (error) {
        console.error('Error setting row categories:', error);
    }
}

// Function to update stats boxes
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
            if (row.classList.contains('no-items-row')) return;
            if (row.cells.length < 4) return;

            const quantityCell = row.cells[2];
            if (!quantityCell) return;

            const quantity = parseInt(quantityCell.textContent.trim());
            if (!isNaN(quantity)) {
                totalProducts++;
                if (quantity === 0) {
                    outOfStock++;
                } else if (quantity <= currentThreshold) {
                    lowStock++;
                } else {
                    inStock++;
                }
            }
        });

        const totalEl      = document.getElementById('totalProducts');
        const inStockEl    = document.getElementById('inStockCount');
        const lowStockEl   = document.getElementById('lowStockCount');
        const outOfStockEl = document.getElementById('outOfStockCount');

        if (totalEl)      totalEl.textContent      = totalProducts;
        if (inStockEl)    inStockEl.textContent    = inStock;
        if (lowStockEl)   lowStockEl.textContent   = lowStock;
        if (outOfStockEl) outOfStockEl.textContent = outOfStock;

        if (lowStockEl && lowStockEl.parentElement) {
            if (lowStock > 0) {
                lowStockEl.style.color = '#ff9800';
                lowStockEl.parentElement.style.backgroundColor = '#fff3e0';
            } else {
                lowStockEl.style.color = '#ffc107';
                lowStockEl.parentElement.style.backgroundColor = '';
            }
        }

        if (outOfStockEl && outOfStockEl.parentElement) {
            if (outOfStock > 0) {
                outOfStockEl.style.color = '#dc3545';
                outOfStockEl.parentElement.style.backgroundColor = '#f8d7da';
            } else {
                outOfStockEl.style.color = '#dc3545';
                outOfStockEl.parentElement.style.backgroundColor = '';
            }
        }

        return { totalProducts, inStock, lowStock, outOfStock };
    } catch (error) {
        console.error('Error updating stats boxes:', error);
        return null;
    }
}

// Check low stock and update UI
function checkLowStock() {
    try {
        const tableBody = document.getElementById('itemsTable');
        if (!tableBody) return;

        const currentThreshold = getCurrentThreshold();
        const rows = tableBody.querySelectorAll('tr');
        let lowStockCount = 0;

        observerPaused = true;

        rows.forEach(row => {
            if (row.classList.contains('no-items-row')) return;
            if (row.cells.length < 4) return;

            const nameCell     = row.cells[0];
            const quantityCell = row.cells[2];
            if (!quantityCell) return;

            const quantity = parseInt(quantityCell.textContent.trim());

            row.classList.remove('low-stock-warning', 'out-of-stock-warning');
            const existingBadges = row.querySelectorAll('.stock-badge, .stock-warning-icon');
            existingBadges.forEach(badge => badge.remove());

            if (isNaN(quantity)) return;

            if (quantity === 0) {
                row.classList.add('out-of-stock-warning');
                const badge = document.createElement('span');
                badge.className = 'stock-badge';
                badge.textContent = 'Out of Stock';
                badge.style.cssText = 'background:#dc3545;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;margin-left:8px;display:inline-block;';
                nameCell.appendChild(badge);

            } else if (quantity <= currentThreshold) {
                lowStockCount++;
                row.classList.add('low-stock-warning');

                const badge = document.createElement('span');
                badge.className = 'stock-badge';
                badge.textContent = 'Low Stock';
                badge.style.cssText = 'background:#ff9800;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;margin-left:8px;display:inline-block;';
                nameCell.appendChild(badge);

                const icon = document.createElement('span');
                icon.className = 'stock-warning-icon';
                icon.innerHTML = '&#9888;&#65039;';
                icon.title = 'Low stock! Only ' + quantity + ' remaining (Threshold: ' + currentThreshold + ')';
                icon.style.cssText = 'margin-left:8px;font-size:14px;cursor:help;display:inline-block;animation:pulse 1.5s infinite;';
                quantityCell.appendChild(icon);
            }
        });

        observerPaused = false;
        updateStatsBoxes();

        if (lowStockCount > 0 && !sessionStorage.getItem('lowStockNotified')) {
            showNotification(lowStockCount + ' item(s) are low on stock (threshold: ' + currentThreshold + ')', 'warning');
            sessionStorage.setItem('lowStockNotified', 'true');
            setTimeout(() => sessionStorage.removeItem('lowStockNotified'), 300000);
        }

        return lowStockCount;
    } catch (error) {
        observerPaused = false;
        console.error('Error checking low stock:', error);
        return 0;
    }
}

// Filter by Category
function filterCategory(category) {
    try {
        // Normalize to canonical key ("hotdog", "drinks", etc.)
        const filterKey = normalizeCategory(category);

        // Update dropdown button label
        const dropdownButton = document.getElementById('dropdownMenuButton1');
        if (dropdownButton) {
            dropdownButton.textContent = CATEGORY_LABELS[filterKey] || category;
        }

        const tableBody = document.getElementById('itemsTable');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        let hasVisibleRows = false;

        rows.forEach(row => {
            // Handle the permanent "no items" row
            if (row.classList.contains('no-items-row') && !row.classList.contains('dynamic-empty')) {
                row.style.display = (filterKey === 'all') ? '' : 'none';
                return;
            }
            // Skip dynamic empty row
            if (row.classList.contains('dynamic-empty')) return;

            // Normalize the row's stored category the same way
            const rawCategory = row.getAttribute('data-category') || '';
            const rowKey = normalizeCategory(rawCategory);

            if (filterKey === 'all') {
                row.style.display = '';
                hasVisibleRows = true;
            } else {
                if (rowKey === filterKey) {
                    row.style.display = '';
                    hasVisibleRows = true;
                } else {
                    row.style.display = 'none';
                }
            }
        });

        // Show/hide "no results" row
        let noResultsRow = tableBody.querySelector('.no-items-row.dynamic-empty');

        if (!hasVisibleRows && filterKey !== 'all') {
            if (!noResultsRow) {
                noResultsRow = document.createElement('tr');
                noResultsRow.className = 'no-items-row dynamic-empty';
                const td = document.createElement('td');
                td.colSpan = 4;
                td.style.textAlign = 'center';
                td.style.padding = '40px';
                td.style.color = '#666';
                noResultsRow.appendChild(td);
                tableBody.appendChild(noResultsRow);
            }
            noResultsRow.style.display = '';
            const td = noResultsRow.querySelector('td');
            if (td) td.textContent = 'No items found in category: ' + (CATEGORY_LABELS[filterKey] || category);
        } else if (noResultsRow) {
            noResultsRow.style.display = 'none';
        }

    } catch (error) {
        console.error('Error filtering category:', error);
    }
}

// Debounced check
function scheduleCheck() {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        checkLowStock();
        updateTimeout = null;
    }, 150);
}

// Notification function
function showNotification(message, type) {
    type = type || 'info';
    try {
        const existingNotifications = document.querySelectorAll('.temp-notification');
        existingNotifications.forEach(n => n.remove());

        const colors = {
            error:   '#f44336',
            success: '#4CAF50',
            warning: '#ff9800',
            info:    '#2196F3'
        };

        const notification = document.createElement('div');
        notification.className = 'temp-notification';
        notification.textContent = message;
        notification.style.cssText = [
            'position:fixed',
            'top:20px',
            'right:20px',
            'background:' + (colors[type] || colors.info),
            'color:white',
            'padding:15px 25px',
            'border-radius:8px',
            'z-index:10000',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
            'font-size:14px',
            'font-weight:500',
            'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
            'max-width:350px',
            'cursor:pointer'
        ].join(';');

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 2500);

        notification.onclick = () => notification.remove();
    } catch (error) {
        console.error('Notification error:', error);
    }
}

// Logout Modal
let logoutModal = null;

function createLogoutModal() {
    if (document.getElementById('logoutModal')) return;

    const modalHTML = [
        '<div id="logoutModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;align-items:center;justify-content:center;">',
        '  <div style="background:white;border-radius:10px;width:90%;max-width:400px;">',
        '    <div style="padding:15px 20px;border-bottom:1px solid #dee2e6;display:flex;justify-content:space-between;align-items:center;">',
        '      <h3 style="margin:0;">Confirm Logout</h3>',
        '      <button onclick="closeLogoutModal()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#dc3545;">&times;</button>',
        '    </div>',
        '    <div style="padding:30px 20px;text-align:center;"><p style="margin:0;">Are you sure you want to logout?</p></div>',
        '    <div style="padding:15px 20px;border-top:1px solid #dee2e6;display:flex;justify-content:flex-end;gap:10px;">',
        '      <button onclick="closeLogoutModal()" style="padding:8px 20px;background:#6c757d;color:white;border:none;border-radius:5px;cursor:pointer;">Cancel</button>',
        '      <button id="confirmLogoutBtn" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:5px;cursor:pointer;">Logout</button>',
        '    </div>',
        '  </div>',
        '</div>'
    ].join('');

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    logoutModal = document.getElementById('logoutModal');

    document.getElementById('confirmLogoutBtn').onclick = async function () {
        this.disabled = true;
        this.textContent = 'Logging out...';
        closeLogoutModal();
        await performLogout();
    };
}

function showLogoutModal() {
    createLogoutModal();
    if (logoutModal) logoutModal.style.display = 'flex';
}

function closeLogoutModal() {
    if (logoutModal) logoutModal.style.display = 'none';
}

async function performLogout() {
    try {
        showNotification('Logging out...', 'info');

        if (tableObserver) {
            tableObserver.disconnect();
            tableObserver = null;
        }

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(2000)
            });
        } catch (e) {}

        localStorage.clear();
        sessionStorage.clear();

        showNotification('Logged out successfully', 'success');
        setTimeout(() => { window.location.href = '/'; }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    console.log('Inventory page initialized');

    try {
        const thresholdInput = document.getElementById('lowStockThreshold');
        if (thresholdInput) {
            LOW_STOCK_THRESHOLD = parseInt(thresholdInput.value) || 5;
            thresholdInput.addEventListener('change', function () {
                LOW_STOCK_THRESHOLD = parseInt(this.value) || 5;
                checkLowStock();
                updateStatsBoxes();
            });
        }

        // Category dropdown clicks
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const category = this.getAttribute('data-category');
                if (category) filterCategory(category);

                if (typeof bootstrap !== 'undefined') {
                    const toggle = document.querySelector('.dropdown-toggle');
                    const dropdown = toggle ? bootstrap.Dropdown.getInstance(toggle) : null;
                    if (dropdown) dropdown.hide();
                }
            });
        });

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            const newBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showLogoutModal();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshInventory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                showNotification('Refreshing inventory...', 'info');
                setTimeout(() => location.reload(), 500);
            });
        }

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
        }

        // Table mutation observer
        const tableBody = document.getElementById('itemsTable');
        if (tableBody) {
            tableObserver = new MutationObserver(() => {
                if (!observerPaused) {
                    scheduleCheck();
                    setRowCategories();
                }
            });
            tableObserver.observe(tableBody, { childList: true, subtree: false });
        }

        // Initial checks
        setTimeout(() => {
            checkLowStock();
            updateStatsBoxes();
            setRowCategories();
        }, 100);

        // Periodic stock check every 30s
        setInterval(() => checkLowStock(), 30000);

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && logoutModal && logoutModal.style.display === 'flex') {
                closeLogoutModal();
            }
        });

    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Export globals
window.filterCategory    = filterCategory;
window.showLogoutModal   = showLogoutModal;
window.closeLogoutModal  = closeLogoutModal;
window.performLogout     = performLogout;
window.checkLowStock     = checkLowStock;
window.updateStatsBoxes  = updateStatsBoxes;
window.getCurrentThreshold = getCurrentThreshold;
window.normalizeCategory = normalizeCategory;