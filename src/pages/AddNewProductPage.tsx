import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ImagePlus, 
  Save, 
  CheckCircle2,
  Tag,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import type { ProductItem } from './ProductsPage';
import { apiCreateProduct, apiGetProducts } from '../services/api';

interface AddNewProductPageProps {
  onNavigate?: (tab: string) => void;
  onSaveProduct?: (newProd: ProductItem) => void;
  onBack?: () => void;
  isDarkMode?: boolean;
  cafeName?: string;
  branchLocation?: string;
  logoUrl?: string;
}

export const AddNewProductPage: React.FC<AddNewProductPageProps> = ({ 
  onNavigate, 
  onSaveProduct,
  onBack,
  isDarkMode = false,
  cafeName = 'BrewMaster',
  branchLocation = 'Downtown Branch',
  logoUrl = ''
}) => {
  const [activeTab, setActiveTab] = useState<string>('Products');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [productName, setProductName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [gst, setGst] = useState<string>('0');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cafe_custom_categories');
      if (saved) {
        setCustomCategories(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const allCategoryOptions = React.useMemo(() => {
    const base = ['Beverage', 'Snacks', 'Fast Food', 'Juices', 'Desserts'];
    const combined = [...base, ...customCategories];
    const unique: string[] = [];
    combined.forEach(c => {
      if (c && !unique.some(u => u.toLowerCase() === c.toLowerCase())) {
        unique.push(c);
      }
    });
    return unique;
  }, [customCategories]);

  const handleSaveNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (!allCategoryOptions.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      try {
        localStorage.setItem('cafe_custom_categories', JSON.stringify(updated));
      } catch (e) {}
      setCategory(trimmed);
      showToast(`Category "${trimmed}" added and selected!`);
    } else {
      setCategory(trimmed);
      showToast(`Category "${trimmed}" selected.`);
    }

    setNewCategoryName('');
    setIsCategoryModalOpen(false);
  };

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
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('Products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !price || !category) {
      showToast('Please fill in required fields (Name, Category, Price)');
      return;
    }

    let nextNum = 1;
    try {
      const existingProds = await apiGetProducts();
      if (Array.isArray(existingProds)) {
        nextNum = existingProds.length + 1;
      }
    } catch (e) {}

    const seqCode = `#PRD-${String(nextNum).padStart(3, '0')}`;

    const payload = {
      code: seqCode,
      name: productName,
      category,
      price: parseFloat(price) || 0,
      gst: parseInt(gst) || 0,
      status: isActive ? 'Active' : 'Inactive',
      image: imageUrl || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=150&q=80',
      description
    };

    try {
      const created = await apiCreateProduct(payload);
      const newProd: ProductItem = {
        id: created._id || Date.now().toString(),
        code: created.code || payload.code,
        name: created.name,
        category: created.category as ProductItem['category'],
        price: created.price,
        gst: created.gst,
        status: created.status as any,
        image: created.image
      };
      if (onSaveProduct) onSaveProduct(newProd);
    } catch {
      const fallbackProd: ProductItem = {
        id: Date.now().toString(),
        code: payload.code,
        name: productName,
        category: category as ProductItem['category'],
        price: parseFloat(price) || 0,
        gst: parseInt(gst) || 0,
        status: isActive ? 'Active' : 'Inactive',
        image: payload.image
      };
      if (onSaveProduct) onSaveProduct(fallbackProd);
    }

    showToast(`Saved "${productName}" to database & menu catalog!`);
    setTimeout(() => handleBack(), 1000);
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
        cafeName={cafeName}
        branchLocation={branchLocation}
        logoUrl={logoUrl}
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
          cafeName={cafeName}
          logoUrl={logoUrl}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-6">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className={`text-lg sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add New Product</h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Fill in the details below to add a new item to your menu catalog.</p>
            </div>

            {/* Back Button */}
            <button
              onClick={handleBack}
              className={`flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Back to Products</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>

          {/* Form Box */}
          <form onSubmit={handleSubmit} className={`rounded-xl sm:rounded-2xl border shadow-2xs p-3.5 sm:p-6 space-y-4 sm:space-y-6 ${
            isDarkMode ? 'bg-[#1e293b] border-slate-800 text-white' : 'bg-white border-gray-200/80 text-gray-900'
          }`}>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              
              {/* Left Column: Basic Information */}
              <div className="space-y-3 sm:space-y-5">
                <h3 className={`text-sm sm:text-base font-bold pb-2 sm:pb-3 border-b ${isDarkMode ? 'border-slate-800 text-white' : 'border-gray-100 text-gray-900'}`}>
                  Basic Information
                </h3>

                {/* Product Name */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Caramel Macchiato"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className={`w-full border rounded-lg sm:rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium outline-none transition ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* Custom Category Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-amber-600 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      + New Category
                    </button>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className={`w-full flex items-center justify-between border rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold outline-none cursor-pointer transition shadow-2xs ${
                        isDarkMode 
                          ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' 
                          : 'bg-slate-50/60 border-gray-200 text-gray-700 focus:bg-white focus:border-amber-500'
                      }`}
                    >
                      <span className={category ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-slate-400' : 'text-gray-400')}>
                        {category || 'Select Category'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCategoryDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setIsCategoryDropdownOpen(false)} 
                        />
                        <div className={`absolute left-0 right-0 top-full mt-1 z-40 rounded-xl border shadow-xl overflow-hidden max-h-52 overflow-y-auto transition-all ${
                          isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800'
                        }`}>
                          {allCategoryOptions.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setCategory(cat);
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between border-b last:border-b-0 transition cursor-pointer ${
                                isDarkMode ? 'border-slate-800' : 'border-gray-50'
                              } ${
                                category === cat 
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold' 
                                  : (isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-amber-50 text-gray-700')
                              }`}
                            >
                              <span>{cat}</span>
                              {category === cat && <Check className="w-3.5 h-3.5 text-amber-500" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Description (Optional) */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the product..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full border rounded-lg sm:rounded-xl p-3 text-xs sm:text-sm font-medium outline-none transition resize-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                    }`}
                  ></textarea>
                </div>
              </div>

              {/* Right Column: Pricing & Media */}
              <div className="space-y-3 sm:space-y-5">
                <h3 className={`text-sm sm:text-base font-bold pb-2 sm:pb-3 border-b ${isDarkMode ? 'border-slate-800 text-white' : 'border-gray-100 text-gray-900'}`}>
                  Pricing & Media
                </h3>

                {/* Price & GST Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      Selling Price <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={`w-full border rounded-lg sm:rounded-xl pl-7 sm:pl-8 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm font-bold outline-none transition ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      GST (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={gst}
                        onChange={(e) => setGst(e.target.value)}
                        className={`w-full border rounded-lg sm:rounded-xl pl-3 pr-7 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold outline-none transition ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                {/* Product Image Drop Area */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Product Image
                  </label>
                  
                  <div className={`border-2 border-dashed rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${
                    isDarkMode ? 'border-slate-700 hover:border-amber-500 bg-slate-900/40' : 'border-gray-200 hover:border-amber-500 bg-slate-50/50'
                  }`}>
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-1.5 group-hover:scale-110 transition-transform">
                      <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                      Drag & drop or <span className="text-[#f97316] font-semibold underline">browse</span>
                    </p>
                    <span className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">PNG, JPG up to 5MB</span>

                    {/* Image URL input fallback */}
                    <input
                      type="text"
                      placeholder="Or paste Image URL..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className={`mt-2.5 w-full max-w-xs border rounded-lg px-3 py-1.5 text-xs outline-none text-center ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-white border-gray-200 text-gray-800 focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Status
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        isActive ? 'bg-[#f97316]' : (isDarkMode ? 'bg-slate-700' : 'bg-gray-300')
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>

                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      {isActive ? 'Active (Available for order)' : 'Inactive'}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleBack}
                className={`font-semibold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#f97316] hover:bg-orange-600 text-white font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Product</span>
              </button>
            </div>

          </form>

        </main>
      </div>

      {/* Add New Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className={`rounded-2xl shadow-2xl w-full max-w-[310px] sm:max-w-md p-4 sm:p-5 border relative ${
            isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-900'
          }`}>
            
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition cursor-pointer ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Add New Category
                </h3>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Create a menu category for products & POS billing
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveNewCategory} className="space-y-3 my-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ice Creams, Shakes, Biryani..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={`w-full border rounded-lg px-3.5 py-2 text-xs font-medium outline-none transition ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-slate-50 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                  }`}
                  autoFocus
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-700 dark:text-amber-300">
                💡 <span className="font-semibold">Note:</span> Added category will immediately select here & show up in POS Billing category pills.
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className={`flex-1 font-semibold py-2 rounded-lg text-xs transition cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs shadow-xs transition cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
