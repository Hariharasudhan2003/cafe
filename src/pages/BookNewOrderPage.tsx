import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Coffee, 
  Search,
  Check, 
  X,
  User,
  Phone,
  MapPin
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { apiCreateOrder, apiUpdateOrder, apiGetProducts, apiGetSettings } from '../services/api';

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface BookNewOrderPageProps {
  onNavigate?: (tab: string) => void;
  onBack?: () => void;
  onConfirmBooking?: (booking: any) => void;
  isDarkMode?: boolean;
  initialOrderData?: any;
}

function parseItemsStringToObjects(itemsStr?: string): OrderItem[] {
  if (!itemsStr) return [];
  const parts = itemsStr.split(',').map((s) => s.trim());
  return parts.filter(Boolean).map((part, idx) => {
    const match = part.match(/^(\d+)x\s+(.+)$/i);
    if (match) {
      const qty = parseInt(match[1]) || 1;
      const name = match[2];
      const price = 50;
      return {
        id: `parsed-${idx}-${Date.now()}`,
        name,
        qty,
        price,
        total: qty * price
      };
    }
    return {
      id: `parsed-${idx}-${Date.now()}`,
      name: part,
      qty: 1,
      price: 100,
      total: 100
    };
  });
}

const defaultMenu = [
  { name: 'Veg Puff', price: 20 },
  { name: 'Paneer Puff', price: 35 },
  { name: 'Masala Tea', price: 15 },
  { name: 'Cold Coffee', price: 80 },
  { name: 'Margherita Pizza', price: 90 },
  { name: 'Iced Lemon Soda', price: 45 },
  { name: 'Chicken Burger', price: 120 },
  { name: 'Glazed Donut', price: 45 },
  { name: 'Cappuccino', price: 110 }
];

export const BookNewOrderPage: React.FC<BookNewOrderPageProps> = ({ 
  onNavigate, 
  onBack,
  onConfirmBooking,
  isDarkMode = false,
  initialOrderData = null
}) => {
  const [activeTab, setActiveTab] = useState<string>('Orders');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Menu Products State
  const [availableProducts, setAvailableProducts] = useState<{ name: string; price: number }[]>(defaultMenu);
  const [cafeSettings, setCafeSettings] = useState({ cafeName: 'BrewMaster', branchLocation: 'Downtown Branch', logoUrl: '' });

  // Form State: Event Details (Initial 100% Blank for Manual Entry)
  const [eventName, setEventName] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [deliveryTime, setDeliveryTime] = useState<string>('');

  // Form State: Customer Information (Initial 100% Blank for Manual Entry)
  const [customerName, setCustomerName] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Form State: Order Items (Initial 100% Empty)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Product Selection & Autocomplete State (Initial Qty = 0)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<{ name: string; price: number } | null>(null);
  const [addQty, setAddQty] = useState<string>('0');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState<boolean>(false);

  // Input Refs for smooth Enter key navigation
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const qtyInputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement | null>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsContainerRef.current &&
        !suggestionsContainerRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Payment Summary State (Initial Advance = 0)
  const [advanceReceived, setAdvanceReceived] = useState<string>('0');

  // Custom Item Modal State
  const [isCustomItemOpen, setIsCustomItemOpen] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');

  const clearDraft = () => {
    sessionStorage.removeItem('cafe_book_order_draft');
  };

  // Fetch Live POS Products and Settings on Load & Restore Draft or Pre-fill Form
  useEffect(() => {
    const savedDraftStr = sessionStorage.getItem('cafe_book_order_draft');
    let savedDraft: any = null;
    if (savedDraftStr) {
      try {
        savedDraft = JSON.parse(savedDraftStr);
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }

    if (initialOrderData) {
      setEventName(initialOrderData.eventName || initialOrderData.subDetail || '');
      
      let dDate = initialOrderData.eventDateOnly || '';
      let dTime = initialOrderData.deliveryTime || '';
      if (!dDate && initialOrderData.eventDate) {
        const parts = initialOrderData.eventDate.split(' ');
        if (parts.length >= 1) dDate = parts[0];
        if (parts.length >= 2) dTime = parts.slice(1).join(' ');
      }
      setEventDate(dDate);
      setDeliveryTime(dTime);

      setCustomerName(initialOrderData.customer || '');
      setContactNumber(initialOrderData.contactNumber || '');
      setDeliveryAddress(initialOrderData.deliveryAddress || '');

      const items = (initialOrderData.orderItems && initialOrderData.orderItems.length > 0)
        ? initialOrderData.orderItems
        : parseItemsStringToObjects(initialOrderData.items);
      setOrderItems(items);

      setAdvanceReceived((initialOrderData.advanceReceived !== undefined ? initialOrderData.advanceReceived : 0).toString());
    } else if (savedDraft && savedDraft.isBookingMode) {
      setEventName(savedDraft.eventName || '');
      setEventDate(savedDraft.eventDate || '');
      setDeliveryTime(savedDraft.deliveryTime || '');
      setCustomerName(savedDraft.customerName || '');
      setContactNumber(savedDraft.contactNumber || '');
      setDeliveryAddress(savedDraft.deliveryAddress || '');
      setOrderItems(savedDraft.orderItems || []);
      setAdvanceReceived(savedDraft.advanceReceived || '0');
    } else {
      // Reset all form inputs on mount for fresh booking
      setEventName('');
      setEventDate('');
      setDeliveryTime('');
      setCustomerName('');
      setContactNumber('');
      setDeliveryAddress('');
      setOrderItems([]);
      setSearchQuery('');
      setSelectedProduct(null);
      setAddQty('0');
      setAdvanceReceived('0');
    }

    apiGetSettings()
      .then((data) => { if (data) setCafeSettings(data); })
      .catch(() => {});

    apiGetProducts()
      .then((data) => {
        if (Array.isArray(data)) {
          const activeOnly = data.filter((p: any) => p.status !== 'Inactive' && p.status !== 'inactive');
          const formatted = activeOnly.map((p: any) => ({
            name: p.name,
            price: p.price || 50
          }));
          setAvailableProducts(formatted);
        }
      })
      .catch((err) => console.log('Using default order menu products:', err));
  }, [initialOrderData]);

  // Persist live draft to sessionStorage so user can switch pages without losing form data
  useEffect(() => {
    const hasData = Boolean(
      eventName || eventDate || deliveryTime || customerName || contactNumber || deliveryAddress || orderItems.length > 0 || (advanceReceived && advanceReceived !== '0')
    );

    if (hasData || initialOrderData) {
      const draftObj = {
        isBookingMode: true,
        initialOrderData,
        eventName,
        eventDate,
        deliveryTime,
        customerName,
        contactNumber,
        deliveryAddress,
        orderItems,
        advanceReceived
      };
      sessionStorage.setItem('cafe_book_order_draft', JSON.stringify(draftObj));
    }
  }, [eventName, eventDate, deliveryTime, customerName, contactNumber, deliveryAddress, orderItems, advanceReceived, initialOrderData]);

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

  const handleBack = () => {
    clearDraft();
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('Orders');
    }
  };

  // Filtered Suggestion Items
  const filteredSuggestions = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Select a product from suggestions
  const handleSelectProduct = (prod: { name: string; price: number }) => {
    setSelectedProduct(prod);
    setSearchQuery(prod.name);
    setIsSuggestionsOpen(false);
    // Focus Qty input automatically
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  // Handle Search Input KeyDown (Enter Key)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleSelectProduct(filteredSuggestions[0]);
      }
    }
  };

  // Item Quantity Adjuster in Table
  const handleUpdateQty = (id: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.qty + delta);
          return {
            ...item,
            qty: newQty,
            total: newQty * item.price
          };
        }
        return item;
      })
    );
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add selected product to order table
  const handleAddProductToOrder = () => {
    const targetProd = selectedProduct || availableProducts.find(p => p.name.toLowerCase() === searchQuery.toLowerCase()) || filteredSuggestions[0];
    
    if (!targetProd) {
      showToast('Please search and select a valid product!');
      return;
    }

    const qtyNum = parseInt(addQty) > 0 ? parseInt(addQty) : 1;
    const priceNum = targetProd.price;

    // Check if item already exists
    const existing = orderItems.find((i) => i.name.toLowerCase() === targetProd.name.toLowerCase());
    if (existing) {
      setOrderItems((prev) =>
        prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                qty: item.qty + qtyNum,
                total: (item.qty + qtyNum) * item.price
              }
            : item
        )
      );
    } else {
      const newItem: OrderItem = {
        id: Date.now().toString(),
        name: targetProd.name,
        qty: qtyNum,
        price: priceNum,
        total: qtyNum * priceNum
      };
      setOrderItems((prev) => [...prev, newItem]);
    }

    showToast(`Added ${qtyNum}x ${targetProd.name} (₹${qtyNum * priceNum})`);

    // Reset Selection Bar and focus back to Search
    setSearchQuery('');
    setSelectedProduct(null);
    setAddQty('0');
    setIsSuggestionsOpen(false);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  // Handle Qty Input KeyDown (Enter Key)
  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProductToOrder();
    }
  };

  // Add custom item handler
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customPrice) return;
    const priceNum = parseFloat(customPrice) || 0;
    const newItem: OrderItem = {
      id: Date.now().toString(),
      name: customName,
      qty: 1,
      price: priceNum,
      total: priceNum
    };
    setOrderItems((prev) => [...prev, newItem]);
    showToast(`Added custom item "${customName}"`);
    setCustomName('');
    setCustomPrice('');
    setIsCustomItemOpen(false);
  };

  // Payment Calculations
  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = subtotal;
  const advanceNum = parseFloat(advanceReceived) || 0;
  const balanceDue = Math.max(0, totalAmount - advanceNum);

  // Submit or Update Booking
  const handleConfirmBooking = async () => {
    if (orderItems.length === 0) {
      showToast('Please add at least one item to the order');
      return;
    }

    const isEditMode = Boolean(initialOrderData && (initialOrderData.id || initialOrderData._id));
    const orderId = initialOrderData?.id || initialOrderData?._id || Date.now().toString();
    const orderCode = initialOrderData?.code || `#FN-0${Math.floor(Math.random() * 90 + 10)}`;

    const payload = {
      id: orderId,
      _id: orderId,
      code: orderCode,
      customer: customerName || eventName || 'Function Booking',
      subDetail: eventName || '-',
      eventDate: `${eventDate} ${deliveryTime}`.trim(),
      eventDateOnly: eventDate,
      deliveryTime: deliveryTime,
      contactNumber: contactNumber,
      deliveryAddress: deliveryAddress,
      eventName: eventName,
      items: orderItems.map((i) => `${i.qty}x ${i.name}`).join(', '),
      orderItems: orderItems,
      amount: totalAmount,
      advanceReceived: advanceNum,
      balanceDue: balanceDue,
      status: initialOrderData?.status || 'Pending'
    };

    try {
      let saved;
      if (isEditMode) {
        saved = await apiUpdateOrder(orderId, payload);
      } else {
        saved = await apiCreateOrder(payload);
      }
      if (onConfirmBooking) onConfirmBooking(saved || payload);
    } catch {
      if (onConfirmBooking) onConfirmBooking(payload);
    }

    clearDraft();
    showToast(isEditMode ? `Order ${orderCode} updated successfully!` : 'Event Order successfully booked in database!');
    setTimeout(() => {
      if (onBack) onBack();
      else if (onNavigate) onNavigate('Orders');
    }, 1200);
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

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6 w-full">
          
          {/* Header Action Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {initialOrderData ? `Edit Event Order (${initialOrderData.code})` : 'Book New Event Order'}
              </h1>
              <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {initialOrderData ? 'Update catering, customer & payment details for this order.' : 'Reserve catering & bulk orders for seminars, weddings, or functions.'}
              </p>
            </div>

            <button
              onClick={handleBack}
              className={`border font-semibold px-4 py-2 rounded-xl text-xs shadow-2xs transition cursor-pointer ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel & Go Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Event & Order Items Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card 1: Event Details */}
              <div className={`rounded-2xl border shadow-2xs p-6 space-y-4 transition-colors ${
                isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-gray-200/80'
              }`}>
                <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Event Details</h3>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                      Event / Function Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Corporate Dinner"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition ${
                        isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                        Event Date *
                      </label>
                      <div className="relative flex items-center">
                        <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3.5" />
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition ${
                            isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                        Delivery / Serving Time *
                      </label>
                      <div className="relative flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 absolute left-3.5" />
                        <input
                          type="time"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition ${
                            isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Customer Information */}
              <div className={`rounded-2xl border shadow-2xs p-6 space-y-4 transition-colors ${
                isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-gray-200/80'
              }`}>
                <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Customer Details</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                      Customer / Client Name *
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-gray-400 absolute left-3.5" />
                      <input
                        type="text"
                        placeholder="Client full name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition ${
                          isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                      Contact Number *
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5" />
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition ${
                          isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Delivery Address / Venue
                  </label>
                  <div className="relative flex items-start">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <textarea
                      rows={2}
                      placeholder="Full venue address..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={`w-full border rounded-xl pl-10 p-3 text-sm font-medium outline-none transition resize-none ${
                        isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                      }`}
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Card 3: Order Items with Live Search & Enter Workflow */}
              <div className={`rounded-2xl border shadow-2xs p-6 space-y-4 transition-colors ${
                isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-gray-200/80'
              }`}>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Order Items
                  </h3>
                  <button 
                    onClick={() => setIsCustomItemOpen(true)}
                    className="text-xs font-bold text-[#f97316] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Item</span>
                  </button>
                </div>

                {/* Live Autocomplete Search Bar */}
                <div 
                  ref={suggestionsContainerRef}
                  className={`p-3 rounded-xl border relative flex flex-col sm:flex-row items-center gap-3 ${
                    isDarkMode ? 'bg-[#0f172a]/70 border-slate-700' : 'bg-slate-50/70 border-gray-200/80'
                  }`}
                >
                  {/* Search Product Box with Live Suggestions */}
                  <div className="flex-1 relative w-full">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search product (e.g. Cold Coffee, Veg Puff)..."
                        value={searchQuery}
                        onFocus={() => {
                          if (searchQuery.trim().length > 0) {
                            setIsSuggestionsOpen(true);
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSearchQuery(val);
                          setSelectedProduct(null);
                          setIsSuggestionsOpen(val.trim().length > 0);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none transition ${
                          isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white focus:border-amber-500' : 'bg-white border-gray-200 text-gray-900 focus:border-amber-500 shadow-2xs'
                        }`}
                      />
                    </div>

                    {/* Autocomplete Dropdown - Only show when at least 1 character is typed */}
                    {isSuggestionsOpen && searchQuery.trim().length > 0 && filteredSuggestions.length > 0 && (
                      <div className={`absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border shadow-xl max-h-52 overflow-y-auto scrollbar-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800'
                      }`}>
                        {filteredSuggestions.map((prod) => (
                          <div
                            key={prod.name}
                            onClick={() => handleSelectProduct(prod)}
                            className={`px-4 py-2.5 text-xs font-medium cursor-pointer flex items-center justify-between border-b last:border-b-0 transition-colors ${
                              isDarkMode ? 'border-slate-700/50 hover:bg-slate-700' : 'border-gray-100 hover:bg-amber-50/80'
                            }`}
                          >
                            <span className="font-bold">{prod.name}</span>
                            <span className="font-bold text-amber-600">₹{prod.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity Input */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Qty:</span>
                    <input
                      ref={qtyInputRef}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={addQty}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setAddQty(e.target.value)}
                      onKeyDown={handleQtyKeyDown}
                      className={`w-20 border rounded-xl px-3 py-2 text-xs font-bold text-center outline-none transition ${
                        isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white focus:border-amber-500' : 'bg-white border-gray-200 text-gray-900 focus:border-amber-500 shadow-2xs'
                      }`}
                    />

                    {/* Add to Order Button */}
                    <button
                      onClick={handleAddProductToOrder}
                      className="bg-[#f97316] hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition active:scale-[0.98] w-full sm:w-auto shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Items Table List */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        <th className="pb-2 pl-2">Product</th>
                        <th className="pb-2 text-center">Qty</th>
                        <th className="pb-2 text-right">Unit Price</th>
                        <th className="pb-2 pr-2 text-right">Total Amount</th>
                        <th className="pb-2 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {orderItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 text-xs font-medium">
                            No items added yet. Search and add products above.
                          </td>
                        </tr>
                      ) : (
                        orderItems.map((item) => (
                          <tr key={item.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/20'}`}>
                            <td className="py-3 pl-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 font-bold shrink-0">
                                  <Coffee className="w-4 h-4" />
                                </div>
                                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</span>
                              </div>
                            </td>

                            {/* Qty Controls */}
                            <td className="py-3 text-center">
                              <div className={`inline-flex items-center border rounded-lg p-0.5 ${
                                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-gray-200'
                              }`}>
                                <button 
                                  onClick={() => handleUpdateQty(item.id, -1)}
                                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className={`w-10 text-center font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.qty}</span>
                                <button 
                                  onClick={() => handleUpdateQty(item.id, 1)}
                                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Unit Price */}
                            <td className={`py-3 text-right font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                              ₹{item.price.toFixed(2)}
                            </td>

                            {/* Total Amount */}
                            <td className={`py-3 pr-2 text-right font-bold ${isDarkMode ? 'text-amber-400' : 'text-[#8b4513]'}`}>
                              ₹{item.total.toFixed(2)}
                            </td>

                            {/* Remove Action */}
                            <td className="py-3 text-center">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-gray-400 hover:text-red-500 p-1 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

            {/* Right Column: Order Summary & Confirmation */}
            <div className="space-y-6">
              
              <div className={`rounded-2xl border shadow-2xs p-6 space-y-5 sticky top-20 transition-colors ${
                isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-gray-200/80'
              }`}>
                <h3 className={`text-base font-bold pb-3 border-b ${isDarkMode ? 'text-white border-slate-800' : 'text-gray-900 border-gray-100'}`}>
                  Booking Summary
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Total Items</span>
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orderItems.length} items</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Order Gross Total</span>
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-600 font-semibold">
                    <span>Advance Payment Paid (-)</span>
                    <span>- ₹{advanceNum.toFixed(2)}</span>
                  </div>

                  <div className={`pt-3 border-t flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Net Balance Due</span>
                    <span className="text-xl font-extrabold text-[#f97316]">₹{balanceDue.toFixed(2)}</span>
                  </div>
                </div>

                {/* Advance Received Input */}
                <div className="pt-2">
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Manual Advance Payment Entry (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={advanceReceived}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAdvanceReceived(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-600 outline-none transition ${
                      isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-50/60 border-gray-200'
                    }`}
                  />
                </div>

                {/* Confirm / Update Booking Button */}
                <button
                  onClick={handleConfirmBooking}
                  className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span>{initialOrderData ? 'Update Event Booking' : 'Confirm Event Booking'}</span>
                </button>
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Custom Item Modal */}
      {isCustomItemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
            isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Add Custom Menu Item</h3>
              <button onClick={() => setIsCustomItemOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Special Catering Cake"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2 text-sm font-medium outline-none ${
                    isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Unit Price (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2 text-sm font-medium outline-none ${
                    isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomItemOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#f97316] hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  Add Custom Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
