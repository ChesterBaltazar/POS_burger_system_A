// Reports.js — Yearly Sales Report (connected to /api/reports/yearly/:year)

// ==================== STATE ====================
let currentReportData = null;
let monthlyChart = null;
let doughnutChart = null;
let currentYear = '';
let eventSource = null;
let sseConnectionAttempts = 0;
const MAX_SSE_ATTEMPTS = 3;

// Pagination
let currentPage = 1;
const RECORDS_PER_PAGE = 10;
let totalPages = 1;
let paginatedData = [];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// ==================== NUMBER FORMATTING ====================
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '₱0.00';
    
    // Format with commas and 2 decimal places
    return '₱' + Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return '0';
    
    // Format with commas, no decimal places
    return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatDecimal(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return '0';
    
    // Format with commas and specified decimal places
    return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Compact formatting for chart axes (K for thousands, M for millions)
function formatCompactCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '₱0';
    
    if (value >= 1000000) {
        return '₱' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
        return '₱' + (value / 1000).toFixed(0) + 'K';
    }
    return '₱' + value;
}

// Compact formatting for numbers (K for thousands, M for millions)
function formatCompactNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return '0';
    
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(0) + 'K';
    }
    return value.toString();
}

// ==================== SSE (optional dashboard stream) ====================
function setupSSEConnection() {
    if (sseConnectionAttempts >= MAX_SSE_ATTEMPTS) return;
    if (eventSource) eventSource.close();

    try {
        eventSource = new EventSource('/api/dashboard/stream');
        eventSource.onopen = () => { sseConnectionAttempts = 0; };
        eventSource.onerror = () => {
            sseConnectionAttempts++;
            if (eventSource) { eventSource.close(); eventSource = null; }
            if (sseConnectionAttempts >= MAX_SSE_ATTEMPTS) {
                localStorage.setItem('sseDisabled', 'true');
                return;
            }
            setTimeout(setupSSEConnection, 10000);
        };
    } catch (e) {
        sseConnectionAttempts++;
        if (sseConnectionAttempts < MAX_SSE_ATTEMPTS) setTimeout(setupSSEConnection, 10000);
    }
}

// ==================== LOGOUT ====================
function setupLogoutButton() {
    const btn = document.querySelector('.logout-btn');
    if (!btn) return;
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', e => { e.preventDefault(); showLogoutConfirmation(); });
}

function showLogoutConfirmation() {
    document.querySelector('.logout-confirmation-modal')?.remove();

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
                <button class="btn-cancel">No, Cancel</button>
                <button class="btn-confirm">Yes, Logout</button>
            </div>
        </div>`;

    if (!document.getElementById('logout-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-modal-styles';
        style.textContent = `
            .logout-confirmation-modal{position:fixed;top:0;left:0;width:100%;height:100%;
                background:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:center;
                z-index:99999;animation:fadeIn .3s ease}
            .logout-modal-content{background:#fff;border-radius:10px;box-shadow:0 5px 20px rgba(0,0,0,.2);
                width:90%;max-width:400px;overflow:hidden;animation:slideUp .3s ease}
            .logout-modal-header{background:#f8f9fa;padding:15px 20px;display:flex;
                justify-content:space-between;align-items:center;border-bottom:1px solid #dee2e6}
            .logout-modal-header h3{margin:0;font-size:1.2rem;color:#333}
            .close-modal{background:none;border:none;font-size:1.5rem;cursor:pointer;color:#dc3545;
                width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px}
            .close-modal:hover{background:rgba(220,53,69,.1)}
            .logout-modal-body{padding:30px 20px;text-align:center}
            .logout-modal-body p{margin:0;font-size:1rem;color:#555}
            .logout-modal-footer{padding:15px 20px;display:flex;justify-content:flex-end;gap:10px;
                border-top:1px solid #dee2e6;background:#f8f9fa}
            .btn-cancel,.btn-confirm{padding:8px 20px;border-radius:5px;font-weight:500;cursor:pointer;
                border:none;transition:all .2s ease;font-size:14px}
            .btn-cancel{background:#dc3545;color:#fff}
            .btn-cancel:hover{background:#c82333;transform:translateY(-1px)}
            .btn-confirm{background:#28a745;color:#fff}
            .btn-confirm:hover{background:#1e7e34;transform:translateY(-1px)}
            @keyframes fadeIn{from{opacity:0}to{opacity:1}}
            @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);
    const remove = () => modal.parentNode?.removeChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', remove);
    modal.querySelector('.btn-cancel').addEventListener('click', remove);
    modal.querySelector('.btn-confirm').addEventListener('click', () => { remove(); performLogout(); });
    modal.addEventListener('click', e => { if (e.target === modal) remove(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { remove(); document.removeEventListener('keydown', esc); }
    });
}

async function performLogout() {
    try {
        showNotification('Logging out...', 'info');
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                }
            });
        } catch (_) { }

        const posCounter = localStorage.getItem('posOrderCounter');
        const theme = localStorage.getItem('theme');
        localStorage.clear(); sessionStorage.clear();
        if (posCounter) localStorage.setItem('posOrderCounter', posCounter);
        if (theme) localStorage.setItem('theme', theme);

        document.cookie.split(';').forEach(c => {
            const name = c.split('=')[0].trim();
            if (['auth', 'token', 'session', 'jwt', 'refresh'].some(k => name.toLowerCase().includes(k)))
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });

        eventSource?.close();
        if (sessionCheckInterval) clearInterval(sessionCheckInterval);

        showNotification('Logged out! Redirecting…', 'success');
        setTimeout(() => window.location.replace('/'), 2000);
    } catch (err) {
        console.error('Logout error:', err);
        const pos = localStorage.getItem('posOrderCounter');
        localStorage.clear();
        if (pos) localStorage.setItem('posOrderCounter', pos);
        setTimeout(() => window.location.replace('/'), 1500);
    }
}

// ==================== SESSION ====================
let sessionCheckInterval = null;

function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    const auth = localStorage.getItem('isAuthenticated');
    if (!token || auth !== 'true') { window.location.replace('/'); return false; }
    if (!localStorage.getItem('loginTime')) localStorage.setItem('loginTime', Date.now().toString());
    return true;
}

function startSessionTimer() {
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);
    sessionCheckInterval = setInterval(() => {
        const age = Date.now() - parseInt(localStorage.getItem('loginTime') || '0');
        const max = 8 * 60 * 60 * 1000;
        if (age > max) {
            clearInterval(sessionCheckInterval);
            showNotification('Session expired.', 'warning');
            setTimeout(performLogout, 1000);
        }
        else if (age > max - 600000) showNotification('Session expires in 10 minutes', 'warning');
    }, 300000);
}

function resetSessionTimer() {
    localStorage.setItem('loginTime', Date.now().toString());
    startSessionTimer();
}

function setupActivityDetection() {
    ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev =>
        document.addEventListener(ev, resetSessionTimer, { passive: true }));
}

// ==================== YEAR DROPDOWN ====================
function populateYearDropdown() {
    const sel = document.getElementById('yearSelect');
    if (!sel) return;
    while (sel.options.length > 1) sel.remove(1);

    const start = 2026;
    const current = new Date().getFullYear();
    const end = Math.max(current, start) + 10;

    for (let y = start; y <= end; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        sel.appendChild(opt);
    }

    const defaultYear = current >= start ? current : start;
    sel.value = defaultYear;
    sel.dispatchEvent(new Event('change'));
}

// ==================== LOAD YEARLY REPORT ====================
async function loadYearlyReport(year) {
    if (!year) return;
    currentYear = year;
    currentPage = 1;

    const box = document.querySelector('.content-box2');
    box.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3">Loading ${year} annual report…</p>
        </div>`;

    try {
        const token = localStorage.getItem('authToken');

        console.log(`Fetching report for year ${year} with token:`, token ? 'Token exists' : 'No token');

        const res = await fetch(`/api/reports/yearly/${year}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        console.log('Response status:', res.status);

        if (!res.ok) {
            let errorDetails = '';
            let errorMessage = '';
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || '';
                errorDetails = JSON.stringify(errorData, null, 2);
                console.error('Server error details:', errorData);
            } catch (e) {
                errorDetails = await res.text();
                console.error('Server error text:', errorDetails);
            }

            if (res.status === 401) {
                showNotification('Session expired. Please login again.', 'error');
                setTimeout(() => { localStorage.clear(); window.location.replace('/'); }, 2000);
                return;
            }

            box.innerHTML = `
                <div class="alert alert-danger">
                    <h4><i class="bi bi-exclamation-triangle"></i> Error Loading Report</h4>
                    <p><strong>${errorMessage || 'Failed to load report'}</strong></p>
                    <p><small>Status: ${res.status} ${res.statusText}</small></p>
                    <div class="mt-4">
                        <h5>Troubleshooting Steps:</h5>
                        <ol class="text-start">
                            <li>Check if the server is running</li>
                            <li>Verify that orders exist for ${year}</li>
                            <li>Check browser console for detailed errors (F12)</li>
                            <li>Try creating sample data to test the report</li>
                        </ol>
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-primary me-2" onclick="loadYearlyReport(${year})">
                            <i class="bi bi-arrow-repeat"></i> Retry
                        </button>
                        <button class="btn btn-secondary me-2" onclick="testReportsAPI()">
                            <i class="bi bi-bug"></i> Test API
                        </button>
                        <button class="btn btn-info" onclick="createSampleData()">
                            <i class="bi bi-plus-circle"></i> Create Sample Data
                        </button>
                    </div>
                    <details class="mt-3">
                        <summary class="text-muted">Technical Details</summary>
                        <pre class="mt-2 p-2 bg-light" style="max-height:200px; overflow:auto;">${errorDetails}</pre>
                    </details>
                </div>`;

            throw new Error(`Server returned ${res.status}: ${errorMessage}`);
        }

        const json = await res.json();
        console.log('Report data received:', json);

        if (!json.success) throw new Error(json.message || 'Failed to load report');

        if (json.data) {
            currentReportData = json.data;
        } else if (json.yearlyData) {
            currentReportData = json.yearlyData;
        } else {
            currentReportData = json;
        }

        currentReportData.year = currentReportData.year || year;

        if (!currentReportData.salesData && !currentReportData.monthlyBreakdown) {
            console.warn('Report data missing expected structure:', currentReportData);
            currentReportData.salesData = currentReportData.salesData || [];
            currentReportData.monthlyBreakdown = currentReportData.monthlyBreakdown || [];
            currentReportData.summary = currentReportData.summary || {};
        }

        renderYearlyReport(currentReportData, year);

    } catch (err) {
        console.error('Error loading yearly report:', err);
    }
}

// ==================== SAMPLE DATA FOR TESTING ====================
async function createSampleData() {
    showNotification('Creating sample orders...', 'info');
    try {
        const token = localStorage.getItem('authToken');
        const year = document.getElementById('yearSelect')?.value || new Date().getFullYear();

        const sampleOrders = [];
        const products = [
            { name: 'Beef Burger B1T1', price: 85 },
            { name: 'Fries', price: 65 },
            { name: 'Soda', price: 35 },
            { name: 'Shake', price: 75 },
            { name: 'Chicken Franks B1T1', price: 95 },
            { name: 'Cheese Burger', price: 120 },
            { name: 'Family Meal', price: 350 },
            { name: 'Bucket Meal', price: 450 }
        ];
        const users = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams'];

        for (let month = 0; month < 12; month++) {
            const numOrders = Math.floor(Math.random() * 30) + 20;
            for (let i = 0; i < numOrders; i++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const date = new Date(year, month, day);
                const orderNumber = `ORD-${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}-${String(i).padStart(3, '0')}`;

                const items = [];
                let orderTotal = 0;
                const numItems = Math.floor(Math.random() * 8) + 3;
                for (let j = 0; j < numItems; j++) {
                    const product = products[Math.floor(Math.random() * products.length)];
                    const qty = Math.floor(Math.random() * 10) + 1;
                    items.push({ name: product.name, quantity: qty, price: product.price, subtotal: product.price * qty });
                    orderTotal += product.price * qty;
                }

                sampleOrders.push({
                    orderNumber,
                    subtotal: orderTotal,
                    total: orderTotal,
                    items,
                    cashReceived: orderTotal + Math.floor(Math.random() * 100),
                    change: Math.floor(Math.random() * 100),
                    status: 'completed',
                    paymentMethod: Math.random() > 0.3 ? 'cash' : 'gcash',
                    createdAt: date,
                    userId: { username: users[Math.floor(Math.random() * users.length)] }
                });
            }
        }

        console.log(`Sending ${sampleOrders.length} sample orders to backend...`);
        const res = await fetch('/api/orders/bulk-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ orders: sampleOrders })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Failed to create sample orders: ${res.status}`);
        }

        const result = await res.json();
        showNotification(`Created ${result.createdCount} sample orders for ${year}!`, 'success');
        setTimeout(() => loadYearlyReport(year), 1000);

    } catch (err) {
        console.error('Error creating sample data:', err);
        showNotification('Error creating sample data: ' + err.message, 'error');
    }
}

// ==================== PAGINATION ====================
function setupPagination(data) {
    paginatedData = data || [];
    totalPages = Math.max(1, Math.ceil(paginatedData.length / RECORDS_PER_PAGE));
    currentPage = 1;
    renderPaginationControls();
    return getCurrentPageData();
}

function getCurrentPageData() {
    const start = (currentPage - 1) * RECORDS_PER_PAGE;
    return paginatedData.slice(start, start + RECORDS_PER_PAGE);
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    renderPaginationControls();
    if (currentReportData) renderYearlyReport(currentReportData, currentYear);
}

function renderPaginationControls() {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    let html = `<nav><ul class="pagination justify-content-center">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
    <button class="page-link" onclick="goToPage(${currentPage - 1})">&laquo;</button></li>`;
    if (start > 1) {
        html += `<li class="page-item"><button class="page-link" onclick="goToPage(1)">1</button></li>`;
        if (start > 2) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    }
    for (let i = start; i <= end; i++)
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
      <button class="page-link" onclick="goToPage(${i})">${i}</button></li>`;
    if (end < totalPages) {
        if (end < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        html += `<li class="page-item"><button class="page-link" onclick="goToPage(${totalPages})">${totalPages}</button></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
    <button class="page-link" onclick="goToPage(${currentPage + 1})">&raquo;</button></li>`;
    html += `</ul></nav>
    <div class="text-center text-muted mt-1">
      <small>Page ${currentPage} of ${totalPages} &nbsp;|&nbsp;
      Showing ${Math.min(RECORDS_PER_PAGE, paginatedData.length - (currentPage - 1) * RECORDS_PER_PAGE)}
      of ${formatNumber(paginatedData.length)} records</small></div>`;

    container.innerHTML = html;
}

// ==================== CHARTS ====================

function renderMonthlyChart(monthlyBreakdown, year) {
    const container = document.getElementById('monthlyChartContainer');
    if (!container) return;
    monthlyChart?.destroy(); monthlyChart = null;

    const hasData = monthlyBreakdown.some(m => m.revenue > 0);
    if (!hasData) {
        container.innerHTML = `<div class="no-data-msg">No monthly data for ${year}</div>`;
        return;
    }

    container.innerHTML = '<canvas id="monthlyChart"></canvas>';

    setTimeout(() => {
        try {
            const ctx = document.getElementById('monthlyChart').getContext('2d');
            
            // Set both axes max to 300,000
            const axisMax = 300000;
            
            monthlyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: monthlyBreakdown.map(m => m.monthName
                        ? m.monthName.substring(0, 3)
                        : MONTH_NAMES[m.month - 1]?.substring(0, 3) || ''),
                    datasets: [
                        {
                            label: 'Revenue (₱)',
                            data: monthlyBreakdown.map(m => m.revenue || 0),
                            backgroundColor: 'rgba(106,13,173,0.75)',
                            borderColor: 'rgba(106,13,173,1)',
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Gross Profit (₱)',
                            data: monthlyBreakdown.map(m => m.profit || 0),
                            backgroundColor: 'rgba(40,167,69,0.6)',
                            borderColor: 'rgba(40,167,69,1)',
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Orders',
                            data: monthlyBreakdown.map(m => m.orders || 0),
                            type: 'line',
                            borderColor: 'rgba(255,159,64,1)',
                            backgroundColor: 'rgba(255,159,64,0.15)',
                            borderWidth: 2,
                            tension: 0.3,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: 'rgba(255,159,64,1)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            fill: false,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        title: {
                            display: true,
                            text: `Monthly Revenue & Orders — ${year}`,
                            font: { size: 14, weight: 'bold' },
                            color: '#333',
                            padding: { top: 10, bottom: 10 }
                        },
                        legend: {
                            position: 'top',
                            labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    const v = ctx.raw;
                                    if (ctx.dataset.label.includes('Orders')) return `Orders: ${formatNumber(v)}`;
                                    return `${ctx.dataset.label}: ${formatCurrency(v)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            position: 'left',
                            title: { display: true, text: 'Amount (₱)', font: { size: 11 } },
                            min: 0,
                            max: axisMax,
                            ticks: {
                                callback: function(value) {
                                    return formatCompactCurrency(value);
                                },
                                stepSize: 50000,
                                font: { size: 10 }
                            }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            title: { display: true, text: 'Orders', font: { size: 11 } },
                            grid: { drawOnChartArea: false },
                            min: 0,
                            max: axisMax,  // Set orders axis to also go up to 300,000
                            ticks: { 
                                stepSize: 50000,  // Use larger step size for orders
                                callback: function(value) {
                                    return formatCompactNumber(value);  // Format with K/M
                                }, 
                                font: { size: 10 } 
                            }
                        },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                    }
                }
            });
        } catch (e) {
            console.error('Monthly chart error:', e);
            container.innerHTML = `<div class="no-data-msg text-danger">Chart error: ${e.message}</div>`;
        }
    }, 100);
}

function renderDoughnutChart(salesData) {
    const container = document.getElementById('doughnutChartContainer');
    if (!container) return;
    doughnutChart?.destroy(); doughnutChart = null;

    const top = salesData.filter(p => p.unitsSold > 0).slice(0, 8);
    if (!top.length) {
        container.innerHTML = `<div class="no-data-msg">No product data available</div>`;
        return;
    }

    container.innerHTML = '<canvas id="doughnutChart"></canvas>';

    const COLORS = ['#b91d47', '#00aba9', '#2b5797', '#e8c3b9', '#1e7145', '#ff9900', '#9900ff', '#00bcd4'];

    setTimeout(() => {
        try {
            const ctx = document.getElementById('doughnutChart').getContext('2d');
            doughnutChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: top.map(p => p.productName),
                    datasets: [{
                        label: 'Units Sold',
                        data: top.map(p => p.unitsSold),
                        backgroundColor: COLORS.slice(0, top.length),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Top Products by Units Sold',
                            font: { size: 14, weight: 'bold' }
                        },
                        legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12 } },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    const p = top[ctx.dataIndex];
                                    return [
                                        `${ctx.label}: ${formatNumber(ctx.raw)} units`,
                                        `Revenue: ${formatCurrency(p.revenue)}`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Doughnut chart error:', e);
            container.innerHTML = `<div class="no-data-msg text-danger">Chart error: ${e.message}</div>`;
        }
    }, 100);
}

// ==================== MAIN RENDER ====================
function renderYearlyReport(report, year) {
    const box = document.querySelector('.content-box2');

    const salesData = report.salesData || [];
    const monthlyBreakdown = report.monthlyBreakdown || [];
    const summary = report.summary || {};

    const totalRevenue = summary.totalRevenue || 0;
    const totalProfit = summary.totalProfit || 0;
    const totalItems = summary.totalItems || 0;
    const totalOrders = summary.totalOrders || 0;
    const avgOrderValue = summary.averageOrderValue || (totalOrders > 0 ? totalRevenue / totalOrders : 0);
    const avgItems = summary.averageItemsPerOrder || (totalOrders > 0 ? totalItems / totalOrders : 0);
    const cashiers = summary.cashiers || [];

    const pageData = setupPagination(salesData);

    const tableRows = pageData.length
        ? pageData.map(p => `
        <tr>
          <td>${p.productName || 'Unknown'}</td>
          <td class="text-end">${formatNumber(p.unitsSold || 0)}</td>
          <td class="text-end">${formatCurrency(p.revenue || 0)}</td>
          <td>${p.userName || 'Unknown'}</td>
          <td class="text-end text-success">${formatCurrency(p.profit || 0)}
            ${p.profitMargin ? `<small class="text-muted d-block">(${formatDecimal(p.profitMargin)}% gross)</small>` : ''}</td>
        </tr>`).join('')
        : `<tr><td colspan="5" class="text-center text-muted py-4">No sales data for ${year}</td></tr>`;

    const monthTableRows = monthlyBreakdown
        .filter(m => (m.revenue || 0) > 0 || (m.orders || 0) > 0)
        .map(m => `
      <tr>
        <td>${m.monthName || MONTH_NAMES[m.month - 1] || ''}</td>
        <td class="text-end">${formatCurrency(m.revenue || 0)}</td>
        <td class="text-end">${formatNumber(m.unitsSold || 0)}</td>
        <td class="text-end">${formatNumber(m.orders || 0)}</td>
        <td class="text-end">${formatCurrency(m.profit || 0)}</td>
      </tr>`).join('')
        || `<tr><td colspan="5" class="text-center text-muted py-3">No monthly data for ${year}</td></tr>`;

    const mTotalRevenue = monthlyBreakdown.reduce((s, m) => s + (m.revenue || 0), 0);
    const mTotalItems = monthlyBreakdown.reduce((s, m) => s + (m.unitsSold || 0), 0);
    const mTotalOrders = monthlyBreakdown.reduce((s, m) => s + (m.orders || 0), 0);
    const mTotalProfit = monthlyBreakdown.reduce((s, m) => s + (m.profit || 0), 0);

    const cashierRows = cashiers.length
        ? cashiers.map(c => `
        <tr>
          <td>${c.userName || 'Unknown'}</td>
          <td class="text-end">${formatCurrency(c.totalRevenue || 0)}</td>
          <td class="text-end">${formatNumber(c.totalItems || 0)}</td>
          <td class="text-end">${formatNumber(c.totalOrders || 0)}</td>
          <td class="text-end">${formatCurrency(c.averageOrderValue || 0)}</td>
        </tr>`).join('')
        : '';

    box.innerHTML = `
    <div id="reportContent">
      <h4 style="color:#6a0dad;margin-bottom:20px;">${year} Annual Sales Report</h4>

      <!-- KPI cards — 3 per row on medium screens, 6 on large -->
      <div class="row g-3 mb-4">
        ${kpiCard('Total Revenue',   formatCurrency(totalRevenue),  '#6a0dad')}
        ${kpiCard('Gross Profit',    formatCurrency(totalProfit),   '#28a745')}
        ${kpiCard('Total Orders',    formatNumber(totalOrders),     '#007bff')}
        ${kpiCard('Items Sold',      formatNumber(totalItems),      '#fd7e14')}
        ${kpiCard('Avg Order Value', formatCurrency(avgOrderValue), '#17a2b8')}
        ${kpiCard('Avg Items/Order', formatDecimal(avgItems, 1),    '#6c757d')}
      </div>

      <!-- Charts row: Monthly bar + Doughnut -->
      <div class="row mb-4">
        <div class="col-lg-7 mb-3">
          <div id="monthlyChartContainer" style="height:320px;background:#fff;border-radius:8px;
               padding:10px;box-shadow:0 2px 8px rgba(0,0,0,.05);"></div>
        </div>
        <div class="col-lg-5 mb-3">
          <div id="doughnutChartContainer" style="height:320px;background:#fff;border-radius:8px;
               padding:10px;box-shadow:0 2px 8px rgba(0,0,0,.05);"></div>
        </div>
      </div>

      <!-- Monthly breakdown table -->
      <div class="mb-4">
        <h5 style="color:#333;margin-bottom:12px;">Monthly Breakdown</h5>
        <div class="table-responsive">
          <table class="table table-sm table-hover">
            <thead style="background:#6a0dad;color:#fff;">
              <tr>
                <th>Month</th>
                <th class="text-end">Revenue (₱)</th>
                <th class="text-end">Items Sold</th>
                <th class="text-end">Orders</th>
                <th class="text-end">Gross Profit (₱)</th>
              </tr>
            </thead>
            <tbody>${monthTableRows}</tbody>
            <tfoot style="background:#f8f9fa;font-weight:bold;">
              <tr>
                <td>TOTAL</td>
                <td class="text-end">${formatCurrency(mTotalRevenue)}</td>
                <td class="text-end">${formatNumber(mTotalItems)}</td>
                <td class="text-end">${formatNumber(mTotalOrders)}</td>
                <td class="text-end">${formatCurrency(mTotalProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Product detail table (paginated) -->
      <div class="mb-4">
        <h5 style="color:#333;margin-bottom:12px;">Product Sales Detail</h5>
        <div class="table-responsive">
          <table class="table table-hover">
            <thead style="background:#6a0dad;color:#fff;">
              <tr>
                <th>Product</th>
                <th class="text-end">Units Sold</th>
                <th class="text-end">Revenue</th>
                <th>Employee/Cashier</th>
                <th class="text-end">Gross Profit</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="background:#f8f9fa;font-weight:bold;">
              <tr>
                <td>Total</td>
                <td class="text-end">${formatNumber(totalItems)}</td>
                <td class="text-end">${formatCurrency(totalRevenue)}</td>
                <td>—</td>
                <td class="text-end">${formatCurrency(totalProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div id="paginationContainer" class="mt-3"></div>
      </div>

      ${cashiers.length ? `
      <!-- Cashier/employee performance -->
      <div class="mb-4">
        <h5 style="color:#333;margin-bottom:12px;">Employee / Cashier Performance</h5>
        <div class="table-responsive">
          <table class="table table-sm table-hover">
            <thead style="background:#343a40;color:#fff;">
              <tr>
                <th>Name</th>
                <th class="text-end">Total Revenue</th>
                <th class="text-end">Items Sold</th>
                <th class="text-end">Orders</th>
                <th class="text-end">Avg Order Value</th>
              </tr>
            </thead>
            <tbody>${cashierRows}</tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- Annual summary -->
      <div class="mb-5">
        <h5 style="color:#333;margin-bottom:12px;">Annual Summary</h5>
        <div style="background:#f8f9fa;padding:20px;border-radius:8px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px;">
            ${summaryRow('Total Revenue',         formatCurrency(totalRevenue))}
            ${summaryRow('Gross Profit',           formatCurrency(totalProfit))}
            ${summaryRow('Total Items Sold',       formatNumber(totalItems))}
            ${summaryRow('Total Orders',           formatNumber(totalOrders))}
            ${summaryRow('Average Order Value',    formatCurrency(avgOrderValue))}
            ${summaryRow('Avg Items per Order',    formatDecimal(avgItems, 1))}
          </div>
        </div>
      </div>

    </div><!-- #reportContent -->`;

    if (!document.getElementById('no-data-style')) {
        const s = document.createElement('style');
        s.id = 'no-data-style';
        s.textContent = `.no-data-msg{height:100%;display:flex;justify-content:center;
            align-items:center;color:#999;font-style:italic;font-size:14px;}`;
        document.head.appendChild(s);
    }

    renderMonthlyChart(monthlyBreakdown, year);
    renderDoughnutChart(salesData);
    renderPaginationControls();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== KPI CARD HELPER ====================
// Scales font-size down automatically so values like ₱300,000.00 never overflow.
function kpiCard(label, value, color) {
    const len = String(value).length;
    // ≤8 chars  → 18px   e.g. ₱100.00
    // ≤11 chars → 16px   e.g. ₱12,345.00
    // ≤14 chars → 14px   e.g. ₱123,456.00
    // ≤17 chars → 12px   e.g. ₱1,234,567.00 / ₱300,000.00
    // >17 chars → 10px   (very large numbers)
    let fontSize;
    if (len <= 8) fontSize = '18px';
    else if (len <= 11) fontSize = '16px';
    else if (len <= 14) fontSize = '14px';
    else if (len <= 17) fontSize = '12px';
    else fontSize = '10px';

    return `
    <div class="col-6 col-md-4 col-lg-2">
      <div style="
        background:#fff;
        border-radius:8px;
        padding:14px 10px;
        box-shadow:0 2px 8px rgba(0,0,0,.07);
        border-top:3px solid ${color};
        min-height:82px;
        display:flex;
        flex-direction:column;
        justify-content:center;
        overflow:hidden;">
        <div style="
          font-size:10px;
          color:#888;
          text-transform:uppercase;
          letter-spacing:.4px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          margin-bottom:4px;"
          title="${label}">${label}</div>
        <div style="
          font-size:${fontSize};
          font-weight:700;
          color:${color};
          line-height:1.25;
          word-break:break-word;
          overflow-wrap:anywhere;"
          title="${value}">${value}</div>
      </div>
    </div>`;
}

function summaryRow(label, value) {
    return `<p style="margin-bottom:8px;font-size:15px;">
    <strong style="color:#555;min-width:200px;display:inline-block;">${label}:</strong>
    <span style="color:#333;font-weight:600;">${value}</span></p>`;
}

// ==================== EXPORT ====================
async function exportToExcel() {
    const year = document.getElementById('yearSelect')?.value;
    if (!year) { showNotification('Please select a year first', 'error'); return; }
    if (!currentReportData) { showNotification('No report data. Load a report first.', 'error'); return; }
    try {
        showNotification('Generating Excel…', 'info');
        await generateExcelFromCurrentData(year);
    } catch (e) {
        showNotification('Excel error: ' + e.message, 'error');
    }
}

function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function generateExcelFromCurrentData(year) {
    await loadSheetJS();

    const salesData = currentReportData.salesData || [];
    const monthlyBreakdown = currentReportData.monthlyBreakdown || [];
    const summary = currentReportData.summary || {};
    const user = localStorage.getItem('currentUser') || 'User';
    const now = new Date();
    const wb = XLSX.utils.book_new();

    // ---- Monthly sheet ----
    const mData = [
        [user], [now.toLocaleDateString()], [now.toLocaleTimeString()], [''],
        [`Monthly Breakdown — ${year}`], [''],
        ['Month', 'Revenue (₱)', 'Items Sold', 'Orders', 'Gross Profit (₱)'],
        ...monthlyBreakdown.map(m => [
            m.monthName || MONTH_NAMES[m.month - 1] || '',
            m.revenue || 0,
            m.unitsSold || 0,
            m.orders || 0,
            m.profit || 0
        ]),
        [''],
        ['TOTAL',
            monthlyBreakdown.reduce((s, m) => s + (m.revenue || 0), 0),
            monthlyBreakdown.reduce((s, m) => s + (m.unitsSold || 0), 0),
            monthlyBreakdown.reduce((s, m) => s + (m.orders || 0), 0),
            monthlyBreakdown.reduce((s, m) => s + (m.profit || 0), 0)]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(mData);
    ws1['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Monthly Summary');

    // ---- Sales detail sheet ----
    const sData = [
        [user], [now.toLocaleDateString()], [now.toLocaleTimeString()], [''],
        [`Sales Details — ${year}`], [''],
        ['Product', 'Units Sold', 'Revenue (₱)', 'Gross Profit (₱)', 'Employee/Cashier'],
        ...salesData.map(p => [
            p.productName || '',
            p.unitsSold || 0,
            p.revenue || 0,
            p.profit || 0,
            p.userName || ''
        ]),
        [''],
        ['TOTAL',
            summary.totalItems || 0,
            summary.totalRevenue || 0,
            summary.totalProfit || 0, '']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sData);
    ws2['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Sales Details');

    XLSX.writeFile(wb, `annual-sales-report-${year}.xlsx`);
    showNotification('Excel report downloaded!', 'success');
}

async function generatePDFReport() {
    const year = document.getElementById('yearSelect')?.value;
    if (!year) { showNotification('Please select a year first', 'error'); return; }
    if (!currentReportData) { showNotification('No report data. Load a report first.', 'error'); return; }

    try {
        showNotification('Generating PDF…', 'info');

        if (typeof html2canvas === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        if (typeof window.jspdf === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }

        const content = document.getElementById('reportContent');
        if (!content) throw new Error('No report content found');

        monthlyChart?.update();
        doughnutChart?.update();

        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(content, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#fff',
            logging: false,
            allowTaint: false
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();

        pdf.setFontSize(20);
        pdf.setTextColor(106, 13, 173);
        pdf.text("Angelo's Burger POS", pw / 2, 15, { align: 'center' });

        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Annual Sales Report — ${year}`, pw / 2, 23, { align: 'center' });

        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, pw / 2, 29, { align: 'center' });

        const iw = pw - 20;
        const ih = (canvas.height * iw) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 35, iw, ih);

        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text("© Angelo's Burger POS System", pw / 2, ph - 8, { align: 'center' });

        pdf.save(`annual-sales-report-${year}.pdf`);
        showNotification('PDF report downloaded!', 'success');
    } catch (e) {
        console.error('PDF error:', e);
        showNotification('PDF error: ' + e.message, 'error');
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ==================== NOTIFICATIONS ====================
window.showNotification = function (message, type = 'info') {
    const colors = { error: '#f44336', success: '#4CAF50', warning: '#ff9800', info: '#2196F3' };
    const el = document.createElement('div');
    el.className = 'temp-notification';
    el.textContent = message;
    el.style.cssText = `position:fixed;top:20px;right:20px;background:${colors[type] || colors.info};
    color:#fff;padding:12px 20px;border-radius:6px;z-index:99999;font-size:14px;font-weight:500;
    box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:320px;
    animation:notifFade 3s ease-in-out forwards;`;
    if (!document.getElementById('notif-style')) {
        const s = document.createElement('style'); s.id = 'notif-style';
        s.textContent = `@keyframes notifFade{0%{opacity:0;transform:translateX(100px)}
      15%{opacity:1;transform:translateX(0)}85%{opacity:1;transform:translateX(0)}
      100%{opacity:0;transform:translateX(100px)}}`;
        document.head.appendChild(s);
    }
    document.querySelectorAll('.temp-notification').forEach(e => e.remove());
    document.body.appendChild(el);
    setTimeout(() => el.parentNode?.removeChild(el), 3000);
};

// ==================== API TEST ====================
async function testReportsAPI() {
    const year = new Date().getFullYear();
    showNotification('Testing API…', 'info');
    try {
        const token = localStorage.getItem('authToken');
        console.log('Testing API with token:', token ? 'Token exists' : 'No token');

        const res = await fetch(`/api/reports/yearly/${year}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Test API response status:', res.status);

        if (res.ok) {
            const d = await res.json();
            console.log('API test OK:', d);
            showNotification(`API OK! Found ${d.data?.summary?.totalOrders || 0} orders`, 'success');
        } else {
            let errorText = '';
            try {
                const errorData = await res.json();
                errorText = errorData.message || JSON.stringify(errorData);
            } catch {
                errorText = await res.text();
            }
            showNotification(`API error: ${res.status} - ${errorText.substring(0, 100)}`, 'error');
            console.error('API test error:', errorText);
        }
    } catch (e) {
        showNotification('Network error: ' + e.message, 'error');
        console.error('Network error:', e);
    }
}

// ==================== SIDEBAR TOGGLE ====================
document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle && sidebar) {
        toggle.addEventListener('click', e => {
            e.stopPropagation(); e.preventDefault();
            sidebar.classList.toggle('active');
            overlay?.classList.toggle('active');
            const icon = toggle.querySelector('i');
            if (icon) icon.className = sidebar.classList.contains('active') ? 'bi bi-x-lg' : 'bi bi-list';
        });
        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            const icon = toggle.querySelector('i');
            if (icon) icon.className = 'bi bi-list';
        });
        document.querySelectorAll('.menu-item a').forEach(a => {
            a.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    overlay?.classList.remove('active');
                    const icon = toggle.querySelector('i');
                    if (icon) icon.className = 'bi bi-list';
                }
            });
        });
        function onResize() {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
                overlay?.classList.remove('active');
                const icon = toggle.querySelector('i');
                if (icon) icon.className = 'bi bi-list';
            }
        }
        onResize();
        window.addEventListener('resize', onResize);
    }
});

// ==================== INIT ====================
function initDashboard() {
    if (!checkAuthentication()) return;

    if (!localStorage.getItem('loginTime'))
        localStorage.setItem('loginTime', Date.now().toString());

    startSessionTimer();
    setupActivityDetection();
    setupLogoutButton();

    if (localStorage.getItem('sseDisabled') !== 'true') setupSSEConnection();

    populateYearDropdown();

    const yearSel = document.getElementById('yearSelect');
    if (yearSel) {
        yearSel.addEventListener('change', function () {
            if (this.value) loadYearlyReport(this.value);
        });
    }

    document.getElementById('exportExcelBtn')
        ?.addEventListener('click', exportToExcel);
    document.getElementById('exportPdfBtn')
        ?.addEventListener('click', generatePDFReport);
}

document.addEventListener('DOMContentLoaded', initDashboard);

// ---- global exports ----
window.showNotification = window.showNotification;
window.performLogout = performLogout;
window.showLogoutConfirmation = showLogoutConfirmation;
window.goToPage = goToPage;
window.testReportsAPI = testReportsAPI;
window.exportToExcel = exportToExcel;
window.generatePDFReport = generatePDFReport;
window.loadYearlyReport = loadYearlyReport;
window.createSampleData = createSampleData;