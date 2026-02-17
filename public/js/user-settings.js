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

// ================= LOGOUT FUNCTIONALITY =================
const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function(event) {
        event.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            performLogout();
        }
    });
}

async function performLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    const originalText = logoutBtn ? logoutBtn.textContent : 'Logout';
    
    try {
        // Update button state
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
        }

        // Attempt backend logout
        try {
            const authToken = localStorage.getItem('authToken') || '';
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });
        } catch (apiError) {
            console.log('Backend logout not available:', apiError.message);
        }

        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear auth-related cookies
        document.cookie.split(";").forEach(function(cookie) {
            const cookieParts = cookie.split("=");
            const cookieName = cookieParts[0].trim();
            
            const authCookiePattern = /(auth|token|session|user|login)/i;
            if (authCookiePattern.test(cookieName)) {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });

        showNotification('Logged out successfully', 'success');

        // Redirect after notification shows
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);

    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed', 'error');
        
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
        `;
        document.head.appendChild(style);
    }
    
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