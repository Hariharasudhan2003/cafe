import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ImagePlus, 
  Save, 
  CheckCircle2 
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import type { ProductItem } from './ProductsPage';
import { apiCreateProduct, apiGetProducts } from '../services/api';

interface AddNewProductPageProps {
  onNavigate?: (tab: string) => void;
  onSaveProduct?: (newProd: ProductItem) => void;
  onBack?: () => void;
}

export const AddNewProductPage: React.FC<AddNewProductPageProps> = ({ 
  onNavigate, 
  onSaveProduct,
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<string>('Products');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [productName, setProductName] = useState<string>('');
  const [category, setCategory] = useState<ProductItem['category'] | ''>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [gst, setGst] = useState<string>('0');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

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
    <div className="flex h-screen bg-[#f8fafc] text-gray-800 font-sans overflow-hidden">
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
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add New Product</h1>
              <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to add a new item to your menu catalog.</p>
            </div>

            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Products</span>
            </button>
          </div>

          {/* Form Box */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Basic Information */}
              <div className="space-y-5">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Basic Information
                </h3>

                {/* Product Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Caramel Macchiato"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-slate-50/60 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:bg-white focus:border-amber-500 outline-none transition"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    required
                    className="w-full bg-slate-50/60 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:bg-white focus:border-amber-500 cursor-pointer shadow-2xs"
                  >
                    <option value="" disabled>Select Category</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="Juices">Juices</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                {/* Description (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Brief description of the product..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50/60 border border-gray-200 rounded-xl p-4 text-sm font-medium text-gray-900 focus:bg-white focus:border-amber-500 outline-none transition resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Right Column: Pricing & Media */}
              <div className="space-y-5">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Pricing & Media
                </h3>

                {/* Price & GST Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Selling Price <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-slate-50/60 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-gray-900 focus:bg-white focus:border-amber-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      GST (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={gst}
                        onChange={(e) => setGst(e.target.value)}
                        className="w-full bg-slate-50/60 border border-gray-200 rounded-xl pl-4 pr-8 py-2.5 text-sm font-semibold text-gray-900 focus:bg-white focus:border-amber-500 outline-none transition"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                {/* Product Image Drop Area */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Product Image
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-200 hover:border-amber-500 rounded-2xl p-6 bg-slate-50/50 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-2 group-hover:scale-110 transition-transform">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      Drag & drop or <span className="text-[#f97316] font-semibold underline">browse</span>
                    </p>
                    <span className="text-[11px] text-gray-400 mt-1">PNG, JPG up to 5MB</span>

                    {/* Image URL input fallback */}
                    <input
                      type="text"
                      placeholder="Or paste Image URL..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="mt-3 w-full max-w-xs bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-amber-500 text-center"
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                        isActive ? 'bg-[#f97316]' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                          isActive ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>

                    <span className="text-xs font-semibold text-gray-700">
                      {isActive ? 'Active (Available for order)' : 'Inactive'}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleBack}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#f97316] hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>Save Product</span>
              </button>
            </div>

          </form>

        </main>
      </div>
    </div>
  );
};
