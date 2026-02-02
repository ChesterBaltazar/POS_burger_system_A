const categoryProducts = {
    "Drinks": ["Zesto", "Sting", "Mineral Water", "Softdrinks", "Cobra"],
    "Meat": ["Beef", "Pork"],
    "Hotdogs & Sausages": ["Hotdog", "Sausage", "Combo Hotdog"],
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

const sampleInventoryData = [
    { _id: "DR001", name: "Zesto", category: "Drinks", quantity: 24 },
    { _id: "DR002", name: "Sting", category: "Drinks", quantity: 36 },
    { _id: "DR003", name: "Mineral Water", category: "Drinks", quantity: 48 },
    { _id: "DR004", name: "Softdrinks", category: "Drinks", quantity: 12 },
    { _id: "DR005", name: "Cobra", category: "Drinks", quantity: 18 },
    { _id: "MT001", name: "Beef", category: "Meat", quantity: 15 },
    { _id: "MT002", name: "Pork", category: "Meat", quantity: 20 },
    { _id: "HS001", name: "Hotdog", category: "Hotdogs & Sausages", quantity: 40 },
    { _id: "HS002", name: "Sausage", category: "Hotdogs & Sausages", quantity: 32 },
    { _id: "HS003", name: "Combo Hotdog", category: "Hotdogs & Sausages", quantity: 20 },
    { _id: "PT001", name: "Eggs", category: "Poultry", quantity: 50 },
    { _id: "DY001", name: "Cheese", category: "Dairy", quantity: 15 },
    { _id: "BR001", name: "Burger Buns", category: "Bread", quantity: 30 },
    { _id: "BR002", name: "Hotdog Buns", category: "Bread", quantity: 35 },
    { _id: "BR003", name: "Footlong Buns", category: "Bread", quantity: 20 }
];

function loadSampleData() {
    const tableBody = document.getElementById('itemsTable');
    
    if (!tableBody) {
        console.error('Table body not found');
        return;
    }
    
    // Save the header row if it exists
    const headerRow = tableBody.querySelector('tr:first-child');
    const isHeaderRow = headerRow && headerRow.querySelector('td[colspan="6"]');
    
    // Clear existing rows except the header/no items row
    tableBody.innerHTML = '';
    
    sampleInventoryData.forEach(item => {
        const row = document.createElement('tr');
        
        // Determine status
        let statusClass = '';
        let statusText = '';
        if (item.quantity === 0) {
            statusClass = 'status-outofstock';
            statusText = 'Out of Stock';
        } else if (item.quantity <= 10) {
            statusClass = 'status-lowstock';
            statusText = 'Low Stock';
        } else {
            statusClass = 'status-instock';
            statusText = 'In Stock';
        }
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td><small>${item._id}</small></td>
            <td><span class="category-badge ${getCategoryClass(item.category)}">${item.category}</span></td>
            <td>${item.quantity}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-success btn-action" 
                            onclick="updateQuantityPrompt('${item._id}', '${item.name}')">
                        Qty
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" 
                            onclick="deleteItem('${item._id}', '${item.name}')">
                        Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    showToast('Sample data loaded successfully!');
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

// SEARCH AND FILTER FUNCTIONS - FIXED VERSION
function searchItems() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const tableBody = document.getElementById('itemsTable');
    
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        // Skip rows that have colspan (like "No Items to Display")
        if (row.querySelector('td[colspan]')) {
            return;
        }
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;
        
        const name = cells[0].textContent.toLowerCase();
        const id = cells[1].textContent.toLowerCase();
        const categorySpan = cells[2].querySelector('.category-badge');
        const category = categorySpan ? categorySpan.textContent.toLowerCase() : '';
        
        if (name.includes(searchTerm) || category.includes(searchTerm) || id.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterCategory(category) {
    console.log('Filtering by category:', category); // Debug log
    
    const dropdownButton = document.getElementById('dropdownMenuButton1');
    dropdownButton.textContent = category === 'all' ? 'Categories' : category;
    
    const tableBody = document.getElementById('itemsTable');
    if (!tableBody) {
        console.error('Table body not found');
        return;
    }
    
    const rows = tableBody.querySelectorAll('tr');
    console.log('Total rows found:', rows.length); // Debug log
    
    let visibleRows = 0;
    
    rows.forEach((row, index) => {
        // Skip rows that have colspan (like "No Items to Display")
        if (row.querySelector('td[colspan]')) {
            console.log('Row has colspan, skipping');
            row.style.display = (category === 'all') ? '' : 'none';
            return;
        }
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) {
            console.log('Row has less than 3 cells, skipping');
            return;
        }
        
        const categorySpan = cells[2].querySelector('.category-badge');
        
        if (!categorySpan) {
            console.log('Row has no category badge, skipping');
            return;
        }
        
        const rowCategory = categorySpan.textContent.trim();
        console.log(`Row ${index} category: "${rowCategory}"`); // Debug log
        
        if (category === 'all' || rowCategory === category) {
            row.style.display = '';
            visibleRows++;
            console.log(`Row ${index} - SHOW (category matches)`);
        } else {
            row.style.display = 'none';
            console.log(`Row ${index} - HIDE (category doesn't match)`);
        }
    });
    
    console.log(`Total visible rows after filtering: ${visibleRows}`); // Debug log
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
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                performLogout();
            }
        });
    }
    
    // Add event listeners for category filter dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        // Check if the dropdown item has text content matching our categories
        const text = item.textContent.trim();
        if (text === 'All Categories' || 
            text === 'Drinks' || 
            text === 'Bread' || 
            text === 'Meat' || 
            text === 'Poultry' || 
            text === 'Dairy' || 
            text === 'Hotdogs & Sausages') {
            
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const category = text === 'All Categories' ? 'all' : text;
                console.log('Dropdown item clicked:', text, '-> filterCategory:', category);
                filterCategory(category);
                
                // Close the dropdown
                const dropdown = document.querySelector('.dropdown-menu');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
            });
        }
    });
    
    // Also keep the existing onclick handlers as backup
    document.querySelectorAll('.dropdown-item[onclick^="filterCategory"]').forEach(item => {
        const originalOnClick = item.getAttribute('onclick');
        if (originalOnClick) {
            item.removeAttribute('onclick');
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const match = originalOnClick.match(/filterCategory\('([^']+)'\)/);
                if (match && match[1]) {
                    filterCategory(match[1]);
                }
            });
        }
    });
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
                    'Content-Type': 'application/json'
                }
            });
        } catch (apiError) {
            // Ignore API errors
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

        showToast('Logged out', 'success');

        setTimeout(() => {
            window.location.replace('/');
        }, 1000);

    } catch (error) {
        console.error('Logout error:', error);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/');
    }
}

// Function to reset to sample data (if needed)
function resetToSampleData() {
    if (confirm('Are you sure you want to reset to sample data? This will replace all current items.')) {
        loadSampleData();
    }
}