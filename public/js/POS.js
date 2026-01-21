        document.getElementById('resetOrderBtn').addEventListener('click', async function() {
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
        // Actually set the localStorage value
        localStorage.setItem('posOrderCounter', '1');
        alert('Order counter has been reset to 1!\n\nNext order will be: ORD-001');
        } else {
        alert('Error: ' + result.message);
        }
        } catch (error) {
        console.error('Reset failed:', error);
        alert('Failed to reset order counter. Check console for details.');
        }
        }
        });

    // Your original JavaScript variables
    let orderItems = [];
    let currentCashReceived = 0;
    let currentChange = 0;
    let currentTotal = 0;
    let currentOrderNumber = '';

    
    const cashModal = document.getElementById('cashModal');
    const cashInput = document.getElementById('cashInput');
    const confirmCashBtn = document.getElementById('confirmCash');
    const cancelCashBtn = document.getElementById('cancelCash');
    const completeOrderBtn = document.getElementById('completeOrder');
    const printReceiptBtn = document.getElementById('printReceipt');
    const receiptModal = document.getElementById('receiptModal');
    const receiptPreview = document.getElementById('receiptPreview');
    const printNowBtn = document.getElementById('printNow');
    const closeReceiptBtn = document.getElementById('closeReceipt');
    
    // NEW: Simple GCash modal elements
    const gcashModal = document.getElementById('gcashModal');
    const paymentMethodBtn = document.getElementById('payment-method');
    const closeGCashBtn = document.getElementById('closeGCash');
    
    // Add event listener for the "Other" button
    paymentMethodBtn.addEventListener('click', function() {
        // Close the cash modal
        cashModal.style.display = 'none';
        // Open the GCash modal
        gcashModal.style.display = 'flex';
    });
    
    // Add event listener to close the GCash modal
    closeGCashBtn.addEventListener('click', function() {
        gcashModal.style.display = 'none';
    });
    
    // Also close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === cashModal) {
            cashModal.style.display = 'none';
        }
        if (event.target === gcashModal) {
            gcashModal.style.display = 'none';
        }
        if (event.target === receiptModal) {
            receiptModal.style.display = 'none';
        }
    });
    
    // ========== The rest of your original JavaScript code stays exactly the same ==========
    
    async function initializeCounter() {
        try {
            console.log('=== INITIALIZING COUNTER ===');
            
            // FIRST: Check localStorage (your manual reset value)
            let savedCounter = localStorage.getItem('posOrderCounter');
            console.log('LocalStorage counter:', savedCounter);
            
            // If localStorage has a valid counter, USE IT (this is what you want)
            if (savedCounter && !isNaN(parseInt(savedCounter))) {
                window.orderCounter = parseInt(savedCounter);
                console.log('Using localStorage counter:', window.orderCounter);
                updateNextOrderDisplay();
                console.log('Counter initialized from localStorage:', window.orderCounter);
                console.log('=== END COUNTER INITIALIZATION ===');
                return; // Stop here - use localStorage value
            }
            
            // Only check database if localStorage doesn't have a value
            let latestOrderNumber = null;
            try {
                const response = await fetch('/api/orders/latest');
                if (response.ok) {
                    const result = await response.json();
                    console.log('API response:', result);
       
                    
                    if (result.success && result.data && result.data.latestOrderNumber) {
                        latestOrderNumber = result.data.latestOrderNumber;
                        console.log('Latest order from database:', latestOrderNumber);
                    } else {
                        console.log('No latestOrderNumber in response, data might be null');
                    }
                } else {
                    console.log('API response not OK:', response.status);
                }
            } catch (apiError) {
                console.log('Could not fetch from /api/orders/latest:', apiError.message);
            }
           
            // Determine the counter value
            let newCounter;
            
            if (latestOrderNumber) {
                const match = latestOrderNumber.match(/ORD-(\d+)/);
            
                if (match) {
                    const lastNumber = parseInt(match[1]);
                    newCounter = lastNumber + 1;
                    console.log('Using database counter + 1:', newCounter);
                } else {
                    newCounter = 1;
                    console.log('Invalid format, starting from 1');
                }
            } else {
                newCounter = 1;
                console.log('No database data, starting from 1');
            }

            window.orderCounter = newCounter;
            localStorage.setItem('posOrderCounter', window.orderCounter);
            
            updateNextOrderDisplay();
            
            console.log('Counter initialized to:', window.orderCounter);
            console.log('Next order will be: ORD-' + window.orderCounter.toString().padStart(4, '0'));
            console.log('=== END COUNTER INITIALIZATION ===');
            
        } catch (error) {
            console.error('Error initializing counter:', error);
            // Fallback: Always start from 1
            window.orderCounter = 1;
            localStorage.setItem('posOrderCounter', window.orderCounter);
            updateNextOrderDisplay();
            console.log('Fallback counter:', window.orderCounter);
        }
    }

    
    function updateNextOrderDisplay() {
        const nextOrderElement = document.getElementById('nextOrderNumber');
        if (nextOrderElement && window.orderCounter) {
            nextOrderElement.textContent = `ORD-${window.orderCounter.toString().padStart(4, '0')}`;
        }
    }  
    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', function() {
            const name = this.dataset.name;
            const price = parseFloat(this.dataset.price);
            
            addToOrder(name, price);
            updateOrderDisplay();
        });
    });
    
    function addToOrder(name, price) {
        const existingItem = orderItems.find(item => item.name === name);
        
        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.total = existingItem.quantity * price;
        } else {
            orderItems.push({
                name: name,
                price: price,
                quantity: 1,
                total: price
            });
        }
    }
    
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            font-weight: bold;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    function updateOrderDisplay() {
        const orderItemsContainer = document.getElementById('orderItems');
        const subtotalElement = document.getElementById('total');
        const totalElement = document.getElementById('totalpayment');
        const cashSection = document.getElementById('cashSection');
        const printBtn = document.getElementById('printReceipt');
        
        if (orderItems.length === 0) {
            orderItemsContainer.innerHTML = '<div class="empty-cart">No Items Inserted</div>';
            subtotalElement.textContent = '₱0.00';
            totalElement.textContent = '₱0.00';
            cashSection.style.display = 'none';
            printBtn.disabled = true;
            currentTotal = 0;
            return;
        }
        
        let subtotal = 0;
        let html = '';
        
        orderItems.forEach((item, index) => {
            subtotal += item.total;
            html += `
                <div class="order-item">
                    <div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">₱${item.price.toFixed(2)} each</div>
                    </div>
                    <div class="item-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
                        <span class="item-quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
                        <div class="item-total">₱${item.total.toFixed(2)}</div>
                    </div>
                </div>
            `;
        });
        
        orderItemsContainer.innerHTML = html;
        subtotalElement.textContent = `₱${subtotal.toFixed(2)}`;
        totalElement.textContent = `₱${subtotal.toFixed(2)}`;
        currentTotal = subtotal;
        
        printBtn.disabled = currentCashReceived === 0;
    }
    
    function updateQuantity(index, change) {
        const item = orderItems[index];
        item.quantity += change;
        
        if (item.quantity <= 0) {
            orderItems.splice(index, 1);
        } else {
            item.total = item.quantity * item.price;
        }
        
        updateOrderDisplay();
    }
    

    async function saveOrderToDatabase() {
        try {
            if (orderItems.length === 0) {
                throw new Error('No items in order');
            }
            

            const currentCounter = window.orderCounter;
            currentOrderNumber = `ORD-${currentCounter.toString().padStart(4, '0')}`;
            

            const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
            const total = subtotal;
            
            const orderData = {
                orderNumber: currentOrderNumber,
                subtotal: subtotal,
                total: total,
                items: orderItems,
                cashReceived: currentCashReceived,
                change: currentChange,
                status: 'completed',
                timestamp: new Date().toISOString()
            };
               

        console.log('Saving order:', orderData); 
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to save order');
            }
            
            console.log('Order saved successfully:', result);
            

            window.orderCounter += 1;
            localStorage.setItem('posOrderCounter', window.orderCounter);
            
            console.log('Counter incremented to:', window.orderCounter);
    
            
            updateNextOrderDisplay();
            
            return { 
                success: true, 
                orderNumber: currentOrderNumber,
                data: result 
            };
            
        } catch (error) {
            console.error('Order save error:', error);
            showNotification('Error: ' + error.message, 'error');
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
    
    
    completeOrderBtn.addEventListener('click', function() {
        if (orderItems.length === 0) {
            showNotification('Please add items first', 'error');
            return;
        }
    
        
        document.getElementById('modalTitle').textContent = `Total: ₱${currentTotal.toFixed(2)} - Enter Cash Received`;
        cashInput.value = currentTotal.toFixed(2);
        cashInput.focus();
        cashModal.style.display = 'flex';
    });
    
    
    confirmCashBtn.addEventListener('click', function() {
        const cashReceived = parseFloat(cashInput.value);
        
        if (isNaN(cashReceived) || cashReceived <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        
        if (cashReceived < currentTotal) {
            alert('Insufficient cash received.');
            return;
        }
        
        const change = cashReceived - currentTotal;
        currentCashReceived = cashReceived;
        currentChange = change;
        
    
        const cashSection = document.getElementById('cashSection');
        const cashReceivedElement = document.getElementById('cashReceived');
        const changeElement = document.getElementById('change');
        
        cashReceivedElement.textContent = `₱${cashReceived.toFixed(2)}`;
        changeElement.textContent = `₱${change.toFixed(2)}`;
        cashSection.style.display = 'block';
        
    
        printReceiptBtn.disabled = false;
        cashModal.style.display = 'none';
        
        showNotification('Order completed. Click "Print Receipt" to save and print.');
    });
    
    cancelCashBtn.addEventListener('click', function() {
        cashModal.style.display = 'none';
    });
    
    
    printReceiptBtn.addEventListener('click', async function() {
        if (orderItems.length === 0) {
            alert('No items to print.');
            return;
        }
        
        if (currentCashReceived === 0) {
            alert('Please complete the order first.');
            return;
        }
        
     
        generateReceiptPreview();
        receiptModal.style.display = 'flex';
    });
    
    function generateReceiptPreview() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-PH', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        let receiptHtml = `
            ================================<br>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ANGELO'S BURGER<br>
            ================================<br>
            Bagong Buhay II, Sampol Market<br>
            In front of 7 Eleven<br>
            CSJDM, Bulacan<br>
            ================================<br>
            SALES INVOICE<br>
            Date: ${dateString}<br>
            Order #: ${currentOrderNumber || 'Pending'}<br>
            ================================<br>
            QTY&nbsp;&nbsp;ITEM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AMOUNT<br>
            ================================<br>
        `;
        
        let totalQty = 0;
        let totalAmount = 0;
        
        orderItems.forEach(item => {
            totalQty += item.quantity;
            totalAmount += item.total;
            const itemName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
            receiptHtml += `
                ${item.quantity.toString().padEnd(3)} ${itemName.padEnd(18)} ₱${item.total.toFixed(2)}<br>
            `;
        });
        
        receiptHtml += `
            ================================<br>
            Total Qty: ${totalQty}<br>
            ================================<br>
            TOTAL: ₱${totalAmount.toFixed(2)}<br>
            CASH: ₱${currentCashReceived.toFixed(2)}<br>
            CHANGE: ₱${currentChange.toFixed(2)}<br>
            ================================<br>
            <br>
            THIS SERVES AS AN OFFICIAL RECEIPT<br>
            <br>
            THANK YOU AND COME AGAIN!<br>
        `;
        
        receiptPreview.innerHTML = receiptHtml;
    }
    

    printNowBtn.addEventListener('click', async function() {
        try {
        
            printNowBtn.disabled = true;
            printNowBtn.textContent = 'Saving...';
            

            showNotification('Saving order to database...', 'info');
            
            const saveResult = await saveOrderToDatabase();
            
            if (!saveResult.success) {
            
                printNowBtn.disabled = false;
                printNowBtn.textContent = 'Accept';
                showNotification(`Failed to save order: ${saveResult.error}`, 'error');
                return;
            }
            
            showNotification(`Order #${saveResult.orderNumber} saved successfully!`);
            

            const printContent = receiptPreview.innerHTML.replace(/<br>/g, '\n');
           
            
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            
            if (!printWindow) {
                alert('Please allow popups for this site to print receipts.');
                printNowBtn.disabled = false;
                printNowBtn.textContent = 'Accept';
                return;
            }
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Receipt - Angelo's Burger</title>
                    <style>
                        body {
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            margin: 0;
                            padding: 10px;
                            white-space: pre;
                        }
                        @media print {
                            body { margin: 0; }
                            @page { margin: 0; }
                        }
                    </style>
                </head>
                <body>
                ${printContent}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 500);
                    };
                <\/script>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            

            setTimeout(() => {
                orderItems = [];
                currentCashReceived = 0;
                currentChange = 0;
                currentTotal = 0;
                currentOrderNumber = '';
                updateOrderDisplay();
                document.getElementById('cashSection').style.display = 'none';
                printReceiptBtn.disabled = true;
                receiptModal.style.display = 'none';
                

                printNowBtn.disabled = false;
                printNowBtn.textContent = 'Accept';
            
                
                showNotification('Order completed and saved to dashboard!');
                
            }, 1000);
            
        } catch (error) {
            console.error('Error in print process:', error);
            showNotification('Error processing order: ' + error.message, 'error');
    
            
            printNowBtn.disabled = false;
            printNowBtn.textContent = 'Accept';
        }
    });
    
    closeReceiptBtn.addEventListener('click', function() {
        receiptModal.style.display = 'none';
    });
   
    
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

    // ================= LOGOUT FUNCTIONALITY =================
    document.querySelector('.logout-btn').addEventListener('click', function(event) {
        event.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            performLogout();
        }
    });

    async function performLogout() {
        // Store references for cleanup
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
                    credentials: 'include' // Include cookies
                });
            } catch (apiError) {
                console.log('Backend logout not available or failed:', apiError.message);
                // Continue with client-side cleanup
            }

            // Preserve POS counter if exists
            const posOrderCounter = localStorage.getItem('posOrderCounter');
            
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Restore POS counter if it existed
            if (posOrderCounter) {
                localStorage.setItem('posOrderCounter', posOrderCounter);
            }

            // Clear auth-related cookies
            document.cookie.split(";").forEach(function(cookie) {
                const cookieParts = cookie.split("=");
                const cookieName = cookieParts[0].trim();
                
                // Match any auth/session/token cookies
                const authCookiePattern = /(auth|token|session|user|login)/i;
                if (authCookiePattern.test(cookieName)) {
                    // Clear cookie with path and domain
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
                }
            });

            // Close any open EventSource connections
            if (typeof eventSource !== 'undefined' && eventSource) {
                eventSource.close();
            }

            // Clear any active timeouts/intervals
            const highestTimeoutId = setTimeout(() => {}, 0);
            for (let i = 0; i < highestTimeoutId; i++) {
                clearTimeout(i);
            }

            // Show notification - this will now work with the fallback
            if (typeof showNotification === 'function') {
                showNotification('logged out!', 'success');
            } else {
                // Ultimate fallback - alert
                alert('Logged out');
            }

            // Redirect after notification shows
            setTimeout(() => {
                // Force hard redirect to ensure clean state
                window.location.href = '/';
                window.location.replace('/'); // Double ensure
            }, 1500);

        } catch (error) {
            console.error('Logout error:', error);
            
            // Emergency cleanup on error
            try {
                const posOrderCounter = localStorage.getItem('posOrderCounter');
                localStorage.clear();
                sessionStorage.clear();
                if (posOrderCounter) {
                    localStorage.setItem('posOrderCounter', posOrderCounter);
                }
                
                // Show error notification
                if (typeof showNotification === 'function') {
                    showNotification('Logged out with issues. Redirecting...', 'warning');
                }
            } catch (cleanupError) {
                console.error('Cleanup failed:', cleanupError);
            }
            
            // Redirect anyway
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
        } finally {
            // Restore button state if still on page
            if (logoutBtn && logoutBtn.parentNode) {
                logoutBtn.textContent = originalText;
                logoutBtn.disabled = false;
            }
        }
    }

    // Optional: Add CSS for better button feedback
    if (!document.querySelector('#logout-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-styles';
        style.textContent = `
            .logout-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .logout-btn.logging-out {
                position: relative;
            }
            .logout-btn.logging-out::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-top: 2px solid #fff;
            border-right: 2px solid rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            animation: logout-spin 0.8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
            }
            @keyframes logout-spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== SYSTEM INITIALIZATION ==========
    async function initializeSystem() {
        console.log('=== INITIALIZING POS SYSTEM ===');
     
        await initializeCounter();
     
        updateOrderDisplay();
     
        console.log('POS System Initialized');
    
    }

  document.addEventListener('DOMContentLoaded', initializeSystem);