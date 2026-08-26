import { useState, useEffect } from 'react';
import { 
  POSPage, 
  DashboardPage, 
  ProductsPage, 
  ReportsPage, 
  OrdersPage, 
  SettingsPage 
} from './pages';
import { apiGetSettings } from './services/api';

function App() {
  const [currentTab, setCurrentTab] = useState<string>('Settings');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [globalSettings, setGlobalSettings] = useState({
    cafeName: 'BrewMaster',
    branchLocation: 'Downtown Branch',
    contactNumber: '+1 (555) 123-4567',
    globalGst: 18,
    taxInclusive: true,
    logoUrl: ''
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    apiGetSettings()
      .then((data) => {
        if (data) {
          setGlobalSettings((prev) => ({
            ...prev,
            cafeName: data.cafeName || prev.cafeName,
            branchLocation: data.branchLocation || prev.branchLocation,
            contactNumber: data.contactNumber || prev.contactNumber,
            globalGst: data.globalGst !== undefined ? data.globalGst : prev.globalGst,
            taxInclusive: data.taxInclusive !== undefined ? data.taxInclusive : prev.taxInclusive,
            logoUrl: data.logoUrl || prev.logoUrl
          }));
          if (data.themeMode === 'Dark') {
            setIsDarkMode(true);
          }
        }
      })
      .catch((err) => console.log('Using default app settings:', err));
  }, []);

  const handleUpdateSettings = (newSettings: any) => {
    setGlobalSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
  };

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'Dashboard':
        return <DashboardPage onNavigate={(tab) => setCurrentTab(tab)} isDarkMode={isDarkMode} />;
      case 'Products':
        return <ProductsPage onNavigate={(tab) => setCurrentTab(tab)} isDarkMode={isDarkMode} />;
      case 'Reports':
        return <ReportsPage onNavigate={(tab) => setCurrentTab(tab)} isDarkMode={isDarkMode} />;
      case 'Orders':
        return (
          <OrdersPage 
            onNavigate={(tab) => setCurrentTab(tab)} 
            isDarkMode={isDarkMode}
            cafeName={globalSettings.cafeName}
            branchLocation={globalSettings.branchLocation}
            logoUrl={globalSettings.logoUrl}
            globalGst={globalSettings.globalGst}
            taxInclusive={globalSettings.taxInclusive}
          />
        );
      case 'Settings':
        return (
          <SettingsPage 
            onNavigate={(tab) => setCurrentTab(tab)} 
            isDarkMode={isDarkMode}
            onToggleTheme={(dark) => setIsDarkMode(dark)}
            cafeName={globalSettings.cafeName}
            branchLocation={globalSettings.branchLocation}
            logoUrl={globalSettings.logoUrl}
            onSaveSettings={handleUpdateSettings}
          />
        );
      case 'POS Billing':
      default:
        return (
          <POSPage 
            onNavigate={(tab) => setCurrentTab(tab)} 
            isDarkMode={isDarkMode}
            cafeName={globalSettings.cafeName}
            branchLocation={globalSettings.branchLocation}
            logoUrl={globalSettings.logoUrl}
            globalGst={globalSettings.globalGst}
            taxInclusive={globalSettings.taxInclusive}
          />
        );
    }
  };

  return (
    <div className={`w-full min-h-screen overflow-x-hidden max-w-full transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0f172a] text-slate-100 dark' : 'bg-[#f8fafc] text-gray-800'
    }`}>
      {renderCurrentView()}
    </div>
  );
}

export default App;
