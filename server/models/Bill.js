import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true },
    customerName: { type: String, default: 'Walk-in Customer' },
    date: { type: String, required: true },
    time: { type: String, required: true },
    items: [
      {
        product: {
          id: { type: String },
          name: { type: String },
          price: { type: Number },
          category: { type: String }
        },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true }
      }
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card'], default: 'Cash' },
    status: { type: String, enum: ['Paid', 'Pending', 'Held'], default: 'Paid' }
  },
  { timestamps: true }
);

export const Bill = mongoose.model('Bill', billSchema);
