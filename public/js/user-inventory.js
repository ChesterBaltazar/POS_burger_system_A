// Search Functionality
function searchItems() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const tableBody = document.getElementById('itemsTable');
    
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        // Skip placeholder rows
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
    
    // Show/hide no results message
    const noResultsRow = tableBody.querySelector('.no-items-row');
    if (noResultsRow) {
        if (!hasVisibleRows && searchTerm !== '') {
            noResultsRow.style.display = '';
            noResultsRow.querySelector('td').textContent = 'No items found matching your search';
        } else {
            noResultsRow.style.display = 'none';
        }
    }
}

// Filter by Category
function filterCategory(category) {
    const dropdownButton = document.getElementById('dropdownMenuButton1');
    dropdownButton.textContent = category === 'all' ? 'Categories' : category;
    
    const tableBody = document.getElementById('itemsTable');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        // Skip placeholder rows
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
    
    // Show/hide no results message
    const noResultsRow = tableBody.querySelector('.no-items-row');
    if (noResultsRow) {
        if (!hasVisibleRows && category !== 'all') {
            noResultsRow.style.display = '';
            noResultsRow.querySelector('td').textContent = `No items found in category: ${category}`;
        } else {
            noResultsRow.style.display = 'none';
        }
    }
}

// ================= NOTIFICATION FALLBACK =================
window.showNotification = window.showNotification || function(message, type = 'info') {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'temp-notification';
    
    // Style based on type
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
            .temp-notification {
                animation: notificationFadeInOut 2.5s ease-in-out !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Removes any existing temporary notifications
    document.querySelectorAll('.temp-notification').forEach(el => el.remove());
    
    document.body.appendChild(notification);
    
    // Auto-remove after animation
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 2500);
    
    // Also allow click to dismiss
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
};

// ================= LOGOUT FUNCTIONALITY =================
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(event) {
            event.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                performLogout();
            }
        });
    }
    
    // Add event listeners for category filter dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const text = item.textContent.trim();
            let category;
            
            if (text === 'All Categories') {
                category = 'all';
            } else if (text === 'Drinks' || 
                       text === 'Bread' || 
                       text === 'Meat' || 
                       text === 'Poultry' || 
                       text === 'Dairy' || 
                       text === 'Hotdogs & Sausages') {
                category = text;
            } else {
                return;
            }
            
            filterCategory(category);
            
            // Close the dropdown
            const dropdown = document.querySelector('.dropdown-menu');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        });
    });
    
    // Initialize search input with event listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchItems);
    }
    
    // Sidebar functionality
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }
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
                document.querySelectorAll('.menu-item').forEach(i => {
                    i.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
    
    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

async function performLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    const originalText = logoutBtn ? logoutBtn.textContent : 'Logout';
    
    try {
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
        }

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
        } catch (apiError) {
            console.log('Backend logout not available or failed:', apiError.message);
        }

        // Clear storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear auth cookies
        document.cookie.split(";").forEach(function(cookie) {
            const cookieParts = cookie.split("=");
            const cookieName = cookieParts[0].trim();
            
            const authCookiePattern = /(auth|token|session|user|login)/i;
            if (authCookiePattern.test(cookieName)) {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });

        // Show success message
        if (typeof showNotification === 'function') {
            showNotification('Logged out successfully', 'success');
        } else {
            alert('Logged out successfully');
        }

        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);

    } catch (error) {
        console.error('Logout error:', error);
        
        // Show error message
        if (typeof showNotification === 'function') {
            showNotification('Logout failed. Please try again.', 'error');
        } else {
            alert('Logout failed. Please try again.');
        }
        
        // Still try to redirect
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        
    } finally {
        // Restore button state
        if (logoutBtn && logoutBtn.parentNode) {
            logoutBtn.textContent = originalText;
            logoutBtn.disabled = false;
        }
    }
}

// Add logout styles if not present
if (!document.querySelector('#logout-styles')) {
    const style = document.createElement('style');
    style.id = 'logout-styles';
    style.textContent = `
        .logout-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .logout-btn.logging-out {
            position: relative;
        }
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
        @keyframes logout-spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}