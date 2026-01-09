import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  total: {
    type: Number,
    required: true
  },
  items: [orderItemSchema],
  cashReceived: {
    type: Number,
    required: true
  },
  change: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    default: 'completed'
  }
}, {
  timestamps: true
});


const Order = mongoose.model("Order", orderSchema);
export default Order;