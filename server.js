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

// ==================== PRODUCT NAME MAPPING ====================
// This maps display names to possible database names
const PRODUCT_NAME_MAPPING = {
  // Burgers
  "Beef Burger B1T1": ["Beef"],
  "Pork Burger B1T1": ["Pork"],
  
  // Hotdogs & Sausages
  "Cheezy Hotdog B1T1": ["Cheezy Hotdog", "Cheezy Hotdog B1T1", "Cheese Hotdog", "Hotdog"],
  "Chicken Franks B1T1": ["Chicken"],
  "Tender Juicy Hotdog B1T1": ["Tender Juicy Hotdog"],
  "Ham B1T1": ["Ham"],
  "Eggs B1T1": ["Eggs"],
  "Holiday Footlong B1T1": ["Footlong"],
  "Hangarian Sausage B1T1": ["Sausage"],
  
  // Drinks
  "Mineral Water": ["Mineral Water", "Water"],
  "Soft Drinks": ["Soft Drinks", "Soda", "Soft Drink"],
  "Zesto": ["Zesto"],
  "Sting": ["Sting"],
  "Cobra": ["Cobra"],
  
  // Add-ons
  "Slice Cheese": ["Slice Cheese", "Cheese Slice", "Cheese"],
  "Egg": ["Egg", "Eggs"]
};

// Function to find matching item in database
function findMatchingItem(displayName, items) {
  const possibleNames = PRODUCT_NAME_MAPPING[displayName] || [displayName];
  
  for (const item of items) {
    const itemName = item.name.trim().toLowerCase();
    for (const possibleName of possibleNames) {
      if (itemName === possibleName.toLowerCase()) {
        return item;
      }
    }
  }
  return null;
}

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

// ==================== SIMPLIFIED SESSION MANAGEMENT ====================

// Store active sessions by userId (simpler approach)
const activeSessions = new Map();

// Cleanup expired sessions every hour
setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  
  for (const [userId, session] of activeSessions.entries()) {
    const sessionAge = now - session.lastActivity;
    if (sessionAge > 8 * 60 * 60 * 1000) { // 8 hours
      activeSessions.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} expired sessions`);
  }
}, 60 * 60 * 1000);

// ==================== AUTHENTICATION MIDDLEWARE (SIMPLIFIED) ====================
const verifyToken = (req, res, next) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.log("No token found");
    return res.redirect("/");
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.log(`JWT verification error: ${err.message}`);
    return res.redirect("/");
  }
};

const verifyAdmin = async (req, res, next) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    const user = await User.findById(verified.id);
    
    if (!user || user.role !== 'admin') {
      return res.redirect("/Dashboard/User-dashboard");
    }
    
    req.user = verified;
    // Store minimal user info in res.locals for EJS templates
    res.locals.user = {
      id: user._id,
      username: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
    
    // Update session activity
    activeSessions.set(user._id.toString(), {
      userId: user._id,
      username: user.name,
      role: user.role,
      lastActivity: new Date()
    });
    
    next();
  } catch (err) {
    console.error("Admin verification error:", err);
    return res.redirect("/");
  }
};

const verifyUser = async (req, res, next) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.redirect("/");
  }
  
  try {
    const verified = jwt.verify(token, SECRET);
    const user = await User.findById(verified.id);
    
    if (!user) {
      return res.redirect("/");
    }
    
    req.user = verified;
    // Store minimal user info in res.locals for EJS templates
    res.locals.user = {
      id: user._id,
      username: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
    
    // Update session activity
    activeSessions.set(user._id.toString(), {
      userId: user._id,
      username: user.name,
      role: user.role,
      lastActivity: new Date()
    });
    
    next();
  } catch (err) {
    console.error("User verification error:", err);
    return res.redirect("/");
  }
};

// ==================== ROUTES ====================

// Login Page
app.get("/", (req, res) => {
  res.render("Login");
});

// Dashboard routes
app.get("/Dashboard/User-Page/POS", verifyUser, (req, res) => {
  res.render("POS");
});

app.get("/Dashboard/Admin-dashboard", verifyAdmin, async (req, res) => {
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
    const netProfit = totalSales * 0.5;
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

app.get("/Dashboard/User-dashboard/Inventory", verifyUser, async (req, res) => {
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

app.get("/Dashboard/Admin-dashboard/Inventory", verifyAdmin, async (req, res) => {
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
});

app.get("/Dashboard/User-dashboard/User-dashboard/Inventory/POS/user-Inventory", verifyUser, async (req, res) => {
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

// Other dashboard routes
app.get("/Dashboard/Admin-dashboard/Reports", verifyAdmin, (req, res) => {
  res.render("Reports");
});

app.get("/Dashboard/User-dashboard/POS", verifyUser, (req, res) => {
  res.render("POS");
});

app.get("/Dashboard/Admin-dashboard/Settings", verifyAdmin, (req, res) => {
  res.render("settings");
});

app.get("/Dashboard/User-dashboard/user-Settings", verifyUser, (req, res) => {
  res.render("user-settings");
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

app.get("/api/auth/current-user", async (req, res) => {
  try {
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.json({
        success: true,
        user: null,
        message: "No active session"
      });
    }
    
    try {
      const verified = jwt.verify(token, SECRET);
      const user = await User.findById(verified.id).select('-password');
      
      if (!user) {
        return res.json({
          success: false,
          user: null,
          message: "User not found"
        });
      }
      
      // Return user data
      const userData = {
        id: user._id,
        username: user.name,
        role: user.role,
        created_at: user.createdAt,
        last_login: user.lastLogin || user.createdAt
      };
      
      res.json({
        success: true,
        user: userData,
        message: "User data retrieved"
      });
    } catch (jwtError) {
      return res.json({
        success: false,
        user: null,
        message: "Invalid token"
      });
    }
  } catch (err) {
    console.error("Get current user error:", err.message || err);
    res.json({
      success: false,
      user: null,
      message: "Server error"
    });
  }
});

// LOGIN ENDPOINT - SIMPLIFIED
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
    
    console.log(`Login successful for user: ${name}, Role: ${user.role}`);
    
    // Store session
    activeSessions.set(user._id.toString(), {
      userId: user._id,
      username: user.name,
      role: user.role,
      lastActivity: new Date()
    });
    
    // Create user profile data
    const userProfile = {
      id: user._id,
      username: user.name,
      role: user.role,
      created_at: user.createdAt,
      last_login: user.lastLogin
    };
    
    // Set auth token cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed to 'lax' for better compatibility
      maxAge: 8 * 60 * 60 * 1000
    });
    
    console.log("Session created, cookies set");
    
    res.json({ 
      success: true,
      message: "Login successful", 
      token,
      user: userProfile
    });
  } catch (err) {
    console.error("Login error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// LOGOUT
app.post("/api/auth/logout", verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`Logging out user: ${userId}`);
    
    // Remove session
    activeSessions.delete(userId);
    
    // Clear cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (err) {
    console.error("Logout error:", err.message || err);
    res.status(500).json({
      success: false,
      message: "Server error during logout"
    });
  }
});

// Check session status
app.get("/api/auth/check-session", async (req, res) => {
  try {
    const token = req.cookies?.authToken;
    
    if (!token) {
      return res.json({
        success: false,
        message: "No session found",
        hasSession: false
      });
    }
    
    try {
      const verified = jwt.verify(token, SECRET);
      
      return res.json({
        success: true,
        message: "Valid session",
        hasSession: true,
        userId: verified.id
      });
    } catch (jwtError) {
      return res.json({
        success: false,
        message: "Invalid token",
        hasSession: false
      });
    }
  } catch (err) {
    console.error("Check session error:", err);
    return res.json({
      success: false,
      message: "Server error",
      hasSession: false
    });
  }
});

// ==================== ITEM MANAGEMENT ====================

app.post("/inventory", async (req, res) => {
    try {
        const { name, quantity, category } = req.body;
        
        if (!name || quantity === undefined || !category) {
            return res.status(400).json({ 
                success: false,
                message: "All fields are required" 
            });
        }

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
        });
        
        await newItem.save();
        
        res.status(201).json({ 
            success: true,
            message: "Item added successfully", 
            item: newItem 
        });
    } catch (err) {
        console.error("Add item error:", err);
        
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

app.put("/inventory/update/:id", async (req, res) => {
  try {
    const { name, quantity, category } = req.body;
    
    const currentItem = await Item.findById(req.params.id);
    if (!currentItem) {
      return res.status(404).json({ 
        success: false,
        message: "Item not found" 
      });
    }
    
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
    const dbItems = await Item.find({})
      .sort({ category: 1, name: 1 })
      .lean();

    console.log('Database items found:', dbItems.length);
    console.log('Database items:', dbItems.map(item => ({ name: item.name, quantity: item.quantity })));

    // Create a map to track which menu items we've matched
    const menuItems = [];
    const matchedDbItems = new Set();

    // Go through each menu display name and try to find a match
    for (const [displayName, aliases] of Object.entries(PRODUCT_NAME_MAPPING)) {
      let matched = false;
      let matchedItem = null;

      // Try to find a match using aliases (case-insensitive)
      for (const dbItem of dbItems) {
        if (matchedDbItems.has(dbItem._id.toString())) continue;

        const dbItemName = dbItem.name.trim().toLowerCase();
        
        // Check against all aliases
        for (const alias of aliases) {
          if (dbItemName === alias.toLowerCase()) {
            matched = true;
            matchedItem = dbItem;
            matchedDbItems.add(dbItem._id.toString());
            break;
          }
        }
        if (matched) break;
      }

      if (matched && matchedItem) {
        // Found a match in database
        const quantity = parseInt(matchedItem.quantity) || 0;
        const isAvailable = quantity > 0;
        
        menuItems.push({
          _id: matchedItem._id,
          name: displayName, // Use display name
          dbName: matchedItem.name, // Keep track of database name
          category: matchedItem.category || getCategoryForProduct(displayName),
          quantity: quantity,
          status: !isAvailable ? 'out_of_stock' : 
                  quantity <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock',
          available: isAvailable,
          lowStock: isAvailable && quantity <= LOW_STOCK_THRESHOLD,
          minimumStock: LOW_STOCK_THRESHOLD
        });
        console.log(`✓ Matched: "${displayName}" -> DB: "${matchedItem.name}" (Qty: ${quantity}, Available: ${isAvailable})`);
      } else {
        // No match found, check if we need to create this item
        const category = getCategoryForProduct(displayName);
        
        menuItems.push({
          _id: null,
          name: displayName,
          dbName: null,
          category: category,
          quantity: 0,
          status: 'out_of_stock',
          available: false,
          lowStock: false,
          minimumStock: LOW_STOCK_THRESHOLD
        });
        console.log(`✗ No match: "${displayName}" - marked as out of stock`);
      }
    }

    // Log unmatched database items
    const unmatchedDbItems = dbItems.filter(item => 
      !matchedDbItems.has(item._id.toString())
    );
    if (unmatchedDbItems.length > 0) {
      console.log('\nUnmatched database items:');
      unmatchedDbItems.forEach(item => {
        console.log(`  - "${item.name}" (${item.category}) - Qty: ${item.quantity}`);
      });
    }

    const itemsByCategory = menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    console.log('\nFinal Summary:');
    console.log(`Total menu items: ${menuItems.length}`);
    console.log(`Available: ${menuItems.filter(i => i.available).length}`);
    console.log(`Out of stock: ${menuItems.filter(i => !i.available).length}`);
    console.log(`Low stock: ${menuItems.filter(i => i.lowStock).length}`);

    res.json({
      success: true,
      items: menuItems,
      itemsByCategory,
      timestamp: new Date(),
      stats: {
        total: menuItems.length,
        available: menuItems.filter(i => i.available).length,
        outOfStock: menuItems.filter(i => !i.available).length,
        lowStock: menuItems.filter(i => i.lowStock).length
      }
    });
  } catch (err) {
    console.error("Get POS items error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Helper function to get category for a product
function getCategoryForProduct(productName) {
  if (productName.includes('Burger')) return 'Burgers';
  if (productName.includes('Hotdog') || productName.includes('Sausage') || 
      productName.includes('Ham') || productName.includes('Franks') || 
      productName.includes('Eggs') || productName.includes('Footlong')) {
    return 'Hotdogs & Sausages';
  }
  if (productName.includes('Water') || productName.includes('Drinks') || 
      productName.includes('Zesto') || productName.includes('Sting') || 
      productName.includes('Cobra')) {
    return 'Drinks';
  }
  if (productName.includes('Cheese') || productName.includes('Egg')) {
    return 'Add-ons';
  }
  return 'Other';
}

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
    const netProfit = totalSales * 0.5;
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
      const profit = item.revenue * 0.5;
      const profitMargin = 50.00;
      
      return {
        productName: item.productName,
        unitsSold: item.unitsSold,
        revenue: parseFloat(item.revenue.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: profitMargin.toFixed(2)
      };
    });
    
    const totalProfit = totalRevenue * 0.5;
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
      const profit = item.revenue * 0.5;
      const profitMargin = 50.00;
      
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
    csvRows.push(['TOTAL', totalUnits, `₱${totalRevenue.toFixed(2)}`, `₱${totalProfit.toFixed(2)}`, '50.00']);
    
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

    // Update inventory quantities
    for (const orderItem of items) {
      const displayName = orderItem.name;
      const aliases = PRODUCT_NAME_MAPPING[displayName] || [displayName];
      
      // Try to find the item in database using aliases
      let dbItem = null;
      for (const alias of aliases) {
        dbItem = await Item.findOne({ 
          name: { $regex: new RegExp(`^${alias}$`, 'i') }
        });
        if (dbItem) break;
      }
      
      if (dbItem) {
        // Decrease the quantity
        const newQuantity = Math.max(0, dbItem.quantity - orderItem.quantity);
        await Item.findByIdAndUpdate(dbItem._id, { 
          quantity: newQuantity,
          updatedAt: Date.now()
        });
        console.log(`Updated ${dbItem.name}: ${dbItem.quantity} -> ${newQuantity}`);
      } else {
        console.warn(`Could not find database item for: ${displayName}`);
        
        // Try to find by any name match
        const allItems = await Item.find({});
        for (const item of allItems) {
          if (item.name.toLowerCase().includes(displayName.toLowerCase()) || 
              displayName.toLowerCase().includes(item.name.toLowerCase())) {  
            const newQuantity = Math.max(0, item.quantity - orderItem.quantity);
            await Item.findByIdAndUpdate(item._id, { 
              quantity: newQuantity,
              updatedAt: Date.now()
            });
            console.log(`Found partial match for ${displayName} -> ${item.name}: ${item.quantity} -> ${newQuantity}`);
            break;
          }
        }
      }
    }

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
      console.log("Session management enabled");
    });
  })
  .catch(err => {
    console.error("MongoDB connection error: ", err.message || err);
    process.exit(1);
  });