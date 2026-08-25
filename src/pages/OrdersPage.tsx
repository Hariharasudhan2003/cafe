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
  CheckCircle2
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { BookNewOrderPage } from './BookNewOrderPage';
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
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ 
  onNavigate, 
  isDarkMode = false,
  cafeName,
  branchLocation,
  logoUrl
}) => {
  const [activeTab, setActiveTab] = useState<string>('Orders');
  const [eventOrders, setEventOrders] = useState<EventOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [selectedOrder, setSelectedOrder] = useState<EventOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<EventOrder | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isBookingMode, setIsBookingMode] = useState<boolean>(false);
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
        if (Array.isArray(data) && data.length > 0) {
          const formatted: EventOrder[] = data.map((o: any) => ({
            id: o._id || o.id || o.code,
            code: o.code || `#FN-0${Math.floor(Math.random() * 90 + 10)}`,
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
          }));
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

  // Calculate Urgent Upcoming Orders (within 1 day gap from current date)
  const isWithinOneDay = (dateStr: string) => {
    if (!dateStr) return false;
    const orderDate = new Date(dateStr);
    if (isNaN(orderDate.getTime())) return false;
    const now = new Date();
    const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffInDays = Math.round((orderDay - today) / (1000 * 60 * 60 * 24));
    return diffInDays >= 0 && diffInDays <= 1;
  };

  const upcomingAlerts = eventOrders
    .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled' && isWithinOneDay(o.eventDate))
    .map(o => {
      const orderDate = new Date(o.eventDate);
      const now = new Date();
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffInDays = Math.round((orderDay - today) / (1000 * 60 * 60 * 24));
      return {
        code: o.code,
        customer: o.customer,
        date: o.eventDate,
        gapText: diffInDays === 0 ? "Event is Today!" : "1 Day Gap (Tomorrow)"
      };
    });

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
        onConfirmBooking={(savedOrder) => {
          setEventOrders((prev) => {
            const exists = prev.some((o) => o.id === savedOrder.id || o.code === savedOrder.code);
            if (exists) {
              return prev.map((o) => (o.id === savedOrder.id || o.code === savedOrder.code ? { ...o, ...savedOrder } : o));
            }
            return [savedOrder, ...prev];
          });
          setIsBookingMode(false);
          setEditingOrder(null);
          showToast(`Saved Order ${savedOrder.code}!`);
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

    const nextNum = eventOrders.length + 95;
    const newOrd: EventOrder = {
      id: Date.now().toString(),
      code: `#FN-0${nextNum}`,
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
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar Component */}
        <Navbar 
          activeView={activeTab}
          onViewChange={(view) => handleTabChange(view)}
          onCreateBill={() => handleTabChange('POS Billing')}
          isDarkMode={isDarkMode}
          cafeName={settings.cafeName}
          logoUrl={settings.logoUrl}
          upcomingAlerts={upcomingAlerts}
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
          
          {/* Urgent Order Alert Banner (within 1 day gap) */}
          {upcomingAlerts.length > 0 && (
            <div className="bg-amber-500/15 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-extrabold text-sm">Upcoming Order Alert (1 Day Gap / Today)</h4>
                  <p className="text-xs opacity-90">
                    {upcomingAlerts.length} order(s) scheduled soon: {upcomingAlerts.map(a => `${a.code} (${a.customer} - ${a.gapText})`).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orders</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage function pre-orders and event deliveries.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Input Box */}
              <div className="relative bg-white border border-gray-200 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-semibold text-gray-700 shadow-2xs">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="outline-none bg-transparent text-xs text-gray-700 cursor-pointer font-medium"
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
            
            {/* Card 1: Today's Deliveries */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/80 shadow-2xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">TODAY'S DELIVERIES</span>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">12</h3>
              </div>
            </div>

            {/* Card 2: Pending Pre-Orders */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/80 shadow-2xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">PENDING PRE-ORDERS</span>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">5</h3>
              </div>
            </div>

            {/* Card 3: Total Function Rev */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/80 shadow-2xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">TOTAL FUNCTION REV</span>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">₹24,500</h3>
              </div>
            </div>

          </div>

          {/* Event Orders Table Box */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">Event Orders</h3>
              <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-5">ORDER ID</th>
                    <th className="py-4 px-4">CUSTOMER</th>
                    <th className="py-4 px-4">EVENT DATE</th>
                    <th className="py-4 px-4">ITEMS</th>
                    <th className="py-4 px-4">AMOUNT</th>
                    <th className="py-4 px-4">STATUS</th>
                    <th className="py-4 px-5 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {eventOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 font-medium">
                        No event orders booked yet. Click "Book New Order" to create one.
                      </td>
                    </tr>
                  ) : (
                    eventOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-amber-50/30 transition-colors">
                        {/* ORDER ID */}
                        <td className="py-4 px-5 font-bold text-gray-900">
                          {order.code}
                        </td>

                        {/* CUSTOMER */}
                        <td className="py-4 px-4 font-bold text-gray-900 text-sm">
                          {order.customer}
                          <span className="block text-xs font-normal text-gray-400 mt-0.5">{order.subDetail}</span>
                        </td>

                        {/* EVENT DATE */}
                        <td className="py-4 px-4 font-medium text-gray-600">
                          {order.eventDate}
                        </td>

                        {/* ITEMS */}
                        <td className="py-4 px-4 font-medium text-gray-600 max-w-xs truncate">
                          {order.items}
                        </td>

                        {/* AMOUNT */}
                        <td className="py-4 px-4 font-extrabold text-gray-900 text-sm">
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
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 text-gray-400 hover:text-[#78350f] hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title="View Order Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title="Edit Order"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id, order.code)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
                  const ordToEdit = selectedOrder;
                  setSelectedOrder(null);
                  handleEditOrder(ordToEdit);
                }}
                className="flex-1 border border-amber-500 text-amber-700 hover:bg-amber-50 font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Order</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 bg-[#78350f] hover:bg-[#5c280b] text-white font-semibold py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer"
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

    </div>
  );
};
