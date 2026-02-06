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
    trim: true,
    enum: ['Drinks', 'Bread', 'Meat', 'Poultry', 'Dairy', 'Hotdogs & Sausages', 'Other']
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create a compound index for name and isArchived to ensure uniqueness among non-archived items
itemSchema.index({ name: 1, isArchived: 1 }, { 
  unique: true,
  partialFilterExpression: { isArchived: { $eq: false } }
});

// Add a method to archive the item
itemSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

// Add a method to restore the item
itemSchema.methods.restore = function() {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

// Static method to get active (non-archived) items
itemSchema.statics.findActive = function() {
  return this.find({ isArchived: false });
};

// Static method to get archived items
itemSchema.statics.findArchived = function() {
  return this.find({ isArchived: true });
};

// Static method to get items by category (active only by default)
itemSchema.statics.findByCategory = function(category, includeArchived = false) {
  const query = { category };
  if (!includeArchived) {
    query.isArchived = false;
  }
  return this.find(query);
};

// Middleware to prevent duplicate names among active items
itemSchema.pre('save', async function() {
  if (this.isModified('name') && !this.isArchived) {
    const existingItem = await mongoose.models.Item.findOne({
      name: this.name,
      isArchived: false,
      _id: { $ne: this._id }
    });
    
    if (existingItem) {
      const error = new Error(`Item "${this.name}" already exists in the database.`);
      error.name = 'DuplicateItemError';
      return next(error);
    }
  }
});

export default mongoose.model('Item', itemSchema);