// Define categoryProducts first - MAKE IT GLOBAL
window.categoryProducts = {
    "Drinks": ["Zesto", "Sting", "Mineral Water", "Cobra", "Softdrink"],
    "Meat": ["Beef", "Pork", "Chicken"],
    "Hotdogs & Sausages": ["Hotdog", "Sausage", "Combo Hotdog", "Ham"],
    "Poultry": ["Eggs"],
    "Dairy": ["Cheese"],
    "Bread": ["Burger Buns", "Hotdog Buns", "Footlong Buns"]
};

// Define getCategoryClass function - MAKE IT GLOBAL
window.getCategoryClass = function(category) {
    const categoryMap = {
        "Drinks": "drinks",
        "Bread": "bread",
        "Hotdogs & Sausages": "hotdogs-sausages",
        "Poultry": "poultry",
        "Dairy": "dairy",
        "Meat": "meat"
    };
    
    return `category-${categoryMap[category] || "other"}`;
};

// Toast Notification - MAKE IT GLOBAL
window.showToast = function(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error("Toast element not found");
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};

// FIXED: Filter by Category - MAKE IT GLOBAL
window.filterCategory = function(category) {
    console.log("Filtering by category:", category);
    
    // Update dropdown button text
    const dropdownButton = document.getElementById('dropdownMenuButton1');
    if (dropdownButton) {
        dropdownButton.textContent = category === 'all' ? 'Categories' : category;
        dropdownButton.setAttribute('data-current-category', category);
        
        // Close dropdown on mobile
        if (window.innerWidth <= 768) {
            const dropdownMenu = dropdownButton.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('show')) {
                dropdownMenu.classList.remove('show');
                dropdownButton.setAttribute('aria-expanded', 'false');
            }
        }
    }
    
    // Filter table rows
    const tableBody = document.getElementById('itemsTable');
    if (!tableBody) {
        console.error("itemsTable not found");
        return;
    }
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        // Skip placeholder/header rows
        if (row.querySelector('td[colspan]') || row.classList.contains('no-items-row')) {
            row.style.display = (category === 'all') ? '' : 'none';
            return;
        }
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) {
            row.style.display = 'none';
            return;
        }
        
        // Get category from the category badge (3rd column)
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
    
    // Update URL hash for bookmarking
    if (category !== 'all') {
        window.location.hash = `category=${category}`;
    } else {
        window.location.hash = '';
    }
};

// Search Functionality - MAKE IT GLOBAL
window.searchItems = function() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim();
    const tableBody = document.getElementById('itemsTable');
    
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    // Get current category filter
    const dropdownButton = document.getElementById('dropdownMenuButton1');
    const currentCategory = dropdownButton?.getAttribute('data-current-category') || 'all';
    
    rows.forEach(row => {
        // Skip placeholder rows
        if (row.querySelector('td[colspan]') || row.classList.contains('no-items-row')) {
            return;
        }
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) {
            row.style.display = 'none';
            return;
        }
        
        // Get item name from first cell
        const itemName = cells[0].textContent.toLowerCase() || '';
        // Get category from category badge
        const categorySpan = cells[2].querySelector('.category-badge');
        const category = categorySpan ? categorySpan.textContent.toLowerCase() : '';
        // Get quantity from 4th cell
        const quantity = cells[3]?.textContent.toLowerCase() || '';
        
        // Check category filter first
        const categoryMatch = currentCategory === 'all' || category.includes(currentCategory.toLowerCase());
        
        // Then check search term
        const searchMatch = searchTerm === '' || 
            itemName.includes(searchTerm) || 
            category.includes(searchTerm) || 
            quantity.includes(searchTerm);
        
        if (categoryMatch && searchMatch) {
            row.style.display = '';
            hasVisibleRows = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update no results message
    const noResultsRow = tableBody.querySelector('.no-items-row');
    if (noResultsRow) {
        if (!hasVisibleRows && (searchTerm !== '' || currentCategory !== 'all')) {
            noResultsRow.style.display = '';
            let message = 'No items found';
            if (searchTerm !== '' && currentCategory !== 'all') {
                message = `No items found for "${searchTerm}" in category: ${currentCategory}`;
            } else if (searchTerm !== '') {
                message = `No items found for "${searchTerm}"`;
            } else if (currentCategory !== 'all') {
                message = `No items found in category: ${currentCategory}`;
            }
            noResultsRow.querySelector('td').textContent = message;
        } else {
            noResultsRow.style.display = 'none';
        }
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
const openBtn = document.querySelector('.openModal');

// Open Add Modal
if (openBtn) {
    openBtn.addEventListener('click', () => {
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
    });
}

// Close Modals - MAKE GLOBAL
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

// Add Item Function - MAKE GLOBAL
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
};

// Edit Item function - MAKE GLOBAL
window.editItem = async function(itemId) {
    try {
        let response;
        // Try multiple endpoints
        try {
            response = await fetch(`/inventory/item/${itemId}`);
        } catch (e) {
            try {
                response = await fetch(`/Inventory/item/${itemId}`);
            } catch (e2) {
                throw new Error('Network error');
            }
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
        
        if (editModal) {
            editModal.style.display = 'flex';
            editModal.classList.add('open');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Failed to load item details', 'error');
    }
};

// Edit Quantity Controls - MAKE GLOBAL
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

// Update Items - MAKE GLOBAL
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
};

// Update Quantity Prompt - MAKE GLOBAL
window.updateQuantityPrompt = function(itemId, itemName) {
    const newQuantity = prompt(`Update quantity for "${itemName}":`, '0');
    if (newQuantity !== null && newQuantity !== '') {
        const quantity = parseInt(newQuantity);
        if (!isNaN(quantity) && quantity >= 0) {
            updateQuantity(itemId, quantity);
        } else {
            showToast('Please enter a valid number (0 or more)', 'error');
        }
    }
};

// Update Quantity - MAKE GLOBAL
window.updateQuantity = async function(itemId, quantity) {
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
};

// Delete Item - MAKE GLOBAL
window.deleteItem = async function(itemId, itemName) {
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
};

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin-Inventory.js loaded successfully");
    
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
    
    // FIXED: Mobile category dropdown - SIMPLIFIED APPROACH
    // Use direct event listeners for better mobile compatibility
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        // Add click event
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const text = this.textContent.trim();
            let category;
            
            console.log("Category clicked:", text);
            
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
            
            // Call filter function
            if (typeof window.filterCategory === 'function') {
                window.filterCategory(category);
            }
            
            // Close dropdown on mobile
            if (window.innerWidth <= 768) {
                const dropdownButton = document.getElementById('dropdownMenuButton1');
                const dropdownMenu = document.querySelector('.dropdown-menu.show');
                if (dropdownMenu) {
                    dropdownMenu.classList.remove('show');
                }
                if (dropdownButton) {
                    dropdownButton.setAttribute('aria-expanded', 'false');
                }
            }
        });
        
        // Add touch event for mobile
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.click(); // Trigger click event
        }, { passive: false });
    });
    
    // Initialize search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (typeof window.searchItems === 'function') {
                window.searchItems();
            }
        });
        
        // Clear button functionality
        const clearSearch = document.createElement('button');
        clearSearch.innerHTML = '&times;';
        clearSearch.style.cssText = 'position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 20px; cursor: pointer; color: #999;';
        clearSearch.addEventListener('click', function() {
            searchInput.value = '';
            searchItems();
            searchInput.focus();
        });
        
        // Only add clear button if not already present
        if (!searchInput.parentElement.querySelector('.clear-search')) {
            clearSearch.className = 'clear-search';
            searchInput.parentElement.style.position = 'relative';
            searchInput.parentElement.appendChild(clearSearch);
        }
    }
    
    // Initialize event listeners for edit/delete buttons using event delegation
    document.addEventListener('click', function(e) {
        // Handle edit button clicks
        if (e.target.closest('.btn-action.edit')) {
            const btn = e.target.closest('.btn-action.edit');
            const row = btn.closest('tr');
            const itemId = row.getAttribute('data-id');
            if (itemId) {
                editItem(itemId);
            }
        }
        
        // Handle delete button clicks
        if (e.target.closest('.btn-action.delete')) {
            const btn = e.target.closest('.btn-action.delete');
            const row = btn.closest('tr');
            const itemId = row.getAttribute('data-id');
            const itemName = row.querySelector('td:first-child').textContent;
            if (itemId && itemName) {
                deleteItem(itemId, itemName);
            }
        }
    });
    
    // Handle Quick Update and Delete buttons in table
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
    
    // Check URL hash for category filter
    const hash = window.location.hash;
    if (hash && hash.includes('category=')) {
        const category = hash.split('category=')[1];
        if (category && typeof window.filterCategory === 'function') {
            setTimeout(() => {
                window.filterCategory(category);
            }, 100);
        }
    }
    
    console.log("Admin-Inventory.js initialization complete");
});

// Logout function - MAKE GLOBAL
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
};

// Initialize Bootstrap tooltips if available
if (typeof bootstrap !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });
}

// Mobile-specific fixes
window.isMobile = function() {
    return window.innerWidth <= 768;
};

// Handle window resize
window.addEventListener('resize', function() {
    if (window.isMobile()) {
        // Ensure dropdowns are closed on mobile resize
        const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
        openDropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
            const button = dropdown.previousElementSibling;
            if (button && button.classList.contains('dropdown-toggle')) {
                button.setAttribute('aria-expanded', 'false');
            }
        });
    }
});

// Emergency fallback: If filterCategory is not defined, define a simple version
if (typeof window.filterCategory === 'undefined') {
    console.warn("filterCategory was undefined, defining emergency fallback");
    window.filterCategory = function(category) {
        alert("Filtering by: " + category + "\nThis is a fallback function. Please check console for errors.");
        console.log("Emergency filterCategory called with:", category);
    };
}

// Debug info
console.log("Admin-Inventory.js loaded successfully");
console.log("Critical functions status:");
console.log("- filterCategory:", typeof window.filterCategory);
console.log("- searchItems:", typeof window.searchItems);
console.log("- showToast:", typeof window.showToast);
console.log("- addItem:", typeof window.addItem);