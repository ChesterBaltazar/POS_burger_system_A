const categoryProducts = {
    "Drinks": ["Zesto", "Sting", "Mineral Water", "Cobra", "Softdrink"], // Added Softdrink here
    "Meat": ["Beef", "Pork", "Chicken"], // Added Chicken here
    "Hotdogs & Sausages": ["Hotdog", "Sausage", "Combo Hotdog", "Ham"], // Added Ham here
    "Poultry": ["Eggs"],
    "Dairy": ["Cheese"],
    "Bread": ["Burger Buns", "Hotdog Buns", "Footlong Buns"]
};

function getCategoryClass(category) {
    const categoryMap = {
        "Drinks": "drinks",
        "Bread": "bread",
        "Hotdogs & Sausages": "hotdogs-sausages",
        "Poultry": "poultry",
        "Dairy": "dairy",
        "Meat": "meat"
    };
    
    return `category-${categoryMap[category] || "other"}`;
}

// DOM Elements
const addModal = document.getElementById('addModal');
const editModal = document.getElementById('editModal');
const openBtn = document.querySelector('.openModal');
const toast = document.getElementById('toast');

// Toast Notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Function to update product dropdown based on selected category
function updateProductOptions() {
    const categorySelect = document.getElementById('productCategory');
    const productSelect = document.getElementById('productName');
    const selectedCategory = categorySelect.value;
    
    productSelect.innerHTML = '<option value="">Select Product</option>';
    
    if (selectedCategory && categoryProducts[selectedCategory]) {
        categoryProducts[selectedCategory].forEach(product => {
            const option = document.createElement('option');
            option.value = product;
            option.textContent = product;
            productSelect.appendChild(option);
        });
    }
}

// Open Add Modal
if (openBtn) {
    openBtn.addEventListener('click', () => {
        addModal.classList.add('open');
        document.getElementById('productName').innerHTML = '<option value="">Select Product</option>';
        document.getElementById('productQuantity').value = 1;
        document.getElementById('productCategory').value = '';
    });
}

// Close Modals
function closeModal() {
    addModal.classList.remove('open');
}

function closeEditModal() {
    editModal.classList.remove('open');
}

// Quantity Controls
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

// Add Item Function
async function addItem() {
    const productName = document.getElementById('productName').value;
    const productCategory = document.getElementById('productCategory').value;
    const quantity = document.getElementById('productQuantity').value;
    
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
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Item added successfully');
            closeModal();
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            if (result.message && result.message.includes('already exists')) {
                showToast(result.message, 'error');
            } else {
                showToast('Error: ' + (result.message || 'Failed to add item'), 'error');
            }
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
        
        const item = result.item;
        
        document.getElementById('editItemId').value = item._id;
        document.getElementById('editProductName').value = item.name || '';
        document.getElementById('editProductQuantity').value = item.quantity;
        document.getElementById('editProductCategory').value = item.category || '';
        
        document.getElementById('editProductName').readOnly = true;
        document.getElementById('editProductName').style.backgroundColor = '#f5f5f5';
        
        editModal.style.display = 'flex';
        editModal.classList.add('open');
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Failed to load item details', 'error');
    }
}

// Edit Quantity Controls
function decrementEditQty() {
    const input = document.getElementById('editProductQuantity');
    let value = parseInt(input.value) || 0;
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

// Update Items
async function updateItem() {
    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('editProductName').value.trim();
    const quantity = document.getElementById('editProductQuantity').value;
    const category = document.getElementById('editProductCategory').value;
    
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
            showToast('Please enter a valid number (0 or more)', 'error');
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

// Delete Item
async function deleteItem(itemId, itemName) {
    if (confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
        try {
            let response = await fetch(`/inventory/delete/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                showToast('Item deleted'); 
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                showToast('Failed to delete item', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast(`Failed to delete item: ${error.message}`, 'error');
        }
    }
}

// FIXED: Search Functionality
function searchItems() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const tableBody = document.getElementById('itemsTable');
    
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        // Skip if it's a placeholder row
        if (row.querySelector('td[colspan]')) {
            row.style.display = 'none';
            return;
        }
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) {
            row.style.display = 'none';
            return;
        }
        
        // Get item name from first cell (no .item-name class in the HTML)
        const itemName = cells[0].textContent.toLowerCase() || '';
        // Get item ID from second cell (small tag)
        const itemId = cells[1].querySelector('small')?.textContent.toLowerCase() || '';
        const categorySpan = cells[2].querySelector('.category-badge');
        const category = categorySpan ? categorySpan.textContent.toLowerCase() : '';
        // Quantity is in the 4th cell (index 3)
        const quantity = cells[3]?.textContent.toLowerCase() || '';
        
        const matches = 
            itemName.includes(searchTerm) || 
            itemId.includes(searchTerm) || 
            category.includes(searchTerm) || 
            quantity.includes(searchTerm);
        
        if (matches || searchTerm === '') {
            row.style.display = '';
            hasVisibleRows = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show/hide no results message
    const noResultsRow = tableBody.querySelector('.no-items-row');
    if (noResultsRow) {
        if (!hasVisibleRows && searchTerm !== '') {
            noResultsRow.style.display = '';
            noResultsRow.querySelector('td').textContent = 'No items found matching your search';
        } else {
            noResultsRow.style.display = 'none';
        }
    }
}

// FIXED: Filter by Category
function filterCategory(category) {
    const dropdownButton = document.getElementById('dropdownMenuButton1');
    dropdownButton.textContent = category === 'all' ? 'Categories' : category;
    
    const tableBody = document.getElementById('itemsTable');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        // Skip if it's a placeholder row
        if (row.querySelector('td[colspan]')) {
            row.style.display = (category === 'all') ? '' : 'none';
            return;
        }
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) {
            row.style.display = 'none';
            return;
        }
        
        const categorySpan = cells[2].querySelector('.category-badge');
        const rowCategory = categorySpan ? categorySpan.textContent.trim() : '';
        
        if (category === 'all' || rowCategory === category) {
            row.style.display = '';
            hasVisibleRows = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show/hide no results message
    const noResultsRow = tableBody.querySelector('.no-items-row');
    if (noResultsRow) {
        if (!hasVisibleRows && category !== 'all') {
            noResultsRow.style.display = '';
            noResultsRow.querySelector('td').textContent = `No items found in category: ${category}`;
        } else {
            noResultsRow.style.display = 'none';
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
        
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
        
        if (window.innerWidth <= 768) {
            const menuItems = document.querySelectorAll('.menu-item a');
            menuItems.forEach(item => {
                item.addEventListener('click', function() {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                });
            });
        }
    }
    
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
    
    // Add event listeners for category filter dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const text = item.textContent.trim();
            let category;
            
            if (text === 'All Categories') {
                category = 'all';
            } else if (text === 'Drinks' || 
                       text === 'Bread' || 
                       text === 'Meat' || 
                       text === 'Poultry' || 
                       text === 'Dairy' || 
                       text === 'Hotdogs & Sausages') {
                category = text;
            } else {
                return;
            }
            
            filterCategory(category);
            
            // Close the dropdown
            const dropdown = document.querySelector('.dropdown-menu');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        });
    });
    
    // Initialize search input with event listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchItems);
    }
    
    // Initialize event listeners for edit buttons
    document.addEventListener('click', function(e) {
        // Check if the clicked element has class 'edit-btn' (though not in current HTML)
        // or check parent element for edit functionality
        if (e.target.classList.contains('btn-action') || 
            e.target.closest('.btn-action')) {
            // Handle edit button clicks if they exist
            const target = e.target.closest('.btn-action');
            if (target.textContent.includes('Edit')) {
                const row = target.closest('tr');
                const itemId = row.getAttribute('data-id');
                if (itemId) {
                    editItem(itemId);
                }
            }
        }
    });
});

async function performLogout() {
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

        // Clear storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear auth cookies
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
}

// Event delegation for action buttons (updated for current HTML structure)
document.addEventListener('click', function(e) {
    const target = e.target;
    
    // Quick update button (Qty button)
    if (target.classList.contains('btn-outline-success') || target.closest('.btn-outline-success')) {
        const btn = target.classList.contains('btn-outline-success') ? target : target.closest('.btn-outline-success');
        const row = btn.closest('tr');
        const itemId = row.getAttribute('data-id');
        const itemName = row.querySelector('td:first-child').textContent;
        if (itemId && itemName) updateQuantityPrompt(itemId, itemName);
    }
    
    // Delete button
    if (target.classList.contains('btn-outline-danger') || target.closest('.btn-outline-danger')) {
        const btn = target.classList.contains('btn-outline-danger') ? target : target.closest('.btn-outline-danger');
        const row = btn.closest('tr');
        const itemId = row.getAttribute('data-id');
        const itemName = row.querySelector('td:first-child').textContent;
        if (itemId && itemName) deleteItem(itemId, itemName);
    }
});

// Initialize Bootstrap tooltips
document.addEventListener('DOMContentLoaded', function() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});