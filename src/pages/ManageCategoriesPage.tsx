import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Tag, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  FolderPlus,
  Package
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import type { ProductItem } from './ProductsPage';

interface ManageCategoriesPageProps {
  onNavigate?: (tab: string) => void;
  onBack: () => void;
  isDarkMode?: boolean;
  products?: ProductItem[];
}

export const ManageCategoriesPage: React.FC<ManageCategoriesPageProps> = ({
  onNavigate,
  onBack,
  isDarkMode = false,
  products = []
}) => {
  const [activeTab, setActiveTab] = useState<string>('Products');
  const [categoryName, setCategoryName] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const baseCategories = ['Beverage', 'Snacks', 'Fast Food', 'Juices', 'Desserts'];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cafe_custom_categories');
      if (saved) {
        setCustomCategories(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

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

  // Combine base and custom categories and database categories
  const allCategoriesList = React.useMemo(() => {
    const dbCats = products.map(p => p.category).filter(Boolean);
    const combined = [...baseCategories, ...customCategories, ...dbCats];
    const unique: { name: string; isCustom: boolean }[] = [];

    combined.forEach(c => {
      if (c && !unique.some(u => u.name.toLowerCase() === c.toLowerCase())) {
        const isCustom = !baseCategories.some(b => b.toLowerCase() === c.toLowerCase());
        unique.push({ name: c, isCustom });
      }
    });

    return unique;
  }, [products, customCategories]);

  // Handle Add Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    const exists = allCategoriesList.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showToast(`Category "${trimmed}" already exists.`);
      return;
    }

    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    try {
      localStorage.setItem('cafe_custom_categories', JSON.stringify(updated));
    } catch (e) {}

    setCategoryName('');
    showToast(`Added new category "${trimmed}" successfully!`);
  };

  // Handle Delete Category
  const handleDeleteCategory = (catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
      const updated = customCategories.filter(c => c.toLowerCase() !== catName.toLowerCase());
      setCustomCategories(updated);
      try {
        localStorage.setItem('cafe_custom_categories', JSON.stringify(updated));
      } catch (e) {}

      showToast(`Category "${catName}" deleted successfully!`);
    }
  };

  // Calculate Product count per category
  const getProductCountForCategory = (catName: string) => {
    return products.filter(p => (p.category || '').toLowerCase() === catName.toLowerCase()).length;
  };

  const cardBgClass = isDarkMode 
    ? 'bg-[#1e293b] border-slate-800 text-white' 
    : 'bg-white border-gray-200/80 text-gray-900';
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

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'
                }`}
                title="Back to Products"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${textHeadingClass}`}>Category Management</h1>
                <p className={`text-xs mt-0.5 ${textSubClass}`}>Add new menu categories, view product counts & delete categories.</p>
              </div>
            </div>

            <button
              onClick={onBack}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Products</span>
            </button>
          </div>

          {/* Form & List Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (5 cols): Add Category Form */}
            <div className={`lg:col-span-5 ${cardBgClass} rounded-2xl p-5 border shadow-2xs flex flex-col justify-between h-fit`}>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center justify-center font-bold">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${textHeadingClass}`}>Add New Category</h3>
                  <span className={`text-xs ${textSubClass}`}>Enter name to create category</span>
                </div>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Milkshakes, Ice Creams, Wraps..."
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className={`w-full border rounded-lg px-3.5 py-2 text-xs font-medium focus:border-amber-500 outline-none transition ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  💡 <span className="font-semibold">Note:</span> Categories added here will automatically appear in Products form & POS Billing pills.
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold py-2 rounded-lg text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save Category</span>
                </button>
              </form>
            </div>

            {/* Right Column (7 cols): Categories List Table */}
            <div className={`lg:col-span-7 ${cardBgClass} rounded-2xl p-6 border shadow-2xs flex flex-col justify-between`}>
              
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div>
                  <h3 className={`text-base font-bold ${textHeadingClass}`}>All Categories List</h3>
                  <span className={`text-xs ${textSubClass}`}>Total Categories: <span className="font-bold text-amber-500">{allCategoriesList.length}</span></span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                      isDarkMode ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-400'
                    }`}>
                      <th className="py-3 px-3">S.NO</th>
                      <th className="py-3 px-3">CATEGORY NAME</th>
                      <th className="py-3 px-3 text-center">PRODUCTS COUNT</th>
                      <th className="py-3 px-3 text-center">TYPE</th>
                      <th className="py-3 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${isDarkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                    {allCategoriesList.map((cat, idx) => {
                      const prodCount = getProductCountForCategory(cat.name);
                      return (
                        <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/40'}>
                          <td className={`py-3.5 px-3 font-semibold ${textSubClass}`}>{idx + 1}</td>
                          <td className={`py-3.5 px-3 font-bold ${textHeadingClass}`}>
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-amber-500" />
                              <span>{cat.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <Package className="w-3 h-3" />
                              <span>{prodCount} Items</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {cat.isCustom ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                Custom
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                System Default
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteCategory(cat.name)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
                              title={`Delete Category ${cat.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
};
