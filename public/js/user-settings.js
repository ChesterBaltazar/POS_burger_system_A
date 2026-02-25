// ================= UTILITY FUNCTIONS =================

// Function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to show notification
function showNotification(message, type = 'success') {
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        document.body.appendChild(notificationContainer);
    }
    
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `custom-notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'error' ? '✗' : '✓'}</span>
        <span class="notification-message">${message}</span>
    `;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Add notification styles if not present
if (!document.querySelector('#notification-css')) {
    const style = document.createElement('style');
    style.id = 'notification-css';
    style.textContent = `
        #notificationContainer {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        }
        
        .custom-notification {
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            max-width: 350px;
        }
        
        .custom-notification.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .custom-notification.error {
            background: #f44336;
        }
        
        .notification-icon {
            margin-right: 10px;
            font-weight: bold;
            font-size: 18px;
        }
        
        .notification-message {
            font-size: 14px;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
}

// Function to get auth token from localStorage
function getAuthToken() {
    const token = localStorage.getItem('authToken') || '';
    console.log('Auth token retrieved:', token ? 'Yes (length: ' + token.length + ')' : 'No');
    return token;
}

// Function to check if user is authenticated
function isAuthenticated() {
    const token = getAuthToken();
    return token && token.length > 10;
}

// ================= LOGOUT MODAL FUNCTIONS - IMPROVED ====================
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
                <button class="btn-cancel" onclick="closeLogoutModal()">No, Cancel</button>
                <button class="btn-confirm" id="confirmLogoutBtn">Yes, Logout</button>
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
            .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
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
        confirmBtn.textContent = 'Yes, Logout';
    }
    logoutModal.classList.add('open');
}

function closeLogoutModal() {
    if (logoutModal) logoutModal.classList.remove('open');
}

// Improved logout handler with better error handling
async function handleLogoutFromModal() {
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Yes, Logout';
    }
    
    // Don't close modal immediately - let user see the disabled state
    setTimeout(() => {
        closeLogoutModal();
    }, 500);
    
    await performLogout();
}

// Complete overhaul of performLogout function
async function performLogout() {
    try {
        // DON'T change the logout button text - keep it as is
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
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
        showNotification('Logged out', 'success');
        
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
    } finally {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.disabled = false;
            logoutBtn.style.opacity = '';
            logoutBtn.style.cursor = '';
        }
    }
}

// ================= USER FUNCTIONS =================

// Function to get current user data - FIXED VERSION
async function getCurrentUser() {
    console.log('getCurrentUser called');
    
    // Always check authentication first
    if (!isAuthenticated()) {
        console.log('No authentication token found');
        // Clear any cached user data
        localStorage.removeItem('currentUser');
        return {
            username: "Guest",
            role: "guest"
        };
    }
    
    const token = getAuthToken();
    
    try {
        console.log('Fetching fresh user data from API...');
        const response = await fetch('/api/auth/current-user-simple', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            // Prevent caching to always get fresh data
            cache: 'no-cache'
        });
        
        console.log('User API response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token expired or invalid');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                return {
                    username: "Guest",
                    role: "guest"
                };
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('User API result:', result);
        
        if (result && (result.user || result.username)) {
            const userData = result.user || result;
            
            // Validate that we have proper user data
            if (!userData.username || !userData.role) {
                console.error('Invalid user data received:', userData);
                throw new Error('Invalid user data structure');
            }
            
            // Save to localStorage for offline use
            localStorage.setItem('currentUser', JSON.stringify(userData));
            console.log('Fresh user data saved to localStorage');
            
            return userData;
        } else {
            console.error('No valid user data in response:', result);
            throw new Error('No user data received');
        }
        
    } catch (error) {
        console.error('Error fetching user:', error);
        
        // Try to use cached data as fallback only for network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    if (parsed && parsed.username && parsed.role) {
                        console.log('Using cached user data due to network error');
                        return parsed;
                    }
                } catch (parseError) {
                    console.error('Error parsing stored user:', parseError);
                }
            }
        } else if (error.message.includes('401')) {
            // Clear everything if unauthorized
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
        
        return {
            username: "User",
            role: "user"
        };
    }
}

// Loads profile data function - UPDATED
async function loadProfileData() {
    console.log('loadProfileData called');
    const isManualRefresh = sessionStorage.getItem('profileManuallyRefreshed') === 'true';
    
    const usernameElement = document.getElementById('profile-username');
    const usernameDisplayElement = document.getElementById('profile-username-display');
    const roleBadgeElement = document.getElementById('profile-role-badge');
    const emailElement = document.getElementById('profile-email');
    
    if (usernameElement) usernameElement.textContent = 'Loading...';
    if (usernameDisplayElement) usernameDisplayElement.textContent = '--';
    if (roleBadgeElement) roleBadgeElement.textContent = 'Loading...';
    if (emailElement) emailElement.textContent = 'Loading...';
    
    try {
        // Force fresh fetch by clearing cache first if manual refresh
        if (isManualRefresh) {
            localStorage.removeItem('currentUser');
        }
        
        const userData = await getCurrentUser();
        console.log('Loaded user data:', userData);
        
        if (userData && userData.username && userData.role) {
            if (usernameElement) usernameElement.textContent = userData.username;
            if (usernameDisplayElement) usernameDisplayElement.textContent = userData.username;
            if (emailElement) emailElement.textContent = userData.email || 'Not provided';
            
            if (roleBadgeElement) {
                const role = userData.role.toLowerCase();
                roleBadgeElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
                roleBadgeElement.className = `role-badge ${role}`;
            }
            
            if (isManualRefresh) {
                showNotification('Profile refreshed successfully');
                sessionStorage.removeItem('profileManuallyRefreshed');
            }
        } else {
            // Clear everything if no valid user data
            localStorage.removeItem('currentUser');
            
            if (usernameElement) usernameElement.textContent = 'Not Logged In';
            if (usernameDisplayElement) usernameDisplayElement.textContent = '--';
            if (emailElement) emailElement.textContent = 'Please login';
            if (roleBadgeElement) {
                roleBadgeElement.textContent = 'Guest';
                roleBadgeElement.className = 'role-badge guest';
            }
            
            if (isManualRefresh) {
                showNotification('Please login to view profile', 'error');
                sessionStorage.removeItem('profileManuallyRefreshed');
            }
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
        showNotification('Error loading profile', 'error');
    }
}

// ================= PAGE MANAGEMENT =================

// Switch between profile and stock request pages
function switchPage(pageId) {
    console.log('Switching to page:', pageId);
    // Hide all content boxes
    document.querySelectorAll('.content-box-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // Show selected content box
    const selectedContent = document.getElementById(`${pageId}-box-content`);
    if (selectedContent) {
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';
    }
    
    // Update active button
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = document.querySelector(`.page-btn[data-page="${pageId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Load the data for the page
    if (pageId === 'profile') {
        sessionStorage.removeItem('profileManuallyRefreshed');
        loadProfileData();
    }
}

// ================= EVENT LISTENERS =================

// Menu item active state
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.menu-item').forEach(i => {
            i.classList.remove('active');
        });
        this.classList.add('active');
    });
});

// ================= LOGOUT BUTTON SETUP =================
function setupLogoutButton() {
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
}

// ================= INITIALIZATION =================
function initDashboard() {
    console.log('Initializing dashboard...');
    
    // Clear any existing manual refresh flags
    sessionStorage.removeItem('profileManuallyRefreshed');
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting...');
        showNotification('Please login to access the dashboard', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return;
    }
    
    console.log('User authenticated, loading dashboard...');
    
    // Always fetch fresh user data on initialization
    localStorage.removeItem('currentUser');
    
    // Setup logout button with modal
    setupLogoutButton();
    
    // Escape key closes logout modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && logoutModal && logoutModal.classList.contains('open')) {
            closeLogoutModal();
        }
    });
    
    // Load initial page data
    setTimeout(() => {
        loadProfileData();
    }, 100);
    
    // Page switching
    document.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            console.log('Switching to page:', pageId);
            switchPage(pageId);
        });
    });
    
    // Refresh buttons
    const refreshProfileBtn = document.getElementById('refreshProfileBtn');
    if (refreshProfileBtn) {
        refreshProfileBtn.addEventListener('click', function() {
            console.log('Refreshing profile...');
            sessionStorage.setItem('profileManuallyRefreshed', 'true');
            loadProfileData();
        });
    }
    
    // Add loading spinner and style classes if not present
    if (!document.querySelector('#dashboard-styles')) {
        const style = document.createElement('style');
        style.id = 'dashboard-styles';
        style.textContent = `
            .loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .role-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .role-badge.admin {
                background: #f44336;
                color: white;
            }
            
            .role-badge.user {
                background: #2196F3;
                color: white;
            }
            
            .role-badge.guest {
                background: #9E9E9E;
                color: white;
            }
            
            .role-badge.staff {
                background: #4CAF50;
                color: white;
            }
            
            .role-badge.manager {
                background: #FF9800;
                color: white;
            }
            
            .content-box-content {
                display: none;
            }
            
            .content-box-content.active {
                display: block;
            }
            
            /* Updated styles for purple buttons */
            .page-btn {
                background-color: transparent;
                border: 2px solid #ddd;
                color: #333;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-right: 10px;
                font-weight: 500;
            }
            
            .page-btn:hover {
                border-color: #6a0dad;
                color: #6a0dad;
                background-color: rgba(106, 13, 173, 0.05);
            }
            
            .page-btn.active {
                background-color: #6a0dad;
                color: white;
                border-color: #6a0dad;
                box-shadow: 0 2px 8px rgba(106, 13, 173, 0.3);
            }
            
            .logout-btn:disabled { 
                opacity: 0.6; 
                cursor: not-allowed; 
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create modal on initialization
    createLogoutModal();
    
    // Initialize the default page
    const defaultPage = 'profile';
    console.log('Setting default page to:', defaultPage);
    switchPage(defaultPage);
    
    // Debug: Check if elements exist
    console.log('Profile elements:', {
        profileBox: document.getElementById('profile-box-content'),
        stockBox: document.getElementById('stock-request-box-content'),
        refreshProfileBtn: document.getElementById('refreshProfileBtn')
    });
    
    showNotification('Dashboard loaded successfully');
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// Export functions globally
window.showLogoutModal = showLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.handleLogoutFromModal = handleLogoutFromModal;
window.performLogout = performLogout;

// Debug function to test API endpoints
async function testEndpoints() {
    console.log('Testing API endpoints...');
    
    // Test if endpoints exist
    try {
        const endpoints = [
            '/api/auth/current-user-simple',
            '/api/auth/logout'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                });
                console.log(`${endpoint}: ${response.status} ${response.statusText}`);
            } catch (error) {
                console.error(`${endpoint}: Error - ${error.message}`);
            }
        }
    } catch (error) {
        console.error('Error testing endpoints:', error);
    }
}

// Call test after a delay
setTimeout(testEndpoints, 1000);