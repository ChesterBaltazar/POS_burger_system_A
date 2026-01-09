import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import path from "path";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

import User from "./models/User.js";
import Item from "../POS_burger_system_A/models/Items.js";
import Order from "./models/orders.js";

const app = express();
const port = process.env.PORT || 4050;
const SECRET = process.env.JWT_SECRET || "my_super_secret_key";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EJS Templates
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// SSE clients storage
let dashboardClients = [];

// ---------- PAGES ----------
app.get("/", (req, res) => res.render("Login"));
app.get("/register", (req, res) => res.render("register"));

// DASHBOARD PAGES
app.get("/Dashboard/User-dashboard", (req, res) => res.render("User-dashboard"));

app.get("/Dashboard/admin-dashboard", async (req, res) => {
  try {
    const statsResponse = await fetch(`http://localhost:${port}/api/dashboard/stats`);
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
    console.error("Admin dashboard:", err);
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

// Inventory / Reports
app.get("/Dashboard/Admin-dashboard/Inventory", async (req, res) => {
  try {
    const totalProducts = await Item.countDocuments();
    const inStock = await Item.countDocuments({ quantity: { $gt: 0 } });
    const lowStock = await Item.countDocuments({ quantity: { $gt: 0, $lte: 5 } });
    const outOfStock = await Item.countDocuments({ quantity: 0 });
    const items = await Item.find();

    res.render("Inventory", {
      stats: { totalProducts, inStock, lowStock, outOfStock },
      items
    });
  } catch (err) {
    console.error("Inventory page:", err);
    res.render("Inventory", {
      stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
      items: []
    });
  }
});

app.get("/Dashboard/User-dashboard/Inventory/Reports", (req, res) => res.render("Reports"));
app.get("/Dashboard/User-dashboard/Inventory/POS", (req, res) => res.render("POS"));
app.get("/Dashboard/User-dashboard/Settings", (req, res) => res.render("Settings"));

// ---------- AUTH APIs ----------
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
    console.error("User creation error:", err);
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
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- INVENTORY APIs ----------
app.post("/inventory", async (req, res) => {
  try {
    const { name, quantity, category } = req.body;
    if (!name || quantity === undefined || !category) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await Item.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "Item already exists" });
    }

    const newItem = new Item({ name, quantity, category });
    await newItem.save();
    res.status(201).json({ message: "Item added", item: newItem });
  } catch (err) {
    console.error("Add item:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/Inventory/items", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- DASHBOARD STATS API ----------
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
      Item.find({ quantity: { $lte: 10 } }).limit(3)
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
      minStock: 10
    }));

    res.json({
      success: true,
      data: { totalSales, netProfit, ordersToday: ordersTodayCount, totalCustomers, recentSales, lowStockAlerts }
    });
  } catch (err) {
    console.error("Dashboard stats:", err);
    res.json({ success: true, data: { totalSales: 0, netProfit: 0, ordersToday: 0, totalCustomers: 0, recentSales: [], lowStockAlerts: [] } });
  }
});

// ---------- SSE ENDPOINT FOR REAL-TIME UPDATES ----------
app.get("/api/dashboard/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  // Add client to the list
  dashboardClients.push(res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  
  // Remove client on disconnect
  req.on("close", () => {
    dashboardClients = dashboardClients.filter(client => client !== res);
  });
});

// Helper function to broadcast updates to all dashboard clients
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
      Item.find({ quantity: { $lte: 10 } }).limit(3)
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
      minStock: 10
    }));

    const data = {
      type: "update",
      stats: { totalSales, netProfit, ordersToday: ordersTodayCount, totalCustomers, recentSales, lowStockAlerts }
    };

    // Send to all connected clients
    dashboardClients.forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  } catch (err) {
    console.error("Broadcast error:", err);
  }
}

app.post("/api/orders", async (req, res) => {
  try {
    console.log("📦 Received order data:", req.body);
    
    const { 
      orderNumber, 
      total, 
      items, 
      cashReceived, 
      change, 
      status = "completed" 
    } = req.body;
    
    // Check if order number already exists
    const existingOrder = await Order.findOne({ orderNumber });
    if (existingOrder) {
      return res.status(409).json({ 
        success: false, 
        message: `Order number ${orderNumber} already exists. Please generate a new one.` 
      });
    }
    
    // Validate all required fields
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
    console.log("✅ Order saved:", newOrder);

    // Broadcast update to all dashboard clients
    await broadcastDashboardUpdate();

    res.status(201).json({ 
      success: true, 
      message: "Order created successfully", 
      order: newOrder 
    });
  } catch (err) {
    console.error("❌ Order creation error:", err);
    
    if (err.code === 11000) {
      // Duplicate key error - order number already exists
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

// ---------- GET ALL ORDERS API ----------
app.get("/api/orders/all", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- GET LATEST ORDER NUMBER API ----------
app.get('/api/orders/latest', async (req, res) => {
    try {
        // Get the latest order from MongoDB
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
                    latestOrderNumber: null // No orders yet
                }
            });
        }
    } catch (error) {
        console.error('Error fetching latest order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ---------- DELETE ALL ORDERS API (for testing/reset) ----------
app.delete('/api/orders/all', async (req, res) => {
    try {
        await Order.deleteMany({});
        console.log('✅ All orders deleted from database');
        res.json({
            success: true,
            message: 'All orders deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting orders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ---------- CONNECT & START SERVER ----------
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("🗄️ Connected to MongoDB");
    app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
  })
  .catch(err => {
    console.error("❌ DB connection error:", err);
  });