import { Order } from '../models/Order.js';

const defaultOrders = [
  { code: '#FN-095', customer: 'Corporate Seminar', subDetail: '-', eventDate: 'Dec 12, 2023 10:00 AM', items: '150x Premium Tea, 100x Samosa', amount: 12500, status: 'Confirmed' },
  { code: '#FN-096', customer: 'Wedding Reception', subDetail: '-', eventDate: 'Dec 15, 2023 07:00 PM', items: '200x Mixed Coffee, 300x Mini Sandwiches', amount: 25000, status: 'Pending' },
  { code: '#FN-097', customer: 'Tech Meetup', subDetail: '-', eventDate: 'Dec 18, 2023 11:30 AM', items: '50x Cold Coffee, 50x Veg Puff', amount: 4500, status: 'Confirmed' },
  { code: '#FN-098', customer: 'Birthday Party', subDetail: '-', eventDate: 'Dec 20, 2023 04:00 PM', items: '30x Hot Chocolate, 30x Brownies', amount: 3200, status: 'Completed' }
];

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const count = await Order.countDocuments();
    const code = req.body.code || `#FN-0${(count + 95).toString().padStart(2, '0')}`;
    const newOrder = new Order({ ...req.body, code });
    const saved = await newOrder.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const targetId = req.params.id;
    let updated;
    try {
      updated = await Order.findByIdAndUpdate(targetId, req.body, { new: true });
    } catch {
      updated = await Order.findOneAndUpdate({ $or: [{ code: targetId }, { id: targetId }] }, req.body, { new: true });
    }
    if (!updated) return res.status(404).json({ message: 'Order not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const targetId = req.params.id;
    let deleted;
    try {
      deleted = await Order.findByIdAndDelete(targetId);
    } catch {
      deleted = null;
    }
    if (!deleted) {
      deleted = await Order.findOneAndDelete({ $or: [{ code: targetId }, { id: targetId }] });
    }
    if (!deleted) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
