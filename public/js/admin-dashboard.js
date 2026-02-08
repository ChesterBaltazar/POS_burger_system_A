let currentReportData = null;
let currentChart = null;
let currentMonth = '';
let dashboardPollInterval = null;
let stockRequestPollInterval = null;
let autoRefreshInterval = null;
let salesChart = null;
let chartData = null;
let currentYear = new Date().getFullYear();
let currentMonthNum = new Date().getMonth() + 1;

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

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    
    let icon = '';
    switch(type) {
        case 'success': icon = '✓'; break;
        case 'error': icon = '✗'; break;
        case 'warning': icon = '⚠'; break;
        default: icon = 'ℹ';
    }
    
    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ================= AUTO-REFRESH SYSTEM (5 HOURS) =================
function initializeAutoRefresh() {
    console.log('Starting auto-refresh every 5 hours...');
    
    // Add indicator to dashboard header
    addRefreshIndicator();
    
    // Start auto-refresh interval (5 hours = 5 * 60 * 60 * 1000 = 18,000,000 ms)
    autoRefreshInterval = setInterval(() => {
        performAutoRefresh();
    }, 18000000); // 5 hours in milliseconds
    
    // Initial refresh after 2 seconds
    setTimeout(() => {
        performAutoRefresh();
    }, 2000);
}

function addRefreshIndicator() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const indicator = document.createElement('span');
        indicator.className = 'auto-refresh-indicator';
        indicator.title = 'Auto-refreshing every 5 hours';
        indicator.innerHTML = '⏳';
        dateElement.parentNode.insertBefore(indicator, dateElement.nextSibling);
    }
}

function performAutoRefresh() {
    console.log('Auto-refresh at', new Date().toLocaleTimeString());
    
    // Show refresh notification
    showNotification('Dashboard auto-refreshing...', 'info');
    
    // Refresh all data
    loadDashboardData();
    loadPendingStockRequests();
    updateStockRequestBadge();
    
    // Refresh chart data
    refreshChartData();
    
    // Show last updated time
    showLastUpdatedTime();
}

function showLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit' 
    });
    
    // Remove existing indicator
    const existing = document.getElementById('lastUpdatedIndicator');
    if (existing) existing.remove();
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'lastUpdatedIndicator';
    indicator.className = 'last-updated-indicator';
    indicator.textContent = `Auto-refreshed: ${timeString}`;
    document.body.appendChild(indicator);
    
    // Remove after animation
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 5000);
}

// ================= SALES CHART FUNCTIONS =================
function initSalesChart() {
    console.log('Initializing sales chart...');
    
    // Check if chart container exists
    const chartContainer = document.getElementById('chartContainer');
    if (!chartContainer) {
        console.log('Chart container not found');
        return;
    }
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        showNotification('Chart library failed to load. Please refresh the page.', 'error');
        chartContainer.innerHTML = '<div class="chart-error">Chart library failed to load</div>';
        return;
    }
    
    // Add canvas for chart
    chartContainer.innerHTML = '<canvas id="salesChart"></canvas>';
    
    loadSalesChartData();
    setupChartRefresh();
}

async function loadSalesChartData() {
    try {
        console.log('Loading sales chart data...');
        
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="chart-loading">Loading chart data...</div>';
        }
        
        // Update current year and month
        currentYear = new Date().getFullYear();
        currentMonthNum = new Date().getMonth() + 1;
        
        // Get current month name
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const currentMonthName = monthNames[currentMonthNum - 1];
        
        console.log(`Fetching data for ${currentMonthName} ${currentYear} to December ${currentYear}`);
        
        // Array to store promises for each month
        const monthPromises = [];
        const monthData = [];
        
        // Get data for each month from current month to December
        for (let month = currentMonthNum; month <= 12; month++) {
            console.log(`Fetching data for month: ${month}`);
            monthPromises.push(
                fetchMonthlySalesData(currentYear, month)
            );
        }
        
        // Wait for all promises to resolve
        const results = await Promise.allSettled(monthPromises);
        console.log(`Received ${results.length} results`);
        
        // Process results
        results.forEach((result, index) => {
            const monthNumber = currentMonthNum + index;
            const monthName = monthNames[monthNumber - 1];
            
            if (result.status === 'fulfilled' && result.value) {
                console.log(`Success for ${monthName}:`, result.value);
                monthData.push({
                    month: monthNumber,
                    monthName: monthName,
                    revenue: result.value.totalRevenue || 0,
                    profit: result.value.totalProfit || 0,
                    orders: result.value.totalOrders || 0
                });
            } else {
                console.warn(`Failed for ${monthName}:`, result.reason);
                // If API call fails, use zeros
                monthData.push({
                    month: monthNumber,
                    monthName: monthName,
                    revenue: 0,
                    profit: 0,
                    orders: 0
                });
            }
        });
        
        console.log('Processed month data:', monthData);
        chartData = monthData;
        renderSalesChart();
        
    } catch (error) {
        console.error('Error loading sales chart data:', error);
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="chart-error">Failed to load chart data. Please try again.</div>';
        }
    }
}

async function fetchMonthlySalesData(year, month) {
    try {
        console.log(`Fetching /api/reports/monthly/${year}/${month}`);
        const response = await fetch(`/api/reports/monthly/${year}/${month}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`Response for ${month}/${year}:`, result);
        
        if (result.success && result.data) {
            return result.data.summary;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.log(`Failed to fetch data for ${month}/${year}:`, error.message);
        // Return zero values for failed requests
        return {
            totalRevenue: 0,
            totalProfit: 0,
            totalOrders: 0
        };
    }
}

function renderSalesChart() {
    if (!chartData || chartData.length === 0) {
        console.warn('No chart data to render');
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="chart-error">No sales data available</div>';
        }
        return;
    }
    
    const chartContainer = document.getElementById('chartContainer');
    if (!chartContainer) {
        console.error('Chart container not found');
        return;
    }
    
    // Check if canvas exists, create if not
    let canvas = document.getElementById('salesChart');
    if (!canvas) {
        chartContainer.innerHTML = '<canvas id="salesChart"></canvas>';
        canvas = document.getElementById('salesChart');
    }
    
    if (!canvas) {
        console.error('Failed to create canvas element');
        chartContainer.innerHTML = '<div class="chart-error">Failed to create chart</div>';
        return;
    }
    
    // Destroy existing chart if it exists
    if (salesChart) {
        salesChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    // Prepare data for chart
    const months = chartData.map(data => {
        // Show abbreviated month names for better display
        return data.monthName.substring(0, 3);
    });
    
    const revenues = chartData.map(data => data.revenue);
    const profits = chartData.map(data => data.profit);
    
    console.log('Chart data:', { months, revenues, profits });
    
    // Create gradient for revenue bars
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(106, 13, 173, 0.8)');
    gradient.addColorStop(1, 'rgba(106, 13, 173, 0.2)');
    
    // Create gradient for profit line
    const profitGradient = ctx.createLinearGradient(0, 0, 0, 400);
    profitGradient.addColorStop(0, 'rgba(40, 167, 69, 0.8)');
    profitGradient.addColorStop(1, 'rgba(40, 167, 69, 0.2)');
    
    // Chart configuration
    try {
        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenues,
                        backgroundColor: gradient,
                        borderColor: '#6a0dad',
                        borderWidth: 2,
                        borderRadius: 5,
                        order: 2
                    },
                    {
                        label: 'Profit',
                        data: profits,
                        type: 'line',
                        fill: false,
                        borderColor: '#28a745',
                        borderWidth: 3,
                        tension: 0.4,
                        pointBackgroundColor: '#28a745',
                        pointBorderColor: '#fff',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
        
        console.log('Chart rendered successfully');
        
    } catch (error) {
        console.error('Error rendering chart:', error);
        chartContainer.innerHTML = '<div class="chart-error">Error rendering chart: ' + error.message + '</div>';
    }
}

function setupChartRefresh() {
    const refreshBtn = document.getElementById('refreshSalesChart');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            // Add spinning animation
            const icon = this.querySelector('i');
            icon.classList.add('spinning');
            this.classList.add('spinning');
            
            // Disable button during refresh
            this.disabled = true;
            
            try {
                await loadSalesChartData();
                showNotification('Chart refreshed successfully', 'success');
            } catch (error) {
                console.error('Error refreshing chart:', error);
                showNotification('Failed to refresh chart', 'error');
            } finally {
                // Remove spinning animation after delay
                setTimeout(() => {
                    icon.classList.remove('spinning');
                    this.classList.remove('spinning');
                    this.disabled = false;
                }, 500);
            }
        });
    }
}

function refreshChartData() {
    if (document.getElementById('chartContainer')) {
        loadSalesChartData();
    }
}

// ================= STOCK REQUEST FUNCTIONS =================
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
                ${request.productName || request.category || 'Product'} (${request.category || 'Uncategorized'}) - ${request.requestedBy || 'User'}
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
            
            const productName = request.productName || request.category || 'Product';
            
            return `
                <div class="stock-request-item">
                    <div class="request-info">
                        <div class="request-details">
                            <h5>${productName}</h5>
                            <p>
                                <strong>Category:</strong> ${request.category || 'Uncategorized'} | 
                                <strong>Requested by:</strong> ${request.requestedBy || 'User'} |
                                <strong>Date:</strong> ${formattedDate}
                            </p>
                            <p><strong>Urgency:</strong> 
                                <span style="color: ${getUrgencyColor(request.urgencyLevel)}">
                                    ${request.urgencyLevel.toUpperCase()}
                                </span>
                            </p>
                        </div>
                        <div class="request-actions">
                            <button class="btn-approve" onclick="approveRequest('${request._id}', '${productName}')">
                                Approve
                            </button>
                            <button class="btn-reject" onclick="rejectRequest('${request._id}', '${productName}')">
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
            showNotification(`Request for "${productName}" approved`, 'success');
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
            showNotification(`Request for "${productName}" rejected`, 'success');
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

function startStockRequestPolling() {
    loadPendingStockRequests();
    updateStockRequestBadge();
    
    stockRequestPollInterval = setInterval(() => {
        loadPendingStockRequests();
        updateStockRequestBadge();
    }, 30000); 
}

// ================= DASHBOARD FUNCTIONS =================
function updateDashboard(data) {
    // Update total sales with animation
    const totalSalesEl = document.getElementById('totalSales');
    if (totalSalesEl) {
        const newSalesValue = formatCurrency(data.totalSales || 0);
        if (totalSalesEl.textContent !== newSalesValue) {
            totalSalesEl.textContent = newSalesValue;
            totalSalesEl.classList.add('value-updated');
            setTimeout(() => totalSalesEl.classList.remove('value-updated'), 1000);
        }
    }

    // Update net profit with animation
    const netProfitEl = document.getElementById('netProfit');
    if (netProfitEl) {
        const newProfitValue = formatCurrency(data.netProfit || 0);
        if (netProfitEl.textContent !== newProfitValue) {
            netProfitEl.textContent = newProfitValue;
            netProfitEl.classList.add('value-updated');
            setTimeout(() => netProfitEl.classList.remove('value-updated'), 1000);
        }
    }

    // Update orders today with animation
    const ordersTodayEl = document.getElementById('ordersToday');
    if (ordersTodayEl) {
        const newOrdersValue = String(data.ordersToday || 0);
        if (ordersTodayEl.textContent !== newOrdersValue) {
            ordersTodayEl.textContent = newOrdersValue;
            ordersTodayEl.classList.add('value-updated');
            setTimeout(() => ordersTodayEl.classList.remove('value-updated'), 1000);
        }
    }

    // Update total customers
    const totalCustomersEl = document.getElementById('totalCustomers');
    if (totalCustomersEl) {
        const newCustomersValue = String(data.totalCustomers || 0);
        if (totalCustomersEl.textContent !== newCustomersValue) {
            totalCustomersEl.textContent = newCustomersValue;
            totalCustomersEl.classList.add('value-updated');
            setTimeout(() => totalCustomersEl.classList.remove('value-updated'), 1000);
        }
    }

    // Update recent sales
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
        console.error("Dashboard load error:", err);
    }
}

function startDashboardPolling() {
    loadDashboardData();
    dashboardPollInterval = setInterval(loadDashboardData, 30000);
}

// ================= LOGOUT FUNCTIONALITY =================
function setupLogoutButton() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            showLogoutConfirmation();
        });
    }
}

function showLogoutConfirmation() {
    const modal = document.createElement('div');
    modal.className = 'logout-confirmation-modal';
    modal.innerHTML = `
        <div class="logout-modal-content">
            <div class="logout-modal-header">
                <h3>Confirm Logout</h3>
                <button class="close-modal">×</button>
            </div>
            <div class="logout-modal-body">
                <p>Are you sure you want to logout?</p>
            </div>
            <div class="logout-modal-footer">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm">Logout</button>
            </div>
        </div>
    `;
    
    if (!document.getElementById('logout-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-modal-styles';
        style.textContent = `
            .logout-confirmation-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                animation: fadeIn 0.3s ease;
            }
            
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
            
            .logout-modal-header h3 {
                margin: 0;
                font-size: 1.2rem;
                color: #333;
            }
            
            .close-modal {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #dc3545;
                line-height: 1;
            }
            
            .close-modal:hover {
                color: #a71d2a;
            }
            
            .logout-modal-body {
                padding: 30px 20px;
                text-align: center;
            }
            
            .logout-modal-body p {
                margin: 0;
                font-size: 1rem;
                color: #555;
            }
            
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
            }
            
            .btn-cancel {
                background: #822222;
                color: white;
            }
            
            .btn-cancel:hover {
                background: #af2525;
            }
            
            .btn-confirm {
                background: #28a745;
                color: white;
            }
            
            .btn-confirm:hover {
                background: #1a732f;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { 
                    transform: translateY(20px);
                    opacity: 0;
                }
                to { 
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');
    
    const removeModal = () => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    };
    
    closeBtn.addEventListener('click', removeModal);
    cancelBtn.addEventListener('click', removeModal);
    confirmBtn.addEventListener('click', () => {
        removeModal();
        performLogout();
    });
}

async function performLogout() {
    try {
        const logoutBtn = document.querySelector('.logout-btn');
        const originalText = logoutBtn ? logoutBtn.textContent : '';
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
            logoutBtn.classList.add('loading');
        }

        showNotification('Logging out...', 'info');

        setTimeout(() => {
            const notifications = document.querySelectorAll('.notification-toast');
            notifications.forEach(notification => notification.remove());
        }, 100);

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                }
            });
        } catch (apiError) {
            console.log('Backend not available, clearing local storage only');
        }

        const posOrderCounter = localStorage.getItem('posOrderCounter');
        const themePreference = localStorage.getItem('theme');
        
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Restore necessary data
        if (posOrderCounter) {
            localStorage.setItem('posOrderCounter', posOrderCounter);
        }
        if (themePreference) {
            localStorage.setItem('theme', themePreference);
        }

        // Clear auth-related cookies
        document.cookie.split(";").forEach(function(c) {
            const cookieParts = c.split("=");
            const cookieName = cookieParts[0].trim();
            const sensitiveKeywords = ['auth', 'token', 'session', 'jwt', 'refresh'];

            if (sensitiveKeywords.some(keyword => cookieName.toLowerCase().includes(keyword))) {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });

        // Clear ALL intervals
        if (dashboardPollInterval) {
            clearInterval(dashboardPollInterval);
        }
        
        if (stockRequestPollInterval) {
            clearInterval(stockRequestPollInterval);
        }
        
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
        
        // Destroy chart
        if (salesChart) {
            salesChart.destroy();
            salesChart = null;
        }

        // Show success notification with longer duration
        showNotification('Logged out successfully! Redirecting to login page...', 'success');
        
        // Wait for notification to be visible before redirecting
        setTimeout(() => {
            window.location.replace('/');
        }, 2000); 

    } catch (error) {
        console.error('Logout error:', error);
        
        // Show error notification
        showNotification('Error during logout. Redirecting...', 'error');
        
        // Clear storage and redirect anyway
        const posOrderCounter = localStorage.getItem('posOrderCounter');
        localStorage.clear();
        if (posOrderCounter) {
            localStorage.setItem('posOrderCounter', posOrderCounter);
        }
        
        setTimeout(() => {
            window.location.replace('/');
        }, 1500);
    }
}

// ================= AUTH CHECK =================
function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const authToken = localStorage.getItem('authToken');
    const role = localStorage.getItem('role');
    
    if (!isAuthenticated || isAuthenticated !== 'true' || !authToken || !role || role !== 'admin') {
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
                showNotification('Session expired. Logging out...', 'warning');
                setTimeout(performLogout, 1000);
            } else if (sessionAge > maxSessionAge - 600000) {
                showNotification('Your session will expire in 10 minutes', 'warning');
            }
        }
    }, 300000); 
}

function resetSessionTimer() {
    localStorage.setItem('loginTime', Date.now().toString());
    startSessionTimer();
}

function setupActivityDetection() {
    ['click', 'mousemove', 'keydown', 'scroll', 'touchstart', 'mousedown'].forEach(event => {
        document.addEventListener(event, resetSessionTimer, { passive: true });
    });
}

// ================= SIDEBAR TOGGLE =================
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            
            const icon = sidebarToggle.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('active')) {
                    icon.className = 'bi bi-x-lg';
                } else {
                    icon.className = 'bi bi-list';
                }
            }
        });
        
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                const icon = sidebarToggle.querySelector('i');
                if (icon) {
                    icon.className = 'bi bi-list';
                }
            });
        }
        
        const menuItems = sidebar.querySelectorAll('.menu-item a');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    if (sidebarOverlay) {
                        sidebarOverlay.classList.remove('active');
                    }
                    const icon = sidebarToggle.querySelector('i');
                    if (icon) {
                        icon.className = 'bi bi-list';
                    }
                }
            });
        });
    }
    
    function handleResize() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (window.innerWidth > 768) {
            if (sidebar) sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            if (sidebarToggle) {
                const icon = sidebarToggle.querySelector('i');
                if (icon) icon.className = 'bi bi-list';
            }
        }
    }
    
    handleResize();
    window.addEventListener('resize', handleResize);
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
    setupLogoutButton();
    setupSidebarToggle();
    
    // Initialize auto-refresh (5 hours)
    initializeAutoRefresh();
    
    // Start initial data load
    loadDashboardData();
    loadPendingStockRequests();
    updateStockRequestBadge();
    
    // Initialize sales chart
    initSalesChart();
    
    console.log('Dashboard initialized with 5-hour auto-refresh and sales chart');
}

document.addEventListener('DOMContentLoaded', initDashboard);

// Export functions that might be used elsewhere
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;
window.loadDashboardData = loadDashboardData;
window.loadPendingStockRequests = loadPendingStockRequests;
window.updateStockRequestBadge = updateStockRequestBadge;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;