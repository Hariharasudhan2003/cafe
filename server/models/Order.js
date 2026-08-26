import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    subDetail: { type: String, default: '-' },
    eventDate: { type: String, required: true },
    items: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
    advanceReceived: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    contactNumber: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    eventName: { type: String, default: '' },
    deliveryTime: { type: String, default: '' },
    orderItems: { type: Array, default: [] }
  },
  { timestamps: true, strict: false }
);

export const Order = mongoose.model('Order', orderSchema);
