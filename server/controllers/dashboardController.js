import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Bill } from '../models/Bill.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { filter = 'today' } = req.query;

    const productCount = await Product.countDocuments({ status: { $ne: 'Inactive' } });

    const now = new Date();
    let startDate = null;

    if (filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const dateQuery = startDate ? { createdAt: { $gte: startDate } } : {};

    const bills = await Bill.find(dateQuery);
    const orders = await Order.find(dateQuery);

    const billCount = bills.length;
    const orderCount = orders.length;

    const totalSales = bills.reduce((acc, b) => acc + (b.grandTotal || b.amount || 0), 0) +
                       orders.reduce((acc, o) => acc + (o.amount || 0), 0);
    
    const paidBills = bills.filter(b => b.status === 'Paid' || b.status === 'paid');
    const totalRevenue = paidBills.reduce((acc, b) => acc + (b.grandTotal || b.amount || 0), 0) +
                         orders.reduce((acc, o) => acc + (o.advanceReceived || 0), 0);

    res.json({
      todaySales: `₹${totalSales.toLocaleString()}`,
      todaySalesNumber: totalSales,
      todayBills: billCount,
      todayOrders: orderCount,
      totalProducts: productCount,
      todayRevenue: `₹${totalRevenue.toLocaleString()}`,
      filter
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

