// Define categoryProducts first
        window.categoryProducts = {
            "Drinks": ["Zesto", "Sting", "Mineral Water", "Cobra", "Softdrink"],
            "Meat": ["Beef", "Pork", "Chicken"],
            "Hotdogs & Sausages": ["Hotdog", "Sausage", "Combo Hotdog", "Ham"],
            "Poultry": ["Eggs"],
            "Dairy": ["Cheese"],
            "Bread": ["Burger Buns", "Hotdog Buns", "Footlong Buns"]
        };

        // Variables for update quantity modal
        let currentItemIdForUpdate = null;
        let currentItemNameForUpdate = null;
        let archivedItems = [];
        let currentSort = null;
        let originalOrder = [];
        
        // Variables for out of stock modal
        let outOfStockModal = null;
        let outOfStockOkBtn = null;
        let timerCountdown = null;
        let countdownTimer = null;
        let countdownSeconds = 5;
        let outOfStockItems = [];

        // Toast Notification
        window.showToast = function(message, type = 'success') {
            const toast = document.getElementById('toast');
            if (!toast) return;
            
            toast.textContent = message;
            toast.className = `toast ${type} show`;
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        };

        // Show message when trying to archive item with quantity
        window.showCannotArchiveMessage = function(quantity) {
            showToast(`Cannot archive item with quantity ${quantity}. Set quantity to 0 first.`, 'error');
        };

        // Check for out of stock items and show modal
        window.checkOutOfStockItems = function() {
            const outOfStockRows = document.querySelectorAll('tr[data-out-of-stock="true"]');
            
            if (outOfStockRows.length > 0) {
                outOfStockItems = [];
                
                outOfStockRows.forEach(row => {
                    const itemName = row.getAttribute('data-item-name');
                    const itemId = row.getAttribute('data-id');
                    const category = row.cells[3]?.querySelector('.category-badge')?.textContent || 'Unknown';
                    
                    outOfStockItems.push({
                        id: itemId,
                        name: itemName,
                        category: category
                    });
                });
                
                // Show the modal after a short delay to ensure DOM is ready
                setTimeout(() => {
                    showOutOfStockModal();
                }, 1000);
            }
        };
        
        // Show Out of Stock Modal
        window.showOutOfStockModal = function() {
            outOfStockModal = document.getElementById('outOfStockModal');
            outOfStockOkBtn = document.getElementById('outOfStockOkBtn');
            timerCountdown = document.getElementById('timerCountdown');
            
            if (!outOfStockModal || !outOfStockOkBtn || !timerCountdown) return;
            
            // Populate the out of stock list
            const outOfStockList = document.getElementById('outOfStockList');
            if (outOfStockList && outOfStockItems.length > 0) {
                outOfStockList.innerHTML = '';
                
                outOfStockItems.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'out-of-stock-item';
                    itemElement.innerHTML = `
                        <span><strong>${item.name}</strong></span>
                        <span class="badge bg-danger">${item.category}</span>
                    `;
                    outOfStockList.appendChild(itemElement);
                });
            }
            
            // Reset and start countdown
            countdownSeconds = 5;
            timerCountdown.textContent = countdownSeconds;
            outOfStockOkBtn.disabled = true;
            outOfStockOkBtn.classList.remove('enabled');
            
            // Clear any existing timer
            if (countdownTimer) {
                clearInterval(countdownTimer);
            }
            
            // Start countdown timer
            countdownTimer = setInterval(() => {
                countdownSeconds--;
                timerCountdown.textContent = countdownSeconds;
                
                if (countdownSeconds <= 0) {
                    clearInterval(countdownTimer);
                    outOfStockOkBtn.disabled = false;
                    outOfStockOkBtn.classList.add('enabled');
                }
            }, 1000);
            
            // Show modal
            outOfStockModal.classList.add('open');
            
            // Play warning sound (optional)
            playWarningSound();
        };
        
        // Play warning sound
        window.playWarningSound = function() {
            try {
                // Create audio context for beep sound
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800; // Frequency in hertz
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1);
            } catch (error) {
                console.log("Audio not supported or blocked by browser");
            }
        };
        
        // Close Out of Stock Modal
        window.closeOutOfStockModal = function() {
            if (outOfStockModal) {
                outOfStockModal.classList.remove('open');
            }
            
            if (countdownTimer) {
                clearInterval(countdownTimer);
            }
            
            // Mark as acknowledged in localStorage to prevent showing again for a while
            localStorage.setItem('outOfStockAcknowledged', Date.now().toString());
            
            // Re-enable any critical item animations
            const criticalItems = document.querySelectorAll('.critical-item');
            criticalItems.forEach(item => {
                item.classList.remove('critical-item');
            });
        };

        // Drag and Drop Implementation
        function initializeDragAndDrop() {
            const tableBody = document.getElementById('itemsTable');
            if (!tableBody) return;
            
            const rows = tableBody.querySelectorAll('.draggable-row');
            const dragHandles = tableBody.querySelectorAll('.drag-handle');
            
            let draggedRow = null;
            
            // Store original order on page load
            if (originalOrder.length === 0) {
                rows.forEach(row => {
                    originalOrder.push(row.getAttribute('data-id'));
                });
            }
            
            // Add event listeners to drag handles
            dragHandles.forEach(handle => {
                handle.addEventListener('dragstart', function(e) {
                    draggedRow = this.closest('tr');
                    draggedRow.classList.add('dragging');
                    
                    // Set drag image
                    e.dataTransfer.setData('text/plain', draggedRow.getAttribute('data-id'));
                    e.dataTransfer.effectAllowed = 'move';
                    
                    // Add a slight delay for better visual feedback
                    setTimeout(() => {
                        draggedRow.style.opacity = '0.4';
                    }, 0);
                });
                
                handle.addEventListener('dragend', function() {
                    if (draggedRow) {
                        draggedRow.classList.remove('dragging');
                        draggedRow.style.opacity = '';
                        draggedRow = null;
                    }
                    
                    // Remove all drag-over classes
                    rows.forEach(row => row.classList.remove('drag-over'));
                    
                    // Save the new order
                    saveNewOrder();
                });
            });
            
            // Add event listeners to rows for drag over
            rows.forEach(row => {
                row.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    
                    // Remove drag-over class from all rows
                    rows.forEach(r => r.classList.remove('drag-over'));
                    
                    // Add drag-over class to current row
                    this.classList.add('drag-over');
                });
                
                row.addEventListener('dragenter', function(e) {
                    e.preventDefault();
                });
                
                row.addEventListener('dragleave', function() {
                    this.classList.remove('drag-over');
                });
                
                row.addEventListener('drop', function(e) {
                    e.preventDefault();
                    this.classList.remove('drag-over');
                    
                    if (draggedRow && draggedRow !== this) {
                        const table = this.closest('tbody');
                        const rowsArray = Array.from(table.querySelectorAll('.draggable-row'));
                        const draggedIndex = rowsArray.indexOf(draggedRow);
                        const targetIndex = rowsArray.indexOf(this);
                        
                        if (draggedIndex < targetIndex) {
                            this.after(draggedRow);
                        } else {
                            this.before(draggedRow);
                        }
                        
                        // Update data-index attributes
                        rowsArray.forEach((row, index) => {
                            row.setAttribute('data-index', index);
                        });
                        
                        showToast('Item position updated', 'success');
                    }
                });
            });
        }
        
        // Save new order to localStorage
        function saveNewOrder() {
            const tableBody = document.getElementById('itemsTable');
            if (!tableBody) return;
            
            const rows = tableBody.querySelectorAll('.draggable-row');
            const newOrder = Array.from(rows).map(row => row.getAttribute('data-id'));
            
            // Save to localStorage
            localStorage.setItem('inventoryOrder', JSON.stringify(newOrder));
            localStorage.setItem('inventoryOrderTimestamp', Date.now());
        }
        
        // Apply saved order on page load
        function applySavedOrder() {
            const savedOrder = localStorage.getItem('inventoryOrder');
            const timestamp = localStorage.getItem('inventoryOrderTimestamp');
            
            // Check if order is older than 24 hours (optional)
            if (timestamp && Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('inventoryOrder');
                localStorage.removeItem('inventoryOrderTimestamp');
                return;
            }
            
            if (savedOrder) {
                try {
                    const orderArray = JSON.parse(savedOrder);
                    const tableBody = document.getElementById('itemsTable');
                    
                    if (!tableBody) return;
                    
                    // Create a map of rows by ID
                    const rowsMap = {};
                    const rows = tableBody.querySelectorAll('.draggable-row');
                    
                    rows.forEach(row => {
                        const id = row.getAttribute('data-id');
                        rowsMap[id] = row;
                    });
                    
                    // Reorder rows based on saved order
                    orderArray.forEach(id => {
                        if (rowsMap[id]) {
                            tableBody.appendChild(rowsMap[id]);
                        }
                    });
                    
                    // Update data-index attributes
                    const updatedRows = tableBody.querySelectorAll('.draggable-row');
                    updatedRows.forEach((row, index) => {
                        row.setAttribute('data-index', index);
                    });
                } catch (error) {
                    console.error('Error applying saved order:', error);
                }
            }
        }
        
        // Sort by Name
        function sortByName() {
            const tableBody = document.getElementById('itemsTable');
            if (!tableBody) return;
            
            const rows = Array.from(tableBody.querySelectorAll('.draggable-row'));
            
            rows.sort((a, b) => {
                const nameA = a.cells[1].textContent.toLowerCase();
                const nameB = b.cells[1].textContent.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            // Reorder rows
            rows.forEach(row => tableBody.appendChild(row));
            
            // Update data-index attributes
            rows.forEach((row, index) => {
                row.setAttribute('data-index', index);
            });
            
            currentSort = 'name';
            updateSortButtons();
            showToast('Sorted by name', 'success');
        }
        
        // Sort by Quantity
        function sortByQuantity() {
            const tableBody = document.getElementById('itemsTable');
            if (!tableBody) return;
            
            const rows = Array.from(tableBody.querySelectorAll('.draggable-row'));
            
            rows.sort((a, b) => {
                const qtyA = parseInt(a.cells[4].textContent); // Changed from 3 to 4 (quantity column index)
                const qtyB = parseInt(b.cells[4].textContent);
                return qtyB - qtyA; // Descending order (highest first)
            });
            
            // Reorder rows
            rows.forEach(row => tableBody.appendChild(row));
            
            // Update data-index attributes
            rows.forEach((row, index) => {
                row.setAttribute('data-index', index);
            });
            
            currentSort = 'quantity';
            updateSortButtons();
            showToast('Sorted by quantity', 'success');
        }
        
        // Reset to original order
        function resetSort() {
            const tableBody = document.getElementById('itemsTable');
            if (!tableBody) return;
            
            // Get the original order from server-side rendering
            const rows = Array.from(tableBody.querySelectorAll('.draggable-row'));
            
            // Sort by original data-index
            rows.sort((a, b) => {
                const indexA = parseInt(a.getAttribute('data-index'));
                const indexB = parseInt(b.getAttribute('data-index'));
                return indexA - indexB;
            });
            
            // Reorder rows
            rows.forEach(row => tableBody.appendChild(row));
            
            currentSort = null;
            updateSortButtons();
            
            // Clear saved order
            localStorage.removeItem('inventoryOrder');
            localStorage.removeItem('inventoryOrderTimestamp');
            
            showToast('Order reset to default', 'success');
        }
        
        // Update sort button states
        function updateSortButtons() {
            const sortButtons = document.querySelectorAll('.sort-btn');
            sortButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            if (currentSort === 'name') {
                document.getElementById('sortNameBtn').classList.add('active');
            } else if (currentSort === 'quantity') {
                document.getElementById('sortQuantityBtn').classList.add('active');
            } else {
                document.getElementById('sortResetBtn').classList.add('active');
            }
        }

        // Filter by Category
        window.filterCategory = function(category) {
            console.log("Filtering by category:", category);
            
            const dropdownButton = document.getElementById('dropdownMenuButton1');
            if (dropdownButton) {
                dropdownButton.textContent = category === 'all' ? 'Categories' : category;
                dropdownButton.setAttribute('data-current-category', category);
            }
            
            // Update active class on dropdown items
            const dropdownItems = document.querySelectorAll('#categoryMenu .dropdown-item');
            dropdownItems.forEach(item => {
                item.classList.remove('category-filter-active');
                if (item.getAttribute('data-category') === category) {
                    item.classList.add('category-filter-active');
                }
            });
            
            const tableBody = document.getElementById('itemsTable');
            if (!tableBody) {
                console.error("itemsTable not found");
                return;
            }
            
            const rows = tableBody.querySelectorAll('tr');
            let hasVisibleRows = false;
            
            rows.forEach(row => {
                if (row.querySelector('td[colspan]')) {
                    row.style.display = (category === 'all') ? '' : 'none';
                    return;
                }
                
                const cells = row.querySelectorAll('td');
                if (cells.length < 3) {
                    row.style.display = 'none';
                    return;
                }
                
                const categorySpan = cells[3] ? cells[3].querySelector('.category-badge') : null;
                const rowCategory = categorySpan ? categorySpan.textContent.trim() : '';
                
                if (category === 'all' || rowCategory === category) {
                    row.style.display = '';
                    hasVisibleRows = true;
                } else {
                    row.style.display = 'none';
                }
            });
            
            // Show "No items" message if no rows are visible
            const noItemsRow = tableBody.querySelector('.items_to_display');
            if (!hasVisibleRows && category !== 'all') {
                if (!noItemsRow) {
                    const newRow = document.createElement('tr');
                    newRow.innerHTML = `
                        <td colspan="7" class="items_to_display text-center py-4" style="color: gray; font-style: italic;">
                            No items found in category: ${category}
                        </td>
                    `;
                    tableBody.appendChild(newRow);
                } else {
                    noItemsRow.style.display = '';
                    noItemsRow.cells[0].textContent = `No items found in category: ${category}`;
                }
            } else if (noItemsRow && noItemsRow.textContent.includes('No items found')) {
                noItemsRow.style.display = 'none';
            }
        };

        // Function to update product dropdown based on selected category
        function updateProductOptions() {
            const categorySelect = document.getElementById('productCategory');
            const productSelect = document.getElementById('productName');
            const selectedCategory = categorySelect.value;
            
            productSelect.innerHTML = '<option value="">Select Product</option>';
            
            if (selectedCategory && window.categoryProducts[selectedCategory]) {
                window.categoryProducts[selectedCategory].forEach(product => {
                    const option = document.createElement('option');
                    option.value = product;
                    option.textContent = product;
                    productSelect.appendChild(option);
                });
            }
        }

        // DOM Elements
        const addModal = document.getElementById('addModal');
        const editModal = document.getElementById('editModal');
        const updateQtyModal = document.getElementById('updateQtyModal');
        const archiveModal = document.getElementById('archiveModal');

        // Open Add Modal
        window.openAddModal = function() {
            if (addModal) {
                addModal.classList.add('open');
            }
            const productName = document.getElementById('productName');
            if (productName) {
                productName.innerHTML = '<option value="">Select Product</option>';
            }
            const productQuantity = document.getElementById('productQuantity');
            if (productQuantity) {
                productQuantity.value = 1;
            }
            const productCategory = document.getElementById('productCategory');
            if (productCategory) {
                productCategory.value = '';
            }
        };

        // Close Modals
        window.closeModal = function() {
            if (addModal) {
                addModal.classList.remove('open');
            }
        };

        window.closeEditModal = function() {
            if (editModal) {
                editModal.classList.remove('open');
            }
        };

        window.closeUpdateQtyModal = function() {
            if (updateQtyModal) {
                updateQtyModal.classList.remove('open');
            }
            currentItemIdForUpdate = null;
            currentItemNameForUpdate = null;
        };

        // Archive Modal Functions
        window.openArchiveModal = async function() {
            if (archiveModal) {
                archiveModal.classList.add('open');
            }
            
            // Load archived items
            await loadArchivedItems();
        };

        window.closeArchiveModal = function() {
            if (archiveModal) {
                archiveModal.classList.remove('open');
            }
        };

        // Load Archived Items - FIXED VERSION
        window.loadArchivedItems = async function() {
            const tableBody = document.getElementById('archiveTableBody');
            
            try {
                // Show loading state
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </td>
                    </tr>
                `;
                
                const response = await fetch('/inventory/archived', {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                // Check if result has items property
                if (!result || typeof result !== 'object') {
                    throw new Error('Invalid response from server');
                }
                
                archivedItems = Array.isArray(result.items) ? result.items : [];
                
                if (archivedItems.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="archive-empty-state">
                                <i class="bi bi-archive"></i>
                                <p>No archived items found</p>
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                // Display archived items
                tableBody.innerHTML = archivedItems.map(item => {
                    let categoryClass = '';
                    switch(item.category) {
                        case 'Drinks': categoryClass = 'category-drink'; break;
                        case 'Bread': categoryClass = 'category-bun'; break;
                        case 'Meat': categoryClass = 'category-meat'; break;
                        case 'Hotdogs & Sausages': categoryClass = 'category-hotdog'; break;
                        case 'Poultry': categoryClass = 'category-poultry'; break;
                        case 'Dairy': categoryClass = 'category-dairy'; break;
                        default: categoryClass = 'category-other';
                    }
                    
                    // Safe date handling
                    let archivedDate = 'N/A';
                    try {
                        if (item.archivedAt) {
                            archivedDate = new Date(item.archivedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            });
                        }
                    } catch (e) {
                        console.warn('Error parsing date:', e);
                    }
                    
                    return `
                        <tr data-id="${item._id || ''}">
                            <td>${item.name || 'Unknown'}</td>
                            <td>
                                <span class="category-badge ${categoryClass}">
                                    ${item.category || 'Uncategorized'}
                                </span>
                            </td>
                            <td>${item.quantity || 0}</td>
                            <td>${archivedDate}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="restore-btn" onclick="restoreItem('${item._id || ''}', '${(item.name || 'Unknown').replace(/'/g, "\\'")}')">
                                        <i class="bi bi-arrow-counterclockwise"></i> Restore
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
                
            } catch (error) {
                console.error('Error loading archived items:', error);
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-4" style="color: #dc3545;">
                            <i class="bi bi-exclamation-triangle"></i>
                            <p>Failed to load archived items.</p>
                            <p><small>${error.message}</small></p>
                            <button class="btn btn-primary btn-sm mt-2" onclick="loadArchivedItems()">
                                <i class="bi bi-arrow-clockwise"></i> Retry
                            </button>
                        </td>
                    </tr>
                `;
            }
        };

        // Restore Item - FIXED VERSION
        window.restoreItem = async function(itemId, itemName) {
            if (!itemId) {
                showToast('Invalid item ID', 'error');
                return;
            }
            
            if (confirm(`Are you sure you want to restore "${itemName}"?`)) {
                try {
                    const response = await fetch(`/inventory/restore/${itemId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        showToast('Item restored successfully', 'success');
                        await loadArchivedItems(); // Refresh archive list
                        // Also refresh the main inventory after a delay
                        setTimeout(() => {
                            if (window.location.pathname.includes('/Inventory')) {
                                window.location.reload();
                            }
                        }, 2000);
                    } else {
                        showToast(result.message || 'Failed to restore item', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showToast('Network error. Please try again.', 'error');
                }
            }
        };

        // Delete Permanently - FIXED VERSION
        window.deletePermanently = async function(itemId, itemName) {
            if (!itemId) {
                showToast('Invalid item ID', 'error');
                return;
            }
            
            if (confirm(`Are you sure you want to PERMANENTLY delete "${itemName}"? This action cannot be undone!`)) {
                try {
                    const response = await fetch(`/inventory/delete/${itemId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        showToast('Item permanently deleted', 'success');
                        await loadArchivedItems(); // Refresh archive list
                    } else {
                        showToast(result.message || 'Failed to delete item', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showToast('Network error. Please try again.', 'error');
                }
            }
        };

        // Quantity Controls for Add Modal
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('qty-count--minus')) {
                const qtyInput = document.getElementById('productQuantity');
                if (qtyInput) {
                    let currentValue = parseInt(qtyInput.value) || 1;
                    if (currentValue > parseInt(qtyInput.min)) {
                        qtyInput.value = currentValue - 1;
                    }
                }
            }
            
            if (e.target.classList.contains('qty-count--add')) {
                const qtyInput = document.getElementById('productQuantity');
                if (qtyInput) {
                    let currentValue = parseInt(qtyInput.value) || 1;
                    if (currentValue < parseInt(qtyInput.max)) {
                        qtyInput.value = currentValue + 1;
                    }
                }
            }
        });

        // Add Item Function
        window.addItem = async function() {
            const productName = document.getElementById('productName')?.value;
            const productCategory = document.getElementById('productCategory')?.value;
            const quantity = document.getElementById('productQuantity')?.value;
            
            if (!productName || !productCategory) {
                showToast('Please select both a product and category', 'error');
                return;
            }
            
            const quantityNum = parseInt(quantity);
            if (isNaN(quantityNum) || quantityNum < 0) {
                showToast('Please enter a valid quantity (0 or more)', 'error');
                return;
            }
            
            try {
                const response = await fetch('/inventory', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: productName,
                        quantity: quantityNum,
                        category: productCategory
                    })
                });
                
                let result;
                try {
                    result = await response.json();
                } catch (e) {
                    console.error('Failed to parse response as JSON');
                    showToast('Server error. Please try again.', 'error');
                    return;
                }
                
                if (response.ok && result.success) {
                    showToast('Item added successfully', 'success');
                    closeModal();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showToast(result.message || 'Failed to add item', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Network error. Please try again.', 'error');
            }
        };

        // Edit Item function
        window.editItem = async function(itemId) {
            try {
                const response = await fetch(`/inventory/item/${itemId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch item');
                }
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || 'Failed to load item');
                }
                
                const item = result.item;
                
                document.getElementById('editItemId').value = item._id;
                document.getElementById('editProductName').value = item.name || '';
                document.getElementById('editProductQuantity').value = item.quantity;
                document.getElementById('editProductCategory').value = item.category || '';
                
                if (editModal) {
                    editModal.classList.add('open');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast(error.message || 'Failed to load item details', 'error');
            }
        };

        // Edit Quantity Controls
        window.decrementEditQty = function() {
            const input = document.getElementById('editProductQuantity');
            if (!input) return;
            
            let value = parseInt(input.value) || 0;
            if (value > 0) {
                value--;
                input.value = value;
            }
        };

        window.incrementEditQty = function() {
            const input = document.getElementById('editProductQuantity');
            if (!input) return;
            
            let value = parseInt(input.value) || 0;
            if (value < 1000) {
                value++;
                input.value = value;
            }
        };

        // Update Items
        window.updateItem = async function() {
            const itemId = document.getElementById('editItemId')?.value;
            const name = document.getElementById('editProductName')?.value.trim();
            const quantity = document.getElementById('editProductQuantity')?.value;
            const category = document.getElementById('editProductCategory')?.value;
            
            if (!name || !category) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            const quantityNum = parseInt(quantity);
            if (isNaN(quantityNum) || quantityNum < 0) {
                showToast('Please enter a valid quantity (0 or more)', 'error');
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
                        quantity: quantityNum,
                        category: category
                    })
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showToast('Item updated successfully', 'success');
                    closeEditModal();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showToast(result.message || 'Failed to update item', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Network error. Please try again.', 'error');
            }
        };

        // Open Update Quantity Modal
        window.openUpdateQuantityModal = function(itemId, itemName, currentQuantity) {
            currentItemIdForUpdate = itemId;
            currentItemNameForUpdate = itemName;
            
            document.getElementById('updateQtyProductName').textContent = itemName;
            document.getElementById('updateQtyCurrent').textContent = currentQuantity;
            document.getElementById('updateQtyQuantity').value = currentQuantity;
            
            if (updateQtyModal) {
                updateQtyModal.classList.add('open');
            }
        };

        // Update Quantity Modal Controls
        window.decrementUpdateQty = function() {
            const input = document.getElementById('updateQtyQuantity');
            if (!input) return;
            
            let value = parseInt(input.value) || 0;
            if (value > 0) {
                value--;
                input.value = value;
            }
        };

        window.incrementUpdateQty = function() {
            const input = document.getElementById('updateQtyQuantity');
            if (!input) return;
            
            let value = parseInt(input.value) || 0;
            if (value < 1000) {
                value++;
                input.value = value;
            }
        };

        // Confirm Update Quantity
        window.confirmUpdateQuantity = async function() {
            if (!currentItemIdForUpdate) {
                showToast('No item selected for update', 'error');
                return;
            }
            
            const quantity = document.getElementById('updateQtyQuantity').value;
            const quantityNum = parseInt(quantity);
            
            if (isNaN(quantityNum) || quantityNum < 0) {
                showToast('Please enter a valid quantity (0 or more)', 'error');
                return;
            }
            
            try {
                const response = await fetch(`/inventory/update/${currentItemIdForUpdate}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        quantity: quantityNum,
                        updateType: 'quantityOnly'
                    })
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showToast('Quantity updated successfully', 'success');
                    closeUpdateQtyModal();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showToast(result.message || 'Failed to update quantity', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Network error. Please try again.', 'error');
            }
        };

        // Archive Item - FIXED: Check if quantity is 0 before archiving
        window.archiveItem = async function(itemId, itemName, currentQuantity) {
            if (!itemId) {
                showToast('Invalid item ID', 'error');
                return;
            }
            
            // Check if item has quantity greater than 0
            if (currentQuantity > 0) {
                showToast(`Cannot archive "${itemName}" because it still has ${currentQuantity} items in stock. Set quantity to 0 first.`, 'error');
                return;
            }
            
            if (confirm(`Are you sure you want to archive "${itemName}"? This item will be moved to archives.`)) {
                try {
                    const response = await fetch(`/inventory/archive/${itemId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        showToast('Item archived successfully', 'success'); 
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        showToast(result.message || 'Failed to archive item', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showToast('Network error. Please try again.', 'error');
                }
            }
        };

        // Initialize everything when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            console.log("Admin-Inventory.js loaded successfully");
            
            // Initialize drag and drop
            initializeDragAndDrop();
            applySavedOrder();
            updateSortButtons();
            
            // Check for out of stock items
            checkOutOfStockItems();
            
            // Initialize sidebar toggle
            const sidebarToggle = document.getElementById('sidebarToggle');
            const sidebar = document.querySelector('.sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            
            if (sidebarToggle && sidebar) {
                sidebarToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('active');
                    if (sidebarOverlay) {
                        sidebarOverlay.classList.toggle('active');
                    }
                });
                
                if (sidebarOverlay) {
                    sidebarOverlay.addEventListener('click', function() {
                        sidebar.classList.remove('active');
                        sidebarOverlay.classList.remove('active');
                    });
                }
                
                if (window.innerWidth <= 768) {
                    const menuItems = document.querySelectorAll('.menu-item a');
                    menuItems.forEach(item => {
                        item.addEventListener('click', function() {
                            sidebar.classList.remove('active');
                            if (sidebarOverlay) {
                                sidebarOverlay.classList.remove('active');
                            }
                        });
                    });
                }
            }
            
            // Initialize category select for add modal
            const categorySelect = document.getElementById('productCategory');
            if (categorySelect) {
                categorySelect.addEventListener('change', updateProductOptions);
            }
            
            // Logout Functionality
            const logoutBtn = document.querySelector('.logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (confirm('Are you sure you want to logout?')) {
                        performLogout();
                    }
                });
            }
            
            // Initialize category dropdown event handling
            const categoryMenu = document.getElementById('categoryMenu');
            if (categoryMenu) {
                categoryMenu.addEventListener('click', function(e) {
                    const target = e.target.closest('.dropdown-item');
                    if (!target) return;
                    
                    e.preventDefault();
                    
                    const category = target.getAttribute('data-category');
                    if (!category) return;
                    
                    if (typeof window.filterCategory === 'function') {
                        window.filterCategory(category);
                    }
                });
            }
            
            // Close modals when clicking outside
            document.addEventListener('click', function(e) {
                // Close add modal
                if (addModal && addModal.classList.contains('open') && e.target === addModal) {
                    closeModal();
                }
                
                // Close edit modal
                if (editModal && editModal.classList.contains('open') && e.target === editModal) {
                    closeEditModal();
                }
                
                // Close update quantity modal
                if (updateQtyModal && updateQtyModal.classList.contains('open') && e.target === updateQtyModal) {
                    closeUpdateQtyModal();
                }
                
                // Close archive modal
                if (archiveModal && archiveModal.classList.contains('open') && e.target === archiveModal) {
                    closeArchiveModal();
                }
                
                // Close out of stock modal
                const outOfStockModal = document.getElementById('outOfStockModal');
                if (outOfStockModal && outOfStockModal.classList.contains('open') && e.target === outOfStockModal) {
                    // Only allow closing if button is enabled
                    const okBtn = document.getElementById('outOfStockOkBtn');
                    if (okBtn && !okBtn.disabled) {
                        closeOutOfStockModal();
                    }
                }
            });
            
            // Close modals with Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeModal();
                    closeEditModal();
                    closeUpdateQtyModal();
                    closeArchiveModal();
                    
                    // Only close out of stock modal if button is enabled
                    const okBtn = document.getElementById('outOfStockOkBtn');
                    if (okBtn && !okBtn.disabled) {
                        closeOutOfStockModal();
                    }
                }
            });
            
            console.log("Admin-Inventory.js initialization complete");
        });

        // Logout function
        window.performLogout = async function() {
            try {
                const logoutBtn = document.querySelector('.logout-btn');
                if (logoutBtn) {
                    logoutBtn.textContent = 'Logging out...';
                    logoutBtn.disabled = true;
                }

                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (apiError) {
                    console.log('Backend logout failed:', apiError.message);
                }

                localStorage.clear();
                sessionStorage.clear();

                document.cookie.split(";").forEach(function(c) {
                    const cookieName = c.split("=")[0].trim();
                    if (cookieName.includes('auth') || cookieName.includes('token') || cookieName.includes('session')) {
                        document.cookie = cookieName + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    }
                });

                showToast('Logged out successfully', 'success');

                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);   

            } catch (error) {
                console.error('Logout error:', error);
                showToast('Logout failed', 'error');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            }
        };