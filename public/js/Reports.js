// This should be in /public/js/Reports.js
let currentReportData = null;
let currentChart = null;
let currentMonth = '';
let eventSource = null;
let sseConnectionAttempts = 0;
const MAX_SSE_ATTEMPTS = 3;

// Pagination variables
let currentPage = 1;
const recordsPerPage = 10;
let totalPages = 1;
let paginatedData = [];

function setupSSEConnection() {
    if (sseConnectionAttempts >= MAX_SSE_ATTEMPTS) {
        console.log('Maximum SSE connection attempts reached. Giving up.');
        return;
    }
    
    if (eventSource) {
        eventSource.close();
    }

    try {
        console.log(`Attempting SSE connection (attempt ${sseConnectionAttempts + 1}/${MAX_SSE_ATTEMPTS})`);
        eventSource = new EventSource('/api/dashboard/stream');

        eventSource.onopen = () => {
            console.log('SSE connection established');
            sseConnectionAttempts = 0;
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') {
                    console.log('Connected to dashboard stream');
                } else if (data.type === 'update') {
                    console.log('Dashboard update received');
                }
            } catch (err) {
                console.error('Error parsing SSE message:', err);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            sseConnectionAttempts++;
            
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            
            if (error.target && error.target.readyState === EventSource.CLOSED) {
                console.log('SSE endpoint not found (404). This feature may not be available.');
                sseConnectionAttempts = MAX_SSE_ATTEMPTS;
                localStorage.setItem('sseDisabled', 'true');
                return;
            }
            
            if (sseConnectionAttempts < MAX_SSE_ATTEMPTS && document.hidden === false) {
                console.log(`Will retry connection in 10 seconds... (${MAX_SSE_ATTEMPTS - sseConnectionAttempts} attempts remaining)`);
                setTimeout(() => {
                    setupSSEConnection();
                }, 10000);
            } else if (sseConnectionAttempts >= MAX_SSE_ATTEMPTS) {
                console.log('Maximum SSE connection attempts reached. Giving up.');
            }
        };
    } catch (err) {
        console.error('Failed to create EventSource:', err);
        sseConnectionAttempts++;
        
        if (sseConnectionAttempts < MAX_SSE_ATTEMPTS) {
            setTimeout(() => {
                setupSSEConnection();
            }, 10000);
        }
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

// ================= TOTAL SALES FUNCTIONALITY =================
function updateTotalSales(totalRevenue, monthName, year) {
    const totalSalesValue = document.getElementById('totalSalesValue');
    const salesPeriod = document.getElementById('salesPeriod');
    
    if (totalSalesValue && salesPeriod) {
        totalSalesValue.textContent = `₱${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        salesPeriod.textContent = monthName && year ? `${monthName} ${year}` : 'All Time';
    }
}

// ================= PAGINATION FUNCTIONS =================
function setupPagination(data) {
    if (!data || data.length === 0) {
        totalPages = 1;
        currentPage = 1;
        paginatedData = [];
        renderPaginationControls();
        return [];
    }
    
    totalPages = Math.ceil(data.length / recordsPerPage);
    currentPage = 1;
    paginatedData = data;
    
    renderPaginationControls();
    return getCurrentPageData();
}

function getCurrentPageData() {
    if (!paginatedData || paginatedData.length === 0) {
        return [];
    }
    
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return paginatedData.slice(startIndex, endIndex);
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    
    currentPage = page;
    renderPaginationControls();
    
    // Re-render the table with current page data
    if (currentReportData) {
        renderReport(currentReportData, currentMonth);
    }
}

function renderPaginationControls() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <nav aria-label="Page navigation">
            <ul class="pagination justify-content-center">
    `;
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="goToPage(${currentPage - 1})" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </button>
        </li>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page if not in range
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <button class="page-link" onclick="goToPage(1)">1</button>
            </li>
            ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
        `;
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link" onclick="goToPage(${i})">${i}</button>
            </li>
        `;
    }
    
    // Last page if not in range
    if (endPage < totalPages) {
        paginationHTML += `
            ${endPage < totalPages - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
            <li class="page-item">
                <button class="page-link" onclick="goToPage(${totalPages})">${totalPages}</button>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" onclick="goToPage(${currentPage + 1})" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </button>
        </li>
    `;
    
    paginationHTML += `
            </ul>
        </nav>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // Add page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'text-center text-muted mt-2';
    pageInfo.innerHTML = `
        <small>Page ${currentPage} of ${totalPages} | 
        Showing ${Math.min(recordsPerPage, paginatedData.length - (currentPage - 1) * recordsPerPage)} of ${paginatedData.length} records</small>
    `;
    paginationContainer.appendChild(pageInfo);
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
    
    // Only setup SSE if not disabled
    if (localStorage.getItem('sseDisabled') !== 'true') {
        setupSSEConnection();
    } else {
        console.log('SSE connection is disabled for this session');
    }
    
    // Create pagination container if it doesn't exist
    const contentBox2 = document.querySelector('.content-box2');
    if (contentBox2 && !contentBox2.querySelector('#paginationContainer')) {
        const paginationDiv = document.createElement('div');
        paginationDiv.id = 'paginationContainer';
        paginationDiv.className = 'mt-4';
        contentBox2.appendChild(paginationDiv);
    }
    
    //dropdown event listeners
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    document.getElementById('exportPdfBtn').addEventListener('click', generatePDFReport);
    
    setupDebugButton();
}

document.addEventListener('DOMContentLoaded', initDashboard);

// ================= REPORTS FUNCTIONALITY =================
document.getElementById('allDates').addEventListener('change', async function() {
    const selectedMonth = this.value;
    currentMonth = selectedMonth;
    currentPage = 1; // Reset to first page when month changes
    
    if (selectedMonth) {
        const contentBox2 = document.querySelector('.content-box2');
        contentBox2.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading ${selectedMonth} report...</p>
            </div>
            <div id="paginationContainer" class="mt-4"></div>
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
                credentials: 'include' 
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
            currentReportData = report.data || report; 
            currentReportData.monthName = selectedMonth;
            currentReportData.year = currentYear;
            
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
                <div id="paginationContainer" class="mt-4"></div>
            `;
        }
    }
});

// Function to render report with real data
function renderReport(report, monthName) {
    const contentBox2 = document.querySelector('.content-box2');
    
    // Handles different response structures
    const salesData = report.salesData || report.data || [];
    const summary = report.summary || report;
    const year = report.year || new Date().getFullYear();
    
    console.log('Sales data received:', salesData);
    console.log('Sample sale item:', salesData[0]);
    
    // Calculate totals from ALL data (not just current page)
    const totalSales = salesData.reduce((sum, item) => sum + (item.revenue || item.total || 0), 0);
    const totalItems = salesData.reduce((sum, item) => sum + (item.unitsSold || item.quantity || 0), 0);
    const totalProfit = salesData.reduce((sum, item) => sum + (item.profit || (item.revenue * 0.5) || 0), 0);
    const totalOrders = summary.totalOrders || summary.orders || 0;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;
    
    // Setup pagination and get current page data
    const currentPageData = setupPagination(salesData);
    
    // Creates table rows from CURRENT PAGE data only
    let tableRows = '';
    if (currentPageData && currentPageData.length > 0) {
        currentPageData.forEach(item => {
            const profit = item.profit !== undefined ? item.profit : (item.revenue * 0.5);
            const profitMargin = item.profitMargin !== undefined ? item.profitMargin : '50.00';
            
            // Get user info - handle different possible field names
            // ADMIN ID (698562f2d6b7c2978833e2bd) should show as "User"
            let userName = item.userName || item.cashierName || item.employeeName || 
                          (item.user && item.user.name) || 
                          (item.cashier && item.cashier.name) ||
                          (item.employee && item.employee.name) ||
                          'Unknown';
            
            let userId = item.userId || item.cashierId || item.employeeId || 
                        (item.user && item.user.id) ||
                        (item.cashier && item.cashier.id) ||
                        (item.employee && item.employee.id) ||
                        '';
            
            // Check if this is the admin ID and change to "User"
            if (userId === '698562f2d6b7c2978833e2bd') {
                userName = 'User';
            }
            
            tableRows += `
                <tr>
                    <td>${item.productName || item.name || 'Unknown Product'}</td>
                    <td>${(item.unitsSold || item.quantity || 0).toLocaleString()}</td>
                    <td>₱${(item.revenue || item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${userName}</td>
                    <td class="${profit >= 0 ? 'text-success' : 'text-danger'}">
                        ₱${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <small class="text-muted d-block">(${profitMargin}% gross profit)</small>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    No sales data for ${monthName} ${year}
                </td>
            </tr>
        `;
    }
    
    // Create user/cashier summary
    let userSummary = '';
    if (salesData && salesData.length > 0) {
        // Group sales by user
        const userSales = {};
        salesData.forEach(item => {
            // Get user info - handle different possible field names
            let userName = item.userName || item.cashierName || item.employeeName || 
                          (item.user && item.user.name) || 
                          (item.cashier && item.cashier.name) ||
                          (item.employee && item.employee.name) ||
                          'Unknown';
            
            let userId = item.userId || item.cashierId || item.employeeId || 
                        (item.user && item.user.id) ||
                        (item.cashier && item.cashier.id) ||
                        (item.employee && item.employee.id) ||
                        'unknown';
            
            // Check if this is the admin ID and change to "User"
            if (userId === '698562f2d6b7c2978833e2bd') {
                userName = 'User';
            }
            
            const userKey = `${userName}_${userId}`;
            
            if (!userSales[userKey]) {
                userSales[userKey] = {
                    name: userName,
                    id: userId,
                    totalRevenue: 0,
                    totalItems: 0,
                    totalOrders: 0
                };
            }
            
            userSales[userKey].totalRevenue += item.revenue || item.total || 0;
            userSales[userKey].totalItems += item.unitsSold || item.quantity || 0;
            userSales[userKey].totalOrders += 1;
        });
        
        // Convert to array and sort by revenue
        const userSalesArray = Object.values(userSales).sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        if (userSalesArray.length > 0) {
            userSummary = `
                <div class="mt-4">
                    <h5 style="color: #333; margin-bottom: 15px;">Employee/Cashier Performance</h5>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead style="background-color: #343a40; color: white;">
                                <tr>
                                    <th>Employee/Cashier</th>
                                    <th>Total Revenue</th>
                                    <th>Total Items Sold</th>
                                    <th>Total Orders</th>
                                    <th>Avg. Order Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userSalesArray.map(user => `
                                    <tr>
                                        <td>${user.name}</td>
                                        <td>₱${user.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td>${user.totalItems.toLocaleString()}</td>
                                        <td>${user.totalOrders.toLocaleString()}</td>
                                        <td>₱${(user.totalOrders > 0 ? user.totalRevenue / user.totalOrders : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }
    
    let chartHTML = '';
    if (salesData && salesData.length > 0) {
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
            
            setTimeout(() => {
                try {
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
                    const chartContainer = contentBox2.querySelector('#chartContainer');
                    if (chartContainer) {
                        chartContainer.innerHTML = chartHTML;
                    }
                }
            }, 100);
        } else {
            chartHTML = `
                <div class="text-center text-muted py-4">
                    <p>No data available for chart</p>
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
                            <th>Employee/Cashier</th>
                            <th>Gross Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f8f9fa; font-weight: bold;">
                            <td>Total</td>
                            <td>${totalItems.toLocaleString()}</td>
                            <td>₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td>-</td>
                            <td>₱${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div id="paginationContainer" class="mt-4"></div>
            
            ${userSummary}
            
            <div class="mt-4">
                <h5 style="color: #333; margin-bottom: 15px;">Summary</h5>
                <div class="row">
                    <div class="col-md-12">
                        <div class="summary-section" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                            <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 15px;">
                                Total Sales: <span style="color: #333;">₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px;">
                                <div>
                                    <p style="margin-bottom: 8px; font-size: 15px;">
                                        <strong style="color: #555; min-width: 160px; display: inline-block;">Total Revenue:</strong> 
                                        <span style="color: #333; font-weight: 600;">
                                            ₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </p>
                                    <p style="margin-bottom: 8px; font-size: 15px;">
                                        <strong style="color: #555; min-width: 160px; display: inline-block;">Total Gross Profit:</strong> 
                                        <span style="color: #333; font-weight: 600;">
                                            ₱${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </p>
                                    <p style="margin-bottom: 8px; font-size: 15px;">
                                        <strong style="color: #555; min-width: 160px; display: inline-block;">Total Items Sold:</strong> 
                                        <span style="color: #333; font-weight: 600;">
                                            ${totalItems.toLocaleString()}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <p style="margin-bottom: 8px; font-size: 15px;">
                                        <strong style="color: #555; min-width: 160px; display: inline-block;">Total Orders:</strong> 
                                        <span style="color: #333; font-weight: 600;">
                                            ${totalOrders.toLocaleString()}
                                        </span>
                                    </p>
                                    <p style="margin-bottom: 8px; font-size: 15px;">
                                        <strong style="color: #555; min-width: 160px; display: inline-block;">Average Order Value:</strong> 
                                        <span style="color: #333; font-weight: 600;">
                                            ₱${avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </p>
                                    <p style="margin-bottom: 8px; font-size: 15px;">
                                        <strong style="color: #555; min-width: 160px; display: inline-block;">Average Items per Order:</strong> 
                                        <span style="color: #333; font-weight: 600;">
                                            ${avgItemsPerOrder.toFixed(1)}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="chartContainer" style="margin-top: 30px;">
                    ${chartHTML}
                </div>
            </div>
        </div>
    `;
    
    // Re-render pagination controls after content is loaded
    renderPaginationControls();
}

// ================= EXCEL EXPORT FUNCTIONALITY =================
async function exportToExcel() {
    const selectedMonth = document.getElementById('allDates').value;
    if (!selectedMonth) {
        showNotification('Please select a month first', 'error');
        return;
    }
    
    if (!currentReportData) {
        showNotification('No report data available. Please load a report first.', 'error');
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
        showNotification('Generating Excel report...', 'info');
        
        const authToken = localStorage.getItem('authToken');
        
        let endpoint = `/api/reports/export-excel/${currentYear}/${monthNumber}`;
        let filename = `sales-report-${currentYear}-${monthNumber}.xlsx`;
        
        try {
            const testResponse = await fetch(endpoint, {
                method: 'HEAD',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (!testResponse.ok) {
                endpoint = `/api/reports/export/${currentYear}/${monthNumber}`;
                filename = `sales-report-${currentYear}-${monthNumber}.csv`;
            }
        } catch (e) {
            endpoint = `/api/reports/export/${currentYear}/${monthNumber}`;
            filename = `sales-report-${currentYear}-${monthNumber}.csv`;
        }
        
        console.log(`Using endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to export report: ${response.status} ${response.statusText}`);
        }
        
        // Checks content type
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') || 
            contentType.includes('application/octet-stream')) {
            // Excel file
            const blob = await response.blob();
            downloadBlob(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } else if (contentType.includes('text/csv') || filename.endsWith('.csv')) {
            // CSV file
            const csvText = await response.text();
            await convertCSVtoExcel(csvText, filename.replace('.csv', '.xlsx'));
        } else {
            const blob = await response.blob();
            downloadBlob(blob, filename, 'application/octet-stream');
        }
        
        showNotification('Excel report exported successfully!', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        
        //Generate Excel from current data
        if (currentReportData) {
            showNotification('Server export failed, generating Excel from current data...', 'warning');
            await generateExcelFromCurrentData(selectedMonth, monthNumber, currentYear);
        } else {
            showNotification(`Export failed: ${error.message}`, 'error');
        }
    }
}

// Helps function to download blob
function downloadBlob(blob, filename, contentType) {
    const url = window.URL.createObjectURL(new Blob([blob], { type: contentType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Converts CSV to Excel using SheetJS
async function convertCSVtoExcel(csvData, filename) {
    try {
        // Load SheetJS library dynamically
        if (typeof XLSX === 'undefined') {
            await loadSheetJS();
        }
        
        // Converts CSV to workbook
        const workbook = XLSX.read(csvData, { type: 'string' });
        
        // Write to file
        XLSX.writeFile(workbook, filename);
        
    } catch (error) {
        console.error('CSV to Excel conversion error:', error);
        
        //download as CSV
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, filename.replace('.xlsx', '.csv'), 'text/csv');
        
        throw new Error('Excel conversion failed, downloaded as CSV instead');
    }
}

// Loads SheetJS library dynamically
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Generates Excel from current report data
async function generateExcelFromCurrentData(monthName, monthNumber, year) {
    try {
        if (typeof XLSX === 'undefined') {
            await loadSheetJS();
        }
        
        const workbook = XLSX.utils.book_new();
        
        // Prepares data for Excel
        const salesData = currentReportData.salesData || currentReportData.data || [];
        const summary = currentReportData.summary || currentReportData;
        
        // Creates sales data sheet
        const salesWorksheetData = [
            ['Product Name', 'Units Sold', 'Revenue', 'Employee/Cashier', 'Gross Profit', 'Gross Profit Margin %'],
            ...salesData.map(item => {
                // Get user info - handle different possible field names
                let userName = item.userName || item.cashierName || item.employeeName || 
                              (item.user && item.user.name) || 
                              (item.cashier && item.cashier.name) ||
                              (item.employee && item.employee.name) ||
                              'Unknown';
                
                let userId = item.userId || item.cashierId || item.employeeId || 
                            (item.user && item.user.id) ||
                            (item.cashier && item.cashier.id) ||
                            (item.employee && item.employee.id) ||
                            '';
                
                // Check if this is the admin ID and change to "User"
                if (userId === '698562f2d6b7c2978833e2bd') {
                    userName = 'User';
                }
                
                return [
                    item.productName || item.name || 'Unknown Product',
                    item.unitsSold || item.quantity || 0,
                    item.revenue || item.total || 0,
                    userName,
                    item.profit || (item.revenue * 0.5) || 0,
                    item.profitMargin || '50.00'
                ];
            })
        ];
        
        const salesWorksheet = XLSX.utils.aoa_to_sheet(salesWorksheetData);
        XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Sales Data');
        
        // Creates user performance sheet
        const userSales = {};
        salesData.forEach(item => {
            // Get user info - handle different possible field names
            let userName = item.userName || item.cashierName || item.employeeName || 
                          (item.user && item.user.name) || 
                          (item.cashier && item.cashier.name) ||
                          (item.employee && item.employee.name) ||
                          'Unknown';
            
            let userId = item.userId || item.cashierId || item.employeeId || 
                        (item.user && item.user.id) ||
                        (item.cashier && item.cashier.id) ||
                        (item.employee && item.employee.id) ||
                        'unknown';
            
            // Check if this is the admin ID and change to "User"
            if (userId === '698562f2d6b7c2978833e2bd') {
                userName = 'User';
            }
            
            const userKey = `${userName}_${userId}`;
            
            if (!userSales[userKey]) {
                userSales[userKey] = {
                    name: userName,
                    id: userId,
                    totalRevenue: 0,
                    totalItems: 0,
                    totalOrders: 0
                };
            }
            
            userSales[userKey].totalRevenue += item.revenue || item.total || 0;
            userSales[userKey].totalItems += item.unitsSold || item.quantity || 0;
            userSales[userKey].totalOrders += 1;
        });
        
        const userPerformanceArray = Object.values(userSales).sort((a, b) => b.totalRevenue - a.totalRevenue);
        const userWorksheetData = [
            ['Employee/Cashier', 'Total Revenue', 'Total Items Sold', 'Total Orders', 'Average Order Value'],
            ...userPerformanceArray.map(user => [
                user.name,
                user.totalRevenue,
                user.totalItems,
                user.totalOrders,
                user.totalOrders > 0 ? user.totalRevenue / user.totalOrders : 0
            ])
        ];
        
        const userWorksheet = XLSX.utils.aoa_to_sheet(userWorksheetData);
        XLSX.utils.book_append_sheet(workbook, userWorksheet, 'Employee Performance');
        
        // Creates summary sheet
        const summaryWorksheetData = [
            ['Summary', 'Value'],
            ['Month', `${monthName} ${year}`],
            ['Total Revenue', summary.totalRevenue || summary.revenue || 0],
            ['Total Gross Profit', summary.totalProfit || summary.profit || (summary.totalRevenue * 0.5) || 0],
            ['Total Items Sold', summary.totalItems || summary.itemsSold || 0],
            ['Total Orders', summary.totalOrders || summary.orders || 0],
            ['Average Order Value', summary.averageOrderValue || summary.avgOrderValue || 0],
            ['Average Items per Order', summary.averageItemsPerOrder || summary.avgItemsPerOrder || 0],
            ['Total Employees/Cashiers', userPerformanceArray.length]
        ];
        
        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryWorksheetData);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
        
        // Generates filename and save
        const filename = `sales-report-${year}-${monthNumber}.xlsx`;
        XLSX.writeFile(workbook, filename);
        
        showNotification('Excel report generated', 'success');
        
    } catch (error) {
        console.error('Excel generation:', error);
        
        generateCSVFromCurrentData(monthName, monthNumber, year);
    }
}

// Generates CSV from current data
function generateCSVFromCurrentData(monthName, monthNumber, year) {
    const salesData = currentReportData.salesData || currentReportData.data || [];
    const summary = currentReportData.summary || currentReportData;
    
    let csvContent = 'Angelo\'s Burger - Sales Report\n';
    csvContent += `${monthName} ${year}\n\n`;
    csvContent += 'Product Name,Units Sold,Revenue,Employee/Cashier,Gross Profit,Gross Profit Margin%\n';
    
    salesData.forEach(item => {
        const profit = item.profit || (item.revenue * 0.5) || 0;
        const profitMargin = item.profitMargin || '50.00';
        
        // Get user info - handle different possible field names
        let userName = item.userName || item.cashierName || item.employeeName || 
                      (item.user && item.user.name) || 
                      (item.cashier && item.cashier.name) ||
                      (item.employee && item.employee.name) ||
                      'Unknown';
        
        let userId = item.userId || item.cashierId || item.employeeId || 
                    (item.user && item.user.id) ||
                    (item.cashier && item.cashier.id) ||
                    (item.employee && item.employee.id) ||
                    '';
        
        // Check if this is the admin ID and change to "User"
        if (userId === '698562f2d6b7c2978833e2bd') {
            userName = 'User';
        }
        
        csvContent += `"${item.productName || item.name || 'Unknown Product'}",`;
        csvContent += `${item.unitsSold || item.quantity || 0},`;
        csvContent += `${item.revenue || item.total || 0},`;
        csvContent += `"${userName}",`;
        csvContent += `${profit},`;
        csvContent += `${profitMargin}\n`;
    });
    
    csvContent += '\n\nSummary\n';
    csvContent += `Total Revenue,${summary.totalRevenue || summary.revenue || 0}\n`;
    csvContent += `Total Gross Profit,${summary.totalProfit || summary.profit || (summary.totalRevenue * 0.5) || 0}\n`;
    csvContent += `Total Items Sold,${summary.totalItems || summary.itemsSold || 0}\n`;
    csvContent += `Total Orders,${summary.totalOrders || summary.orders || 0}\n`;
    csvContent += `Average Order Value,${summary.averageOrderValue || summary.avgOrderValue || 0}\n`;
    csvContent += `Average Items per Order,${summary.averageItemsPerOrder || summary.avgItemsPerOrder || 0}\n`;
    
    // Add user performance summary
    const userSales = {};
    salesData.forEach(item => {
        // Get user info - handle different possible field names
        let userName = item.userName || item.cashierName || item.employeeName || 
                      (item.user && item.user.name) || 
                      (item.cashier && item.cashier.name) ||
                      (item.employee && item.employee.name) ||
                      'Unknown';
        
        let userId = item.userId || item.cashierId || item.employeeId || 
                    (item.user && item.user.id) ||
                    (item.cashier && item.cashier.id) ||
                    (item.employee && item.employee.id) ||
                    'unknown';
        
        // Check if this is the admin ID and change to "User"
        if (userId === '698562f2d6b7c2978833e2bd') {
            userName = 'User';
        }
        
        const userKey = `${userName}_${userId}`;
        
        if (!userSales[userKey]) {
            userSales[userKey] = {
                name: userName,
                id: userId,
                totalRevenue: 0,
                totalItems: 0,
                totalOrders: 0
            };
        }
        
        userSales[userKey].totalRevenue += item.revenue || item.total || 0;
        userSales[userKey].totalItems += item.unitsSold || item.quantity || 0;
        userSales[userKey].totalOrders += 1;
    });
    
    csvContent += '\n\nEmployee/Cashier Performance\n';
    csvContent += 'Name,Total Revenue,Total Items Sold,Total Orders,Average Order Value\n';
    Object.values(userSales).sort((a, b) => b.totalRevenue - a.totalRevenue).forEach(user => {
        csvContent += `"${user.name}",`;
        csvContent += `${user.totalRevenue},`;
        csvContent += `${user.totalItems},`;
        csvContent += `${user.totalOrders},`;
        csvContent += `${user.totalOrders > 0 ? user.totalRevenue / user.totalOrders : 0}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${year}-${monthNumber}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('CSV report generated (Excel not available)', 'info');
}

// ================= PDF EXPORT FUNCTIONALITY =================
async function generatePDFReport() {
    if (!currentReportData || !currentMonth) {
        showNotification('select month first', 'error');
        return;
    }

    try {
        showNotification('Printing Pdf', 'info');
        
        const reportContent = document.getElementById('reportContent');
        if (!reportContent) {
            throw new Error('No report content available');
        }

        
        const canvas = await html2canvas(reportContent, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        
        const imgData = canvas.toDataURL('image/png');
        
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Add header
        pdf.setFontSize(20);
        pdf.setTextColor(106, 13, 173);
        pdf.text('Angelo\'s Burger POS', pageWidth / 2, 20, { align: 'center' });
        
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Sales Report - ${currentMonth} ${currentReportData.year}`, pageWidth / 2, 30, { align: 'center' });
        
        // Adds generated date
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 20, 40, { align: 'right' });
        
        // Adds note about profit margin
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Note: All gross profit calculations assume a 50% gross profit margin.', 20, 45);
        
        // Calculates image dimensions
        const imgWidth = pageWidth - 40; // 20mm margins on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Adds the captured image
        pdf.addImage(imgData, 'PNG', 20, 50, imgWidth, imgHeight);
        
        // Adds footer
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('© Angelo\'s Burger POS System - All rights reserved', pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        // Saves the PDF
        const filename = `sales-report-${currentReportData.year}-${currentMonth}.pdf`;
        pdf.save(filename);
        
        showNotification('PDF report exported', 'success');
        
    } catch (error) {
        console.error('PDF generation:', error);
        showNotification('Error generating PDF: ' + error.message, 'error');
        
        generatePrintView();
    }
}

function generatePrintView() {
    if (!currentReportData || !currentMonth) {
        showNotification('No report data to print.', 'error');
        return;
    }

    // Calculate totals for print view
    const salesData = currentReportData.salesData || currentReportData.data || [];
    const summary = currentReportData.summary || currentReportData;
    const totalSales = salesData.reduce((sum, item) => sum + (item.revenue || item.total || 0), 0);
    const totalItems = salesData.reduce((sum, item) => sum + (item.unitsSold || item.quantity || 0), 0);
    const totalProfit = salesData.reduce((sum, item) => sum + (item.profit || (item.revenue * 0.5) || 0), 0);
    const totalOrders = summary.totalOrders || summary.orders || 0;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;
    
    // Create user summary for print
    let userPerformanceHTML = '';
    if (salesData && salesData.length > 0) {
        const userSales = {};
        salesData.forEach(item => {
            // Get user info - handle different possible field names
            let userName = item.userName || item.cashierName || item.employeeName || 
                          (item.user && item.user.name) || 
                          (item.cashier && item.cashier.name) ||
                          (item.employee && item.employee.name) ||
                          'Unknown';
            
            let userId = item.userId || item.cashierId || item.employeeId || 
                        (item.user && item.user.id) ||
                        (item.cashier && item.cashier.id) ||
                        (item.employee && item.employee.id) ||
                        'unknown';
            
            // Check if this is the admin ID and change to "User"
            if (userId === '698562f2d6b7c2978833e2bd') {
                userName = 'User';
            }
            
            const userKey = `${userName}_${userId}`;
            
            if (!userSales[userKey]) {
                userSales[userKey] = {
                    name: userName,
                    id: userId,
                    totalRevenue: 0,
                    totalItems: 0,
                    totalOrders: 0
                };
            }
            
            userSales[userKey].totalRevenue += item.revenue || item.total || 0;
            userSales[userKey].totalItems += item.unitsSold || item.quantity || 0;
            userSales[userKey].totalOrders += 1;
        });
        
        const userSalesArray = Object.values(userSales).sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        if (userSalesArray.length > 0) {
            userPerformanceHTML = `
                <div style="margin: 30px 0;">
                    <h5>Employee/Cashier Performance</h5>
                    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;">
                        <thead>
                            <tr style="background-color: #343a40; color: white;">
                                <th style="padding: 8px; text-align: left;">Employee/Cashier</th>
                                <th style="padding: 8px; text-align: left;">Total Revenue</th>
                                <th style="padding: 8px; text-align: left;">Total Items Sold</th>
                                <th style="padding: 8px; text-align: left;">Total Orders</th>
                                <th style="padding: 8px; text-align: left;">Avg. Order Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${userSalesArray.map(user => `
                                <tr>
                                    <td style="padding: 6px; border-bottom: 1px solid #ddd;">${user.name}</td>
                                    <td style="padding: 6px; border-bottom: 1px solid #ddd;">₱${user.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style="padding: 6px; border-bottom: 1px solid #ddd;">${user.totalItems.toLocaleString()}</td>
                                    <td style="padding: 6px; border-bottom: 1px solid #ddd;">${user.totalOrders.toLocaleString()}</td>
                                    <td style="padding: 6px; border-bottom: 1px solid #ddd;">₱${(user.totalOrders > 0 ? user.totalRevenue / user.totalOrders : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
    
    // Create table rows (show all data in print view)
    let tableRows = '';
    if (salesData && salesData.length > 0) {
        salesData.forEach(item => {
            const profit = item.profit !== undefined ? item.profit : (item.revenue * 0.5);
            
            // Get user info - handle different possible field names
            let userName = item.userName || item.cashierName || item.employeeName || 
                          (item.user && item.user.name) || 
                          (item.cashier && item.cashier.name) ||
                          (item.employee && item.employee.name) ||
                          'Unknown';
            
            let userId = item.userId || item.cashierId || item.employeeId || 
                        (item.user && item.user.id) ||
                        (item.cashier && item.cashier.id) ||
                        (item.employee && item.employee.id) ||
                        '';
            
            // Check if this is the admin ID and change to "User"
            if (userId === '698562f2d6b7c2978833e2bd') {
                userName = 'User';
            }
            
            tableRows += `
                <tr>
                    <td>${item.productName || item.name || 'Unknown Product'}</td>
                    <td>${(item.unitsSold || item.quantity || 0).toLocaleString()}</td>
                    <td>₱${(item.revenue || item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${userName}</td>
                    <td>₱${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            `;
        });
    }
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales Report - ${currentMonth} ${currentReportData.year}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    line-height: 1.6;
                }
                h2 { 
                    color: #333; 
                    text-align: center; 
                    margin-bottom: 10px;
                }
                h4 { 
                    color: #333; 
                    text-align: center;
                    margin-bottom: 20px;
                    font-weight: normal;
                    border-bottom: 2px solid #6a0dad; 
                    padding-bottom: 10px;
                }
                h5 {
                    color: #333;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                .summary-section { 
                    margin: 30px 0;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                .total-sales-heading {
                    font-size: 16px;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 15px;
                }
                .total-sales-heading span {
                    color: #333;
                }
                .summary-item {
                    margin-bottom: 8px;
                    font-size: 15px;
                }
                .summary-item strong {
                    color: #555;
                    min-width: 180px;
                    display: inline-block;
                }
                .summary-item span {
                    color: black;
                    font-weight: 600;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0;
                    font-size: 12px;
                }
                th { 
                    background-color: black; 
                    color: white; 
                    padding: 8px; 
                    text-align: left; 
                    font-weight: 600;
                }
                td { 
                    padding: 6px; 
                    border-bottom: 1px solid #ddd; 
                }
                tfoot td {
                    font-weight: bold;
                    background-color: #f8f9fa;
                }
                .chart-placeholder {
                    text-align: center;
                    padding: 30px;
                    color: #666;
                    font-style: italic;
                    border: 1px dashed #ddd;
                    margin: 20px 0;
                    border-radius: 6px;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 50px; 
                    color: #666; 
                    font-size: 12px;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                .print-date { 
                    text-align: right; 
                    margin-bottom: 20px; 
                    font-size: 12px;
                    color: #666;
                }
                @media print {
                    body { margin: 0; padding: 10px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="print-date">Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
            <h2>Angelo's Burger POS</h2>
            <h4>Sales Report - ${currentMonth} ${currentReportData.year}</h4>
            
            <table>
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                        <th>Employee/Cashier</th>
                        <th>Gross Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sales data available</td></tr>'}
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>${totalItems.toLocaleString()}</strong></td>
                        <td><strong>₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                        <td><strong>-</strong></td>
                        <td><strong>₱${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            ${userPerformanceHTML}
            
            <div class="summary-section">
                <h5>Summary</h5>
                <div class="total-sales-heading">
                    Total Sales: <span>₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                    <div>
                        <p class="summary-item">
                            <strong>Total Revenue:</strong> 
                            <span>₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p class="summary-item">
                            <strong>Total Gross Profit:</strong> 
                            <span>₱${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p class="summary-item">
                            <strong>Total Items Sold:</strong> 
                            <span>${totalItems.toLocaleString()}</span>
                        </p>
                    </div>
                    <div>
                        <p class="summary-item">
                            <strong>Total Orders:</strong> 
                            <span>${totalOrders.toLocaleString()}</span>
                        </p>
                        <p class="summary-item">
                            <strong>Average Order Value:</strong> 
                            <span>₱${avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p class="summary-item">
                            <strong>Average Items per Order:</strong> 
                            <span>${avgItemsPerOrder.toFixed(1)}</span>
                        </p>
                    </div>
                </div>
            </div>
            
            <div class="chart-placeholder">
                No data available for chart
            </div>
            
            <div class="footer">
                <p><strong>Note:</strong> All gross profit calculations assume a 50% gross profit margin.</p>
                <p>Report generated by Angelo's Burger POS System</p>
                <p>© ${new Date().getFullYear()} All rights reserved</p>
            </div>
            
            <script>
                window.onload = function() {
                    // Auto-print after loading
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                }
            <\/script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// ================= NOTIFICATION FUNCTION =================
window.showNotification = window.showNotification || function(message, type = 'info') {
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
                console.log('Sample sale item with user info:', data.data?.salesData?.[0]);
                
                alert(`API Test Results:\n\n` +
                      `Status: ${response.status} OK\n` +
                      `Success: ${data.success ? 'Yes' : 'No'}\n` +
                      `Data available: ${data.data ? 'Yes' : 'No'}\n` +
                      `Sales data items: ${data.data?.salesData?.length || 0}\n` +
                      `Sample user info: ${JSON.stringify(data.data?.salesData?.[0]?.user || data.data?.salesData?.[0]?.cashier || 'No user info found')}\n` +
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
        
        sidebarToggle.addEventListener('click', function(e) {
            console.log('Toggle button clicked');
            e.stopPropagation();
            e.preventDefault();
            
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            

            const icon = sidebarToggle.querySelector('i');
            if (sidebar.classList.contains('active')) {
                icon.className = 'bi bi-x-lg';
                console.log('Sidebar opened');
            } else {
                icon.className = 'bi bi-list';
                console.log('Sidebar closed');
            }
        });
        
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
        

        function handleResize() {
            console.log('Window resized to:', window.innerWidth);
            if (window.innerWidth > 768) {
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
        
        window.addEventListener('resize', handleResize);
        
        console.log('Sidebar toggle event listeners added successfully');
    } else {
        console.error('Sidebar elements not found!');
    }
});

// ================= ADDITIONAL HELPER FUNCTIONS =================
function setupDebugButton() {

}

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

function setupAutoRefresh() {
    setInterval(() => {
        if (currentMonth && document.visibilityState === 'visible') {
            const select = document.getElementById('allDates');
            if (select.value) {
                select.dispatchEvent(new Event('change'));
            }
        }
    }, 300000);
}

// Add this to your Reports.js frontend file
async function testReportsConnection() {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const authToken = localStorage.getItem('authToken');
        
        console.log('Testing reports API connection...');
        console.log('Auth token:', authToken ? 'Present' : 'Missing');
        console.log(`Endpoint: /api/reports/monthly/${currentYear}/${currentMonth}`);
        
        const response = await fetch(`/api/reports/monthly/${currentYear}/${currentMonth}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            console.log('Orders found:', data.data?.summary?.totalOrders || 0);
            console.log('Sales data items:', data.data?.salesData?.length || 0);
            console.log('Sample sales data with user info:', data.data?.salesData?.[0]);
            
            // Check specifically for user/cashier info
            const sampleItem = data.data?.salesData?.[0];
            if (sampleItem) {
                console.log('Available user fields in sample item:', {
                    direct: {
                        userName: sampleItem.userName,
                        cashierName: sampleItem.cashierName,
                        employeeName: sampleItem.employeeName,
                        userId: sampleItem.userId,
                        cashierId: sampleItem.cashierId,
                        employeeId: sampleItem.employeeId
                    },
                    nested: {
                        user: sampleItem.user,
                        cashier: sampleItem.cashier,
                        employee: sampleItem.employee
                    }
                });
            }
        } else {
            console.log('API error:', data.message);
        }
        
        return data;
    } catch (error) {
        console.error('Test error:', error);
        return null;
    }
}

setTimeout(setupAutoRefresh, 10000);