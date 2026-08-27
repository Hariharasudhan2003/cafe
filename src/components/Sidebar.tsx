import React from 'react';
import { 
  Calculator, 
  LayoutGrid, 
  ShoppingBag, 
  ShoppingBasket, 
  BarChart3, 
  Settings, 
  LogOut, 
  Plus,
  X 
} from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNewOrder?: () => void;
  cafeName?: string;
  branchLocation?: string;
  logoUrl?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab = 'POS Billing', 
  onTabChange,
  onNewOrder,
  cafeName = 'BrewMaster',
  branchLocation = 'Downtown Branch',
  logoUrl,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const menuItems = [
    { name: 'POS Billing', icon: Calculator },
    { name: 'Dashboard', icon: LayoutGrid },
    { name: 'Products', icon: ShoppingBag },
    { name: 'Orders', icon: ShoppingBasket },
    { name: 'Reports', icon: BarChart3 },
    { name: 'Settings', icon: Settings },
  ];

  const handleMenuClick = (name: string) => {
    if (onTabChange) onTabChange(name);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#232936] text-gray-300 flex flex-col justify-between h-screen select-none shadow-2xl border-r border-slate-700/50 shrink-0 transition-transform duration-300 ease-in-out
        lg:relative lg:inset-auto lg:z-auto lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Header & Navigation */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto">
          {/* Brand Title + Mobile Close Button */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <h1 className="text-xl font-bold text-white tracking-wide truncate">
              {cafeName}
            </h1>
            <button 
              onClick={onCloseMobile}
              className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Manager Profile Box */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Cafe Logo"
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 shadow-sm shrink-0 bg-slate-800"
              />
            ) : null}
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-white leading-snug truncate">
                {cafeName}
              </span>
              <span className="text-xs text-gray-400 font-normal truncate">
                {branchLocation}
              </span>
            </div>
          </div>

          {/* New Order Button */}
          <button
            onClick={() => {
              if (onNewOrder) onNewOrder();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-orange-500/20 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>New Order</span>
          </button>

          {/* Navigation Menu */}
          <nav className="flex flex-col gap-1.5 mt-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => handleMenuClick(item.name)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#e2e8f0] text-[#92400e] font-bold shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#92400e]' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Menu: Logout */}
        <div className="p-5 border-t border-slate-700/50 flex flex-col gap-1.5 shrink-0">
          <button 
            onClick={() => alert('Logged out successfully!')}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-left group cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
