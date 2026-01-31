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
    // Drinks category
    { _id: "DR001", name: "Zesto", category: "Drinks", quantity: 24 },
    { _id: "DR002", name: "Sting", category: "Drinks", quantity: 36 },
    { _id: "DR003", name: "Mineral Water", category: "Drinks", quantity: 48 },
    { _id: "DR004", name: "Softdrinks", category: "Drinks", quantity: 12 },
    { _id: "DR005", name: "Cobra", category: "Drinks", quantity: 18 },
    
    // Meat category
    { _id: "MT001", name: "Beef", category: "Meat", quantity: 15 },
    { _id: "MT002", name: "Pork", category: "Meat", quantity: 20 },
    
    // Hotdogs & Sausages category
    { _id: "HS001", name: "Hotdog", category: "Hotdogs & Sausages", quantity: 40 },
    { _id: "HS002", name: "Sausage", category: "Hotdogs & Sausages", quantity: 32 },
    { _id: "HS003", name: "Combo Hotdog", category: "Hotdogs & Sausages", quantity: 20 },
    
    // Poultry category
    { _id: "PT001", name: "Eggs", category: "Poultry", quantity: 50 },
    
    // Dairy category
    { _id: "DY001", name: "Cheese", category: "Dairy", quantity: 15 },
    
    // Bread category
    { _id: "BR001", name: "Burger Buns", category: "Bread", quantity: 30 },
    { _id: "BR002", name: "Hotdog Buns", category: "Bread", quantity: 35 },
    { _id: "BR003", name: "Footlong Buns", category: "Bread", quantity: 20 }
];


function loadSampleData() {
    const tableBody = document.getElementById('itemsTable')?.querySelector('tbody') || 
                     document.querySelector('#itemsTable tbody') ||
                     document.querySelector('tbody');
    
    if (!tableBody) {
        console.error('Table body not found');
        return;
    }
    

    tableBody.innerHTML = '';
    

    sampleInventoryData.forEach(item => {
        const row = document.createElement('tr');
        const categoryClass = getCategoryClass(item.category);
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item._id}</td>
            <td><span class="category-badge ${categoryClass}">${item.category}</span></td>
            <td>${item.quantity}</td>
            <td class="actions">
                <button class="btn btn-edit" onclick="editItem('${item._id}')">Edit</button>
                <button class="btn btn-update" onclick="updateQuantityPrompt('${item._id}', '${item.name}')">Update Qty</button>
                <button class="btn btn-delete" onclick="deleteItem('${item._id}', '${item.name}')">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    showToast('Sample data loaded successfully!');
    console.log('Sample data loaded. Items:', sampleInventoryData.length);
}

// Function to reset to sample data
function resetToSampleData() {
    if (confirm('Are you sure you want to reset to sample data? This will replace all current items.')) {
        loadSampleData();
    }
}

// DOM Elements
const addModal = document.getElementById('addModal');
const editModal = document.getElementById('editModal');
const openBtn = document.querySelector('.openModal');
const closeBtn = document.getElementById('CloseModal');
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

// Add Item Function - REMOVED PRICE
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
                // Removed price field
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
            // Improved error message handling
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
                    
                    if (response.ok) {
                        break;
                    }
                } catch (err) {

                }
            }
            
            if (!response) {
                throw new Error('No response from server');
            }
                    
            if (response.ok) {
                const result = await response.json();
                showToast('Item deleted'); 
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                showToast(`Failed to delete item: ${response.status} ${response.statusText}`, 'error');
            }
            
        } catch (error) {
            console.error('Error:', error);
            showToast(`Failed to delete item: ${error.message}`, 'error');
        }
    }
}

// Search and Filter Functions
function searchItems() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#itemsTable tr');
    
    rows.forEach(row => {
        if (row.cells.length < 3) return; 
        
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
        if (row.cells.length < 3) return; 
        
        const rowCategory = row.cells[2].textContent.toLowerCase();
        
        if (category === 'all' || rowCategory === filterValue) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
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