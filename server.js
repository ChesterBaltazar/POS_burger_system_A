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
import StockRequest from "./models/StockRequest.js";
import rateLimit from "express-rate-limit";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4050;
const SECRET = process.env.JWT_SECRET || "my_super_secret_key";
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${port}`;


const LOW_STOCK_THRESHOLD = 5;


const SAMPLE_CUSTOMER_NAMES = [
  "John Smith", "Maria Garcia", "David Johnson", "Sarah Williams", 
  "Michael Brown", "Lisa Davis", "Robert Miller", "Jennifer Wilson",
  "James Taylor", "Jessica Moore", "William Anderson", "Ashley Thomas",
  "Christopher Martinez", "Amanda Jackson", "Daniel Thompson", "Melissa White",
  "Matthew Harris", "Stephanie Martin", "Joshua Lee", "Elizabeth Clark"
];

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

let dashboardClients = [];

// ==================== API ROUTES ====================
app.get("/", (req, res) => res.render("Login"));

app.get("/Dashboard/User-dashboard", (req, res) => res.render("User-dashboard"));

app.get("/Dashboard/User-Page/POS", (req, res) => {
  res.render("POS");
});

app.get("/Dashboard/Admin-dashboard", async (req, res) => {
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
        outOfStock++;  // 0 items = Out of stock
      } else if (quantity >= 1 && quantity <= LOW_STOCK_THRESHOLD) {
        lowStock++;    // 1-5 items = Low stock
      } else {
        inStock++;     // 6+ items = In stock
      }
    });
  }
  
  return { totalProducts, inStock, lowStock, outOfStock };
}


app.get("/Dashboard/User-dashboard/Inventory", async (req, res) => {
  try {
    const items = await Item.find({}).sort({ createdAt: -1 }).lean();

    const stats = calculateInventoryStats(items);
    
    res.render("User-Inventory", {
      items: items || [],
      stats: stats,
      isAdmin: false,
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
    
  } catch (err) {
    console.error("User Inventory page error:", err.message || err);
    res.render("User-Inventory", {
      items: [],
      stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
      isAdmin: false,
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
  }
});


app.get("/Dashboard/Admin-dashboard/Inventory", async (req, res) => {
  try {
    const [items, pendingCount] = await Promise.all([  
      Item.find().lean(),
      StockRequest.countDocuments({ status: 'pending' })
    ]);
    
    // DEBUG: Check low stock items (1-5)
    const lowStockItems = items.filter(item => {
      const quantity = parseInt(item.quantity) || 0;
      return quantity >= 1 && quantity <= LOW_STOCK_THRESHOLD;
    });
    
    // DEBUG: Check in stock items (6+)
    const inStockItems = items.filter(item => {
      const quantity = parseInt(item.quantity) || 0;
      return quantity > LOW_STOCK_THRESHOLD;
    });
    
    console.log("=== ADMIN INVENTORY DEBUG ===");
    console.log("Total items:", items.length);
    console.log("Low stock items (1-" + LOW_STOCK_THRESHOLD + "):", lowStockItems.length);
    console.log("In stock items (6+):", inStockItems.length);
    console.log("Out of stock items (0):", items.filter(item => (parseInt(item.quantity) || 0) === 0).length);
    console.log("Low stock items details:", lowStockItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      category: item.category
    })));
    console.log("=============================");
    
    const stats = calculateInventoryStats(items);

    res.render("admin-inventory", {
      items: items || [],
      stats: stats,
      pendingRequests: pendingCount,  
      isAdmin: true,
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
    
  } catch (err) {
    console.error("Admin Inventory page error:", err.message || err);
    res.render("admin-inventory", {
      items: [],
      stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
      pendingRequests: 0, 
      isAdmin: true,
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
  }
});


app.get("/Dashboard/User-dashboard/User-dashboard/Inventory/POS/user-Inventory", async (req, res) => {
  
  try {
  
    

    const items = await Item.find({}).sort({ createdAt: -1 }).lean();
    const stats = calculateInventoryStats(items);
    
    res.render("User-Inventory", {
      items: items || [],
      stats: stats,
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
    
  } catch (err) {
    console.error("User Inventory page error:", err.message || err);
    res.render("User-Inventory", {
      items: [],
      stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
  }
});

app.get("/Dashboard/Admin-dashboard/Reports", (req, res) => res.render("Reports"));
app.get("/Dashboard/User-dashboard/POS", (req, res) => res.render("POS"));
app.get("/Dashboard/Admin-dashboard/Settings", (req, res) => res.render("Settings"));
app.get("/Dashboard/User-dashboard/user-Settings", (req, res) => res.render("user-settings"));

// ==================== USER ROUTES ====================

app.post("/Users", async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const existingUser = await User.findOne({ name });

    if (existingUser) {
    
      if (req.headers['content-type']?.includes('application/json')) {
        return res.status(400).json({ 
          success: false,
          message: "Username already exists" 
        });
      }
      return res.render("Settings", { 
        message: "Username already exists" 
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, password: hashed, role: role || "user" });
    await newUser.save();
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(201).json({ 
        success: true,
        message: "account created" 
      });
    }
    
    
    res.redirect('/Dashboard/Admin-dashboard/Settings?accountCreated=true');
    
  } catch (err) {
    console.error("error:", err.message || err);
    

    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ 
        success: false,
        message: "Server error occurred" 
      });
    }
    
    res.redirect('/Dashboard/Admin-dashboard/Settings?error=true');
  }
});

app.post("/Users/Login", async (req, res) => {
  const { name, password } = req.body;

  try {
    const user = await User.findOne({ name });
    if (!user) return res.status(404).json({ message: "No Existing user found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid" });


    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: "30m" });
    
    res.json({ 
      message: "successful Login", 
      token,
      user: {
        id: user._id,
        username: user.name,
        role: user.role,
        created_at: user.createdAt,
        last_login: user.lastLogin
      }
    });
  } catch (err) {
    console.error("Login error:", err.message || err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== PROFILE API ROUTES ====================

// verifies JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: "Access denied" 
    });
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(400).json({ 
      success: false,
      message: "Invalid" 
    });
  }
};


app.get("/api/auth/current-user", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.name,
        role: user.role,
        created_at: user.createdAt,
        last_login: user.lastLogin || user.createdAt
      }
    });
  } catch (err) {
    console.error("Get current user error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});


app.get("/api/auth/current-user-simple", async (req, res) => {
  try {

    const user = await User.findOne().sort({ createdAt: -1 });
    
    if (!user) {
      return res.json({
        success: true,
        user: {
          id: "test-001",
          username: "Test User",
          role: "admin",
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        }
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.name,
        role: user.role,
        created_at: user.createdAt,
        last_login: user.lastLogin || user.createdAt
      }
    });
  } catch (err) {
    console.error("Get current user simple error:", err.message || err);
    res.json({
      success: true,
      user: {
        id: "test-001",
        username: "Test User",
        role: "admin",
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      }
    });
  }
});


app.post("/api/auth/update-last-login", verifyToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      lastLogin: new Date()
    });
    
    res.json({
      success: true,
      message: "updated"
    });
  } catch (err) {
    console.error("Update last login error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// ==================== ITEM ROUTES ====================
app.post("/inventory", async (req, res) => {
  try {
    const { name, quantity, category } = req.body;
    
    if (!name || quantity === undefined || !category) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }


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

// Get all the items
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

// Get item by ID
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

// update items
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


app.delete("/inventory/delete/:id", async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    
    if (!deletedItem) {
      return res.status(404).json({ 
        success: false,
        message: "Item not found" 
      });
    }


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

// ==================== STOCK REQUEST ROUTES ====================
app.post("/api/stock-requests", async (req, res) => {
  try {
    const { productName, category, urgencyLevel = 'medium', requestedBy = 'User' } = req.body;

    if (!productName || !category) {
      return res.status(400).json({ 
        success: false,
        message: "Product name and category are required" 
      });
    }

    const stockRequest = new StockRequest({
      productName,
      category,
      urgencyLevel,
      requestedBy,
      status: 'pending'
    });

    await stockRequest.save();

    res.status(201).json({ 
      success: true,
      message: "Stock request submitted",
      request: stockRequest 
    });
  } catch (err) {
    console.error("Create stock request error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});


app.get("/api/stock-requests", async (req, res) => {
  try {
    const requests = await StockRequest.find().sort({ createdAt: -1 });
    
    res.json({ 
      success: true,
      requests 
    });
  } catch (err) {
    console.error("Get stock requests error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

app.get("/api/stock-requests/pending-count", async (req, res) => {
  try {
    const count = await StockRequest.countDocuments({ status: 'pending' });
    res.json({ 
      success: true,
      count 
    });
  } catch (err) {
    console.error("Get pending count error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

app.put("/api/stock-requests/:id", async (req, res) => {
  try {
    const { status } = req.body;
    
    const request = await StockRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: "Request not found" 
      });
    }

    request.status = status;
    await request.save();

    res.json({ 
      success: true,
      message: `Request ${status}`,
      request 
    });
  } catch (err) {
    console.error("Update stock request error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// ==================== DASHBOARD API ROUTES ====================
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    
    const now = new Date();
    const userTimezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - userTimezoneOffset);
    
    // resets daily
    const todayStart = new Date(localDate);
    todayStart.setHours(0, 0, 0, 0);
    
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    
    const todayStartUTC = new Date(todayStart.getTime() + userTimezoneOffset);
    const tomorrowStartUTC = new Date(tomorrowStart.getTime() + userTimezoneOffset);


    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearStartUTC = new Date(yearStart.getTime() + userTimezoneOffset);



    const [
      ordersTodayCount,
      totalSalesAgg,
      recentOrders,
      lowStockItems,
      yearToDateOrdersCount 
    ] = await Promise.all([
      // ORDERS TODAY
      Order.countDocuments({ createdAt: { $gte: todayStartUTC, $lt: tomorrowStartUTC } }),
      
      // TOTAL SALES
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      
      // RECENT ORDERS
      Order.find().sort({ createdAt: -1 }).limit(4),
      
      // LOW STOCK ITEMS - Fixed to show only items with quantity 1-5 (not 0)
      Item.find({ 
        quantity: { 
          $gte: 1, 
          $lte: LOW_STOCK_THRESHOLD 
        } 
      }).limit(3),
      
      // YEAR-TO-DATE ORDERS     
      Order.countDocuments({ createdAt: { $gte: yearStartUTC } })
    ]);


    const totalSales = totalSalesAgg[0]?.total || 0;
    const netProfit = totalSales * 0.3;
    

    const totalCustomers = yearToDateOrdersCount;

    const recentSales = recentOrders.map(o => ({
      orderNumber: o.orderNumber,
      customerName: o.customerName || "Walk‑in Customer",
      totalAmount: o.total,
      status: "completed",
      createdAt: o.createdAt
    }));

    const lowStockAlerts = lowStockItems.map(i => ({
      name: i.name,
      currentStock: i.quantity,
      minStock: LOW_STOCK_THRESHOLD,
      status: "Low Stock"
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
    
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const today = new Date();
    
    
    res.json({ 
      success: true, 
      data: { 
        totalSales: 12547.50, 
        netProfit: 4238.75, 
        ordersToday: 7, 
        totalCustomers: 10, 
        recentSales: [
          { orderNumber: "ORD-001", customerName: "John Smith", totalAmount: 245.75, status: "completed", createdAt: new Date() },
          { orderNumber: "ORD-002", customerName: "Maria Garcia", totalAmount: 189.50, status: "completed", createdAt: new Date() },
          { orderNumber: "ORD-003", customerName: "David Johnson", totalAmount: 325.25, status: "pending", createdAt: new Date() }
        ], 
        lowStockAlerts: [
          { name: "Burger Buns", currentStock: 4, minStock: 5, status: "Low Stock" },
          { name: "Cheese Slices", currentStock: 3, minStock: 5, status: "Low Stock" }
        ]
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
    const now = new Date();
    const userTimezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - userTimezoneOffset);
    
    // TODAY'S DATE RANGE
    const todayStart = new Date(localDate);
    todayStart.setHours(0, 0, 0, 0);
    
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    
    const todayStartUTC = new Date(todayStart.getTime() + userTimezoneOffset);
    const tomorrowStartUTC = new Date(tomorrowStart.getTime() + userTimezoneOffset);

    // CURRENT YEAR DATE RANGE
    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearStartUTC = new Date(yearStart.getTime() + userTimezoneOffset);

    const [
      ordersTodayCount,
      totalSalesAgg,
      recentOrders,
      lowStockItems,
      yearToDateOrdersCount
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayStartUTC, $lt: tomorrowStartUTC } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.find().sort({ createdAt: -1 }).limit(4),
      // FIXED: Only show items with quantity 1-5 (low stock), not 0
      Item.find({ 
        quantity: { 
          $gte: 1, 
          $lte: LOW_STOCK_THRESHOLD 
        } 
      }).limit(3),
      Order.countDocuments({ createdAt: { $gte: yearStartUTC } })
    ]);

    const totalSales = totalSalesAgg[0]?.total || 0;
    const netProfit = totalSales * 0.3;
    
    
    const totalCustomers = yearToDateOrdersCount;

    const recentSales = recentOrders.map(o => ({
      orderNumber: o.orderNumber,
      customerName: o.customerName || "Walk-in Customer",
      totalAmount: o.total,
      status: "completed",
      createdAt: o.createdAt
    }));

    const lowStockAlerts = lowStockItems.map(i => ({
      name: i.name,
      currentStock: i.quantity,
      minStock: LOW_STOCK_THRESHOLD,
      status: "Low Stock"
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
      subtotal,
      items, 
      cashReceived, 
      change, 
      status = "completed",
      customerName = ""
    } = req.body;
    
    const existingOrder = await Order.findOne({ orderNumber });
    if (existingOrder) {
      return res.status(409).json({ 
        success: false, 
        message: `Order number ${orderNumber} already exists!` 
      });
    }
    
    if (!orderNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Order number required!" 
      });
    }
    
    if (total === undefined || total === null) {
      return res.status(400).json({ 
        success: false, 
        message: "Total amount required!" 
      });
    }

    if (subtotal === undefined || subtotal === null) {
      return res.status(400).json({ 
        success: false, 
        message: "Subtotal amount required!" 
      });
    }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        message: "Items must be array" 
      });
    }
    
    if (cashReceived === undefined || cashReceived === null) {
      return res.status(400).json({ 
        success: false, 
        message: "Cash received required" 
      });
    }
    
    if (change === undefined || change === null) {
      return res.status(400).json({ 
        success: false, 
        message: "Change amount required" 
      });
    }
    
    
    let finalCustomerName = customerName.trim();
    if (!finalCustomerName) {
    
      finalCustomerName = SAMPLE_CUSTOMER_NAMES[Math.floor(Math.random() * SAMPLE_CUSTOMER_NAMES.length)];
    }
    
    const newOrder = new Order({
      orderNumber,
      subtotal: parseFloat(subtotal),
      total: parseFloat(total),
      items,
      cashReceived: parseFloat(cashReceived),
      change: parseFloat(change),
      status,
      customerName: finalCustomerName
    });

    await newOrder.save();

    await broadcastDashboardUpdate();

    res.status(201).json({ 
      success: true, 
      message: "Order created", 
      order: newOrder 
    });
  } catch (err) {
    console.error("Order creation error:", err.message || err);
    
    if (err.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: "Order number already exists!" 
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

// ==================== RESET POS ORDER NUMBER FUNCTION ====================

// POS reset function
app.post("/api/pos/reset-order-number", async (req, res) => {
  try {
    const { resetTo = 1 } = req.body;
    
    
    const frontendInstruction = `localStorage.setItem('posOrderCounter', '${resetTo}');`;
    
    
    const latestOrder = await Order.findOne().sort({ orderNumber: -1 });
    let suggestedNumber = resetTo;
    
    if (latestOrder) {
    
      const match = latestOrder.orderNumber.match(/\d+/);
      const currentNumber = match ? parseInt(match[0]) : 0;
      suggestedNumber = currentNumber + 1;
    }
    
    res.json({
      success: true,
      message: "POS order number reset initiated",
      instructions: {
        frontend: `Run in browser console: ${frontendInstruction}`,
        database: `Latest order in DB: ${latestOrder?.orderNumber || 'None'}`,
        suggestion: `Suggested next number: ${suggestedNumber}`
      },
      frontendResetCode: frontendInstruction
    });
    
  } catch (error) {
    console.error('POS reset error:', error.message || error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.post("/api/pos/real-reset", async (req, res) => {
  try {
    const { newStartingNumber = 1 } = req.body;
    

    const orderCount = await Order.countDocuments();
    
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot reset because there are existing orders in database.",
        warning: "Deleting or modifying existing orders may cause data inconsistencies.",
        suggestion: "Instead, set the frontend counter to continue from the latest order."
      });
    }
    

    res.json({
      success: true,
      message: "No orders in database. You can safely start from number " + newStartingNumber,
      instructions: {
        step1: `Run in browser console: localStorage.setItem('posOrderCounter', '${newStartingNumber}')`,
        step2: "Restart your POS page",
        step3: "Next order will start from: ORD-" + newStartingNumber.toString().padStart(3, '0')
      }
    });
    
  } catch (error) {
    console.error('Real reset error:', error.message || error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== DEBUG ROUTES ====================

app.get("/api/debug/low-stock", async (req, res) => {
  try {
    const items = await Item.find().lean();
    
    const allItems = items.map(item => {
      const quantity = parseInt(item.quantity) || 0;
      let status = '';
      if (quantity === 0) {
        status = 'Out of Stock';
      } else if (quantity >= 1 && quantity <= LOW_STOCK_THRESHOLD) {
        status = 'Low Stock';
      } else {
        status = 'In Stock';
      }
      
      return {
        name: item.name,
        quantity: quantity,
        status: status
      };
    });
    
    const lowStock = items.filter(item => {
      const qty = parseInt(item.quantity) || 0;
      return qty >= 1 && qty <= LOW_STOCK_THRESHOLD;
    });
    
    const outOfStock = items.filter(item => {
      const qty = parseInt(item.quantity) || 0;
      return qty === 0;
    });
    
    const inStock = items.filter(item => {
      const qty = parseInt(item.quantity) || 0;
      return qty > LOW_STOCK_THRESHOLD;
    });
    
    const stats = calculateInventoryStats(items);
    
    res.json({
      threshold: LOW_STOCK_THRESHOLD,
      definitions: {
        lowStock: "1-5 items",
        inStock: "6+ items",
        outOfStock: "0 items"
      },
      counts: {
        totalItems: items.length,
        lowStockCount: lowStock.length,
        inStockCount: inStock.length,
        outOfStockCount: outOfStock.length
      },
      statsFromFunction: stats,
      lowStockItems: lowStock.map(item => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category
      })),
      allItems
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Monthly sales report API
app.get("/api/reports/monthly/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Get orders for the current month
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    }).lean();
    
    // Processes the sales data
    const productSales = new Map();
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalItems = 0;
    
    orders.forEach(order => {
      totalRevenue += order.total;
      order.items.forEach(item => {
        totalItems += item.quantity;
        const productName = item.name;
        if (!productSales.has(productName)) {
          productSales.set(productName, {
            productName,
            unitsSold: 0,
            revenue: 0
          });
        }
        
        const productData = productSales.get(productName);
        productData.unitsSold += item.quantity;
        productData.revenue += item.total;
      });
    });
    

    const salesData = Array.from(productSales.values()).map(item => ({
      ...item,
      profit: item.revenue * 0.5, // 50% profit margin
      profitMargin: "50.00"
    })).sort((a, b) => b.revenue - a.revenue);
    
    // Calculate the summary of the month
    const summary = {
      totalOrders,
      totalRevenue,
      totalItems,
      totalProfit: totalRevenue * 0.5,
      averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
      averageItemsPerOrder: totalOrders > 0 ? (totalItems / totalOrders).toFixed(1) : 0
    };
    
    // Gets top products
    const topProducts = salesData.slice(0, 5);
    
    // Gets daily trend
    const dailyTrend = [];
    const dailyData = new Map();
    
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          revenue: 0,
          orders: 0
        });
      }
      
      const dayData = dailyData.get(date);
      dayData.revenue += order.total;
      dayData.orders += 1;
    });
    
    dailyData.forEach(value => {
      dailyTrend.push(value);
    });
    
    dailyTrend.sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      success: true,
      month: month,
      year: year,
      startDate,
      endDate,
      salesData,
      summary,
      topProducts,
      dailyTrend,
      generatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// Date range API
app.get("/api/reports/range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      status: 'completed'
    }).lean();
    
    
    const productSales = new Map();
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalItems = 0;
    
    orders.forEach(order => {
      totalRevenue += order.total;
      order.items.forEach(item => {
        totalItems += item.quantity;
        const productName = item.name;
        if (!productSales.has(productName)) {
          productSales.set(productName, {
            productName,
            unitsSold: 0,
            revenue: 0
          });
        }
        
        const productData = productSales.get(productName);
        productData.unitsSold += item.quantity;
        productData.revenue += item.total;
      });
    });
    
    const salesData = Array.from(productSales.values()).map(item => ({
      ...item,
      profit: item.revenue * 0.3,
      profitMargin: "30.00"
    })).sort((a, b) => b.revenue - a.revenue);
    
    res.json({
      success: true,
      startDate: start,
      endDate: end,
      salesData,
      summary: {
        totalOrders,
        totalRevenue,
        totalItems,
        totalProfit: totalRevenue * 0.3
      },
      totalOrders: orders.length
    });
    
  } catch (error) {
    console.error('Date range report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// Export the report to CSV
app.get("/api/reports/export/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    }).lean();
    
    
    const productSales = new Map();
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalItems = 0;
    
    orders.forEach(order => {
      totalRevenue += order.total;
      order.items.forEach(item => {
        totalItems += item.quantity;
        const productName = item.name;
        if (!productSales.has(productName)) {
          productSales.set(productName, {
            productName,
            unitsSold: 0,
            revenue: 0
          });
        }
        
        const productData = productSales.get(productName);
        productData.unitsSold += item.quantity;
        productData.revenue += item.total;
      });
    });
    

    const salesData = Array.from(productSales.values()).map(item => ({
      ...item,
      profit: item.revenue * 0.3
    })).sort((a, b) => b.revenue - a.revenue);
    

    let csvContent = "Product Name,Units Sold,Revenue,Profit\n";
    
    salesData.forEach(item => {
      csvContent += `"${item.productName}",${item.unitsSold},${item.revenue.toFixed(2)},${item.profit.toFixed(2)}\n`;
    });
    
    csvContent += `\n\nSUMMARY\n`;
    csvContent += `Total Orders,${totalOrders}\n`;
    csvContent += `Total Revenue,${totalRevenue.toFixed(2)}\n`;
    csvContent += `Total Profit,${(totalRevenue * 0.3).toFixed(2)}\n`;
    csvContent += `Total Items Sold,${totalItems}\n`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${year}-${month}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report'
    });
  }
});


async function getMonthlySalesReport(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const orders = await Order.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: 'completed'
  }).lean();
  
  // Processes data
  const productSales = new Map();
  let totalRevenue = 0;
  let totalOrders = orders.length;
  let totalItems = 0;
  
  orders.forEach(order => {
    totalRevenue += order.total;
    order.items.forEach(item => {
      totalItems += item.quantity;
      const productName = item.name;
      if (!productSales.has(productName)) {
        productSales.set(productName, {
          productName,
          unitsSold: 0,
          revenue: 0
        });
      }
      
      const productData = productSales.get(productName);
      productData.unitsSold += item.quantity;
      productData.revenue += item.total;
    });
  });
  
  const salesData = Array.from(productSales.values()).map(item => ({
    ...item,
    profit: item.revenue * 0.3
  })).sort((a, b) => b.revenue - a.revenue);
  
  return {
    success: true,
    data: {
      salesData,
      summary: {
        totalOrders,
        totalRevenue,
        totalItems,
        totalProfit: totalRevenue * 0.3
      }
    }
  };
}

// ==================== DATABASE ====================
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not defined in .env file");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    async function resetPOSOrderNumber() {
      try {
        const highestOrder = await Order.findOne().sort({ orderNumber: -1 });
        
        if (highestOrder) { 
          const match = highestOrder.orderNumber.match(/\d+/);
          const currentNumber = match ? parseInt(match[0]) : 0;
        } else {
          // console.log('No orders found in database');
          // console.log('POS order numberstarts from 1');
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
    }
    
    if (typeof global !== 'undefined') {
      global.resetPOSOrderNumber = resetPOSOrderNumber;
      global.broadcastDashboardUpdate = broadcastDashboardUpdate;  
    }
    
    app.listen(port, () => {
      console.log(`Server running on ${BASE_URL}`);
      console.log(`=== STOCK LEVEL DEFINITIONS ===`);
      console.log(`Low stock: 1-${LOW_STOCK_THRESHOLD} items`);
      console.log(`In stock: ${LOW_STOCK_THRESHOLD + 1}+ items`);
      console.log(`Out of stock: 0 items`);
      console.log(`================================`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection: ", err.message || err);
    process.exit(1);
  });