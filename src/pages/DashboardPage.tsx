import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Receipt, 
  ShoppingBag, 
  Package, 
  Wallet, 
  Eye, 
  X, 
  Printer 
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { apiGetBills, apiGetOrders, apiGetProducts, apiGetSettings } from '../services/api';

interface Bill {
  id: string;
  customer: string;
  items: number;
  amount: number;
  payment: string;
  status: 'Paid' | 'Pending';
  date: string;
  itemDetails?: { name: string; qty: number; price: number }[];
}

interface DashboardPageProps {
  onNavigate?: (tab: string) => void;
  isDarkMode?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [timeFilter, setTimeFilter] = useState<'Today' | 'Week' | 'Month'>('Today');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showAllBills, setShowAllBills] = useState<boolean>(false);
  const [bills, setBills] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [topItems, setTopItems] = useState<{ name: string; category: string; qty: number; revenue: string }[]>([]);
  const [cafeSettings, setCafeSettings] = useState({ cafeName: 'BrewMaster', branchLocation: 'Downtown Branch', logoUrl: '' });

  useEffect(() => {
    apiGetSettings().then(data => { if (data) setCafeSettings(data); }).catch(() => {});

    Promise.all([
      apiGetBills().catch(() => []),
      apiGetOrders().catch(() => []),
      apiGetProducts().catch(() => [])
    ]).then(([fetchedBills, fetchedOrders, fetchedProducts]) => {
      const validBills = Array.isArray(fetchedBills) ? fetchedBills : [];
      const validOrders = Array.isArray(fetchedOrders) ? fetchedOrders : [];
      const validProducts = Array.isArray(fetchedProducts) ? fetchedProducts : [];

      setBills(validBills);
      setOrders(validOrders);
      setProductsCount(validProducts.filter((p: any) => p.status !== 'Inactive' && p.status !== 'inactive').length);

      // Compute Top Selling Items from real live bills
      const itemMap: Record<string, { name: string; category: string; qty: number; revenue: number }> = {};
      validBills.forEach((b: any) => {
        if (Array.isArray(b.items)) {
          b.items.forEach((i: any) => {
            const name = i.product?.name || i.name || 'Item';
            const cat = i.product?.category || 'Snacks';
            const qty = i.quantity || 1;
            const rev = (i.unitPrice || i.price || 0) * qty;
            if (!itemMap[name]) {
              itemMap[name] = { name, category: cat, qty: 0, revenue: 0 };
            }
            itemMap[name].qty += qty;
            itemMap[name].revenue += rev;
          });
        }
      });

      const topList = Object.values(itemMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)
        .map(t => ({
          name: t.name,
          category: t.category,
          qty: t.qty,
          revenue: `₹${t.revenue.toLocaleString()}`
        }));

      setTopItems(topList);
    }).catch(err => console.log('Error fetching dashboard live data:', err));
  }, []);

  // Dynamic Live Metrics Calculations
  const paidBills = bills.filter((b: any) => b.status === 'Paid' || b.status === 'paid');
  const billsTotalAmount = bills.reduce((sum, b) => sum + (b.grandTotal || b.amount || 0), 0);
  const ordersTotalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalSalesVal = billsTotalAmount + ordersTotalAmount;
  const paidRevenueVal = paidBills.reduce((sum, b) => sum + (b.grandTotal || b.amount || 0), 0) +
    orders.reduce((sum, o) => sum + (o.advanceReceived || 0), 0);

  const formattedBills: Bill[] = bills.map((b: any) => ({
    id: b.billNo || b._id || `#B-${Date.now().toString().slice(-4)}`,
    customer: b.customerName || 'Walk-in Customer',
    items: b.items ? b.items.length : 1,
    amount: b.grandTotal || b.amount || 0,
    payment: b.paymentMethod || 'Cash',
    status: b.status === 'Held' ? 'Pending' : (b.status || 'Paid'),
    date: b.time || b.date || 'Today',
    itemDetails: b.items ? b.items.map((i: any) => ({
      name: i.product?.name || i.name || 'Item',
      qty: i.quantity || 1,
      price: (i.unitPrice || i.price || 0) * (i.quantity || 1)
    })) : undefined
  }));

  // Dynamic Sales by Category Breakdown from live bills
  const categoryTotals: Record<string, number> = {
    'Tea & Coffee': 0,
    'Snacks': 0,
    'Fast Food': 0,
    'Juices': 0,
    'Desserts': 0
  };

  bills.forEach((b: any) => {
    if (Array.isArray(b.items)) {
      b.items.forEach((i: any) => {
        const cat = i.product?.category || 'Snacks';
        const rev = (i.unitPrice || i.price || 0) * (i.quantity || 1);
        if (categoryTotals[cat] !== undefined) {
          categoryTotals[cat] += rev;
        } else {
          categoryTotals['Snacks'] += rev;
        }
      });
    }
  });

  const totalCatRev = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
  const categoryColors: Record<string, string> = {
    'Tea & Coffee': 'bg-gradient-to-r from-amber-500 to-orange-500',
    'Snacks': 'bg-[#78350f]',
    'Fast Food': 'bg-orange-400',
    'Juices': 'bg-amber-400',
    'Desserts': 'bg-slate-400'
  };

  const categoriesData = Object.entries(categoryTotals).map(([name, val]) => {
    const pct = totalCatRev > 0 ? Math.round((val / totalCatRev) * 100) : 0;
    return {
      name,
      percentage: pct,
      color: categoryColors[name] || 'bg-amber-500'
    };
  });

  // Dynamic Bars Calculation
  const maxBarRev = Math.max(...Object.values(categoryTotals), 1);
  const barsData = Object.entries(categoryTotals).map(([label, amount]) => ({
    label,
    amount,
    height: `${Math.max(15, Math.round((amount / maxBarRev) * 100))}%`
  }));

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-[#f8fafc] text-gray-800'
    }`}>
      {/* Sidebar Component */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewOrder={() => handleTabChange('POS Billing')}
        cafeName={cafeSettings.cafeName}
        branchLocation={cafeSettings.branchLocation}
        logoUrl={cafeSettings.logoUrl}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar Component */}
        <Navbar 
          activeView={activeTab}
          onViewChange={(view) => handleTabChange(view)}
          onCreateBill={() => handleTabChange('POS Billing')}
          isDarkMode={isDarkMode}
          cafeName={cafeSettings.cafeName}
          logoUrl={cafeSettings.logoUrl}
        />

        {/* Dashboard Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top 5 Stat Cards Section (Clean 5 Cards Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Today's Sales */}
            <div className="bg-white rounded-xl p-5 border border-orange-100/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 tracking-wide">Today's Sales</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">₹{totalSalesVal.toLocaleString()}</h3>
                <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Live POS + Orders</span>
                </div>
              </div>
            </div>

            {/* Card 2: Today's Bills */}
            <div className="bg-white rounded-xl p-5 border border-orange-100/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 tracking-wide">Today's Bills</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{bills.length}</h3>
              </div>
            </div>

            {/* Card 3: Today's Orders */}
            <div className="bg-white rounded-xl p-5 border border-orange-100/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 tracking-wide">Today's Orders</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{orders.length}</h3>
              </div>
            </div>

            {/* Card 4: Total Products */}
            <div className="bg-white rounded-xl p-5 border border-orange-100/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 tracking-wide">Total Products</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{productsCount}</h3>
              </div>
            </div>

            {/* Card 5: Today's Revenue */}
            <div className="bg-white rounded-xl p-5 border border-orange-100/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 tracking-wide">Today's Revenue</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">₹{paidRevenueVal.toLocaleString()}</h3>
              </div>
            </div>

          </div>

          {/* Middle Analytics Section (Charts & Breakdown) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Card (2 Cols): Product Sales & Revenue Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs flex flex-col justify-between">
              
              {/* Header with Filter Buttons */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-900 tracking-tight">Product Sales & Revenue</h3>
                
                {/* Time Filter Pills */}
                <div className="flex items-center bg-gray-100 p-1 rounded-full text-xs font-medium border border-gray-200/60">
                  {(['Today', 'Week', 'Month'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={`px-4 py-1 rounded-full transition-all duration-200 ${
                        timeFilter === filter
                          ? 'bg-[#78350f] text-white font-semibold shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bar Chart Graphics Canvas */}
              <div className="relative h-64 w-full pt-4 flex flex-col justify-between">
                
                {/* Grid Y-axis guides */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-xs text-gray-400 font-medium">
                  <div className="border-b border-gray-100 pb-1 flex justify-between">
                    <span>₹10k</span>
                  </div>
                  <div className="border-b border-gray-100 pb-1 flex justify-between">
                    <span>₹7.5k</span>
                  </div>
                  <div className="border-b border-gray-100 pb-1 flex justify-between">
                    <span>₹5k</span>
                  </div>
                  <div className="border-b border-gray-100 pb-1 flex justify-between">
                    <span>₹2.5k</span>
                  </div>
                  <div className="border-b border-gray-200 pb-1 flex justify-between">
                    <span>0</span>
                  </div>
                </div>

                {/* Bars Plotting */}
                <div className="relative z-10 h-48 mt-4 ml-10 flex items-end justify-around gap-4 px-4">
                  {barsData.map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-md mb-2 shadow-md pointer-events-none whitespace-nowrap">
                        ₹{bar.amount.toLocaleString()}
                      </div>

                      {/* Bar Pillar */}
                      <div 
                        style={{ height: bar.height }}
                        className="w-full max-w-[48px] bg-gradient-to-t from-[#78350f] via-amber-600 to-amber-500 rounded-t-lg shadow-xs group-hover:from-amber-700 group-hover:to-orange-400 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute top-0 inset-x-0 h-1 bg-amber-300/40"></div>
                      </div>

                      {/* Label under bar */}
                      <span className="text-xs font-medium text-gray-500 mt-3 group-hover:text-gray-900 group-hover:font-semibold transition-colors">
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* Right Card (1 Col): Sales by Category */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs flex flex-col justify-between">
              
              <h3 className="text-base font-bold text-gray-900 tracking-tight mb-5">
                Sales by Category
              </h3>

              <div className="space-y-4">
                {categoriesData.map((cat) => (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                      <span>{cat.name}</span>
                      <span className="text-gray-900 font-bold">{cat.percentage}%</span>
                    </div>
                    
                    {/* Progress Track */}
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${cat.color}`}
                        style={{ width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <span className="text-xs text-gray-400 font-medium">
                  Updated live from actual sales
                </span>
              </div>

            </div>

          </div>

          {/* Bottom Tables Section (Top Selling Items & Recent Bills) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box (5 cols): Top Selling Items */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs flex flex-col justify-between">
              
              <h3 className="text-base font-bold text-gray-900 tracking-tight mb-4">
                Top Selling Items
              </h3>

              <div className="overflow-x-auto">
                {topItems.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No sales recorded yet.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 pr-2">Product</th>
                        <th className="pb-3 px-2">Category</th>
                        <th className="pb-3 px-2 text-right">Qty Sold</th>
                        <th className="pb-3 pl-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {topItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 pr-2 font-semibold text-gray-900">{item.name}</td>
                          <td className="py-3 px-2 text-gray-500">{item.category}</td>
                          <td className="py-3 px-2 text-right font-medium text-gray-700">{item.qty}</td>
                          <td className="py-3 pl-2 text-right font-bold text-gray-900">{item.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

            {/* Right Box (7 cols): Recent Bills */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs flex flex-col justify-between">
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Recent Bills
                </h3>
                {formattedBills.length > 3 && (
                  <button 
                    onClick={() => setShowAllBills(!showAllBills)}
                    className="text-xs font-bold text-[#8b4513] hover:text-[#70370f] hover:underline transition cursor-pointer"
                  >
                    {showAllBills ? 'Show Less' : 'View All'}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                {formattedBills.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No bills created yet.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 pr-2">Bill No</th>
                        <th className="pb-3 px-2">Customer</th>
                        <th className="pb-3 px-2 text-center">Items</th>
                        <th className="pb-3 px-2">Amount</th>
                        <th className="pb-3 px-2">Payment</th>
                        <th className="pb-3 px-2">Status</th>
                        <th className="pb-3 px-2">Date</th>
                        <th className="pb-3 pl-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {formattedBills.slice(0, showAllBills ? 10 : 3).map((bill) => (
                        <tr key={bill.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3.5 pr-2 font-bold text-gray-900">{bill.id}</td>
                          <td className="py-3.5 px-2 font-medium text-gray-700">{bill.customer}</td>
                          <td className="py-3.5 px-2 text-center text-gray-600">{bill.items}</td>
                          <td className="py-3.5 px-2 font-bold text-gray-900">₹{bill.amount.toLocaleString()}</td>
                          <td className="py-3.5 px-2 text-gray-600">{bill.payment}</td>
                          <td className="py-3.5 px-2">
                            {bill.status === 'Paid' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-gray-500">{bill.date}</td>
                          <td className="py-3.5 pl-2 text-center">
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className="p-1.5 text-gray-400 hover:text-[#8b4513] hover:bg-amber-100/60 rounded-lg transition cursor-pointer"
                              title="View Bill Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Bill Detail View Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 relative">
            
            <button
              onClick={() => setSelectedBill(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Bill Details {selectedBill.id}
                </h3>
                <span className="text-xs text-gray-500">
                  Customer: {selectedBill.customer} | {selectedBill.date}
                </span>
              </div>
            </div>

            <div className="space-y-3 border-t border-b border-gray-100 py-4 my-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between">
                <span>Item</span>
                <span>Qty x Price</span>
              </div>
              {selectedBill.itemDetails?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm text-gray-800">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-semibold text-gray-900">{item.qty} × ₹{item.price / (item.qty || 1)} = ₹{item.price}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-base font-bold text-gray-900 mb-6">
              <span>Total Amount:</span>
              <span className="text-xl text-[#8b4513]">₹{selectedBill.amount.toLocaleString()}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  alert(`Printing Bill ${selectedBill.id}...`);
                  setSelectedBill(null);
                }}
                className="flex-1 bg-[#8b4513] hover:bg-[#70370f] text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedBill(null)}
                className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
