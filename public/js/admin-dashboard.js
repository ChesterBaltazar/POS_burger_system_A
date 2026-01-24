
    const role = localStorage.getItem("role");
        if (role === "user") {
            window.location.href = "/Dashboard/user-dashboard";
        }


        function updateDate() {
            const now = new Date();
            document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { 
                weekday:'long', 
                year:'numeric', 
                month:'long', 
                day:'numeric' 
            });
        }
        updateDate();

        
        function formatCurrency(amount) {
            return '₱' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }


        function showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'notification-toast';
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => notification.classList.add('show'), 10);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        // ================= STOCK REQUEST Function =================

        function showStockRequestToast(request) {
            const toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) {
                const container = document.createElement('div');
                container.id = 'toastContainer';
                document.body.appendChild(container);
            }
            
            const toast = document.createElement('div');
            toast.className = `stock-toast ${request.urgencyLevel || 'medium'}`;
            toast.innerHTML = `
                <span class="toast-icon"></span>
                <div class="toast-content">
                    <div class="toast-title">New Stock Request</div>
                    <div class="toast-message">
                        ${request.productName} (${request.category}) - ${request.requestedBy}
                    </div>
                </div>
                <button class="close-toast" onclick="this.parentElement.remove()">×</button>
            `;
            
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 8000);
            

            playNotificationSound();
            

            updateStockRequestBadge();
        }


        function playNotificationSound() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (error) {
                console.log('Audio not supported');
            }
        }


        async function updateStockRequestBadge() {
            try {
                const response = await fetch('/api/stock-requests/pending-count');
                if (!response.ok) return;
                
                const result = await response.json();
                if (result.success && result.count > 0) {
                    const badge = document.getElementById('inventoryNotificationBadge');
                    badge.textContent = result.count;
                    badge.style.display = 'inline-block';
                    

                    const panelBadge = document.getElementById('pendingCountBadge');
                    panelBadge.textContent = result.count;
                    panelBadge.style.display = 'inline-block';
                } else {
                    const badge = document.getElementById('inventoryNotificationBadge');
                    badge.style.display = 'none';
                    
                    const panelBadge = document.getElementById('pendingCountBadge');
                    panelBadge.style.display = 'none';
                }
            } catch (error) {
                console.log('Error updating badge:', error.message);
            }
        }


        async function loadPendingStockRequests() {
            try {
                const response = await fetch('/api/stock-requests');
                if (!response.ok) {
                    throw new Error('Failed to load requests');
                }
                
                const result = await response.json();
                const requests = result.requests || [];
                

                const pendingRequests = requests.filter(req => req.status === 'pending');
                
                const container = document.getElementById('stockRequestsContainer');
                
                if (pendingRequests.length === 0) {
                    container.innerHTML = '<div class="no-requests">No stock requests</div>';
                    document.getElementById('pendingCountBadge').style.display = 'none';
                    return;
                }
                

                pendingRequests.sort((a, b) => {
                    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
                });
                

                const displayRequests = pendingRequests.slice(0, 3);
                
                container.innerHTML = displayRequests.map(request => {
                    const date = new Date(request.createdAt);
                    const formattedDate = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    return `
                        <div class="stock-request-item">
                            <div class="request-info">
                                <div class="request-details">
                                    <h5>${request.productName}</h5>
                                    <p>
                                        <strong>Category:</strong> ${request.category} | 
                                        <strong>Requested by:</strong> ${request.requestedBy} |
                                        <strong>Date:</strong> ${formattedDate}
                                    </p>
                                    <p><strong>Urgency:</strong> 
                                        <span style="color: ${getUrgencyColor(request.urgencyLevel)}">
                                            ${request.urgencyLevel.toUpperCase()}
                                        </span>
                                    </p>
                                </div>
                                <div class="request-actions">
                                    <button class="btn-approve" onclick="approveRequest('${request._id}', '${request.productName}')">
                                        Approve
                                    </button>
                                    <button class="btn-reject" onclick="rejectRequest('${request._id}', '${request.productName}')">
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                

                const panelBadge = document.getElementById('pendingCountBadge');
                panelBadge.textContent = pendingRequests.length;
                panelBadge.style.display = 'inline-block';
                
            } catch (error) {
                console.error('Error loading stock requests:', error);
                document.getElementById('stockRequestsContainer').innerHTML = 
                    '<div class="no-requests">Error loading requests</div>';
            }
        }


        function getUrgencyColor(urgency) {
            switch(urgency) {
                case 'critical': return '#dc3545';
                case 'high': return '#fd7e14';
                case 'medium': return '#ffc107';
                case 'low': return '#28a745';
                default: return '#6c757d';
            }
        }


        async function approveRequest(requestId, productName) {
            if (!confirm(`Approve stock request for "${productName}"?`)) {
                return;
            }
            
            try {
                const response = await fetch(`/api/stock-requests/${requestId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'approved' })
                });
                
                if (response.ok) {
                    showNotification(`Request for "${productName}" approved`);
                    loadPendingStockRequests();
                    updateStockRequestBadge();
                } else {
                    throw new Error('Failed to approve request');
                }
            } catch (error) {
                console.error('Error approving request:', error);
                showNotification('Error approving request', 'error');
            }
        }


        async function rejectRequest(requestId, productName) {
            if (!confirm(`Reject stock request for "${productName}"?`)) {
                return;
            }
            
            try {
                const response = await fetch(`/api/stock-requests/${requestId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'rejected' })
                });
                
                if (response.ok) {
                    showNotification(`Request for "${productName}" rejected`);
                    loadPendingStockRequests();
                    updateStockRequestBadge();
                } else {
                    throw new Error('Failed to reject request');
                }
            } catch (error) {
                console.error('Error rejecting request:', error);
                showNotification('Error rejecting request', 'error');
            }
        }


        let stockRequestPollInterval = null;
        
        function startStockRequestPolling() {

            loadPendingStockRequests();
            updateStockRequestBadge();
            

            stockRequestPollInterval = setInterval(() => {
                loadPendingStockRequests();
                updateStockRequestBadge();
            }, 30000);
        }

        // ================= DASHBOARD FUNCTIONS =================


        function updateConnectionStatus(status) {
            const statusEl = document.getElementById('connectionStatus');
            statusEl.className = `status-indicator status-${status}`;
            statusEl.textContent = status === 'connected' ? 'Live' : 
                                  status === 'disconnected' ? 'Reconnecting...' : 
                                  'Connecting...';
        }


        function updateDashboard(data) {
            const totalSalesEl = document.getElementById('totalSales');
            const newSalesValue = formatCurrency(data.totalSales || 0);
            if (totalSalesEl.textContent !== newSalesValue) {
                totalSalesEl.textContent = newSalesValue;
                totalSalesEl.classList.add('updated');
                setTimeout(() => totalSalesEl.classList.remove('updated'), 600);
            }

            const netProfitEl = document.getElementById('netProfit');
            const newProfitValue = formatCurrency(data.netProfit || 0);
            if (netProfitEl.textContent !== newProfitValue) {
                netProfitEl.textContent = newProfitValue;
                netProfitEl.classList.add('updated');
                setTimeout(() => netProfitEl.classList.remove('updated'), 600);
            }

            const ordersTodayEl = document.getElementById('ordersToday');
            const newOrdersValue = String(data.ordersToday ?? 0);
            if (ordersTodayEl.textContent !== newOrdersValue) {
                ordersTodayEl.textContent = newOrdersValue;
                ordersTodayEl.classList.add('updated');
                setTimeout(() => ordersTodayEl.classList.remove('updated'), 600);
            }

            const totalCustomersEl = document.getElementById('totalCustomers');
            const newCustomersValue = String(data.totalCustomers ?? 0);
            if (totalCustomersEl.textContent !== newCustomersValue) {
                totalCustomersEl.textContent = newCustomersValue;
                totalCustomersEl.classList.add('updated');
                setTimeout(() => totalCustomersEl.classList.remove('updated'), 600);
            }


            const salesItems = document.querySelectorAll('#recentSalesContainer .sales-item');
            salesItems.forEach((item, i) => {
                const sale = data.recentSales?.[i];
                if (sale) {
                    item.style.display = "flex";
                    item.querySelector('h4').textContent = sale.orderNumber || "N/A";
                    item.querySelector('p').textContent = sale.customerName || "Walk-in";
                    item.querySelector('.order-time').textContent = new Date(sale.createdAt).toLocaleTimeString([], {
                        hour:'2-digit',
                        minute:'2-digit',
                        hour12:true
                    });
                    item.querySelector('.order-amount').textContent = formatCurrency(sale.totalAmount || 0);
                    const statusEl = item.querySelector('.order-status');
                    statusEl.textContent = sale.status ?? "completed";
                    statusEl.className = `order-status status-${sale.status ?? "completed"}`;
                } else {
                    item.style.display = "none";
                }
            });


            const alertItems = document.querySelectorAll('#lowStockContainer .alert-item');
            alertItems.forEach((item, i) => {
                const alert = data.lowStockAlerts?.[i];
                if (alert) {
                    item.style.display = "flex";
                    item.querySelector('.alert-text').innerHTML = 
                        `<h5>${alert.name}</h5><p>Only ${alert.currentStock} left (Min ${alert.minStock})</p>`;
                } else {
                    item.style.display = "none";
                }
            });
        }


        async function loadDashboardData() {
            try {
                const response = await fetch('/api/dashboard/stats');
                if (!response.ok) throw new Error(`Status ${response.status}`);
                const result = await response.json();
                if (!result.success || typeof result.data !== "object") {
                    throw new Error("Invalid API response format");
                }
                updateDashboard(result.data);
            } catch (err) {
                console.error("❌ Dashboard load error:", err);
            }
        }


        let eventSource = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        function initRealtimeUpdates() {
            if (eventSource) {
                eventSource.close();
            }

            eventSource = new EventSource('/api/dashboard/stream');

            eventSource.onopen = () => {
                updateConnectionStatus('connected');
                reconnectAttempts = 0;
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'connected') {
                        console.log('Connected to real time updates');
                    } else if (data.type === 'update') {
                        updateDashboard(data.stats);
                        showNotification('Dashboard updated!');
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };

            eventSource.onerror = (error) => {
                console.error('connection error:', error);
                updateConnectionStatus('disconnected');
                eventSource.close();
                

                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                    setTimeout(initRealtimeUpdates, delay);
                } else {
                    showNotification('Connection lost. Please refresh the page.');
                }
            };
        }

        // ================= LOGOUT FUNCTIONALITY =================
        document.querySelector('.logout-btn').addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                performLogout();
            }
        });

        async function performLogout() {
            try {
                const logoutBtn = document.querySelector('.logout-btn');
                const originalText = logoutBtn.textContent;
                logoutBtn.textContent = 'Logging out...';
                logoutBtn.disabled = true;

                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                        }
                    });
                } catch (apiError) {
                    console.log('Backend not available');
                }

                const posOrderCounter = localStorage.getItem('posOrderCounter');
                localStorage.clear();
                
                if (posOrderCounter) {
                    localStorage.setItem('posOrderCounter', posOrderCounter);
                }

                sessionStorage.clear();

                document.cookie.split(";").forEach(function(c) {
                    const cookieName = c.split("=")[0].trim();

                    if (cookieName.includes('auth') || cookieName.includes('token') || cookieName.includes('session')) {
                        document.cookie = cookieName + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    }
                });

                if (eventSource) {
                    eventSource.close();
                }
                
                if (stockRequestPollInterval) {
                    clearInterval(stockRequestPollInterval);
                }

                showNotification('logged out');

                setTimeout(() => {
                    window.location.replace('/');
                }, 1000);

            } catch (error) {
                console.error('Logout error:', error);
                
                const posOrderCounter = localStorage.getItem('posOrderCounter');
                localStorage.clear();
                if (posOrderCounter) {
                    localStorage.setItem('posOrderCounter', posOrderCounter);
                }
                window.location.replace('/');
            }
        }

        // ================= AUTH CHECK =================
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

        // ================= SESSION MANAGEMENT =================
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

        // ================= INITIALIZATION =================
        function initDashboard() {
            if (!checkAuthentication()) {
                return;
            }

            if (!localStorage.getItem('loginTime')) {
                localStorage.setItem('loginTime', Date.now().toString());
            }

            startSessionTimer();
            setupActivityDetection();
            loadDashboardData();
            initRealtimeUpdates();
            

            startStockRequestPolling();
        }

        document.addEventListener('DOMContentLoaded', initDashboard);
        
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
