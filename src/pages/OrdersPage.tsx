import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Clock, 
  Wallet, 
  Calendar as CalendarIcon, 
  Plus, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2,
  Printer
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { BookNewOrderPage } from './BookNewOrderPage';
import { ReceiptModal, type ReceiptData } from '../components/ReceiptModal';
import { apiGetOrders, apiGetSettings, apiUpdateOrder, apiDeleteOrder } from '../services/api';

export interface EventOrder {
  id: string;
  code: string;
  customer: string;
  subDetail?: string;
  eventDate: string;
  items: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  advanceReceived?: number;
  balanceDue?: number;
  contactNumber?: string;
  deliveryAddress?: string;
  eventName?: string;
  eventDateOnly?: string;
  deliveryTime?: string;
  orderItems?: any[];
}

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

interface OrdersPageProps {
  onNavigate?: (tab: string) => void;
  isDarkMode?: boolean;
  cafeName?: string;
  branchLocation?: string;
  logoUrl?: string;
  globalGst?: number;
  taxInclusive?: boolean;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ 
  onNavigate, 
  isDarkMode = false,
  cafeName,
  branchLocation,
  logoUrl,
  globalGst = 18,
  taxInclusive = true
}) => {
  const [activeTab, setActiveTab] = useState<string>('Orders');
  const [eventOrders, setEventOrders] = useState<EventOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [selectedOrder, setSelectedOrder] = useState<EventOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<EventOrder | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isBookingMode, setIsBookingMode] = useState<boolean>(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    cafeName: cafeName || 'BrewMaster',
    branchLocation: branchLocation || 'Downtown Branch',
    logoUrl: logoUrl || ''
  });

  useEffect(() => {
    apiGetSettings()
      .then((data) => {
        if (data) {
          setSettings({
            cafeName: data.cafeName || 'BrewMaster',
            branchLocation: data.branchLocation || 'Downtown Branch',
            logoUrl: data.logoUrl || ''
          });
        }
      })
      .catch(() => {});

    apiGetOrders()
      .then((data) => {
        if (Array.isArray(data)) {
          const formatted: EventOrder[] = data.map((o: any, idx: number) => {
            const seqCode = `#FN-${String(idx + 1).padStart(3, '0')}`;
            return {
              id: o._id || o.id || o.code,
              code: o.code && o.code.startsWith('#FN-') ? o.code : seqCode,
              customer: o.customer,
              subDetail: o.subDetail || o.eventName || '-',
              eventDate: o.eventDate,
              items: o.items,
              amount: o.amount,
              status: o.status || 'Pending',
              advanceReceived: o.advanceReceived !== undefined ? o.advanceReceived : 0,
              balanceDue: o.balanceDue !== undefined ? o.balanceDue : Math.max(0, (o.amount || 0) - (o.advanceReceived || 0)),
              contactNumber: o.contactNumber || '',
              deliveryAddress: o.deliveryAddress || '',
              eventName: o.eventName || o.subDetail || '',
              eventDateOnly: o.eventDateOnly || '',
              deliveryTime: o.deliveryTime || '',
              orderItems: o.orderItems || []
            };
          });
          setEventOrders(formatted);
        }
      })
      .catch((err) => console.log('Using default orders fallback:', err));
  }, []);

  // Restore booking mode if draft exists when returning to Orders tab
  useEffect(() => {
    const savedDraftStr = sessionStorage.getItem('cafe_book_order_draft');
    if (savedDraftStr) {
      try {
        const draft = JSON.parse(savedDraftStr);
        if (draft && draft.isBookingMode) {
          setIsBookingMode(true);
          if (draft.initialOrderData) {
            setEditingOrder(draft.initialOrderData);
          }
        }
      } catch (err) {
        console.error('Failed to parse order draft:', err);
      }
    }
  }, []);

  // Calculate Days Gap between eventDate and today (supports 1 or 2 day gap alerts)
  const getEventDaysGap = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const orderDate = new Date(dateStr);
    if (isNaN(orderDate.getTime())) return null;

    const now = new Date();
    const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((orderDay - today) / (1000 * 60 * 60 * 24));
  };

  // Filter Upcoming Alerts for 1 day or 2 day gap
  const upcomingAlerts = eventOrders
    .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')
    .map(o => {
      const gapDays = getEventDaysGap(o.eventDate);
      if (gapDays !== null && gapDays >= 0 && gapDays <= 2) {
        return {
          code: o.code,
          customer: o.customer,
          date: o.eventDate,
          gapDays,
          gapText: gapDays === 0 ? "Event is Today!" : gapDays === 1 ? "1 Day Gap (Tomorrow)" : "2 Days Gap (In 2 Days)"
        };
      }
      return null;
    })
    .filter(Boolean) as { code: string; customer: string; date: string; gapDays: number; gapText: string }[];

  // Data Analysis for Function Revenue & Orders
  const activeOrders = eventOrders.filter(o => o.status !== 'Cancelled');
  const activeFunctionRevenue = activeOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalAdvanceCollected = activeOrders.reduce((sum, o) => sum + (o.advanceReceived || 0), 0);
  const totalBalanceDuePending = activeOrders.reduce((sum, o) => sum + (o.balanceDue !== undefined ? o.balanceDue : Math.max(0, (o.amount || 0) - (o.advanceReceived || 0))), 0);

  // Form State for Booking
  const [formData, setFormData] = useState({
    customer: '',
    eventDate: '',
    items: '',
    amount: '',
    status: 'Pending' as EventOrder['status']
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditOrder = (order: EventOrder) => {
    sessionStorage.removeItem('cafe_book_order_draft');
    setEditingOrder(order);
    setIsBookingMode(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: EventOrder['status']) => {
    setEventOrders((prev) =>
      prev.map((o) => (o.id === orderId || o.code === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.code === orderId)) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    showToast(`Order status updated to "${newStatus}"!`);

    try {
      await apiUpdateOrder(orderId, { status: newStatus });
    } catch {
      // Local state is updated
    }
  };

  if (isBookingMode) {
    return (
      <BookNewOrderPage
        onNavigate={onNavigate}
        onBack={() => {
          setIsBookingMode(false);
          setEditingOrder(null);
        }}
        isDarkMode={isDarkMode}
        initialOrderData={editingOrder}
        globalGst={globalGst}
        taxInclusive={taxInclusive}
        onConfirmBooking={(savedOrder) => {
          const formatted: EventOrder = {
            id: savedOrder._id || savedOrder.id || Date.now().toString(),
            code: savedOrder.code || `#FN-${Date.now()}`,
            customer: savedOrder.customer || 'Function Booking',
            subDetail: savedOrder.subDetail || savedOrder.eventName || '-',
            eventDate: savedOrder.eventDate || '',
            items: savedOrder.items || '',
            amount: savedOrder.amount || 0,
            status: savedOrder.status || 'Pending',
            advanceReceived: savedOrder.advanceReceived || 0,
            balanceDue: savedOrder.balanceDue || 0,
            contactNumber: savedOrder.contactNumber || '',
            deliveryAddress: savedOrder.deliveryAddress || '',
            eventName: savedOrder.eventName || '',
            eventDateOnly: savedOrder.eventDateOnly || '',
            deliveryTime: savedOrder.deliveryTime || '',
            orderItems: savedOrder.orderItems || []
          };

          setEventOrders((prev) => {
            const exists = prev.some((o) => o.id === formatted.id || o.code === formatted.code);
            if (exists) {
              return prev.map((o) => (o.id === formatted.id || o.code === formatted.code ? { ...o, ...formatted } : o));
            }
            return [formatted, ...prev];
          });

          // Re-fetch from API to guarantee full database sync
          apiGetOrders().then((data) => {
            if (Array.isArray(data)) {
              setEventOrders(data.map((o: any, idx: number) => ({
                id: o._id || o.id || o.code,
                code: o.code || `#FN-${String(idx + 1).padStart(3, '0')}`,
                customer: o.customer,
                subDetail: o.subDetail || o.eventName || '-',
                eventDate: o.eventDate,
                items: o.items,
                amount: o.amount,
                status: o.status || 'Pending',
                advanceReceived: o.advanceReceived !== undefined ? o.advanceReceived : 0,
                balanceDue: o.balanceDue !== undefined ? o.balanceDue : Math.max(0, (o.amount || 0) - (o.advanceReceived || 0)),
                contactNumber: o.contactNumber || '',
                deliveryAddress: o.deliveryAddress || '',
                eventName: o.eventName || o.subDetail || '',
                eventDateOnly: o.eventDateOnly || '',
                deliveryTime: o.deliveryTime || '',
                orderItems: o.orderItems || []
              })));
            }
          }).catch(() => {});

          setIsBookingMode(false);
          setEditingOrder(null);
          showToast(`Saved Order ${formatted.code}!`);
        }}
      />
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const handleDeleteOrder = async (id: string, code: string) => {
    if (confirm(`Delete event order ${code}?`)) {
      setEventOrders((prev) => prev.filter((o) => o.id !== id && o.code !== code));
      if (selectedOrder && (selectedOrder.id === id || selectedOrder.code === code)) {
        setSelectedOrder(null);
      }
      showToast(`Deleted order ${code}`);

      try {
        await apiDeleteOrder(id);
      } catch (err) {
        console.log('Order deleted locally:', err);
      }
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer || !formData.amount) return;

    const nextNum = eventOrders.length + 1;
    const newOrd: EventOrder = {
      id: Date.now().toString(),
      code: `#FN-${String(nextNum).padStart(3, '0')}`,
      customer: formData.customer,
      subDetail: '-',
      eventDate: formData.eventDate || 'Dec 22, 2023 02:00 PM',
      items: formData.items || 'Standard Refreshment Pack',
      amount: parseFloat(formData.amount) || 0,
      status: formData.status
    };

    setEventOrders([newOrd, ...eventOrders]);
    showToast(`Booked Order ${newOrd.code}`);
    setIsBookModalOpen(false);
    setFormData({
      customer: '',
      eventDate: '',
      items: '',
      amount: '',
      status: 'Pending'
    });
  };

  const handlePrintOrder = (order: EventOrder) => {
    const itemsList = order.items.split(',').map(i => {
      const parts = i.trim().split('x ');
      if (parts.length > 1) {
        return { quantity: parseInt(parts[0]) || 1, name: parts.slice(1).join('x '), price: Math.round(order.amount / (parseInt(parts[0]) || 1)) };
      }
      return { quantity: 1, name: i.trim() || 'Event Order Package', price: order.amount };
    });

    const isTaxEnabled = taxInclusive !== false && (globalGst ?? 18) > 0;
    const effectiveGstRate = isTaxEnabled ? (globalGst ?? 18) : 0;
    const sub = order.amount;
    const gstVal = isTaxEnabled ? Math.round(sub * (effectiveGstRate / 100)) : 0;
    const grand = sub + gstVal;

    setActiveReceipt({
      billNo: order.code,
      date: order.eventDate,
      customerName: order.customer,
      servedBy: `${order.customer} (Event Order)`,
      items: itemsList.length > 0 ? itemsList : [{ name: 'Event Order Catering', quantity: 1, price: order.amount }],
      subtotal: sub,
      gstRate: effectiveGstRate,
      cgst: gstVal / 2,
      sgst: gstVal / 2,
      grandTotal: grand,
      paymentMethod: 'Cash / Event',
      cafeName: settings.cafeName,
      branchLocation: settings.branchLocation,
      logoUrl: settings.logoUrl
    });
  };

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
        cafeName={settings.cafeName}
        branchLocation={settings.branchLocation}
        logoUrl={settings.logoUrl}
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
          cafeName={settings.cafeName}
          logoUrl={settings.logoUrl}
          upcomingAlerts={upcomingAlerts}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6">
          
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Orders</h1>
              <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage function pre-orders and event deliveries.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Input Box */}
              <div className={`relative border rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-semibold shadow-2xs ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-700'
              }`}>
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`outline-none bg-transparent text-xs cursor-pointer font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                />
              </div>

              {/* Book New Order Button */}
              <button
                onClick={() => {
                  sessionStorage.removeItem('cafe_book_order_draft');
                  setEditingOrder(null);
                  setIsBookingMode(true);
                }}
                className="bg-[#78350f] hover:bg-[#5c280b] text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Book New Order</span>
              </button>
            </div>
          </div>

          {/* Top 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Total Orders */}
            <div className={`rounded-2xl p-5 border shadow-2xs hover:shadow-md transition-all duration-200 flex items-center gap-4 ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800 text-white' : 'bg-white border-orange-100/80 text-gray-900'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">TOTAL ORDERS</span>
                <h3 className={`text-2xl font-extrabold tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{eventOrders.length}</h3>
                <span className="text-[11px] font-semibold text-gray-500 block mt-0.5">
                  {eventOrders.filter(o => o.status === 'Completed').length} Done · {eventOrders.filter(o => o.status === 'Pending').length} Pending
                </span>
              </div>
            </div>

            {/* Card 2: Pending Pre-Orders */}
            <div className={`rounded-2xl p-5 border shadow-2xs hover:shadow-md transition-all duration-200 flex items-center gap-4 ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800 text-white' : 'bg-white border-orange-100/80 text-gray-900'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">PENDING PRE-ORDERS</span>
                <h3 className={`text-2xl font-extrabold tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {eventOrders.filter(o => o.status === 'Pending').length}
                </h3>
                <span className="text-[11px] font-semibold text-amber-600 block mt-0.5">
                  Awaiting Event Delivery
                </span>
              </div>
            </div>

            {/* Card 3: Analyzed Total Function Revenue */}
            <div className={`rounded-2xl p-5 border shadow-2xs hover:shadow-md transition-all duration-200 flex items-center gap-4 ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800 text-white' : 'bg-white border-orange-100/80 text-gray-900'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">TOTAL FUNCTION REV</span>
                <h3 className={`text-2xl font-extrabold tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₹{activeFunctionRevenue.toLocaleString()}
                </h3>
                <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">
                  Rec: ₹{totalAdvanceCollected.toLocaleString()} · Due: ₹{totalBalanceDuePending.toLocaleString()}
                </span>
              </div>
            </div>

          </div>

          {/* Event Orders Table Box */}
          <div className={`rounded-2xl border shadow-2xs overflow-hidden ${
            isDarkMode ? 'bg-[#1e293b] border-slate-800 text-white' : 'bg-white border-gray-200/80 text-gray-900'
          }`}>
            
            <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-base font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Event Orders</h3>
              <button className={`p-1.5 rounded-lg transition ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                    isDarkMode ? 'bg-slate-800/80 border-slate-800 text-white' : 'bg-slate-50/50 border-gray-100 text-gray-400'
                  }`}>
                    <th className="py-4 px-5">ORDER ID</th>
                    <th className="py-4 px-4">CUSTOMER</th>
                    <th className="py-4 px-4">EVENT DATE</th>
                    <th className="py-4 px-4">ITEMS</th>
                    <th className="py-4 px-4">AMOUNT</th>
                    <th className="py-4 px-4">STATUS</th>
                    <th className="py-4 px-5 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${isDarkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                  {eventOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`py-8 text-center font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-400'}`}>
                        No event orders booked yet. Click "Book New Order" to create one.
                      </td>
                    </tr>
                  ) : (
                    eventOrders.map((order) => (
                      <tr key={order.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/30'}`}>
                        {/* ORDER ID */}
                        <td className={`py-4 px-5 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {order.code}
                        </td>

                        {/* CUSTOMER */}
                        <td className={`py-4 px-4 font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {order.customer}
                          <span className={`block text-xs font-normal mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{order.subDetail}</span>
                        </td>

                        {/* EVENT DATE */}
                        <td className={`py-4 px-4 font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-600'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                            <span>{order.eventDate}</span>
                            {(() => {
                              const gap = getEventDaysGap(order.eventDate);
                              if (gap !== null && gap >= 0 && gap <= 2 && order.status !== 'Completed' && order.status !== 'Cancelled') {
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold w-max ${
                                    gap === 0 ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse' :
                                    gap === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                    'bg-sky-100 text-sky-800 border border-sky-300'
                                  }`}>
                                    🔔 {gap === 0 ? 'Today!' : `${gap} Day Gap`}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>

                        {/* ITEMS */}
                        <td className={`py-4 px-4 font-medium max-w-xs truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-600'}`}>
                          {order.items}
                        </td>

                        {/* AMOUNT */}
                        <td className={`py-4 px-4 font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          ₹{order.amount.toLocaleString()}
                        </td>

                        {/* STATUS SELECTOR IN TABLE */}
                        <td className="py-4 px-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                            className={`text-xs font-bold rounded-full px-2.5 py-1 border outline-none cursor-pointer transition shadow-2xs ${
                              order.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              order.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>

                        {/* ACTION */}
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrintOrder(order)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isDarkMode ? 'text-slate-300 hover:text-emerald-400 hover:bg-slate-800' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title="Print Order Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-[#78350f] hover:bg-amber-50'
                              }`}
                              title="View Order Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditOrder(order)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                              title="Edit Order"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id, order.code)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isDarkMode ? 'text-slate-300 hover:text-rose-400 hover:bg-slate-800' : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title="Delete Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </main>
      </div>

      {/* View Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider block">
                  {selectedOrder.code}
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedOrder.customer}
                </h3>
                {selectedOrder.subDetail && selectedOrder.subDetail !== '-' && (
                  <p className="text-xs text-gray-500 font-medium">{selectedOrder.subDetail}</p>
                )}
              </div>
              
              {/* Interactive Status Selector inside View Modal */}
              <select
                value={selectedOrder.status}
                onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold border outline-none cursor-pointer transition shadow-2xs ${
                  selectedOrder.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  selectedOrder.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-3 text-xs mb-5">
              {/* Event Date */}
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                  Event Date & Time:
                </span>
                <span className="font-bold text-gray-900">{selectedOrder.eventDate}</span>
              </div>

              {/* Contact Phone */}
              {selectedOrder.contactNumber && (
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-semibold">Contact Phone:</span>
                  <span className="font-bold text-gray-900">{selectedOrder.contactNumber}</span>
                </div>
              )}

              {/* Venue Address */}
              {selectedOrder.deliveryAddress && (
                <div className="py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-semibold block mb-0.5">Venue Address:</span>
                  <span className="font-medium text-gray-800">{selectedOrder.deliveryAddress}</span>
                </div>
              )}

              {/* Items List */}
              <div className="py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-semibold block mb-1">Items Included:</span>
                <div className="font-semibold text-gray-800 bg-slate-50 p-2.5 rounded-lg border border-gray-100">
                  {selectedOrder.items}
                </div>
              </div>

              {/* Financial Breakup */}
              <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/60 space-y-2 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-bold">Total Order Amount:</span>
                  <span className="text-sm font-extrabold text-gray-900">₹{selectedOrder.amount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-emerald-700">
                  <span className="font-bold">Advance Paid:</span>
                  <span className="text-sm font-extrabold">₹{(selectedOrder.advanceReceived || 0).toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-amber-200/80">
                  <span className="text-sm font-extrabold text-gray-900">Net Balance Due to Pay:</span>
                  <span className="text-base font-black text-[#f97316]">
                    ₹{(selectedOrder.balanceDue !== undefined ? selectedOrder.balanceDue : Math.max(0, selectedOrder.amount - (selectedOrder.advanceReceived || 0))).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  handlePrintOrder(selectedOrder);
                }}
                className="flex-1 bg-[#8b4513] hover:bg-[#70370f] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={() => {
                  const ordToEdit = selectedOrder;
                  setSelectedOrder(null);
                  handleEditOrder(ordToEdit);
                }}
                className="flex-1 border border-amber-500 text-amber-600 hover:bg-amber-50 font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Order</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className={`flex-1 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book New Order Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 relative">
            <button
              onClick={() => setIsBookModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Book Function Pre-Order
            </h3>

            <form onSubmit={handleCreateOrder} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Customer / Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corporate Dinner"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Event Date & Time
                </label>
                <input
                  type="text"
                  placeholder="Dec 24, 2023 06:00 PM"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Items Summary
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100x Coffee, 100x Veg Puff"
                  value={formData.items}
                  onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#78350f] hover:bg-[#5c280b] text-white font-semibold py-2.5 rounded-xl text-sm shadow-md"
                >
                  Save Booking
                </button>
              </div>
            </form>
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
