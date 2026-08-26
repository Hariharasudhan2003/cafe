import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Receipt, 
  Wallet, 
  Download, 
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { apiGetBills, apiGetOrders, apiGetSettings } from '../services/api';

interface ReportsPageProps {
  onNavigate?: (tab: string) => void;
  isDarkMode?: boolean;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate, isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<string>('Reports');
  const [showAllPosItems, setShowAllPosItems] = useState<boolean>(false);
  const [showAllOrders, setShowAllOrders] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<'Today' | 'This Week' | 'Monthly'>('Today');

  // Multi-Filter Toolbar States
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  // Helper date filtering function based on Today, This Week, Monthly
  const isDateInTimeRange = (dateStr: string) => {
    if (!dateStr) return true;

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    let itemDate: Date | null = null;
    const lower = dateStr.toLowerCase().trim();

    if (lower === 'today') {
      itemDate = now;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(lower)) {
      const parts = lower.split('T')[0].split('-');
      itemDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) itemDate = parsed;
    }

    if (!itemDate) return true;

    if (timeRange === 'Today') {
      return (
        itemDate.getFullYear() === todayYear &&
        itemDate.getMonth() === todayMonth &&
        itemDate.getDate() === todayDate
      );
    } else if (timeRange === 'This Week') {
      const currentDay = now.getDay();
      const distanceToMon = (currentDay + 6) % 7;

      const startOfWeek = new Date(todayYear, todayMonth, todayDate - distanceToMon, 0, 0, 0);
      const endOfWeek = new Date(todayYear, todayMonth, todayDate - distanceToMon + 6, 23, 59, 59, 999);

      const sevenDaysAgo = new Date(todayYear, todayMonth, todayDate - 7, 0, 0, 0);
      const sevenDaysFuture = new Date(todayYear, todayMonth, todayDate + 7, 23, 59, 59, 999);

      const inCurrentWeek = itemDate >= startOfWeek && itemDate <= endOfWeek;
      const in7DaysRange = itemDate >= sevenDaysAgo && itemDate <= sevenDaysFuture;

      return inCurrentWeek || in7DaysRange;
    } else if (timeRange === 'Monthly') {
      return itemDate.getMonth() === todayMonth && itemDate.getFullYear() === todayYear;
    }
    return true;
  };

  const filteredBills = bills.filter((b: any) => isDateInTimeRange(b.date || b.createdAt));
  const filteredOrders = orders.filter((o: any) => isDateInTimeRange(o.eventDate || o.createdAt));

  // Dynamic Calculated Metrics for Top 4 Cards
  const posSalesVal = filteredBills.reduce((sum: number, b: any) => sum + (b.grandTotal || b.amount || 0), 0);
  const totalOrdersCount = filteredOrders.length;
  const orderRevenueVal = filteredOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
  const totalCombinedSales = posSalesVal + orderRevenueVal;
  const netProfitVal = Math.round(totalCombinedSales * 0.40); // 40% Estimated Profit Margin

  // Top Selling Items from live filtered bills
  const itemQuantities: Record<string, { qty: number; totalPrice: number }> = {};
  filteredBills.forEach((b: any) => {
    if (Array.isArray(b.items)) {
      b.items.forEach((i: any) => {
        const name = i.product?.name || i.name || 'Item';
        const qty = i.quantity || 1;
        const price = i.product?.price || i.unitPrice || i.price || 0;
        if (!itemQuantities[name]) {
          itemQuantities[name] = { qty: 0, totalPrice: 0 };
        }
        itemQuantities[name].qty += qty;
        itemQuantities[name].totalPrice += (qty * price);
      });
    }
  });

  const topItemsListAll = Object.entries(itemQuantities)
    .map(([name, data]) => ({ name, qty: data.qty, totalPrice: data.totalPrice }))
    .sort((a, b) => b.qty - a.qty);

  const topItemsList = showAllPosItems ? topItemsListAll : topItemsListAll.slice(0, 5);

  // Top Function & Event Orders for Orders Text List
  const topOrdersListAll = filteredOrders
    .map((o: any) => ({
      name: o.customer || o.eventName || o.code || 'Order',
      amount: o.amount || 0,
      code: o.code,
      status: o.status || 'Pending'
    }))
    .sort((a: any, b: any) => b.amount - a.amount);

  const topOrdersList = showAllOrders ? topOrdersListAll : topOrdersListAll.slice(0, 5);

  // Transactions list compiled from real bills
  const allTransactions = filteredBills.map((b: any) => {
    const itemsSummary = Array.isArray(b.items)
      ? b.items.map((i: any) => `${i.quantity || 1}x ${i.product?.name || i.name || 'Item'}`).join(', ')
      : 'POS Billing Items';

    const statusVal = b.status === 'Held' ? 'PENDING' : (b.status ? b.status.toUpperCase() : 'COMPLETED');

    return {
      orderId: b.billNo || b._id || `#B-${Date.now().toString().slice(-4)}`,
      dateTime: `${b.date || '2026-08-25'} ${b.time || '10:00 AM'}`,
      itemsSummary,
      paymentType: b.paymentMethod || 'Cash',
      status: statusVal,
      total: `₹${(b.grandTotal || b.amount || 0).toLocaleString()}`,
      rawDate: b.date || b.createdAt || '',
      rawAmount: b.grandTotal || b.amount || 0
    };
  });

  // Apply Multi-Filter Toolbar Rules to Transactions
  const filteredTransactions = allTransactions.filter(tx => {
    const matchesId = !orderIdSearch || tx.orderId.toLowerCase().includes(orderIdSearch.toLowerCase());
    const matchesPayment = paymentFilter === 'ALL' || tx.paymentType.toLowerCase() === paymentFilter.toLowerCase();
    const matchesDate = !filterDate || tx.rawDate.startsWith(filterDate);
    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    return matchesId && matchesPayment && matchesDate && matchesStatus;
  });

  const handleExport = () => {
    alert(`Exporting ${timeRange} Cafe Analytics PDF Report...`);
  };

  const cardBgClass = isDarkMode 
    ? 'bg-[#1e293b] border-slate-800 text-white' 
    : 'bg-white border-orange-100/80 text-gray-900';
  const textHeadingClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSubClass = isDarkMode ? 'text-slate-400' : 'text-gray-500';

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
        <main className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6">
          
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${textHeadingClass}`}>Analytics & Reports</h1>
              <p className={`text-sm mt-0.5 ${textSubClass}`}>Overview of sales performance, revenue & transaction history.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Filter Pills */}
              <div className={`flex items-center p-1 rounded-xl text-xs font-medium border ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200/60'
              }`}>
                {(['Today', 'This Week', 'Monthly'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      timeRange === range
                        ? 'bg-[#78350f] text-white font-bold shadow-xs'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
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
            <div className={`${cardBgClass} rounded-2xl p-5 border shadow-2xs`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL POS SALES</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-extrabold ${textHeadingClass}`}>₹{posSalesVal.toLocaleString()}</h3>
                <span className="text-xs text-emerald-500 font-semibold mt-1 block">Live POS sales only</span>
              </div>
            </div>

            {/* Card 2: Total Event Orders */}
            <div className={`${cardBgClass} rounded-2xl p-5 border shadow-2xs`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL ORDERS</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-extrabold ${textHeadingClass}`}>{totalOrdersCount}</h3>
                <span className="text-xs text-emerald-500 font-semibold mt-1 block">Function event orders count</span>
              </div>
            </div>

            {/* Card 3: Order Revenue */}
            <div className={`${cardBgClass} rounded-2xl p-5 border shadow-2xs`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ORDER REVENUE</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-extrabold ${textHeadingClass}`}>₹{orderRevenueVal.toLocaleString()}</h3>
                <span className="text-xs text-amber-500 font-semibold mt-1 block">Total amount from event orders</span>
              </div>
            </div>

            {/* Card 4: Estimated Net Profit */}
            <div className={`${cardBgClass} rounded-2xl p-5 border shadow-2xs`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">EST. NET PROFIT</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-extrabold ${textHeadingClass}`}>₹{netProfitVal.toLocaleString()}</h3>
                <span className="text-xs text-emerald-500 font-semibold mt-1 block">Est. 40% margin</span>
              </div>
            </div>

          </div>

          {/* List 1: Top Selling Items (POS Sales) - Full Width with 2 Columns Side-by-Side */}
          <div className={`${cardBgClass} rounded-2xl p-6 border shadow-2xs flex flex-col justify-between`}>
            <div>
              <div className={`flex items-center justify-between mb-4 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <div>
                  <h3 className={`text-base font-bold tracking-tight ${textHeadingClass}`}>Top Selling Items (POS Sales)</h3>
                  <p className={`text-xs mt-0.5 ${textSubClass}`}>Ranked text breakdown of top sold menu items ({timeRange})</p>
                </div>
              </div>

              {topItemsList.length === 0 ? (
                <p className={`text-xs py-10 text-center font-medium ${textSubClass}`}>No POS sales recorded in this period.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {topItemsList.map((item, idx) => {
                    const totalItemsQty = topItemsListAll.reduce((sum: number, i: any) => sum + i.qty, 0) || 1;
                    const pct = Math.round((item.qty / totalItemsQty) * 100);

                    return (
                      <div key={idx} className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isDarkMode ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800' : 'bg-slate-50/80 border-slate-200/80 hover:bg-white shadow-2xs'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${
                            idx === 0 ? 'bg-amber-500 text-white' :
                            idx === 1 ? 'bg-slate-400 text-white' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <span className={`font-bold text-sm block ${textHeadingClass}`}>{item.name}</span>
                            <span className={`text-xs font-semibold ${textSubClass}`}>{pct}% of top POS item sales</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 block">{item.qty} Qty Sold</span>
                          <span className={`text-xs font-semibold ${textSubClass}`}>₹{(item.totalPrice || item.qty * 50).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {topItemsListAll.length > 5 && (
              <div className="pt-3 mt-4 border-t border-gray-100 dark:border-slate-800/80 text-center">
                <button
                  onClick={() => setShowAllPosItems(!showAllPosItems)}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{showAllPosItems ? 'Show Less' : `View More (${topItemsListAll.length - 5} more items)`}</span>
                  {showAllPosItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* List 2: Top Event Orders (Orders Sales) - Placed BELOW Top Selling Items & Shown ONLY if Orders Exist */}
          {topOrdersListAll.length > 0 && (
            <div className={`${cardBgClass} rounded-2xl p-6 border shadow-2xs flex flex-col justify-between`}>
              <div>
                <div className={`flex items-center justify-between mb-4 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                  <div>
                    <h3 className={`text-base font-bold tracking-tight ${textHeadingClass}`}>Top Event Orders (Orders Sales)</h3>
                    <p className={`text-xs mt-0.5 ${textSubClass}`}>Ranked text breakdown of booked function catering orders ({timeRange})</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {topOrdersList.map((order: any, idx: number) => (
                    <div key={idx} className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800' : 'bg-slate-50/80 border-slate-200/80 hover:bg-white shadow-2xs'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                          isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {order.code || `#FN-0${idx + 1}`}
                        </span>
                        <div>
                          <span className={`font-bold text-sm block ${textHeadingClass}`}>{order.name}</span>
                          <span className={`text-xs font-semibold ${textSubClass}`}>Catering Function Package</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block">₹{order.amount.toLocaleString()}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          order.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          order.status === 'Confirmed' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {order.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {topOrdersListAll.length > 5 && (
                <div className="pt-3 mt-4 border-t border-gray-100 dark:border-slate-800/80 text-center">
                  <button
                    onClick={() => setShowAllOrders(!showAllOrders)}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{showAllOrders ? 'Show Less' : `View More (${topOrdersListAll.length - 5} more orders)`}</span>
                    {showAllOrders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Transactions Table Box with Multi-Filter Toolbar */}
          <div className={`${cardBgClass} rounded-2xl border shadow-2xs overflow-hidden`}>
            
            {/* Multi-Filter Toolbar Header */}
            <div className={`p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-base font-bold tracking-tight ${textHeadingClass}`}>Recent Transactions ({timeRange})</h3>
                <p className={`text-xs mt-0.5 ${textSubClass}`}>Filter by Order ID, Payment Type, Date, or Status</p>
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
                    className={`pl-8 pr-3 py-1.5 border rounded-lg text-xs outline-none focus:border-amber-500 w-36 font-medium ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'
                    }`}
                  />
                </div>

                {/* 2. Filter by Payment Method (Cash / UPI / Card) */}
                <div className="flex items-center gap-1">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className={`text-xs font-semibold border rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-amber-500 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
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
                  className={`text-xs font-semibold border rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-amber-500 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                  title="Filter by specific date"
                />

                {/* 4. Filter by Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`text-xs font-semibold border rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-amber-500 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
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
                    className="text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline px-1 py-1 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}

              </div>
            </div>

            {/* Transactions Table Body */}
            <div className="overflow-x-auto">
              {filteredTransactions.length === 0 ? (
                <p className={`text-xs py-10 text-center font-medium ${textSubClass}`}>
                  No matching transactions found with current filters.
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                      isDarkMode ? 'bg-slate-800/80 border-slate-800 text-white' : 'bg-slate-50/50 border-gray-100 text-gray-400'
                    }`}>
                      <th className="py-4 px-5">ORDER ID</th>
                      <th className="py-4 px-4">DATE & TIME</th>
                      <th className="py-4 px-4">ITEMS SUMMARY</th>
                      <th className="py-4 px-4">PAYMENT</th>
                      <th className="py-4 px-4">STATUS</th>
                      <th className="py-4 px-5 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${isDarkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                    {filteredTransactions.map((tx: any, idx: number) => (
                      <tr key={idx} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/30'}`}>
                        <td className={`py-4 px-5 font-bold ${textHeadingClass}`}>{tx.orderId}</td>
                        <td className={`py-4 px-4 font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{tx.dateTime}</td>
                        <td className={`py-4 px-4 font-medium max-w-xs truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{tx.itemsSummary}</td>
                        <td className="py-4 px-4 font-semibold">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            tx.paymentType === 'Cash' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                            tx.paymentType === 'UPI' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                            'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}>
                            {tx.paymentType}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                            tx.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className={`py-4 px-5 text-right font-extrabold ${textHeadingClass}`}>{tx.total}</td>
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
