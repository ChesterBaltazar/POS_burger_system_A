import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import path from "path";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
dotenv.config();

import User from "./models/User.js";
import Item from "./models/Items.js";
import Order from "./models/orders.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4050;
const SECRET = process.env.JWT_SECRET || "my_super_secret_key";
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${port}`;

// Constants for consistent inventory management
const LOW_STOCK_THRESHOLD = 10;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Prevent caching for all routes
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

let dashboardClients = [];

// ==================== ROUTES ====================

// Auth & Main Routes
app.get("/", (req, res) => res.render("Login"));
app.get("/register", (req, res) => res.render("register"));

// Dashboard Routes
app.get("/Dashboard/User-dashboard", (req, res) => res.render("User-dashboard"));

app.get("/Dashboard/admin-dashboard", async (req, res) => {
  try {
    const statsResponse = await fetch(`${BASE_URL}/api/dashboard/stats`);
    const result = await statsResponse.json();

    res.render("Admin-dashboard", {
      stats: result.data,
      currentDate: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    });
  } catch (err) {
    console.error("Admin dashboard:", err.message || err);
    res.render("Admin-dashboard", {
      stats: {
        totalSales: 0,
        netProfit: 0,
        ordersToday: 0,
        totalCustomers: 0,
        recentSales: [],
        lowStockAlerts: []
      },
      currentDate: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    });
  }
});

// ==================== INVENTORY ROUTES ====================

// Helper function to calculate inventory statistics
function calculateInventoryStats(items) {
  let totalProducts = 0;
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  
  if (items && Array.isArray(items)) {
    totalProducts = items.length;
    
    items.forEach(item => {
      const quantity = parseInt(item.quantity) || 0;
      
      if (quantity === 0) {
        outOfStock++;
      } else if (quantity <= LOW_STOCK_THRESHOLD) {
        lowStock++;
      } else {
        inStock++;
      }
    });
  }
  
  return { totalProducts, inStock, lowStock, outOfStock };
}

// USER Inventory - This matches your HTML file
app.get("/Dashboard/User-dashboard/Inventory", async (req, res) => {
  try {
    const items = await Item.find({}).sort({ createdAt: -1 }).lean();
    
    // Calculate statistics using helper function
    const stats = calculateInventoryStats(items);
    
    console.log(`[USER INVENTORY DEBUG] Stats:`, stats);
    
    res.render("inventory", {  // Renders inventory.ejs (user view)
      items: items || [],
      stats: stats,
      isAdmin: false  // Flag to identify user view
    });
    
  } catch (err) {
    console.error("User Inventory page error:", err.message || err);
    res.render("inventory", {
      items: [],
      stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
      isAdmin: false
    });
  }
});

// ADMIN Inventory - Render admin-inventory.ejs with actions
app.get("/Dashboard/Admin-dashboard/Inventory", async (req, res) => {
  try {
    const items = await Item.find().lean();
    
    // Calculate statistics using helper function
    const stats = calculateInventoryStats(items);
    
    console.log(`[ADMIN INVENTORY DEBUG] Stats:`, stats);
    
    res.render("admin-inventory", {  // Renders admin-inventory.ejs
      items: items || [],
      stats: stats,
      isAdmin: true  // Flag to identify admin view
    });
    
  } catch (err) {
    console.error("Admin Inventory page error:", err.message || err);
    res.render("admin-inventory", {
      items: [],
      stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
      isAdmin: true
    });
  }
});

// User Inventory from POS - Different view
app.get("/Dashboard/User-dashboard/User-dashboard/Inventory/POS/user-Inventory", async (req, res) => {
  try {
    const items = await Item.find({}).sort({ createdAt: -1 }).lean();
    
    // Calculate statistics using helper function
    const stats = calculateInventoryStats(items);
    
    res.render("User-Inventory", {
      items: items || [],
      stats: stats
    });
    
  } catch (err) {
    console.error("User Inventory page error:", err.message || err);
    res.render("User-Inventory", {
      items: [],
      stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 }
    });
  }
});

// Other Routes
app.get("/Dashboard/Admin-dashboard/Inventory/Reports", (req, res) => res.render("Reports"));
app.get("/Dashboard/User-dashboard/Inventory/POS", (req, res) => res.render("POS"));
app.get("/Dashboard/Admin-dashboard/Settings", (req, res) => res.render("Settings"));

// ==================== USER AUTH ROUTES ====================

app.post("/Users", async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const existingUser = await User.findOne({ name });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, password: hashed, role: role || "user" });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("User creation error:", err.message || err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/Users/Login", async (req, res) => {
  const { name, password } = req.body;

  try {
    const user = await User.findOne({ name });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: "30m" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err.message || err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== ITEM CRUD ROUTES ====================

// Add new item
app.post("/inventory", async (req, res) => {
  try {
    const { name, quantity, category } = req.body;
    
    if (!name || quantity === undefined || !category) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    // Check if item already exists
    const exists = await Item.findOne({ name });
    if (exists) {
      return res.status(400).json({ 
        success: false,
        message: "Item already exists" 
      });
    }

    const newItem = new Item({ 
      name, 
      quantity: parseInt(quantity), 
      category 
    });
    
    await newItem.save();
    
    // Broadcast update to all connected dashboard clients
    if (dashboardClients.length > 0) {
      await broadcastDashboardUpdate();
    }
    
    res.status(201).json({ 
      success: true,
      message: "Item added successfully", 
      item: newItem 
    });
  } catch (err) {
    console.error("Add item error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Get all items
app.get("/Inventory/items", async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json({ 
      success: true,
      items 
    });
  } catch (error) {
    console.error("Get items error:", error.message || error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Get single item by ID
app.get("/inventory/item/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: "Item not found" 
      });
    }
    res.json({ 
      success: true,
      item 
    });
  } catch (error) {
    console.error("Get item by ID error:", error.message || error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Update item
app.put("/inventory/update/:id", async (req, res) => {
  try {
    const { name, quantity, category } = req.body;
    
    const updateData = { updatedAt: Date.now() };
    if (name) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (category) updateData.category = category;
    
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({ 
        success: false,
        message: "Item not found" 
      });
    }
    
    // Broadcast update to all connected dashboard clients
    if (dashboardClients.length > 0) {
      await broadcastDashboardUpdate();
    }
    
    res.json({ 
      success: true,
      message: "Item updated successfully", 
      item: updatedItem 
    });
  } catch (error) {
    console.error("Update item error:", error.message || error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Delete item
app.delete("/inventory/delete/:id", async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    
    if (!deletedItem) {
      return res.status(404).json({ 
        success: false,
        message: "Item not found" 
      });
    }
    
    // Broadcast update to all connected dashboard clients
    if (dashboardClients.length > 0) {
      await broadcastDashboardUpdate();
    }
    
    res.json({ 
      success: true,
      message: "Item deleted successfully" 
    });
  } catch (error) {
    console.error("Delete item error:", error.message || error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// ==================== DASHBOARD API ROUTES ====================

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      ordersTodayCount,
      totalSalesAgg,
      recentOrders,
      lowStockItems
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.find().sort({ createdAt: -1 }).limit(4),
      Item.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } }).limit(3)
    ]);

    const totalSales = totalSalesAgg[0]?.total || 0;
    const netProfit = totalSales * 0.3;
    const totalCustomers = Math.floor(ordersTodayCount * 1.5);

    const recentSales = recentOrders.map(o => ({
      orderNumber: o.orderNumber,
      customerName: "Walk‑in Customer",
      totalAmount: o.total,
      status: "completed",
      createdAt: o.createdAt
    }));

    const lowStockAlerts = lowStockItems.map(i => ({
      name: i.name,
      currentStock: i.quantity,
      minStock: LOW_STOCK_THRESHOLD
    }));

    res.json({
      success: true,
      data: { 
        totalSales, 
        netProfit, 
        ordersToday: ordersTodayCount, 
        totalCustomers, 
        recentSales, 
        lowStockAlerts 
      }
    });
  } catch (err) {
    console.error("Dashboard stats:", err.message || err);
    res.json({ 
      success: true, 
      data: { 
        totalSales: 0, 
        netProfit: 0, 
        ordersToday: 0, 
        totalCustomers: 0, 
        recentSales: [], 
        lowStockAlerts: [] 
      } 
    });
  }
});

app.get("/api/dashboard/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  dashboardClients.push(res);

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  req.on("close", () => {
    dashboardClients = dashboardClients.filter(client => client !== res);
  });
});

async function broadcastDashboardUpdate() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      ordersTodayCount,
      totalSalesAgg,
      recentOrders,
      lowStockItems
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.find().sort({ createdAt: -1 }).limit(4),
      Item.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } }).limit(3)
    ]);

    const totalSales = totalSalesAgg[0]?.total || 0;
    const netProfit = totalSales * 0.3;
    const totalCustomers = Math.floor(ordersTodayCount * 1.5);

    const recentSales = recentOrders.map(o => ({
      orderNumber: o.orderNumber,
      customerName: "Walk‑in Customer",
      totalAmount: o.total,
      status: "completed",
      createdAt: o.createdAt
    }));

    const lowStockAlerts = lowStockItems.map(i => ({
      name: i.name,
      currentStock: i.quantity,
      minStock: LOW_STOCK_THRESHOLD
    }));

    const data = {
      type: "update",
      stats: { 
        totalSales, 
        netProfit, 
        ordersToday: ordersTodayCount, 
        totalCustomers, 
        recentSales, 
        lowStockAlerts 
      }
    };

    dashboardClients.forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  } catch (err) {
    console.error("Broadcast error:", err.message || err);
  }
}

// ==================== ORDER ROUTES ====================

app.post("/api/orders", async (req, res) => {
  try {
    const { 
      orderNumber, 
      total, 
      items, 
      cashReceived, 
      change, 
      status = "completed" 
    } = req.body;
    
    const existingOrder = await Order.findOne({ orderNumber });
    if (existingOrder) {
      return res.status(409).json({ 
        success: false, 
        message: `Order number ${orderNumber} already exists. Please generate a new one.` 
      });
    }
    
    if (!orderNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Order number is required" 
      });
    }
    
    if (total === undefined || total === null) {
      return res.status(400).json({ 
        success: false, 
        message: "Total amount is required" 
      });
    }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        message: "Items must be an array" 
      });
    }
    
    if (cashReceived === undefined || cashReceived === null) {
      return res.status(400).json({ 
        success: false, 
        message: "Cash received is required" 
      });
    }
    
    if (change === undefined || change === null) {
      return res.status(400).json({ 
        success: false, 
        message: "Change amount is required" 
      });
    }
    
    const newOrder = new Order({
      orderNumber,
      total: parseFloat(total),
      items,
      cashReceived: parseFloat(cashReceived),
      change: parseFloat(change),
      status
    });

    await newOrder.save();

    await broadcastDashboardUpdate();

    res.status(201).json({ 
      success: true, 
      message: "Order created successfully", 
      order: newOrder 
    });
  } catch (err) {
    console.error("Order creation error:", err.message || err);
    
    if (err.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: "Order number already exists. Please try again." 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to create order: " + err.message 
    });
  }
});

app.get("/api/orders/all", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get('/api/orders/latest', async (req, res) => {
  try {
    const latestOrder = await Order.findOne().sort({ createdAt: -1 });
    
    if (latestOrder) {
      res.json({
        success: true,
        data: {
          latestOrderNumber: latestOrder.orderNumber
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          latestOrderNumber: null 
        }
      });
    }
  } catch (error) {
    console.error('Error fetching:', error.message || error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.delete('/api/orders/all', async (req, res) => {
  try {
    await Order.deleteMany({});
    res.json({
      success: true,
      message: 'All orders deleted'
    });
  } catch (error) {
    console.error('Error:', error.message || error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== DATABASE CONNECTION ====================

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not defined in .env file");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server running on ${BASE_URL}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err.message || err);
    process.exit(1);
  });