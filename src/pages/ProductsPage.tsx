import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { AddNewProductPage } from './AddNewProductPage';
import { ManageCategoriesPage } from './ManageCategoriesPage';
import { apiGetProducts, apiDeleteProduct, apiGetSettings, apiUpdateProduct, apiCreateProduct } from '../services/api';

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  gst: number;
  status: 'Active' | 'Inactive';
  image?: string;
}

interface ProductsPageProps {
  onNavigate?: (tab: string) => void;
  isDarkMode?: boolean;
  cafeName?: string;
  branchLocation?: string;
  logoUrl?: string;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ 
  onNavigate, 
  isDarkMode = false,
  cafeName: propCafeName,
  branchLocation: propBranchLocation,
  logoUrl: propLogoUrl
}) => {
  const [activeTab, setActiveTab] = useState<string>('Products');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [isCategoryMode, setIsCategoryMode] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<string[]>([]);
  const [globalGst, setGlobalGst] = useState<number>(18);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    apiGetSettings()
      .then((settings) => {
        if (settings) {
          if (settings.globalGst !== undefined) {
            setGlobalGst(settings.globalGst);
          }
          setCafeSettings((prev) => ({
            ...prev,
            cafeName: settings.cafeName || prev.cafeName,
            branchLocation: settings.branchLocation || prev.branchLocation,
            logoUrl: settings.logoUrl !== undefined ? settings.logoUrl : prev.logoUrl
          }));
        }
      })
      .catch(() => {});

    apiGetProducts()
      .then((data) => {
        if (Array.isArray(data)) {
          const formatted: ProductItem[] = data.map((p: any, idx: number) => {
            const seqCode = `#PRD-${String(idx + 1).padStart(3, '0')}`;
            return {
              id: p._id || p.code || p.id,
              code: p.code && p.code.startsWith('#PRD-') ? p.code : seqCode,
              name: p.name,
              category: p.category || 'Snacks',
              price: p.price,
              gst: p.gst !== undefined ? p.gst : globalGst,
              status: p.status || 'Active',
              image: p.image || ''
            };
          });
          setProducts(formatted);
        }
      })
      .catch((err) => console.log('Products API load:', err));

    try {
      const saved = localStorage.getItem('cafe_custom_categories');
      if (saved) {
        setCustomCategories(JSON.parse(saved));
      }
      const savedDeleted = localStorage.getItem('cafe_deleted_categories');
      if (savedDeleted) {
        setDeletedCategories(JSON.parse(savedDeleted));
      }
    } catch (e) {}
  }, []);

  const allCategoryOptions = React.useMemo(() => {
    const base = ['Beverage', 'Snacks', 'Fast Food', 'Juices', 'Desserts'];
    const dbCats = products.map(p => p.category).filter(Boolean);
    const combined = [...base, ...customCategories, ...dbCats];
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
  }, [products, customCategories, deletedCategories]);

  const handleSaveNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (deletedCategories.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      const updatedDeleted = deletedCategories.filter(d => d.toLowerCase() !== trimmed.toLowerCase());
      setDeletedCategories(updatedDeleted);
      try {
        localStorage.setItem('cafe_deleted_categories', JSON.stringify(updatedDeleted));
      } catch (e) {}
    }

    if (!allCategoryOptions.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      try {
        localStorage.setItem('cafe_custom_categories', JSON.stringify(updated));
      } catch (e) {}
      showToast(`Category "${trimmed}" added successfully!`);
    } else {
      showToast(`Category "${trimmed}" already exists.`);
    }

    setNewCategoryName('');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const updatedCustom = customCategories.filter(c => c.toLowerCase() !== catToDelete.toLowerCase());
    setCustomCategories(updatedCustom);
    try {
      localStorage.setItem('cafe_custom_categories', JSON.stringify(updatedCustom));
    } catch (e) {}

    const updatedDeleted = Array.from(new Set([...deletedCategories, catToDelete]));
    setDeletedCategories(updatedDeleted);
    try {
      localStorage.setItem('cafe_deleted_categories', JSON.stringify(updatedDeleted));
    } catch (e) {}

    showToast(`Category "${catToDelete}" deleted successfully!`);
  };

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

  if (isCategoryMode) {
    return (
      <ManageCategoriesPage
        onNavigate={onNavigate}
        onBack={() => setIsCategoryMode(false)}
        isDarkMode={isDarkMode}
        products={products}
      />
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
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
        <main className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6">
          
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Product Management</h1>
              <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage your cafe's menu items, pricing, and stock.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 pr-4 py-2 rounded-xl text-sm outline-none focus:border-amber-500 shadow-2xs w-60 border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 text-gray-800'
                  }`}
                />
              </div>

              {/* Add Category Button */}
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Tag className="w-4 h-4 stroke-[2.5]" />
                <span>Add Category</span>
              </button>

              {/* Add New Product Button */}
              <button
                onClick={() => setIsAddMode(true)}
                className="bg-[#f97316] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add New Product</span>
              </button>
            </div>
          </div>

          {/* Product Data Table Container */}
          <div className={`rounded-2xl border shadow-2xs overflow-hidden flex flex-col justify-between ${
            isDarkMode ? 'bg-[#1e293b] border-slate-800 text-white' : 'bg-white border-gray-200/80 text-gray-900'
          }`}>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                    isDarkMode ? 'bg-slate-800/80 border-slate-800 text-white' : 'bg-slate-50/60 border-gray-100 text-gray-400'
                  }`}>
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
                <tbody className={`divide-y text-xs ${isDarkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`py-8 text-center font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-400'}`}>
                        No products found. Click "Add New Product" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isInactive = product.status === 'Inactive';

                      return (
                        <tr 
                          key={product.id} 
                          className={`transition-colors ${
                            isInactive 
                              ? (isDarkMode ? 'opacity-50 bg-slate-900/40' : 'opacity-60 bg-gray-50/30') 
                              : (isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/30')
                          }`}
                        >
                          {/* PRODUCT ID */}
                          <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-500'}`}>
                            {product.code}
                          </td>

                          {/* IMAGE */}
                          <td className="py-4 px-4">
                            <div className={`w-10 h-10 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center ${
                              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-gray-200'
                            }`}>
                              {product.image ? (
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>NO IMG</span>
                              )}
                            </div>
                          </td>

                          {/* NAME */}
                          <td className={`py-4 px-4 font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {product.name}
                          </td>

                          {/* CATEGORY */}
                          <td className={`py-4 px-4 font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-600'}`}>
                            {product.category}
                          </td>

                          {/* SELLING PRICE */}
                          <td className={`py-4 px-4 text-center font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            ₹{product.price.toFixed(2)}
                          </td>

                          {/* GST (%) */}
                          <td className={`py-4 px-4 text-center font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-600'}`}>
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
                                className={`p-1.5 rounded-lg transition ${
                                  isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                }`}
                                title="Edit Product"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className={`p-1.5 rounded-lg transition ${
                                  isDarkMode ? 'text-slate-300 hover:text-rose-400 hover:bg-slate-800' : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
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
            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium ${
              isDarkMode ? 'border-slate-800 text-slate-300' : 'border-gray-100 text-gray-500'
            }`}>
              <div>
                Showing {filteredProducts.length > 0 ? 1 : 0} to {filteredProducts.length} of {products.length} entries
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={`p-1.5 rounded-lg border disabled:opacity-40 ${
                    isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-gray-200 hover:bg-gray-50 text-gray-400'
                  }`}
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
                        ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                        : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <span className="px-1 text-gray-400">...</span>

                <button 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className={`p-1.5 rounded-lg border ${
                    isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
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
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md p-6 border relative ${
            isDarkMode ? 'bg-[#1e293b] text-white border-slate-800' : 'bg-white text-gray-900 border-gray-100'
          }`}>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className={`absolute top-4 right-4 p-1 rounded-full transition ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ginger Tea"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-white border-gray-200 text-gray-800 focus:border-amber-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-amber-600 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      + New Category
                    </button>
                  </div>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  >
                    {allCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="40.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-white border-gray-200 text-gray-800 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    GST (%)
                  </label>
                  <select
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  >
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-white border-gray-200 text-gray-800 focus:border-amber-500'
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`flex-1 font-semibold py-2.5 rounded-xl text-sm transition ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f97316] hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md transition"
                >
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${isDarkMode ? 'bg-[#1e293b] text-white border-slate-800' : 'bg-white text-gray-900 border-gray-100'} rounded-2xl shadow-2xl w-full max-w-md p-6 border relative max-h-[90vh] flex flex-col justify-between`}>
            
            <div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Manage Categories
                  </h3>
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Add new categories & delete existing ones
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveNewCategory} className="mb-4">
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-slate-300">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ice Creams, Shakes, Biryani..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className={`flex-1 border rounded-xl px-4 py-2.5 text-sm font-medium focus:border-amber-500 outline-none transition ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-gray-200 text-gray-900'
                    }`}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Save
                  </button>
                </div>
              </form>

              {/* Added Category List */}
              <div className="my-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Category List ({allCategoryOptions.length})
                  </span>
                </div>
                <div className={`max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-xl p-2 border ${
                  isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/80 border-gray-100'
                }`}>
                  {allCategoryOptions.length === 0 ? (
                    <p className="text-xs text-center py-4 text-gray-400">No categories found.</p>
                  ) : (
                    allCategoryOptions.map((cat) => (
                      <div
                        key={cat}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-sm transition ${
                          isDarkMode 
                            ? 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60' 
                            : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-100 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-semibold text-xs">{cat}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          title={`Delete ${cat}`}
                          className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 my-3">
                💡 <span className="font-semibold">Note:</span> Categories will immediately show up in Product forms & POS Billing category pills.
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className={`w-full font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
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
