import { Bill } from '../models/Bill.js';

const defaultBills = [
  { billNo: '#B-1045', customerName: 'Walk-in', date: '24 Oct 2023', time: '10:45 AM', subtotal: 420, discount: 0, grandTotal: 450, paymentMethod: 'UPI', status: 'Paid' },
  { billNo: '#B-1046', customerName: 'Rahul S.', date: '24 Oct 2023', time: '11:15 AM', subtotal: 1150, discount: 10, grandTotal: 1200, paymentMethod: 'Card', status: 'Paid' },
  { billNo: '#B-1047', customerName: 'Priya M.', date: '24 Oct 2023', time: '11:30 AM', subtotal: 300, discount: 0, grandTotal: 320, paymentMethod: 'Cash', status: 'Pending' }
];

export const getBills = async (req, res) => {
  try {
    let bills = await Bill.find().sort({ createdAt: -1 });
    if (bills.length === 0) {
      bills = await Bill.insertMany(defaultBills);
    }
    const { status } = req.query;
    if (status) {
      bills = bills.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBill = async (req, res) => {
  try {
    let billNo = req.body.billNo;
    if (!billNo) {
      const count = await Bill.countDocuments();
      billNo = `#BILL-${String(count + 1001).padStart(4, '0')}`;
    }

    const newBill = new Bill({ ...req.body, billNo });
    const saved = await newBill.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error in createBill:', error);
    res.status(400).json({ message: error.message });
  }
};

export const updateBillStatus = async (req, res) => {
  try {
    const updated = await Bill.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Bill not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteBill = async (req, res) => {
  try {
    const deleted = await Bill.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
