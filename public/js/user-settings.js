// ================= UTILITY FUNCTIONS =================
        
        // Function to capitalize first letter
        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
        
        // Function to show notification
        function showNotification(message, type = 'success') {
            // Check if notification container exists, create it if not
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
        
        // ================= USER FUNCTIONS =================
        
        // Function to get current user data
        async function getCurrentUser() {
            try {
                // Try to get from localStorage first
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    return parsed.user || parsed;
                }
                
                // Try to fetch from server
                const response = await fetch('/api/auth/current-user-simple');
                const result = await response.json();
                
                if (result.success && result.user) {
                    localStorage.setItem('currentUser', JSON.stringify(result));
                    return result.user;
                }
                
                // Fallback user
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
        
        // Load profile data function
        async function loadProfileData() {
            const isManualRefresh = sessionStorage.getItem('profileManuallyRefreshed') === 'true';
            
            document.getElementById('profile-username').textContent = 'Loading...';
            document.getElementById('profile-username-display').textContent = '--';
            document.getElementById('profile-role-badge').textContent = 'Loading...';
            
            const userData = await getCurrentUser();
            
            if (userData && userData.username) {
                document.getElementById('profile-username').textContent = userData.username || 'User';
                document.getElementById('profile-username-display').textContent = userData.username || '--';
                
                const roleBadge = document.getElementById('profile-role-badge');
                const role = userData.role || 'user';
                roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
                roleBadge.className = `role-badge ${role}`;
                
                if (isManualRefresh) {
                    showNotification('Profile refreshed');
                    sessionStorage.removeItem('profileManuallyRefreshed');
                }
            } else {
                document.getElementById('profile-username').textContent = 'Not Logged In';
                document.getElementById('profile-role-badge').textContent = 'Unknown';
                document.getElementById('profile-role-badge').className = 'role-badge';
                
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
                const spinner = refreshBtn.querySelector('.loading-spinner');
                
                // Show loading state
                historyBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 30px;">
                            Loading request history...
                        </td>
                    </tr>
                `;
                spinner.style.display = 'inline-block';
                refreshBtn.disabled = true;
                
                // Fetch from server
                const response = await fetch('/api/stock-requests');
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load requests');
                }
                
                const requests = result.requests || [];
                
                if (requests.length === 0) {
                    historyBody.innerHTML = '';
                    emptyHistory.style.display = 'block';
                    historyTable.style.display = 'none';
                } else {
                    emptyHistory.style.display = 'none';
                    historyTable.style.display = 'table';
                    
                    // Sort by date (newest first)
                    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    
                    historyBody.innerHTML = requests.map(request => {
                        const date = new Date(request.createdAt);
                        const formattedDate = date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                        
                        let statusClass = 'status-pending';
                        if (request.status === 'approved') statusClass = 'status-approved';
                        if (request.status === 'rejected') statusClass = 'status-rejected';
                        if (request.status === 'fulfilled') statusClass = 'status-completed';
                        
                        let urgencyClass = 'urgency-medium';
                        if (request.urgencyLevel === 'low') urgencyClass = 'urgency-low';
                        if (request.urgencyLevel === 'high') urgencyClass = 'urgency-high';
                        if (request.urgencyLevel === 'critical') urgencyClass = 'urgency-critical';
                        
                        let categoryClass = 'category-other';
                        let categoryText = 'Other';
                        if (request.category === 'Bun') {
                            categoryClass = 'category-buns';
                            categoryText = 'Buns';
                        } else if (request.category === 'Drink') {
                            categoryClass = 'category-drinks';
                            categoryText = 'Drinks';
                        } else if (request.category === 'Meat') {
                            categoryClass = 'category-meat';
                            categoryText = 'Meat';
                        }
                        
                        return `
                            <tr>
                                <td>${formattedDate}</td>
                                <td>${request.productName}</td>
                                <td>
                                    <span class="category-badge ${categoryClass}">${categoryText}</span>
                                </td>
                                <td>
                                    <span class="${urgencyClass}">
                                        ${request.urgencyLevel.charAt(0).toUpperCase() + request.urgencyLevel.slice(1)}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge ${statusClass}">
                                        ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
                
                spinner.style.display = 'none';
                refreshBtn.disabled = false;
                
            } catch (error) {
                console.error('Error loading stock request history:', error);
                document.getElementById('requestHistoryBody').innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 30px; color: #dc3545;">
                            Error loading requests: ${error.message}
                        </td>
                    </tr>
                `;
                showNotification('Error loading request history', 'error');
            }
        }

        // Submit stock request to server
        async function submitStockRequest(event) {
            event.preventDefault();
            
            const submitBtn = document.getElementById('submitRequestBtn');
            const originalText = submitBtn.textContent;
            
            try {
                // Disable button and show loading
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading-spinner"></span>Submitting...';
                
                // Get form values
                const itemName = document.getElementById('item-name').value.trim();
                const category = document.getElementById('item-category').value;
                const urgency = document.getElementById('urgency').value;
                
                // Basic validation
                if (!itemName) {
                    showNotification('Please enter item name', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    return;
                }
                
                if (!category) {
                    showNotification('Please select category', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    return;
                }
                
                // Get current user
                const userData = await getCurrentUser();
                
                // Prepare request data for server
                const requestData = {
                    productName: itemName,
                    category: category,
                    urgencyLevel: urgency,
                    requestedBy: userData.username || 'User'
                };
                
                // Send request to server
                const response = await fetch('/api/stock-requests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.message || 'Failed to submit request');
                }
                
                if (result.success) {
                    // Reset form
                    document.getElementById('item-name').value = '';
                    document.getElementById('item-category').value = '';
                    document.getElementById('urgency').value = 'medium';
                    
                    // Show success message
                    showNotification(`Stock request submitted for "${itemName}"`);
                    
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
            document.getElementById('item-name').value = '';
            document.getElementById('item-category').value = '';
            document.getElementById('urgency').value = 'medium';
            showNotification('cleared');
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
            document.querySelector(`.page-btn[data-page="${pageId}"]`).classList.add('active');
            
            // Load data for the page
            if (pageId === 'profile') {
                sessionStorage.removeItem('profileManuallyRefreshed');
                loadProfileData();
            } else if (pageId === 'stock-request') {
                loadStockRequestHistory();
            }
        }

        // ================= EVENT LISTENERS =================

        // Menu item click handler
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', function () {
                document.querySelectorAll('.menu-item').forEach(i => {
                    i.classList.remove('active');
                });
                this.classList.add('active');
            });
        });

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

                showNotification('Logged out');

                // Redirect after notification shows
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);

            } catch (error) {
                console.error('Logout error:', error);
                showNotification('Logged out with issues. Redirecting...', 'error');
                
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
            
            // Set up page button click handlers
            document.querySelectorAll('.page-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const pageId = this.getAttribute('data-page');
                    switchPage(pageId);
                });
            });
            
            // Set up stock request form submission
            document.getElementById('submitRequestBtn').addEventListener('click', submitStockRequest);
            
            // Set up clear form button
            document.getElementById('clearFormBtn').addEventListener('click', clearForm);
            
            // Set up profile refresh button
            document.getElementById('refreshProfileBtn').addEventListener('click', function() {
                sessionStorage.setItem('profileManuallyRefreshed', 'true');
                loadProfileData();
            });
            
            // Set up history refresh button
            document.getElementById('refreshHistoryBtn').addEventListener('click', loadStockRequestHistory);
            
            // Allow Enter key in form fields to submit
            document.querySelectorAll('.stock-request-form input, .stock-request-form select').forEach(field => {
                field.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('submitRequestBtn').click();
                    }
                });
            });
        }

        document.addEventListener('DOMContentLoaded', initDashboard);
