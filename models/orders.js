import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  userName: {
    type: String,
    required: true
  },
  items: [{
    name: String,
    quantity: Number,
    price: Number,
    subtotal: Number
  }],
  subtotal: { 
    type: Number, 
    required: true 
  },
  total: { 
    type: Number, 
    required: true 
  },
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
  },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'gcash'], 
    default: 'cash' 
  },
  customerName: { 
    type: String, 
    default: '' 
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;