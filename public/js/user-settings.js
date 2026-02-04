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

// Function to get current user data
async function getCurrentUser() {
    console.log('getCurrentUser called');
    try {
        // First check localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed && (parsed.user || parsed.username)) {
                    console.log('Using cached user data');
                    return parsed.user || parsed;
                }
            } catch (parseError) {
                console.error('Error parsing stored user:', parseError);
                localStorage.removeItem('currentUser');
            }
        }
        
        // If not in localStorage or invalid, try API
        if (!isAuthenticated()) {
            console.log('No authentication token found');
            return {
                username: "Guest",
                role: "guest"
            };
        }
        
        try {
            console.log('Fetching user data from API...');
            const response = await fetch('/api/auth/current-user-simple', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
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
                localStorage.setItem('currentUser', JSON.stringify(userData));
                console.log('User data saved to localStorage');
                return userData;
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
        const userData = await getCurrentUser();
        console.log('Loaded user data:', userData);
        
        if (userData && userData.username) {
            if (usernameElement) usernameElement.textContent = userData.username || 'User';
            if (usernameDisplayElement) usernameDisplayElement.textContent = userData.username || '--';
            if (emailElement) emailElement.textContent = userData.email || 'Not provided';
            
            if (roleBadgeElement) {
                const role = userData.role || 'user';
                roleBadgeElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
                roleBadgeElement.className = `role-badge ${role}`;
            }
            
            if (isManualRefresh) {
                showNotification('Profile refreshed successfully');
                sessionStorage.removeItem('profileManuallyRefreshed');
            }
        } else {
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

// ================= STOCK REQUEST FUNCTIONS =================

// Load stock request history from server
async function loadStockRequestHistory() {
    console.log('loadStockRequestHistory called');
    try {
        const historyBody = document.getElementById('requestHistoryBody');
        const emptyHistory = document.getElementById('emptyHistory');
        const historyTable = document.getElementById('requestHistoryTable');
        const refreshBtn = document.getElementById('refreshHistoryBtn');
        
        if (!historyBody) {
            console.error('History body element not found!');
            return;
        }
        
        // Check authentication
        if (!isAuthenticated()) {
            historyBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #f44336;">
                        Please login to view stock request history
                    </td>
                </tr>
            `;
            if (emptyHistory) emptyHistory.style.display = 'none';
            if (historyTable) historyTable.style.display = 'table';
            return;
        }
        
        // Show loading state
        historyBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 30px;">
                    <div class="loading-spinner" style="margin: 0 auto;"></div>
                    <p>Loading request history...</p>
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
        console.log('Token for request:', token ? 'Present' : 'Missing');
        
        // Fetch from server with auth header
        const response = await fetch('/api/stock-requests', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Stock request history response status:', response.status);
        console.log('Stock request history response URL:', response.url);
        
        // Handle unauthorized
        if (response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            historyBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #f44336;">
                        Session expired. Please login again.
                    </td>
                </tr>
            `;
            showNotification('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }
        
        // Handle 404 specifically
        if (response.status === 404) {
            console.error('API endpoint not found: /api/stock-requests');
            console.log('Full response:', response);
            historyBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #f44336;">
                        Stock request feature is currently unavailable. Please try again later.
                    </td>
                </tr>
            `;
            showNotification('Stock request feature is temporarily unavailable', 'error');
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Failed to load requests: ${response.status}`);
        }
        
        let result;
        try {
            result = await response.json();
            console.log('Stock request result:', result);
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            throw new Error('Invalid response from server');
        }
        
        const requests = result.requests || result.data || [];
        
        console.log('Loaded requests:', requests.length);
        
        if (requests.length === 0) {
            historyBody.innerHTML = '';
            if (emptyHistory) emptyHistory.style.display = 'block';
            if (historyTable) historyTable.style.display = 'none';
        } else {
            if (emptyHistory) emptyHistory.style.display = 'none';
            if (historyTable) historyTable.style.display = 'table';
            
            // Sort by date (newest first)
            requests.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
            
            historyBody.innerHTML = requests.map((request, index) => {
                const date = new Date(request.createdAt || request.date || new Date());
                const formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                
                // Status classes
                let statusClass = 'status-pending';
                if (request.status === 'approved') statusClass = 'status-approved';
                if (request.status === 'rejected') statusClass = 'status-rejected';
                if (request.status === 'fulfilled' || request.status === 'completed') statusClass = 'status-completed';
                
                // Urgency classes
                let urgencyClass = 'urgency-medium';
                const urgency = request.urgencyLevel || request.urgency || 'medium';
                if (urgency === 'low') urgencyClass = 'urgency-low';
                if (urgency === 'high') urgencyClass = 'urgency-high';
                if (urgency === 'critical') urgencyClass = 'urgency-critical';
                
                return `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${request.productName || request.item || `Request ${index + 1}`}</td>
                        <td>
                            <span class="${urgencyClass}">
                                ${capitalizeFirstLetter(urgency)}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${statusClass}">
                                ${capitalizeFirstLetter(request.status || 'pending')}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
            
            showNotification('Request history loaded successfully');
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
                    <td colspan="4" style="text-align: center; padding: 30px; color: #dc3545;">
                        ${error.message === 'Failed to fetch' ? 'Network error. Please check your connection.' : error.message}
                    </td>
                </tr>
            `;
        }
        showNotification('Error loading request history', 'error');
    }
}

// Submit stock request to server
async function submitStockRequest(event) {
    console.log('submitStockRequest called');
    if (event) event.preventDefault();
    
    const submitBtn = document.getElementById('submitRequestBtn');
    if (!submitBtn) {
        console.error('Submit button not found!');
        return;
    }
    
    const originalText = submitBtn.textContent;
    
    try {
        // Check authentication
        if (!isAuthenticated()) {
            showNotification('Please login to submit stock requests', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            return;
        }
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner" style="margin-right: 8px;"></span>Submitting...';
        
        // Get form values
        const categorySelect = document.getElementById('item-category');
        const itemInput = document.getElementById('item-name');
        const urgencySelect = document.getElementById('urgency');
        const quantityInput = document.getElementById('item-quantity') || { value: '1' };
        const notesInput = document.getElementById('item-notes') || { value: '' };
        
        if (!categorySelect || !itemInput || !urgencySelect) {
            showNotification('Form elements not found. Please refresh the page.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
        
        const category = categorySelect.value.trim();
        const item = itemInput.value.trim();
        const urgency = urgencySelect.value;
        const quantity = quantityInput.value.trim() || '1';
        const notes = notesInput.value.trim();
        
        // Enhanced validation
        if (!category || category === "") {
            showNotification('Please select a category', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            categorySelect.focus();
            return;
        }
        
        if (!item || item === "") {
            showNotification('Please enter an item name', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            itemInput.focus();
            return;
        }
        
        if (item.length < 2) {
            showNotification('Item name must be at least 2 characters', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            itemInput.focus();
            return;
        }
        
        // Prepare request data
        const requestData = {
            productName: item,
            category: category,
            urgencyLevel: urgency || 'medium',
            quantity: parseInt(quantity) || 1
        };
        
        if (notes) {
            requestData.notes = notes;
        }
        
        console.log('Submitting stock request:', requestData);
        
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
        
        console.log('Submit response status:', response.status);
        console.log('Submit response URL:', response.url);
        
        // Handle unauthorized
        if (response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            showNotification('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }
        
        // Handle 404 specifically
        if (response.status === 404) {
            console.error('API endpoint not found: /api/stock-requests (POST)');
            showNotification('Stock request feature is currently unavailable. Please try again later.', 'error');
            return;
        }
        
        let result;
        try {
            const responseText = await response.text();
            console.log('Response text:', responseText);
            
            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            console.error('Error reading response:', error);
            throw new Error('Unable to read server response');
        }
        
        if (!response.ok) {
            const errorMessage = result.message || result.error || 'Failed to submit request';
            throw new Error(errorMessage);
        }
        
        if (result.success || response.ok) {
            // Clear form
            categorySelect.value = '';
            itemInput.value = '';
            urgencySelect.value = 'medium';
            if (quantityInput && quantityInput.value) quantityInput.value = '1';
            if (notesInput && notesInput.value) notesInput.value = '';
            
            // Show success message
            showNotification(`Stock request submitted for "${item}"`);
            
            // Reload history
            await loadStockRequestHistory();
            
            // Switch to history tab
            switchPage('stock-request');
        } else {
            throw new Error(result.message || 'Request submission failed');
        }
        
    } catch (error) {
        console.error('Error submitting stock request:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Session expired. Please login again.';
        } else if (error.message.includes('ValidationError')) {
            errorMessage = 'Invalid data submitted. Please check your selections.';
        } else if (error.message.includes('404')) {
            errorMessage = 'Stock request feature is temporarily unavailable.';
        }
        
        showNotification(errorMessage || 'Error submitting request. Please try again.', 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Clear form function
function clearForm() {
    const categorySelect = document.getElementById('item-category');
    const itemInput = document.getElementById('item-name');
    const urgencySelect = document.getElementById('urgency');
    const quantityInput = document.getElementById('item-quantity');
    const notesInput = document.getElementById('item-notes');
    
    if (categorySelect) categorySelect.value = '';
    if (itemInput) itemInput.value = '';
    if (urgencySelect) urgencySelect.value = 'medium';
    if (quantityInput) quantityInput.value = '1';
    if (notesInput) notesInput.value = '';
    
    showNotification('Form cleared');
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
    
    // Stock request form events
    const stockRequestForm = document.getElementById('stockRequestForm');
    if (stockRequestForm) {
        stockRequestForm.addEventListener('submit', submitStockRequest);
    } else {
        const submitBtn = document.getElementById('submitRequestBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', submitStockRequest);
        }
    }
    
    const clearFormBtn = document.getElementById('clearFormBtn');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', clearForm);
    }
    
    // Refresh buttons
    const refreshProfileBtn = document.getElementById('refreshProfileBtn');
    if (refreshProfileBtn) {
        refreshProfileBtn.addEventListener('click', function() {
            console.log('Refreshing profile...');
            sessionStorage.setItem('profileManuallyRefreshed', 'true');
            loadProfileData();
        });
    }
    
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', function() {
            console.log('Refreshing history...');
            loadStockRequestHistory();
        });
    }
    
    // Allow Enter key in form fields to submit
    const formFields = document.querySelectorAll('#stockRequestForm input, #stockRequestForm select, #stockRequestForm textarea');
    formFields.forEach(field => {
        field.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitStockRequest();
            }
        });
    });
    
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
            
            .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .status-pending {
                background: #FFC107;
                color: #333;
            }
            
            .status-approved {
                background: #4CAF50;
                color: white;
            }
            
            .status-rejected {
                background: #f44336;
                color: white;
            }
            
            .status-completed {
                background: #2196F3;
                color: white;
            }
            
            .urgency-low {
                background: #4CAF50;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .urgency-medium {
                background: #FFC107;
                color: #333;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .urgency-high {
                background: #FF9800;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .urgency-critical {
                background: #f44336;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
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
        submitBtn: document.getElementById('submitRequestBtn'),
        historyBody: document.getElementById('requestHistoryBody')
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
            '/api/stock-requests',
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