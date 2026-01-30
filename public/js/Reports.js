// Global variables for report data and chart
let currentReportData = null;
let currentChart = null;
let currentMonth = '';
let eventSource = null;

// SSE Error handling and auto-reconnect
function setupSSEConnection() {
    if (eventSource) {
        eventSource.close();
    }

    try {
        eventSource = new EventSource('/api/dashboard/stream');

        eventSource.onopen = () => {
            console.log('SSE connection established');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') {
                    console.log('Connected to dashboard stream');
                } else if (data.type === 'update') {
                    // Handle dashboard updates if needed
                    console.log('Dashboard update received');
                }
            } catch (err) {
                console.error('Error parsing SSE message:', err);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            if (eventSource.readyState === EventSource.CLOSED) {
                console.log('SSE connection closed, attempting to reconnect...');
                eventSource.close();
                // Reconnect after 5 seconds
                setTimeout(() => {
                    if (document.hidden === false) {
                        setupSSEConnection();
                    }
                }, 5000);
            }
        };
    } catch (err) {
        console.error('Failed to create EventSource:', err);
    }
}

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
            console.log('Backend logout not available');
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

        showNotification('Logged out successfully', 'success');

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

// ================= AUTHENTICATION CHECK =================
function checkAuthentication() {
    const authToken = localStorage.getItem('authToken');
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (!authToken || !isAuthenticated || isAuthenticated !== 'true') {
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
    setupSSEConnection();
    
    // Add event listener for Print/PDF button
    document.getElementById('printPdfBtn').addEventListener('click', generatePDFReport);
    
    // Debug button for testing API
    setupDebugButton();
}

document.addEventListener('DOMContentLoaded', initDashboard);

// ================= REPORTS FUNCTIONALITY - FIXED =================
document.getElementById('allDates').addEventListener('change', async function() {
    const selectedMonth = this.value;
    currentMonth = selectedMonth;
    
    if (selectedMonth) {
        // Show loading state
        const contentBox2 = document.querySelector('.content-box2');
        contentBox2.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading ${selectedMonth} report...</p>
            </div>
        `;
        
        try {
            // Map month name to number
            const monthMap = {
                'January': 1, 'February': 2, 'March': 3, 'April': 4,
                'May': 5, 'June': 6, 'July': 7, 'August': 8,
                'September': 9, 'October': 10, 'November': 11, 'December': 12
            };
            
            const monthNumber = monthMap[selectedMonth];
            const currentYear = new Date().getFullYear();
            
            console.log(`Fetching report for ${currentYear}-${monthNumber} (${selectedMonth})`);
            
            // Get auth token
            const authToken = localStorage.getItem('authToken');
            
            // Call the API to get real data WITH AUTH HEADER
            const response = await fetch(`/api/reports/monthly/${currentYear}/${monthNumber}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                credentials: 'include' // Important for session cookies
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    showNotification('Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.replace('/');
                    }, 2000);
                    return;
                }
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            
            const report = await response.json();
            console.log('API Response:', report);
            
            if (!report.success) {
                throw new Error(report.message || 'Failed to load report');
            }
            
            // Store report data globally
            currentReportData = report.data || report; // Handle different response structures
            currentReportData.monthName = selectedMonth;
            currentReportData.year = currentYear;
            
            // Render the report with real data
            renderReport(currentReportData, selectedMonth);
            
        } catch (error) {
            console.error('Error loading report:', error);
            contentBox2.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Error loading report</h4>
                    <p>${error.message}</p>
                    <p><small>Make sure you have created some orders in the POS system and the server is running.</small></p>
                    <div class="mt-3">
                        <button class="btn btn-primary me-2" onclick="location.reload()">Try Again</button>
                        <button class="btn btn-secondary" onclick="testReportsAPI()">Test API Connection</button>
                    </div>
                </div>
            `;
        }
    }
});

// Function to render report with real data - IMPROVED
function renderReport(report, monthName) {
    const contentBox2 = document.querySelector('.content-box2');
    
    // Handle different response structures
    const salesData = report.salesData || report.data || [];
    const summary = report.summary || report;
    const year = report.year || new Date().getFullYear();
    
    // Create table rows from sales data
    let tableRows = '';
    if (salesData && salesData.length > 0) {
        salesData.forEach(item => {
            const profit = item.profit !== undefined ? item.profit : (item.revenue * 0.3);
            const profitMargin = item.profitMargin !== undefined ? item.profitMargin : '30.00';
            
            tableRows += `
                <tr>
                    <td>${item.productName || item.name || 'Unknown Product'}</td>
                    <td>${(item.unitsSold || item.quantity || 0).toLocaleString()}</td>
                    <td>₱${(item.revenue || item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="${profit >= 0 ? 'text-success' : 'text-danger'}">
                        ₱${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <small class="text-muted d-block">(${profitMargin}% margin)</small>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    No sales data for ${monthName} ${year}
                </td>
            </tr>
        `;
    }
    
    // Create chart data - only if we have products
    let chartHTML = '';
    if (salesData && salesData.length > 0) {
        // Sort by units sold in descending order and take top 8
        const topProductsByUnits = salesData
            .filter(product => (product.unitsSold || product.quantity || 0) > 0)
            .sort((a, b) => (b.unitsSold || b.quantity || 0) - (a.unitsSold || a.quantity || 0))
            .slice(0, 8);
        
        if (topProductsByUnits.length > 0) {
            const chartLabels = [];
            const chartData = [];
            const chartColors = ['#b91d47', '#00aba9', '#2b5797', '#e8c3b9', '#1e7145', '#ff9900', '#9900ff', '#00ff99'];
            
            topProductsByUnits.forEach((product, index) => {
                chartLabels.push(product.productName || product.name || `Product ${index + 1}`);
                chartData.push(product.unitsSold || product.quantity || 0);
            });
            
            chartHTML = `
                <div style="height: 350px; display: flex; justify-content: center; align-items: center; margin-top: 20px;">
                    <canvas id="myChart"></canvas>
                </div>
            `;
            
            // Initialize chart after content is loaded
            setTimeout(() => {
                try {
                    // Destroy previous chart if exists
                    if (currentChart) {
                        currentChart.destroy();
                    }
                    
                    const ctx = document.getElementById('myChart').getContext('2d');
                    currentChart = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: chartLabels,
                            datasets: [{
                                label: 'Units Sold',
                                backgroundColor: chartColors.slice(0, chartLabels.length),
                                data: chartData,
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Top Selling Products (Units Sold)'
                                },
                                legend: {
                                    position: 'right'
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.label || '';
                                            const value = context.raw;
                                            // Find the product to get revenue information
                                            const product = topProductsByUnits[context.dataIndex];
                                            return [
                                                `${label}: ${value} unit${value !== 1 ? 's' : ''}`,
                                                `Revenue: ₱${(product?.revenue || product?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            ];
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (chartError) {
                    console.error('Chart error:', chartError);
                    chartHTML = `<div class="alert alert-warning">Chart could not be loaded: ${chartError.message}</div>`;
                    contentBox2.querySelector('#chartContainer').innerHTML = chartHTML;
                }
            }, 100);
        } else {
            chartHTML = `
                <div class="text-center text-muted py-4">
                    <p>No sales data available for chart</p>
                </div>
            `;
        }
    } else {
        chartHTML = `
            <div class="text-center text-muted py-4">
                <p>No data available for chart</p>
            </div>
        `;
    }
    
    contentBox2.innerHTML = `
        <div id="reportContent">
            <h4 style="color: #6a0dad; margin-bottom: 20px;">${monthName} ${year} Sales Report</h4>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead style="background-color: #6a0dad; color: white;">
                        <tr>
                            <th>Product Name</th>
                            <th>Units Sold</th>
                            <th>Revenue</th>
                            <th>Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            <div class="mt-4">
                <h5>Summary</h5>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Total Revenue:</strong> ₱${(summary.totalRevenue || summary.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p><strong>Total Profit:</strong> ₱${(summary.totalProfit || summary.profit || (summary.totalRevenue * 0.3) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p><strong>Total Items Sold:</strong> ${(summary.totalItems || summary.itemsSold || 0).toLocaleString()}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Total Orders:</strong> ${(summary.totalOrders || summary.orders || 0).toLocaleString()}</p>
                        <p><strong>Average Order Value:</strong> ₱${(summary.averageOrderValue || summary.avgOrderValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p><strong>Average Items per Order:</strong> ${(summary.averageItemsPerOrder || summary.avgItemsPerOrder || 0).toFixed(1)}</p>
                    </div>
                </div>
                <div id="chartContainer">
                    ${chartHTML}
                </div>
            </div>
        </div>
    `;
}

// ================= EXPORT FUNCTIONALITY =================
document.querySelector('.btn-warning').addEventListener('click', async function() {
    const selectedMonth = document.getElementById('allDates').value;
    if (!selectedMonth) {
        showNotification('Please select a month first', 'error');
        return;
    }
    
    const monthMap = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    
    const monthNumber = monthMap[selectedMonth];
    const currentYear = new Date().getFullYear();
    
    try {
        showNotification('Exporting Excel report...', 'info');
        
        // Get auth token
        const authToken = localStorage.getItem('authToken');
        
        // Download the CSV file with auth header
        const response = await fetch(`/api/reports/export/${currentYear}/${monthNumber}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to export report: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${currentYear}-${monthNumber}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Report exported successfully!', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showNotification(`Export failed: ${error.message}`, 'error');
    }
});

// ================= PRINT FUNCTIONALITY =================
async function generatePDFReport() {
    if (!currentReportData || !currentMonth) {
        showNotification('No report data to print. Please select a month first.', 'error');
        return;
    }

    try {
        showNotification('Generating printable report...', 'info');
        
        const reportContent = document.getElementById('reportContent');
        if (!reportContent) {
            throw new Error('No report content available');
        }

        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        // Get chart image if available
        let chartImage = '';
        if (currentChart) {
            try {
                chartImage = currentChart.toBase64Image();
            } catch (e) {
                console.warn('Could not get chart image:', e);
            }
        }

        // Create print-friendly HTML
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sales Report - ${currentMonth} ${currentReportData.year}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h2 { color: #6a0dad; text-align: center; }
                    h4 { color: #333; border-bottom: 2px solid #6a0dad; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background-color: #6a0dad; color: white; padding: 10px; text-align: left; }
                    td { padding: 8px; border-bottom: 1px solid #ddd; }
                    .summary { display: flex; justify-content: space-between; margin: 20px 0; }
                    .summary-item { flex: 1; padding: 10px; }
                    .footer { text-align: center; margin-top: 50px; color: #666; font-size: 12px; }
                    .print-date { text-align: right; margin-bottom: 20px; }
                    .chart-container { text-align: center; margin: 20px 0; }
                    .chart-container img { max-width: 400px; height: auto; }
                    @media print {
                        body { margin: 0; padding: 10px; }
                        .no-print { display: none; }
                        .page-break { page-break-before: always; }
                    }
                </style>
            </head>
            <body>
                <div class="print-date">Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
                <h2>Angelo's Burger POS</h2>
                <h4>Sales Report - ${currentMonth} ${currentReportData.year}</h4>
                
                ${reportContent.innerHTML}
                
                ${chartImage ? `
                <div class="chart-container">
                    <h4>Top Selling Products Chart (Units Sold)</h4>
                    <img src="${chartImage}" alt="Sales Chart">
                </div>
                ` : ''}
                
                <div class="footer">
                    <p>Report generated by Angelo's Burger POS System</p>
                    <p>© ${new Date().getFullYear()} All rights reserved</p>
                </div>
                
                <script>
                    window.onload = function() {
                        // Auto-print after loading
                        setTimeout(function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        }, 500);
                    }
                <\/script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
    } catch (error) {
        console.error('Print generation error:', error);
        showNotification('Error generating print view: ' + error.message, 'error');
        
        // Fallback: Simple print of current report
        const reportContent = document.getElementById('reportContent');
        if (reportContent) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Sales Report - ${currentMonth}</title>
                    <style>
                        body { font-family: Arial; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h2>Sales Report - ${currentMonth}</h2>
                    ${reportContent.innerHTML}
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    }
}

// ================= NOTIFICATION FUNCTION =================
window.showNotification = window.showNotification || function(message, type = 'info') {
    // Create a simple notification
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
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: notificationFadeInOut 2.5s ease-in-out;
        max-width: 300px;
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
        `;
        document.head.appendChild(style);
    }
    
    document.querySelectorAll('.temp-notification').forEach(el => el.remove());
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 2500);
};

async function testReportsAPI() {
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;
    
    showNotification('Testing API connection...', 'info');
    
    console.log('=== API DEBUG TEST ===');
    console.log('Auth token exists:', !!localStorage.getItem('authToken'));
    console.log('Auth token:', localStorage.getItem('authToken') ? '✓' : '✗');
    console.log('Testing endpoint:', `/api/reports/monthly/${currentYear}/${currentMonthNum}`);
    
    try {
        const authToken = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/reports/monthly/${currentYear}/${currentMonthNum}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const text = await response.text();
        console.log('Response text (first 500 chars):', text.substring(0, 500));
        
        if (response.ok) {
            try {
                const data = JSON.parse(text);
                console.log('Parsed data structure:', data);
                
                // Show summary in alert
                alert(`API Test Results:\n\n` +
                      `Status: ${response.status} OK\n` +
                      `Success: ${data.success ? 'Yes' : 'No'}\n` +
                      `Data available: ${data.data ? 'Yes' : 'No'}\n` +
                      `Message: ${data.message || 'No message'}`);
                
                showNotification('API connection successful!', 'success');
            } catch (e) {
                console.error('JSON parse error:', e);
                alert(`API returned non-JSON response:\n\n${text.substring(0, 200)}...`);
                showNotification('API returned invalid JSON', 'error');
            }
        } else {
            alert(`API Error ${response.status}:\n\n${text}`);
            showNotification(`API error: ${response.status}`, 'error');
        }
    } catch (error) {
        console.error('Network error:', error);
        alert(`Network error:\n\n${error.message}\n\nCheck if server is running.`);
        showNotification('Network error: ' + error.message, 'error');
    }
}

// ================= SIDEBAR TOGGLE =================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - Sidebar toggle script running');
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    console.log('Elements:', {
        toggle: sidebarToggle,
        sidebar: sidebar,
        overlay: sidebarOverlay
    });
    
    if (sidebarToggle && sidebar) {
        console.log('Adding event listeners for sidebar toggle');
        
        // Toggle sidebar on button click
        sidebarToggle.addEventListener('click', function(e) {
            console.log('Toggle button clicked');
            e.stopPropagation();
            e.preventDefault();
            
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            
            // Change icon based on state
            const icon = sidebarToggle.querySelector('i');
            if (sidebar.classList.contains('active')) {
                icon.className = 'bi bi-x-lg';
                console.log('Sidebar opened');
            } else {
                icon.className = 'bi bi-list';
                console.log('Sidebar closed');
            }
        });
        
        // Close sidebar when clicking on overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                console.log('Overlay clicked');
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                if (sidebarToggle.querySelector('i')) {
                    sidebarToggle.querySelector('i').className = 'bi bi-list';
                }
            });
        }
        
        // Close sidebar when clicking on a menu item (optional for mobile)
        const menuItems = document.querySelectorAll('.menu-item a');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    console.log('Menu item clicked on mobile');
                    sidebar.classList.remove('active');
                    if (sidebarOverlay) {
                        sidebarOverlay.classList.remove('active');
                    }
                    if (sidebarToggle.querySelector('i')) {
                        sidebarToggle.querySelector('i').className = 'bi bi-list';
                    }
                }
            });
        });
        
        // Handle window resize
        function handleResize() {
            console.log('Window resized to:', window.innerWidth);
            if (window.innerWidth > 768) {
                // On desktop, ensure sidebar is visible and overlay is hidden
                if (sidebar) {
                    sidebar.classList.remove('active');
                }
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('active');
                }
                if (sidebarToggle && sidebarToggle.querySelector('i')) {
                    sidebarToggle.querySelector('i').className = 'bi bi-list';
                }
            }
        }
        
        // Initial check
        handleResize();
        
        // Listen for resize
        window.addEventListener('resize', handleResize);
        
        console.log('Sidebar toggle event listeners added successfully');
    } else {
        console.error('Sidebar elements not found!');
    }
});

// ================= ADDITIONAL HELPER FUNCTIONS =================

// Test if server is reachable
async function testServerConnection() {
    try {
        const response = await fetch('/api/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Server connection test failed:', error);
        return false;
    }
}

// Auto-refresh report if data is stale
function setupAutoRefresh() {
    setInterval(() => {
        if (currentMonth && document.visibilityState === 'visible') {
            const select = document.getElementById('allDates');
            if (select.value) {
                select.dispatchEvent(new Event('change'));
            }
        }
    }, 300000); // Every 5 minutes
}

// Initialize auto-refresh after page loads
setTimeout(setupAutoRefresh, 10000);