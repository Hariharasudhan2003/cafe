import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  ShoppingBag, 
  Package, 
  Wallet, 
  Eye, 
  X, 
  Printer,
  ChevronRight,
  Search,
  Award,
  BarChart3
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
  cafeName?: string;
  branchLocation?: string;
  logoUrl?: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
  onNavigate, 
  isDarkMode = false,
  cafeName: propCafeName,
  branchLocation: propBranchLocation,
  logoUrl: propLogoUrl
}) => {
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [timeFilter, setTimeFilter] = useState<'Today' | 'Week' | 'Month' | 'All'>('Today');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showAllBills, setShowAllBills] = useState<boolean>(false);
  const [showAllTopItems] = useState<boolean>(false);
  const [showTopItemsModal, setShowTopItemsModal] = useState<boolean>(false);
  const [topItemsSearch, setTopItemsSearch] = useState<string>('');
  const [topItemsCategoryFilter, setTopItemsCategoryFilter] = useState<string>('All');
  const [bills, setBills] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [fetchedProducts, setFetchedProducts] = useState<any[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<string[]>([]);
  const [cafeSettings, setCafeSettings] = useState({
    cafeName: propCafeName || 'BrewMaster',
    branchLocation: propBranchLocation || 'Downtown Branch',
    logoUrl: propLogoUrl || ''
  });

  useEffect(() => {
    setCafeSettings((prev) => ({
      ...prev,
      cafeName: propCafeName || prev.cafeName,
      branchLocation: propBranchLocation || prev.branchLocation,
      logoUrl: propLogoUrl !== undefined ? propLogoUrl : prev.logoUrl
    }));
  }, [propCafeName, propBranchLocation, propLogoUrl]);

  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem('cafe_custom_categories');
      if (savedCustom) setCustomCategories(JSON.parse(savedCustom));
      const savedDeleted = localStorage.getItem('cafe_deleted_categories');
      if (savedDeleted) setDeletedCategories(JSON.parse(savedDeleted));
    } catch (e) {}

    apiGetSettings().then(data => { if (data) setCafeSettings(prev => ({ ...prev, ...data })); }).catch(() => {});

    Promise.all([
      apiGetBills().catch(() => []),
      apiGetOrders().catch(() => []),
      apiGetProducts().catch(() => [])
    ]).then(([fetchedBills, fetchedOrders, validProducts]) => {
      const validBills = Array.isArray(fetchedBills) ? fetchedBills : [];
      const validOrders = Array.isArray(fetchedOrders) ? fetchedOrders : [];
      const prods = (Array.isArray(validProducts) && validProducts.length > 0) ? validProducts : [
        { name: 'Veg Puff', category: 'Snacks', status: 'Active' },
        { name: 'Paneer Puff', category: 'Snacks', status: 'Active' },
        { name: 'Masala Tea', category: 'Beverage', status: 'Active' },
        { name: 'Cold Coffee', category: 'Beverage', status: 'Active' },
        { name: 'Fresh Lemon Juice', category: 'Juices', status: 'Active' },
        { name: 'Chocolate Brownie', category: 'Desserts', status: 'Active' }
      ];

      setBills(validBills);
      setOrders(validOrders);
      setFetchedProducts(prods);
      setProductsCount(prods.filter((p: any) => p.status !== 'Inactive' && p.status !== 'inactive').length);
    }).catch(err => console.log('Error fetching dashboard live data:', err));
  }, []);

  const activeCategoriesList = React.useMemo(() => {
    const base = ['Beverage', 'Snacks', 'Fast Food', 'Juices', 'Desserts'];
    const prodCats = fetchedProducts.map((p: any) => p.category).filter(Boolean);
    const combined = [...base, ...customCategories, ...prodCats];
    const unique: string[] = [];
    combined.forEach(c => {
      if (
        c && 
        !unique.some(u => u.toLowerCase() === c.toLowerCase()) &&
        !deletedCategories.some(d => d.toLowerCase() === c.toLowerCase())
      ) {
        unique.push(c);
      }
    });
    return unique;
  }, [fetchedProducts, customCategories, deletedCategories]);

  // Helper time range filter for Dashboard (Today, Week, Month, All Time)
  const isItemInTimeFilter = (item: any, filter: 'Today' | 'Week' | 'Month' | 'All') => {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    let itemDate: Date | null = null;

    const rawDateStr = item.date || item.createdAt || item.eventDate;
    if (!rawDateStr) return false;

    if (typeof rawDateStr === 'string') {
      const lower = rawDateStr.toLowerCase().trim();
      if (lower === 'today') {
        itemDate = now;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(lower)) {
        // Parse YYYY-MM-DD directly in local timezone
        const parts = lower.split('T')[0].split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        itemDate = new Date(year, month, day);
      } else {
        const parsed = new Date(rawDateStr);
        if (!isNaN(parsed.getTime())) itemDate = parsed;
      }
    } else if (rawDateStr instanceof Date) {
      itemDate = rawDateStr;
    }

    if (!itemDate && item.createdAt) {
      const parsed = new Date(item.createdAt);
      if (!isNaN(parsed.getTime())) itemDate = parsed;
    }

    if (!itemDate) return false;

    if (filter === 'Today') {
      return (
        itemDate.getFullYear() === todayYear &&
        itemDate.getMonth() === todayMonth &&
        itemDate.getDate() === todayDate
      );
    }

    if (filter === 'Week') {
      const currentDay = now.getDay();
      const distanceToMon = (currentDay + 6) % 7;

      const startOfWeek = new Date(todayYear, todayMonth, todayDate - distanceToMon, 0, 0, 0);
      const endOfWeek = new Date(todayYear, todayMonth, todayDate - distanceToMon + 6, 23, 59, 59, 999);

      const sevenDaysAgo = new Date(todayYear, todayMonth, todayDate - 7, 0, 0, 0);
      const sevenDaysFuture = new Date(todayYear, todayMonth, todayDate + 7, 23, 59, 59, 999);

      const inCurrentWeek = itemDate >= startOfWeek && itemDate <= endOfWeek;
      const in7DaysRange = itemDate >= sevenDaysAgo && itemDate <= sevenDaysFuture;

      return inCurrentWeek || in7DaysRange;
    }

    if (filter === 'Month') {
      return (
        itemDate.getFullYear() === todayYear &&
        itemDate.getMonth() === todayMonth
      );
    }

    if (filter === 'All') {
      // Filter last 1 year (365 days) data strictly
      const oneYearAgo = new Date(todayYear - 1, todayMonth, todayDate, 0, 0, 0, 0);
      return itemDate >= oneYearAgo;
    }

    return true;
  };

  // Filter bills & orders dynamically based on selected active timeFilter
  const filteredBills = bills.filter(b => isItemInTimeFilter(b, timeFilter));
  const filteredOrders = orders.filter(o => isItemInTimeFilter(o, timeFilter));

  // Dynamic Live Metrics Calculations based on filtered data
  const paidBills = filteredBills.filter((b: any) => b.status === 'Paid' || b.status === 'paid');
  const paidRevenueVal = paidBills.reduce((sum, b) => sum + (b.grandTotal || b.amount || 0), 0) +
    filteredOrders.reduce((sum, o) => sum + (o.advanceReceived || 0), 0);

  // Dynamic Sales by Category Breakdown & Top Selling Items from live filtered bills AND orders
  const itemMap: Record<string, { name: string; category: string; qty: number; revenue: number }> = {};
  const categoryTotals: Record<string, number> = {};
  activeCategoriesList.forEach(c => {
    categoryTotals[c] = 0;
  });

  const resolveCategoryForItem = (prodCat?: string, name?: string): string => {
    if (prodCat) {
      const matched = activeCategoriesList.find(c => c.toLowerCase() === prodCat.toLowerCase());
      if (matched) return matched;
    }
    const n = (name || '').toLowerCase();
    const c = (prodCat || '').toLowerCase();

    for (const cat of activeCategoriesList) {
      const catLower = cat.toLowerCase();
      if (
        c.includes(catLower) || 
        catLower.includes(c) ||
        (catLower.includes('beverage') && (n.includes('tea') || n.includes('coffee') || n.includes('chai') || n.includes('latte'))) ||
        (catLower.includes('juice') && n.includes('juice')) ||
        (catLower.includes('snack') && (n.includes('puff') || n.includes('samosa'))) ||
        (catLower.includes('dessert') && (n.includes('cake') || n.includes('ice cream'))) ||
        (catLower.includes('fast food') && (n.includes('burger') || n.includes('pizza') || n.includes('sandwich')))
      ) {
        return cat;
      }
    }
    return activeCategoriesList[0] || prodCat || 'Snacks';
  };

  // Process items from filtered POS Bills
  filteredBills.forEach((b: any) => {
    if (Array.isArray(b.items)) {
      b.items.forEach((i: any) => {
        const name = i.product?.name || i.name || 'Item';
        const prodCat = i.product?.category || i.category || '';
        const resolvedCat = resolveCategoryForItem(prodCat, name);
        const qty = i.quantity || 1;
        const rev = (i.unitPrice || i.price || 0) * qty;

        if (!itemMap[name]) {
          itemMap[name] = { name, category: resolvedCat, qty: 0, revenue: 0 };
        }
        itemMap[name].qty += qty;
        itemMap[name].revenue += rev;

        if (categoryTotals[resolvedCat] !== undefined) {
          categoryTotals[resolvedCat] += rev;
        } else if (activeCategoriesList.length > 0) {
          categoryTotals[activeCategoriesList[0]] = (categoryTotals[activeCategoriesList[0]] || 0) + rev;
        }
      });
    }
  });

  // Process items from filtered Function Orders
  filteredOrders.forEach((o: any) => {
    const orderItemsList = Array.isArray(o.orderItems) && o.orderItems.length > 0
      ? o.orderItems
      : (Array.isArray(o.itemDetails) ? o.itemDetails : []);

    orderItemsList.forEach((i: any) => {
      const name = i.name || i.product?.name || 'Item';
      const prodCat = i.category || i.product?.category || '';
      const resolvedCat = resolveCategoryForItem(prodCat, name);
      const qty = i.qty || i.quantity || 1;
      const rev = i.total || ((i.price || i.unitPrice || 0) * qty);

      if (!itemMap[name]) {
        itemMap[name] = { name, category: resolvedCat, qty: 0, revenue: 0 };
      }
      itemMap[name].qty += qty;
      itemMap[name].revenue += rev;

      if (categoryTotals[resolvedCat] !== undefined) {
        categoryTotals[resolvedCat] += rev;
      } else if (activeCategoriesList.length > 0) {
        categoryTotals[activeCategoriesList[0]] = (categoryTotals[activeCategoriesList[0]] || 0) + rev;
      }
    });
  });

  const allTopItems = Object.values(itemMap)
    .sort((a, b) => b.qty - a.qty)
    .map(t => ({
      name: t.name,
      category: t.category,
      qty: t.qty,
      revenue: `₹${t.revenue.toLocaleString()}`
    }));

  const visibleTopItems = showAllTopItems ? allTopItems : allTopItems.slice(0, 6);

  const modalFilteredTopItems = allTopItems.filter(item => {
    const matchesSearch = !topItemsSearch || item.name.toLowerCase().includes(topItemsSearch.toLowerCase());
    const matchesCategory = topItemsCategoryFilter === 'All' || item.category === topItemsCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formattedBills: Bill[] = filteredBills.map((b: any) => ({
    id: b.billNo || b._id || `#B-${Date.now().toString().slice(-4)}`,
    customer: b.customerName || 'Walk-in Customer',
    items: b.items ? b.items.length : 1,
    amount: b.grandTotal || b.amount || 0,
    payment: b.paymentMethod || 'Cash',
    status: b.status === 'Held' ? 'Pending' : (b.status || 'Paid'),
    date: b.time ? `${b.date || ''} ${b.time}` : (b.date || 'Today'),
    itemDetails: b.items ? b.items.map((i: any) => ({
      name: i.product?.name || i.name || 'Item',
      qty: i.quantity || 1,
      price: (i.unitPrice || i.price || 0) * (i.quantity || 1)
    })) : undefined
  }));

  const totalCatRev = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 0;
  const categoryColorPalette = [
    'bg-gradient-to-r from-amber-500 to-orange-500',
    'bg-amber-600',
    'bg-orange-500',
    'bg-amber-400',
    'bg-sky-500',
    'bg-slate-400',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-purple-500',
    'bg-teal-500'
  ];

  const categoryColors: Record<string, string> = {};
  activeCategoriesList.forEach((cat, idx) => {
    categoryColors[cat] = categoryColorPalette[idx % categoryColorPalette.length];
  });

  const categoriesData = Object.entries(categoryTotals).map(([name, val]) => {
    const pct = totalCatRev > 0 ? Math.round((val / totalCatRev) * 100) : 0;
    return {
      name,
      percentage: pct,
      color: categoryColors[name] || 'bg-amber-500'
    };
  });

  // Dynamic Bars Calculation from real sales data
  const maxBarRev = Math.max(...Object.values(categoryTotals), 0);
  const barsData = Object.entries(categoryTotals).map(([label, amount]) => ({
    label,
    amount,
    height: maxBarRev > 0 ? `${Math.max(8, Math.round((amount / maxBarRev) * 100))}%` : '4%'
  }));

  // Dynamic Y-axis scale values
  const scaleTop = maxBarRev > 0 ? `₹${Math.round(maxBarRev).toLocaleString()}` : '₹1,000';
  const scaleH3 = maxBarRev > 0 ? `₹${Math.round(maxBarRev * 0.75).toLocaleString()}` : '₹750';
  const scaleH2 = maxBarRev > 0 ? `₹${Math.round(maxBarRev * 0.50).toLocaleString()}` : '₹500';
  const scaleH1 = maxBarRev > 0 ? `₹${Math.round(maxBarRev * 0.25).toLocaleString()}` : '₹250';

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const cardBgClass = isDarkMode 
    ? 'bg-[#1e293b] border-slate-800 text-white' 
    : 'bg-white border-orange-100/70 text-gray-900';
  const textHeadingClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSubClass = isDarkMode ? 'text-slate-400' : 'text-gray-500';

  // Mobile Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

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
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Navbar Component */}
        <Navbar 
          activeView={activeTab}
          onViewChange={(view) => handleTabChange(view)}
          onCreateBill={() => handleTabChange('POS Billing')}
          isDarkMode={isDarkMode}
          cafeName={cafeSettings.cafeName}
          logoUrl={cafeSettings.logoUrl}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Dashboard Scrollable Body */}
        <main className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6">
          
          {/* Top Filter Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className={`text-xl font-extrabold tracking-tight ${textHeadingClass}`}>Dashboard Analytics</h2>
              <p className={`text-xs ${textSubClass}`}>
                Showing live data for: <span className="font-bold text-amber-500">{timeFilter === 'Today' ? "Today's Sales & Orders" : timeFilter === 'Week' ? "Weekly Sales (Past 7 Days)" : timeFilter === 'Month' ? "Monthly Sales (Current Month)" : "All Time Sales Records"}</span>
              </p>
            </div>

            {/* Global Dashboard Time Filter */}
            <div className={`flex items-center p-1 rounded-xl text-xs font-semibold border ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/80 shadow-2xs'
            }`}>
              <span className={`px-2.5 text-[11px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-amber-900/60'}`}>
                Filter:
              </span>
              {(['Today', 'Week', 'Month', 'All'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    timeFilter === filter
                      ? 'bg-[#78350f] text-white font-extrabold shadow-xs'
                      : isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-amber-50'
                  }`}
                >
                  {filter === 'Today' ? 'Today' : filter === 'Week' ? 'Weekly' : filter === 'Month' ? 'Monthly' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Top 4 Stat Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Card 2: Bills */}
            <div className={`${cardBgClass} rounded-xl p-5 border shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold tracking-wide ${textSubClass}`}>
                  {timeFilter === 'Today' ? "Today's Bills" : timeFilter === 'Week' ? "Weekly Bills" : timeFilter === 'Month' ? "Monthly Bills" : "All Bills"}
                </span>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-extrabold tracking-tight ${textHeadingClass}`}>{filteredBills.length}</h3>
              </div>
            </div>

            {/* Card 3: Orders */}
            <div className={`${cardBgClass} rounded-xl p-5 border shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold tracking-wide ${textSubClass}`}>
                  {timeFilter === 'Today' ? "Today's Orders" : timeFilter === 'Week' ? "Weekly Orders" : timeFilter === 'Month' ? "Monthly Orders" : "All Orders"}
                </span>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-extrabold tracking-tight ${textHeadingClass}`}>{filteredOrders.length}</h3>
              </div>
            </div>

            {/* Card 4: Total Products */}
            <div className={`${cardBgClass} rounded-xl p-5 border shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold tracking-wide ${textSubClass}`}>Total Products</span>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-extrabold tracking-tight ${textHeadingClass}`}>{productsCount}</h3>
              </div>
            </div>

            {/* Card 5: Revenue */}
            <div className={`${cardBgClass} rounded-xl p-5 border shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold tracking-wide ${textSubClass}`}>
                  {timeFilter === 'Today' ? "Today's Revenue" : timeFilter === 'Week' ? "Weekly Revenue" : timeFilter === 'Month' ? "Monthly Revenue" : "All Revenue"}
                </span>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-extrabold tracking-tight ${textHeadingClass}`}>₹{paidRevenueVal.toLocaleString()}</h3>
              </div>
            </div>

          </div>

          {/* Middle Analytics Section (Charts & Breakdown) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Card (2 Cols): Product Sales & Revenue Bar Chart */}
            <div className={`lg:col-span-2 ${cardBgClass} rounded-2xl p-6 border shadow-2xs flex flex-col justify-between`}>
              
              {/* Header with Filter Buttons */}
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-base font-bold tracking-tight ${textHeadingClass}`}>Product Sales & Revenue</h3>
                
                {/* Time Filter Pills */}
                <div className={`flex items-center p-1 rounded-full text-xs font-medium border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200/60'
                }`}>
                  {(['Today', 'Week', 'Month', 'All'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                        timeFilter === filter
                          ? 'bg-[#78350f] text-white font-semibold shadow-xs'
                          : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {filter === 'All' ? 'All Time' : filter === 'Week' ? 'Weekly' : filter === 'Month' ? 'Monthly' : 'Today'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bar Chart Graphics Canvas */}
              <div className="relative h-64 w-full pt-4 flex flex-col justify-between">
                
                {/* Grid Y-axis guides */}
                <div className={`absolute inset-0 flex flex-col justify-between pointer-events-none text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <div className={`border-b pb-1 flex justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <span>{scaleTop}</span>
                  </div>
                  <div className={`border-b pb-1 flex justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <span>{scaleH3}</span>
                  </div>
                  <div className={`border-b pb-1 flex justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <span>{scaleH2}</span>
                  </div>
                  <div className={`border-b pb-1 flex justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <span>{scaleH1}</span>
                  </div>
                  <div className={`border-b pb-1 flex justify-between ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
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
                      <span className={`text-xs font-medium mt-3 transition-colors ${
                        isDarkMode ? 'text-slate-400 group-hover:text-amber-400' : 'text-gray-500 group-hover:text-gray-900'
                      }`}>
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* Right Card (1 Col): Sales by Category */}
            <div className={`${cardBgClass} rounded-2xl p-6 border shadow-2xs flex flex-col justify-between`}>
              
              <h3 className={`text-base font-bold tracking-tight mb-5 ${textHeadingClass}`}>
                Sales by Category
              </h3>

              <div className="space-y-4">
                {categoriesData.map((cat) => (
                  <div key={cat.name} className="space-y-1.5">
                    <div className={`flex items-center justify-between text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      <span>{cat.name}</span>
                      <span className={`font-bold ${textHeadingClass}`}>{cat.percentage}%</span>
                    </div>
                    
                    {/* Progress Track */}
                    <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${cat.color}`}
                        style={{ width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mt-4 pt-4 border-t text-center ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <span className={`text-xs font-medium ${textSubClass}`}>
                  Updated live from actual sales
                </span>
              </div>

            </div>

          </div>

          {/* Bottom Tables Section (Top Selling Items & Recent Bills) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box (5 cols): Top Selling Items */}
            <div className={`lg:col-span-5 ${cardBgClass} rounded-2xl p-6 border shadow-2xs flex flex-col justify-between`}>
              
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-bold tracking-tight ${textHeadingClass}`}>
                  Top Selling Items
                </h3>
                {allTopItems.length > 0 && (
                  <button 
                    onClick={() => setShowTopItemsModal(true)}
                    className="text-xs font-bold text-amber-500 hover:text-amber-600 hover:underline transition cursor-pointer flex items-center gap-1"
                  >
                    <span>View More</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                {allTopItems.length === 0 ? (
                  <p className={`text-xs py-6 text-center ${textSubClass}`}>
                    No sales recorded {timeFilter === 'Today' ? 'today' : timeFilter === 'Week' ? 'this week' : timeFilter === 'Month' ? 'this month' : 'all time'}.
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-gray-100 text-gray-400'}`}>
                        <th className="pb-3 pr-2">Product</th>
                        <th className="pb-3 px-2">Category</th>
                        <th className="pb-3 px-2 text-right">Qty Sold</th>
                        <th className="pb-3 pl-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                      {visibleTopItems.map((item, idx) => (
                        <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/40'}>
                          <td className={`py-3 pr-2 font-semibold ${textHeadingClass}`}>{item.name}</td>
                          <td className={`py-3 px-2 ${textSubClass}`}>{item.category}</td>
                          <td className={`py-3 px-2 text-right font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{item.qty}</td>
                          <td className={`py-3 pl-2 text-right font-bold ${textHeadingClass}`}>{item.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

            {/* Right Box (7 cols): Recent Bills */}
            <div className={`lg:col-span-7 ${cardBgClass} rounded-2xl p-6 border shadow-2xs flex flex-col justify-between`}>
              
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-bold tracking-tight ${textHeadingClass}`}>
                  Recent Bills
                </h3>
                {formattedBills.length > 6 && (
                  <button 
                    onClick={() => setShowAllBills(!showAllBills)}
                    className="text-xs font-bold text-amber-500 hover:underline transition cursor-pointer"
                  >
                    {showAllBills ? 'Show Less' : 'View More'}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                {formattedBills.length === 0 ? (
                  <p className={`text-xs py-6 text-center ${textSubClass}`}>
                    No bills created {timeFilter === 'Today' ? 'today' : timeFilter === 'Week' ? 'this week' : timeFilter === 'Month' ? 'this month' : 'in selected period'}.
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-gray-100 text-gray-400'}`}>
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
                    <tbody className={`divide-y text-xs ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                      {formattedBills.slice(0, showAllBills ? formattedBills.length : 6).map((bill) => (
                        <tr key={bill.id} className={isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/40'}>
                          <td className={`py-3.5 pr-2 font-bold ${textHeadingClass}`}>{bill.id}</td>
                          <td className={`py-3.5 px-2 font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{bill.customer}</td>
                          <td className={`py-3.5 px-2 text-center ${textSubClass}`}>{bill.items}</td>
                          <td className={`py-3.5 px-2 font-bold ${textHeadingClass}`}>₹{bill.amount.toLocaleString()}</td>
                          <td className={`py-3.5 px-2 ${textSubClass}`}>{bill.payment}</td>
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
                          <td className={`py-3.5 px-2 ${textSubClass}`}>{bill.date}</td>
                          <td className="py-3.5 pl-2 text-center">
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isDarkMode ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-gray-400 hover:text-[#8b4513] hover:bg-amber-100/60'
                              }`}
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
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${isDarkMode ? 'bg-[#1e293b] text-white border-slate-800' : 'bg-white text-gray-900 border-gray-100'} rounded-2xl shadow-2xl w-full max-w-md p-6 border relative`}>
            
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
                <h3 className={`text-lg font-bold ${textHeadingClass}`}>
                  Bill Details {selectedBill.id}
                </h3>
                <span className={`text-xs ${textSubClass}`}>
                  Customer: {selectedBill.customer} | {selectedBill.date}
                </span>
              </div>
            </div>

            <div className={`space-y-3 border-t border-b py-4 my-4 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between">
                <span>Item</span>
                <span>Qty x Price</span>
              </div>
              {selectedBill.itemDetails?.map((item, idx) => (
                <div key={idx} className={`flex justify-between text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-800'}`}>
                  <span className="font-medium">{item.name}</span>
                  <span className={`font-semibold ${textHeadingClass}`}>{item.qty} × ₹{item.price / (item.qty || 1)} = ₹{item.price}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-base font-bold mb-6">
              <span className={textHeadingClass}>Total Amount:</span>
              <span className="text-xl text-amber-500">₹{selectedBill.amount.toLocaleString()}</span>
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
                className={`px-4 font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Top Selling Items Full Detail View Modal */}
      {showTopItemsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${isDarkMode ? 'bg-[#1e293b] text-white border-slate-800' : 'bg-white text-gray-900 border-gray-100'} rounded-2xl shadow-2xl w-full max-w-3xl p-6 border relative max-h-[85vh] flex flex-col`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200/40 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${textHeadingClass}`}>
                    Top Selling Items Detailed Report
                  </h3>
                  <p className={`text-xs ${textSubClass}`}>
                    Full ranking & sales breakdown for: <span className="font-bold text-amber-500">{timeFilter === 'Today' ? "Today" : timeFilter === 'Week' ? "This Week" : timeFilter === 'Month' ? "This Month" : "All Time (Past 1 Year)"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowTopItemsModal(false);
                    handleTabChange('Reports');
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Open Full Reports</span>
                </button>
                <button
                  onClick={() => setShowTopItemsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Search Toolbar */}
            <div className="py-4 flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-gray-100 dark:border-slate-800/80">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search product..."
                  value={topItemsSearch}
                  onChange={(e) => setTopItemsSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className={`text-xs font-medium ${textSubClass}`}>Category:</span>
                <select
                  value={topItemsCategoryFilter}
                  onChange={(e) => setTopItemsCategoryFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  <option value="All">All Categories</option>
                  {activeCategoriesList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto py-2 my-2 scrollbar-none">
              {modalFilteredTopItems.length === 0 ? (
                <p className={`text-xs py-8 text-center ${textSubClass}`}>
                  No top items match your search or filter.
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-[#1e293b] border-slate-800 text-slate-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                      <th className="py-2.5 pr-2 w-16 text-center">Rank</th>
                      <th className="py-2.5 px-2">Product Name</th>
                      <th className="py-2.5 px-2">Category</th>
                      <th className="py-2.5 px-2 text-right">Qty Sold</th>
                      <th className="py-2.5 pl-2 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${isDarkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                    {modalFilteredTopItems.map((item, idx) => (
                      <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/50'}>
                        <td className="py-3 pr-2 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black ${
                            idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            idx === 1 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                            idx === 2 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                            isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </span>
                        </td>
                        <td className={`py-3 px-2 font-bold ${textHeadingClass}`}>{item.name}</td>
                        <td className={`py-3 px-2 ${textSubClass}`}>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            {item.category}
                          </span>
                        </td>
                        <td className={`py-3 px-2 text-right font-extrabold ${textHeadingClass}`}>{item.qty} units</td>
                        <td className={`py-3 pl-2 text-right font-extrabold text-amber-500`}>{item.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-200/40 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className={`font-semibold ${textSubClass}`}>
                Total Ranked Products: <span className="font-extrabold text-amber-500">{modalFilteredTopItems.length}</span>
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowTopItemsModal(false);
                    handleTabChange('Reports');
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Open Reports Page</span>
                </button>
                <button
                  onClick={() => setShowTopItemsModal(false)}
                  className={`px-4 font-semibold py-2 rounded-xl text-xs transition cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
