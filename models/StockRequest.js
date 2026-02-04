import mongoose from 'mongoose';

const stockRequestSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      'Bread',
      'Meat',
      'Dairy',
      'Drinks',
      'Poultry',
      'Energy Drinks',
      'Hotdog & Sausages',
      'Softdrinks'
    ],
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'fulfilled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('StockRequest', stockRequestSchema);