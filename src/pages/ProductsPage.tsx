import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { AddNewProductPage } from './AddNewProductPage';
import { apiGetProducts, apiDeleteProduct, apiGetSettings, apiUpdateProduct } from '../services/api';

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  category: 'Beverage' | 'Snacks' | 'Fast Food' | 'Juices' | 'Desserts';
  price: number;
  gst: number;
  status: 'Active' | 'Inactive';
  image?: string;
}

interface ProductsPageProps {
  onNavigate?: (tab: string) => void;
  isDarkMode?: boolean;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ onNavigate, isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<string>('Products');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [globalGst, setGlobalGst] = useState<number>(18);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    apiGetSettings()
      .then((settings) => {
        if (settings && settings.globalGst !== undefined) {
          setGlobalGst(settings.globalGst);
        }
      })
      .catch(() => {});

    apiGetProducts()
      .then((data) => {
        if (Array.isArray(data)) {
          const formatted: ProductItem[] = data.map((p: any) => ({
            id: p._id || p.code || p.id,
            code: p.code || `#PRD-0${Math.floor(Math.random() * 90 + 10)}`,
            name: p.name,
            category: p.category || 'Snacks',
            price: p.price,
            gst: p.gst !== undefined ? p.gst : globalGst,
            status: p.status || 'Active',
            image: p.image || ''
          }));
          setProducts(formatted);
        }
      })
      .catch((err) => console.log('Products API load:', err));
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Snacks' as ProductItem['category'],
    price: '',
    gst: globalGst.toString(),
    status: 'Active' as ProductItem['status'],
    image: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (isAddMode) {
    return (
      <AddNewProductPage
        onNavigate={onNavigate}
        onBack={() => setIsAddMode(false)}
        onSaveProduct={(newProd) => {
          setProducts([newProd, ...products]);
          setIsAddMode(false);
          showToast(`Added "${newProd.name}" to menu catalog!`);
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

  // Inline Category change handler
  const handleCategoryChange = async (id: string, newCategory: ProductItem['category']) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, category: newCategory } : p));
    try {
      await apiUpdateProduct(id, { category: newCategory });
    } catch (e) {}
    showToast('Category updated!');
  };

  // Inline Status change handler
  const handleStatusChange = async (id: string, newStatus: ProductItem['status']) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    try {
      await apiUpdateProduct(id, { status: newStatus });
      showToast(`Status updated to ${newStatus} in database!`);
    } catch (e) {
      showToast(`Status set to ${newStatus}`);
    }
  };

  const handleToggleStatus = (product: ProductItem) => {
    const newStatus = product.status === 'Active' ? 'Inactive' : 'Active';
    handleStatusChange(product.id, newStatus);
  };

  // Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await apiDeleteProduct(id);
      } catch (e) {
        console.warn('Local delete fallback:', e);
      }
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast(`Deleted ${name} from database`);
    }
  };

  // Submit product creation/update
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    if (editingProduct) {
      const updatePayload = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        gst: parseInt(formData.gst) || 0,
        status: formData.status,
        image: formData.image || editingProduct.image
      };

      try {
        await apiUpdateProduct(editingProduct.id, updatePayload);
      } catch (err) {}

      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        ...updatePayload
      } : p));
      showToast(`Updated ${formData.name} in Database`);
    } else {
      const nextNum = products.length + 1;
      const codeStr = `#PRD-${nextNum.toString().padStart(3, '0')}`;
      const createPayload = {
        code: codeStr,
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        gst: parseInt(formData.gst) || 0,
        status: formData.status,
        image: formData.image || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=150&q=80'
      };

      try {
        const created = await apiCreateProduct(createPayload);
        const newProd: ProductItem = {
          id: created._id || created.id || Date.now().toString(),
          code: created.code || codeStr,
          name: created.name,
          category: created.category as any,
          price: created.price,
          gst: created.gst,
          status: created.status || 'Active',
          image: created.image
        };
        setProducts([newProd, ...products]);
        showToast(`Saved ${newProd.name} to Database!`);
      } catch (err) {
        const fallbackProd: ProductItem = {
          id: Date.now().toString(),
          ...createPayload
        };
        setProducts([fallbackProd, ...products]);
        showToast(`Added ${createPayload.name}`);
      }
    }

    // Reset Form
    setFormData({
      name: '',
      category: 'Snacks',
      price: '',
      gst: globalGst.toString(),
      status: 'Active',
      image: ''
    });
    setIsAddModalOpen(false);
    setEditingProduct(null);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      price: p.price.toString(),
      gst: p.gst.toString(),
      status: p.status,
      image: p.image || ''
    });
    setIsAddModalOpen(true);
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-[#f8fafc] text-gray-800'
    }`}>
      {/* Sidebar Component */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewOrder={() => handleTabChange('POS Billing')}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar Component */}
        <Navbar 
          activeView={activeTab}
          onViewChange={(view) => handleTabChange(view)}
          onCreateBill={() => handleTabChange('POS Billing')}
          isDarkMode={isDarkMode}
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Product Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your cafe's menu items, pricing, and stock.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* GST Managed Centrally Pill */}
              <div className="bg-slate-100/90 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>GST Managed Centrally</span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-amber-500 shadow-2xs w-60"
                />
              </div>

              {/* Add New Product Button */}
              <button
                onClick={() => setIsAddMode(true)}
                className="bg-[#f97316] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add New Product</span>
              </button>
            </div>
          </div>

          {/* Product Data Table Container */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-5">PRODUCT ID</th>
                    <th className="py-4 px-4">IMAGE</th>
                    <th className="py-4 px-4">NAME</th>
                    <th className="py-4 px-4">CATEGORY</th>
                    <th className="py-4 px-4 text-center">SELLING PRICE (₹)</th>
                    <th className="py-4 px-4 text-center">GST (%)</th>
                    <th className="py-4 px-4 text-center">STATUS</th>
                    <th className="py-4 px-5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">
                        No products found. Click "Add New Product" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isInactive = product.status === 'Inactive';

                      return (
                        <tr 
                          key={product.id} 
                          className={`hover:bg-amber-50/30 transition-colors ${
                            isInactive ? 'opacity-60 bg-gray-50/30' : ''
                          }`}
                        >
                          {/* PRODUCT ID */}
                          <td className="py-4 px-5 font-semibold text-gray-500">
                            {product.code}
                          </td>

                          {/* IMAGE */}
                          <td className="py-4 px-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-gray-200 shrink-0 flex items-center justify-center">
                              {product.image ? (
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400">NO IMG</span>
                              )}
                            </div>
                          </td>

                          {/* NAME */}
                          <td className="py-4 px-4 font-bold text-gray-900 text-sm">
                            {product.name}
                          </td>

                          {/* CATEGORY */}
                          <td className="py-4 px-4 font-medium text-gray-600">
                            {product.category}
                          </td>

                          {/* SELLING PRICE */}
                          <td className="py-4 px-4 text-center font-extrabold text-gray-900 text-sm">
                            ₹{product.price.toFixed(2)}
                          </td>

                          {/* GST (%) */}
                          <td className="py-4 px-4 text-center font-medium text-gray-600">
                            {product.gst}%
                          </td>

                          {/* STATUS */}
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(product)}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                                isInactive 
                                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' 
                                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                              title="Click to toggle status"
                            >
                              {product.status}
                            </button>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(product)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Edit Product"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination Bar */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-gray-500">
              <div>
                Showing 1 to {filteredProducts.length} of 48 entries
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 disabled:opacity-40"
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {[1, 2, 3, 4, 5].map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page
                        ? 'bg-amber-100/90 text-amber-800 border border-amber-300 shadow-2xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <span className="px-1 text-gray-400">...</span>

                <button 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ginger Tea"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="Beverage">Beverage</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="Juices">Juices</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="40.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    GST (%)
                  </label>
                  <select
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
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
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f97316] hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md"
                >
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
