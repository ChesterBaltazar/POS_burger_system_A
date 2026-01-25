// Search Functionality
        function searchItems() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#itemsTable tr');
            
            rows.forEach(row => {
                if (row.cells.length < 4) return; // Skip if not a valid row
                
                const name = row.cells[0].textContent.toLowerCase();
                const category = row.cells[1].textContent.toLowerCase();
                const id = row.cells[0].querySelector('small')?.textContent.toLowerCase() || '';
                
                if (name.includes(searchTerm) || category.includes(searchTerm) || id.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
        
        // Filter by Category
        function filterCategory(category) {
            const dropdownButton = document.getElementById('dropdownMenuButton1');
            dropdownButton.textContent = category === 'all' ? 'Categories' : category;
            
            const rows = document.querySelectorAll('#itemsTable tr');
            const filterValue = category.toLowerCase();
            
            rows.forEach(row => {
                const rowCategory = row.getAttribute('data-category');
                
                if (category === 'all' || rowCategory === filterValue) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
// ================= NOTIFICATION FALLBACK =================
// Ensure notification function exists
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
    
    // Add animation styles if not already present
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
    
    // Remove any existing temporary notifications
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
document.querySelector('.logout-btn').addEventListener('click', function(event) {
    event.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        performLogout();
    }
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
            const authToken = localStorage.getItem('authToken') || '';
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                credentials: 'include' // Include cookies
            });
        } catch (apiError) {
            console.log('Backend logout not available or failed:', apiError.message);

        }


        const posOrderCounter = localStorage.getItem('posOrderCounter');
        

        localStorage.clear();
        sessionStorage.clear();

        if (posOrderCounter) {
            localStorage.setItem('posOrderCounter', posOrderCounter);
        }


        document.cookie.split(";").forEach(function(cookie) {
            const cookieParts = cookie.split("=");
            const cookieName = cookieParts[0].trim();
            

            const authCookiePattern = /(auth|token|session|user|login)/i;
            if (authCookiePattern.test(cookieName)) {
                
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
        });

        
        if (typeof eventSource !== 'undefined' && eventSource) {
            eventSource.close();
        }

        
        const highestTimeoutId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestTimeoutId; i++) {
            clearTimeout(i);
        }

        
        if (typeof showNotification === 'function') {
            showNotification('logged out', 'success');
        } else {
        
            alert('Logged out');
        }

        
        setTimeout(() => {
        
            window.location.href = '/';
            window.location.replace('/'); 
        }, 1500);

    } catch (error) {
        console.error('Logout error:', error);
        
        
        try {
            const posOrderCounter = localStorage.getItem('posOrderCounter');
            localStorage.clear();
            sessionStorage.clear();
            if (posOrderCounter) {
                localStorage.setItem('posOrderCounter', posOrderCounter);
            }
            
        
            if (typeof showNotification === 'function') {
                showNotification('Logged out failed', 'error');
            }
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        }
        
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } finally {
        
        if (logoutBtn && logoutBtn.parentNode) {
            logoutBtn.textContent = originalText;
            logoutBtn.disabled = false;
        }
    }
}

// Optional: Add CSS for better button feedback
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

// ========================= END OF LOGOUT FUNCTION =============================================

        // Fix for menu items: Don't prevent navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // Only update active state if there's no link
                const link = this.querySelector('a');
                if (!link || link.getAttribute('href') === '#') {
                    e.preventDefault();
                    document.querySelectorAll('.menu-item').forEach(i => {
                        i.classList.remove('active');
                    });
                    this.classList.add('active');
                }
                // Links will navigate normally
            });
        });
        
        // Initialize Bootstrap dropdowns
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize tooltips if any
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        });