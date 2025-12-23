import mongoose from "mongoose";
//-- na una ko na ginawa kesa sa baba-------- 

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true, unique: true },
//   password: { type: String, required: true }
// });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ["user", "admin"],
        default: "user"
    }
});

export default mongoose.model("User", userSchema);