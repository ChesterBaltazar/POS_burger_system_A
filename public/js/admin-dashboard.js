let currentReportData = null;
let currentChart = null;
let dashboardPollInterval = null;
let stockRequestPollInterval = null;
let lowStockPollInterval = null;
let salesChart = null;
let chartData = null;
let currentYear = 2026; 

// Low stock threshold - CHANGED TO 5 (so quantity 10 is NOT low stock)
const LOW_STOCK_THRESHOLD = 5;

// Variables for out of stock alert
let outOfStockAlertModal = null;
let outOfStockAlertOkBtn = null;
let outOfStockAlertCountdown = null;
let outOfStockAlertTimer = null;
let outOfStockAlertSeconds = 5;
let outOfStockItemsData = [];
let lastOutOfStockCheck = 0;
let outOfStockAlertInterval = null;

// Store current out of stock items to detect changes
let previousOutOfStockItems = new Set();

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

// ================= LOW STOCK PANEL FUNCTIONS =================

// Function to get color based on quantity (green -> yellow -> red as it decreases)
function getStockColor(quantity) {
    if (quantity >= 5) return '#28a745'; // Green for 5
    if (quantity === 4) return '#ffc107'; // Yellow for 4
    if (quantity === 3) return '#fd7e14'; // Orange for 3
    if (quantity === 2) return '#dc3545'; // Red for 2
    if (quantity === 1) return '#b02a37'; // Dark red for 1 (almost red)
    return '#dc3545'; // Default red for any other
}

async function loadLowStockItems() {
    try {
        console.log('Checking for low stock items...');
        
        const response = await fetch('/Inventory/items');
        if (!response.ok) {
            console.error('Failed to fetch inventory:', response.status);
            return;
        }
        
        const result = await response.json();
        console.log('Inventory response:', result);
        
        if (!result.success || !Array.isArray(result.items)) {
            console.error('Invalid inventory response format');
            return;
        }
        
        // Filter items that are low stock (quantity > 0 and <= threshold)
        const lowStockItems = result.items.filter(item => {
            const quantity = parseInt(item.quantity) || 0;
            return quantity > 0 && quantity <= LOW_STOCK_THRESHOLD;
        });
        
        // Sort by quantity (lowest first)
        lowStockItems.sort((a, b) => {
            const qtyA = parseInt(a.quantity) || 0;
            const qtyB = parseInt(b.quantity) || 0;
            return qtyA - qtyB;
        });
        
        console.log(`Found ${lowStockItems.length} low stock items (threshold: ${LOW_STOCK_THRESHOLD})`);
        
        // Update the low stock panel
        displayLowStockItems(lowStockItems);
        
    } catch (error) {
        console.error('Error loading low stock items:', error);
    }
}

function displayLowStockItems(items) {
    const stockRequestPanel = document.querySelector('.stock-request-panel');
    if (!stockRequestPanel) return;
    
    // Clear existing content except header
    const header = stockRequestPanel.querySelector('.stock-request-header');
    stockRequestPanel.innerHTML = '';
    if (header) {
        stockRequestPanel.appendChild(header);
    } else {
        // Recreate header if it doesn't exist
        const newHeader = document.createElement('div');
        newHeader.className = 'stock-request-header';
        newHeader.innerHTML = '<h3 style="color: black;"><b>Low Stock Items</b></h3>';
        stockRequestPanel.appendChild(newHeader);
    }
    
    if (items.length === 0) {
        // No low stock items
        const noItemsDiv = document.createElement('div');
        noItemsDiv.className = 'no-low-stock';
        noItemsDiv.style.cssText = `
            padding: 30px;
            text-align: center;
            color: #28a745;
            font-size: 16px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            margin: 15px;
        `;
        noItemsDiv.innerHTML = `
            <i class="bi bi-check-circle" style="font-size: 48px; color: #28a745; margin-bottom: 15px; display: block;"></i>
            <span>All items are well-stocked!</span>
        `;
        stockRequestPanel.appendChild(noItemsDiv);
        return;
    }
    
    // Create container for low stock items
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'low-stock-items-container';
    itemsContainer.style.cssText = `
        max-height: 400px;
        overflow-y: auto;
        padding: 10px;
    `;
    
    // Add each low stock item
    items.forEach(item => {
        const quantity = parseInt(item.quantity) || 0;
        const progressPercent = (quantity / LOW_STOCK_THRESHOLD) * 100;
        
        // Get dynamic color based on quantity (green->yellow->red)
        const stockColor = getStockColor(quantity);
        
        // Determine border color based on quantity
        let borderColor = stockColor;
        
        // Add pulsing animation for very low stock (quantity <= 2)
        const addPulseAnimation = quantity <= 2 ? 'animation: pulseBorder 2s infinite;' : '';
        
        const itemElement = document.createElement('div');
        itemElement.className = `low-stock-item`;
        itemElement.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border-left: 4px solid ${borderColor};
            transition: all 0.3s ease;
            ${addPulseAnimation}
        `;
        
        // Add CSS for pulse animation
        if (!document.getElementById('pulse-animation-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation-style';
            style.textContent = `
                @keyframes pulseBorder {
                    0% { border-left-color: #dc3545; }
                    50% { border-left-color: #ff6b6b; }
                    100% { border-left-color: #dc3545; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Determine badge text based on quantity
        let badgeText = '';
        let badgeColor = '';
        if (quantity <= 1) {
            badgeText = 'CRITICAL';
            badgeColor = '#dc3545';
        } else if (quantity === 2) {
            badgeText = 'VERY LOW';
            badgeColor = '#fd7e14';
        } else if (quantity === 3) {
            badgeText = 'LOW';
            badgeColor = '#ffc107';
        } else if (quantity === 4) {
            badgeText = 'MODERATE';
            badgeColor = '#28a745';
        } else {
            badgeText = 'OK';
            badgeColor = '#28a745';
        }
        
        itemElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #2d3748;">
                        ${item.name || 'Unknown Item'}
                    </h4>
                    <p style="margin: 5px 0 0; font-size: 13px; color: #6c757d;">
                        Category: ${item.category || 'Uncategorized'} | 
                        SKU: ${item.sku || 'N/A'}
                    </p>
                </div>
                <span style="
                    background: ${badgeColor}20;
                    color: ${badgeColor};
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    border: 1px solid ${badgeColor}40;
                ">
                    ${badgeText}
                </span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-size: 13px; color: #4a5568;">Current Stock:</span>
                    <span style="font-weight: 700; color: ${stockColor}; font-size: 16px;">${quantity} units</span>
                </div>
                <div style="
                    width: 100%;
                    height: 10px;
                    background: #e9ecef;
                    border-radius: 5px;
                    overflow: hidden;
                ">
                    <div style="
                        width: ${progressPercent}%;
                        height: 100%;
                        background: ${stockColor};
                        border-radius: 5px;
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span style="font-size: 11px; color: #6c757d;">0</span>
                    <span style="font-size: 11px; font-weight: 600; color: ${stockColor};">${quantity} / ${LOW_STOCK_THRESHOLD}</span>
                    <span style="font-size: 11px; color: #6c757d;">Threshold: ${LOW_STOCK_THRESHOLD}</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button class="btn-restock" onclick="restockItem('${item._id}', '${item.name}')" style="
                    width: 100%;
                    background: linear-gradient(135deg, #6a0dad 0%, #8a2be2 100%);
                    color: white;
                    border: none;
                    padding: 8px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">Restock Now</button>
            </div>
            
            ${quantity <= 1 ? `
                <div style="
                    margin-top: 8px;
                    padding: 6px;
                    background: #f8d7da;
                    color: #b02a37;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-align: center;
                    border: 1px solid #f5c6cb;
                ">
                    ⚠️ CRITICAL: Immediate restock needed!
                </div>
            ` : quantity === 2 ? `
                <div style="
                    margin-top: 8px;
                    padding: 6px;
                    background: #fff3cd;
                    color: #fd7e14;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-align: center;
                    border: 1px solid #ffe69c;
                ">
                    ⚠️ Very low stock - restock soon!
                </div>
            ` : ''}
        `;
        
        // Add hover effect
        itemElement.addEventListener('mouseenter', () => {
            itemElement.style.transform = 'translateY(-2px)';
            itemElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        
        itemElement.addEventListener('mouseleave', () => {
            itemElement.style.transform = 'translateY(0)';
            itemElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
        });
        
        itemsContainer.appendChild(itemElement);
    });
    
    stockRequestPanel.appendChild(itemsContainer);
}

function restockItem(itemId, itemName) {
    showNotification(`Restock ${itemName}`, 'info');
    setTimeout(() => {
        window.location.href = `/Dashboard/Admin-dashboard/Inventory?restock=${itemId}`;
    }, 1000);
}

function viewItemDetails(itemId) {
    window.location.href = `/Dashboard/Admin-dashboard/Inventory?view=${itemId}`;
}

function startLowStockPolling() {
    console.log('Starting low stock polling...');
    
    // Initial load
    setTimeout(() => {
        console.log('First low stock check...');
        loadLowStockItems();
    }, 1000);
    
    // Poll every 30 seconds
    lowStockPollInterval = setInterval(() => {
        console.log('Periodic low stock check...');
        loadLowStockItems();
    }, 30000);
}

// ================= OUT OF STOCK ALERT FUNCTIONS =================

function createOutOfStockAlertModal() {
    if (document.getElementById('outOfStockAlertModal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'outOfStockAlertModal';
    modal.innerHTML = `
        <div class="out-of-stock-modal">
            <div class="out-of-stock-icon">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            
            <h2 class="out-of-stock-title">Out of Stock Alert!</h2>
            
            <div class="out-of-stock-message">
                <p>Please stock items below!!!!</p>
            </div>
            
            <div class="out-of-stock-list" id="outOfStockAlertList">
                <!-- Out of stock items will be listed here -->
            </div>
            
            <div class="timer-container">
                <i class="bi bi-clock timer-icon"></i>
                <span class="timer-text">OK button will be enabled in:</span>
                <span class="timer-countdown" id="outOfStockAlertCountdown">5</span>
                <span class="timer-text">seconds</span>
            </div>
            
            <button class="out-of-stock-ok-btn" id="outOfStockAlertOkBtn" onclick="closeOutOfStockAlertModal()">
                OK, I Understand
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    outOfStockAlertModal = modal;
    outOfStockAlertOkBtn = document.getElementById('outOfStockAlertOkBtn');
    outOfStockAlertCountdown = document.getElementById('outOfStockAlertCountdown');
    
    if (!document.getElementById('out-of-stock-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'out-of-stock-modal-styles';
        style.textContent = `
            #outOfStockAlertModal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.7);
                z-index: 99999;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            #outOfStockAlertModal.open {
                display: flex;
            }
            
            .out-of-stock-modal {
                background-color: white;
                border-radius: 12px;
                padding: 30px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                text-align: center;
                animation: modalAppear 0.3s ease-out;
                position: relative;
                z-index: 100000;
            }
            
            @keyframes modalAppear {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .out-of-stock-icon {
                font-size: 64px;
                color: #dc3545;
                margin-bottom: 20px;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .out-of-stock-title {
                color: #dc3545;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 15px;
            }
            
            .out-of-stock-message {
                color: #333;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 25px;
            }
            
            .out-of-stock-message p {
                margin: 10px 0;
            }
            
            .out-of-stock-list {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 25px;
                max-height: 200px;
                overflow-y: auto;
                text-align: left;
            }
            
            .out-of-stock-item {
                padding: 10px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .out-of-stock-item:last-child {
                border-bottom: none;
            }
            
            .timer-container {
                margin: 20px 0;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .timer-icon {
                font-size: 24px;
                color: #6a0dad;
            }
            
            .timer-text {
                font-size: 16px;
                font-weight: bold;
                color: #333;
            }
            
            .timer-countdown {
                font-size: 28px;
                font-weight: bold;
                color: #dc3545;
                min-width: 40px;
            }
            
            .out-of-stock-ok-btn {
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 12px 40px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 100%;
                opacity: 0.5;
                pointer-events: none;
            }
            
            .out-of-stock-ok-btn.enabled {
                opacity: 1;
                pointer-events: auto;
            }
            
            .out-of-stock-ok-btn.enabled:hover {
                background-color: #c82333;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
            }
            
            .out-of-stock-ok-btn:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }
}

async function checkOutOfStockItems() {
    try {
        const now = Date.now();
        if (now - lastOutOfStockCheck < 10000) {
            return;
        }
        
        lastOutOfStockCheck = now;
        
        console.log('Checking for out of stock items...');
        
        const response = await fetch('/Inventory/items');
        if (!response.ok) {
            console.error('Failed to fetch inventory:', response.status);
            return;
        }
        
        const result = await response.json();
        
        if (!result.success || !Array.isArray(result.items)) {
            console.error('Invalid inventory response format');
            return;
        }
        
        // Filter items that are out of stock (quantity = 0)
        const currentOutOfStockItems = result.items.filter(item => {
            const quantity = parseInt(item.quantity) || 0;
            return quantity === 0;
        });
        
        console.log(`Found ${currentOutOfStockItems.length} out of stock items`);
        
        const currentItemIds = new Set(currentOutOfStockItems.map(item => item._id));
        
        outOfStockItemsData = currentOutOfStockItems;
        
        if (currentOutOfStockItems.length > 0) {
            const isModalOpen = outOfStockAlertModal && outOfStockAlertModal.classList.contains('open');
            
            let hasNewItems = false;
            if (previousOutOfStockItems.size === 0) {
                hasNewItems = currentOutOfStockItems.length > 0;
            } else {
                hasNewItems = Array.from(currentItemIds).some(id => !previousOutOfStockItems.has(id));
            }
            
            previousOutOfStockItems = currentItemIds;
            
            if (hasNewItems || !isModalOpen) {
                console.log('Showing out of stock alert...');
                showOutOfStockAlert();
            } else {
                console.log('No new out of stock items or modal already open');
            }
        } else {
            console.log('No out of stock items found.');
            previousOutOfStockItems.clear();
        }
    } catch (error) {
        console.error('Error checking out of stock items:', error);
    }
}

function showOutOfStockAlert() {
    createOutOfStockAlertModal();
    
    if (!outOfStockAlertModal || !outOfStockAlertOkBtn || !outOfStockAlertCountdown) {
        console.error('Out of stock alert elements not found');
        return;
    }
    
    const outOfStockList = document.getElementById('outOfStockAlertList');
    if (outOfStockList && outOfStockItemsData.length > 0) {
        outOfStockList.innerHTML = '';
        
        outOfStockItemsData.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'out-of-stock-item';
            itemElement.innerHTML = `
                <div>
                    <strong>${item.name || 'Unknown Item'}</strong>
                    <br>
                    <small style="color: #6c757d;">Category: ${item.category || 'Uncategorized'}</small>
                </div>
                <span class="badge bg-danger">Quantity: 0</span>
            `;
            outOfStockList.appendChild(itemElement);
        });
    }
    
    outOfStockAlertSeconds = 5;
    outOfStockAlertCountdown.textContent = outOfStockAlertSeconds;
    outOfStockAlertOkBtn.disabled = true;
    outOfStockAlertOkBtn.classList.remove('enabled');
    
    if (outOfStockAlertTimer) {
        clearInterval(outOfStockAlertTimer);
    }
    
    outOfStockAlertTimer = setInterval(() => {
        outOfStockAlertSeconds--;
        outOfStockAlertCountdown.textContent = outOfStockAlertSeconds;
        
        if (outOfStockAlertSeconds <= 0) {
            clearInterval(outOfStockAlertTimer);
            outOfStockAlertOkBtn.disabled = false;
            outOfStockAlertOkBtn.classList.add('enabled');
        }
    }, 1000);
    
    outOfStockAlertModal.classList.add('open');
    
    playWarningSound();
    
    console.log(`Out of stock alert shown with ${outOfStockItemsData.length} items`);
}

function closeOutOfStockAlertModal() {
    if (outOfStockAlertModal) {
        outOfStockAlertModal.classList.remove('open');
    }
    
    if (outOfStockAlertTimer) {
        clearInterval(outOfStockAlertTimer);
    }
    
    if (outOfStockItemsData.length > 0) {
        showNotification(`${outOfStockItemsData.length} items are out of stock. Please restock soon!`, 'warning');
    }
    
    console.log('Out of stock alert closed');
}

function playWarningSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
        console.log("Audio not supported or blocked by browser");
    }
}

function startOutOfStockPolling() {
    console.log('Starting out of stock polling...');
    
    setTimeout(() => {
        console.log('First out of stock check...');
        checkOutOfStockItems();
    }, 2000);
    
    outOfStockAlertInterval = setInterval(() => {
        console.log('Periodic out of stock check...');
        checkOutOfStockItems();
    }, 30000);
}

// ================= SALES CHART FUNCTIONS WITH YEAR NAVIGATION =================

function initSalesChart() {
    console.log('Initializing sales chart...');
    
    const chartContainer = document.getElementById('chartContainer');
    if (!chartContainer) {
        console.log('Chart container not found');
        return;
    }
    
    currentYear = 2026;
    
    const yearNavigation = document.createElement('div');
    yearNavigation.className = 'chart-year-nav';
    yearNavigation.innerHTML = `
        <button class="year-nav-btn prev" id="prevYearBtn">
            <i class="bi bi-chevron-left"></i>
        </button>
        <span class="year-display" id="currentYearDisplay">${currentYear}</span>
        <button class="year-nav-btn next" id="nextYearBtn">
            <i class="bi bi-chevron-right"></i>
        </button>
    `;
    
    const chartWrapper = chartContainer.parentNode;
    chartWrapper.insertBefore(yearNavigation, chartContainer);
    
    chartContainer.innerHTML = '<canvas id="salesChart"></canvas>';
    
    if (!document.getElementById('year-nav-styles')) {
        const style = document.createElement('style');
        style.id = 'year-nav-styles';
        style.textContent = `
            .chart-year-nav {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-bottom: 15px;
                padding: 5px;
            }
            
            .year-nav-btn {
                background-color: #6a0dad;
                color: white;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 14px;
                padding: 0;
            }
            
            .year-nav-btn:hover:not(:disabled) {
                background-color: #4a0aad;
                transform: translateY(-1px);
            }
            
            .year-nav-btn:active:not(:disabled) {
                transform: translateY(0);
            }
            
            .year-nav-btn:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
                opacity: 0.5;
            }
            
            .year-display {
                font-size: 18px;
                font-weight: 600;
                color: #2d3748;
                min-width: 60px;
                text-align: center;
                padding: 2px 10px;
                background-color: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #e9ecef;
            }
            
            .chart-loading, .chart-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 400px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
            }
            
            .chart-loading i, .chart-error i {
                font-size: 36px;
                margin-bottom: 15px;
                color: #6a0dad;
                opacity: 0.7;
            }
            
            .chart-error i {
                color: #dc3545;
            }
        `;
        document.head.appendChild(style);
    }
    
    loadSalesChartData();
    setupYearNavigation();
    setupChartRefresh();
}

function setupYearNavigation() {
    const prevYearBtn = document.getElementById('prevYearBtn');
    const nextYearBtn = document.getElementById('nextYearBtn');
    const currentYearDisplay = document.getElementById('currentYearDisplay');
    
    if (prevYearBtn) {
        prevYearBtn.addEventListener('click', function() {
            currentYear--;
            updateYearDisplay();
            loadSalesChartData();
            updateNavButtons();
        });
    }
    
    if (nextYearBtn) {
        nextYearBtn.addEventListener('click', function() {
            currentYear++;
            updateYearDisplay();
            loadSalesChartData();
            updateNavButtons();
        });
    }
    
    function updateYearDisplay() {
        if (currentYearDisplay) {
            currentYearDisplay.textContent = currentYear;
        }
    }
    
    function updateNavButtons() {
        if (prevYearBtn) {
            prevYearBtn.disabled = false;
        }
        
        if (nextYearBtn) {
            nextYearBtn.disabled = false;
        }
    }
    
    updateNavButtons();
}

async function loadSalesChartData() {
    try {
        console.log(`Loading sales chart data for year: ${currentYear}`);
        
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="chart-loading"><i class="bi bi-hourglass-split"></i><div>Loading chart data...</div></div>';
        }
        
        const currentYearDisplay = document.getElementById('currentYearDisplay');
        if (currentYearDisplay) {
            currentYearDisplay.textContent = currentYear;
        }
        
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        console.log(`Fetching data for all 12 months of ${currentYear}`);
        
        const monthPromises = [];
        const monthData = [];
        
        for (let month = 1; month <= 12; month++) {
            console.log(`Fetching data for month ${month}/${currentYear}`);
            monthPromises.push(
                fetchMonthlySalesData(currentYear, month)
            );
        }
        
        const results = await Promise.allSettled(monthPromises);
        console.log(`Received ${results.length} results`);
        
        results.forEach((result, index) => {
            const monthNumber = index + 1;
            const monthName = monthNames[index];
            
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
                monthData.push({
                    month: monthNumber,
                    monthName: monthName,
                    revenue: 0,
                    profit: 0,
                    orders: 0
                });
            }
        });
        
        console.log('Processed month data for all 12 months:', monthData);
        chartData = monthData;
        renderSalesChart();
        
    } catch (error) {
        console.error('Error loading sales chart data:', error);
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="chart-error"><i class="bi bi-exclamation-triangle"></i><div>Failed to load chart data. Please try again.</div></div>';
        }
    }
}

async function fetchMonthlySalesData(year, month) {
    try {
        console.log(`Fetching /api/reports/monthly/${year}/${month}`);
        const response = await fetch(`/api/reports/monthly/${year}/${month}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log(`No data found for ${month}/${year}, using zero values`);
                return {
                    totalRevenue: 0,
                    totalProfit: 0,
                    totalOrders: 0
                };
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`Response for ${month}/${year}:`, result);
        
        if (result.success && result.data) {
            return result.data.summary;
        } else {
            return {
                totalRevenue: 0,
                totalProfit: 0,
                totalOrders: 0
            };
        }
    } catch (error) {
        console.log(`Failed to fetch data for ${month}/${year}:`, error.message);
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
            chartContainer.innerHTML = '<div class="chart-error"><i class="bi bi-graph-up"></i><div>No sales data available for this year</div></div>';
        }
        return;
    }
    
    const chartContainer = document.getElementById('chartContainer');
    if (!chartContainer) {
        console.error('Chart container not found');
        return;
    }
    
    let canvas = document.getElementById('salesChart');
    if (!canvas) {
        chartContainer.innerHTML = '<canvas id="salesChart"></canvas>';
        canvas = document.getElementById('salesChart');
    }
    
    if (!canvas) {
        console.error('Failed to create canvas element');
        chartContainer.innerHTML = '<div class="chart-error"><i class="bi bi-exclamation-triangle"></i><div>Failed to create chart</div></div>';
        return;
    }
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    const months = chartData.map(data => {
        return data.monthName.substring(0, 3);
    });
    
    const revenues = chartData.map(data => data.revenue);
    const profits = chartData.map(data => data.profit);
    
    console.log('Chart data:', { months, revenues, profits });
    
    const maxRevenue = Math.max(...revenues);
    const maxProfit = Math.max(...profits);
    const maxValue = Math.max(maxRevenue, maxProfit);
    const suggestedMax = Math.ceil(maxValue / 100000) * 100000 + 100000;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(106, 13, 173, 0.8)');
    gradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.6)');
    gradient.addColorStop(1, 'rgba(106, 13, 173, 0.2)');
    
    const profitGradient = ctx.createLinearGradient(0, 0, 0, 400);
    profitGradient.addColorStop(0, 'rgba(40, 167, 69, 0.8)');
    profitGradient.addColorStop(1, 'rgba(40, 167, 69, 0.2)');
    
    try {
        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Total Sales',
                        data: revenues,
                        backgroundColor: gradient,
                        borderColor: '#6a0dad',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        hoverBackgroundColor: 'rgba(106, 13, 173, 0.9)',
                        hoverBorderColor: '#4a0aad',
                        hoverBorderWidth: 3,
                        order: 2,
                        categoryPercentage: 0.8,
                        barPercentage: 0.9
                    },
                    {
                        label: 'Profit',
                        data: profits,
                        type: 'line',
                        fill: false,
                        borderColor: '#28a745',
                        backgroundColor: profitGradient,
                        borderWidth: 4,
                        tension: 0.4,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#28a745',
                        pointBorderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 9,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#28a745',
                        pointHoverBorderWidth: 4,
                        order: 1,
                        segment: {
                            borderColor: ctx => {
                                const value = ctx.p0.parsed.y;
                                return value > 0 ? '#28a745' : value < 0 ? '#dc3545' : '#ffc107';
                            }
                        }
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
                            pointStyle: 'circle',
                            font: {
                                family: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
                                size: 13,
                                weight: '500'
                            },
                            color: '#2d3748'
                        },
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex;
                            const ci = legend.chart;
                            const meta = ci.getDatasetMeta(index);
                            
                            meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                            ci.update();
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#e2e8f0',
                        borderColor: '#6a0dad',
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 15,
                        boxPadding: 6,
                        titleFont: {
                            family: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
                            size: 13,
                            weight: '500'
                        },
                        bodyFont: {
                            family: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
                            size: 13,
                            weight: '400'
                        },
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
                            },
                            labelColor: function(context) {
                                return {
                                    borderColor: context.datasetIndex === 0 ? '#6a0dad' : '#28a745',
                                    backgroundColor: context.datasetIndex === 0 ? '#6a0dad' : '#28a745',
                                    borderWidth: 2,
                                    borderRadius: 2
                                };
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                family: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
                                size: 12,
                                weight: '500'
                            },
                            color: '#4a5568',
                            maxRotation: 0
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: suggestedMax,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return '₱' + (value / 1000000).toFixed(1) + 'M';
                                }
                                if (value >= 1000) {
                                    return '₱' + (value / 1000).toFixed(1) + 'K';
                                }
                                return '₱' + value;
                            },
                            font: {
                                family: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
                                size: 12,
                                weight: '500'
                            },
                            color: '#4a5568',
                            padding: 8,
                            stepSize: suggestedMax / 5
                        },
                        border: {
                            display: false
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
                },
                transitions: {
                    active: {
                        animation: {
                            duration: 300
                        }
                    }
                },
                hover: {
                    animationDuration: 200
                }
            }
        });
        
        console.log(`Chart rendered successfully for ${currentYear} with max value: ${suggestedMax}`);
        
    } catch (error) {
        console.error('Error rendering chart:', error);
        chartContainer.innerHTML = '<div class="chart-error"><i class="bi bi-exclamation-triangle"></i><div>Error rendering chart</div></div>';
    }
}

function setupChartRefresh() {
    const refreshBtn = document.getElementById('refreshSalesChart');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            const icon = this.querySelector('i');
            icon.classList.add('spinning');
            this.classList.add('spinning');
            
            this.disabled = true;
            
            try {
                await loadSalesChartData();
                showNotification('Chart refreshed successfully', 'success');
            } catch (error) {
                console.error('Error refreshing chart:', error);
                showNotification('Failed to refresh chart', 'error');
            } finally {
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
    updateStockRequestBadge();
    
    stockRequestPollInterval = setInterval(() => {
        updateStockRequestBadge();
    }, 30000); 
}

// ================= DASHBOARD FUNCTIONS =================
function updateDashboard(data) {
    
    const totalSalesEl = document.getElementById('totalSales');
    if (totalSalesEl) {
        const newSalesValue = formatCurrency(data.totalSales || 0);
        if (totalSalesEl.textContent !== newSalesValue) {
            totalSalesEl.textContent = newSalesValue;
            totalSalesEl.classList.add('value-updated');
            setTimeout(() => totalSalesEl.classList.remove('value-updated'), 1000);
        }
    }

    const netProfitEl = document.getElementById('netProfit');
    if (netProfitEl) {
        const newProfitValue = formatCurrency(data.netProfit || 0);
        if (netProfitEl.textContent !== newProfitValue) {
            netProfitEl.textContent = newProfitValue;
            netProfitEl.classList.add('value-updated');
            setTimeout(() => netProfitEl.classList.remove('value-updated'), 1000);
        }
    }

    const ordersTodayEl = document.getElementById('ordersToday');
    if (ordersTodayEl) {
        const newOrdersValue = String(data.ordersToday || 0);
        if (ordersTodayEl.textContent !== newOrdersValue) {
            ordersTodayEl.textContent = newOrdersValue;
            ordersTodayEl.classList.add('value-updated');
            setTimeout(() => ordersTodayEl.classList.remove('value-updated'), 1000);
        }
    }

    const totalCustomersEl = document.getElementById('totalCustomers');
    if (totalCustomersEl) {
        const newCustomersValue = String(data.totalCustomers || 0);
        if (totalCustomersEl.textContent !== newCustomersValue) {
            totalCustomersEl.textContent = newCustomersValue;
            totalCustomersEl.classList.add('value-updated');
            setTimeout(() => totalCustomersEl.classList.remove('value-updated'), 1000);
        }
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
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
            logoutBtn.style.opacity = '0.7';
            logoutBtn.style.cursor = 'not-allowed';
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
        
        localStorage.clear();
        sessionStorage.clear();
        
        if (posOrderCounter) {
            localStorage.setItem('posOrderCounter', posOrderCounter);
        }
        if (themePreference) {
            localStorage.setItem('theme', themePreference);
        }

        document.cookie.split(";").forEach(function(c) {
            const cookieParts = c.split("=");
            const cookieName = cookieParts[0].trim();
            const sensitiveKeywords = ['auth', 'token', 'session', 'jwt', 'refresh'];

            if (sensitiveKeywords.some(keyword => cookieName.toLowerCase().includes(keyword))) {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });

        if (dashboardPollInterval) {
            clearInterval(dashboardPollInterval);
        }
        
        if (stockRequestPollInterval) {
            clearInterval(stockRequestPollInterval);
        }
        
        if (lowStockPollInterval) {
            clearInterval(lowStockPollInterval);
        }
        
        if (outOfStockAlertInterval) {
            clearInterval(outOfStockAlertInterval);
        }
        
        if (salesChart) {
            salesChart.destroy();
            salesChart = null;
        }

        showNotification('Logged out successfully! Redirecting to login page...', 'success');
        
        setTimeout(() => {
            window.location.replace('/');
        }, 2000); 

    } catch (error) {
        console.error('Logout error:', error);
        
        showNotification('Error during logout. Redirecting...', 'error');
        
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
    
    // Load dashboard data
    loadDashboardData();
    updateStockRequestBadge();
    
    // Initialize sales chart
    initSalesChart();
    
    // Start low stock polling (threshold now 5)
    startLowStockPolling();
    
    // Start out of stock polling (for zero quantity items)
    startOutOfStockPolling();
    
    // Start dashboard polling
    startDashboardPolling();
    
    // Start stock request polling
    startStockRequestPolling();
    
    console.log('Dashboard initialized with:');
    console.log(`- Low stock threshold: ${LOW_STOCK_THRESHOLD} (quantity > 0 and <= ${LOW_STOCK_THRESHOLD})`);
    console.log('- Out of stock alert system (quantity = 0)');
    console.log('- Year navigation starting at 2026');
    
    // Add escape key handler for out of stock modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && outOfStockAlertModal && outOfStockAlertModal.classList.contains('open')) {
            const okBtn = document.getElementById('outOfStockAlertOkBtn');
            if (okBtn && !okBtn.disabled) {
                closeOutOfStockAlertModal();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initDashboard);

// Export functions that might be used elsewhere
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;
window.loadDashboardData = loadDashboardData;
window.updateStockRequestBadge = updateStockRequestBadge;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.loadLowStockItems = loadLowStockItems;
window.restockItem = restockItem;
window.viewItemDetails = viewItemDetails;
window.checkOutOfStockItems = checkOutOfStockItems;
window.showOutOfStockAlert = showOutOfStockAlert;
window.closeOutOfStockAlertModal = closeOutOfStockAlertModal;