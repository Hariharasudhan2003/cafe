import { Product } from '../models/Product.js';

// Initial sample data if database is empty
const defaultProducts = [
  { code: '#PRD-001', name: 'Ginger Tea', category: 'Tea', price: 40.0, gst: 5, status: 'Active', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80' },
  { code: '#PRD-002', name: 'Veg Puff', category: 'Snacks', price: 35.0, gst: 12, status: 'Active', image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80' },
  { code: '#PRD-003', name: 'Chicken Burger', category: 'Fast Food', price: 120.0, gst: 18, status: 'Active', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80' },
  { code: '#PRD-004', name: 'Orange Juice', category: 'Juice', price: 80.0, gst: 12, status: 'Inactive', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80' },
  { code: '#PRD-005', name: 'Espresso Shot', category: 'Coffee', price: 60.0, gst: 5, status: 'Active', image: '' },
  { code: '#PRD-006', name: 'Cappuccino', category: 'Coffee', price: 110.0, gst: 5, status: 'Active', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80' },
  { code: '#PRD-007', name: 'Glazed Donut', category: 'Snacks', price: 45.0, gst: 12, status: 'Active', image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=500&q=80' },
  { code: '#PRD-008', name: 'Club Sandwich', category: 'Fast Food', price: 150.0, gst: 18, status: 'Active', image: '' }
];

export const getProducts = async (req, res) => {
  try {
    let products = await Product.find().sort({ createdAt: -1 });
    if (products.length === 0) {
      products = await Product.insertMany(defaultProducts);
    }
    const { category, search } = req.query;
    let filtered = products;
    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.code.toLowerCase().includes(search.toLowerCase())
      );
    }
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const count = await Product.countDocuments();
    const code = req.body.code || `#PRD-0${(count + 1).toString().padStart(2, '0')}`;
    const product = new Product({ ...req.body, code });
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
