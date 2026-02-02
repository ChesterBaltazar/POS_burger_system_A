import mongoose from 'mongoose';

const stockRequestSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      'Burger Bun',
      'Beef Pork', 
      'Eggs',
      'Sausage',
      'Mineral Water',
      'Zesto',
      'Sting',
      'Cobra',
      'Cheese',
      'Chicken',
      'Hotdog',
      'Ham',
      'Footlong',
      'Bun',
      'Softdrink',
      'Other'
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