import mongoose from 'mongoose';

const stockRequestSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Drink', 'Bun', 'Meat', 'Other'],
    required: true
  },
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  requestedBy: {
    type: String,
    default: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('StockRequest', stockRequestSchema);