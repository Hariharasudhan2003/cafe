import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { 
      type: String, 
      required: true, 
      enum: ['Tea', 'Coffee', 'Juice', 'Cool Drinks', 'Snacks', 'Beverage', 'Fast Food', 'Desserts'] 
    },
    price: { type: Number, required: true },
    gst: { type: Number, default: 12 },
    stock: { type: mongoose.Schema.Types.Mixed, default: 'infinity' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    image: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
