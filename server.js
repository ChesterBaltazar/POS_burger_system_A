import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import path from "path";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import cookieParser from "cookie-parser";
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

const LOW_STOCK_THRESHOLD = 5;
const RUNNING_LOW_THRESHOLD = 10;

const SAMPLE_CUSTOMER_NAMES = [
  "John Smith", "Maria Garcia", "David Johnson", "Sarah Williams", 
  "Michael Brown", "Lisa Davis", "Robert Miller", "Jennifer Wilson",
  "James Taylor", "Jessica Moore", "William Anderson", "Ashley Thomas",
  "Christopher Martinez", "Amanda Jackson", "Daniel Thompson", "Melissa White",
  "Matthew Harris", "Stephanie Martin", "Joshua Lee", "Elizabeth Clark"
];

// ==================== MIDDLEWARE ====================
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ==================== ROUTES ====================

// Login Page
app.get("/", (req, res) => {
  res.clearCookie('authToken');
  res.render("Login");
});

// Dashboard Routes
app.get("/Dashboard/User-dashboard", (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    jwt.verify(token, SECRET);
    res.render("User-dashboard");
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/Dashboard/User-Page/POS", (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    jwt.verify(token, SECRET);
    res.render("POS");
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/Dashboard/Admin-dashboard", async (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    
    const user = await User.findById(verified.id);
    if (!user || user.role !== 'admin') {
      return res.redirect("/Dashboard/User-dashboard");
    }
    
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const currentYear = now.getFullYear();
      const yearStart = new Date(currentYear, 0, 1);

      const [
        ordersTodayCount,
        totalSalesAgg,
        recentOrders,
        lowStockItems,
        uniqueCustomersYearToDate
      ] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
        Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
        Order.find().sort({ createdAt: -1 }).limit(4),
        Item.find({ 
          $or: [
            { quantity: { $lte: LOW_STOCK_THRESHOLD } },
            { quantity: { $lt: RUNNING_LOW_THRESHOLD, $gt: LOW_STOCK_THRESHOLD } }
          ]
        }).sort({ quantity: 1 }).limit(5),
        Order.distinct("customerName", { createdAt: { $gte: yearStart } })
      ]);

      const totalSales = totalSalesAgg[0]?.total || 0;
      const netProfit = totalSales * 0.3;
      const ordersToday = ordersTodayCount;
      const totalCustomers = uniqueCustomersYearToDate?.length || 0;

      const recentSales = recentOrders.map(o => ({
        orderNumber: o.orderNumber,
        customerName: o.customerName || "Walk‑in Customer",
        totalAmount: o.total,
        status: "completed",
        createdAt: o.createdAt
      }));

      const lowStockAlerts = lowStockItems.map(i => ({
        _id: i._id,
        name: i.name,
        productName: i.name,
        currentStock: i.quantity,
        status: i.quantity <= 0 ? "Out of Stock" : 
                i.quantity <= LOW_STOCK_THRESHOLD ? "Low Stock" : 
                "Running Low"
      }));

      const stats = { 
        totalSales, 
        netProfit, 
        ordersToday,
        totalCustomers,
        recentSales, 
        lowStockAlerts 
      };

      res.render("Admin-dashboard", {
        stats: stats,
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
  } catch (err) {
    res.redirect("/");
  }
});

// ==================== INVENTORY ROUTES ====================

function calculateInventoryStats(items) {
  let totalProducts = 0; 
  let inStock = 0;       
  let lowStock = 0;      
  let outOfStock = 0;    
  
  if (items && Array.isArray(items)) {
    items.forEach(item => {
      const quantity = parseInt(item.quantity) || 0;
      
      if (quantity === 0) {
        outOfStock++;
      } else if (quantity >= 1 && quantity <= LOW_STOCK_THRESHOLD) {
        lowStock++;
        totalProducts++; 
      } else {
        inStock++;
        totalProducts++; 
      }
    });
  }
  
  return { totalProducts, inStock, lowStock, outOfStock };
}


app.get("/Dashboard/User-dashboard/Inventory", async (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    jwt.verify(token, SECRET);
    
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
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/Dashboard/Admin-dashboard/Inventory", async (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    
    const user = await User.findById(verified.id);
    if (!user || user.role !== 'admin') {
      return res.redirect("/Dashboard/User-dashboard/Inventory");
    }
    
    try {
      const [items, pendingCount] = await Promise.all([  
        Item.find().lean(),
        StockRequest.countDocuments({ status: 'pending' })
      ]);
      
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
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/Dashboard/User-dashboard/User-dashboard/Inventory/POS/user-Inventory", async (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    jwt.verify(token, SECRET);
    
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
  } catch (err) {
    res.redirect("/");
  }
});

// Other dashboard routes
app.get("/Dashboard/Admin-dashboard/Reports", (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    User.findById(verified.id).then(user => {
      if (!user || user.role !== 'admin') {
        return res.redirect("/Dashboard/User-dashboard");
      }
      res.render("Reports");
    });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/Dashboard/User-dashboard/POS", (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    jwt.verify(token, SECRET);
    res.render("POS");
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/Dashboard/Admin-dashboard/Settings", (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    User.findById(verified.id).then(user => {
      if (!user || user.role !== 'admin') {
        return res.redirect("/Dashboard/User-dashboard/user-Settings");
      }
      res.render("Settings");
    });
  } catch (err) {
    res.redirect("/");
  }
});

app.get("/Dashboard/User-dashboard/user-Settings", (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    jwt.verify(token, SECRET);
    res.render("user-settings");
  } catch (err) {
    res.redirect("/");
  }
});

// ==================== USER MANAGEMENT ====================

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

// ==================== AUTHENTICATION API ====================

const verifyToken = (req, res, next) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  
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
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        const verified = jwt.verify(token, SECRET);
        const user = await User.findById(verified.id).select('-password');
        
        if (user) {
          return res.json({
            success: true,
            user: {
              id: user._id,
              username: user.name,
              role: user.role,
              created_at: user.createdAt,
              last_login: user.lastLogin || user.createdAt
            }
          });
        }
      } catch (jwtError) {
        console.log('JWT verification failed:', jwtError.message);
      }
    }
    
    return res.json({
      success: true,
      user: null,
      message: "Please login to view profile"
    });
    
  } catch (err) {
    console.error("Get current user simple error:", err.message || err);
    res.json({
      success: false,
      user: null,
      message: "Error fetching user data"
    });
  }
});

// LOGIN ENDPOINT
app.post("/Users/Login", async (req, res) => {
  const { name, password } = req.body;

  console.log("Login attempt for user:", name);

  try {
    const user = await User.findOne({ name });
    if (!user) {
      console.log("User not found:", name);
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    console.log("User found, checking password...");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for user:", name);
      return res.status(401).json({ 
        success: false,
        message: "Invalid password" 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: "8h" });
    
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });
    
    console.log("Login successful for user:", name, "Role:", user.role);
    
    res.json({ 
      success: true,
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
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie('authToken');
  res.json({
    success: true,
    message: "Logged out successfully"
  });
});

// ==================== ITEM MANAGEMENT ====================
// ==================== ITEM MANAGEMENT ====================

// FIXED: Handle duplicate key error properly and removed price requirement
app.post("/inventory", async (req, res) => {
    try {
        const { name, quantity, category } = req.body; // Removed price from destructuring
        
        if (!name || quantity === undefined || !category) {
            return res.status(400).json({ 
                success: false,
                message: "All fields are required" 
            });
        }

        // Check if item already exists (case-insensitive)
        const existingItem = await Item.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
        
        if (existingItem) {
            return res.status(400).json({ 
                success: false,
                message: `Item "${existingItem.name}" already exists in the database. Please use a different name or update the existing item.`
            });
        }

        const newItem = new Item({ 
            name, 
            quantity: parseInt(quantity), 
            category
            // Removed price field
        });
        
        await newItem.save();
        
        res.status(201).json({ 
            success: true,
            message: "Item added successfully", 
            item: newItem 
        });
    } catch (err) {
        console.error("Add item error:", err);
        
        // Handle MongoDB duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({ 
                success: false,
                message: "Item with this name already exists. Please use a different name."
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: "Server error",
            error: err.message 
        });
    }
});

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

// FIXED: Update item without changing name if it causes duplicate
app.put("/inventory/update/:id", async (req, res) => {
  try {
    const { name, quantity, category } = req.body;
    
    // Get current item
    const currentItem = await Item.findById(req.params.id);
    if (!currentItem) {
      return res.status(404).json({ 
        success: false,
        message: "Item not found" 
      });
    }
    
    // If name is being changed, check if new name already exists (excluding current item)
    if (name && name !== currentItem.name) {
      const existingItem = await Item.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingItem) {
        return res.status(400).json({ 
          success: false,
          message: `Item "${name}" already exists. Please use a different name.`
        });
      }
    }
    
    const updateData = { updatedAt: Date.now() };
    if (name) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (category) updateData.category = category;
    
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({ 
      success: true,
      message: "Item updated successfully", 
      item: updatedItem 
    });
  } catch (error) {
    console.error("Update item error:", error.message || error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: "Item name already exists. Please use a different name."
      });
    }
    
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

// ==================== POS API ====================

app.get("/api/pos/items", async (req, res) => {
  try {
    const items = await Item.find({})
      .sort({ category: 1, name: 1 })
      .lean();

    const formattedItems = items.map(item => ({
      _id: item._id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      status: item.quantity > 0 ? 'active' : 'out_of_stock',
      available: item.quantity > 0,
      lowStock: item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD,
      minimumStock: LOW_STOCK_THRESHOLD
    }));

    const itemsByCategory = formattedItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({
      success: true,
      items: formattedItems,
      itemsByCategory,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Get POS items error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// ==================== STOCK REQUESTS ====================

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

// ==================== DASHBOARD API ====================

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);

    const [
      ordersTodayCount,
      totalSalesAgg,
      recentOrders,
      lowStockItems,
      uniqueCustomersYearToDate
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.find().sort({ createdAt: -1 }).limit(4),
      Item.find({ 
        $or: [
          { quantity: { $lte: LOW_STOCK_THRESHOLD } },
          { quantity: { $lt: RUNNING_LOW_THRESHOLD, $gt: LOW_STOCK_THRESHOLD } }
        ]
      }).sort({ quantity: 1 }).limit(5),
      Order.distinct("customerName", { createdAt: { $gte: yearStart } })
    ]);

    const totalSales = totalSalesAgg[0]?.total || 0;
    const netProfit = totalSales * 0.3;
    const ordersToday = ordersTodayCount;
    const totalCustomers = uniqueCustomersYearToDate?.length || 0;

    const recentSales = recentOrders.map(o => ({
      orderNumber: o.orderNumber,
      customerName: o.customerName || "Walk‑in Customer",
      totalAmount: o.total,
      status: "completed",
      createdAt: o.createdAt
    }));

    const lowStockAlerts = lowStockItems.map(i => ({
      _id: i._id,
      name: i.name,
      productName: i.name,
      currentStock: i.quantity,
      status: i.quantity <= 0 ? "Out of Stock" : 
              i.quantity <= LOW_STOCK_THRESHOLD ? "Low Stock" : 
              "Running Low"
    }));

    res.json({
      success: true,
      data: { 
        totalSales, 
        netProfit, 
        ordersToday,
        totalCustomers,
        recentSales, 
        lowStockAlerts 
      }
    });
  } catch (err) {
    console.error("Dashboard stats error:", err.message || err);
    
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
          { name: "Burger Buns", currentStock: 0, minStock: 5, status: "Out of Stock" },
          { name: "Cheese Slices", currentStock: 3, minStock: 5, status: "Low Stock" },
          { name: "Lettuce", currentStock: 8, minStock: 5, status: "Running Low" }
        ]
      } 
    });
  }
});

// ==================== REPORTS API ====================

app.get("/api/reports/monthly/:year/:month", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid month. Please use 1-12"
      });
    }
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    
    console.log(`Fetching orders from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lt: endDate
      }
    }).lean();
    
    console.log(`Found ${orders.length} orders for ${month}/${year}`);
    
    if (orders.length === 0) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      
      return res.json({
        success: true,
        data: {
          salesData: [],
          summary: {
            totalRevenue: 0,
            totalProfit: 0,
            totalItems: 0,
            totalOrders: 0,
            averageOrderValue: 0,
            averageItemsPerOrder: 0
          }
        },
        monthName: monthNames[month - 1],
        year: year,
        message: "No orders found for this month"
      });
    }
    
    const productSales = {};
    let totalRevenue = 0;
    let totalItems = 0;
    
    orders.forEach(order => {
      totalRevenue += order.total || 0;
      
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productName = item.name || item.productName || "Unknown Product";
          const quantity = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;
          
          if (!productSales[productName]) {
            productSales[productName] = {
              productName: productName,
              unitsSold: 0,
              revenue: 0
            };
          }
          
          productSales[productName].unitsSold += quantity;
          productSales[productName].revenue += quantity * price;
          totalItems += quantity;
        });
      }
    });
    
    const salesData = Object.values(productSales).map(item => {
      const profit = item.revenue * 0.3;
      const profitMargin = 30.00;
      
      return {
        productName: item.productName,
        unitsSold: item.unitsSold,
        revenue: parseFloat(item.revenue.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: profitMargin.toFixed(2)
      };
    });
    
    const totalProfit = totalRevenue * 0.3;
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    res.json({
      success: true,
      data: {
        salesData,
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalProfit: parseFloat(totalProfit.toFixed(2)),
          totalItems,
          totalOrders,
          averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
          averageItemsPerOrder: parseFloat(averageItemsPerOrder.toFixed(2))
        }
      },
      monthName: monthNames[month - 1],
      year: year
    });
    
  } catch (error) {
    console.error("Monthly report error:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Server error while generating report",
      error: error.message
    });
  }
});

app.get("/api/reports/export/:year/:month", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid month. Please use 1-12"
      });
    }
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    
    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lt: endDate
      }
    }).lean();
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this month to export"
      });
    }
    
    const productSales = {};
    
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productName = item.name || item.productName || "Unknown Product";
          const quantity = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;
          
          if (!productSales[productName]) {
            productSales[productName] = {
              productName: productName,
              unitsSold: 0,
              revenue: 0
            };
          }
          
          productSales[productName].unitsSold += quantity;
          productSales[productName].revenue += quantity * price;
        });
      }
    });
    
    const salesData = Object.values(productSales).map(item => {
      const profit = item.revenue * 0.3;
      const profitMargin = 30.00;
      
      return {
        productName: item.productName,
        unitsSold: item.unitsSold,
        revenue: parseFloat(item.revenue.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: profitMargin.toFixed(2)
      };
    });
    
    const headers = ['Product Name', 'Units Sold', 'Revenue', 'Profit', 'Profit Margin (%)'];
    const csvRows = salesData.map(item => [
      `"${item.productName}"`,
      item.unitsSold,
      `₱${item.revenue.toFixed(2)}`,
      `₱${item.profit.toFixed(2)}`,
      item.profitMargin
    ]);
    
    const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = salesData.reduce((sum, item) => sum + item.profit, 0);
    const totalUnits = salesData.reduce((sum, item) => sum + item.unitsSold, 0);
    
    csvRows.push([]);
    csvRows.push(['TOTAL', totalUnits, `₱${totalRevenue.toFixed(2)}`, `₱${totalProfit.toFixed(2)}`, '30.00']);
    
    const csvContent = [
      `Angelo's Burger POS - Monthly Sales Report`,
      `Month: ${month}/${year}`,
      `Generated on: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${monthNames[month-1]}-${year}.csv"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error("Export report error:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Server error while exporting report",
      error: error.message
    });
  }
});

// ==================== ORDER MANAGEMENT ====================

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

// ==================== DEBUG & UTILITY ====================

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

// ==================== DATABASE CONNECTION ====================

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not defined in .env file");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on: http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error: ", err.message || err);
    process.exit(1);
  });