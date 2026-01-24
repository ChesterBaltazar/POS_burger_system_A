// Global variables for report data and chart
    let currentReportData = null;
    let currentChart = null;
    let currentMonth = '';

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

            showNotification('Successfully logged out!');

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
        
        // Add event listener for Print/PDF button
        document.getElementById('printPdfBtn').addEventListener('click', generatePDFReport);
    }

    document.addEventListener('DOMContentLoaded', initDashboard);

    // ================= REPORTS FUNCTIONALITY =================
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
                
                // Call the API to get real data
                const response = await fetch(`/api/reports/monthly/${currentYear}/${monthNumber}`);
                
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                }
                
                const report = await response.json();
                console.log('API Response:', report);
                
                if (!report.success) {
                    throw new Error(report.message || 'Failed to load report');
                }
                
                // Store report data globally
                currentReportData = report;
                currentReportData.monthName = selectedMonth;
                currentReportData.year = currentYear;
                
                // Render the report with real data
                renderReport(report, selectedMonth);
                
            } catch (error) {
                console.error('Error loading report:', error);
                contentBox2.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <h4 class="alert-heading">Error loading report</h4>
                        <p>${error.message}</p>
                        <p><small>Make sure you have created some orders in the POS system and the server is running.</small></p>
                        <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
                    </div>
                `;
            }
        }
    });

    // Function to render report with real data
    function renderReport(report, monthName) {
        const contentBox2 = document.querySelector('.content-box2');
        
        // Create table rows from sales data
        let tableRows = '';
        if (report.salesData && report.salesData.length > 0) {
            report.salesData.forEach(item => {
                tableRows += `
                    <tr>
                        <td>${item.productName || 'Unknown Product'}</td>
                        <td>${item.unitsSold.toLocaleString()}</td>
                        <td>₱${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td class="${item.profit >= 0 ? 'text-success' : 'text-danger'}">
                            ₱${(item.profit || (item.revenue * 0.3)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <small class="text-muted d-block">(${item.profitMargin || '30.00'}% margin)</small>
                        </td>
                    </tr>
                `;
            });
        } else {
            tableRows = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        No sales data for ${monthName} ${report.year}
                    </td>
                </tr>
            `;
        }
        
        // Create chart data - only if we have products
        let chartHTML = '';
        if (report.salesData && report.salesData.length > 0) {
            // Sort by units sold in descending order and take top 8
            const topProductsByUnits = report.salesData
                .filter(product => product.unitsSold > 0) // Only show products with sales
                .sort((a, b) => b.unitsSold - a.unitsSold)
                .slice(0, 8);
            
            const chartLabels = [];
            const chartData = [];
            const chartColors = ['#b91d47', '#00aba9', '#2b5797', '#e8c3b9', '#1e7145', '#ff9900', '#9900ff', '#00ff99'];
            
            topProductsByUnits.forEach((product, index) => {
                chartLabels.push(product.productName || 'Product ' + (index + 1));
                chartData.push(product.unitsSold || 0); // Use unitsSold instead of revenue
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
                                                `Revenue: ₱${(product?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            ];
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (chartError) {
                    console.error('Chart error:', chartError);
                }
            }, 100);
        } else {
            chartHTML = `
                <div class="text-center text-muted py-4">
                    <p>No data available for chart</p>
                </div>
            `;
        }
        
        contentBox2.innerHTML = `
            <div id="reportContent">
                <h4 style="color: #6a0dad; margin-bottom: 20px;">${monthName} ${report.year} Sales Report</h4>
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
                            <p><strong>Total Revenue:</strong> ₱${report.summary?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                            <p><strong>Total Profit:</strong> ₱${(report.summary?.totalProfit || (report.summary?.totalRevenue * 0.3) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p><strong>Total Items Sold:</strong> ${report.summary?.totalItems?.toLocaleString() || '0'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Total Orders:</strong> ${report.summary?.totalOrders?.toLocaleString() || '0'}</p>
                            <p><strong>Average Order Value:</strong> ₱${report.summary?.averageOrderValue || '0.00'}</p>
                            <p><strong>Average Items per Order:</strong> ${report.summary?.averageItemsPerOrder || '0.0'}</p>
                        </div>
                    </div>
                    ${chartHTML}
                </div>
            </div>
        `;
    }

   // ================= EXPORT FUNCTIONALITY =================
document.querySelector('.btn-warning').addEventListener('click', async function() {
    const selectedMonth = document.getElementById('allDates').value;
    if (!selectedMonth) {
        showNotification('nothing to print', 'error');
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
        showNotification('Exporting Excel report', 'success'); // Changed from 'info' to 'success'
        
        // Download the CSV file
        const response = await fetch(`/api/reports/export/${currentYear}/${monthNumber}`);
        
        if (!response.ok) {
            throw new Error('Failed to export report');
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
        showNotification('nothing to print', 'error');
        return;
    }

    try {
        showNotification('Generating printed report', 'success'); // Changed from 'green' to 'success'
        
        // Create a print-friendly version
        const reportContent = document.getElementById('reportContent');
        if (!reportContent) {
            throw new Error('No report content available');
        }

        // Clone the report content for printing
        const printContent = reportContent.cloneNode(true);
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        // Get chart image if available
        let chartImage = '';
        if (currentChart) {
            chartImage = currentChart.toBase64Image();
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
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="print-date">Generated on: ${new Date().toLocaleDateString()}</div>
                <h2>Angelo's Burger POS</h2>
                <h4>Sales Report - ${currentMonth} ${currentReportData.year}</h4>
                
                ${printContent.innerHTML}
                
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
                        }, 500);
                    }
                <\/script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
    } catch (error) {
        console.error('PDF generation error:', error);
        
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
        } else {
            showNotification('No report content to print', 'error');
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

    // Simple sidebar toggle for mobile only - Fixed version
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