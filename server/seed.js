import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { Bill } from './models/Bill.js';
import { Setting } from './models/Setting.js';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/cafe_db';

const sampleProducts = [
  {
    code: '#PRD-001',
    name: 'Veg Puff',
    category: 'Snacks',
    price: 20,
    gst: 12,
    stock: 50,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80',
    description: 'Crispy golden baked puff filled with spiced potato and vegetables.'
  },
  {
    code: '#PRD-002',
    name: 'Paneer Puff',
    category: 'Snacks',
    price: 35,
    gst: 12,
    stock: 32,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80',
    description: 'Flaky puff stuffed with cottage cheese cubes & Indian spices.'
  },
  {
    code: '#PRD-003',
    name: 'Masala Tea',
    category: 'Tea',
    price: 15,
    gst: 5,
    stock: 'infinity',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
    description: 'Traditional aromatic spiced Indian milk tea.'
  },
  {
    code: '#PRD-004',
    name: 'Cold Coffee',
    category: 'Coffee',
    price: 80,
    gst: 5,
    stock: 25,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80',
    description: 'Creamy chilled espresso blended with chocolate syrup and ice.'
  },
  {
    code: '#PRD-005',
    name: 'Margherita Pizza',
    category: 'Snacks',
    price: 90,
    gst: 12,
    stock: 12,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80',
    description: 'Classic mozzarella cheese and fresh tomato pizza.'
  },
  {
    code: '#PRD-006',
    name: 'Fresh Orange Juice',
    category: 'Juice',
    price: 60,
    gst: 12,
    stock: 20,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80',
    description: '100% pure freshly squeezed orange juice.'
  },
  {
    code: '#PRD-007',
    name: 'Iced Lemon Soda',
    category: 'Cool Drinks',
    price: 45,
    gst: 12,
    stock: 18,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    description: 'Refreshing sparkling lemon drink with mint.'
  },
  {
    code: '#PRD-008',
    name: 'Chicken Burger',
    category: 'Fast Food',
    price: 120,
    gst: 18,
    stock: 15,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
    description: 'Juicy chicken patty with lettuce and mayo in a toasted bun.'
  },
  {
    code: '#PRD-009',
    name: 'Glazed Donut',
    category: 'Snacks',
    price: 45,
    gst: 12,
    stock: 25,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=500&q=80',
    description: 'Soft fluffy donut coated with sweet sugar glaze.'
  },
  {
    code: '#PRD-010',
    name: 'Cappuccino',
    category: 'Coffee',
    price: 110,
    gst: 5,
    stock: 'infinity',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=80',
    description: 'Rich dark espresso topped with steamed milk foam.'
  }
];

const sampleOrders = [
  {
    code: '#FN-095',
    customer: 'Corporate Seminar',
    subDetail: 'Tech Summit 2023',
    eventDate: 'Dec 12, 2023 10:00 AM',
    items: '150x Premium Tea, 100x Samosa',
    amount: 12500,
    status: 'Confirmed',
    itemDetails: [
      { name: 'Premium Tea', qty: 150, price: 50 },
      { name: 'Samosa', qty: 100, price: 50 }
    ]
  },
  {
    code: '#FN-096',
    customer: 'Wedding Reception',
    subDetail: 'Grand Celebration',
    eventDate: 'Dec 15, 2023 07:00 PM',
    items: '200x Mixed Coffee, 300x Mini Sandwiches',
    amount: 25000,
    status: 'Pending',
    itemDetails: [
      { name: 'Mixed Coffee', qty: 200, price: 65 },
      { name: 'Mini Sandwiches', qty: 300, price: 40 }
    ]
  },
  {
    code: '#FN-097',
    customer: 'Tech Meetup',
    subDetail: 'Developers Lounge',
    eventDate: 'Dec 18, 2023 11:30 AM',
    items: '50x Cold Coffee, 50x Veg Puff',
    amount: 4500,
    status: 'Confirmed',
    itemDetails: [
      { name: 'Cold Coffee', qty: 50, price: 70 },
      { name: 'Veg Puff', qty: 50, price: 20 }
    ]
  },
  {
    code: '#FN-098',
    customer: 'Birthday Party',
    subDetail: 'Rohan 10th Bday',
    eventDate: 'Dec 20, 2023 04:00 PM',
    items: '30x Hot Chocolate, 30x Brownies',
    amount: 3200,
    status: 'Completed',
    itemDetails: [
      { name: 'Hot Chocolate', qty: 30, price: 60 },
      { name: 'Brownies', qty: 30, price: 46.66 }
    ]
  }
];

const sampleBills = [
  {
    billNo: '#BILL-0001',
    customerName: 'Walk-in Customer',
    date: '24 Oct 2023',
    time: '10:30 AM',
    items: [
      { product: { id: 'p1', name: 'Veg Puff', price: 20, category: 'Snacks' }, quantity: 2, unitPrice: 20 },
      { product: { id: 'p4', name: 'Cold Coffee', price: 80, category: 'Coffee' }, quantity: 1, unitPrice: 80 },
      { product: { id: 'p3', name: 'Masala Tea', price: 15, category: 'Tea' }, quantity: 2, unitPrice: 15 }
    ],
    subtotal: 220,
    discount: 10,
    cgst: 7,
    sgst: 7,
    grandTotal: 234,
    paymentMethod: 'Cash',
    status: 'Paid'
  },
  {
    billNo: '#BILL-0098',
    customerName: 'Rahul S.',
    date: '24 Oct 2023',
    time: '11:15 AM',
    items: [
      { product: { id: 'p2', name: 'Paneer Puff', price: 35, category: 'Snacks' }, quantity: 2, unitPrice: 35 },
      { product: { id: 'p5', name: 'Margherita Pizza', price: 90, category: 'Snacks' }, quantity: 1, unitPrice: 90 }
    ],
    subtotal: 160,
    discount: 0,
    cgst: 4,
    sgst: 4,
    grandTotal: 168,
    paymentMethod: 'Cash',
    status: 'Held'
  },
  {
    billNo: '#B-1045',
    customerName: 'Walk-in',
    date: '24 Oct 2023',
    time: '10:45 AM',
    items: [
      { product: { id: 'p3', name: 'Masala Chai', price: 30, category: 'Tea' }, quantity: 2, unitPrice: 30 },
      { product: { id: 'p8', name: 'Chicken Burger', price: 120, category: 'Fast Food' }, quantity: 1, unitPrice: 120 },
      { product: { id: 'p4', name: 'Cold Coffee', price: 80, category: 'Coffee' }, quantity: 2, unitPrice: 80 }
    ],
    subtotal: 380,
    discount: 0,
    cgst: 10,
    sgst: 10,
    grandTotal: 400,
    paymentMethod: 'UPI',
    status: 'Paid'
  }
];

const sampleSetting = {
  cafeName: 'BrewMaster',
  branchLocation: 'Downtown Branch',
  contactNumber: '+1 (555) 123-4567',
  globalGst: 18,
  taxInclusive: true,
  themeMode: 'Light'
};

const seedDB = async () => {
  try {
    console.log(`⏳ Connecting to MongoDB at: ${dbUrl}...`);
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB!');

    // Clear existing collections
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Bill.deleteMany({});
    await Setting.deleteMany({});
    console.log('🧹 Cleaned existing database collections.');

    // Seed Data
    const products = await Product.insertMany(sampleProducts);
    console.log(`📦 Seeded ${products.length} products into Product collection.`);

    const orders = await Order.insertMany(sampleOrders);
    console.log(`📋 Seeded ${orders.length} orders into Order collection.`);

    const bills = await Bill.insertMany(sampleBills);
    console.log(`🧾 Seeded ${bills.length} bills into Bill collection.`);

    const setting = await Setting.create(sampleSetting);
    console.log(`⚙️ Seeded cafe settings (${setting.cafeName}) into Setting collection.`);

    console.log('\n🎉 Data Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Data Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
