// ================= SIDEBAR TOGGLE FUNCTIONALITY =================
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const icon = sidebarToggle ? sidebarToggle.querySelector('i') : null;
    
    if (!sidebarToggle || !sidebar) {
        console.error('Sidebar elements not found. Toggle may not work properly.');
        return;
    }
    
    // Function to check if mobile
    function isMobile() {
        return window.innerWidth <= 767;
    }
    
    // Function to set the icon based on state
    function setIcon(isOpen) {
        if (!icon) return;
        
        if (isMobile()) {
            icon.className = isOpen ? 'bi bi-x-lg' : 'bi bi-list';
        } else {
            const isCollapsed = sidebar.classList.contains('collapsed');
            icon.className = isCollapsed ? 'bi bi-chevron-right' : 'bi bi-list';
        }
    }
    
    // Initialize sidebar state
    function initSidebar() {
        if (isMobile()) {
            sidebar.classList.remove('active', 'collapsed');
            setIcon(false);
        } else {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
            setIcon(!isCollapsed);
        }
    }
    
    function toggleSidebar() {
        if (isMobile()) {
            const isActive = sidebar.classList.contains('active');
            sidebar.classList.toggle('active');
            setIcon(!isActive);
            
            // Add/remove overlay
            if (!isActive) {
                // Add overlay
                const overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 999;
                    display: block;
                `;
                overlay.id = 'sidebarOverlay';
                document.body.appendChild(overlay);
                
                // Close sidebar when clicking overlay
                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('active');
                    setIcon(false);
                    if (overlay.parentNode) {
                        overlay.remove();
                    }
                });
            } else {
                const overlay = document.getElementById('sidebarOverlay');
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
            }
        } else {
            const isCollapsed = sidebar.classList.contains('collapsed');
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', !isCollapsed);
            setIcon(!isCollapsed);
        }
    }
    
    initSidebar();
    
    sidebarToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    });
    
    const menuItems = sidebar.querySelectorAll('.menu-item a');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (isMobile()) {
                sidebar.classList.remove('active');
                setIcon(false);
                const overlay = document.getElementById('sidebarOverlay');
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
            }
        });
    });
    
    function handleResize() {
        initSidebar();
        
        if (!isMobile()) {
            const overlay = document.getElementById('sidebarOverlay');
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
            sidebar.classList.remove('active');
        }
    }
    
    handleResize();
    
    window.addEventListener('resize', handleResize);
});

// ================= NOTIFICATION FUNCTION =================
function showNotification(message, type = 'success') {
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `custom-notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
        <span class="notification-message">${message}</span>
    `;
    
    const container = document.getElementById('notificationContainer');
    if (container) {
        container.appendChild(notification);
    } else {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        document.body.appendChild(container);
        container.appendChild(notification);
    }
    
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

// ================= USER DATA FUNCTIONS =================

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

// FIXED VERSION - Always fetches fresh data from server
async function getCurrentUser(forceRefresh = false) {
    console.log('getCurrentUser called, forceRefresh:', forceRefresh);
    
    // Always check authentication first
    if (!isAuthenticated()) {
        console.log('No authentication token found');
        // Clear any cached user data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastUserUpdate');
        return null;
    }
    
    const token = getAuthToken();
    
    // Clear cache if force refresh
    if (forceRefresh) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastUserUpdate');
    }
    
    try {
        console.log('Fetching fresh user data from API...');
        
        // Try multiple endpoints in order
        const endpoints = [
            { 
                url: '/api/auth/current-user',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            },
            { 
                url: '/api/auth/current-user-simple', 
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            },
            { 
                url: '/api/auth/me',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            }
        ];
        
        for (let i = 0; i < endpoints.length; i++) {
            const endpoint = endpoints[i];
            console.log(`Trying endpoint ${i + 1}: ${endpoint.url}`);
            
            try {
                const response = await fetch(endpoint.url, {
                    method: endpoint.method,
                    headers: endpoint.headers,
                    credentials: endpoint.credentials || 'omit',
                    cache: 'no-cache' // Prevent caching
                });
                
                console.log(`Endpoint ${endpoint.url} response status:`, response.status);
                
                if (response.status === 401) {
                    console.log('Unauthorized - token invalid');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('lastUserUpdate');
                    return null;
                }
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`Endpoint ${endpoint.url} result:`, result);
                    
                    let userData = null;
                    
                    // Handle different response structures
                    if (result.success && result.user) {
                        userData = result.user;
                    } else if (result.username && result.role) {
                        userData = result;
                    } else if (result.data && result.data.user) {
                        userData = result.data.user;
                    }
                    
                    if (userData && userData.username && userData.role) {
                        // Validate user data structure
                        const validUser = {
                            username: userData.username,
                            role: userData.role.toLowerCase(),
                            email: userData.email || '',
                            fullName: userData.fullName || userData.name || ''
                        };
                        
                        // Store the fresh data
                        localStorage.setItem('currentUser', JSON.stringify(validUser));
                        localStorage.setItem('lastUserUpdate', Date.now().toString());
                        console.log('Fresh user data fetched and cached:', validUser.username, validUser.role);
                        
                        return validUser;
                    }
                }
            } catch (endpointError) {
                console.log(`Endpoint ${endpoint.url} failed:`, endpointError.message);
                // Continue to next endpoint
            }
        }
        
        // If all endpoints fail, check for cached data (only if not too old)
        const lastUpdate = localStorage.getItem('lastUserUpdate');
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        if (lastUpdate && parseInt(lastUpdate) > fiveMinutesAgo) {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    if (parsed && parsed.username && parsed.role) {
                        console.log('Using cached user data (recent):', parsed.username);
                        return parsed;
                    }
                } catch (parseError) {
                    console.error('Error parsing stored user:', parseError);
                }
            }
        }
        
        console.log('All endpoints failed and no recent cache available');
        return null;
        
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

function clearStaleUserData() {
    const lastUpdate = localStorage.getItem('lastUserUpdate');
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    if (lastUpdate && parseInt(lastUpdate) < oneHourAgo) {
        console.log('Clearing stale user data');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastUserUpdate');
    }
}

async function loadProfileData(forceRefresh = false) {
    const profileSection = document.getElementById('profile-box-content');
    if (!profileSection) {
        console.error('Profile section not found');
        return;
    }
    
    clearStaleUserData();
    
    const usernameEl = document.getElementById('profile-username');
    const usernameDisplayEl = document.getElementById('profile-username-display');
    const roleBadgeEl = document.getElementById('profile-role-badge');
    
    if (usernameEl) usernameEl.textContent = 'Loading...';
    if (usernameDisplayEl) usernameDisplayEl.textContent = 'Loading...';
    if (roleBadgeEl) {
        roleBadgeEl.textContent = 'Loading...';
        roleBadgeEl.className = 'role-badge loading';
    }
    
    const userData = await getCurrentUser(forceRefresh);
    
    if (userData && userData.username && userData.role) {
        const username = userData.username;
        const role = userData.role.toLowerCase();
        const email = userData.email || '';
        const fullName = userData.fullName || userData.name || '';
        
        if (usernameEl) usernameEl.textContent = username;
        if (usernameDisplayEl) usernameDisplayEl.textContent = username;
        
        // Update role badge
        if (roleBadgeEl) {
            const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
            roleBadgeEl.textContent = roleDisplay;
            roleBadgeEl.className = `role-badge ${role}`;
        }
        
        // Update additional profile info if elements exist
        const emailEl = document.getElementById('profile-email');
        const nameEl = document.getElementById('profile-name');
        
        if (emailEl) emailEl.textContent = email || 'Not specified';
        if (nameEl) nameEl.textContent = fullName || 'Not specified';
        
        console.log('Profile loaded for:', { username, role });

        if (forceRefresh) {
            showNotification(`Profile refreshed`, 'success');
        }
    } else {
        const errorMessage = userData === null ? 
            'Please login to view profile' : 
            'Unable to load profile data';
        
        if (usernameEl) usernameEl.textContent = 'Not Logged In';
        if (usernameDisplayEl) usernameDisplayEl.textContent = 'Guest';
        
        if (roleBadgeEl) {
            roleBadgeEl.textContent = 'Guest';
            roleBadgeEl.className = 'role-badge guest';
        }
        
        console.log('Profile load failed:', errorMessage);

        if (forceRefresh) {
            showNotification(errorMessage, 'error');
        }
    }
}

// ================= FORM SUBMISSION =================
document.getElementById('accountForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        name: this.querySelector('[name="name"]')?.value || '',
        password: this.querySelector('[name="password"]')?.value || '',
        role: this.querySelector('[name="role"]')?.value || 'user'
    };
    
    const submitBtn = this.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/Users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(result.message || 'Account created successfully', 'success');
            this.reset();
        } else {
            showNotification(result.message || 'Error creating account', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// ================= PAGE NAVIGATION =================
document.querySelectorAll('.page-btn').forEach(button => {
    button.addEventListener('click', function() {
        const pageId = this.getAttribute('data-page');
        if (!pageId) return;
        
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
        
        document.querySelectorAll('.content-box-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const contentBox = document.getElementById(`${pageId}-box-content`);
        if (contentBox) {
            contentBox.classList.add('active');
        }
        
        // Close sidebar on mobile when page button is clicked
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const icon = sidebarToggle ? sidebarToggle.querySelector('i') : null;
        
        if (window.innerWidth <= 767 && sidebar) {
            sidebar.classList.remove('active');
            if (sidebarOverlay && sidebarOverlay.parentNode) {
                sidebarOverlay.remove();
            }
            if (icon) {
                icon.className = 'bi bi-list';
            }
        }
        
        if (pageId === 'profile') {
            loadProfileData(false); 
        }
    });
});

// ================= REFRESH PROFILE BUTTON =================
const refreshProfileBtn = document.getElementById('refreshProfileBtn');
if (refreshProfileBtn) {
    refreshProfileBtn.addEventListener('click', () => loadProfileData(true));
}

// ================= TOGGLE PASSWORD VISIBILITY =================
const togglePasswordBtn = document.getElementById('togglePassword');
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', function() {
        const passwordInput = document.getElementById('passwordField');
        const eyeIcon = document.getElementById('eyeIcon');
        
        if (!passwordInput || !eyeIcon) return;
        
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        
        if (isPassword) {
            eyeIcon.src = "https://cdn-icons-png.flaticon.com/512/2767/2767146.png";
            eyeIcon.alt = "Hide Password";
        } else {
            eyeIcon.src = "https://cdn-icons-png.flaticon.com/512/709/709612.png";
            eyeIcon.alt = "Show Password";
        }
    });
}

// ================= NOTIFICATION FALLBACK =================
if (!window.showNotification) {
    window.showNotification = function(message, type = 'info') {
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
        
        document.querySelectorAll('.temp-notification').forEach(el => el.remove());
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2500);
        
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.remove();
            }
        });
    };
}

// ================= LOGOUT MODAL =================
// Create logout modal HTML
function createLogoutModal() {
    // Check if modal already exists
    if (document.getElementById('logoutModal')) {
        return;
    }
    
    const modalHTML = `
        <div id="logoutModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirm Logout</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to logout?</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn cancel-btn">No, Cancel</button>
                    <button class="modal-btn logout-confirm-btn">Yes, Logout</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add modal styles
    const modalStyles = `
        <style>
            .modal {
                display: none;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                animation: fadeIn 0.3s ease;
            }
            
            .modal-content {
                background-color: white;
                margin: 15% auto;
                padding: 0;
                border-radius: 12px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease;
            }
            
            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #333;
            }
            
            .close-modal {
                font-size: 28px;
                font-weight: 500;
                color: #999;
                cursor: pointer;
                line-height: 20px;
                transition: color 0.2s;
            }
            
            .close-modal:hover {
                color: #666;
            }
            
            .modal-body {
                padding: 24px;
            }
            
            .modal-body p {
                margin: 0;
                font-size: 16px;
                color: #666;
                line-height: 1.5;
            }
            
            .modal-footer {
                padding: 16px 24px 24px;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            
            .modal-btn {
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .cancel-btn {
                background-color: #f44336;
                color: white;
            }
            
            .cancel-btn:hover {
                background-color: #d32f2f;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
            }
            
            .logout-confirm-btn {
                background-color: #4CAF50;
                color: white;
            }
            
            .logout-confirm-btn:hover {
                background-color: #45a049;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
            }
            
            .modal-btn:active {
                transform: translateY(0);
            }
            
            .modal-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
                box-shadow: none !important;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from {
                    transform: translateY(-30px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', modalStyles);
}

// Show logout modal
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (!modal) {
        createLogoutModal();
    }
    
    const modalElement = document.getElementById('logoutModal');
    modalElement.style.display = 'block';
    
    // Add event listeners
    const closeBtn = modalElement.querySelector('.close-modal');
    const cancelBtn = modalElement.querySelector('.cancel-btn');
    const logoutBtn = modalElement.querySelector('.logout-confirm-btn');
    
    // Remove existing event listeners by cloning and replacing
    const newCloseBtn = closeBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newLogoutBtn = logoutBtn.cloneNode(true);
    
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    
    // Add new event listeners
    newCloseBtn.addEventListener('click', hideLogoutModal);
    newCancelBtn.addEventListener('click', hideLogoutModal);
    newLogoutBtn.addEventListener('click', function() {
        performLogout();
        hideLogoutModal();
    });
    
    // Close modal when clicking outside
    modalElement.addEventListener('click', function(event) {
        if (event.target === modalElement) {
            hideLogoutModal();
        }
    });
    
    // Handle ESC key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && modalElement.style.display === 'block') {
            hideLogoutModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// Hide logout modal
function hideLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ================= LOGOUT FUNCTIONALITY =================
const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function(event) {
        event.preventDefault();
        showLogoutModal();
    });
}

async function performLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    const modalLogoutBtn = document.querySelector('.logout-confirm-btn');
    const originalText = logoutBtn ? logoutBtn.textContent : 'Logout';
    
    try {
        // Disable buttons during logout
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
        }
        if (modalLogoutBtn) {
            modalLogoutBtn.textContent = 'Logging out...';
            modalLogoutBtn.disabled = true;
        }

        // Attempt backend logout
        try {
            const authToken = localStorage.getItem('authToken') || '';
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                credentials: 'include'
            });
        } catch (apiError) {
            console.log('Backend logout failed:', apiError.message);
        }

        // Save POS counter if exists
        const posOrderCounter = localStorage.getItem('posOrderCounter');
        
        // Clear user-related storage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastUserUpdate');
        localStorage.removeItem('authToken');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loginTime');
        sessionStorage.clear();
        
        // Restore POS counter
        if (posOrderCounter) {
            localStorage.setItem('posOrderCounter', posOrderCounter);
        }

        // Clear auth cookies
        document.cookie.split(";").forEach(function(cookie) {
            const cookieParts = cookie.split("=");
            const cookieName = cookieParts[0].trim();
            
            const authCookiePattern = /(auth|token|session|user|login)/i;
            if (authCookiePattern.test(cookieName)) {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });

        // Close EventSource if exists
        if (typeof eventSource !== 'undefined' && eventSource) {
            eventSource.close();
        }

        // Show notification
        showNotification('Logged out successfully', 'success');

        // Redirect
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);

    } catch (error) {
        console.error('Logout error:', error);
        
        // Emergency cleanup
        try {
            const posOrderCounter = localStorage.getItem('posOrderCounter');
            localStorage.clear();
            sessionStorage.clear();
            if (posOrderCounter) {
                localStorage.setItem('posOrderCounter', posOrderCounter);
            }
            
            showNotification('Logged out', 'warning');
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        }
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } finally {
        // Restore button states
        if (logoutBtn && logoutBtn.parentNode) {
            logoutBtn.textContent = originalText;
            logoutBtn.disabled = false;
        }
        if (modalLogoutBtn && modalLogoutBtn.parentNode) {
            modalLogoutBtn.textContent = 'Logout';
            modalLogoutBtn.disabled = false;
        }
    }
}

// ================= SESSION MANAGEMENT =================
function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const authToken = localStorage.getItem('authToken');
    
    if (!isAuthenticated || isAuthenticated !== 'true' || !authToken || authToken.length < 10) {
        window.location.replace('/');
        return false;
    }
    
    if (!localStorage.getItem('loginTime')) {
        localStorage.setItem('loginTime', Date.now().toString());
    }
    
    return true;
}

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
                performLogout();
            }
        }
    }, 300000);
}

function resetSessionTimer() {
    localStorage.setItem('loginTime', Date.now().toString());
    startSessionTimer();
}

function setupActivityDetection() {
    ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetSessionTimer, { passive: true });
    });
}

// ================= TAB SYNC =================
function setupTabSync() {
    // Listen for storage events
    window.addEventListener('storage', function(event) {
        if (event.key === 'currentUser' || event.key === 'authToken' || event.key === 'isAuthenticated') {
            console.log('User data changed in another tab, checking...');
            
            // Check if the current tab is authenticated
            const isAuth = isAuthenticated();
            if (!isAuth) {
                showNotification('Session ended in another tab', 'error');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return;
            }
            
            // Update user data if profile page is active
            const profileSection = document.getElementById('profile-box-content');
            if (profileSection && profileSection.classList.contains('active')) {
                loadProfileData(true);
            }
        }
    });
}

// ================= APP INITIALIZATION =================
async function initializeApp() {
    if (!checkAuthentication()) {
        return;
    }
    
    if (!localStorage.getItem('loginTime')) {
        localStorage.setItem('loginTime', Date.now().toString());
    }
    
    // Clear stale user data on app start
    clearStaleUserData();
    
    // Create logout modal on initialization
    createLogoutModal();
    
    // Setup tab sync
    setupTabSync();
    
    // Don't auto-load profile data on app start
    // Wait for user to click on profile page or refresh button
    
    startSessionTimer();
    setupActivityDetection();
}

// ================= MENU ITEM CLICKS =================
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-item').forEach(i => {
            i.classList.remove('active');
        });
        this.classList.add('active');
    });
});

// ================= START APP =================
document.addEventListener('DOMContentLoaded', initializeApp);