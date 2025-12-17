import jwt from "jsonwebtoken";

const payload = { id: 1, username: "admin", role: "admin" };
const secret = "mysecretkey"; 
const token = jwt.sign(payload, secret, { expiresIn: "1h" });

console.log("Generated JWT:", token);
