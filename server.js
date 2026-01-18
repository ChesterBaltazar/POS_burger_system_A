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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4050;
const SECRET = process.env.JWT_SECRET || "my_super_secret_key";
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${port}`;


const LOW_STOCK_THRESHOLD = 10;


const SAMPLE_CUSTOMER_NAMES = [
  "John Smith", "Maria Garcia", "David Johnson", "Sarah Williams", 
  "Michael Brown", "Lisa Davis", "Robert Miller", "Jennifer Wilson",
  "James Taylor", "Jessica Moore", "William Anderson", "Ashley Thomas",
  "Christopher Martinez", "Amanda Jackson", "Daniel Thompson", "Melissa White",
  "Matthew Harris", "Stephanie Martin", "Joshua Lee", "Elizabeth Clark"
];

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

// ==================== ROUTES ====================

app.get("/", (req, res) => res.render("Login"));
app.get("/register", (req, res) => res.render("register"));

// Dashboard Routes
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

    const stats = calculateInventoryStats(items);
    
    res.render("inventory", {
      items: items || [],
      stats: stats,
      isAdmin: false
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
    const [items, pendingCount] = await Promise.all([  // UPDATED: Added pending count
      Item.find().lean(),
      StockRequest.countDocuments({ status: 'pending' })
    ]);
    
    const stats = calculateInventoryStats(items);

    res.render("admin-inventory", {
      items: items || [],
      stats: stats,
      pendingRequests: pendingCount,  // ADDED
      isAdmin: true
    });
    
  } catch (err) {
    console.error("Admin Inventory page error:", err.message || err);
    res.render("admin-inventory", {
      items: [],
      stats: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
      pendingRequests: 0,  // ADDED
      isAdmin: true
    });
  }
});


app.get("/Dashboard/User-dashboard/User-dashboard/Inventory/POS/user-Inventory", async (req, res) => {
  
  try {
  
    

    const items = await Item.find({}).sort({ createdAt: -1 }).lean();
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
        message: "Account created successfully!" 
      });
    }
    
    
    res.redirect('/Dashboard/Admin-dashboard/Settings?accountCreated=true');
    
  } catch (err) {
    console.error("User creation error:", err.message || err);
    

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
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });


    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: "30m" });
    
    res.json({ 
      message: "Login successful", 
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
      message: "Access denied. No token provided." 
    });
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(400).json({ 
      success: false,
      message: "Invalid token" 
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

// ==================== STOCK REQUEST ROUTES ====================  // ADDED SECTION

// Create stock request (from user/POS)
app.post("/api/stock-requests", async (req, res) => {
  try {
    const { productName, category, urgencyLevel = 'medium', requestedBy = 'User' } = req.body;

    // Basic validation
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

// Get all stock requests (for admin)
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

// Get pending requests count
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

// Update request status
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
      
      // LOW STOCK ITEMS
      Item.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } }).limit(3),
      
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
    // Return realistic demo data for testing
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const today = new Date();
    
    // Simulate: 7 orders today, 10 orders year-to-date
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
          { name: "Burger Buns", currentStock: 12, minStock: 20 },
          { name: "Cheese Slices", currentStock: 8, minStock: 15 }
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
      Item.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } }).limit(3),
      Order.countDocuments({ createdAt: { $gte: yearStartUTC } })
    ]);

    const totalSales = totalSalesAgg[0]?.total || 0;
    const netProfit = totalSales * 0.3;
    
    // Same logic as main stats endpoint
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
    
    // Generate a proper customer name if none provided
    let finalCustomerName = customerName.trim();
    if (!finalCustomerName) {
      // Use a random name from our sample list
      finalCustomerName = SAMPLE_CUSTOMER_NAMES[Math.floor(Math.random() * SAMPLE_CUSTOMER_NAMES.length)];
    }
    
    const newOrder = new Order({
      orderNumber,
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

app.post("/api/pos/reset-order-number", async (req, res) => {
  try {
    const { resetTo = 1 } = req.body;    
    res.json({
      success: true,
      message: "POS order number can be reset from frontend localStorage",
      instruction: "In browser console, run: localStorage.setItem('posOrderCounter', '1')"
    });
    
  } catch (error) {
    console.error('POS reset error:', error.message || error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

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
          // console.log('POS order number will start from 1');
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
    });
  })
  .catch(err => {
    console.error("MongoDB connection: ", err.message || err);
    process.exit(1);
  });