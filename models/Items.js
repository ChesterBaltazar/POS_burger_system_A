import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0,
    default: 0
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  }

}, {
  timestamps: true
});

export default mongoose.model('Item', itemSchema);