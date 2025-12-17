import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
// import Authroutes from "./routes/Auth.js";
import User from "./models/User.js";
import path from "path";
import jwt from "jsonwebtoken";
import { verifyToken } from "./Middleware/verifyToken.js";
import { createAuthMiddleware } from "./Middleware/verifyToken.js";

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
    // res.status(200).json({message: "Testing"})
    // res.render("testing");
    res.render("Admin-dashboard");
});

app.get("/get-token", (req, res) => {
    const payload = { id: 1, username: "admin", role: "admin" };
    const token = jwt.sign(payload, SECRET, { expiresIn: "1h" });

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
        res.status(201).json({ message: "Username saved to MongoDB Atlas!" });
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

        //Exclude password:
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

// Database
mongoose.connect("mongodb+srv://naomi56:naruto14*@chester.eoj8gbx.mongodb.net/?appName=Chester")
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch(err => console.error(err));