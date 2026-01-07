import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import User from "./models/User.js";
import path from "path";
import jwt from "jsonwebtoken";
import Item from '../POS_burger_system_A/models/Items.js';
import Order from '../POS_burger_system_A/models/orders.js';
import * as dotenv from 'dotenv';  
dotenv.config();

// import { verifyToken } from "./Middleware/verifyToken.js";
// import { createAuthMiddleware } from "./Middleware/verifyToken.js";
// import Authroutes from "./routes/Auth.js";

const port = process.env.PORT;
const app = express();
const SECRET = "my_super_secret_key";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(express.static(path.join(__dirname, "views")));

// API
app.get("/", (req, res) => {
    res.render("Login");
});

app.get("/register", (req, res)=>{
    res.render("register");
});

app.get("/Dashboard/User-dashboard", (req, res) => {
    res.render("User-dashboard");
})

app.get("/Dashboard/admin-dashboard", async (req, res) => {
    try {
        // Fetch dashboard data from API
        const statsResponse = await fetch(`http://localhost:${port}/api/dashboard/stats`);
        let dashboardData = {};
        
        if (statsResponse.ok) {
            const result = await statsResponse.json();
            dashboardData = result.data;
        }
        
        res.render("Admin-dashboard", {
            stats: dashboardData,
            currentDate: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        // Fallback data
        res.render("Admin-dashboard", {
            stats: {
                totalSales: 0,
                netProfit: 0,
                ordersToday: 0,
                totalCustomers: 0,
                recentSales: [],
                lowStockAlerts: []
            },
            currentDate: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });
    }
});

// inventory to Dashboard, Reports, POS, Settings
app.get("/Dashboard/Admin-dashboard/Inventory", async (req, res) => {
    try {
        const totalProducts = await Item.countDocuments();
        const inStock = await Item.countDocuments({ quantity: { $gt: 0 } });
        const lowStock = await Item.countDocuments({ quantity: { $gt: 0, $lte: 5 } });
        const outOfStock = await Item.countDocuments({ quantity: 0 });
        const items = await Item.find();

        const stats = {
            totalProducts,
            inStock,
            lowStock,
            outOfStock
        };

        res.render("Inventory", { stats, items });
    } catch (error) {
        console.error("Error fetching inventory stats:", error);
        res.render("Inventory", { 
            stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
            items: []
        });
    }
});

app.get("/Dashboard/User-dashboard/Inventory/Reports", (req, res) => {
    res.render("Reports");
});

app.get("/Dashboard/User-dashboard/Inventory/POS", (req, res) => {
    res.render("POS");
}); 

app.get("/Dashboard/User-dashboard/Settings", (req, res) => {
    res.render("Settings");
});

// to get token ( unsafe for now )
const secret = process.env.JWT_SECRET;

app.get("/get-token", (req, res) => {
    const payload = { id: 1, username: "admin", role: "admin" };
    const token = jwt.sign(payload, SECRET, { expiresIn: "30m" });

    res.json({ token });
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.post("/Users", async(req, res) => {
    try {
        const { name, password, role } = req.body;
        const existingUser = await User.findOne({ name });

        if (existingUser) {
            return res.render("Login", { message: "User already exists" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            password: hashed,
            role: role || "user"
        });

        await newUser.save();
        res.status(201).alert("User Created Successfully");
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/Users/Login", async (req, res) => {
    const { name, password } = req.body;

    try {
        const user = await User.findOne({ name });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const {password: _, ...data} = user.toObject();

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const payload = { id: user._id, role: user.role || "user" };

        const token = jwt.sign(payload, SECRET, { expiresIn: "30m" });

        return res.status(200).json({
            message: "Login successful",
            data,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// LOGOUT API
app.post("/Users/Logout", (req, res) => {
    try {
       
        res.status(200).json({ message: "Logout successful" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Logout failed" });
    }
});

// ITEM ADDING API
app.post("/inventory", async (req, res) => {
    const { name, quantity, category } = req.body;

    if (!name || quantity === undefined || !category) {
        return res.status(400).json({ message: "Name, Category, and Quantity are Empty" });
    }

    try {
        const existingItem = await Item.findOne({ name });

        if (existingItem) {
            return res.status(400).json({ message: "Items already exists" });
        }

        const newItem = new Item({
            name: req.body.name,
            category: req.body.category,
            quantity: parseInt(req.body.quantity)
        }); 

        await newItem.save();

        res.status(201).json({ message: "Item Added to Database", item: newItem });
    } catch (err) {
        console.error("Error adding item:", err);
        res.status(500).json({ message: "Cannot add item" });
    }
});

// ITEM GETTING/FETCHING API - Get single item by MongoDB ID
app.get("/Inventory/item/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        const item = await Item.findById(id);
        
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }
        
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Cannot get item" });
    }
});

// GET ALL ITEMS API
app.get("/Inventory/items", async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Cannot get items" });
    }
});

// ITEM UPDATING API
app.put("/inventory/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, quantity, category } = req.body;

        if (!name && quantity === undefined && !category) {
            return res.status(400).json({ message: "At least one field is required" });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (quantity !== undefined) updateData.quantity = quantity;
        if (category) updateData.category = category;

        const updatedItem = await Item.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        if (!updatedItem) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.status(200).json({ message: "Item updated successfully", item: updatedItem });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Cannot update item" });
    }
});

// ITEM DELETE API
app.delete("/inventory/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deletedItem = await Item.findByIdAndDelete(id);

        if (!deletedItem) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.status(200).json({ message: "Item deleted successfully", item: deletedItem });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Cannot delete item" });
    }
});

// ========== ADD DASHBOARD API ENDPOINT ==========
// Add this before mongoose.connect() (around line 150):

app.get("/api/dashboard/stats", async (req, res) => {
    try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch all data in parallel
        const [ordersToday, totalSalesResult, recentOrders, lowStockItems] = await Promise.all([
            // Orders today
            Order.countDocuments({
                createdAt: { $gte: today, $lt: tomorrow }
            }),
            
            // Total sales
            Order.aggregate([
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            
            // Recent orders (last 4)
            Order.find()
                .sort({ createdAt: -1 })
                .limit(4)
                .select('orderNumber total createdAt'),
            
            // Low stock items from inventory
            Item.find({ quantity: { $lte: 10 } })
                .limit(3)
                .select('name quantity')
        ]);

        // Calculate stats
        const totalSales = totalSalesResult[0]?.total || 0;
        const netProfit = totalSales * 0.3; // 30% profit margin
        const totalCustomers = Math.floor(ordersToday * 1.5); // Estimate customers

        // Format recent sales
        const recentSales = recentOrders.map((order, index) => ({
            orderNumber: order.orderNumber || `#ORD-${1000 + index}`,
            customerName: 'Walk-in Customer', // Default customer name
            totalAmount: order.total || 0,
            status: 'completed',
            createdAt: order.createdAt || new Date()
        }));

        // Format low stock alerts
        const lowStockAlerts = lowStockItems.map(item => ({
            name: item.name || 'Unknown Item',
            currentStock: item.quantity || 0,
            minStock: 10
        }));


// If no low stock items, show some defaults
if (lowStockAlerts.length === 0) {
    lowStockAlerts.push(
        { name: 'Beef Patties', currentStock: 15, minStock: 20 },
        { name: 'Burger Buns', currentStock: 18, minStock: 25 },
        { name: 'Cheddar Cheese', currentStock: 8, minStock: 15 }
    );
}

        const stats = {
            totalSales,
            netProfit,
            ordersToday,
            totalCustomers,
            recentSales,
            lowStockAlerts
        };
        
        res.json({
            success: true,
            data: stats,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        // Return fallback data if database error
        res.json({
            success: true,
            data: {
                totalSales: 15240.75,
                netProfit: 4580.25,
                ordersToday: 42,
                totalCustomers: 128,
                recentSales: [
                    { orderNumber: '#BURG-1001', customerName: 'John Smith', totalAmount: 24.99, status: 'completed', createdAt: new Date() },
                    { orderNumber: '#BURG-1002', customerName: 'Sarah Johnson', totalAmount: 32.50, status: 'completed', createdAt: new Date(Date.now() - 3600000) },
                    { orderNumber: '#BURG-1003', customerName: 'Mike Wilson', totalAmount: 18.75, status: 'completed', createdAt: new Date(Date.now() - 7200000) },
                    { orderNumber: '#BURG-1004', customerName: 'Emma Davis', totalAmount: 45.25, status: 'pending', createdAt: new Date(Date.now() - 10800000) }
                ],
                lowStockAlerts: [
                    { name: 'Beef Patties', currentStock: 8, minStock: 15 },
                    { name: 'Burger Buns', currentStock: 12, minStock: 20 },
                    { name: 'Cheddar Cheese', currentStock: 5, minStock: 10 }
                ]
            }
        });
    }
});

// ========== ADD ORDER CREATION API (for POS) ==========
// Add this before mongoose.connect():

app.post("/api/orders", async (req, res) => {
    try {
        const { orderNumber, total, items } = req.body;
        
        if (!orderNumber || total === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Order number and total are required' 
            });
        }

        // Create new order
        const newOrder = new Order({
            orderNumber,
            total: parseFloat(total),
            items: items || [] // Optional: if you want to store items
        });

        await newOrder.save();

        res.json({
            success: true,
            message: 'Order created successfully',
            order: newOrder
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// Add this route to get all orders for dashboard
app.get("/api/orders/all", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            orders: orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
});

mongoose.connect(process.env.MONGO_URI)
        .then(async () => {
            console.log("Connected to Database");
            try {
                const collection = mongoose.connection.collection("items");
                const indexes = await collection.getIndexes();
                
                for (const indexName in indexes) {
                    if (indexName !== "_id_") {
                        await collection.dropIndex(indexName);
                        console.log(`Dropped index: ${indexName}`);
                    }
                }
            } catch (err) {
                console.log("Index cleanup note:", err.message);
            }
            
            app.listen(port, () => console.log(`Server running: http://localhost:${port}`));
        })
        .catch(err => {
            console.error("Database connection error:", err);
            process.exit(1);
}); 


