import React, { useState, useRef } from 'react';
import { 
  Store, 
  CheckCircle2, 
  Sun, 
  Moon,
  Upload
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { apiGetSettings, apiUpdateSettings } from '../services/api';

interface SettingsPageProps {
  onNavigate?: (tab: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: (isDark: boolean) => void;
  cafeName?: string;
  branchLocation?: string;
  logoUrl?: string;
  onSaveSettings?: (settings: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  onNavigate,
  isDarkMode = false,
  onToggleTheme,
  cafeName: propCafeName = 'BrewMaster',
  branchLocation: propBranchLocation = 'Downtown Branch',
  logoUrl: propLogoUrl = '',
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<string>('Settings');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [cafeName, setCafeName] = useState<string>(propCafeName);
  const [branchLocation, setBranchLocation] = useState<string>(propBranchLocation);
  const [contactNumber, setContactNumber] = useState<string>('+1 (555) 123-4567');
  const [globalGst, setGlobalGst] = useState<string>('18');
  const [taxInclusive, setTaxInclusive] = useState<boolean>(true);
  const [logoUrl, setLogoUrl] = useState<string>(propLogoUrl);

  // Load Settings from Backend MongoDB Database
  React.useEffect(() => {
    apiGetSettings()
      .then((data) => {
        if (data) {
          if (data.cafeName) setCafeName(data.cafeName);
          if (data.branchLocation) setBranchLocation(data.branchLocation);
          if (data.contactNumber) setContactNumber(data.contactNumber);
          if (data.globalGst !== undefined) setGlobalGst(data.globalGst.toString());
          if (data.taxInclusive !== undefined) setTaxInclusive(data.taxInclusive);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.themeMode === 'Dark' && !isDarkMode && onToggleTheme) {
            onToggleTheme(true);
          }
        }
      })
      .catch((err) => console.log('Using local settings:', err));
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

  const handleSetTheme = (dark: boolean) => {
    if (onToggleTheme) {
      onToggleTheme(dark);
    }
    showToast(dark ? 'Switched to Dark Mode!' : 'Switched to Light Mode!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        setLogoUrl(base64Data);
        showToast('Logo updated preview! Click Save Changes to apply everywhere.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    showToast('Cafe logo removed.');
  };

  const handleSaveChanges = async () => {
    const payload = {
      cafeName,
      branchLocation,
      contactNumber,
      globalGst: parseFloat(globalGst) || 18,
      taxInclusive,
      themeMode: isDarkMode ? 'Dark' : 'Light',
      logoUrl
    };

    if (onSaveSettings) {
      onSaveSettings(payload);
    }

    try {
      await apiUpdateSettings(payload);
      showToast('Settings saved to database & applied everywhere!');
    } catch {
      showToast('Settings saved & applied locally!');
    }
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
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar Component */}
        <Navbar 
          activeView={activeTab}
          onViewChange={(view) => handleTabChange(view)}
          onCreateBill={() => handleTabChange('POS Billing')}
          isDarkMode={isDarkMode}
          cafeName={cafeName}
          logoUrl={logoUrl}
        />

        {/* Hidden File Input for Logo Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden" 
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6 w-full">
          
          {/* Header */}
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage your cafe's general preferences, billing rules, and system configurations.</p>
          </div>

          {/* Section 1: Cafe Profile */}
          <div className={`rounded-2xl border shadow-2xs overflow-hidden transition-colors ${
            isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-gray-200/80'
          }`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Cafe Profile</h2>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Basic details about your business location.</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Logo Upload Box */}
              <div className={`rounded-xl p-5 border flex flex-col sm:flex-row items-center gap-5 ${
                isDarkMode ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-slate-50/60 border-gray-200/70'
              }`}>
                <div className={`w-16 h-16 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-200 border-gray-300 text-slate-500'
                }`}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Uploaded Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>Cafe Logo</h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Upload your cafe's logo image (PNG, JPG, SVG). Shows across Sidebar & Navbar.</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-3">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#f97316] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                    </button>
                    {logoUrl && (
                      <button 
                        type="button"
                        onClick={handleRemoveLogo}
                        className={`border px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Branch Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Cafe Name
                  </label>
                  <input
                    type="text"
                    value={cafeName}
                    onChange={(e) => setCafeName(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition ${
                      isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Branch Location
                  </label>
                  <input
                    type="text"
                    value={branchLocation}
                    onChange={(e) => setBranchLocation(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition ${
                      isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              {/* Contact Number */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Contact Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition ${
                    isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50/60 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500'
                  }`}
                />
              </div>

            </div>
          </div>

          {/* Section 2: Billing & GST */}
          <div className={`rounded-2xl border shadow-2xs overflow-hidden transition-colors ${
            isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-gray-200/80'
          }`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Billing & GST</h2>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Configure global tax rates and pricing strategies.</p>
            </div>

            <div className="p-6 space-y-4">
              
              {/* Field 1: Global GST (%) */}
              <div className={`rounded-xl p-4 border flex items-center justify-between gap-4 ${
                isDarkMode ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-slate-50/60 border-gray-200/70'
              }`}>
                <div>
                  <h4 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Global GST (%)</h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>This rate will be applied to all taxable products by default.</p>
                </div>
                <input
                  type="number"
                  value={globalGst}
                  onChange={(e) => setGlobalGst(e.target.value)}
                  className={`w-20 border rounded-xl px-3 py-2 text-sm font-bold text-center outline-none focus:border-amber-500 shadow-2xs ${
                    isDarkMode ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              {/* Field 2: Tax Inclusive Pricing */}
              <div className={`rounded-xl p-4 border flex items-center justify-between gap-4 ${
                isDarkMode ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-slate-50/60 border-gray-200/70'
              }`}>
                <div>
                  <h4 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tax Inclusive Pricing</h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Product prices shown on POS already include GST.</p>
                </div>
                
                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setTaxInclusive(!taxInclusive)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 cursor-pointer ${
                    taxInclusive ? 'bg-[#f97316]' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                      taxInclusive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  ></div>
                </button>
              </div>

            </div>
          </div>

          {/* Section 3: System Preferences */}
          <div className={`rounded-2xl border shadow-2xs overflow-hidden transition-colors ${
            isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-gray-200/80'
          }`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Preferences</h2>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Customize your admin interface experience.</p>
            </div>

            <div className="p-6">
              {/* Theme Mode */}
              <div className="max-w-xs">
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Theme Mode
                </label>
                <div className={`p-1 rounded-xl flex items-center border ${
                  isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-100 border-gray-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => handleSetTheme(false)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      !isDarkMode
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetTheme(true)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#f97316] text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-6">
            <button
              onClick={() => showToast('Changes discarded')}
              className={`border font-semibold px-6 py-2.5 rounded-xl text-sm shadow-2xs transition cursor-pointer ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              className="bg-[#f97316] hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-md transition active:scale-[0.98] cursor-pointer"
            >
              Save Changes
            </button>
          </div>

        </main>
      </div>
    </div>
  );
};
