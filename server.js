import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import User from "./models/User.js";
import path from "path";
import jwt from "jsonwebtoken";
import Item from '../POS_burger_system_A/models/Items.js';
import * as dotenv from 'dotenv';  // Use * as to import everything
dotenv.config();

// import { verifyToken } from "./Middleware/verifyToken.js";
// import { createAuthMiddleware } from "./Middleware/verifyToken.js";
// import Authroutes from "./routes/Auth.js";

const port = 4050;
const app = express();
const SECRET = "my_super_secret_key";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.listen(port, () => console.log(`Server running: http://localhost:${port}`));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(express.static(path.join(__dirname, "views")));
// app.use("/auth", Authroutes);

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

app.get("/Dashboard/admin-dashboard", (req, res) => {
    res.render("Admin-dashboard");
})

// inventory to Dashboard, Reports, POS, Settings
app.get("/Dashboard/User-dashboard/Inventory", (req, res) => {
    res.render("Inventory");
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
            quantity: req.body.quantity
        }); 

        await newItem.save();

        res.status(201).json({ message: "Item Added to Database", item: newItem });
    } catch (err) {
        console.error("Error adding item:", err);
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(400).json({ message: `An item with this ${field} already exists` });
        }
        res.status(500).json({ message: "Cannot add items to database", error: err.message });
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
        if (err.code === 11000) {
            return res.status(400).json({ message: "Name already exists" });
        }
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

app.get("/Dashboard/User-dashboard/Inventory", async (req, res) => {
    try {
        const inventory = await Item.find();
        console.log(inventory);  
        res.render('Inventory', { inventory });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching inventory");
    }
});

// Database
mongoose.connect("mongodb+srv://naomi56:naruto14*@chester.eoj8gbx.mongodb.net/?appName=Chester")
    .then(() => console.log("Connected to Database"))
    .catch(err => console.error(err));