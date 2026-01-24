// Simple sidebar toggle for mobile only
    document.addEventListener('DOMContentLoaded', function() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        if (sidebarToggle && sidebar) {
            // Toggle sidebar on button click
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('active');
                
                // Change icon based on state
                const icon = sidebarToggle.querySelector('i');
                if (sidebar.classList.contains('active')) {
                    icon.className = 'bi bi-x-lg';
                } else {
                    icon.className = 'bi bi-list';
                }
            });
            
            // Close sidebar when clicking on overlay
            sidebarOverlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                sidebarToggle.querySelector('i').className = 'bi bi-list';
            });
            
            // Close sidebar when clicking on a menu item (optional for mobile)
            const menuItems = sidebar.querySelectorAll('.menu-item a');
            menuItems.forEach(item => {
                item.addEventListener('click', function() {
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('active');
                        sidebarOverlay.classList.remove('active');
                        sidebarToggle.querySelector('i').className = 'bi bi-list';
                    }
                });
            });
        }
        
        // Handle window resize
        function handleResize() {
            if (window.innerWidth > 768) {
                // On desktop, ensure sidebar is visible and overlay is hidden
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                if (sidebarToggle.querySelector('i')) {
                    sidebarToggle.querySelector('i').className = 'bi bi-list';
                }
            }
        }
        
        // Initial check
        handleResize();
        
        // Listen for resize
        window.addEventListener('resize', handleResize);
    });

// Notification Pop up X or check
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
    

    document.getElementById('notificationContainer').appendChild(notification);
    

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

// Fetch User data info - FIXED: Proper user retrieval without hardcoded admin
async function getCurrentUser() {
    try {
        // Check localStorage first
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                return parsed.user || parsed;
            } catch (parseError) {
                console.error('Error parsing stored user:', parseError);
                localStorage.removeItem('currentUser');
            }
        }
        
        // Try server with auth token
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await fetch('/api/auth/current-user', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.user) {
                        localStorage.setItem('currentUser', JSON.stringify(result));
                        return result.user;
                    }
                }
            } catch (apiError) {
                console.log('JWT endpoint failed:', apiError.message);
            }
        }
        
        // Try simple endpoint
        try {
            const response = await fetch('/api/auth/current-user-simple', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.user) {
                    localStorage.setItem('currentUser', JSON.stringify(result));
                    return result.user;
                }
            }
        } catch (simpleError) {
            console.log('Simple endpoint failed:', simpleError.message);
        }
        
        // Check sessionStorage
        const sessionUser = sessionStorage.getItem('userData');
        if (sessionUser) {
            try {
                const parsed = JSON.parse(sessionUser);
                return parsed.user || parsed;
            } catch (parseError) {
                console.error('Error parsing session user:', parseError);
                sessionStorage.removeItem('userData');
            }
        }
        
        // No user found - return null instead of fake admin
        console.log('No user data found. User may not be logged in.');
        return null;
        
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Load profile data - FIXED: Proper handling of user roles
async function loadProfileData() {
    const profileSection = document.getElementById('profile-box-content');
    if (!profileSection) {
        console.error('Profile section not found');
        return;
    }
    
    if (!profileSection.classList.contains('active')) {
        console.log('Profile section is not active');
        return;
    }
    
    // Show loading state
    const usernameEl = document.getElementById('profile-username');
    const usernameDisplayEl = document.getElementById('profile-username-display');
    const roleBadgeEl = document.getElementById('profile-role-badge');
    
    if (usernameEl) usernameEl.textContent = 'Loading...';
    if (usernameDisplayEl) usernameDisplayEl.textContent = '--';
    if (roleBadgeEl) {
        roleBadgeEl.textContent = 'Loading...';
        roleBadgeEl.className = 'role-badge';
    }
    
    const userData = await getCurrentUser();
    
    if (userData && typeof userData === 'object' && userData.username) {
        // Success: User found
        const username = userData.username || 'User';
        const role = (userData.role || 'user').toLowerCase();
        
        if (usernameEl) usernameEl.textContent = username;
        if (usernameDisplayEl) usernameDisplayEl.textContent = username;
        
        if (roleBadgeEl) {
            roleBadgeEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            roleBadgeEl.className = `role-badge ${role}`;
        }
        
        console.log('Profile loaded successfully:', { username, role });
        showNotification('Profile loaded successfully', 'success');
    } else {
        // No user data found or invalid format
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
        showNotification(errorMessage, 'error');
    }
}

// Account form submission
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

// Page navigation - FIXED: Added back the profile loading on click
document.querySelectorAll('.page-btn').forEach(button => {
    button.addEventListener('click', function() {
        const pageId = this.getAttribute('data-page');
        if (!pageId) return;
        
        // Update active button
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
        
        // Show corresponding content
        document.querySelectorAll('.content-box-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const contentBox = document.getElementById(`${pageId}-box-content`);
        if (contentBox) {
            contentBox.classList.add('active');
        }
        
        // Load profile data if on profile page
        if (pageId === 'profile') {
            // Give a small delay to ensure the content is visible
            setTimeout(() => {
                loadProfileData();
            }, 50);
        }
    });
});

// Refresh profile button
const refreshProfileBtn = document.getElementById('refreshProfileBtn');
if (refreshProfileBtn) {
    refreshProfileBtn.addEventListener('click', loadProfileData);
}

// Toggle password visibility
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
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
        }

        // Try backend logout
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
        
        // Clear storage
        localStorage.clear();
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
        showNotification('Successfully logged out', 'success');

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
            
            showNotification('Logged out with issues. Redirecting...', 'warning');
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

// ================= SESSION MANAGEMENT =================
function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (!isAuthenticated || isAuthenticated !== 'true') {
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

// ================= APP INITIALIZATION =================
async function initializeApp() {
    if (!checkAuthentication()) {
        return;
    }
    
    if (!localStorage.getItem('loginTime')) {
        localStorage.setItem('loginTime', Date.now().toString());
    }
    
    // Load profile if on profile page
    const activePage = document.querySelector('.page-btn.active');
    if (activePage && activePage.getAttribute('data-page') === 'profile') {
        setTimeout(() => {
            loadProfileData();
        }, 100);
    }
    
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

// ================= SIDEBAR TOGGLE =================
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (!sidebarToggle) return;
    
    const sidebar = document.querySelector('.sidebar');
    const icon = sidebarToggle.querySelector('i');
    
    if (!sidebar || !icon) return;
    
    // Check saved state
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const isMobile = window.innerWidth <= 768;
    
    // Initialize state
    if (!isMobile) {
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            icon.className = 'bi bi-chevron-right';
        } else {
            icon.className = 'bi bi-list';
        }
    }
    
    // Check if mobile
    function isMobileCheck() {
        return window.innerWidth <= 768;
    }
    
    // Toggle sidebar
    sidebarToggle.addEventListener('click', function(event) {
        event.stopPropagation();
        
        if (isMobileCheck()) {
            sidebar.classList.toggle('active');
            icon.className = sidebar.classList.contains('active') ? 
                'bi bi-chevron-left' : 'bi bi-list';
        } else {
            sidebar.classList.toggle('collapsed');
            const isNowCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isNowCollapsed);
            icon.className = isNowCollapsed ? 'bi bi-chevron-right' : 'bi bi-list';
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (isMobileCheck() && 
            sidebar.classList.contains('active') && 
            !sidebar.contains(event.target) && 
            event.target !== sidebarToggle && 
            !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('active');
            icon.className = 'bi bi-list';
        }
    });
    
    // Handle resize
    function handleResize() {
        const isMobileNow = isMobileCheck();
        
        if (isMobileNow) {
            sidebar.classList.remove('collapsed', 'active');
            icon.className = 'bi bi-list';
        } else {
            sidebar.classList.remove('active');
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
                icon.className = 'bi bi-chevron-right';
            } else {
                sidebar.classList.remove('collapsed');
                icon.className = 'bi bi-list';
            }
        }
    }
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    sidebar.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});

// ================= START APP =================
document.addEventListener('DOMContentLoaded', initializeApp);

