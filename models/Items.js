import mongoose from "mongoose";
import { nanoid } from "nanoid";

// const itemSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true },
//     id:   { type: String, required: true, unique: true },
//     category: { type: String, required: true, unique: true },
//     quantity: { type: Number, required: true, min: 0 }
//   }
// );

// export default mongoose.model("Item", itemSchema);

const randomId = nanoid(10);

const itemSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, unique: true },
    id:       { type: String, required: true, unique: true,default: () => nanoid(10) },
    category: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);
