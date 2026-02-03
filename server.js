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
const port = process.env.PORT || 1738;
const SECRET = process.env.JWT_SECRET || "my_super_secret_key";

const LOW_STOCK_THRESHOLD = 5;
const RUNNING_LOW_THRESHOLD = 10;

// ==================== IMPROVED PRODUCT NAME MAPPING ====================
const PRODUCT_MAPPING = {
  "Beef Burger B1T1": { dbName: "Beef", priority: 1 },
  "Pork Burger B1T1": { dbName: "Pork", priority: 1 },
  "Cheezy Hotdog B1T1": { dbName: "Hotdog", priority: 1 },
  "Eggs B1T1": { dbName: "Eggs", priority: 1 },
  "Hangarian Sausage B1T1": { dbName: "Sausage", priority: 1 },
  "Mineral Water": { dbName: "Mineral Water", priority: 1 },
  "Zesto": { dbName: "Zesto", priority: 1 },
  "Sting": { dbName: "Sting", priority: 1 },
  "Cobra": { dbName: "Cobra", priority: 1 },
  "Slice Cheese": { dbName: "Cheese", priority: 1 },
  "Footlong": { dbName: "Footlong Buns", priority: 1 },
  "Chicken Franks B1T1": { 
    dbName: "Chicken", 
    priority: 2,
    searchTerms: ["chicken", "frank", "franks"] 
  },
  "Tender Juicy Hotdog B1T1": { 
    dbName: "Hotdog",
    priority: 2,
    searchTerms: ["tender", "juicy", "hotdog"] 
  },
  "Ham B1T1": { 
    dbName: "Ham", 
    priority: 2,
    searchTerms: ["ham"] 
  },
  "Holiday Footlong B1T1": { 
    dbName: "Footlong", 
    priority: 2,
    searchTerms: ["Footlong", "holiday", "Footlong Buns"] 
  },
  "Soft Drinks": { 
    dbName: "Soft Drinks", 
    priority: 2,
    searchTerms: ["soft", "drink", "soda", "softdrink"] 
  },
  "Egg": { 
    dbName: "Eggs",
    priority: 2,
    searchTerms: ["egg"] 
  }
};

// ==================== FUZZY MATCHING FUNCTIONS ====================

function stringSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }
  
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  let common = 0;
  for (const char of set1) {
    if (set2.has(char)) common++;
  }
  
  const totalUnique = set1.size + set2.size;
  return totalUnique === 0 ? 0 : (2 * common) / totalUnique;
}

function findBestMatch(displayName, dbItems) {
  const mapping = PRODUCT_MAPPING[displayName];
  
  if (mapping && mapping.dbName) {
    for (const dbItem of dbItems) {
      if (dbItem.name.toLowerCase() === mapping.dbName.toLowerCase()) {
        return { item: dbItem, confidence: 1.0, method: 'direct' };
      }
    }
  }
  
  const keywords = displayName.toLowerCase().split(/[^a-z0-9]/).filter(k => k.length > 2);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const dbItem of dbItems) {
    const dbName = dbItem.name.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (dbName.includes(keyword)) {
        score += 0.3;
      }
    }
    
    if (displayName.toLowerCase().includes('burger') && dbName.includes('burger')) score += 0.5;
    if (displayName.toLowerCase().includes('beef') && dbName.includes('beef')) score += 0.5;
    if (displayName.toLowerCase().includes('pork') && dbName.includes('pork')) score += 0.5;
    if (displayName.toLowerCase().includes('hotdog') && dbName.includes('hotdog')) score += 0.5;
    if (displayName.toLowerCase().includes('chicken') && dbName.includes('chicken')) score += 0.5;
    if (displayName.toLowerCase().includes('ham') && dbName.includes('ham')) score += 0.5;
    if (displayName.toLowerCase().includes('egg') && dbName.includes('egg')) score += 0.5;
    if (displayName.toLowerCase().includes('footlong') && dbName.includes('footlong')) score += 0.5;
    if (displayName.toLowerCase().includes('sausage') && dbName.includes('sausage')) score += 0.5;
    if (displayName.toLowerCase().includes('water') && dbName.includes('water')) score += 0.5;
    if (displayName.toLowerCase().includes('drink') && dbName.includes('drink')) score += 0.5;
    if (displayName.toLowerCase().includes('zesto') && dbName.includes('zesto')) score += 0.5;
    if (displayName.toLowerCase().includes('sting') && dbName.includes('sting')) score += 0.5;
    if (displayName.toLowerCase().includes('cobra') && dbName.includes('cobra')) score += 0.5;
    if (displayName.toLowerCase().includes('cheese') && dbName.includes('cheese')) score += 0.5;
    
    const similarity = stringSimilarity(displayName, dbItem.name);
    score += similarity * 0.5;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = dbItem;
    }
  }
  
  if (bestScore > 0.4) {
    return { item: bestMatch, confidence: bestScore, method: 'fuzzy' };
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

// ==================== SESSION MANAGEMENT ====================
const activeSessions = new Map();

setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  
  for (const [userId, session] of activeSessions.entries()) {
    const sessionAge = now - session.lastActivity;
    if (sessionAge > 8 * 60 * 60 * 1000) {
      activeSessions.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} expired sessions`);
  }
}, 60 * 60 * 1000);

// ==================== AUTHENTICATION MIDDLEWARE ====================
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
    res.locals.user = {
      id: user._id,
      username: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
    
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
    res.locals.user = {
      id: user._id,
      username: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
    
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
      lowStockItems
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.find().sort({ createdAt: -1 }).limit(4),
      Item.find({ 
        $or: [
          { quantity: { $lte: LOW_STOCK_THRESHOLD } },
          { quantity: { $lt: RUNNING_LOW_THRESHOLD, $gt: LOW_STOCK_THRESHOLD } }
        ]
      }).sort({ quantity: 1 }).limit(5)
    ]);

    const totalSales = totalSalesAgg[0]?.total || 0;
    const netProfit = totalSales * 0.5;
    const ordersToday = ordersTodayCount;

    const recentSales = recentOrders.map(o => ({
      orderNumber: o.orderNumber,
      paymentMethod: o.paymentMethod || "Cash",
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
      
      const userData = {
        id: user._id,
        username: user.name,
        role: user.role,
        created_at: user.createdAt,
        last_login: user.lastLogin
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
    
    console.log(`Login successful for user: ${name}, Role: ${user.role}`);
    
    activeSessions.set(user._id.toString(), {
      userId: user._id,
      username: user.name,
      role: user.role,
      lastActivity: new Date()
    });
    
    const userProfile = {
      id: user._id,
      username: user.name,
      role: user.role,
      created_at: user.createdAt,
      last_login: user.lastLogin
    };
    
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
    
    activeSessions.delete(userId);
    
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

    console.log('=== FETCHING POS ITEMS ===');
    console.log('Database items found:', dbItems.length);

    const menuItems = [];
    const usedDbItems = new Map();
    
    const displayNames = Object.keys(PRODUCT_MAPPING).sort((a, b) => {
      return PRODUCT_MAPPING[a].priority - PRODUCT_MAPPING[b].priority;
    });

    for (const displayName of displayNames) {
      const mapping = PRODUCT_MAPPING[displayName];
      let matchedItem = null;
      let matchMethod = 'none';
      
      if (mapping.dbName) {
        for (const dbItem of dbItems) {
          if (dbItem.name.toLowerCase() === mapping.dbName.toLowerCase()) {
            const currentUseCount = usedDbItems.get(dbItem._id.toString()) || 0;
            if (currentUseCount < 2) {
              matchedItem = dbItem;
              matchMethod = 'direct';
              usedDbItems.set(dbItem._id.toString(), currentUseCount + 1);
              break;
            }
          }
        }
      }
      
      if (!matchedItem) {
        const matchResult = findBestMatch(displayName, dbItems);
        if (matchResult && matchResult.confidence > 0.5) {
          const currentUseCount = usedDbItems.get(matchResult.item._id.toString()) || 0;
          if (currentUseCount < 2) {
            matchedItem = matchResult.item;
            matchMethod = matchResult.method;
            usedDbItems.set(matchResult.item._id.toString(), currentUseCount + 1);
          }
        }
      }
      
      if (matchedItem) {
        const quantity = parseInt(matchedItem.quantity) || 0;
        const isAvailable = quantity > 0;
        
        menuItems.push({
          _id: matchedItem._id,
          name: displayName,
          dbName: matchedItem.name,
          category: getCategoryForProduct(displayName),
          quantity: quantity,
          status: !isAvailable ? 'out_of_stock' : 
                  quantity <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock',
          available: isAvailable,
          lowStock: isAvailable && quantity <= LOW_STOCK_THRESHOLD,
          minimumStock: LOW_STOCK_THRESHOLD,
          matchMethod: matchMethod,
          confidence: matchMethod === 'direct' ? 1.0 : 0.5
        });
        console.log(`✓ ${matchMethod.toUpperCase()}: "${displayName}" -> "${matchedItem.name}" (Qty: ${quantity})`);
      } else {
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
          minimumStock: LOW_STOCK_THRESHOLD,
          matchMethod: 'none',
          confidence: 0
        });
        console.log(`✗ No match: "${displayName}"`);
      }
    }

    const itemsByCategory = {};
    menuItems.forEach(item => {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push(item);
    });

    const stats = {
      total: menuItems.length,
      available: menuItems.filter(i => i.available).length,
      outOfStock: menuItems.filter(i => !i.available).length,
      lowStock: menuItems.filter(i => i.lowStock).length,
      matched: menuItems.filter(i => i.matchMethod !== 'none').length,
      unmatched: menuItems.filter(i => i.matchMethod === 'none').length
    };

    console.log('\n=== POS ITEMS SUMMARY ===');
    console.log(`Total menu items: ${stats.total}`);
    console.log(`Matched: ${stats.matched}`);
    console.log(`Unmatched: ${stats.unmatched}`);
    console.log(`Available: ${stats.available}`);
    console.log(`Out of stock: ${stats.outOfStock}`);
    console.log(`Low stock: ${stats.lowStock}`);

    res.json({
      success: true,
      items: menuItems,
      itemsByCategory,
      timestamp: new Date(),
      stats: stats
    });
  } catch (err) {
    console.error("Get POS items error:", err.message || err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

function getCategoryForProduct(productName) {
  const name = productName.toLowerCase();
  
  if (name.includes('burger')) return 'Burgers';
  if (name.includes('hotdog') || name.includes('sausage') || 
      name.includes('frank') || name.includes('ham') || 
      name.includes('egg') || name.includes('footlong')) {
    return 'Hotdogs & Sausages';
  }
  if (name.includes('water') || name.includes('drink') || 
      name.includes('zesto') || name.includes('sting') || 
      name.includes('cobra') || name.includes('soda')) {
    return 'Drinks';
  }
  if (name.includes('cheese')) {
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
// FIXED: Total Customers now equals Orders Today

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
      lowStockItems
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.find().sort({ createdAt: -1 }).limit(4),
      Item.find({ 
        $or: [
          { quantity: { $lte: LOW_STOCK_THRESHOLD } },
          { quantity: { $lt: RUNNING_LOW_THRESHOLD, $gt: LOW_STOCK_THRESHOLD } }
        ]
      }).sort({ quantity: 1 }).limit(5)
    ]);

    const totalSales = totalSalesAgg[0]?.total || 0;
    const netProfit = totalSales * 0.5;
    const ordersToday = ordersTodayCount;

    // FIX: Total Customers should be the same as Orders Today
    const totalCustomers = ordersTodayCount;

    const recentSales = recentOrders.map(o => ({
      orderNumber: o.orderNumber,
      paymentMethod: o.paymentMethod || "Cash",
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
      totalCustomers, // Now this equals ordersToday
      recentSales, 
      lowStockAlerts 
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error("Dashboard stats error:", err.message || err);
    
    res.json({ 
      success: true, 
      data: { 
        totalSales: 0,
        netProfit: 0,
        ordersToday: 0,
        totalCustomers: 0, // Fixed fallback
        recentSales: [],
        lowStockAlerts: []
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
      paymentMethod = "cash"
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
    
    if (!paymentMethod || !['cash', 'gcash'].includes(paymentMethod.toLowerCase())) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment method must be either 'cash' or 'gcash'" 
      });
    }
    
    const newOrder = new Order({
      orderNumber,
      subtotal: parseFloat(subtotal),
      total: parseFloat(total),
      items,
      cashReceived: parseFloat(cashReceived),
      change: parseFloat(change),
      status,
      paymentMethod: paymentMethod.toLowerCase(),
      customerName: ""
    });

    await newOrder.save();

    for (const orderItem of items) {
      const displayName = orderItem.name;
      const dbItems = await Item.find({});
      
      let dbItem = null;
      
      const mapping = PRODUCT_MAPPING[displayName];
      if (mapping && mapping.dbName) {
        for (const item of dbItems) {
          if (item.name.toLowerCase() === mapping.dbName.toLowerCase()) {
            dbItem = item;
            break;
          }
        }
      }
      
      if (!dbItem) {
        const matchResult = findBestMatch(displayName, dbItems);
        if (matchResult && matchResult.confidence > 0.5) {
          dbItem = matchResult.item;
        }
      }
      
      if (dbItem) {
        const newQuantity = Math.max(0, dbItem.quantity - orderItem.quantity);
        await Item.findByIdAndUpdate(dbItem._id, { 
          quantity: newQuantity,
          updatedAt: Date.now()
        });
        console.log(`Updated ${dbItem.name}: ${dbItem.quantity} -> ${newQuantity} (from "${displayName}")`);
      } else {
        console.warn(`Could not find database item for: "${displayName}"`);
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

app.get("/api/debug/mappings", async (req, res) => {
  try {
    const dbItems = await Item.find().lean();
    
    const results = [];
    
    for (const [displayName, mapping] of Object.entries(PRODUCT_MAPPING)) {
      let match = null;
      let matchMethod = 'none';
      let confidence = 0;
      
      if (mapping.dbName) {
        for (const dbItem of dbItems) {
          if (dbItem.name.toLowerCase() === mapping.dbName.toLowerCase()) {
            match = dbItem;
            matchMethod = 'direct';
            confidence = 1.0;
            break;
          }
        }
      }
      
      if (!match) {
        const matchResult = findBestMatch(displayName, dbItems);
        if (matchResult && matchResult.confidence > 0) {
          match = matchResult.item;
          matchMethod = matchResult.method;
          confidence = matchResult.confidence;
        }
      }
      
      results.push({
        displayName,
        mapping: mapping.dbName,
        found: !!match,
        matchedDbName: match ? match.name : null,
        matchMethod,
        confidence,
        dbQuantity: match ? match.quantity : 0,
        dbCategory: match ? match.category : null
      });
    }
    
    res.json({
      success: true,
      dbItems: dbItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category
      })),
      mappings: results,
      summary: {
        totalDisplayItems: Object.keys(PRODUCT_MAPPING).length,
        matched: results.filter(r => r.found).length,
        unmatched: results.filter(r => !r.found).length
      }
    });
  } catch (err) {
    console.error("Debug mappings error:", err);
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