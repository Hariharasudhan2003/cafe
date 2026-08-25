import React from 'react';
import { Bell, PauseCircle } from 'lucide-react';

interface NavbarProps {
  activeView?: string;
  onViewChange?: (view: string) => void;
  onCreateBill?: () => void;
  heldBillsCount?: number;
  onOpenHeldBills?: () => void;
  isDarkMode?: boolean;
  cafeName?: string;
  logoUrl?: string;
  upcomingAlerts?: { code: string; customer: string; date: string; gapText?: string }[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView = 'POS Billing',
  onViewChange,
  onCreateBill,
  heldBillsCount = 0,
  onOpenHeldBills,
  isDarkMode = false,
  cafeName = 'BrewMaster',
  logoUrl,
  upcomingAlerts = []
}) => {
  const [isNotifOpen, setIsNotifOpen] = React.useState<boolean>(false);
  const isPosPage = activeView === 'POS' || activeView === 'POS Billing' || activeView === 'POSBilling';

  return (
    <header className={`h-16 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs transition-colors duration-200 ${
      isDarkMode 
        ? 'bg-[#1e293b] border-b border-slate-800 text-white' 
        : 'bg-white border-b border-gray-200 text-gray-800'
    }`}>
      {/* Left side: Title and Navigation links */}
      <div className="flex items-center gap-8">
        <h2 
          className={`text-xl font-bold tracking-tight cursor-pointer truncate max-w-[240px] ${
            isDarkMode ? 'text-amber-400' : 'text-[#8b4513]'
          }`}
          onClick={() => onViewChange && onViewChange('POS Billing')}
        >
          {cafeName} POS
        </h2>

        <nav className="flex items-center gap-6">
          <button
            onClick={() => onViewChange && onViewChange('Orders')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              activeView === 'Live Orders' || activeView === 'Orders'
                ? isDarkMode ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-0.5' : 'text-[#8b4513] font-semibold border-b-2 border-[#8b4513] pb-0.5'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Live Orders
          </button>
          <button
            onClick={() => onViewChange && onViewChange('Dashboard')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              activeView === 'Today\'s Sales' || activeView === 'Dashboard'
                ? isDarkMode ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-0.5' : 'text-[#8b4513] font-semibold border-b-2 border-[#8b4513] pb-0.5'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Today's Sales
          </button>
        </nav>
      </div>

      {/* Right side: Hold Bills (POS only), Create Bill button, Bell icon, Profile logo */}
      <div className="flex items-center gap-3">
        {/* Hold Bills Button - Show ONLY on POS Billing page */}
        {isPosPage && (
          <button
            onClick={onOpenHeldBills}
            className={`relative font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-2xs cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-800 border border-slate-700 text-amber-300 hover:bg-slate-700' 
                : 'bg-amber-50 hover:bg-amber-100/80 text-[#8b4513] border border-amber-200/80'
            }`}
            title="View Held Bills"
          >
            <PauseCircle className="w-4 h-4 text-amber-500" />
            <span>Hold Bills</span>
            {heldBillsCount > 0 && (
              <span className="bg-[#8b4513] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {heldBillsCount}
              </span>
            )}
          </button>
        )}

        {/* Create Bill Button */}
        <button
          onClick={onCreateBill}
          className="bg-[#f97316] hover:bg-orange-600 text-white font-medium text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          Create Bill
        </button>

        {/* Bell Notification Icon with Hover Popover */}
        <div 
          className="relative"
          onMouseEnter={() => setIsNotifOpen(true)}
          onMouseLeave={() => setIsNotifOpen(false)}
        >
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative p-2 rounded-full transition-colors cursor-pointer ${
              isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            {upcomingAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-slate-800 animate-pulse"></span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          {isNotifOpen && (
            <div className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-xl border p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/50 mb-2">
                <span className="font-bold text-xs">Event Order Notifications</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                  {upcomingAlerts.length} Urgent
                </span>
              </div>

              {upcomingAlerts.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 text-center">No urgent order alerts for today or tomorrow.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {upcomingAlerts.map((alert, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-600">
                        <span>⚠️ Order {alert.code}</span>
                        <span className="text-[10px] text-red-500 font-extrabold">{alert.gapText || "1 Day Gap"}</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">{alert.customer}</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">Event Date: {alert.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Logo - Blank if logoUrl is removed */}
        {logoUrl ? (
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-500/40 shadow-xs cursor-pointer shrink-0 bg-slate-800">
            <img
              src={logoUrl}
              alt="Profile Logo"
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </header>
  );
};
