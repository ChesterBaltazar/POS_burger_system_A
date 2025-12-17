import express from "express";
import bcrypt from "bcrypt";

const router = express.Router();

// router.post("/Login", async (req, res) => {
//     const { name, password } = req.body;

//     const user = await UserModel.findOne({ name });

//     if (!user) {
//         return res.status(400).json({ message: "User not found" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);

//     if (!isMatch) {
//         return res.status(400).json({ message: "Wrong password" });
//     }

//     res.json({ message: "Login successful" });
// });


// router.post("/register", async (req, res) => {
//     try {
//         const { name, password, role } = req.body;

//         const existingUser = await User.findOne({ name }); 
//         if (existingUser) return res.status(400).json({ message: "User already exists" });

//         const hashedPassword = await bcrypt.hash(password, 10);

//         const newUser = new User({ name, password: hashedPassword, role });
//         await newUser.save();

//         res.status(201).json({ message: "User registered successfully", user: { name: newUser.name, role: newUser.role } });
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });


// export default router;