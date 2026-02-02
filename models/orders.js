// models/orders.js - Updated version with correct payment methods
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
  },
  costPrice: {       // Add for profit calculation
    type: Number,
    default: 0
  },
  category: String   // Add for reporting
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
    default: 'completed',
    enum: ['pending', 'completed', 'cancelled', 'refunded']
  },
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  customerName: {
    type: String,
    default: ""  // Keep for backward compatibility but set to empty string
  },
  paymentMethod: {
    type: String,
    default: 'cash',
    enum: ['cash', 'gcash']  // CHANGED: Removed 'card' and 'digital', added 'gcash'
  },
  orderType: {
    type: String,
    default: 'dine-in',
    enum: ['dine-in', 'takeaway', 'delivery']
  }
}, {
  timestamps: true
});

// Create indexes for better performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'items.name': 1 });
orderSchema.index({ paymentMethod: 1 }); // Add index for payment method queries

export const Order = mongoose.model("Order", orderSchema);
export default Order;