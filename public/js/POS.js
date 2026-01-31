// ==================== GLOBAL VARIABLES ====================
let orderItems = [];
let currentCashReceived = 0;
let currentChange = 0;
let currentTotal = 0;
let currentOrderNumber = '';
let itemAvailability = {};
let eventSource = null;
let paymentMethod = 'cash';

// ==================== DOM ELEMENTS ====================
let completeOrderBtn;
let orderListElement;
let orderTotalElement;
let receiptPreview;
let printReceiptBtn;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing POS System');
    initializeDOMElements();
    initializeSystem();
});

function initializeDOMElements() {
    console.log('Initializing DOM Elements...');
    
    // Cache DOM elements
    const cashModal = document.getElementById('cashModal');
    const cashInput = document.getElementById('cashInput');
    const confirmCashBtn = document.getElementById('confirmCash');
    const cancelCashBtn = document.getElementById('cancelCash');
    completeOrderBtn = document.getElementById('completeOrder');
    printReceiptBtn = document.getElementById('printReceipt');
    const receiptModal = document.getElementById('receiptModal');
    receiptPreview = document.getElementById('receiptPreview');
    const printNowBtn = document.getElementById('printNow');
    const closeReceiptBtn = document.getElementById('closeReceipt');
    const gcashModal = document.getElementById('gcashModal');
    const paymentMethodBtn = document.getElementById('payment-method');
    const closeGCashBtn = document.getElementById('closeGCash');
    const resetOrderBtn = document.getElementById('resetOrderBtn');
    const printOnlyBtn = document.getElementById('printOnly');
    
    // GCash elements
    const confirmGCashBtn = document.getElementById('confirmGCash');
    const gcashTotalAmount = document.getElementById('gcashTotalAmount');
    
    // Order display elements
    orderListElement = document.getElementById('orderList');
    orderTotalElement = document.getElementById('orderTotal');
    
    // Payment display elements
    const cashSection = document.getElementById('cashSection');
    const cashReceivedElement = document.getElementById('cashReceived');
    const changeElement = document.getElementById('change');
    
    console.log('DOM Elements found:', {
        orderListElement: !!orderListElement,
        orderTotalElement: !!orderTotalElement,
        completeOrderBtn: !!completeOrderBtn,
        cashModal: !!cashModal,
        gcashModal: !!gcashModal,
        cashSection: !!cashSection,
        receiptPreview: !!receiptPreview,
        printReceiptBtn: !!printReceiptBtn,
        receiptModal: !!receiptModal,
        printNowBtn: !!printNowBtn,
        printOnlyBtn: !!printOnlyBtn
    });
    
    if (!orderListElement || !orderTotalElement) {
        console.error('CRITICAL: Order display elements not found!');
        showNotification('Error: POS system not properly loaded', 'error');
        return;
    }

    // Add event listeners
    if (completeOrderBtn) {
        completeOrderBtn.addEventListener('click', function() {
            console.log('Complete Order button clicked');
            if (orderItems.length === 0) {
                showNotification('Please add items first', 'error');
                return;
            }
            
  
            if (cashSection) {
                cashSection.style.display = 'none';
            }
            currentCashReceived = 0;
            currentChange = 0;
            paymentMethod = 'cash';
            

            document.getElementById('modalTitle').textContent = `Total: ₱${currentTotal.toFixed(2)} - Select Payment Method`;
            cashInput.value = currentTotal.toFixed(2);
            cashModal.style.display = 'flex';
            

            setTimeout(() => {
                cashInput.select();
                cashInput.focus();
            }, 100);
        });
    }

    if (confirmCashBtn) {
        confirmCashBtn.addEventListener('click', function() {
            console.log('Confirm Cash button clicked');
            const cashReceived = parseFloat(cashInput.value);
            
            if (isNaN(cashReceived) || cashReceived <= 0) {
                showNotification('Please enter a valid amount.', 'error');
                cashInput.focus();
                cashInput.select();
                return;
            }
            
            if (cashReceived < currentTotal) {
                showNotification('Insufficient cash received.', 'error');
                cashInput.focus();
                cashInput.select();
                return;
            }
            
            const change = cashReceived - currentTotal;
            currentCashReceived = cashReceived;
            currentChange = change;
            paymentMethod = 'cash';
            

            if (cashReceivedElement && changeElement && cashSection) {
                cashReceivedElement.textContent = `₱${cashReceived.toFixed(2)}`;
                changeElement.textContent = `₱${change.toFixed(2)}`;
                cashSection.style.display = 'block';
            }
            
            if (printReceiptBtn) {
                printReceiptBtn.disabled = false;
            }
            
            if (cashModal) {
                cashModal.style.display = 'none';
            }
            
            showNotification('Cash payment received. Click "Print Receipt" to save and print.', 'success');
        });
    }

    if (cancelCashBtn) {
        cancelCashBtn.addEventListener('click', function() {
            console.log('Cancel Cash button clicked');
            if (cashModal) {
                cashModal.style.display = 'none';
            }
        });
    }

    if (paymentMethodBtn) {
        paymentMethodBtn.addEventListener('click', function() {
            console.log('Payment Method button clicked (Switch to GCash)');

            if (gcashTotalAmount) {
                gcashTotalAmount.textContent = currentTotal.toFixed(2);
            }
            if (cashModal) {
                cashModal.style.display = 'none';
            }
            if (gcashModal) {
                gcashModal.style.display = 'flex';
            }
        });
    }

    if (confirmGCashBtn) {
        confirmGCashBtn.addEventListener('click', function() {
            console.log('Confirm GCash button clicked');

            currentCashReceived = currentTotal;
            currentChange = 0;
            paymentMethod = 'gcash';
            

            if (cashReceivedElement && changeElement && cashSection) {
                cashReceivedElement.textContent = `₱${currentTotal.toFixed(2)}`;
                changeElement.textContent = `₱0.00`;
                cashSection.style.display = 'block';
            }
            
            if (printReceiptBtn) {
                printReceiptBtn.disabled = false;
            }
            
            if (gcashModal) {
                gcashModal.style.display = 'none';
            }
            
            showNotification('GCash payment confirmed. Click "Print Receipt" to save and print.', 'success');
        });
    }

    if (closeGCashBtn) {
        closeGCashBtn.addEventListener('click', function() {
            console.log('Close GCash button clicked');
            if (gcashModal) {
                gcashModal.style.display = 'none';
            }

            if (cashModal) {
                cashModal.style.display = 'flex';
            }
        });
    }

    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', async function() {
            console.log('Print Receipt button clicked');
            if (orderItems.length === 0) {
                showNotification('No items to print.', 'error');
                return;
            }
            
            if (currentCashReceived === 0) {
                showNotification('Please complete the order first.', 'error');
                return;
            }
            

            const validation = validateOrderBeforeSave();
            if (!validation.valid) {
                showNotification(validation.message, 'error');
                return;
            }
            
            generateReceiptPreview();
            if (receiptModal) {
                receiptModal.style.display = 'flex';
            }
        });
    }

    if (printNowBtn) {
        printNowBtn.addEventListener('click', async function() {
            try {
                console.log('Print Now button clicked');
                console.log('Current order items:', orderItems);
                
                if (orderItems.length === 0) {
                    showNotification('No items to print.', 'error');
                    return;
                }
                
                if (currentCashReceived === 0) {
                    showNotification('Please complete the order first.', 'error');
                    return;
                }
                
                printNowBtn.disabled = true;
                const originalText = printNowBtn.textContent;
                printNowBtn.textContent = 'Processing...';
                
                showNotification('Processing order...', 'info');
                

                const saveResult = await saveOrderToDatabase();
                
                if (saveResult.success) {
                    showNotification(`Order #${saveResult.orderNumber} saved successfully!`, 'success');
                } else {
                    console.warn('Save failed, but continuing with print:', saveResult.error);
                    showNotification('Could not save to database, but printing receipt...', 'warning');
                }
                

                console.log('Calling printReceipt function...');
                printReceiptWithoutNewTab();
                

                orderItems = [];
                currentCashReceived = 0;
                currentChange = 0;
                updateOrderDisplay();
                

                try {
                    await loadItemAvailability();
                } catch (loadError) {
                    console.warn('Failed to reload availability:', loadError);
                }
                

                printNowBtn.disabled = false;
                printNowBtn.textContent = originalText;
                
                if (receiptModal) {
                    receiptModal.style.display = 'none';
                }
                
            } catch (error) {
                console.error('Error in print process:', error);
                showNotification('Error: ' + error.message, 'error');
                printNowBtn.disabled = false;
                printNowBtn.textContent = 'Print';
            }
        });
    }

    if (printOnlyBtn) {
        printOnlyBtn.addEventListener('click', function() {
            console.log('Print Only button clicked');
            if (orderItems.length === 0) {
                showNotification('No items to print.', 'error');
                return;
            }
            
            if (currentCashReceived === 0) {
                showNotification('Please complete the order first.', 'error');
                return;
            }
            

            printReceiptWithoutNewTab();
            if (receiptModal) {
                receiptModal.style.display = 'none';
            }
        });
    }

    if (closeReceiptBtn) {
        closeReceiptBtn.addEventListener('click', function() {
            console.log('Close Receipt button clicked');
            if (receiptModal) {
                receiptModal.style.display = 'none';
            }
        });
    }

    if (resetOrderBtn) {
        resetOrderBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to reset the order counter to 1?\n\nThis will affect new order numbers only.')) {
                try {
                    const response = await fetch('/api/pos/reset-order-number', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ resetTo: 1 })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        localStorage.setItem('posOrderCounter', '1');
                        window.orderCounter = 1;
                        updateNextOrderDisplay();
                        showNotification('Order counter has been reset to 1!', 'success');
                    } else {
                        showNotification('Error: ' + result.message, 'error');
                    }
                } catch (error) {
                    console.error('Reset failed:', error);
                    showNotification('Failed to reset order counter. Check console for details.', 'error');
                }
            }
        });
    }

    // Add keyboard support for cash modal
    if (cashInput) {
        cashInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                if (confirmCashBtn) {
                    confirmCashBtn.click();
                }
            } else if (e.key === 'Escape') {
                if (cancelCashBtn) {
                    cancelCashBtn.click();
                }
            }
        });
        

        cashInput.addEventListener('focus', function() {
            this.select();
        });
    }

    // Modal close on outside click
    window.addEventListener('click', function(event) {
        if (cashModal && event.target === cashModal) {
            cashModal.style.display = 'none';
        }
        if (gcashModal && event.target === gcashModal) {
            gcashModal.style.display = 'none';

            if (cashModal) {
                cashModal.style.display = 'flex';
            }
        }
        if (receiptModal && event.target === receiptModal) {
            receiptModal.style.display = 'none';
        }
    });

    // Logout functionality
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                performLogout();
            }
        });
    }

    // Menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const hasLink = this.querySelector('a');
            if (!hasLink) {
                e.preventDefault();
                document.querySelectorAll('.menu-item').forEach(i => {
                    i.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });


    setupMenuCardHandlers();
}

// ==================== MENU CARD HANDLERS ====================

function setupMenuCardHandlers() {
    console.log('Setting up menu card handlers...');
    

    const allMenuCards = document.querySelectorAll('.menu-card');
    console.log(`Found ${allMenuCards.length} menu cards`);
    

    allMenuCards.forEach(card => {

        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
    });
    

    const freshMenuCards = document.querySelectorAll('.menu-card');
    

    freshMenuCards.forEach(card => {
        card.addEventListener('click', function(e) {
            handleMenuCardClick(this, e);
        });
    });
    
    console.log('Menu card handlers setup complete');
}

function handleMenuCardClick(card, event) {
    console.log('Menu card clicked');
    

    if (event) {
        event.stopPropagation();
    }
    

    if (card.classList.contains('disabled')) {
        const productName = card.dataset.name;
        showNotification(`${productName} is out of stock!`, 'error');
        return;
    }
    
    const productName = card.dataset.name;
    const price = parseFloat(card.dataset.price);
    
    console.log('Menu card clicked:', { productName, price });
    

    if (!checkItemAvailability(productName)) {
        showNotification(`${productName} is out of stock!`, 'error');
        card.classList.add('disabled');
        addOutOfStockBadge(card);
        return;
    }
    

    const added = addToOrder(productName, price);
    if (added) {
        updateOrderDisplay();
        showNotification(`Added ${productName} to order`, 'success');
        

        card.style.transform = 'scale(0.95)';
        card.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.5)';
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.boxShadow = '';
        }, 300);
    }
}

// ==================== ORDER DISPLAY FUNCTIONS ====================

function updateOrderDisplay() {
    console.log('updateOrderDisplay called, orderItems:', orderItems);
    
    if (!orderListElement || !orderTotalElement) {
        console.error('Order display elements not found, trying to find again...');
        orderListElement = document.getElementById('orderList');
        orderTotalElement = document.getElementById('orderTotal');
        
        if (!orderListElement || !orderTotalElement) {
            console.error('CRITICAL: Order display elements still not found!');
            showNotification('Error: Cannot display order items', 'error');
            return;
        }
    }
    

    orderListElement.innerHTML = '';
    

    if (orderItems.length === 0) {
        console.log('No items in order, showing empty cart');
        orderListElement.innerHTML = '<div class="empty-cart">No items added</div>';
        orderTotalElement.textContent = '₱0.00';
        

        const cashSection = document.getElementById('cashSection');
        if (cashSection) {
            cashSection.style.display = 'none';
        }
        

        if (completeOrderBtn) {
            completeOrderBtn.disabled = true;
        }
        

        if (printReceiptBtn) {
            printReceiptBtn.disabled = true;
        }
        
        currentTotal = 0;
        currentCashReceived = 0;
        currentChange = 0;
        return;
    }
    

    currentTotal = 0;
    
    console.log('Processing order items:', orderItems);
    
    orderItems.forEach((item, index) => {
        currentTotal += item.total;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'order-item';
        itemElement.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">₱${item.price.toFixed(2)} each</div>
            </div>
            <div class="item-controls">
                <button class="quantity-btn minus" onclick="updateQuantity(${index}, -1)">−</button>
                <span class="item-quantity">${item.quantity}</span>
                <button class="quantity-btn plus" onclick="updateQuantity(${index}, 1)">+</button>
                <div class="item-total">₱${item.total.toFixed(2)}</div>
            </div>
        `;
        orderListElement.appendChild(itemElement);
    });
    

    orderTotalElement.textContent = `₱${currentTotal.toFixed(2)}`;
    console.log('Order total updated to:', currentTotal);
    
    // Enable complete order button
    if (completeOrderBtn) {
        completeOrderBtn.disabled = false;
    }
    

    const cashSection = document.getElementById('cashSection');
    if (cashSection && currentCashReceived > 0) {
        if (currentCashReceived < currentTotal) {
            console.log('Payment insufficient after order change, resetting payment');
            cashSection.style.display = 'none';
            currentCashReceived = 0;
            currentChange = 0;
            paymentMethod = 'cash';
            
            if (printReceiptBtn) {
                printReceiptBtn.disabled = true;
            }
        }
    }
    

    saveOrderToSession();
}

function updateQuantity(index, change) {
    console.log('updateQuantity called:', { index, change, orderItems });
    
    if (index < 0 || index >= orderItems.length) {
        console.error('Invalid item index:', index);
        return;
    }
    
    const item = orderItems[index];
    const normalizedName = item.name.trim();
    
    console.log('Updating quantity for:', item.name, 'Current quantity:', item.quantity);
    

    if (change > 0) {
        if (itemAvailability.hasOwnProperty(normalizedName)) {
            const itemData = itemAvailability[normalizedName];
            console.log('Availability check:', item.name, 'Available:', itemData.quantity);
            
            if (item.quantity + 1 > itemData.quantity) {
                showNotification(`Only ${itemData.quantity} ${item.name} available!`, 'error');
                return;
            }
        }
        

        if (!checkItemAvailability(normalizedName)) {
            showNotification(`${item.name} is out of stock!`, 'error');
            return;
        }
    }
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        console.log('Removing item from order:', item.name);
        orderItems.splice(index, 1);
    } else {
        item.total = item.quantity * item.price;
        console.log('Updated item:', item);
    }
    
    updateOrderDisplay();
}

// ==================== PRINT FUNCTIONS ====================


function printReceiptWithoutNewTab() {
    console.log('Printing receipt without new tab...');
    console.log('Current order items:', orderItems);
    
    if (orderItems.length === 0) {
        showNotification('No items to print!', 'error');
        return;
    }
    
    // Create receipt content
    const now = new Date();
    const dateString = now.toLocaleDateString('en-PH', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    
    // Calculate totals
    const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
    
    // Create a simple receipt HTML
    const receiptContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt ${currentOrderNumber}</title>
            <style>
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 10px;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        line-height: 1.2;
                        width: 80mm;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.2;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 10px;
                    background: white;
                }
                .center { text-align: center; }
                .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                .item-row { display: flex; justify-content: space-between; margin: 3px 0; }
                .total-row { font-weight: bold; border-top: 2px solid #000; padding-top: 5px; margin-top: 10px; }
                .thank-you { text-align: center; margin-top: 15px; font-weight: bold; }
                button {
                    margin: 10px;
                    padding: 10px 15px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                }
                button:hover {
                    background: #0056b3;
                }
            </style>
        </head>
        <body>
            <div class="center">
                <h2 style="margin: 5px 0; font-size: 14px;">ANGELO'S BURGER</h2>
                <p style="margin: 2px 0; font-size: 10px;">Bagong Buhay II, Sampol Market</p>
                <p style="margin: 2px 0; font-size: 10px;">In front of 7 Eleven</p>
                <p style="margin: 2px 0; font-size: 10px;">CSJDM, Bulacan</p>
            </div>
            
            <div class="line"></div>
            
            <div class="center">
                <p style="margin: 3px 0; font-weight: bold;">SALES INVOICE</p>
                <p style="margin: 3px 0;">Date: ${dateString}</p>
                <p style="margin: 3px 0;">Order #: ${currentOrderNumber || 'N/A'}</p>
                <p style="margin: 3px 0;">Payment: ${paymentMethod.toUpperCase()}</p>
            </div>
            
            <div class="line"></div>
            
            <div>
                <div class="item-row" style="font-weight: bold;">
                    <span style="width: 40px; text-align: right;">QTY</span>
                    <span style="flex: 1; padding: 0 10px; text-align: left;">ITEM</span>
                    <span style="width: 80px; text-align: right;">AMOUNT</span>
                </div>
            </div>
            
            <div class="line"></div>
            
            ${orderItems.map(item => {
                const itemName = item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name;
                return `
                <div class="item-row">
                    <span style="width: 40px; text-align: right;">${item.quantity}</span>
                    <span style="flex: 1; padding: 0 10px; text-align: left;">${itemName}</span>
                    <span style="width: 80px; text-align: right;">₱${item.total.toFixed(2)}</span>
                </div>
                `;
            }).join('')}
            
            <div class="line"></div>
            
            <div class="item-row">
                <span>Total Qty:</span>
                <span>${totalQty}</span>
            </div>
            
            <div class="item-row total-row">
                <span>TOTAL:</span>
                <span>₱${totalAmount.toFixed(2)}</span>
            </div>
            
            <div class="item-row">
                <span>PAYMENT METHOD:</span>
                <span>${paymentMethod.toUpperCase()}</span>
            </div>
            
            <div class="item-row">
                <span>AMOUNT RECEIVED:</span>
                <span>₱${currentCashReceived.toFixed(2)}</span>
            </div>
            
            ${paymentMethod === 'cash' ? `
                <div class="item-row total-row">
                    <span>CHANGE:</span>
                    <span>₱${currentChange.toFixed(2)}</span>
                </div>
            ` : ''}
            
            <div class="line"></div>
            
            <div class="thank-you">
                <p style="margin: 3px 0;">THIS SERVES AS AN OFFICIAL RECEIPT</p>
                <p style="margin: 3px 0;">THANK YOU AND COME AGAIN!</p>
            </div>
            
            <div class="center no-print" style="margin-top: 20px;">
                <button onclick="window.print()" id="printBtn">Print Receipt</button>
                <button onclick="window.close()" id="closeBtn">Close</button>
            </div>
        </body>
        </html>
    `;
    

    try {
        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.name = 'printFrame';
        iframe.style.cssText = 'position: absolute; width: 0; height: 0; border: 0;';
        document.body.appendChild(iframe);
        
        // Write content to iframe
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(receiptContent);
        iframeDoc.close();
        
        // Wait for iframe to load
        iframe.onload = function() {
            try {
                // Focus on the iframe and print
                setTimeout(() => {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    
                    // Remove iframe after printing
                    setTimeout(() => {
                        if (iframe.parentNode) {
                            document.body.removeChild(iframe);
                        }
                        showNotification('Receipt sent to printer!', 'success');
                    }, 1000);
                }, 500);
            } catch (error) {
                console.error('Iframe print error:', error);
                showNotification('Error printing: ' + error.message, 'error');
                // Remove iframe on error
                if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                }
            }
        };
        
    } catch (error) {
        console.error('Print error:', error);
        showNotification('Error printing receipt: ' + error.message, 'error');
    }
}


function printReceipt() {
    console.log('Using old print function (with new tab)');

    printReceiptWithoutNewTab();
}

function generateReceiptPreview() {
    console.log('Generating receipt preview...');
    
    const now = new Date();
    const dateString = now.toLocaleDateString('en-PH', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    

    const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
    
    let receiptHtml = `
        <div style="font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; max-width: 300px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 10px;">
                <strong style="font-size: 14px;">ANGELO'S BURGER</strong><br>
                <span style="font-size: 10px;">Bagong Buhay II, Sampol Market</span><br>
                <span style="font-size: 10px;">In front of 7 Eleven</span><br>
                <span style="font-size: 10px;">CSJDM, Bulacan</span>
            </div>
            
            <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;">
            
            <div style="text-align: center;">
                <strong>SALES INVOICE</strong><br>
                Date: ${dateString}<br>
                Order #: ${currentOrderNumber || 'Pending'}<br>
                Payment: ${paymentMethod.toUpperCase()}
            </div>
            
            <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;">
            
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span style="width: 30px; text-align: right;">QTY</span>
                <span style="flex: 1; padding: 0 5px;">ITEM</span>
                <span style="width: 60px; text-align: right;">AMOUNT</span>
            </div>
            
            <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;">
    `;
    
    if (orderItems.length === 0) {
        receiptHtml += `
            <div style="text-align: center; padding: 20px; color: #666;">
                No items in order
            </div>
        `;
    } else {
        orderItems.forEach(item => {
            const itemName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
            receiptHtml += `
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span style="width: 30px; text-align: right;">${item.quantity}</span>
                    <span style="flex: 1; padding: 0 5px;">${itemName}</span>
                    <span style="width: 60px; text-align: right;">₱${item.total.toFixed(2)}</span>
                </div>
            `;
        });
    }
    
    receiptHtml += `
            <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;">
            
            <div style="display: flex; justify-content: space-between;">
                <span>Total Qty:</span>
                <span>${totalQty}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 2px solid #000; padding-top: 5px; margin-top: 10px;">
                <span>TOTAL:</span>
                <span>₱${totalAmount.toFixed(2)}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between;">
                <span>PAYMENT METHOD:</span>
                <span>${paymentMethod.toUpperCase()}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between;">
                <span>AMOUNT RECEIVED:</span>
                <span>₱${currentCashReceived.toFixed(2)}</span>
            </div>
    `;
    
    if (paymentMethod === 'cash') {
        receiptHtml += `
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span>CHANGE:</span>
                <span>₱${currentChange.toFixed(2)}</span>
            </div>
        `;
    }
    
    receiptHtml += `
            <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;">
            
            <div style="text-align: center; margin-top: 15px; font-weight: bold;">
                <p style="margin: 3px 0; font-size: 11px;">THIS SERVES AS AN OFFICIAL RECEIPT</p>
                <p style="margin: 3px 0; font-size: 11px;">THANK YOU AND COME AGAIN!</p>
            </div>
        </div>
    `;
    
    if (receiptPreview) {
        receiptPreview.innerHTML = receiptHtml;
    } else {
        console.error('receiptPreview element not found!');
        const element = document.getElementById('receiptPreview');
        if (element) {
            element.innerHTML = receiptHtml;
        }
    }
    console.log('Receipt preview generated');
}

// ==================== OUT OF STOCK BADGE FUNCTIONS ====================

function addOutOfStockBadge(card) {

    removeOutOfStockBadge(card);
    

    const badge = document.createElement('div');
    badge.className = 'out-of-stock-badge';
    badge.textContent = 'OUT OF STOCK';
    badge.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: bold;
        z-index: 10;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        border: 2px solid white;
    `;
    
    card.appendChild(badge);
}

function removeOutOfStockBadge(card) {
    const badges = card.querySelectorAll('.out-of-stock-badge');
    badges.forEach(badge => {
        badge.remove();
    });
}

// ==================== ITEM AVAILABILITY FUNCTIONS ====================

async function loadItemAvailability() {
    try {
        console.log('Loading product availability from server...');
        
        const response = await fetch('/api/pos/items');
        
        if (response.ok) {
            const result = await response.json();
            

            itemAvailability = {};
            
            console.log('Server response:', result);
            
            if (result.success && Array.isArray(result.items)) {
                result.items.forEach(product => {
                    if (product && product.name) {
                        const displayName = product.name.trim();
                        const quantity = product.quantity || 0;
                        const available = product.available !== false && quantity > 0;
                        
                        itemAvailability[displayName] = {
                            name: displayName,
                            dbName: product.dbName || product.name,
                            available: available,
                            quantity: quantity,
                            id: product._id || product.id,
                            category: product.category || 'Other',
                            status: product.status || 'active'
                        };
                        
                        console.log(`Loaded: "${displayName}" | DB: "${product.dbName || product.name}" | Qty: ${quantity} | Available: ${available}`);
                    }
                });
                
                console.log(`\nTotal products loaded: ${Object.keys(itemAvailability).length}`);
                

                updateMenuCardsAvailability();
            } else {
                console.error('Invalid response format:', result);
                showNotification('Error loading product availability', 'error');
            }
        } else {
            console.error('Server returned error:', response.status);
            showNotification('Error loading product availability', 'error');
        }
        
    } catch (error) {
        console.error('Failed to load product availability:', error);
        showNotification('Error loading product availability', 'error');
    }
}

function checkItemAvailability(productName) {
    const normalizedName = productName.trim();
    

    if (!itemAvailability.hasOwnProperty(normalizedName)) {
        console.warn(`Product "${productName}" not found in availability data. Marking as unavailable.`);
        return false;
    }
    
    const product = itemAvailability[normalizedName];
    

    const isAvailable = product.available && product.quantity > 0;
    
    if (!isAvailable) {
        console.log(`Product "${productName}" is out of stock. Quantity: ${product.quantity}, Available: ${product.available}`);
    }
    
    return isAvailable;
}

function updateMenuCardsAvailability() {
    console.log('\n=== UPDATING MENU CARDS ===');
    
    let outOfStockCount = 0;
    let inStockCount = 0;
    
    document.querySelectorAll('.menu-card').forEach(card => {
        const productName = card.dataset.name;
        const normalizedName = productName.trim();
        
        if (itemAvailability.hasOwnProperty(normalizedName)) {
            const product = itemAvailability[normalizedName];
            
            if (!product.available || product.quantity <= 0) {
                // PRODUCT IS OUT OF STOCK
                card.classList.add('disabled');
                addOutOfStockBadge(card);
                
                outOfStockCount++;
                console.log(`OUT OF STOCK: ${productName} (Quantity: ${product.quantity})`);
            } else {

                card.classList.remove('disabled');
                removeOutOfStockBadge(card);
                
                inStockCount++;
                console.log(`IN STOCK: ${productName} (Quantity: ${product.quantity})`);
            }
        } else {

            console.log(`⚠️  NO DATA: ${productName} - marking as out of stock`);
            card.classList.add('disabled');
            addOutOfStockBadge(card);
            outOfStockCount++;
        }
    });
    
    console.log(`\n📊 SUMMARY: ${inStockCount} in stock, ${outOfStockCount} out of stock`);
    

    if (outOfStockCount > 0) {
        showNotification(`${outOfStockCount} products are out of stock`, 'error');
    }
}

// ==================== ORDER COUNTER FUNCTIONS ====================

async function initializeCounter() {
    try {
        console.log('Initializing order counter...');
        
        let savedCounter = localStorage.getItem('posOrderCounter');
        
        if (savedCounter && !isNaN(parseInt(savedCounter))) {
            window.orderCounter = parseInt(savedCounter);
            console.log('Using localStorage counter:', window.orderCounter);
        } else {

            window.orderCounter = 1;
            localStorage.setItem('posOrderCounter', window.orderCounter);
        }
        
        updateNextOrderDisplay();
        console.log('Counter initialized to:', window.orderCounter);
        
    } catch (error) {
        console.error('Error initializing counter:', error);
        window.orderCounter = 1;
        localStorage.setItem('posOrderCounter', window.orderCounter);
        updateNextOrderDisplay();
    }
}

function updateNextOrderDisplay() {
    const nextOrderElement = document.getElementById('nextOrderNumber');
    if (nextOrderElement && window.orderCounter) {
        const paddedNumber = window.orderCounter.toString().padStart(3, '0');
        nextOrderElement.textContent = `ORD-${paddedNumber}`;
        currentOrderNumber = `ORD-${paddedNumber}`;
    } else if (nextOrderElement) {
        nextOrderElement.textContent = 'ORD-001';
        currentOrderNumber = 'ORD-001';
    }
}

// ==================== ORDER MANAGEMENT FUNCTIONS ====================

function addToOrder(productName, price) {
    console.log('addToOrder called:', { productName, price });
    
    const normalizedName = productName.trim();
    

    if (!checkItemAvailability(normalizedName)) {
        showNotification(`${productName} is out of stock!`, 'error');
        return false;
    }
    

    if (itemAvailability.hasOwnProperty(normalizedName)) {
        const productData = itemAvailability[normalizedName];
        const existingItem = orderItems.find(item => item.name === normalizedName);
        const currentQty = existingItem ? existingItem.quantity : 0;
        
        if (currentQty + 1 > productData.quantity) {
            showNotification(`Only ${productData.quantity} ${productName} available!`, 'error');
            return false;
        }
    }
    

    const existingItem = orderItems.find(item => item.name === normalizedName);
    
    if (existingItem) {
        console.log('Increasing quantity for existing item:', productName);
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * price;
    } else {
        console.log('Adding new item to order:', productName);
        orderItems.push({
            name: normalizedName,
            price: price,
            quantity: 1,
            total: price
        });
    }
    
    console.log('Order items after addition:', orderItems);
    return true;
}

async function saveOrderToDatabase() {
    try {
        if (orderItems.length === 0) {
            throw new Error('No items in order');
        }

        const currentCounter = window.orderCounter;
        currentOrderNumber = `ORD-${currentCounter.toString().padStart(3, '0')}`;
        
        const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal;
        

        const orderItemsWithIds = orderItems.map(item => {
            const normalizedName = item.name.trim();
            const itemData = itemAvailability[normalizedName];
            return {
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.total,
                itemId: itemData ? itemData.id : null
            };
        });

        const orderData = {
            orderNumber: currentOrderNumber,
            subtotal: subtotal,
            total: total,
            items: orderItemsWithIds,
            paymentMethod: paymentMethod,
            cashReceived: currentCashReceived,
            change: currentChange,
            status: 'completed',
            timestamp: new Date().toISOString()
        };

        console.log('Saving order:', orderData);
        

        showLoading(true);
        
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        console.log('Order saved successfully:', result);
        
        showLoading(false);
        

        window.orderCounter += 1;
        localStorage.setItem('posOrderCounter', window.orderCounter);
        updateNextOrderDisplay();
        
        return { 
            success: true, 
            orderNumber: currentOrderNumber
        };
        
    } catch (error) {
        console.error('Order save error:', error);
        showLoading(false);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ==================== VALIDATION FUNCTIONS ====================
function validateOrderBeforeSave() {
    if (orderItems.length === 0) {
        return { valid: false, message: 'No items in order' };
    }
    
    if (currentCashReceived === 0) {
        return { valid: false, message: 'Payment not completed' };
    }
    
    if (paymentMethod === 'cash' && currentChange < 0) {
        return { valid: false, message: 'Insufficient payment' };
    }
    

    for (const item of orderItems) {
        const normalizedName = item.name.trim();
        if (itemAvailability.hasOwnProperty(normalizedName)) {
            const product = itemAvailability[normalizedName];
            if (item.quantity > product.quantity) {
                return { 
                    valid: false, 
                    message: `${item.name} quantity exceeds available stock` 
                };
            }
        }
    }
    
    return { valid: true, message: '' };
}

// ==================== NOTIFICATION FUNCTION ====================

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'info' ? '#17a2b8' : '#28a745'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ==================== LOADING FUNCTIONS ====================

function showLoading(show) {
    let loadingEl = document.getElementById('loadingOverlay');
    
    if (!loadingEl) {
        loadingEl = createLoadingOverlay();
    }
    
    loadingEl.style.display = show ? 'flex' : 'none';
}

function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    overlay.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
            <div class="spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            "></div>
            <div>Processing...</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    

    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    return overlay;
}

// ==================== SESSION PERSISTENCE ====================
function saveOrderToSession() {
    const orderData = {
        items: orderItems,
        total: currentTotal,
        cashReceived: currentCashReceived,
        change: currentChange,
        paymentMethod: paymentMethod
    };
    sessionStorage.setItem('posCurrentOrder', JSON.stringify(orderData));
}

function loadOrderFromSession() {
    const saved = sessionStorage.getItem('posCurrentOrder');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            orderItems = data.items || [];
            currentTotal = data.total || 0;
            currentCashReceived = data.cashReceived || 0;
            currentChange = data.change || 0;
            paymentMethod = data.paymentMethod || 'cash';
            updateOrderDisplay();
        } catch (e) {
            console.error('Failed to load saved order:', e);
        }
    }
}

// ==================== LOGOUT FUNCTION ====================

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
                    'Content-Type': 'application/json'
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

        showNotification('Logged out', 'success');

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

// ==================== SYSTEM INITIALIZATION ====================

async function initializeSystem() {
    console.log('=== INITIALIZING POS SYSTEM ===');
    
    // Debug HTML structure
    console.log('Checking HTML structure...');
    console.log('orderList element:', document.getElementById('orderList'));
    console.log('orderTotal element:', document.getElementById('orderTotal'));
    console.log('completeOrderBtn element:', document.getElementById('completeOrder'));
    console.log('receiptPreview element:', document.getElementById('receiptPreview'));
    console.log('printReceiptBtn element:', document.getElementById('printReceipt'));
    
    // Check if we're in the right page
    if (!document.getElementById('orderList') || !document.getElementById('orderTotal')) {
        console.error('CRITICAL: Required POS elements not found in DOM');
        showNotification('POS system not properly loaded. Please refresh the page.', 'error');
        return;
    }
    
    // Load saved order from session
    loadOrderFromSession();
    
    // Initialize order counter
    await initializeCounter();
    
    // Load product availability from server
    await loadItemAvailability();
    
    // Setup menu card handlers
    setupMenuCardHandlers();
    
    console.log('=== POS SYSTEM INITIALIZED SUCCESSFULLY ===');
}

// ==================== CSS STYLES ====================
const style = document.createElement('style');
style.textContent = `
    /* Modal Styles */
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        justify-content: center;
        align-items: center;
    }
    
    .modal-content {
        background-color: white;
        padding: 25px;
        border-radius: 10px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease;
        position: relative;
    }
    
    .receipt-modal-content {
        max-width: 450px;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #f0f0f0;
    }
    
    .modal-title {
        font-size: 20px;
        font-weight: bold;
        color: #333;
    }
    
    .close-btn {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #666;
        padding: 0;
        line-height: 1;
        transition: color 0.3s;
    }
    
    .close-btn:hover {
        color: #333;
    }
    
    .receipt-preview {
        background: white;
        padding: 20px;
        border-radius: 5px;
        border: 1px solid #ddd;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        margin: 0 auto;
        max-width: 300px;
    }
    
    .modal-buttons {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid #eee;
    }
    
    .modal-btn {
        padding: 12px 25px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        min-width: 120px;
        transition: all 0.3s;
    }
    
    .modal-btn.confirm {
        background: #28a745;
        color: white;
    }
    
    .modal-btn.confirm:hover {
        background: #218838;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }
    
    .modal-btn.cancel {
        background: #6c757d;
        color: white;
    }
    
    .modal-btn.cancel:hover {
        background: #5a6268;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes modalSlideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .menu-card {
        position: relative;
        transition: all 0.3s ease;
        cursor: pointer;
        user-select: none;
    }
    
    .menu-card:hover:not(.disabled) {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
    
    .menu-card.disabled {
        pointer-events: none;
        opacity: 0.6;
        filter: grayscale(100%);
        cursor: not-allowed;
    }
    
    .menu-card.disabled .item-name,
    .menu-card.disabled .item-price {
        color: #999 !important;
    }
    
    .empty-cart {
        text-align: center;
        padding: 20px;
        color: #666;
        font-style: italic;
    }
    
    .order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #eee;
        animation: slideIn 0.3s ease;
    }
    
    .order-item:hover {
        background-color: #f9f9f9;
    }
    
    .item-info {
        flex: 1;
    }
    
    .item-name {
        font-weight: bold;
        color: #333;
        font-size: 14px;
    }
    
    .item-price {
        font-size: 12px;
        color: #666;
    }
    
    .item-controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .quantity-btn {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1px solid #ddd;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        transition: all 0.2s;
        user-select: none;
    }
    
    .quantity-btn:hover {
        background: #f0f0f0;
        transform: scale(1.1);
    }
    
    .item-quantity {
        min-width: 30px;
        text-align: center;
        font-weight: bold;
        user-select: none;
    }
    
    .item-total {
        min-width: 70px;
        text-align: right;
        font-weight: bold;
        color: #2c3e50;
    }
    
    /* Receipt Styles */
    #receiptPreview {
        font-family: 'Courier New', monospace;
        line-height: 1.5;
        white-space: pre-wrap;
        background: white;
        padding: 20px;
        border-radius: 5px;
        max-width: 400px;
        margin: 0 auto;
    }
    
    /* Loading Spinner */
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Debug styles for menu cards */
    .menu-card {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        background: white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        margin: 5px;
    }
    
    .menu-card:active:not(.disabled) {
        transform: scale(0.98);
    }
    
    /* GCash Modal Styles */
    .gcash-modal-content {
        max-width: 400px;
        text-align: center;
        padding: 30px 20px;
    }
    
    .gcash-text {
        font-size: 24px;
        font-weight: bold;
        color: #00457D;
        margin-bottom: 20px;
    }
    
    .gcash-img {
        width: 120px;
        height: auto;
        margin: 0 auto 20px;
        display: block;
    }
    
    /* Payment Method Display */
    .payment-method-display {
        display: inline-block;
        padding: 5px 15px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        margin-left: 10px;
        vertical-align: middle;
    }
    
    .payment-cash {
        background: #28a745;
        color: white;
    }
    
    .payment-gcash {
        background: #00457D;
        color: white;
    }
    
    /* Cash Section Styles */
    #cashSection {
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 5px;
        border: 1px solid #dee2e6;
    }
    
    #cashSection h3 {
        margin-top: 0;
        color: #343a40;
    }
    
    #cashSection p {
        margin: 8px 0;
        font-size: 14px;
        color: #495057;
    }
    
    #cashSection span {
        font-weight: bold;
        color: #212529;
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.updateQuantity = updateQuantity;
window.addToOrder = addToOrder;
window.handleMenuCardClick = handleMenuCardClick;