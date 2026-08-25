import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Receipt, 
  ShoppingCart, 
  Wallet, 
  Download, 
  Filter,
  Search
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { apiGetBills, apiGetOrders, apiGetSettings } from '../services/api';

interface Transaction {
  orderId: string;
  dateTime: string;
  itemsSummary: string;
  total: string;
  paymentType: 'Card' | 'Cash' | 'UPI';
  status: 'COMPLETED' | 'REFUNDED' | 'PENDING';
  rawDate?: string;
}

interface ReportsPageProps {
  onNavigate?: (tab: string) => void;
  isDarkMode?: boolean;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate, isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<string>('Reports');
  const [timeRange, setTimeRange] = useState<'Today' | 'This Week' | 'Monthly'>('This Week');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Recent Transactions Table Filters
  const [orderIdSearch, setOrderIdSearch] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [bills, setBills] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cafeSettings, setCafeSettings] = useState({ cafeName: 'BrewMaster', branchLocation: 'Downtown Branch', logoUrl: '' });

  useEffect(() => {
    apiGetSettings().then(data => { if (data) setCafeSettings(data); }).catch(() => {});
    
    Promise.all([
      apiGetBills().catch(() => []),
      apiGetOrders().catch(() => [])
    ]).then(([fetchedBills, fetchedOrders]) => {
      setBills(Array.isArray(fetchedBills) ? fetchedBills : []);
      setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  // Date Range Filtering Helper
  const isWithinRange = (dateString?: string, createdAtString?: string, range?: string) => {
    let dateObj: Date | null = null;
    if (createdAtString) {
      dateObj = new Date(createdAtString);
    } else if (dateString) {
      dateObj = new Date(dateString);
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      return true;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const itemDayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();

    if (range === 'Today') {
      return itemDayStart === todayStart;
    } else if (range === 'This Week') {
      const sevenDaysAgo = todayStart - (7 * 24 * 60 * 60 * 1000);
      return itemDayStart >= sevenDaysAgo;
    } else if (range === 'Monthly') {
      const thirtyDaysAgo = todayStart - (30 * 24 * 60 * 60 * 1000);
      return itemDayStart >= thirtyDaysAgo;
    }
    return true;
  };

  // Filtered Datasets based on selected timeRange
  const filteredBills = bills.filter(b => isWithinRange(b.date || b.time, b.createdAt, timeRange));
  const filteredOrders = orders.filter(o => isWithinRange(o.eventDateOnly || o.eventDate, o.createdAt, timeRange));

  // Live Dynamic Calculations
  // 1. POS Total Sales: Only POS Bills
  const posSalesVal = filteredBills.reduce((sum, b) => sum + (b.grandTotal || b.amount || 0), 0);

  // 2. Total Orders: Only count of Function Event Orders
  const totalOrdersCount = filteredOrders.length;

  // 3. Order Revenue: Total amount earned from Function Event Orders
  const orderRevenueVal = filteredOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  // 4. Estimated Net Profit: 40% margin on combined POS sales + Event Order Revenue
  const netProfitVal = (posSalesVal + orderRevenueVal) * 0.4;

  // Map Live Transactions from POS Bills and Function Event Orders
  const liveTransactions: Transaction[] = [
    ...filteredBills.map((b: any) => ({
      orderId: b.billNo || b._id || `#BILL-${Date.now().toString().slice(-4)}`,
      dateTime: `${b.date || 'Today'}, ${b.time || ''}`.trim(),
      rawDate: b.date || b.createdAt || '',
      itemsSummary: b.items ? b.items.map((i: any) => `${i.quantity || 1}x ${i.product?.name || i.name || 'Item'}`).join(', ') : 'POS Sale Items',
      total: `₹${(b.grandTotal || b.amount || 0).toLocaleString()}`,
      paymentType: (b.paymentMethod || 'Cash') as any,
      status: (b.status === 'Held' ? 'PENDING' : 'COMPLETED') as any
    })),
    ...filteredOrders.map((o: any) => ({
      orderId: o.code || `#ORD-${Date.now().toString().slice(-4)}`,
      dateTime: o.eventDate || 'Function Order',
      rawDate: o.eventDateOnly || o.eventDate || o.createdAt || '',
      itemsSummary: o.items || 'Pre-order Items',
      total: `₹${(o.amount || 0).toLocaleString()}`,
      paymentType: 'Cash' as any,
      status: (o.status === 'Cancelled' ? 'REFUNDED' : o.status === 'Completed' ? 'COMPLETED' : 'PENDING') as any
    }))
  ];

  // Apply Recent Transactions Filters (Order ID, Payment Method, Date, Status)
  const filteredTransactions = liveTransactions.filter(t => {
    // 1. Order ID Search
    if (orderIdSearch.trim() && !t.orderId.toLowerCase().includes(orderIdSearch.trim().toLowerCase())) {
      return false;
    }
    // 2. Payment Method Filter (Cash / UPI / Card)
    if (paymentFilter !== 'ALL' && t.paymentType !== paymentFilter) {
      return false;
    }
    // 3. Specific Date Picker Filter
    if (filterDate) {
      const matchDateStr = t.rawDate || t.dateTime;
      if (!matchDateStr.includes(filterDate)) {
        return false;
      }
    }
    // 4. Status Filter
    if (statusFilter !== 'ALL' && t.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Top Items Sold computed from live bills for Vertical Bar Chart
  const itemMap: Record<string, number> = {};
  filteredBills.forEach((b: any) => {
    if (Array.isArray(b.items)) {
      b.items.forEach((i: any) => {
        const name = i.product?.name || i.name || 'Item';
        const qty = i.quantity || 1;
        itemMap[name] = (itemMap[name] || 0) + qty;
      });
    }
  });

  const topItemsList = Object.entries(itemMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, qty]) => ({ name, qty }));

  const handleExport = () => {
    showToast(`Exported ${timeRange} Sales Report PDF!`);
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

        {/* Reports Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics & Reports</h1>
              <p className="text-sm text-gray-500 mt-0.5">Overview of sales performance, revenue & transaction history.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Filter Pills */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium border border-gray-200/60">
                {(['Today', 'This Week', 'Monthly'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      timeRange === range
                        ? 'bg-[#78350f] text-white font-bold shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="bg-[#f97316] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: POS Total Sales */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL POS SALES</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900">₹{posSalesVal.toLocaleString()}</h3>
                <span className="text-xs text-emerald-600 font-semibold mt-1 block">Live POS sales only</span>
              </div>
            </div>

            {/* Card 2: Total Event Orders */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL ORDERS</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900">{totalOrdersCount}</h3>
                <span className="text-xs text-emerald-600 font-semibold mt-1 block">Function event orders count</span>
              </div>
            </div>

            {/* Card 3: Order Revenue */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ORDER REVENUE</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900">₹{orderRevenueVal.toLocaleString()}</h3>
                <span className="text-xs text-amber-700 font-semibold mt-1 block">Total amount from event orders</span>
              </div>
            </div>

            {/* Card 4: Estimated Net Profit */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">EST. NET PROFIT</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-gray-900">₹{netProfitVal.toLocaleString()}</h3>
                <span className="text-xs text-emerald-600 font-semibold mt-1 block">Est. 40% margin</span>
              </div>
            </div>

          </div>

          {/* Top Selling Items Vertical Bar Chart Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">Top Selling Items (POS Sales Vertical Bar Chart)</h3>
                <p className="text-xs text-gray-400 mt-0.5">Vertical quantity breakdown of top sold menu items ({timeRange})</p>
              </div>
            </div>

            {topItemsList.length === 0 ? (
              <p className="text-xs text-gray-400 py-10 text-center font-medium">No sales recorded in this period to render vertical bar chart.</p>
            ) : (
              <div className="relative h-64 w-full pt-4 flex flex-col justify-between">
                
                {/* Y-Axis Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-xs text-gray-400 font-medium">
                  <div className="border-b border-gray-100 pb-1 flex justify-between">
                    <span>{Math.max(...topItemsList.map(t => t.qty), 1)} Sold</span>
                  </div>
                  <div className="border-b border-gray-100 pb-1 flex justify-between">
                    <span>{Math.round(Math.max(...topItemsList.map(t => t.qty), 1) * 0.75)}</span>
                  </div>
                  <div className="border-b border-gray-100 pb-1 flex justify-between">
                    <span>{Math.round(Math.max(...topItemsList.map(t => t.qty), 1) * 0.5)}</span>
                  </div>
                  <div className="border-b border-gray-100 pb-1 flex justify-between">
                    <span>{Math.round(Math.max(...topItemsList.map(t => t.qty), 1) * 0.25)}</span>
                  </div>
                  <div className="border-b border-gray-200 pb-1 flex justify-between">
                    <span>0</span>
                  </div>
                </div>

                {/* Vertical Bars Plotting */}
                <div className="relative z-10 h-48 mt-4 ml-10 flex items-end justify-around gap-4 px-4">
                  {topItemsList.map((item, idx) => {
                    const maxQty = Math.max(...topItemsList.map(t => t.qty), 1);
                    const heightPct = Math.max(15, Math.round((item.qty / maxQty) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                        
                        {/* Qty Badge on top of Bar */}
                        <div className="bg-amber-100 text-amber-900 text-[11px] font-extrabold px-2 py-0.5 rounded-full mb-2 shadow-2xs border border-amber-200/70 group-hover:scale-110 transition-transform">
                          {item.qty} Qty
                        </div>

                        {/* Vertical Bar Column */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[52px] bg-gradient-to-t from-[#78350f] via-amber-600 to-amber-500 rounded-t-xl shadow-xs group-hover:from-amber-700 group-hover:to-orange-400 transition-all duration-300 relative overflow-hidden"
                        >
                          <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-300/40"></div>
                        </div>

                        {/* Product Name Label Under Bar */}
                        <span className="text-xs font-bold text-gray-600 mt-3 group-hover:text-gray-900 truncate max-w-[80px] text-center transition-colors">
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

          {/* Transactions Table Box with Multi-Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            
            {/* Multi-Filter Toolbar Header */}
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">Recent Transactions ({timeRange})</h3>
                <p className="text-xs text-gray-400 mt-0.5">Filter by Order ID, Payment Type, Date, or Status</p>
              </div>

              {/* Filter Controls Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* 1. Search by Order ID */}
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter Order ID..."
                    value={orderIdSearch}
                    onChange={(e) => setOrderIdSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500 w-36 font-medium text-gray-800 placeholder:text-gray-400"
                  />
                </div>

                {/* 2. Filter by Payment Method (Cash / UPI / Card) */}
                <div className="flex items-center gap-1">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 outline-none cursor-pointer focus:border-amber-500"
                  >
                    <option value="ALL">All Payments</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                {/* 3. Specific Date Picker Filter */}
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 outline-none cursor-pointer focus:border-amber-500"
                  title="Filter by specific date"
                />

                {/* 4. Filter by Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 outline-none cursor-pointer focus:border-amber-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="REFUNDED">Refunded</option>
                </select>

                {/* Reset Filters Option */}
                {(orderIdSearch || paymentFilter !== 'ALL' || filterDate || statusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setOrderIdSearch('');
                      setPaymentFilter('ALL');
                      setFilterDate('');
                      setStatusFilter('ALL');
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline px-1 py-1 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}

              </div>
            </div>

            {/* Transactions Table Body */}
            <div className="overflow-x-auto">
              {filteredTransactions.length === 0 ? (
                <p className="text-xs text-gray-400 py-10 text-center font-medium">
                  No matching transactions found with current filters.
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-4 px-5">ORDER ID</th>
                      <th className="py-4 px-4">DATE & TIME</th>
                      <th className="py-4 px-4">ITEMS SUMMARY</th>
                      <th className="py-4 px-4">PAYMENT</th>
                      <th className="py-4 px-4">STATUS</th>
                      <th className="py-4 px-5 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-4 px-5 font-bold text-gray-900">{tx.orderId}</td>
                        <td className="py-4 px-4 font-medium text-gray-600">{tx.dateTime}</td>
                        <td className="py-4 px-4 font-medium text-gray-700 max-w-xs truncate">{tx.itemsSummary}</td>
                        <td className="py-4 px-4 font-semibold text-gray-700">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            tx.paymentType === 'Cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            tx.paymentType === 'UPI' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {tx.paymentType}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            tx.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right font-extrabold text-gray-900">{tx.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>

        </main>
      </div>

    </div>
  );
};
