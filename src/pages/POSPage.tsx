import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  User, 
  Minus, 
  Banknote, 
  QrCode, 
  Printer, 
  Check, 
  X,
  XCircle,
  PauseCircle,
  Trash2,
  Play
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { ReceiptModal, type ReceiptData } from '../components/ReceiptModal';
import type { Product, CartItem } from '../types/pos';
import { apiGetProducts, apiCreateProduct, apiCreateBill, apiGetBills, apiGetSettings, apiDeleteBill } from '../services/api';

export interface HeldBill {
  id: string;
  billNo: string;
  customerName: string;
  date: string;
  time: string;
  items: CartItem[];
  subtotal: number;
  grandTotal: number;
}

const categories = ['All', 'Beverage', 'Snacks', 'Fast Food', 'Juices', 'Desserts'] as const;

interface POSPageProps {
  onNavigate?: (tab: string) => void;
  isDarkMode?: boolean;
  cafeName?: string;
  branchLocation?: string;
  logoUrl?: string;
  globalGst?: number;
  taxInclusive?: boolean;
}

export const POSPage: React.FC<POSPageProps> = ({ 
  onNavigate, 
  isDarkMode = false,
  cafeName: propCafeName,
  branchLocation: propBranchLocation,
  logoUrl: propLogoUrl,
  globalGst: propGlobalGst,
  taxInclusive: propTaxInclusive
}) => {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>('POS Billing');
  const [activeNavbarView, setActiveNavbarView] = useState<string>('POS');

  const allCategoryOptions = React.useMemo(() => {
    const base = ['Beverage', 'Snacks', 'Fast Food', 'Juices', 'Desserts'];
    const prodCats = products.map(p => p.category).filter(Boolean);
    const combined = [...base, ...customCategories, ...prodCats];
    const unique: string[] = ['All'];
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
  }, [products, customCategories, deletedCategories]);
  
  // Receipt Thermal Print Modal State
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  
  // Modal State
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductCategory, setNewProductCategory] = useState<'Tea' | 'Coffee' | 'Juice' | 'Cool Drinks' | 'Snacks'>('Snacks');
  const [newProductPrice, setNewProductPrice] = useState<string>('');
  const [newProductStock, setNewProductStock] = useState<string>('20');
  
  // Held Bills State
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState<boolean>(false);

  // Notification Modal State
  const [notification, setNotification] = useState<string | null>(null);

  // Cart State (Starts empty)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Cafe Settings State
  const [cafeSettings, setCafeSettings] = useState({
    cafeName: propCafeName || 'BrewMaster',
    branchLocation: propBranchLocation || 'Downtown Branch',
    contactNumber: '+1 (555) 123-4567',
    globalGst: propGlobalGst !== undefined ? propGlobalGst : 18,
    taxInclusive: propTaxInclusive !== undefined ? propTaxInclusive : true,
    logoUrl: propLogoUrl || ''
  });

  useEffect(() => {
    setCafeSettings((prev) => ({
      ...prev,
      cafeName: propCafeName || prev.cafeName,
      branchLocation: propBranchLocation || prev.branchLocation,
      globalGst: propGlobalGst !== undefined ? propGlobalGst : prev.globalGst,
      taxInclusive: propTaxInclusive !== undefined ? propTaxInclusive : prev.taxInclusive,
      logoUrl: propLogoUrl !== undefined ? propLogoUrl : prev.logoUrl
    }));
  }, [propCafeName, propBranchLocation, propGlobalGst, propTaxInclusive, propLogoUrl]);

  // Calculations
  const getItemCalculations = (item: CartItem) => {
    const unitPrice = item.product.price;
    const itemTotal = unitPrice * item.quantity;
    return { unitPrice, itemTotal };
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  // Dynamic GST calculation based on Settings (globalGst & taxInclusive)
  const isTaxEnabled = cafeSettings.taxInclusive !== false && (cafeSettings.globalGst ?? 18) > 0;
  const totalGstPercentage = isTaxEnabled ? (cafeSettings.globalGst ?? 18) : 0;
  const halfGstRate = totalGstPercentage / 2;

  const cgst = isTaxEnabled ? Math.round(subtotal * (halfGstRate / 100)) : 0;
  const sgst = isTaxEnabled ? Math.round(subtotal * (halfGstRate / 100)) : 0;
  const grandTotal = subtotal + cgst + sgst;

  // Handlers
  const handleAddToCart = (product: Product) => {
    if (product.status === 'Inactive') {
      showNotification(`"${product.name}" is currently Inactive!`);
      return;
    }
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1, unitPrice: product.price }];
    });
    showNotification(`Added "${product.name}" to bill!`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Sequential Bill Numbering State
  const [billSeqNumber, setBillSeqNumber] = useState<number>(1);
  const currentBillNo = `#BILL-${String(billSeqNumber).padStart(4, '0')}`;

  // Fetch live products, held bills, and cafe settings from backend database
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem('cafe_custom_categories');
      if (savedCustom) {
        setCustomCategories(JSON.parse(savedCustom));
      }
      const savedDeleted = localStorage.getItem('cafe_deleted_categories');
      if (savedDeleted) {
        setDeletedCategories(JSON.parse(savedDeleted));
      }
    } catch (e) {}

    apiGetSettings()
      .then((data) => { if (data) setCafeSettings(data); })
      .catch(() => {});

    apiGetProducts()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted: Product[] = data.map((p: any) => {
            return {
              id: p._id || p.code || `p_${Date.now()}`,
              name: p.name,
              category: p.category || 'Snacks',
              price: p.price,
              stock: p.stock || 'infinity',
              status: p.status || 'Active',
              image: p.image || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=80'
            };
          });
          setProducts(formatted);
        }
      })
      .catch((err) => console.log('Using default POS products fallback:', err));

    apiGetBills()
      .then((data) => {
        if (Array.isArray(data)) {
          let maxSeq = 0;
          data.forEach((b: any) => {
            if (b.billNo) {
              const matches = b.billNo.match(/\d+/g);
              if (matches && matches.length > 0) {
                const num = parseInt(matches[matches.length - 1], 10);
                if (!isNaN(num) && num > maxSeq) {
                  maxSeq = num;
                }
              }
            }
          });
          const nextSeq = Math.max(maxSeq + 1, data.length + 1);
          setBillSeqNumber(nextSeq);

          const held = data.filter((b: any) => b.status === 'Held').map((b: any) => ({
            id: b._id || b.billNo,
            billNo: b.billNo,
            customerName: b.customerName || 'Walk-in Customer',
            date: b.date || new Date().toISOString().split('T')[0],
            time: b.time || '11:15 AM',
            items: b.items || [],
            subtotal: b.subtotal || 0,
            grandTotal: b.grandTotal || 0
          }));
          setHeldBills(held);
        }
      })
      .catch((err) => console.log('Using local held bills:', err));
  }, []);

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) return;

    const newProdPayload = {
      name: newProductName,
      category: newProductCategory,
      price: parseFloat(newProductPrice) || 0,
      stock: newProductStock.toLowerCase() === 'infinity' ? 'infinity' : (parseInt(newProductStock) || 10),
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=80'
    };

    try {
      const created = await apiCreateProduct(newProdPayload);
      const formatted: Product = {
        id: created._id || `p_${Date.now()}`,
        name: created.name,
        category: created.category,
        price: created.price,
        stock: created.stock || 20,
        image: created.image
      };
      setProducts([formatted, ...products]);
    } catch {
      const fallbackProd: Product = {
        id: `p_${Date.now()}`,
        name: newProductName,
        category: newProductCategory,
        price: parseFloat(newProductPrice) || 0,
        stock: newProductStock.toLowerCase() === 'infinity' ? 'infinity' : (parseInt(newProductStock) || 10),
        image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=80'
      };
      setProducts([fallbackProd, ...products]);
    }

    setIsAddItemOpen(false);
    setNewProductName('');
    setNewProductPrice('');
    showNotification(`Added "${newProductName}" to database & catalog!`);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handlePayAndPrint = async () => {
    if (cart.length === 0) {
      showNotification('Cart is empty!');
      return;
    }

    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0];
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const billPayload = {
      billNo: currentBillNo,
      customerName: customerName || 'Walk-in Customer',
      date: dateFormatted,
      time: timeFormatted,
      items: cart,
      subtotal,
      discount: 0,
      cgst,
      sgst,
      grandTotal,
      paymentMethod: paymentMethod, // 'Cash' or 'UPI'
      status: 'Paid'
    };

    let finalBillNo = currentBillNo;

    try {
      const created = await apiCreateBill(billPayload);
      if (created && created.billNo) {
        finalBillNo = created.billNo;
      }
    } catch (e) {
      console.warn('Bill saved locally fallback:', e);
    }

    // Trigger 1-click Thermal Receipt Print Modal
    setActiveReceipt({
      billNo: finalBillNo,
      date: dateFormatted,
      time: timeFormatted,
      customerName: customerName || 'Walk-in Customer',
      servedBy: `Alex M. (${paymentMethod})`,
      items: cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      subtotal,
      gstRate: totalGstPercentage,
      cgst,
      sgst,
      grandTotal,
      paymentMethod: paymentMethod,
      cafeName: cafeSettings.cafeName,
      branchLocation: cafeSettings.branchLocation,
      logoUrl: cafeSettings.logoUrl
    });

    showNotification(`Payment of ₹${grandTotal} completed for ${finalBillNo} via ${paymentMethod}!`);
    setCart([]);
    setCustomerName('Walk-in Customer');
    setBillSeqNumber(prev => prev + 1); // Automatically increment to next order-wise unique bill number!
  };

  const handleHoldOrder = async () => {
    if (cart.length === 0) {
      showNotification('Cart is empty! Nothing to hold.');
      return;
    }

    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    let createdId = `hb_${Date.now()}`;

    try {
      const created = await apiCreateBill({
        billNo: currentBillNo,
        customerName: customerName || 'Walk-in Customer',
        date: dateFormatted,
        time: timeStr,
        items: cart,
        subtotal,
        grandTotal,
        status: 'Held'
      });
      if (created && (created._id || created.id)) {
        createdId = created._id || created.id;
      }
    } catch (e) {
      console.warn('Held bill stored locally:', e);
    }

    const newHeldBill: HeldBill = {
      id: createdId,
      billNo: currentBillNo,
      customerName: customerName || 'Walk-in Customer',
      date: dateFormatted,
      time: timeStr,
      items: [...cart],
      subtotal: subtotal,
      grandTotal: grandTotal
    };

    setHeldBills([newHeldBill, ...heldBills]);
    setCart([]);
    setCustomerName('Walk-in Customer');
    showNotification(`Bill ${currentBillNo} put on hold! Saved in Database.`);
    setBillSeqNumber(prev => prev + 1); // Increment bill number!
  };

  const handleResumeHeldBill = async (heldBill: HeldBill) => {
    setCart(heldBill.items);
    setCustomerName(heldBill.customerName);
    setHeldBills(prev => prev.filter(b => b.id !== heldBill.id));
    setIsHeldBillsOpen(false);
    showNotification(`Resumed ${heldBill.billNo} to active bill panel!`);

    try {
      await apiDeleteBill(heldBill.id);
    } catch (e) {
      console.warn('Failed to delete resumed held bill from API:', e);
    }
  };

  const handleDiscardHeldBill = async (id: string, billNo: string) => {
    setHeldBills(prev => prev.filter(b => b.id !== id));
    showNotification(`Discarded held bill ${billNo}.`);

    try {
      await apiDeleteBill(id);
    } catch (e) {
      console.warn('Failed to delete discarded held bill from API:', e);
    }
  };



  // Filtered Products (Active products only)
  const filteredProducts = products.filter((p) => {
    const isActive = p.status === undefined || p.status === 'Active' || (p.status as string) === 'active';
    const catLower = (p.category || '').toLowerCase();
    const nameLower = (p.name || '').toLowerCase();
    const selCatLower = selectedCategory.toLowerCase();

    let matchesCategory = selectedCategory === 'All';
    if (!matchesCategory) {
      if (selCatLower === 'beverage' || selCatLower === 'beverages') {
        matchesCategory = catLower.includes('beverage') || catLower.includes('tea') || catLower.includes('coffee') || nameLower.includes('tea') || nameLower.includes('coffee') || nameLower.includes('chai');
      } else if (selCatLower === 'juice' || selCatLower === 'juices') {
        matchesCategory = catLower.includes('juice') || nameLower.includes('juice');
      } else if (selCatLower === 'cool drinks' || selCatLower === 'cool drink') {
        matchesCategory = catLower.includes('cool drink') || catLower.includes('soda') || nameLower.includes('soda') || nameLower.includes('drink');
      } else if (selCatLower === 'fast food') {
        matchesCategory = catLower.includes('fast food') || nameLower.includes('burger') || nameLower.includes('pizza') || nameLower.includes('sandwich');
      } else if (selCatLower === 'desserts' || selCatLower === 'dessert') {
        matchesCategory = catLower.includes('dessert') || nameLower.includes('cake') || nameLower.includes('ice cream') || nameLower.includes('donut') || nameLower.includes('brownie');
      } else if (selCatLower === 'snacks' || selCatLower === 'snack') {
        matchesCategory = catLower.includes('snack') || nameLower.includes('puff') || nameLower.includes('samosa') || nameLower.includes('vadai');
      } else {
        matchesCategory = catLower === selCatLower || catLower.includes(selCatLower);
      }
    }

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return isActive && matchesCategory && matchesSearch;
  });

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-[#f8fafc] text-gray-800'
    }`}>
      {/* Sidebar Component */}
      <Sidebar 
        activeTab={activeSidebarTab}
        onTabChange={(tab) => {
          setActiveSidebarTab(tab);
          if (onNavigate) onNavigate(tab);
        }}
        onNewOrder={() => {
          setCart([]);
          showNotification('Started a new fresh order!');
        }}
        cafeName={cafeSettings.cafeName}
        branchLocation={cafeSettings.branchLocation}
        logoUrl={cafeSettings.logoUrl}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar Component */}
        <Navbar 
          activeView={activeNavbarView}
          onViewChange={(view) => {
            if (view === 'Dashboard' || view === 'POS Billing' || view === 'POS') {
              if (onNavigate) onNavigate(view === 'POS' ? 'POS Billing' : view);
            }
            setActiveNavbarView(view);
          }}
          onCreateBill={() => showNotification('Created Bill #BILL-0002')}
          heldBillsCount={heldBills.length}
          onOpenHeldBills={() => setIsHeldBillsOpen(true)}
          isDarkMode={isDarkMode}
          cafeName={cafeSettings.cafeName}
          logoUrl={cafeSettings.logoUrl}
        />

        {/* Toast Notification */}
        {notification && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        )}

        {/* POS Workspace: Split layout */}
        <main className="flex-1 flex overflow-hidden p-6 gap-6">
          {/* Left Column: Product Catalog & Search */}
          <section className="flex-1 flex flex-col gap-5 overflow-hidden">
            {/* Top Search Bar & Add Item Button */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative flex items-center">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#edf2f7] hover:bg-slate-200/80 focus:bg-white text-gray-800 pl-11 pr-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/40 transition-all placeholder:text-gray-400"
                />
              </div>

              <button
                onClick={() => setIsAddItemOpen(true)}
                className="bg-[#f97316] hover:bg-orange-600 text-white font-medium text-sm py-3 px-5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] shrink-0 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {allCategoryOptions.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#f97316] text-white shadow-sm font-semibold'
                        : 'bg-[#edf2f7] text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Products Grid Area */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
                  <XCircle className="w-12 h-12 stroke-1" />
                  <p className="text-base font-medium">No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                  {filteredProducts.map((product) => {
                    const isInactive = product.status === 'Inactive';

                    return (
                      <div
                        key={product.id}
                        onClick={() => !isInactive && handleAddToCart(product)}
                        className={`bg-white rounded-2xl p-3 border shadow-xs transition-all flex flex-col justify-between group ${
                          isInactive 
                            ? 'opacity-60 bg-slate-50 cursor-not-allowed border-red-200/80' 
                            : 'hover:shadow-md border-gray-100 cursor-pointer'
                        }`}
                      >
                        {/* Product Image */}
                        <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-gray-100">
                          <img
                            src={product.image}
                            alt={product.name}
                            className={`w-full h-full object-cover transition-transform duration-300 ${
                              isInactive ? 'grayscale brightness-75' : 'group-hover:scale-105'
                            }`}
                          />
                          {isInactive && (
                            <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-1">
                              <span className="bg-red-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                                Inactive
                              </span>
                              <span className="text-[10px] text-red-200 font-medium">Disabled</span>
                            </div>
                          )}
                        </div>

                        {/* Info & Price */}
                        <div className="flex items-center justify-between mb-3 px-1">
                          <h3 className={`font-bold text-base truncate max-w-[120px] ${isInactive ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {product.name}
                          </h3>
                          <span className={`font-bold text-lg ${isInactive ? 'text-gray-400' : 'text-[#8b4513]'}`}>
                            ₹{product.price}
                          </span>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                          disabled={isInactive}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInactive) handleAddToCart(product);
                          }}
                          className={`w-full py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            isInactive 
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                              : 'bg-[#edf2f7] group-hover:bg-[#f97316] group-hover:text-white text-gray-700 active:scale-[0.98] cursor-pointer'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isInactive ? 'Disabled' : 'Add'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Bill Panel (Slim Compact Breadth) */}
          <section className="w-[280px] lg:w-[300px] bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden shrink-0">
            {/* Bill Header */}
            <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Bill {currentBillNo}
                </h3>
                <span className="bg-[#1e293b] text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xs">
                  {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Customer Selector */}
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 pl-10 pr-4 py-2 rounded-xl text-xs font-semibold outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Bill Items List Container */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              {/* Table Column Headers */}
              <div className="grid grid-cols-12 text-[11px] font-bold text-gray-400 pb-2 border-b border-gray-100 mb-2">
                <span className="col-span-5">Item</span>
                <span className="col-span-3 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs gap-2 my-auto">
                  <span>Cart is empty</span>
                  <span className="text-[11px] text-gray-300">Click product card or + Add</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cart.map((item) => {
                    const { unitPrice, itemTotal } = getItemCalculations(item);

                    return (
                      <div
                        key={item.product.id}
                        className="grid grid-cols-12 items-center text-xs py-1 border-b border-gray-50 last:border-b-0 group"
                      >
                        {/* Item Name & unit price */}
                        <div className="col-span-5 flex flex-col pr-1">
                          <span className="font-bold text-gray-800 leading-tight truncate">
                            {item.product.name}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">
                            ₹{item.product.price}/ea
                          </span>
                        </div>

                        {/* Qty Controller [- 2 +] */}
                        <div className="col-span-3 flex items-center justify-center">
                          <div className="bg-[#edf2f7] rounded-lg px-1.5 py-0.5 flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              className="text-gray-600 hover:text-gray-900 transition p-0.5"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-gray-800 text-xs min-w-[12px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              className="text-gray-600 hover:text-gray-900 transition p-0.5"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Price (Fixed 1 Qty Unit Price) */}
                        <div className="col-span-2 text-right font-medium text-gray-600 text-[11px]">
                          ₹{unitPrice}
                        </div>

                        {/* Total */}
                        <div className="col-span-2 text-right font-bold text-gray-900 text-xs flex items-center justify-end gap-1">
                          <span>₹{itemTotal}</span>
                          <button
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compact Calculations & Checkout Footer */}
            <div className="p-3 border-t border-gray-100 bg-slate-50/50 flex flex-col gap-1.5">
              {/* Summary breakdown */}
              <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                <div className="flex justify-between items-center font-semibold text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900 text-xs">₹{subtotal}</span>
                </div>

                {isTaxEnabled && (
                  <>
                    <div className="flex justify-between items-center text-gray-400 text-[10px]">
                      <span>CGST ({halfGstRate}%)</span>
                      <span>₹{cgst}</span>
                    </div>

                    <div className="flex justify-between items-center text-gray-400 text-[10px]">
                      <span>SGST ({halfGstRate}%)</span>
                      <span>₹{sgst}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Grand Total */}
              <div className="pt-1 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-900">Grand Total</span>
                <span className="text-xl font-extrabold text-[#8b4513]">
                  ₹{grandTotal}
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  onClick={() => setPaymentMethod('Cash')}
                  className={`py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'Cash'
                      ? 'border-2 border-[#8b4513] bg-amber-50/70 text-[#8b4513] shadow-2xs'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('UPI')}
                  className={`py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'border-2 border-[#8b4513] bg-amber-50/70 text-[#8b4513] shadow-2xs'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI</span>
                </button>
              </div>

              {/* Action Buttons: Hold Order / Pay & Print */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={handleHoldOrder}
                  className="flex-1 bg-[#edf2f7] hover:bg-amber-100 text-[#8b4513] font-bold text-xs py-2 px-3 rounded-xl transition-colors active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Hold Order</span>
                </button>
                <button
                  onClick={handlePayAndPrint}
                  className="flex-1 bg-[#f97316] hover:bg-orange-600 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Pay & Print</span>
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Add Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100 relative">
            <button
              onClick={() => setIsAddItemOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add New Product
            </h3>

            <form onSubmit={handleCreateNewProduct} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samosa"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none bg-white"
                  >
                    {allCategoryOptions.filter(c => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="25"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Initial Stock
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20 or infinity"
                  value={newProductStock}
                  onChange={(e) => setNewProductStock(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f97316] hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {isHeldBillsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-gray-100 relative">
            
            <button
              onClick={() => setIsHeldBillsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#8b4513] flex items-center justify-center font-bold">
                <PauseCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Held Bills List
                </h3>
                <span className="text-xs text-gray-500">
                  {heldBills.length} {heldBills.length === 1 ? 'bill' : 'bills'} currently on hold
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 my-4">
              {heldBills.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No held bills available.
                </div>
              ) : (
                heldBills.map((bill) => (
                  <div 
                    key={bill.id} 
                    className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-amber-400 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{bill.billNo}</span>
                        <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {bill.customerName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                        {bill.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                      </p>
                      <span className="text-[11px] text-gray-400 font-medium">Held at {bill.time}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block">Total</span>
                        <span className="font-extrabold text-[#8b4513] text-sm">₹{bill.grandTotal}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResumeHeldBill(bill)}
                          className="bg-[#8b4513] hover:bg-[#70370f] text-white p-2 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                          title="Resume Bill"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume</span>
                        </button>

                        <button
                          onClick={() => handleDiscardHeldBill(bill.id, bill.billNo)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Discard Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsHeldBillsOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2 rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      <ReceiptModal 
        receipt={activeReceipt} 
        onClose={() => setActiveReceipt(null)} 
        autoPrint={true} 
      />

    </div>
  );
};
