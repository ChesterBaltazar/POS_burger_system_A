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
            font-size: 14px,
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
}

// Function to get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken') || '';
}

// ================= USER FUNCTIONS =================

// Function to get current user data
async function getCurrentUser() {
    try {
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
        
        try {
            const response = await fetch('/api/auth/current-user-simple');
            
            // Check if response is ok
            if (!response.ok) {
                console.error('API response status:', response.status);
                throw new Error(`HTTP ${response.status}`);
            }
            
            const text = await response.text();
            
            // Validate response text is not empty
            if (!text || text.trim() === '') {
                console.error('Empty API response');
                return {
                    username: "User",
                    role: "user"
                };
            }
            
            // Try to parse as JSON
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('Error parsing API response:', parseError);
                console.error('Response text:', text.substring(0, 100));
                return {
                    username: "User",
                    role: "user"
                };
            }
            
            if (result && result.success && result.user) {
                localStorage.setItem('currentUser', JSON.stringify(result));
                return result.user;
            } else if (result && result.user) {
                localStorage.setItem('currentUser', JSON.stringify(result));
                return result.user;
            }
        } catch (fetchError) {
            console.error('Error fetching user:', fetchError);
        }
        
        return {
            username: "User",
            role: "user"
        };
        
    } catch (error) {
        console.error('Error getting current user:', error);
        return {
            username: "User",
            role: "user"
        };
    }
}

// Loads profile data function
async function loadProfileData() {
    const isManualRefresh = sessionStorage.getItem('profileManuallyRefreshed') === 'true';
    
    const usernameElement = document.getElementById('profile-username');
    const usernameDisplayElement = document.getElementById('profile-username-display');
    const roleBadgeElement = document.getElementById('profile-role-badge');
    
    if (usernameElement) usernameElement.textContent = 'Loading...';
    if (usernameDisplayElement) usernameDisplayElement.textContent = '--';
    if (roleBadgeElement) roleBadgeElement.textContent = 'Loading...';
    
    const userData = await getCurrentUser();
    
    if (userData && userData.username) {
        if (usernameElement) usernameElement.textContent = userData.username || 'User';
        if (usernameDisplayElement) usernameDisplayElement.textContent = userData.username || '--';
        
        if (roleBadgeElement) {
            const role = userData.role || 'user';
            roleBadgeElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            roleBadgeElement.className = `role-badge ${role}`;
        }
        
        if (isManualRefresh) {
            showNotification('Profile refreshed');
            sessionStorage.removeItem('profileManuallyRefreshed');
        }
    } else {
        if (usernameElement) usernameElement.textContent = 'Not Logged In';
        if (roleBadgeElement) {
            roleBadgeElement.textContent = 'Unknown';
            roleBadgeElement.className = 'role-badge';
        }
        
        if (isManualRefresh) {
            showNotification('Please try again later', 'error');
            sessionStorage.removeItem('profileManuallyRefreshed');
        }
    }
}

// ================= STOCK REQUEST FUNCTIONS =================

// Load stock request history from server
async function loadStockRequestHistory() {
    try {
        const historyBody = document.getElementById('requestHistoryBody');
        const emptyHistory = document.getElementById('emptyHistory');
        const historyTable = document.getElementById('requestHistoryTable');
        const refreshBtn = document.getElementById('refreshHistoryBtn');
        
        if (!historyBody) return;
        
        // Show loading state
        historyBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px;">
                    Loading request history...
                </td>
            </tr>
        `;
        
        if (refreshBtn) {
            const spinner = refreshBtn.querySelector('.loading-spinner');
            if (spinner) spinner.style.display = 'inline-block';
            refreshBtn.disabled = true;
        }
        
        // Get auth token
        const token = getAuthToken();
        
        // Fetch from server with auth header
        const response = await fetch('/api/stock-requests', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Handle unauthorized
        if (response.status === 401) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            showNotification('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }
        
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error('Invalid response from server');
        }
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to load requests');
        }
        
        const requests = result.requests || [];
        
        if (requests.length === 0) {
            historyBody.innerHTML = '';
            if (emptyHistory) emptyHistory.style.display = 'block';
            if (historyTable) historyTable.style.display = 'none';
        } else {
            if (emptyHistory) emptyHistory.style.display = 'none';
            if (historyTable) historyTable.style.display = 'table';
            
            // Sort by date (newest first)
            requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            historyBody.innerHTML = requests.map(request => {
                const date = new Date(request.createdAt);
                const formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                
                // Status classes
                let statusClass = 'status-pending';
                if (request.status === 'approved') statusClass = 'status-approved';
                if (request.status === 'rejected') statusClass = 'status-rejected';
                if (request.status === 'fulfilled') statusClass = 'status-completed';
                
                // Urgency classes
                let urgencyClass = 'urgency-medium';
                if (request.urgencyLevel === 'low') urgencyClass = 'urgency-low';
                if (request.urgencyLevel === 'high') urgencyClass = 'urgency-high';
                if (request.urgencyLevel === 'critical') urgencyClass = 'urgency-critical';
                
                return `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${request.productName || request.category}</td>
                        <td>
                            <span class="category-badge">${request.category}</span>
                        </td>
                        <td>
                            <span class="${urgencyClass}">
                                ${request.urgencyLevel ? capitalizeFirstLetter(request.urgencyLevel) : 'Medium'}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${statusClass}">
                                ${request.status ? capitalizeFirstLetter(request.status) : 'Pending'}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        if (refreshBtn) {
            const spinner = refreshBtn.querySelector('.loading-spinner');
            if (spinner) spinner.style.display = 'none';
            refreshBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Error loading stock request history:', error);
        const historyBody = document.getElementById('requestHistoryBody');
        if (historyBody) {
            historyBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 30px; color: #dc3545;">
                        Error loading requests: ${error.message}
                    </td>
                </tr>
            `;
        }
        showNotification('Error loading request history', 'error');
    }
}

// Submit stock request to server
async function submitStockRequest(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitRequestBtn');
    if (!submitBtn) return;
    
    const originalText = submitBtn.textContent;
    
    try {
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span>Submitting...';
        
        // Get form values - category, item, and urgency
        const categorySelect = document.getElementById('item-category');
        const itemSelect = document.getElementById('item-name');
        const urgencySelect = document.getElementById('urgency');
        
        if (!categorySelect || !itemSelect || !urgencySelect) {
            showNotification('Form elements not found', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
        
        const category = categorySelect.value;
        const item = itemSelect.value;
        const urgency = urgencySelect.value;
        
        // Validation
        if (!category || !item) {
            showNotification('Please select both product and item', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
        
        // Get current user
        const userData = await getCurrentUser();
        
        // Prepare request data - using item as productName
        const requestData = {
            productName: item,  // Using item name as productName
            category: category,
            urgencyLevel: urgency
        };
        
        // Get auth token
        const token = getAuthToken();
        
        // Send request to server
        const response = await fetch('/api/stock-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        // Handle unauthorized
        if (response.status === 401) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            showNotification('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }
        
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error('Invalid response from server');
        }
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to submit request');
        }
        
        if (result.success) {
            // Clear form
            categorySelect.value = '';
            urgencySelect.value = 'medium';
            
            // Show success message
            showNotification(`Stock request submitted for "${category}"`);
            
            // Reload history
            await loadStockRequestHistory();
        } else {
            throw new Error(result.message || 'Request failed');
        }
        
    } catch (error) {
        console.error('Error submitting stock request:', error);
        showNotification(error.message || 'Error submitting request. Please try again.', 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Clear form function
function clearForm() {
    const categorySelect = document.getElementById('item-category');
    const itemSelect = document.getElementById('item-name');
    const urgencySelect = document.getElementById('urgency');
    
    if (categorySelect) categorySelect.value = '';
    if (itemSelect) itemSelect.innerHTML = '<option value="">Select an item</option>';
    if (urgencySelect) urgencySelect.value = 'medium';
    
    showNotification('Form cleared');
}

// ================= PAGE MANAGEMENT =================

// Switch between profile and stock request pages
function switchPage(pageId) {
    // Hide all content boxes
    document.querySelectorAll('.content-box-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected content box
    const selectedContent = document.getElementById(`${pageId}-box-content`);
    if (selectedContent) {
        selectedContent.classList.add('active');
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
    } else if (pageId === 'stock-request') {
        loadStockRequestHistory();
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
                },
                credentials: 'include'
            });
        } catch (apiError) {
            console.log('Backend logout not available or failed:', apiError.message);
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
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
        });

        showNotification('Logged out', 'success');

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
    // Clear any existing manual refresh flags
    sessionStorage.removeItem('profileManuallyRefreshed');
    
    // Load initial page data
    setTimeout(() => {
        loadProfileData();
    }, 100);
    
    // Page switching
    document.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            switchPage(pageId);
        });
    });
    
    // Stock request form events
    const submitBtn = document.getElementById('submitRequestBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitStockRequest);
    }
    
    const clearFormBtn = document.getElementById('clearFormBtn');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', clearForm);
    }
    
    // Refresh buttons
    const refreshProfileBtn = document.getElementById('refreshProfileBtn');
    if (refreshProfileBtn) {
        refreshProfileBtn.addEventListener('click', function() {
            sessionStorage.setItem('profileManuallyRefreshed', 'true');
            loadProfileData();
        });
    }
    
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', loadStockRequestHistory);
    }
    
    // Allow Enter key in form fields to submit
    document.querySelectorAll('.stock-request-form input, .stock-request-form select').forEach(field => {
        field.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const submitBtn = document.getElementById('submitRequestBtn');
                if (submitBtn) submitBtn.click();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initDashboard);