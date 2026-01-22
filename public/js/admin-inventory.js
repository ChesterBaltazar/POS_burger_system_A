

        const addModal = document.getElementById('addModal');
        const editModal = document.getElementById('editModal');
        const openBtn = document.querySelector('.openModal');
        const closeBtn = document.getElementById('CloseModal');
        const toast = document.getElementById('toast');
        

        function showToast(message, type = 'success') {
            toast.textContent = message;
            toast.className = `toast ${type} show`;
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
        

        openBtn.addEventListener('click', () => {
            addModal.classList.add('open');
            
            document.getElementById('productName').value = '';
            document.getElementById('productQuantity').value = 1;
            document.getElementById('productCategory').value = '';
        });
        
        function closeModal() {
            addModal.classList.remove('open');
        }
        
        function closeEditModal() {
    const editModal = document.getElementById('editModal');
    editModal.classList.remove('open');
}
        

        const minusBtn = document.querySelector('.qty-count--minus');
        const addBtn = document.querySelector('.qty-count--add');
        const qtyInput = document.getElementById('productQuantity');
        
        if (minusBtn && addBtn && qtyInput) {
            minusBtn.addEventListener('click', () => {
                let currentValue = parseInt(qtyInput.value);
                if (currentValue > parseInt(qtyInput.min)) {
                    qtyInput.value = currentValue - 1;
                }
            });
            
            addBtn.addEventListener('click', () => {
                let currentValue = parseInt(qtyInput.value);
                if (currentValue < parseInt(qtyInput.max)) {
                    qtyInput.value = currentValue + 1;
                }
            });
        }
        

        function decrementEditQty() {
    const input = document.getElementById('editProductQuantity');
    let value = parseInt(input.value) || 1;
    if (value > 0) {
        value--;
        input.value = value;
    }
}
        
        function incrementEditQty() {
    const input = document.getElementById('editProductQuantity');
    let value = parseInt(input.value) || 0;
    if (value < 1000) {
        value++;
        input.value = value;
    }
}

        

        async function addItem() {
            const name = document.getElementById('productName').value.trim();
            const quantity = document.getElementById('productQuantity').value;
            const category = document.getElementById('productCategory').value;
            
            if (!name || !quantity || !category) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            try {
                const response = await fetch('/inventory', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        quantity: parseInt(quantity),
                        category: category
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showToast('Item added');
                    closeModal();
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    showToast('Error: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Failed to add item. Please try again.', 'error');
            }
        }
        

        async function editItem(itemId) {
    try {
        let response = await fetch(`/inventory/item/${itemId}`);
        if (!response.ok) {
            response = await fetch(`/Inventory/item/${itemId}`);
        }
        
        if (!response.ok) {
            throw new Error('Failed to fetch item');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load item');
        }
        
        const item = result.item; // Access the nested item object
        
        // Set form values
        document.getElementById('editItemId').value = item._id;
        document.getElementById('editProductName').value = item.name || '';
        document.getElementById('editProductQuantity').value = item.quantity || 1;
        document.getElementById('editProductCategory').value = item.category || 'Drink'; // Default to first option
        
        // Open modal
        const editModal = document.getElementById('editModal');
        editModal.classList.add('open');
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Failed to load item details', 'error');
    }
}
        

        async function updateItem() {
            const itemId = document.getElementById('editItemId').value;
            const name = document.getElementById('editProductName').value.trim();
            const quantity = document.getElementById('editProductQuantity').value;
            const category = document.getElementById('editProductCategory').value;
            
            if (!name || !quantity || !category) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            try {
                const response = await fetch(`/inventory/update/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        quantity: parseInt(quantity),
                        category: category
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showToast(result.message);
                    closeEditModal();
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    showToast('Error: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Failed to update item', 'error');
            }
        }
        

        function updateQuantityPrompt(itemId, itemName) {
            const newQuantity = prompt(`Update quantity for "${itemName}":`, '0');
            if (newQuantity !== null && newQuantity !== '') {
                const quantity = parseInt(newQuantity);
                if (!isNaN(quantity) && quantity >= 0) {
                    updateQuantity(itemId, quantity);
                } else {
                    showToast('Please enter a valid number', 'error');
                }
            }
        }
        

        async function updateQuantity(itemId, quantity) {
            try {
                const response = await fetch(`/inventory/update/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ quantity: quantity })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showToast('Quantity updated successfully');
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    showToast('Error: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Failed to update quantity', 'error');
            }
        }
        

        async function deleteItem(itemId, itemName) {
            if (confirm(`Are you sure you want to delete this item: "${itemName}"? This action cannot be undone.`)) {
                try {
                    console.log('Deleting item:', itemId);
                    

                    let endpoint = '';
                    let response = null;
                    

                    const endpoints = [
                        `/inventory/delete/${itemId}`,
                        `/Inventory/delete/${itemId}`,
                        `/api/inventory/${itemId}`,
                        `/inventory/${itemId}`
                    ];
                    
                    for (let i = 0; i < endpoints.length; i++) {
                        try {
                            response = await fetch(endpoints[i], {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            console.log(`Tried ${endpoints[i]}, status: ${response.status}`);
                            
                            if (response.ok) {
                                break;
                            }
                        } catch (err) {
                            console.log(`Endpoint ${endpoints[i]} failed:`, err.message);
                        }
                    }
                    
                    if (!response) {
                        throw new Error('No response from server');
                    }
                    
                    console.log('Delete response:', response.status);
                    
                    if (response.ok) {
                        const result = await response.json();
                        showToast('Item deleted'); 
                        setTimeout(() => {
                            location.reload();
                        }, 1500);
                    } else {
                        const errorText = await response.text();
                        console.error('Server error:', errorText);
                        showToast(`Failed to delete this item: ${response.status} ${response.statusText}`, 'error');
                    }
                    
                } catch (error) {
                    console.error('error:', error);
                    showToast(`Failed to delete this item: ${error.message}`, 'error');
                }
            }
        }
        
        
        async function deleteItemAlt(itemId, itemName) {
            if (confirm(`Are you sure you want to delete this item: "${itemName}"?`)) {
                try {
                    const response = await fetch(`/inventory/delete/${itemId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        alert(result.message);
                        location.reload();
                    } else {
                        const error = await response.text();
                        alert('Error: ' + error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Failed to delete item');
                }
            }
        }
        

        function searchItems() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#itemsTable tr');
            
            rows.forEach(row => {
                const name = row.cells[0].textContent.toLowerCase();
                const category = row.cells[2].textContent.toLowerCase();
                const id = row.cells[1].textContent.toLowerCase();
                
                if (name.includes(searchTerm) || category.includes(searchTerm) || id.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
        

        function filterCategory(category) {
            const dropdownButton = document.getElementById('dropdownMenuButton1');
            dropdownButton.textContent = category === 'all' ? 'Categories' : category;
            
            const rows = document.querySelectorAll('#itemsTable tr');
            const filterValue = category.toLowerCase();
            
            rows.forEach(row => {
                const rowCategory = row.getAttribute('data-category');
                
                if (category === 'all' || rowCategory === filterValue) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
        
        // ================= NOTIFICATION FALLBACK =================

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
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: notificationFadeInOut 2.5s ease-in-out;
        max-width: 350px;
        word-wrap: break-word;
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
            .temp-notification {
                animation: notificationFadeInOut 2.5s ease-in-out !important;
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
    

    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
};

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
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
}
    `;
    document.head.appendChild(style);
}
// ===================================== END OF LOGOUT FUNCTION =====================================
