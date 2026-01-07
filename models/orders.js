// models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  total: {
    type: Number,
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for faster sorting
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
export default Order;